import { Redis } from '@upstash/redis';
import {
  UserId, GroupId, UserProfile, Group, GroupSettings,
  DailyScore, FriendRequest, FriendRequestStatus,
  GroupInvite, GroupInviteStatus, Notification, NotificationType,
  ClaimCode, MemberInfo, LEGACY_IDS,
} from './types';

// === Redis Client ===

function getRedis(): Redis {
  return new Redis({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
  });
}

function generateId(prefix: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}_${id}`;
}

// ============================================================
// USERS
// ============================================================

export async function createUser(profile: UserProfile): Promise<void> {
  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.set(`user:${profile.id}`, JSON.stringify(profile));
  pipeline.set(`user:google:${profile.googleId}`, profile.id);
  pipeline.set(`user:username:${profile.username.toLowerCase()}`, profile.id);
  // Add groups
  for (const gid of profile.groups) {
    pipeline.sadd(`user:groups:${profile.id}`, gid);
  }
  // Add friends
  for (const fid of profile.friends) {
    pipeline.sadd(`friends:${profile.id}`, fid);
  }
  await pipeline.exec();
}

export async function getUser(userId: UserId): Promise<UserProfile | null> {
  const redis = getRedis();
  const data = await redis.get<string>(`user:${userId}`);
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data as unknown as UserProfile;
}

export async function getUserByGoogleId(googleId: string): Promise<UserProfile | null> {
  const redis = getRedis();
  const userId = await redis.get<string>(`user:google:${googleId}`);
  if (!userId) return null;
  return getUser(userId as UserId);
}

export async function getUserByUsername(username: string): Promise<UserProfile | null> {
  const redis = getRedis();
  const userId = await redis.get<string>(`user:username:${username.toLowerCase()}`);
  if (!userId) return null;
  return getUser(userId as UserId);
}

export async function updateUser(userId: UserId, updates: Partial<UserProfile>): Promise<UserProfile | null> {
  const user = await getUser(userId);
  if (!user) return null;

  const redis = getRedis();

  // If username changed, update the mapping
  if (updates.username && updates.username !== user.username) {
    const pipeline = redis.pipeline();
    pipeline.del(`user:username:${user.username.toLowerCase()}`);
    pipeline.set(`user:username:${updates.username.toLowerCase()}`, userId);
    await pipeline.exec();
  }

  const updated = { ...user, ...updates };
  await redis.set(`user:${userId}`, JSON.stringify(updated));
  return updated;
}

export async function searchUsers(query: string, limit = 10): Promise<UserProfile[]> {
  // Simple approach: scan user keys and filter by username/displayName
  // For production, consider a secondary index or search service
  const redis = getRedis();
  const results: UserProfile[] = [];
  const lowerQ = query.toLowerCase();

  let cursor = 0;
  do {
    const [nextCursor, keys] = await redis.scan(cursor, { match: 'user:usr_*', count: 100 });
    cursor = typeof nextCursor === 'string' ? parseInt(nextCursor) : nextCursor;

    for (const key of keys) {
      if (results.length >= limit) break;
      // Skip mapping keys
      if (key.includes(':google:') || key.includes(':username:') || key.includes(':groups:') || key.includes(':scores:')) continue;
      const data = await redis.get<string>(key);
      if (!data) continue;
      const user: UserProfile = typeof data === 'string' ? JSON.parse(data) : data as unknown as UserProfile;
      if (
        user.username.toLowerCase().includes(lowerQ) ||
        user.displayName.toLowerCase().includes(lowerQ)
      ) {
        results.push(user);
      }
    }
  } while (cursor !== 0 && results.length < limit);

  // Also search legacy users
  if (results.length < limit) {
    for (const legacyId of LEGACY_IDS) {
      if (results.length >= limit) break;
      const user = await getUser(legacyId);
      if (user && !results.find(r => r.id === user.id)) {
        if (
          user.username.toLowerCase().includes(lowerQ) ||
          user.displayName.toLowerCase().includes(lowerQ)
        ) {
          results.push(user);
        }
      }
    }
  }

  return results;
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const redis = getRedis();
  const exists = await redis.exists(`user:username:${username.toLowerCase()}`);
  return exists === 1;
}

// ============================================================
// SCORES
// ============================================================

export async function submitDailyScore(
  userId: UserId,
  date: string,
  rounds: [number, number, number]
): Promise<{ success: boolean; error?: string }> {
  // Check if already submitted
  const existing = await getDailyScore(userId, date);
  if (existing?.submitted) {
    return { success: false, error: 'You have already submitted scores for today.' };
  }

  // Validate rounds
  for (const score of rounds) {
    if (!Number.isInteger(score) || score < 0 || score > 5000) {
      return { success: false, error: 'Each round score must be an integer between 0 and 5000.' };
    }
  }

  const dailyScore: DailyScore = {
    userId,
    date,
    rounds,
    submitted: true,
    submittedAt: new Date().toISOString(),
  };

  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.set(`scores:${userId}:${date}`, JSON.stringify(dailyScore));
  pipeline.sadd(`submissions:${date}`, userId);
  pipeline.sadd(`user:scores:dates:${userId}`, date);
  await pipeline.exec();

  return { success: true };
}

export async function getDailyScore(userId: UserId, date: string): Promise<DailyScore | null> {
  const redis = getRedis();
  const data = await redis.get<string>(`scores:${userId}:${date}`);
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data as unknown as DailyScore;
}

export async function getScoresForDate(date: string, memberIds: UserId[]): Promise<Record<string, DailyScore | null>> {
  const redis = getRedis();
  const scores: Record<string, DailyScore | null> = {};

  if (memberIds.length === 0) return scores;

  const pipeline = redis.pipeline();
  for (const id of memberIds) {
    pipeline.get(`scores:${id}:${date}`);
  }
  const results = await pipeline.exec();

  memberIds.forEach((id, i) => {
    const data = results[i];
    if (data) {
      scores[id] = typeof data === 'string' ? JSON.parse(data) : data as unknown as DailyScore;
    } else {
      scores[id] = null;
    }
  });

  return scores;
}

export async function getAllScoreDates(userId: UserId): Promise<string[]> {
  const redis = getRedis();
  const dates = await redis.smembers(`user:scores:dates:${userId}`);
  return (dates as string[]).sort();
}

// ============================================================
// GROUPS
// ============================================================

export async function createGroup(
  name: string,
  createdBy: UserId,
  memberIds: UserId[],
  isOriginal = false
): Promise<Group> {
  const id = (isOriginal ? 'grp_og' : generateId('grp')) as GroupId;

  const group: Group = {
    id,
    name,
    createdBy,
    admins: [createdBy],
    members: memberIds,
    settings: { revealMode: 'all_submitted' },
    isOriginal,
    createdAt: new Date().toISOString(),
  };

  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.set(`group:${id}`, JSON.stringify(group));
  for (const uid of memberIds) {
    pipeline.sadd(`user:groups:${uid}`, id);
  }
  await pipeline.exec();

  return group;
}

export async function getGroup(groupId: GroupId): Promise<Group | null> {
  const redis = getRedis();
  const data = await redis.get<string>(`group:${groupId}`);
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data as unknown as Group;
}

export async function updateGroup(groupId: GroupId, updates: Partial<Group>): Promise<Group | null> {
  const group = await getGroup(groupId);
  if (!group) return null;

  const redis = getRedis();
  const updated = { ...group, ...updates };
  await redis.set(`group:${groupId}`, JSON.stringify(updated));
  return updated;
}

export async function getUserGroups(userId: UserId): Promise<Group[]> {
  const redis = getRedis();
  const groupIds = await redis.smembers(`user:groups:${userId}`);
  if (!groupIds || groupIds.length === 0) return [];

  const groups: Group[] = [];
  for (const gid of groupIds) {
    const group = await getGroup(gid as GroupId);
    if (group) groups.push(group);
  }
  return groups;
}

export async function addGroupMember(groupId: GroupId, userId: UserId): Promise<boolean> {
  const group = await getGroup(groupId);
  if (!group) return false;
  if (group.members.includes(userId)) return true;

  group.members.push(userId);
  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.set(`group:${groupId}`, JSON.stringify(group));
  pipeline.sadd(`user:groups:${userId}`, groupId);
  await pipeline.exec();
  return true;
}

export async function removeGroupMember(groupId: GroupId, userId: UserId): Promise<boolean> {
  const group = await getGroup(groupId);
  if (!group) return false;

  group.members = group.members.filter(m => m !== userId);
  group.admins = group.admins.filter(a => a !== userId);

  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.set(`group:${groupId}`, JSON.stringify(group));
  pipeline.srem(`user:groups:${userId}`, groupId);
  await pipeline.exec();
  return true;
}

export async function deleteGroup(groupId: GroupId): Promise<boolean> {
  const group = await getGroup(groupId);
  if (!group) return false;

  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.del(`group:${groupId}`);
  for (const uid of group.members) {
    pipeline.srem(`user:groups:${uid}`, groupId);
  }
  await pipeline.exec();
  return true;
}

// Check if all members of a group have submitted for a given date
export async function checkGroupReveal(groupId: GroupId, date: string): Promise<boolean> {
  const group = await getGroup(groupId);
  if (!group) return false;

  const redis = getRedis();
  const submitters = await redis.smembers(`submissions:${date}`);
  const submitterSet = new Set(submitters);

  return group.members.every(m => submitterSet.has(m));
}

// ============================================================
// FRIENDS
// ============================================================

export async function getFriends(userId: UserId): Promise<UserId[]> {
  const redis = getRedis();
  const friends = await redis.smembers(`friends:${userId}`);
  return (friends || []) as UserId[];
}

export async function addFriend(userId1: UserId, userId2: UserId): Promise<void> {
  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.sadd(`friends:${userId1}`, userId2);
  pipeline.sadd(`friends:${userId2}`, userId1);
  await pipeline.exec();

  // Also update user profiles
  const [user1, user2] = await Promise.all([getUser(userId1), getUser(userId2)]);
  if (user1 && !user1.friends.includes(userId2)) {
    user1.friends.push(userId2);
    await getRedis().set(`user:${userId1}`, JSON.stringify(user1));
  }
  if (user2 && !user2.friends.includes(userId1)) {
    user2.friends.push(userId1);
    await getRedis().set(`user:${userId2}`, JSON.stringify(user2));
  }
}

export async function removeFriend(userId1: UserId, userId2: UserId): Promise<void> {
  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.srem(`friends:${userId1}`, userId2);
  pipeline.srem(`friends:${userId2}`, userId1);
  await pipeline.exec();

  const [user1, user2] = await Promise.all([getUser(userId1), getUser(userId2)]);
  if (user1) {
    user1.friends = user1.friends.filter(f => f !== userId2);
    await getRedis().set(`user:${userId1}`, JSON.stringify(user1));
  }
  if (user2) {
    user2.friends = user2.friends.filter(f => f !== userId1);
    await getRedis().set(`user:${userId2}`, JSON.stringify(user2));
  }
}

export async function areFriends(userId1: UserId, userId2: UserId): Promise<boolean> {
  const redis = getRedis();
  return await redis.sismember(`friends:${userId1}`, userId2) === 1;
}

// ============================================================
// FRIEND REQUESTS
// ============================================================

export async function createFriendRequest(from: UserId, to: UserId): Promise<FriendRequest> {
  const id = generateId('freq');
  const request: FriendRequest = {
    id,
    from,
    to,
    status: 'pending',
    createdAt: new Date().toISOString(),
    respondedAt: null,
  };

  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.set(`friend_request:${id}`, JSON.stringify(request));
  pipeline.sadd(`friend_requests:to:${to}`, id);
  pipeline.sadd(`friend_requests:from:${from}`, id);
  await pipeline.exec();

  return request;
}

export async function getFriendRequest(requestId: string): Promise<FriendRequest | null> {
  const redis = getRedis();
  const data = await redis.get<string>(`friend_request:${requestId}`);
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data as unknown as FriendRequest;
}

export async function getPendingFriendRequests(userId: UserId): Promise<FriendRequest[]> {
  const redis = getRedis();
  const ids = await redis.smembers(`friend_requests:to:${userId}`);
  const requests: FriendRequest[] = [];

  for (const id of ids) {
    const req = await getFriendRequest(id as string);
    if (req && req.status === 'pending') {
      requests.push(req);
    }
  }

  return requests;
}

export async function respondToFriendRequest(
  requestId: string,
  status: 'accepted' | 'declined'
): Promise<FriendRequest | null> {
  const request = await getFriendRequest(requestId);
  if (!request || request.status !== 'pending') return null;

  request.status = status;
  request.respondedAt = new Date().toISOString();

  const redis = getRedis();
  await redis.set(`friend_request:${requestId}`, JSON.stringify(request));

  // Remove from pending sets
  const pipeline = redis.pipeline();
  pipeline.srem(`friend_requests:to:${request.to}`, requestId);
  pipeline.srem(`friend_requests:from:${request.from}`, requestId);
  await pipeline.exec();

  if (status === 'accepted') {
    await addFriend(request.from, request.to);
  }

  return request;
}

// ============================================================
// GROUP INVITES
// ============================================================

export async function createGroupInvite(
  groupId: GroupId,
  from: UserId,
  to: UserId
): Promise<GroupInvite> {
  const id = generateId('ginv');
  const invite: GroupInvite = {
    id,
    groupId,
    from,
    to,
    status: 'pending',
    createdAt: new Date().toISOString(),
    respondedAt: null,
  };

  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.set(`group_invite:${id}`, JSON.stringify(invite));
  pipeline.sadd(`group_invites:to:${to}`, id);
  await pipeline.exec();

  return invite;
}

export async function getGroupInvite(inviteId: string): Promise<GroupInvite | null> {
  const redis = getRedis();
  const data = await redis.get<string>(`group_invite:${inviteId}`);
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data as unknown as GroupInvite;
}

export async function getPendingGroupInvites(userId: UserId): Promise<GroupInvite[]> {
  const redis = getRedis();
  const ids = await redis.smembers(`group_invites:to:${userId}`);
  const invites: GroupInvite[] = [];

  for (const id of ids) {
    const inv = await getGroupInvite(id as string);
    if (inv && inv.status === 'pending') {
      invites.push(inv);
    }
  }

  return invites;
}

export async function respondToGroupInvite(
  inviteId: string,
  status: 'accepted' | 'declined'
): Promise<GroupInvite | null> {
  const invite = await getGroupInvite(inviteId);
  if (!invite || invite.status !== 'pending') return null;

  invite.status = status;
  invite.respondedAt = new Date().toISOString();

  const redis = getRedis();
  await redis.set(`group_invite:${inviteId}`, JSON.stringify(invite));
  await redis.srem(`group_invites:to:${invite.to}`, inviteId);

  if (status === 'accepted') {
    await addGroupMember(invite.groupId, invite.to);
  }

  return invite;
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export async function createNotification(
  userId: UserId,
  type: NotificationType,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<Notification> {
  const id = generateId('notif');
  const notification: Notification = {
    id,
    userId,
    type,
    title,
    body,
    data,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const redis = getRedis();
  // Push to front of list, cap at 50
  await redis.lpush(`notifications:${userId}`, JSON.stringify(notification));
  await redis.ltrim(`notifications:${userId}`, 0, 49);
  await redis.incr(`notifications:unread:${userId}`);

  return notification;
}

export async function getNotifications(userId: UserId, limit = 20): Promise<Notification[]> {
  const redis = getRedis();
  const raw = await redis.lrange(`notifications:${userId}`, 0, limit - 1);
  return raw.map(item =>
    typeof item === 'string' ? JSON.parse(item) : item as unknown as Notification
  );
}

export async function getUnreadCount(userId: UserId): Promise<number> {
  const redis = getRedis();
  const count = await redis.get<number>(`notifications:unread:${userId}`);
  return count || 0;
}

export async function markAllNotificationsRead(userId: UserId): Promise<void> {
  const redis = getRedis();

  // Get all notifications, mark as read, re-set
  const raw = await redis.lrange(`notifications:${userId}`, 0, -1);
  if (raw.length === 0) return;

  const notifications: Notification[] = raw.map(item =>
    typeof item === 'string' ? JSON.parse(item) : item as unknown as Notification
  );

  const updated = notifications.map(n => ({ ...n, read: true }));

  const pipeline = redis.pipeline();
  pipeline.del(`notifications:${userId}`);
  for (const n of updated.reverse()) {
    pipeline.lpush(`notifications:${userId}`, JSON.stringify(n));
  }
  pipeline.set(`notifications:unread:${userId}`, 0);
  await pipeline.exec();
}

// ============================================================
// CLAIM CODES
// ============================================================

export async function getClaimCode(code: string): Promise<ClaimCode | null> {
  const redis = getRedis();
  const data = await redis.get<string>(`claim:${code}`);
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data as unknown as ClaimCode;
}

export async function setClaimCode(claimCode: ClaimCode): Promise<void> {
  const redis = getRedis();
  await redis.set(`claim:${claimCode.code}`, JSON.stringify(claimCode));
}

// ============================================================
// LEGACY / MIGRATION HELPERS
// ============================================================

export async function getUnclaimedLegacyUsers(): Promise<UserId[]> {
  const redis = getRedis();
  const ids = await redis.smembers('legacy:unclaimed');
  return (ids || []) as UserId[];
}

export async function markLegacyClaimed(legacyId: UserId): Promise<void> {
  const redis = getRedis();
  await redis.srem('legacy:unclaimed', legacyId);
}

export async function isMigrationComplete(): Promise<boolean> {
  const redis = getRedis();
  const flag = await redis.get('migration:v2:complete');
  return flag === 'true' || flag === true;
}

export async function setMigrationComplete(): Promise<void> {
  const redis = getRedis();
  await redis.set('migration:v2:complete', 'true');
}

// ============================================================
// MEMBER INFO HELPERS
// ============================================================

export async function getMemberInfos(memberIds: UserId[]): Promise<Record<string, MemberInfo>> {
  const infos: Record<string, MemberInfo> = {};
  for (const id of memberIds) {
    const user = await getUser(id);
    if (user) {
      infos[id] = {
        id: user.id,
        displayName: user.displayName,
        username: user.username,
        avatarUrl: user.avatarUrl,
      };
    }
  }
  return infos;
}

// ============================================================
// RESERVED USERNAMES
// ============================================================

export async function isUsernameReserved(username: string): Promise<boolean> {
  const redis = getRedis();
  return await redis.sismember('reserved:usernames', username.toLowerCase()) === 1;
}

export async function addReservedUsername(username: string): Promise<void> {
  const redis = getRedis();
  await redis.sadd('reserved:usernames', username.toLowerCase());
}

// ============================================================
// RAW REDIS ACCESS (for migration)
// ============================================================

export function getRawRedis(): Redis {
  return getRedis();
}
