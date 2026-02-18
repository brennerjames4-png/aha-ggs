import { NextRequest, NextResponse } from 'next/server';
import { getRequiredUser } from '@/lib/auth-helpers';
import { getGroup, getMemberInfos, getDailyScore } from '@/lib/redis';
import { getDailyResultForGroup, getWeeklyStandings, getPlayerStatsForGroup } from '@/lib/scoring';
import { getTodayKey, getWeekRange } from '@/lib/dates';
import { GroupId } from '@/lib/types';

// GET - all dashboard data for a group in one call
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

    const memberInfos = await getMemberInfos(group.members);
    const todayKey = getTodayKey();
    const currentWeek = getWeekRange(new Date());

    // Run all heavy computations in parallel
    const [result, myScore, currentStandings, allTimeStats] = await Promise.all([
      getDailyResultForGroup(todayKey, group.members, groupId as GroupId),
      getDailyScore(userId, todayKey),
      getWeeklyStandings(group.members, currentWeek.dates, groupId as GroupId, memberInfos),
      getPlayerStatsForGroup(group.members, groupId as GroupId, memberInfos),
    ]);

    return NextResponse.json({
      group,
      memberInfos,
      result,
      myScore: myScore ? { rounds: myScore.rounds, submitted: myScore.submitted } : null,
      currentWeek: {
        ...currentWeek,
        standings: currentStandings,
      },
      allTimeStats,
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
