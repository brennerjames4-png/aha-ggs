import { NextRequest, NextResponse } from 'next/server';
import { getRequiredUser } from '@/lib/auth-helpers';
import { submitDailyScore, getUserGroups, checkGroupRevealBatch, createNotificationBatch } from '@/lib/redis';
import { getTodayKey } from '@/lib/dates';
import { UserId, NotificationType } from '@/lib/types';

export async function POST(request: NextRequest) {
  let user;
  try {
    user = await getRequiredUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { rounds, date } = body;

  if (!Array.isArray(rounds) || rounds.length !== 3) {
    return NextResponse.json({ error: 'Must provide exactly 3 round scores' }, { status: 400 });
  }

  const dateKey = date || getTodayKey();

  // Submit score globally (once per day per user)
  const result = await submitDailyScore(user.userId, dateKey, rounds as [number, number, number]);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Check reveal status for all groups at once
  const groups = await getUserGroups(user.userId);
  if (groups.length === 0) {
    return NextResponse.json({
      success: true,
      revealedGroups: [],
      message: 'Scores submitted successfully. Waiting for others...',
    });
  }

  // Per-group reveal check in parallel (each hits one smembers call)
  const groupReveals = await Promise.all(
    groups.map(async (group) => {
      const revealMap = await checkGroupRevealBatch(group.members as UserId[], [dateKey]);
      return { group, revealed: revealMap[dateKey] || false };
    })
  );

  const revealedGroups: { groupId: string; groupName: string }[] = [];
  const notifications: { userId: UserId; type: NotificationType; title: string; body: string; data: Record<string, string> }[] = [];

  for (const { group, revealed } of groupReveals) {
    if (revealed) {
      revealedGroups.push({ groupId: group.id, groupName: group.name });
      for (const memberId of group.members) {
        if (memberId !== user.userId) {
          notifications.push({
            userId: memberId as UserId,
            type: 'scores_revealed',
            title: 'Scores Revealed!',
            body: `All scores are in for "${group.name}" today!`,
            data: { groupId: group.id, date: dateKey },
          });
        }
      }
    }
  }

  // Send all notifications in one batch pipeline
  if (notifications.length > 0) {
    await createNotificationBatch(notifications);
  }

  return NextResponse.json({
    success: true,
    revealedGroups,
    message: revealedGroups.length > 0
      ? `Scores submitted! Results revealed in ${revealedGroups.length} group(s)!`
      : 'Scores submitted successfully. Waiting for others...',
  });
}
