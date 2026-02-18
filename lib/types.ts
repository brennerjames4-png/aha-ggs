// === ID Types ===
export type UserId = `usr_${string}` | `legacy_${string}`;
export type GroupId = `grp_${string}`;

// === User Types ===
export type UserType = 'legacy' | 'normal';

export interface UserProfile {
  id: UserId;
  googleId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  email: string;
  type: UserType;
  claimed: boolean;
  createdAt: string; // ISO date
  friends: UserId[];
  groups: GroupId[];
}

// === Legacy Mappings ===
// Old hardcoded usernames -> new usernames
export const LEGACY_TO_USERNAME: Record<string, string> = {
  james: 'jimbo',
  tyler: 'tbone',
  david: 'thewizard',
};

// Old hardcoded usernames -> legacy user IDs
export const LEGACY_TO_ID: Record<string, UserId> = {
  james: 'legacy_james',
  tyler: 'legacy_tyler',
  david: 'legacy_david',
};

export const LEGACY_DISPLAY_NAMES: Record<UserId, string> = {
  legacy_james: 'James',
  legacy_tyler: 'Tyler',
  legacy_david: 'David',
} as Record<UserId, string>;

export const LEGACY_IDS: UserId[] = ['legacy_james', 'legacy_tyler', 'legacy_david'];

export const RESERVED_USERNAMES = new Set([
  'jimbo', 'tbone', 'thewizard',
  'james', 'tyler', 'david',
  'admin', 'mod', 'system', 'aha', 'ahaggs',
  'api', 'login', 'logout', 'settings', 'profile',
  'groups', 'friends', 'notifications', 'onboarding', 'claim',
]);

// === Group Types ===
export interface GroupSettings {
  revealMode: 'all_submitted'; // only mode for now: reveal when all members submit
}

export interface Group {
  id: GroupId;
  name: string;
  createdBy: UserId;
  admins: UserId[];
  members: UserId[];
  settings: GroupSettings;
  isOriginal: boolean; // true for the OG group
  createdAt: string; // ISO date
}

// === Score Types ===
export interface DailyScore {
  userId: UserId;
  date: string; // YYYY-MM-DD
  rounds: [number, number, number];
  submitted: boolean;
  submittedAt: string; // ISO date
}

// === Friend System ===
export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

export interface FriendRequest {
  id: string;
  from: UserId;
  to: UserId;
  status: FriendRequestStatus;
  createdAt: string;
  respondedAt: string | null;
}

// === Group Invites ===
export type GroupInviteStatus = 'pending' | 'accepted' | 'declined';

export interface GroupInvite {
  id: string;
  groupId: GroupId;
  from: UserId;
  to: UserId;
  status: GroupInviteStatus;
  createdAt: string;
  respondedAt: string | null;
}

// === Notifications ===
export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'group_invite'
  | 'scores_revealed'
  | 'legacy_claimed';

export interface Notification {
  id: string;
  userId: UserId;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, string>; // contextual payload (groupId, fromUserId, etc.)
  read: boolean;
  createdAt: string;
}

// === Claim Codes ===
export interface ClaimCode {
  code: string;
  legacyId: UserId;
  legacyUsername: string; // 'james' | 'tyler' | 'david'
  claimed: boolean;
  claimedBy: UserId | null;
  claimedAt: string | null;
}

// === Computed / View Types (used by scoring + UI) ===

export interface MemberInfo {
  id: UserId;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

export interface WeeklyStanding {
  userId: UserId;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  daysWon: number;
  gdPoints: number;
  totalPoints: number;
  isWeekWinner: boolean;
}

export interface DailyResult {
  date: string;
  scores: Record<string, { rounds: [number, number, number]; total: number } | null>; // keyed by UserId
  winner: UserId | null;
  gdWinner: UserId | null;
  revealed: boolean;
  submittedCount: number;
  totalMembers: number;
}

export interface PlayerStats {
  userId: UserId;
  displayName: string;
  username: string;
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
