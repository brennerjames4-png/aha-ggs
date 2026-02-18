'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ScoreCard from '@/components/ScoreCard';
import SubmissionStatus from '@/components/SubmissionStatus';
import WeeklyBoard from '@/components/WeeklyBoard';
import StatsCard from '@/components/StatsCard';
import GroupSelector from '@/components/GroupSelector';
import ConfettiEffect from '@/components/ConfettiEffect';
import { getMemberColor } from '@/lib/colors';

interface GroupOption {
  id: string;
  name: string;
  isOriginal: boolean;
  members: string[];
}

export default function Dashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [memberInfos, setMemberInfos] = useState<any>({});
  const [todayResult, setTodayResult] = useState<any>(null);
  const [myScore, setMyScore] = useState<any>(null);
  const [weekStandings, setWeekStandings] = useState<any>(null);
  const [allTimeStats, setAllTimeStats] = useState<any[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load groups and immediately fetch dashboard for the selected group
  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;

    async function loadAll() {
      try {
        const res = await fetch('/api/groups');
        if (!res.ok) return;
        const data = await res.json();
        setGroups(data.groups);

        // Determine which group to show
        const stored = localStorage.getItem('aha-selected-group');
        const validStored = data.groups.find((g: GroupOption) => g.id === stored);
        const firstGroup = data.groups[0];
        const groupId = validStored?.id || firstGroup?.id || null;
        setSelectedGroupId(groupId);

        // Immediately fetch dashboard data (no waterfall)
        if (groupId) {
          localStorage.setItem('aha-selected-group', groupId);
          const dashRes = await fetch(`/api/groups/${groupId}/dashboard`);
          if (dashRes.ok) {
            const dashData = await dashRes.json();
            setMemberInfos(dashData.memberInfos);
            setTodayResult(dashData.result);
            setMyScore(dashData.myScore);
            setWeekStandings(dashData.currentWeek?.standings);
            setAllTimeStats(dashData.allTimeStats || []);
            if (dashData.result?.revealed && dashData.result?.winner === session?.user?.id) {
              setShowConfetti(true);
            }
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [sessionStatus, session?.user?.id]);

  // Reload group data when user manually switches groups
  const [manualSwitch, setManualSwitch] = useState(false);
  useEffect(() => {
    if (!manualSwitch || !selectedGroupId) return;

    localStorage.setItem('aha-selected-group', selectedGroupId);

    async function loadGroupData() {
      setLoading(true);
      try {
        const res = await fetch(`/api/groups/${selectedGroupId}/dashboard`);
        if (res.ok) {
          const data = await res.json();
          setMemberInfos(data.memberInfos);
          setTodayResult(data.result);
          setMyScore(data.myScore);
          setWeekStandings(data.currentWeek?.standings);
          setAllTimeStats(data.allTimeStats || []);
          if (data.result?.revealed && data.result?.winner === session?.user?.id) {
            setShowConfetti(true);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
        setManualSwitch(false);
      }
    }
    loadGroupData();
  }, [manualSwitch, selectedGroupId, session?.user?.id]);

  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl block mb-3 animate-bounce">🌍</span>
          <p className="text-text-secondary">Loading your globe...</p>
        </div>
      </div>
    );
  }

  const user = session?.user;
  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const memberIds = selectedGroup?.members || [];
  const revealed = todayResult?.revealed || false;

  // Find current user stats
  const myStats = allTimeStats.find((s: any) => s.userId === user?.id);

  return (
    <div className="min-h-screen">
      <ConfettiEffect trigger={showConfetti} />
      <Navbar user={user || null} />

      <main className="max-w-5xl mx-auto px-4 pt-24 pb-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Welcome back, {user?.name || user?.username || 'Explorer'}!
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Ready for today&apos;s challenge?
            </p>
          </div>
          {myStats && myStats.currentStreak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent-red/10 border border-accent-red/20">
              <span className="streak-fire">🔥</span>
              <span className="text-sm font-bold text-accent-red">
                {myStats.currentStreak} day streak
              </span>
            </div>
          )}
        </div>

        {/* Group selector */}
        {groups.length > 0 && (
          <GroupSelector
            groups={groups}
            selectedGroupId={selectedGroupId}
            onSelect={(id) => { setSelectedGroupId(id); setManualSwitch(true); }}
          />
        )}

        {groups.length === 0 && !loading && (
          <div className="glass-card p-8 text-center">
            <div className="text-4xl mb-4">🌍</div>
            <p className="text-text-secondary">You&apos;re not in any groups yet.</p>
            <a href="/groups/create" className="text-accent-green hover:underline text-sm mt-2 inline-block">
              Create your first group
            </a>
          </div>
        )}

        {loading && selectedGroupId && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-accent-green/30 border-t-accent-green rounded-full animate-spin" />
          </div>
        )}

        {!loading && selectedGroupId && (
          <>
            {/* Quick Stats */}
            {myStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatsCard label="Days Won" value={myStats.daysWon} icon="🏆" color="#D4A017" delay={0} />
                <StatsCard label="Best Round" value={myStats.bestRound.toLocaleString()} icon="⭐" color="#F59E0B" delay={0.05} />
                <StatsCard label="Avg Daily" value={myStats.averageDaily.toLocaleString()} icon="📊" color="#3B82F6" delay={0.1} />
                <StatsCard label="GD Points" value={myStats.gdPoints} icon="🎯" color="#EF4444" delay={0.15} />
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Today's Status */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-text-primary">Today</h2>

                {todayResult && (
                  <SubmissionStatus
                    memberIds={memberIds}
                    memberInfos={memberInfos}
                    submittedCount={todayResult.submittedCount}
                    totalMembers={memberIds.length}
                    revealed={revealed}
                    currentUserId={user?.id || null}
                    mySubmitted={!!myScore?.submitted}
                  />
                )}

                {!myScore?.submitted && (
                  <a
                    href="/submit"
                    className="block glass-card p-4 text-center hover:bg-bg-card-hover transition-colors cursor-pointer animate-fade-in"
                  >
                    <span className="text-3xl block mb-2">📝</span>
                    <p className="font-semibold text-accent-green">Submit Today&apos;s Scores</p>
                    <p className="text-xs text-text-secondary mt-1">Enter your 3 round scores</p>
                  </a>
                )}

                {myScore?.submitted && !revealed && (
                  <div className="glass-card p-4">
                    <p className="text-sm font-medium text-text-primary mb-2">Your Scores (Locked In)</p>
                    <div className="grid grid-cols-3 gap-2">
                      {myScore.rounds.map((s: number, i: number) => (
                        <div key={i} className="text-center bg-bg-primary rounded-lg p-2">
                          <p className="text-xs text-text-secondary">R{i + 1}</p>
                          <p className="text-lg font-bold text-accent-green">{s.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-center text-sm text-text-secondary mt-3">
                      Total: <span className="font-bold text-text-primary">
                        {myScore.rounds.reduce((a: number, b: number) => a + b, 0).toLocaleString()}
                      </span> / 15,000
                    </p>
                  </div>
                )}
              </div>

              {/* Weekly Standings */}
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-text-primary">This Week</h2>
                {weekStandings && (
                  <WeeklyBoard
                    standings={weekStandings}
                    memberIds={memberIds}
                    weekLabel="Current Week"
                    compact
                  />
                )}
              </div>
            </div>

            {/* Today's Results (if revealed) */}
            {revealed && todayResult?.scores && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-text-primary">
                  Today&apos;s Results
                </h2>
                <div className="grid md:grid-cols-3 gap-4">
                  {memberIds
                    .filter((id: string) => todayResult.scores[id])
                    .sort((a: string, b: string) => {
                      const aTotal = todayResult.scores[a]?.total || 0;
                      const bTotal = todayResult.scores[b]?.total || 0;
                      return bTotal - aTotal;
                    })
                    .map((id: string, i: number) => {
                      const info = memberInfos[id] || { displayName: id };
                      const scoreData = todayResult.scores[id];
                      return (
                        <ScoreCard
                          key={id}
                          userId={id}
                          displayName={info.displayName}
                          avatarUrl={info.avatarUrl}
                          color={getMemberColor(memberIds.indexOf(id))}
                          rounds={scoreData.rounds}
                          total={scoreData.total}
                          rank={i + 1}
                          isWinner={todayResult.winner === id}
                          isGdWinner={todayResult.gdWinner === id}
                          delay={i}
                        />
                      );
                    })}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
