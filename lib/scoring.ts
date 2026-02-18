import {
  UserId, DailyScore, DailyResult, WeeklyStanding, PlayerStats, MemberInfo,
} from './types';
import { getWeekRange, parseDate } from './dates';
import {
  getScoresForDate, getAllScoreDates, checkGroupReveal,
} from './redis';
import type { GroupId } from './types';

export function getDailyTotal(rounds: [number, number, number]): number {
  return rounds[0] + rounds[1] + rounds[2];
}

/**
 * Build a DailyResult for a given date and set of member scores.
 * `revealed` is true only if ALL members have submitted.
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
    // Find daily winner
    const totals = memberIds
      .filter(id => scores[id]?.submitted)
      .map(id => ({ id, total: getDailyTotal(scores[id]!.rounds) }))
      .sort((a, b) => b.total - a.total);

    if (totals.length > 0) {
      if (totals.length === 1 || totals[0].total > totals[1].total) {
        winner = totals[0].id;
      }
    }

    // Find GD winner (best single round)
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
 * Get daily result for a date within a group context.
 */
export async function getDailyResultForGroup(
  dateKey: string,
  memberIds: UserId[],
  groupId: GroupId
): Promise<DailyResult> {
  const scores = await getScoresForDate(dateKey, memberIds);
  const revealed = await checkGroupReveal(groupId, dateKey);
  return buildDailyResult(dateKey, memberIds, scores, revealed);
}

/**
 * Get weekly standings for a group.
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

  for (const dateKey of weekDates) {
    const scores = await getScoresForDate(dateKey, memberIds);
    const revealed = await checkGroupReveal(groupId, dateKey);
    if (!revealed) continue;

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
 * Get all-time player stats for a group.
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

  // Collect all dates where any member has scores
  const allDatesSet = new Set<string>();
  for (const id of memberIds) {
    const dates = await getAllScoreDates(id);
    dates.forEach(d => allDatesSet.add(d));
  }
  const allDates = Array.from(allDatesSet).sort();

  const currentStreaks: Record<string, number> = {};
  const bestStreaks: Record<string, number> = {};
  for (const id of memberIds) {
    currentStreaks[id] = 0;
    bestStreaks[id] = 0;
  }

  const processedWeeks = new Set<string>();
  const weekWins: Record<string, number> = {};
  for (const id of memberIds) {
    weekWins[id] = 0;
  }

  for (const dateKey of allDates) {
    const scores = await getScoresForDate(dateKey, memberIds);
    const revealed = await checkGroupReveal(groupId, dateKey);
    if (!revealed) continue;

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

    const week = getWeekRange(parseDate(dateKey));
    if (!processedWeeks.has(week.start)) {
      processedWeeks.add(week.start);
      const weekStandings = await getWeeklyStandings(memberIds, week.dates, groupId, profileMap);
      const weekWinner = weekStandings.find(s => s.isWeekWinner);
      if (weekWinner) {
        weekWins[weekWinner.userId]++;
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
