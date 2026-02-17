import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth';
import { getDayData, getSubmissionStatus } from '@/lib/storage';
import { getTodayKey } from '@/lib/dates';
import { getDailyResult } from '@/lib/scoring';
import { PLAYERS } from '@/lib/types';

export async function GET(request: NextRequest) {
  const user = getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dateKey = request.nextUrl.searchParams.get('date') || getTodayKey();
  const day = await getDayData(dateKey);
  const status = await getSubmissionStatus(dateKey);

  if (!day) {
    return NextResponse.json({
      date: dateKey,
      submitted: false,
      myScores: null,
      status,
      result: null,
    });
  }

  // Check if current user has submitted
  const myData = day[user];
  const hasSubmitted = myData?.submitted || false;

  // If revealed, show everything
  if (day.revealed) {
    const result = getDailyResult(dateKey, day);
    return NextResponse.json({
      date: dateKey,
      submitted: hasSubmitted,
      myScores: myData?.rounds || null,
      status,
      result,
    });
  }

  // Not revealed yet — only show own scores and submission status
  return NextResponse.json({
    date: dateKey,
    submitted: hasSubmitted,
    myScores: hasSubmitted ? myData?.rounds : null,
    status,
    result: null,
  });
}
