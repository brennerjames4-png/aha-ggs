'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Redirect to user's profile page where insights are now shown
export default function InsightsRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (session?.user?.username) {
      router.replace(`/profile/${session.user.username}`);
    } else {
      router.replace('/login');
    }
  }, [session, status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent-green/30 border-t-accent-green rounded-full animate-spin" />
    </div>
  );
}
