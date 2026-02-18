import {
  UserId, DailyScore, DailyResult, WeeklyStanding, PlayerStats, MemberInfo,
} from './types';
import { getWeekRange, parseDate } from './dates';
import {
  getScoresForDate, getScoresForDates, checkGroupRevealBatch,
  getAllScoreDatesBatch,
} from './redis';
import type { GroupId } from './types';

export function getDailyTotal(rounds: [number, number, number]): number {
  return rounds[0] + rounds[1] + rounds[2];
}

/**
 * Build a DailyResult for a given date and set of member scores.
 */
export function buildDailyResult(
  dateKey: string,
  memberIds: UserId[],
  scores: Record<string, DailyScore | null>,
  revealed: boolean
): DailyResult {
  const resultScores: DailyResult['scores'] = {};
  let submittedCount = 0;

  for (const id of memberIds) {
    const score = scores[id];
    if (score?.submitted) {
      submittedCount++;
      if (revealed) {
        resultScores[id] = {
          rounds: score.rounds,
          total: getDailyTotal(score.rounds),
        };
      } else {
        resultScores[id] = null;
      }
    } else {
      resultScores[id] = null;
    }
  }

  let winner: UserId | null = null;
  let gdWinner: UserId | null = null;

  if (revealed) {
    const totals = memberIds
      .filter(id => scores[id]?.submitted)
      .map(id => ({ id, total: getDailyTotal(scores[id]!.rounds) }))
      .sort((a, b) => b.total - a.total);

    if (totals.length > 0) {
      if (totals.length === 1 || totals[0].total > totals[1].total) {
        winner = totals[0].id;
      }
    }

    let bestSingleRound = -1;
    const gdWinners: UserId[] = [];
    for (const id of memberIds) {
      const score = scores[id];
      if (score?.submitted) {
        const best = Math.max(...score.rounds);
        if (best > bestSingleRound) {
          bestSingleRound = best;
          gdWinners.length = 0;
          gdWinners.push(id);
        } else if (best === bestSingleRound) {
          gdWinners.push(id);
        }
      }
    }
    gdWinner = gdWinners.length === 1 ? gdWinners[0] : null;
  }

  return {
    date: dateKey,
    scores: resultScores,
    winner,
    gdWinner,
    revealed,
    submittedCount,
    totalMembers: memberIds.length,
  };
}

/**
 * Get daily result for a single date within a group context.
 * Uses individual fetches — only for single-date queries.
 */
export async function getDailyResultForGroup(
  dateKey: string,
  memberIds: UserId[],
  groupId: GroupId
): Promise<DailyResult> {
  // Fetch scores and reveal in parallel
  const [scores, revealMap] = await Promise.all([
    getScoresForDate(dateKey, memberIds),
    checkGroupRevealBatch(memberIds, [dateKey]),
  ]);
  return buildDailyResult(dateKey, memberIds, scores, revealMap[dateKey] || false);
}

/**
 * Get weekly standings for a group — batch-optimized.
 * 1 pipeline for all 7 days of scores + 1 pipeline for all 7 reveal checks.
 */
export async function getWeeklyStandings(
  memberIds: UserId[],
  weekDates: string[],
  groupId: GroupId,
  profileMap: Record<string, MemberInfo>
): Promise<WeeklyStanding[]> {
  const standings: Record<string, WeeklyStanding> = {};

  for (const id of memberIds) {
    const info = profileMap[id] || { displayName: id, username: id, avatarUrl: null };
    standings[id] = {
      userId: id,
      displayName: info.displayName,
      username: info.username,
      avatarUrl: info.avatarUrl,
      daysWon: 0,
      gdPoints: 0,
      totalPoints: 0,
      isWeekWinner: false,
    };
  }

  // Batch fetch: all scores for all dates + all reveal checks
  const [allScores, revealMap] = await Promise.all([
    getScoresForDates(weekDates, memberIds),
    checkGroupRevealBatch(memberIds, weekDates),
  ]);

  for (const dateKey of weekDates) {
    if (!revealMap[dateKey]) continue;

    const scores = allScores[dateKey];
    const result = buildDailyResult(dateKey, memberIds, scores, true);

    if (result.winner) {
      standings[result.winner].daysWon++;
    }
    if (result.gdWinner) {
      standings[result.gdWinner].gdPoints++;
    }

    for (const id of memberIds) {
      const score = scores[id];
      if (score?.submitted) {
        standings[id].totalPoints += getDailyTotal(score.rounds);
      }
    }
  }

  const sorted = Object.values(standings).sort((a, b) => {
    if (b.daysWon !== a.daysWon) return b.daysWon - a.daysWon;
    if (b.gdPoints !== a.gdPoints) return b.gdPoints - a.gdPoints;
    return b.totalPoints - a.totalPoints;
  });

  if (sorted.length > 0 && sorted[0].daysWon > 0) {
    if (sorted.length === 1) {
      sorted[0].isWeekWinner = true;
    } else if (sorted[0].daysWon > sorted[1].daysWon) {
      sorted[0].isWeekWinner = true;
    } else if (sorted[0].gdPoints > sorted[1].gdPoints) {
      sorted[0].isWeekWinner = true;
    } else if (sorted[0].totalPoints > sorted[1].totalPoints) {
      sorted[0].isWeekWinner = true;
    }
  }

  return sorted;
}

