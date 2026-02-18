'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import WeeklyBoard from '@/components/WeeklyBoard';
import { getMemberColor } from '@/lib/colors';

export default function GroupLeaderboard() {
  const { data: session } = useSession();
  const params = useParams();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<any>(null);
  const [weekData, setWeekData] = useState<any>(null);
  const [memberInfos, setMemberInfos] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [groupRes, statsRes] = await Promise.all([
          fetch(`/api/groups/${groupId}`),
          fetch(`/api/groups/${groupId}/stats`),
        ]);

        if (groupRes.ok) {
          const gData = await groupRes.json();
          setGroup(gData.group);
          setMemberInfos(gData.memberInfos);
        }
        if (statsRes.ok) {
          const stData = await statsRes.json();
          setWeekData(stData.currentWeek);
          if (stData.memberInfos) setMemberInfos(stData.memberInfos);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [groupId]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar user={session?.user || null} />
        <div className="flex items-center justify-center h-64 pt-20">
          <div className="w-8 h-8 border-2 border-accent-green/30 border-t-accent-green rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar user={session?.user || null} />
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-8 space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">
          {group?.name || 'Group'} — Leaderboard
        </h1>

        {weekData?.standings && (
          <WeeklyBoard
            standings={weekData.standings}
            memberIds={group?.members || []}
          />
        )}
      </div>
    </div>
  );
}
