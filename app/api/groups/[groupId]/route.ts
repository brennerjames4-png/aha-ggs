import { NextRequest, NextResponse } from 'next/server';
import { getRequiredUser } from '@/lib/auth-helpers';
import { getGroup, updateGroup, deleteGroup, getMemberInfos } from '@/lib/redis';
import { GroupId } from '@/lib/types';

// GET - group details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { userId } = await getRequiredUser();
    const { groupId } = await params;

    const group = await getGroup(groupId as GroupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (!group.members.includes(userId)) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    const memberInfos = await getMemberInfos(group.members);

    return NextResponse.json({ group, memberInfos });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// PATCH - update group settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { userId } = await getRequiredUser();
    const { groupId } = await params;

    const group = await getGroup(groupId as GroupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (!group.admins.includes(userId)) {
      return NextResponse.json({ error: 'Not an admin' }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.name) updates.name = body.name;

    const updated = await updateGroup(groupId as GroupId, updates);
    return NextResponse.json({ group: updated });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// DELETE - delete group
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { userId } = await getRequiredUser();
    const { groupId } = await params;

    const group = await getGroup(groupId as GroupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (group.isOriginal) {
      return NextResponse.json({ error: 'Cannot delete the OG group' }, { status: 400 });
    }

    if (!group.admins.includes(userId)) {
      return NextResponse.json({ error: 'Not an admin' }, { status: 403 });
    }

    await deleteGroup(groupId as GroupId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
