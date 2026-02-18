import { NextResponse } from 'next/server';

// Deprecated - use /api/groups/[groupId]/stats instead
export async function GET() {
  return NextResponse.json({
    error: 'This endpoint is deprecated. Use /api/groups/{groupId}/stats instead.',
  }, { status: 410 });
}
