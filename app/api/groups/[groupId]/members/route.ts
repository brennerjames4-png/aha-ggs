import { NextRequest, NextResponse } from 'next/server';
import { getRequiredUser } from '@/lib/auth-helpers';
import { getGroup, getMemberInfos, removeGroupMember } from '@/lib/redis';
import { GroupId, UserId } from '@/lib/types';

// GET - list group members
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { userId } = await getRequiredUser();
    const { groupId } = await params;

    const group = await getGroup(groupId as GroupId);
    if (!group || !group.members.includes(userId)) {
      return NextResponse.json({ error: 'Not found or not a member' }, { status: 404 });
    }

    const members = await getMemberInfos(group.members);
    return NextResponse.json({ members, admins: group.admins });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// DELETE - leave group or remove member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { userId } = await getRequiredUser();
    const { groupId } = await params;
    const { searchParams } = new URL(request.url);
    const targetId = (searchParams.get('userId') || userId) as UserId;

    const group = await getGroup(groupId as GroupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (group.isOriginal) {
      return NextResponse.json({ error: 'Cannot leave the OG group' }, { status: 400 });
    }

    // If removing someone else, must be admin
    if (targetId !== userId && !group.admins.includes(userId)) {
      return NextResponse.json({ error: 'Not an admin' }, { status: 403 });
    }

    await removeGroupMember(groupId as GroupId, targetId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
