import { GameData, DayData, Username, PLAYERS, DailyResult, WeeklyStanding, PlayerStats } from './types';
import { getWeekRange, parseDate } from './dates';
import { loadData } from './storage';

export function getDailyTotal(rounds: [number, number, number]): number {
  return rounds[0] + rounds[1] + rounds[2];
}

export function getDailyResult(dateKey: string, day: DayData): DailyResult {
  const scores: DailyResult['scores'] = { james: null, tyler: null, david: null };
  let winner: Username | null = null;
  let gdWinner: Username | null = null;
  let maxTotal = -1;
  let maxRound = -1;
  let submittedCount = 0;

  for (const player of PLAYERS) {
    const pd = day[player];
    if (pd?.submitted) {
      submittedCount++;
      if (day.revealed) {
        const total = getDailyTotal(pd.rounds);
        scores[player] = { rounds: pd.rounds, total };

        if (total > maxTotal) {
          maxTotal = total;
          winner = player;
        } else if (total === maxTotal) {
          // Tie on daily total — both "win" (tracked separately)
          winner = null; // will be handled below
        }

        const bestRound = Math.max(...pd.rounds);
        if (bestRound > maxRound) {
          maxRound = bestRound;
          gdWinner = player;
        }
      }
    }
  }

  // Recalculate winner handling ties
  if (day.revealed) {
    const totals = PLAYERS
      .filter(p => day[p]?.submitted)
      .map(p => ({ player: p, total: getDailyTotal(day[p]!.rounds) }))
      .sort((a, b) => b.total - a.total);

    if (totals.length > 0) {
      if (totals.length === 1 || totals[0].total > totals[1].total) {
        winner = totals[0].player;
      } else {
        winner = null; // tie
      }
    }

    // GD: find highest single round across all players
    let bestSingleRound = -1;
    let gdWinners: Username[] = [];
    for (const p of PLAYERS) {
      const pd = day[p];
      if (pd?.submitted) {
        const best = Math.max(...pd.rounds);
        if (best > bestSingleRound) {
          bestSingleRound = best;
          gdWinners = [p];
        } else if (best === bestSingleRound) {
          gdWinners.push(p);
        }
      }
    }
    gdWinner = gdWinners.length === 1 ? gdWinners[0] : null; // null if tied
  }

  return {
    date: dateKey,
    scores,
    winner,
    gdWinner,
    revealed: day.revealed,
    submittedCount,
  };
}

export function getWeeklyStandings(data: GameData, weekDates: string[]): WeeklyStanding[] {
  const standings: Record<Username, WeeklyStanding> = {
    james: { player: 'james', daysWon: 0, gdPoints: 0, totalPoints: 0, isWeekWinner: false },
    tyler: { player: 'tyler', daysWon: 0, gdPoints: 0, totalPoints: 0, isWeekWinner: false },
    david: { player: 'david', daysWon: 0, gdPoints: 0, totalPoints: 0, isWeekWinner: false },
  };

  for (const dateKey of weekDates) {
    const day = data.days[dateKey];
    if (!day || !day.revealed) continue;

    const result = getDailyResult(dateKey, day);

    if (result.winner) {
      standings[result.winner].daysWon++;
    }
    if (result.gdWinner) {
      standings[result.gdWinner].gdPoints++;
    }

    for (const p of PLAYERS) {
      const pd = day[p];
      if (pd?.submitted) {
        standings[p].totalPoints += getDailyTotal(pd.rounds);
      }
    }
  }

  // Determine week winner
  const sorted = [...Object.values(standings)].sort((a, b) => {
    if (b.daysWon !== a.daysWon) return b.daysWon - a.daysWon;
    if (b.gdPoints !== a.gdPoints) return b.gdPoints - a.gdPoints;
    return b.totalPoints - a.totalPoints;
  });

  if (sorted[0].daysWon > 0) {
    if (sorted[0].daysWon > sorted[1].daysWon) {
      sorted[0].isWeekWinner = true;
    } else if (sorted[0].gdPoints > sorted[1].gdPoints) {
      sorted[0].isWeekWinner = true;
    } else if (sorted[0].totalPoints > sorted[1].totalPoints) {
      sorted[0].isWeekWinner = true;
    }
  }

  return sorted;
}

export async function getPlayerStats(): Promise<Record<Username, PlayerStats>> {
  const data = await loadData();
  const stats: Record<Username, PlayerStats> = {
    james: createEmptyStats('james'),
    tyler: createEmptyStats('tyler'),
    david: createEmptyStats('david'),
  };

  // Collect all dates sorted
  const allDates = Object.keys(data.days).sort();

  // Track streaks
  const currentStreaks: Record<Username, number> = { james: 0, tyler: 0, david: 0 };
  const bestStreaks: Record<Username, number> = { james: 0, tyler: 0, david: 0 };
  const streakActive: Record<Username, boolean> = { james: true, tyler: true, david: true };

  // Track weeks won
  const weekWins: Record<Username, number> = { james: 0, tyler: 0, david: 0 };
  const processedWeeks = new Set<string>();

  for (const dateKey of allDates) {
    const day = data.days[dateKey];
    if (!day || !day.revealed) continue;

    const result = getDailyResult(dateKey, day);

    for (const p of PLAYERS) {
      const pd = day[p];
      if (pd?.submitted) {
        const total = getDailyTotal(pd.rounds);
        stats[p].gamesPlayed++;
        stats[p].totalPoints += total;
        if (total > stats[p].bestDaily) stats[p].bestDaily = total;
        const bestRound = Math.max(...pd.rounds);
        if (bestRound > stats[p].bestRound) stats[p].bestRound = bestRound;
        stats[p].perfectRounds += pd.rounds.filter(r => r === 5000).length;
      }
    }

    if (result.winner) {
      stats[result.winner].daysWon++;
    }
    if (result.gdWinner) {
      stats[result.gdWinner].gdPoints++;
    }

    // Track streaks (going forward)
    for (const p of PLAYERS) {
      if (result.winner === p) {
        currentStreaks[p]++;
        if (currentStreaks[p] > bestStreaks[p]) bestStreaks[p] = currentStreaks[p];
      } else if (result.winner !== null) {
        // Only break streak if there was a definitive winner who isn't this player
        currentStreaks[p] = 0;
      }
    }

    // Track week wins
    const week = getWeekRange(parseDate(dateKey));
    if (!processedWeeks.has(week.start)) {
      processedWeeks.add(week.start);
      const weekStandings = getWeeklyStandings(data, week.dates);
      const weekWinner = weekStandings.find(s => s.isWeekWinner);
      if (weekWinner) {
        weekWins[weekWinner.player]++;
      }
    }
  }

  for (const p of PLAYERS) {
    stats[p].averageDaily = stats[p].gamesPlayed > 0
      ? Math.round(stats[p].totalPoints / stats[p].gamesPlayed)
      : 0;
    stats[p].currentStreak = currentStreaks[p];
    stats[p].bestStreak = bestStreaks[p];
    stats[p].weeksWon = weekWins[p];
  }

  return stats;
}

function createEmptyStats(player: Username): PlayerStats {
  return {
    player,
    totalPoints: 0,
    gamesPlayed: 0,
    averageDaily: 0,
    bestDaily: 0,
    bestRound: 0,
    daysWon: 0,
    weeksWon: 0,
    gdPoints: 0,
    currentStreak: 0,
    bestStreak: 0,
    perfectRounds: 0,
  };
}
