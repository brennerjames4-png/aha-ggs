import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getClaimCode, setClaimCode, getUser, createUser, updateUser,
  markLegacyClaimed, getAllScoreDates, getDailyScore, getRawRedis,
  getGroup, updateGroup, getFriends, addFriend, createNotification,
} from '@/lib/redis';
import { UserId, GroupId, UserProfile, DailyScore } from '@/lib/types';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.googleId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.onboarded) {
    return NextResponse.json({ error: 'Already onboarded' }, { status: 400 });
  }

  const body = await request.json();
  const { legacyId, code } = body;

  if (!legacyId || !code) {
    return NextResponse.json({ error: 'Legacy player and claim code required' }, { status: 400 });
  }

  // 1. Verify claim code
  const claimCode = await getClaimCode(code.toUpperCase());
  if (!claimCode) {
    return NextResponse.json({ error: 'Invalid claim code' }, { status: 400 });
  }

  if (claimCode.claimed) {
    return NextResponse.json({ error: 'This code has already been used' }, { status: 400 });
  }

  if (claimCode.legacyId !== legacyId) {
    return NextResponse.json({ error: 'This code does not match the selected player' }, { status: 400 });
  }

  // 2. Get legacy user
  const legacyUser = await getUser(legacyId as UserId);
  if (!legacyUser) {
    return NextResponse.json({ error: 'Legacy user not found' }, { status: 404 });
  }

  // 3. Generate new user ID
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let idSuffix = '';
  for (let i = 0; i < 12; i++) {
    idSuffix += chars[Math.floor(Math.random() * chars.length)];
  }
  const newUserId = `usr_${idSuffix}` as UserId;

  // 4. Re-key ALL score data
  const scoreDates = await getAllScoreDates(legacyId as UserId);
  const redis = getRawRedis();

  for (const date of scoreDates) {
    const score = await getDailyScore(legacyId as UserId, date);
    if (score) {
      const newScore: DailyScore = { ...score, userId: newUserId };
      const pipeline = redis.pipeline();
      pipeline.set(`scores:${newUserId}:${date}`, JSON.stringify(newScore));
      pipeline.sadd(`submissions:${date}`, newUserId);
      pipeline.srem(`submissions:${date}`, legacyId);
      pipeline.sadd(`user:scores:dates:${newUserId}`, date);
      // Keep old keys for backup — don't delete
      await pipeline.exec();
    }
  }

  // 5. Update group memberships
  for (const groupId of legacyUser.groups) {
    const group = await getGroup(groupId);
    if (group) {
      group.members = group.members.map(m => m === legacyId ? newUserId : m) as UserId[];
      group.admins = group.admins.map(a => a === legacyId ? newUserId : a) as UserId[];
      if (group.createdBy === legacyId) {
        group.createdBy = newUserId;
      }
      await updateGroup(groupId, group);
      await redis.sadd(`user:groups:${newUserId}`, groupId);
      await redis.srem(`user:groups:${legacyId}`, groupId);
    }
  }

  // 6. Update friend relationships
  const friends = await getFriends(legacyId as UserId);
  for (const friendId of friends) {
    // Remove old friendship
    await redis.srem(`friends:${friendId}`, legacyId);
    await redis.srem(`friends:${legacyId}`, friendId);
    // Add new friendship
    await addFriend(newUserId, friendId);
  }

  // 7. Create new user profile inheriting legacy data
  const profile: UserProfile = {
    id: newUserId,
    googleId: session.user.googleId,
    displayName: legacyUser.displayName,
    username: legacyUser.username,
    avatarUrl: session.user.image || null,
    email: session.user.email || '',
    type: 'legacy',
    claimed: true,
    createdAt: new Date().toISOString(),
    friends: friends.map(f => f === (legacyId as UserId) ? newUserId : f) as UserId[],
    groups: [...legacyUser.groups],
  };

  await createUser(profile);

  // 8. Mark claim code as used
  claimCode.claimed = true;
  claimCode.claimedBy = newUserId;
  claimCode.claimedAt = new Date().toISOString();
  await setClaimCode(claimCode);

  // 9. Mark legacy user as claimed
  await markLegacyClaimed(legacyId as UserId);

  // 10. Notify other legacy users
  for (const friendId of profile.friends) {
    await createNotification(
      friendId,
      'legacy_claimed',
      'Account Claimed!',
      `${profile.displayName} (@${profile.username}) has claimed their account!`,
      { claimedUserId: newUserId }
    );
  }

  return NextResponse.json({ success: true, userId: newUserId, username: profile.username });
}
