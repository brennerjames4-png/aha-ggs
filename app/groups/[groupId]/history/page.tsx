'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import StatsCard from '@/components/StatsCard';
import { getMemberColor } from '@/lib/colors';

export default function GroupHistory() {
  const { data: session } = useSession();
  const params = useParams();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<any>(null);
  const [stats, setStats] = useState<any[]>([]);
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
          setStats(stData.allTimeStats || []);
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
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-8 space-y-6">
        <BackButton href={`/groups/${groupId}`} label={group?.name || 'Back to Group'} />
        <h1 className="text-2xl font-bold text-text-primary">
          {group?.name || 'Group'} — Stats & History
        </h1>

        {stats.length > 0 && (
          <div className="space-y-4">
            {stats.map((stat: any, i: number) => {
              const color = getMemberColor(i);
              return (
                <div
                  key={stat.userId}
                  className="glass-card p-4 animate-fade-in"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                    <h3 className="font-semibold text-text-primary">{stat.displayName}</h3>
                    <span className="text-sm text-text-secondary">@{stat.username}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <StatsCard label="Games" value={stat.gamesPlayed} />
                    <StatsCard label="Days Won" value={stat.daysWon} />
                    <StatsCard label="Weeks Won" value={stat.weeksWon} />
                    <StatsCard label="GD Points" value={stat.gdPoints} />
                    <StatsCard label="Avg Daily" value={stat.averageDaily.toLocaleString()} />
                    <StatsCard label="Best Daily" value={stat.bestDaily.toLocaleString()} />
                    <StatsCard label="Best Round" value={stat.bestRound.toLocaleString()} />
                    <StatsCard label="Win Streak" value={stat.currentStreak} />
                    <StatsCard label="Best Streak" value={stat.bestStreak} />
                    <StatsCard label="Perfect Rounds" value={stat.perfectRounds} />
                    <StatsCard label="Total Points" value={stat.totalPoints.toLocaleString()} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
