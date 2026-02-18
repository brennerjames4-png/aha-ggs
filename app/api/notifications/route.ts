import { NextRequest, NextResponse } from 'next/server';
import { getRequiredUser } from '@/lib/auth-helpers';
import { getNotifications, getUnreadCount, markAllNotificationsRead } from '@/lib/redis';

// GET - get notifications + unread count
export async function GET() {
  try {
    const { userId } = await getRequiredUser();
    const [notifications, unreadCount] = await Promise.all([
      getNotifications(userId, 20),
      getUnreadCount(userId),
    ]);

    return NextResponse.json({ notifications, unreadCount });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// PATCH - mark all as read
export async function PATCH() {
  try {
    const { userId } = await getRequiredUser();
    await markAllNotificationsRead(userId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
