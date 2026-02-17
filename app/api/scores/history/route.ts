import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { loadData } from '@/lib/storage';
import { getDailyResult, getWeeklyStandings } from '@/lib/scoring';
import { getWeekRange, parseDate, getPreviousWeeks } from '@/lib/dates';

export async function GET(request: NextRequest) {
  const user = getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await loadData();
  const weeks = getPreviousWeeks(12); // Last 12 weeks

  const weekResults = weeks.map(week => {
    const dailyResults = week.dates
      .filter(d => data.days[d]?.revealed)
      .map(d => getDailyResult(d, data.days[d]));

    const standings = getWeeklyStandings(data, week.dates);

    return {
      start: week.start,
      end: week.end,
      dates: week.dates,
      dailyResults,
      standings,
    };
  });

  return NextResponse.json({ weeks: weekResults });
}
