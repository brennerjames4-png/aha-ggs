import { NextResponse } from 'next/server';
import { getRequiredUser } from '@/lib/auth-helpers';
import { getFriends, getUser } from '@/lib/redis';

// GET - list friends
export async function GET() {
  try {
    const { userId } = await getRequiredUser();
    const friendIds = await getFriends(userId);

    const friends = [];
    for (const fid of friendIds) {
      const user = await getUser(fid);
      if (user) {
        friends.push({
          id: user.id,
          displayName: user.displayName,
          username: user.username,
          avatarUrl: user.avatarUrl,
        });
      }
    }

    return NextResponse.json({ friends });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
