import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getPlayerStats } from '@/lib/scoring';
import { loadData } from '@/lib/storage';
import { getWeekRange, getTodayKey } from '@/lib/dates';
import { getWeeklyStandings } from '@/lib/scoring';
import { PLAYERS } from '@/lib/types';

export async function GET(request: NextRequest) {
  const user = getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stats = await getPlayerStats();
  const data = await loadData();

  // Current week standings
  const today = new Date();
  const currentWeek = getWeekRange(today);
  const currentWeekStandings = getWeeklyStandings(data, currentWeek.dates);

  // Head-to-head records
  const h2h: Record<string, { wins: number; losses: number }> = {};
  const allDates = Object.keys(data.days).sort();
  for (const p1 of PLAYERS) {
    for (const p2 of PLAYERS) {
      if (p1 === p2) continue;
      const key = `${p1}_vs_${p2}`;
      h2h[key] = { wins: 0, losses: 0 };
    }
  }

  for (const dateKey of allDates) {
    const day = data.days[dateKey];
    if (!day?.revealed) continue;

    const totals: Record<string, number> = {};
    for (const p of PLAYERS) {
      if (day[p]?.submitted) {
        totals[p] = day[p]!.rounds.reduce((a, b) => a + b, 0);
      }
    }

    for (const p1 of PLAYERS) {
      for (const p2 of PLAYERS) {
        if (p1 === p2) continue;
        if (totals[p1] !== undefined && totals[p2] !== undefined) {
          if (totals[p1] > totals[p2]) {
            h2h[`${p1}_vs_${p2}`].wins++;
          } else if (totals[p1] < totals[p2]) {
            h2h[`${p1}_vs_${p2}`].losses++;
          }
        }
      }
    }
  }

  return NextResponse.json({
    stats,
    currentWeek: {
      ...currentWeek,
      standings: currentWeekStandings,
    },
    headToHead: h2h,
  });
}
