import { Redis } from '@upstash/redis';
import {
  UserId, GroupId, UserProfile, Group, GroupSettings,
  DailyScore, FriendRequest, FriendRequestStatus,
  GroupInvite, GroupInviteStatus, Notification, NotificationType,
  ClaimCode, MemberInfo, LEGACY_IDS, DailyInsight,
} from './types';

// === Singleton Redis Client ===

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    });
  }
  return _redis;
}

function parseJson<T>(data: unknown): T | null {
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : data as unknown as T;
}

function generateId(prefix: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 12; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}_${id}`;
}

// ============================================================
// USERS
// ============================================================

export async function createUser(profile: UserProfile): Promise<void> {
  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.set(`user:${profile.id}`, JSON.stringify(profile));
  if (profile.googleId) {
    pipeline.set(`user:google:${profile.googleId}`, profile.id);
  }
  pipeline.set(`user:username:${profile.username.toLowerCase()}`, profile.id);
  for (const gid of profile.groups) {
    pipeline.sadd(`user:groups:${profile.id}`, gid);
  }
  for (const fid of profile.friends) {
    pipeline.sadd(`friends:${profile.id}`, fid);
  }
  await pipeline.exec();
}

export async function getUser(userId: UserId): Promise<UserProfile | null> {
  const redis = getRedis();
  const data = await redis.get<string>(`user:${userId}`);
  return parseJson<UserProfile>(data);
}

export async function getUserByGoogleId(googleId: string): Promise<UserProfile | null> {
  const redis = getRedis();
  const userId = await redis.get<string>(`user:google:${googleId}`);
  if (!userId) return null;
  return getUser(userId as UserId);
}

export async function getUserByUsername(username: string): Promise<UserProfile | null> {
  const redis = getRedis();
  const userId = await redis.get<string>(`user:username:${username.toLowerCase()}`);
  if (!userId) return null;
  return getUser(userId as UserId);
}

export async function updateUser(userId: UserId, updates: Partial<UserProfile>): Promise<UserProfile | null> {
  const user = await getUser(userId);
  if (!user) return null;

  const redis = getRedis();

  if (updates.username && updates.username !== user.username) {
    const pipeline = redis.pipeline();
    pipeline.del(`user:username:${user.username.toLowerCase()}`);
    pipeline.set(`user:username:${updates.username.toLowerCase()}`, userId);
    await pipeline.exec();
  }

  const updated = { ...user, ...updates };
  await redis.set(`user:${userId}`, JSON.stringify(updated));
  return updated;
}

export async function searchUsers(query: string, limit = 10): Promise<UserProfile[]> {
  const redis = getRedis();
  const results: UserProfile[] = [];
  const lowerQ = query.toLowerCase();

  let cursor = 0;
  do {
    const [nextCursor, keys] = await redis.scan(cursor, { match: 'user:usr_*', count: 100 });
    cursor = typeof nextCursor === 'string' ? parseInt(nextCursor) : nextCursor;

    // Pipeline all gets for this batch
    const profileKeys = keys.filter((k: string) =>
      !k.includes(':google:') && !k.includes(':username:') && !k.includes(':groups:') && !k.includes(':scores:')
    );
    if (profileKeys.length > 0) {
      const pipeline = redis.pipeline();
      for (const key of profileKeys) {
        pipeline.get(key);
      }
      const batchResults = await pipeline.exec();
      for (const data of batchResults) {
        if (results.length >= limit) break;
        const user = parseJson<UserProfile>(data);
        if (user && (
          user.username.toLowerCase().includes(lowerQ) ||
          user.displayName.toLowerCase().includes(lowerQ)
        )) {
          results.push(user);
        }
      }
    }
  } while (cursor !== 0 && results.length < limit);

  // Also search legacy users
  if (results.length < limit) {
    const pipeline = redis.pipeline();
    for (const legacyId of LEGACY_IDS) {
      pipeline.get(`user:${legacyId}`);
    }
    const legacyResults = await pipeline.exec();
    for (const data of legacyResults) {
      if (results.length >= limit) break;
      const user = parseJson<UserProfile>(data);
      if (user && !results.find(r => r.id === user.id)) {
        if (
          user.username.toLowerCase().includes(lowerQ) ||
          user.displayName.toLowerCase().includes(lowerQ)
        ) {
          results.push(user);
        }
      }
    }
  }

  return results;
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const redis = getRedis();
  const exists = await redis.exists(`user:username:${username.toLowerCase()}`);
  return exists === 1;
}

export async function setUserPassword(userId: UserId, hashedPassword: string): Promise<void> {
  const redis = getRedis();
  await redis.set(`user:password:${userId}`, hashedPassword);
}

export async function getUserPassword(userId: UserId): Promise<string | null> {
  const redis = getRedis();
  return await redis.get<string>(`user:password:${userId}`);
}

// ============================================================
// SCORES
// ============================================================

export async function submitDailyScore(
  userId: UserId,
  date: string,
  rounds: [number, number, number]
): Promise<{ success: boolean; error?: string }> {
  const existing = await getDailyScore(userId, date);
  if (existing?.submitted) {
    return { success: false, error: 'You have already submitted scores for today.' };
  }

  for (const score of rounds) {
    if (!Number.isInteger(score) || score < 0 || score > 5000) {
      return { success: false, error: 'Each round score must be an integer between 0 and 5000.' };
    }
  }

  const dailyScore: DailyScore = {
    userId,
    date,
    rounds,
    submitted: true,
    submittedAt: new Date().toISOString(),
  };

  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.set(`scores:${userId}:${date}`, JSON.stringify(dailyScore));
  pipeline.sadd(`submissions:${date}`, userId);
  pipeline.sadd(`user:scores:dates:${userId}`, date);
  await pipeline.exec();

  return { success: true };
}

export async function getDailyScore(userId: UserId, date: string): Promise<DailyScore | null> {
  const redis = getRedis();
  const data = await redis.get<string>(`scores:${userId}:${date}`);
  return parseJson<DailyScore>(data);
}

export async function getScoresForDate(date: string, memberIds: UserId[]): Promise<Record<string, DailyScore | null>> {
  const scores: Record<string, DailyScore | null> = {};
  if (memberIds.length === 0) return scores;

  const redis = getRedis();
  const pipeline = redis.pipeline();
  for (const id of memberIds) {
    pipeline.get(`scores:${id}:${date}`);
  }
  const results = await pipeline.exec();

  memberIds.forEach((id, i) => {
    scores[id] = parseJson<DailyScore>(results[i]);
  });

  return scores;
}

/**
 * Batch fetch scores for multiple dates + members in a single pipeline.
 * Returns a map of date -> { memberId -> DailyScore | null }
 */
export async function getScoresForDates(
  dates: string[],
  memberIds: UserId[]
): Promise<Record<string, Record<string, DailyScore | null>>> {
  if (dates.length === 0 || memberIds.length === 0) return {};

  const redis = getRedis();
  const pipeline = redis.pipeline();
  const keys: { date: string; memberId: UserId }[] = [];

  for (const date of dates) {
    for (const id of memberIds) {
      pipeline.get(`scores:${id}:${date}`);
      keys.push({ date, memberId: id });
    }
  }

  const results = await pipeline.exec();
  const out: Record<string, Record<string, DailyScore | null>> = {};

  for (const date of dates) {
    out[date] = {};
  }

  keys.forEach(({ date, memberId }, i) => {
    out[date][memberId] = parseJson<DailyScore>(results[i]);
  });

  return out;
}

/**
 * Batch check reveal status for multiple dates given a group's members.
 * Returns a map of date -> boolean.
 */
export async function checkGroupRevealBatch(
  members: UserId[],
  dates: string[]
): Promise<Record<string, boolean>> {
  if (dates.length === 0) return {};

  const redis = getRedis();
  const pipeline = redis.pipeline();
  for (const date of dates) {
    pipeline.smembers(`submissions:${date}`);
  }
  const results = await pipeline.exec();

  const out: Record<string, boolean> = {};
  dates.forEach((date, i) => {
    const submitters = new Set(results[i] as string[]);
    out[date] = members.every(m => submitters.has(m));
  });

  return out;
}

export async function getAllScoreDates(userId: UserId): Promise<string[]> {
  const redis = getRedis();
  const dates = await redis.smembers(`user:scores:dates:${userId}`);
  return (dates as string[]).sort();
}

/**
 * Batch fetch all score dates for multiple users in a single pipeline.
 */
export async function getAllScoreDatesBatch(userIds: UserId[]): Promise<Record<string, string[]>> {
  if (userIds.length === 0) return {};

  const redis = getRedis();
  const pipeline = redis.pipeline();
  for (const id of userIds) {
    pipeline.smembers(`user:scores:dates:${id}`);
  }
  const results = await pipeline.exec();

  const out: Record<string, string[]> = {};
  userIds.forEach((id, i) => {
    out[id] = ((results[i] || []) as string[]).sort();
  });
  return out;
}

// ============================================================
// GROUPS
// ============================================================

export async function createGroup(
  name: string,
  createdBy: UserId,
  memberIds: UserId[],
  isOriginal = false
): Promise<Group> {
  const id = (isOriginal ? 'grp_og' : generateId('grp')) as GroupId;

  const group: Group = {
    id,
    name,
    createdBy,
    admins: [createdBy],
    members: memberIds,
    settings: { revealMode: 'all_submitted' },
    isOriginal,
    createdAt: new Date().toISOString(),
  };

  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.set(`group:${id}`, JSON.stringify(group));
  for (const uid of memberIds) {
    pipeline.sadd(`user:groups:${uid}`, id);
  }
  await pipeline.exec();

  return group;
}

export async function getGroup(groupId: GroupId): Promise<Group | null> {
  const redis = getRedis();
  const data = await redis.get<string>(`group:${groupId}`);
  return parseJson<Group>(data);
}

export async function updateGroup(groupId: GroupId, updates: Partial<Group>): Promise<Group | null> {
  const group = await getGroup(groupId);
  if (!group) return null;

  const redis = getRedis();
  const updated = { ...group, ...updates };
  await redis.set(`group:${groupId}`, JSON.stringify(updated));
  return updated;
}

export async function getUserGroups(userId: UserId): Promise<Group[]> {
  const redis = getRedis();
  const groupIds = await redis.smembers(`user:groups:${userId}`);
  if (!groupIds || groupIds.length === 0) return [];

  // Pipeline all group fetches
  const pipeline = redis.pipeline();
  for (const gid of groupIds) {
    pipeline.get(`group:${gid}`);
  }
  const results = await pipeline.exec();

  const groups: Group[] = [];
  for (const data of results) {
    const group = parseJson<Group>(data);
    if (group) groups.push(group);
  }
  return groups;
}

export async function addGroupMember(groupId: GroupId, userId: UserId): Promise<boolean> {
  const group = await getGroup(groupId);
  if (!group) return false;
  if (group.members.includes(userId)) return true;

  group.members.push(userId);
  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.set(`group:${groupId}`, JSON.stringify(group));
  pipeline.sadd(`user:groups:${userId}`, groupId);
  await pipeline.exec();
  return true;
}

export async function removeGroupMember(groupId: GroupId, userId: UserId): Promise<boolean> {
  const group = await getGroup(groupId);
  if (!group) return false;

  group.members = group.members.filter(m => m !== userId);
  group.admins = group.admins.filter(a => a !== userId);

  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.set(`group:${groupId}`, JSON.stringify(group));
  pipeline.srem(`user:groups:${userId}`, groupId);
  await pipeline.exec();
  return true;
}

export async function deleteGroup(groupId: GroupId): Promise<boolean> {
  const group = await getGroup(groupId);
  if (!group) return false;

  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.del(`group:${groupId}`);
  for (const uid of group.members) {
    pipeline.srem(`user:groups:${uid}`, groupId);
  }
  await pipeline.exec();
  return true;
}

export async function checkGroupReveal(groupId: GroupId, date: string): Promise<boolean> {
  const group = await getGroup(groupId);
  if (!group) return false;

  const redis = getRedis();
  const submitters = await redis.smembers(`submissions:${date}`);
  const submitterSet = new Set(submitters);

  return group.members.every(m => submitterSet.has(m));
}

// ============================================================
// FRIENDS
// ============================================================

export async function getFriends(userId: UserId): Promise<UserId[]> {
  const redis = getRedis();
  const friends = await redis.smembers(`friends:${userId}`);
  return (friends || []) as UserId[];
}

export async function addFriend(userId1: UserId, userId2: UserId): Promise<void> {
  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.sadd(`friends:${userId1}`, userId2);
  pipeline.sadd(`friends:${userId2}`, userId1);
  await pipeline.exec();
}

export async function removeFriend(userId1: UserId, userId2: UserId): Promise<void> {
  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.srem(`friends:${userId1}`, userId2);
  pipeline.srem(`friends:${userId2}`, userId1);
  await pipeline.exec();
}

export async function areFriends(userId1: UserId, userId2: UserId): Promise<boolean> {
  const redis = getRedis();
  return await redis.sismember(`friends:${userId1}`, userId2) === 1;
}

// ============================================================
// FRIEND REQUESTS
// ============================================================

export async function createFriendRequest(from: UserId, to: UserId): Promise<FriendRequest> {
  const id = generateId('freq');
  const request: FriendRequest = {
    id,
    from,
    to,
    status: 'pending',
    createdAt: new Date().toISOString(),
    respondedAt: null,
  };

  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.set(`friend_request:${id}`, JSON.stringify(request));
  pipeline.sadd(`friend_requests:to:${to}`, id);
  pipeline.sadd(`friend_requests:from:${from}`, id);
  await pipeline.exec();

  return request;
}

export async function getFriendRequest(requestId: string): Promise<FriendRequest | null> {
  const redis = getRedis();
  const data = await redis.get<string>(`friend_request:${requestId}`);
  return parseJson<FriendRequest>(data);
}

export async function getPendingFriendRequests(userId: UserId): Promise<FriendRequest[]> {
  const redis = getRedis();
  const ids = await redis.smembers(`friend_requests:to:${userId}`);
  if (!ids || ids.length === 0) return [];

  // Pipeline all request fetches
  const pipeline = redis.pipeline();
  for (const id of ids) {
    pipeline.get(`friend_request:${id}`);
  }
  const results = await pipeline.exec();

  const requests: FriendRequest[] = [];
  for (const data of results) {
    const req = parseJson<FriendRequest>(data);
    if (req && req.status === 'pending') {
      requests.push(req);
    }
  }
  return requests;
}

export async function respondToFriendRequest(
  requestId: string,
  status: 'accepted' | 'declined'
): Promise<FriendRequest | null> {
  const request = await getFriendRequest(requestId);
  if (!request || request.status !== 'pending') return null;

  request.status = status;
  request.respondedAt = new Date().toISOString();

  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.set(`friend_request:${requestId}`, JSON.stringify(request));
  pipeline.srem(`friend_requests:to:${request.to}`, requestId);
  pipeline.srem(`friend_requests:from:${request.from}`, requestId);
  await pipeline.exec();

  if (status === 'accepted') {
    await addFriend(request.from, request.to);
  }

  return request;
}

// ============================================================
// GROUP INVITES
// ============================================================

export async function createGroupInvite(
  groupId: GroupId,
  from: UserId,
  to: UserId
): Promise<GroupInvite> {
  const id = generateId('ginv');
  const invite: GroupInvite = {
    id,
    groupId,
    from,
    to,
    status: 'pending',
    createdAt: new Date().toISOString(),
    respondedAt: null,
  };

  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.set(`group_invite:${id}`, JSON.stringify(invite));
  pipeline.sadd(`group_invites:to:${to}`, id);
  await pipeline.exec();

  return invite;
}

export async function getGroupInvite(inviteId: string): Promise<GroupInvite | null> {
  const redis = getRedis();
  const data = await redis.get<string>(`group_invite:${inviteId}`);
  return parseJson<GroupInvite>(data);
}

export async function getPendingGroupInvites(userId: UserId): Promise<GroupInvite[]> {
  const redis = getRedis();
  const ids = await redis.smembers(`group_invites:to:${userId}`);
  if (!ids || ids.length === 0) return [];

  // Pipeline all invite fetches
  const pipeline = redis.pipeline();
  for (const id of ids) {
    pipeline.get(`group_invite:${id}`);
  }
  const results = await pipeline.exec();

  const invites: GroupInvite[] = [];
  for (const data of results) {
    const inv = parseJson<GroupInvite>(data);
    if (inv && inv.status === 'pending') {
      invites.push(inv);
    }
  }
  return invites;
}

export async function respondToGroupInvite(
  inviteId: string,
  status: 'accepted' | 'declined'
): Promise<GroupInvite | null> {
  const invite = await getGroupInvite(inviteId);
  if (!invite || invite.status !== 'pending') return null;

  invite.status = status;
  invite.respondedAt = new Date().toISOString();

  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.set(`group_invite:${inviteId}`, JSON.stringify(invite));
  pipeline.srem(`group_invites:to:${invite.to}`, inviteId);
  await pipeline.exec();

  if (status === 'accepted') {
    await addGroupMember(invite.groupId, invite.to);
  }

  return invite;
}

// ============================================================
// NOTIFICATIONS
// ============================================================

export async function createNotification(
  userId: UserId,
  type: NotificationType,
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<Notification> {
  const id = generateId('notif');
  const notification: Notification = {
    id,
    userId,
    type,
    title,
    body,
    data,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const redis = getRedis();
  const pipeline = redis.pipeline();
  pipeline.lpush(`notifications:${userId}`, JSON.stringify(notification));
  pipeline.ltrim(`notifications:${userId}`, 0, 49);
  pipeline.incr(`notifications:unread:${userId}`);
  await pipeline.exec();

  return notification;
}

/**
 * Batch create notifications for multiple users in a single pipeline.
 */
export async function createNotificationBatch(
  items: { userId: UserId; type: NotificationType; title: string; body: string; data: Record<string, string> }[]
): Promise<void> {
  if (items.length === 0) return;

  const redis = getRedis();
  const pipeline = redis.pipeline();
  const now = new Date().toISOString();

  for (const item of items) {
    const id = generateId('notif');
    const notification: Notification = {
      id,
      userId: item.userId,
      type: item.type,
      title: item.title,
      body: item.body,
      data: item.data,
      read: false,
      createdAt: now,
    };
    pipeline.lpush(`notifications:${item.userId}`, JSON.stringify(notification));
    pipeline.ltrim(`notifications:${item.userId}`, 0, 49);
    pipeline.incr(`notifications:unread:${item.userId}`);
  }
  await pipeline.exec();
}

export async function getNotifications(userId: UserId, limit = 20): Promise<Notification[]> {
  const redis = getRedis();
  const raw = await redis.lrange(`notifications:${userId}`, 0, limit - 1);
  return raw.map(item => parseJson<Notification>(item)!).filter(Boolean);
}

export async function getUnreadCount(userId: UserId): Promise<number> {
  const redis = getRedis();
  const count = await redis.get<number>(`notifications:unread:${userId}`);
  return count || 0;
}

export async function markAllNotificationsRead(userId: UserId): Promise<void> {
  const redis = getRedis();
  // Just reset the unread counter — the `read` field on individual notifications
  // is cosmetic and not worth rewriting the entire list for
  await redis.set(`notifications:unread:${userId}`, 0);
}

// ============================================================
// CLAIM CODES
// ============================================================

export async function getClaimCode(code: string): Promise<ClaimCode | null> {
  const redis = getRedis();
  const data = await redis.get<string>(`claim:${code}`);
  return parseJson<ClaimCode>(data);
}

export async function setClaimCode(claimCode: ClaimCode): Promise<void> {
  const redis = getRedis();
  await redis.set(`claim:${claimCode.code}`, JSON.stringify(claimCode));
}

// ============================================================
// LEGACY / MIGRATION HELPERS
// ============================================================

export async function getUnclaimedLegacyUsers(): Promise<UserId[]> {
  const redis = getRedis();
  const ids = await redis.smembers('legacy:unclaimed');
  return (ids || []) as UserId[];
}

export async function markLegacyClaimed(legacyId: UserId): Promise<void> {
  const redis = getRedis();
  await redis.srem('legacy:unclaimed', legacyId);
}

export async function isMigrationComplete(): Promise<boolean> {
  const redis = getRedis();
  const flag = await redis.get('migration:v2:complete');
  return flag === 'true' || flag === true;
}

export async function setMigrationComplete(): Promise<void> {
  const redis = getRedis();
  await redis.set('migration:v2:complete', 'true');
}

// ============================================================
// MEMBER INFO HELPERS
// ============================================================

export async function getMemberInfos(memberIds: UserId[]): Promise<Record<string, MemberInfo>> {
  if (memberIds.length === 0) return {};

  const redis = getRedis();
  const pipeline = redis.pipeline();
  for (const id of memberIds) {
    pipeline.get(`user:${id}`);
  }
  const results = await pipeline.exec();

  const infos: Record<string, MemberInfo> = {};
  memberIds.forEach((id, i) => {
    const user = parseJson<UserProfile>(results[i]);
    if (user) {
      infos[id] = {
        id: user.id,
        displayName: user.displayName,
        username: user.username,
        avatarUrl: user.avatarUrl,
      };
    }
  });
  return infos;
}

// ============================================================
// RESERVED USERNAMES
// ============================================================

export async function isUsernameReserved(username: string): Promise<boolean> {
  const redis = getRedis();
  return await redis.sismember('reserved:usernames', username.toLowerCase()) === 1;
}

export async function addReservedUsername(username: string): Promise<void> {
  const redis = getRedis();
  await redis.sadd('reserved:usernames', username.toLowerCase());
}

// ============================================================
// RAW REDIS ACCESS (for migration)
// ============================================================

export function getRawRedis(): Redis {
  return getRedis();
}

// ============================================================
// DAILY INSIGHTS (OG-only)
// ============================================================

export async function saveDailyInsight(insight: DailyInsight): Promise<void> {
  const redis = getRedis();
  const pipeline = redis.pipeline();
  // Store the insight by date
  pipeline.set(`insight:${insight.date}`, JSON.stringify(insight));
  // Add to the sorted list of insight dates (for pagination/listing)
  pipeline.zadd('insights:dates', { score: new Date(insight.date).getTime(), member: insight.date });
  await pipeline.exec();
}

export async function getDailyInsight(date: string): Promise<DailyInsight | null> {
  const redis = getRedis();
  const data = await redis.get<string>(`insight:${date}`);
  return parseJson<DailyInsight>(data);
}

export async function getAllInsights(): Promise<DailyInsight[]> {
  const redis = getRedis();
  // Get all insight dates, most recent first
  const dates = await redis.zrange('insights:dates', 0, -1, { rev: true });
  if (!dates || dates.length === 0) return [];

  const pipeline = redis.pipeline();
  for (const date of dates) {
    pipeline.get(`insight:${date}`);
  }
  const results = await pipeline.exec();

  const insights: DailyInsight[] = [];
  for (const data of results) {
    const insight = parseJson<DailyInsight>(data);
    if (insight) insights.push(insight);
  }
  return insights;
}

export async function getAllInsightBodies(): Promise<string[]> {
  const redis = getRedis();
  const dates = await redis.zrange('insights:dates', 0, -1);
  if (!dates || dates.length === 0) return [];

  const pipeline = redis.pipeline();
  for (const date of dates) {
    pipeline.get(`insight:${date}`);
  }
  const results = await pipeline.exec();

  const bodies: string[] = [];
  for (const data of results) {
    const insight = parseJson<DailyInsight>(data);
    if (insight) bodies.push(insight.title + ': ' + insight.body);
  }
  return bodies;
}
