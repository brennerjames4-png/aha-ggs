import { NextRequest, NextResponse } from 'next/server';
import { getRequiredUser } from '@/lib/auth-helpers';
import { getGroup, getMemberInfos } from '@/lib/redis';
import { getWeeklyStandings, getPlayerStatsForGroup } from '@/lib/scoring';
import { getWeekRange, getPreviousWeeks } from '@/lib/dates';
import { GroupId } from '@/lib/types';

// GET - weekly standings + all-time stats for this group
export async function GET(
  request: NextRequest,
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

    // Current week standings
    const currentWeek = getWeekRange(new Date());
    const currentStandings = await getWeeklyStandings(
      group.members, currentWeek.dates, groupId as GroupId, memberInfos
    );

    // All-time stats
    const allTimeStats = await getPlayerStatsForGroup(
      group.members, groupId as GroupId, memberInfos
    );

    return NextResponse.json({
      currentWeek: {
        ...currentWeek,
        standings: currentStandings,
      },
      allTimeStats,
      memberInfos,
    }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' },
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
