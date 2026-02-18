import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createUser, isUsernameTaken, isUsernameReserved } from '@/lib/redis';
import { UserId, UserProfile, RESERVED_USERNAMES } from '@/lib/types';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.googleId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.onboarded) {
    return NextResponse.json({ error: 'Already onboarded' }, { status: 400 });
  }

  const body = await request.json();
  const { username, displayName } = body;

  // Validate username
  if (!username || typeof username !== 'string') {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const lower = username.toLowerCase();

  if (lower.length < 3 || lower.length > 20) {
    return NextResponse.json({ error: 'Username must be 3-20 characters' }, { status: 400 });
  }

  if (!/^[a-z0-9_]+$/.test(lower)) {
    return NextResponse.json({ error: 'Username can only contain letters, numbers, and underscores' }, { status: 400 });
  }

  // Check reserved
  if (RESERVED_USERNAMES.has(lower) || await isUsernameReserved(lower)) {
    return NextResponse.json({ error: 'This username is reserved' }, { status: 400 });
  }

  // Check taken
  if (await isUsernameTaken(lower)) {
    return NextResponse.json({ error: 'This username is already taken' }, { status: 400 });
  }

  // Validate display name
  if (!displayName || typeof displayName !== 'string' || displayName.length > 30) {
    return NextResponse.json({ error: 'Display name is required (max 30 chars)' }, { status: 400 });
  }

  // Generate user ID
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let idSuffix = '';
  for (let i = 0; i < 12; i++) {
    idSuffix += chars[Math.floor(Math.random() * chars.length)];
  }
  const userId = `usr_${idSuffix}` as UserId;

  const profile: UserProfile = {
    id: userId,
    googleId: session.user.googleId,
    displayName,
    username: lower,
    avatarUrl: session.user.image || null,
    email: session.user.email || '',
    type: 'normal',
    claimed: false,
    createdAt: new Date().toISOString(),
    friends: [],
    groups: [],
  };

  await createUser(profile);

  return NextResponse.json({ success: true, userId, username: lower });
}
