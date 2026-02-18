import { NextRequest, NextResponse } from 'next/server';
import { getRequiredUser } from '@/lib/auth-helpers';
import { getUserGroups, createGroup, getUser, getPendingGroupInvites, getGroup } from '@/lib/redis';
import { GroupId, UserId } from '@/lib/types';

// GET - list user's groups + pending invites
export async function GET() {
  try {
    const { userId } = await getRequiredUser();
    const [groups, pendingInvites] = await Promise.all([
      getUserGroups(userId),
      getPendingGroupInvites(userId),
    ]);

    // Enrich invites with group info and inviter info
    const enrichedInvites = await Promise.all(
      pendingInvites.map(async (invite) => {
        const [group, fromUser] = await Promise.all([
          getGroup(invite.groupId),
          getUser(invite.from),
        ]);
        return {
          id: invite.id,
          groupId: invite.groupId,
          groupName: group?.name || 'Unknown Group',
          from: invite.from,
          fromDisplayName: fromUser?.displayName || 'Someone',
          fromUsername: fromUser?.username || null,
          fromAvatarUrl: fromUser?.avatarUrl || null,
          createdAt: invite.createdAt,
        };
      })
    );

    return NextResponse.json({ groups, pendingInvites: enrichedInvites });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// POST - create a new group
export async function POST(request: NextRequest) {
  try {
    const { userId } = await getRequiredUser();
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || name.length < 2 || name.length > 50) {
      return NextResponse.json({ error: 'Group name must be 2-50 characters' }, { status: 400 });
    }

    const group = await createGroup(name, userId, [userId]);
    return NextResponse.json({ group }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
