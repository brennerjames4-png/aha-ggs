import { NextResponse } from 'next/server';

// Deprecated - use /api/groups/[groupId]/scores instead
export async function GET() {
  return NextResponse.json({
    error: 'This endpoint is deprecated. Use /api/groups/{groupId}/scores instead.',
    migration: 'Scores are now per-group. Use the group-scoped scores endpoint.',
  }, { status: 410 });
}
