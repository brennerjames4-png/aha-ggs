import { NextRequest, NextResponse } from 'next/server';
import { getRequiredUser } from '@/lib/auth-helpers';
import {
  createFriendRequest, getPendingFriendRequests, areFriends,
  getUser, createNotification,
} from '@/lib/redis';
import { UserId } from '@/lib/types';

// POST - send friend request
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getRequiredUser();
    const body = await request.json();
    const { toUserId } = body;

    if (!toUserId) {
      return NextResponse.json({ error: 'toUserId required' }, { status: 400 });
    }

    if (toUserId === userId) {
      return NextResponse.json({ error: 'Cannot friend yourself' }, { status: 400 });
    }

    const targetUser = await getUser(toUserId as UserId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if already friends
    if (await areFriends(userId, toUserId as UserId)) {
      return NextResponse.json({ error: 'Already friends' }, { status: 400 });
    }

    const friendRequest = await createFriendRequest(userId, toUserId as UserId);

    // Notify target user
    const fromUser = await getUser(userId);
    await createNotification(
      toUserId as UserId,
      'friend_request',
      'Friend Request',
      `${fromUser?.displayName || 'Someone'} wants to be friends!`,
      { requestId: friendRequest.id, fromUserId: userId }
    );

    return NextResponse.json({ request: friendRequest }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// GET - pending incoming requests
export async function GET() {
  try {
    const { userId } = await getRequiredUser();
    const requests = await getPendingFriendRequests(userId);

    // Enrich with user info
    const enriched = [];
    for (const req of requests) {
      const fromUser = await getUser(req.from);
      enriched.push({
        ...req,
        fromUser: fromUser ? {
          id: fromUser.id,
          displayName: fromUser.displayName,
          username: fromUser.username,
          avatarUrl: fromUser.avatarUrl,
        } : null,
      });
    }

    return NextResponse.json({ requests: enriched });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
