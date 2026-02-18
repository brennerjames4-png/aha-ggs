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
    async jwt({ token, account, profile }) {
      // On first sign-in, look up the user
      if (account && profile) {
        token.googleId = profile.sub || '';
        token.name = profile.name;
        token.picture = profile.picture;
        token.email = profile.email;

        // Check if user exists in our system
        const user = await getUserByGoogleId(profile.sub!);
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
