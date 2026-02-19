import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createUser, setUserPassword, isUsernameTaken, isUsernameReserved } from '@/lib/redis';
import { RESERVED_USERNAMES, UserId } from '@/lib/types';

function generateId(): UserId {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `usr_${id}` as UserId;
}

export async function POST(request: NextRequest) {
  try {
    const { username, password, displayName } = await request.json();

    // Validate username
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }
    const lower = username.toLowerCase().trim();
    if (lower.length < 3 || lower.length > 20) {
      return NextResponse.json({ error: 'Username must be 3-20 characters' }, { status: 400 });
    }
    if (!/^[a-z0-9_]+$/.test(lower)) {
      return NextResponse.json({ error: 'Username can only contain letters, numbers, and underscores' }, { status: 400 });
    }

    // Validate password
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }
    if (!/[A-Z]/.test(password)) {
      return NextResponse.json({ error: 'Password must include at least 1 uppercase letter' }, { status: 400 });
    }
    if (!/[0-9]/.test(password)) {
      return NextResponse.json({ error: 'Password must include at least 1 number' }, { status: 400 });
    }

    // Validate display name
    const name = (displayName || username).trim();
    if (!name || name.length > 50) {
      return NextResponse.json({ error: 'Display name must be 1-50 characters' }, { status: 400 });
    }

    // Check username availability
    const reserved = RESERVED_USERNAMES.has(lower) || await isUsernameReserved(lower);
    if (reserved) {
      return NextResponse.json({ error: 'Username is reserved' }, { status: 400 });
    }
    const taken = await isUsernameTaken(lower);
    if (taken) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });
    }

    // Create user
    const userId = generateId();
    const hash = await bcrypt.hash(password, 10);

    await createUser({
      id: userId,
      googleId: '',
      displayName: name,
      username: lower,
      avatarUrl: null,
      email: '',
      type: 'normal',
      claimed: false,
      createdAt: new Date().toISOString(),
      friends: [],
      groups: [],
    });

    await setUserPassword(userId, hash);

    return NextResponse.json({ success: true, userId });
  } catch {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
