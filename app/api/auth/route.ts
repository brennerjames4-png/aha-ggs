import { NextRequest, NextResponse } from 'next/server';
import { validateCredentials, createToken, getAuthUserFromRequest } from '@/lib/auth';
import { Username } from '@/lib/types';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
  }

  const lower = username.toLowerCase() as Username;
  if (!['james', 'tyler', 'david'].includes(lower)) {
    return NextResponse.json({ error: 'Invalid username' }, { status: 401 });
  }

  if (!validateCredentials(lower, password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
  }

  const token = createToken(lower);
  const response = NextResponse.json({ success: true, username: lower });
  response.cookies.set('aha-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  });

  return response;
}

export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('aha-token');
  return response;
}

export async function GET(request: NextRequest) {
  const user = getAuthUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user });
}
