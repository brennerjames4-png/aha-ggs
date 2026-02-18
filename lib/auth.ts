import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import './auth-types';
import { getUserByGoogleId } from './redis';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
    async jwt({ token, account, profile, trigger }) {
      // On first sign-in, capture Google profile info
      if (account && profile) {
        token.googleId = profile.sub || '';
        token.name = profile.name;
        token.picture = profile.picture;
        token.email = profile.email;
      }

      // Re-check user in DB when not yet onboarded or on session update
      // This handles the case where onboarding completes and session.update() is called
      if (token.googleId && (!token.onboarded || trigger === 'update')) {
        const user = await getUserByGoogleId(token.googleId);
        if (user) {
          token.userId = user.id;
          token.username = user.username;
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
      session.user.googleId = token.googleId as string;
      session.user.onboarded = token.onboarded as boolean;
      return session;
    },
  },
});
