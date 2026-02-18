import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getUser, getUserByUsername, areFriends } from '@/lib/redis';
import { UserId } from '@/lib/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId } = await params;

  // Try by userId first, then by username
  let user = await getUser(userId as UserId);
  if (!user) {
    user = await getUserByUsername(userId);
  }
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Check friend status if viewer is logged in
  let isFriend = false;
  if (session.user.id) {
    isFriend = await areFriends(session.user.id as UserId, user.id);
  }

  return NextResponse.json({
    user: {
      id: user.id,
      displayName: user.displayName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      type: user.type,
      createdAt: user.createdAt,
      groups: user.groups,
    },
    isFriend,
  });
}
