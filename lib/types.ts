export type Username = 'james' | 'tyler' | 'david';

export const PLAYERS: Username[] = ['james', 'tyler', 'david'];

export const DISPLAY_NAMES: Record<Username, string> = {
  james: 'James',
  tyler: 'Tyler',
  david: 'David',
};

export const PLAYER_COLORS: Record<Username, string> = {
  james: '#10B981',  // emerald
  tyler: '#3B82F6',  // blue
  david: '#F59E0B',  // amber
};

export interface PlayerDayData {
  rounds: [number, number, number];
  submitted: boolean;
}

export interface DayData {
  james: PlayerDayData | null;
  tyler: PlayerDayData | null;
  david: PlayerDayData | null;
  revealed: boolean;
}

export interface GameData {
  days: Record<string, DayData>;
}

export interface WeeklyStanding {
  player: Username;
  daysWon: number;
  gdPoints: number;
  totalPoints: number;
  isWeekWinner: boolean;
}

export interface DailyResult {
  date: string;
  scores: Record<Username, { rounds: [number, number, number]; total: number } | null>;
  winner: Username | null;
  gdWinner: Username | null;
  revealed: boolean;
  submittedCount: number;
}

export interface PlayerStats {
  player: Username;
  totalPoints: number;
  gamesPlayed: number;
  averageDaily: number;
  bestDaily: number;
  bestRound: number;
  daysWon: number;
  weeksWon: number;
  gdPoints: number;
  currentStreak: number;
  bestStreak: number;
  perfectRounds: number;
}
