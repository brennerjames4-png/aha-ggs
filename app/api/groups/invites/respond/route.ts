import { NextRequest, NextResponse } from 'next/server';
import { getRequiredUser } from '@/lib/auth-helpers';
import { respondToGroupInvite, getGroupInvite } from '@/lib/redis';

// PATCH - accept or decline a group invite
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await getRequiredUser();
    const body = await request.json();
    const { inviteId, action } = body;

    if (!inviteId || !['accepted', 'declined'].includes(action)) {
      return NextResponse.json({ error: 'inviteId and action (accepted/declined) required' }, { status: 400 });
    }

    // Verify this invite is for the current user
    const invite = await getGroupInvite(inviteId);
    if (!invite || invite.to !== userId) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    const result = await respondToGroupInvite(inviteId, action);
    if (!result) {
      return NextResponse.json({ error: 'Invite not found or already responded' }, { status: 404 });
    }

    return NextResponse.json({ invite: result });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
