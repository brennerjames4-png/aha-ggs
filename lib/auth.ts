import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import './auth-types';
import { getUserByGoogleId, getUserByUsername, getUserPassword } from './redis';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!username || !password) return null;

        const user = await getUserByUsername(username);
        if (!user) return null;

        const hash = await getUserPassword(user.id);
        if (!hash) return null;

        const valid = await bcrypt.compare(password, hash);
        if (!valid) return null;

        return {
          id: user.id,
          username: user.username,
          name: user.displayName,
          image: user.avatarUrl,
          email: user.email,
          onboarded: true,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, account, profile, user, trigger }) {
      // Credentials sign-in: user is already fully onboarded
      if (account?.provider === 'credentials' && user) {
        token.userId = user.id || null;
        token.username = user.username || null;
        token.googleId = '';
        token.onboarded = true;
        return token;
      }

      // Google sign-in: capture Google profile info on first sign-in
      if (account?.provider === 'google' && profile) {
        token.googleId = profile.sub || '';
        token.name = profile.name;
        token.picture = profile.picture;
        token.email = profile.email;
      }

      // Re-check user in DB when not yet onboarded or on session update (Google users only)
      if (token.googleId && (!token.onboarded || trigger === 'update')) {
        const dbUser = await getUserByGoogleId(token.googleId);
        if (dbUser) {
          token.userId = dbUser.id;
          token.username = dbUser.username;
          token.onboarded = true;
        } else {
          token.userId = null;
          token.username = null;
          token.onboarded = false;
        }
      }

      return token;
    },
    async session({ session, token }) {
      (session.user as any).id = token.userId as string | null;
      session.user.username = token.username as string | null;
      session.user.googleId = (token.googleId as string) || '';
      session.user.onboarded = token.onboarded as boolean;
      return session;
    },
  },
});
