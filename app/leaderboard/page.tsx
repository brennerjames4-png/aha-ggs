'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LeaderboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to groups page — leaderboard is now per-group
    const storedGroup = localStorage.getItem('aha-selected-group');
    if (storedGroup) {
      router.replace(`/groups/${storedGroup}/leaderboard`);
    } else {
      router.replace('/groups');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-text-secondary">Redirecting to leaderboard...</p>
    </div>
  );
}
