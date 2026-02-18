import { NextRequest, NextResponse } from 'next/server';
import { getRequiredUser } from '@/lib/auth-helpers';
import {
  getFriendRequest, respondToFriendRequest, getUser, createNotification,
} from '@/lib/redis';

// PATCH - accept or decline friend request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const { userId } = await getRequiredUser();
    const { requestId } = await params;
    const body = await request.json();
    const { action } = body;

    if (!['accepted', 'declined'].includes(action)) {
      return NextResponse.json({ error: 'action must be accepted or declined' }, { status: 400 });
    }

    const req = await getFriendRequest(requestId);
    if (!req) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (req.to !== userId) {
      return NextResponse.json({ error: 'Not your request' }, { status: 403 });
    }

    const result = await respondToFriendRequest(requestId, action);

    // Notify sender if accepted
    if (action === 'accepted' && result) {
      const acceptor = await getUser(userId);
      await createNotification(
        result.from,
        'friend_accepted',
        'Friend Request Accepted',
        `${acceptor?.displayName || 'Someone'} accepted your friend request!`,
        { userId }
      );
    }

    return NextResponse.json({ request: result });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