/**
 * Get all-time player stats for a group — batch-optimized.
 * Instead of N+1 per date, does 2 pipelines total (scores + reveals).
 */
export async function getPlayerStatsForGroup(
  memberIds: UserId[],
  groupId: GroupId,
  profileMap: Record<string, MemberInfo>
): Promise<PlayerStats[]> {
  const stats: Record<string, PlayerStats> = {};

  for (const id of memberIds) {
    const info = profileMap[id] || { displayName: id, username: id, avatarUrl: null };
    stats[id] = {
      userId: id,
      displayName: info.displayName,
      username: info.username,
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

  // Batch fetch all score dates for all members (1 pipeline)
  const allDatesByUser = await getAllScoreDatesBatch(memberIds);
  const allDatesSet = new Set<string>();
  for (const id of memberIds) {
    for (const d of allDatesByUser[id] || []) {
      allDatesSet.add(d);
    }
  }
  const allDates = Array.from(allDatesSet).sort();

  if (allDates.length === 0) return Object.values(stats);

  // Batch fetch all scores + all reveals (2 pipelines)
  const [allScores, revealMap] = await Promise.all([
    getScoresForDates(allDates, memberIds),
    checkGroupRevealBatch(memberIds, allDates),
  ]);

  const currentStreaks: Record<string, number> = {};
  const bestStreaks: Record<string, number> = {};
  for (const id of memberIds) {
    currentStreaks[id] = 0;
    bestStreaks[id] = 0;
  }

  // Track weeks for week-winner computation
  const weekDatesMap = new Map<string, string[]>(); // weekStart -> dates in that week

  for (const dateKey of allDates) {
    if (!revealMap[dateKey]) continue;

    const scores = allScores[dateKey];
    const result = buildDailyResult(dateKey, memberIds, scores, true);

    for (const id of memberIds) {
      const score = scores[id];
      if (score?.submitted) {
        const total = getDailyTotal(score.rounds);
        stats[id].gamesPlayed++;
        stats[id].totalPoints += total;
        if (total > stats[id].bestDaily) stats[id].bestDaily = total;
        const bestRound = Math.max(...score.rounds);
        if (bestRound > stats[id].bestRound) stats[id].bestRound = bestRound;
        stats[id].perfectRounds += score.rounds.filter(r => r === 5000).length;
      }
    }

    if (result.winner) {
      stats[result.winner].daysWon++;
    }
    if (result.gdWinner) {
      stats[result.gdWinner].gdPoints++;
    }

    for (const id of memberIds) {
      if (result.winner === id) {
        currentStreaks[id]++;
        if (currentStreaks[id] > bestStreaks[id]) bestStreaks[id] = currentStreaks[id];
      } else if (result.winner !== null) {
        currentStreaks[id] = 0;
      }
    }

    // Group dates by week for week-winner calc
    const week = getWeekRange(parseDate(dateKey));
    if (!weekDatesMap.has(week.start)) {
      weekDatesMap.set(week.start, []);
    }
    weekDatesMap.get(week.start)!.push(dateKey);
  }

  // Compute week winners using already-fetched data (no more Redis calls!)
  const weekWins: Record<string, number> = {};
  for (const id of memberIds) {
    weekWins[id] = 0;
  }

  for (const [, weekDates] of weekDatesMap) {
    // Compute standings for this week from cached data
    const weekStandings: Record<string, { daysWon: number; gdPoints: number; totalPoints: number }> = {};
    for (const id of memberIds) {
      weekStandings[id] = { daysWon: 0, gdPoints: 0, totalPoints: 0 };
    }

    for (const dateKey of weekDates) {
      if (!revealMap[dateKey]) continue;
      const scores = allScores[dateKey];
      const result = buildDailyResult(dateKey, memberIds, scores, true);

      if (result.winner) weekStandings[result.winner].daysWon++;
      if (result.gdWinner) weekStandings[result.gdWinner].gdPoints++;

      for (const id of memberIds) {
        const score = scores[id];
        if (score?.submitted) {
          weekStandings[id].totalPoints += getDailyTotal(score.rounds);
        }
      }
    }

    const sorted = Object.entries(weekStandings).sort(([, a], [, b]) => {
      if (b.daysWon !== a.daysWon) return b.daysWon - a.daysWon;
      if (b.gdPoints !== a.gdPoints) return b.gdPoints - a.gdPoints;
      return b.totalPoints - a.totalPoints;
    });

    if (sorted.length > 0 && sorted[0][1].daysWon > 0) {
      const isUnique = sorted.length === 1 ||
        sorted[0][1].daysWon > sorted[1][1].daysWon ||
        (sorted[0][1].daysWon === sorted[1][1].daysWon && sorted[0][1].gdPoints > sorted[1][1].gdPoints) ||
        (sorted[0][1].daysWon === sorted[1][1].daysWon && sorted[0][1].gdPoints === sorted[1][1].gdPoints && sorted[0][1].totalPoints > sorted[1][1].totalPoints);
      if (isUnique) {
        weekWins[sorted[0][0]]++;
      }
    }
  }

  for (const id of memberIds) {
    stats[id].averageDaily = stats[id].gamesPlayed > 0
      ? Math.round(stats[id].totalPoints / stats[id].gamesPlayed)
      : 0;
    stats[id].currentStreak = currentStreaks[id];
    stats[id].bestStreak = bestStreaks[id];
    stats[id].weeksWon = weekWins[id];
  }

  return Object.values(stats);
}
