import { Redis } from '@upstash/redis';
import { GameData, DayData, PlayerDayData, Username, PLAYERS } from './types';

// Storage abstraction - uses Upstash Redis when available, falls back to in-memory
// Data is stored as a single JSON object under the key "gamedata"

let memoryStore: GameData = { days: {} };

function getRedis(): Redis | null {
  if (
    process.env.KV_REST_API_URL &&
    process.env.KV_REST_API_TOKEN
  ) {
    return new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
  }
  return null;
}

export async function loadData(): Promise<GameData> {
  const redis = getRedis();
  if (redis) {
    const data = await redis.get<GameData>('gamedata');
    if (data) return data;
    // Initialize if empty
    const initial: GameData = { days: {} };
    await redis.set('gamedata', initial);
    return initial;
  }
  // In-memory fallback for local dev
  return memoryStore;
}

export async function saveData(data: GameData): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set('gamedata', data);
    return;
  }
  memoryStore = data;
}

export async function getDayData(dateKey: string): Promise<DayData | null> {
  const data = await loadData();
  return data.days[dateKey] || null;
}

export async function submitScore(
  dateKey: string,
  player: Username,
  rounds: [number, number, number]
): Promise<{ success: boolean; error?: string; revealed: boolean }> {
  const data = await loadData();

  if (!data.days[dateKey]) {
    data.days[dateKey] = {
      james: null,
      tyler: null,
      david: null,
      revealed: false,
    };
  }

  const day = data.days[dateKey];

  // Check if already submitted
  if (day[player]?.submitted) {
    return { success: false, error: 'You have already submitted scores for today.', revealed: day.revealed };
  }

  // Validate rounds
  for (const score of rounds) {
    if (!Number.isInteger(score) || score < 0 || score > 5000) {
      return { success: false, error: 'Each round score must be an integer between 0 and 5000.', revealed: day.revealed };
    }
  }

  day[player] = { rounds, submitted: true };

  // Check if all 3 have submitted -> reveal
  const submittedCount = PLAYERS.filter(p => day[p]?.submitted).length;
  if (submittedCount === 3) {
    day.revealed = true;
  }

  await saveData(data);
  return { success: true, revealed: day.revealed };
}

export async function getSubmissionStatus(dateKey: string): Promise<{
  submitted: Username[];
  notSubmitted: Username[];
  revealed: boolean;
  total: number;
}> {
  const day = await getDayData(dateKey);
  if (!day) {
    return {
      submitted: [],
      notSubmitted: [...PLAYERS],
      revealed: false,
      total: 0,
    };
  }

  const submitted = PLAYERS.filter(p => day[p]?.submitted);
  const notSubmitted = PLAYERS.filter(p => !day[p]?.submitted);

  return {
    submitted,
    notSubmitted,
    revealed: day.revealed,
    total: submitted.length,
  };
}
