import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { Username } from './types';

const JWT_SECRET = process.env.JWT_SECRET || 'aha-ggs-dev-secret-change-in-prod';

const USERS: Record<string, string> = {
  james: process.env.USER_JAMES_PASSWORD || 'james123',
  tyler: process.env.USER_TYLER_PASSWORD || 'tyler123',
  david: process.env.USER_DAVID_PASSWORD || 'david123',
};

export function validateCredentials(username: string, password: string): boolean {
  const lower = username.toLowerCase();
  return USERS[lower] === password;
}

export function createToken(username: Username): string {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): { username: Username } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { username: Username };
    if (['james', 'tyler', 'david'].includes(decoded.username)) {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getAuthUser(): Promise<Username | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('aha-token')?.value;
  if (!token) return null;
  const result = verifyToken(token);
  return result?.username || null;
}

export function getAuthUserFromRequest(request: NextRequest): Username | null {
  const token = request.cookies.get('aha-token')?.value;
  if (!token) return null;
  const result = verifyToken(token);
  return result?.username || null;
}
