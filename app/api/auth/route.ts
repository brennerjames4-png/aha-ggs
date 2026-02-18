// This file is intentionally left as a redirect to the NextAuth handler.
// The old username/password auth has been removed.
// All auth is now handled by /api/auth/[...nextauth]

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.redirect(new URL('/api/auth/session'));
}

export async function POST() {
  return NextResponse.json({ error: 'Use Google sign-in at /login' }, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Use /api/auth/signout' }, { status: 410 });
}
