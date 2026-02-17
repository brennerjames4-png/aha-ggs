import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { submitScore } from '@/lib/storage';
import { getTodayKey } from '@/lib/dates';

export async function POST(request: NextRequest) {
  const user = getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { rounds, date } = body;

  if (!Array.isArray(rounds) || rounds.length !== 3) {
    return NextResponse.json({ error: 'Must provide exactly 3 round scores' }, { status: 400 });
  }

  // Use provided date or today
  const dateKey = date || getTodayKey();

  const result = await submitScore(dateKey, user, rounds as [number, number, number]);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    revealed: result.revealed,
    message: result.revealed
      ? 'All scores are in! Results revealed!'
      : 'Scores submitted successfully. Waiting for others...',
  });
}
