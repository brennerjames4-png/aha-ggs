import { auth } from './auth';
import { UserId } from './types';

export async function getRequiredUser(): Promise<{
  userId: UserId;
  username: string;
  googleId: string;
}> {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.username) {
    throw new Error('Unauthorized');
  }
  return {
    userId: session.user.id as UserId,
    username: session.user.username,
    googleId: session.user.googleId,
  };
}

export async function getOptionalUser(): Promise<{
  userId: UserId;
  username: string;
  googleId: string;
} | null> {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.username) {
    return null;
  }
  return {
    userId: session.user.id as UserId,
    username: session.user.username,
    googleId: session.user.googleId,
  };
}

export async function getSessionUser(): Promise<{
  googleId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  onboarded: boolean;
  userId: string | null;
  username: string | null;
} | null> {
  const session = await auth();
  if (!session?.user) return null;
  return {
    googleId: session.user.googleId,
    name: session.user.name || null,
    email: session.user.email || null,
    image: session.user.image || null,
    onboarded: session.user.onboarded,
    userId: session.user.id,
    username: session.user.username,
  };
}
