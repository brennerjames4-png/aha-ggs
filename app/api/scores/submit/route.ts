import { NextRequest, NextResponse } from 'next/server';
import { getRequiredUser } from '@/lib/auth-helpers';
import { submitDailyScore, getUserGroups, checkGroupReveal, getGroup, createNotification, getMemberInfos } from '@/lib/redis';
import { getTodayKey } from '@/lib/dates';
import { GroupId } from '@/lib/types';

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

  // Check reveal status for each of user's groups
  const groups = await getUserGroups(user.userId);
  const revealedGroups: { groupId: string; groupName: string }[] = [];

  for (const group of groups) {
    const revealed = await checkGroupReveal(group.id, dateKey);
    if (revealed) {
      revealedGroups.push({ groupId: group.id, groupName: group.name });

      // Notify group members that scores are revealed
      for (const memberId of group.members) {
        if (memberId !== user.userId) {
          await createNotification(
            memberId,
            'scores_revealed',
            'Scores Revealed!',
            `All scores are in for "${group.name}" today!`,
            { groupId: group.id, date: dateKey }
          );
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    revealedGroups,
    message: revealedGroups.length > 0
      ? `Scores submitted! Results revealed in ${revealedGroups.length} group(s)!`
      : 'Scores submitted successfully. Waiting for others...',
  });
}
