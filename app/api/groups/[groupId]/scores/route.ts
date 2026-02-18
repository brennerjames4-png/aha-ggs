import { NextRequest, NextResponse } from 'next/server';
import { getRequiredUser } from '@/lib/auth-helpers';
import { getGroup, getMemberInfos, getDailyScore } from '@/lib/redis';
import { getDailyResultForGroup } from '@/lib/scoring';
import { getTodayKey } from '@/lib/dates';
import { GroupId } from '@/lib/types';

// GET - today's scores or a specific date's scores for this group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { userId } = await getRequiredUser();
    const { groupId } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || getTodayKey();

    const group = await getGroup(groupId as GroupId);
    if (!group || !group.members.includes(userId)) {
      return NextResponse.json({ error: 'Not found or not a member' }, { status: 404 });
    }

    const result = await getDailyResultForGroup(date, group.members, groupId as GroupId);
    const memberInfos = await getMemberInfos(group.members);

    // Include user's own score regardless of reveal
    const myScore = await getDailyScore(userId, date);

    return NextResponse.json({
      result,
      memberInfos,
      myScore: myScore ? { rounds: myScore.rounds, submitted: myScore.submitted } : null,
    }, {
      headers: { 'Cache-Control': 'private, max-age=15, stale-while-revalidate=30' },
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
