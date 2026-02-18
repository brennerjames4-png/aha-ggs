import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { searchUsers, isUsernameTaken, isUsernameReserved } from '@/lib/redis';
import { RESERVED_USERNAMES } from '@/lib/types';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  // Username availability check
  const check = searchParams.get('check');
  if (check) {
    const lower = check.toLowerCase();
    const reserved = RESERVED_USERNAMES.has(lower) || await isUsernameReserved(lower);
    const taken = await isUsernameTaken(lower);
    return NextResponse.json({ available: !reserved && !taken });
  }

  // User search
  const q = searchParams.get('q');
  if (!q || q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  const users = await searchUsers(q, 10);

  // Return safe public info
  const results = users.map(u => ({
    id: u.id,
    displayName: u.displayName,
    username: u.username,
    avatarUrl: u.avatarUrl,
  }));

  return NextResponse.json({ users: results });
}
