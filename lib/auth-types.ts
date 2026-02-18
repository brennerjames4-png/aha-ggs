import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string | null;
      username: string | null;
      googleId: string;
      onboarded: boolean;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    id?: string;
    username?: string | null;
    googleId?: string;
    onboarded?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string | null;
    username: string | null;
    googleId: string;
    onboarded: boolean;
  }
}
