import { NextRequest, NextResponse } from 'next/server';
import { getRequiredUser } from '@/lib/auth-helpers';
import {
  getGroup, getUser, createGroupInvite, getPendingGroupInvites,
  respondToGroupInvite, createNotification,
} from '@/lib/redis';
import { GroupId, UserId } from '@/lib/types';

// POST - invite a friend to the group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { userId } = await getRequiredUser();
    const { groupId } = await params;
    const body = await request.json();
    const { toUserId } = body;

    if (!toUserId) {
      return NextResponse.json({ error: 'toUserId required' }, { status: 400 });
    }

    const group = await getGroup(groupId as GroupId);
    if (!group || !group.members.includes(userId)) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    if (group.members.includes(toUserId as UserId)) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 400 });
    }

    const targetUser = await getUser(toUserId as UserId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const invite = await createGroupInvite(groupId as GroupId, userId, toUserId as UserId);

    const fromUser = await getUser(userId);
    await createNotification(
      toUserId as UserId,
      'group_invite',
      'Group Invite',
      `${fromUser?.displayName || 'Someone'} invited you to join "${group.name}"`,
      { groupId, inviteId: invite.id, fromUserId: userId }
    );

    return NextResponse.json({ invite }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// PATCH - accept or decline invite
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { userId } = await getRequiredUser();
    const body = await request.json();
    const { inviteId, action } = body;

    if (!inviteId || !['accepted', 'declined'].includes(action)) {
      return NextResponse.json({ error: 'inviteId and action (accepted/declined) required' }, { status: 400 });
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
