'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import ScoreCard from '@/components/ScoreCard';
import WeeklyBoard from '@/components/WeeklyBoard';
import SubmissionStatus from '@/components/SubmissionStatus';
import ConfettiEffect from '@/components/ConfettiEffect';
import { getMemberColor } from '@/lib/colors';

export default function GroupDashboard() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<any>(null);
  const [todayResult, setTodayResult] = useState<any>(null);
  const [memberInfos, setMemberInfos] = useState<any>({});
  const [myScore, setMyScore] = useState<any>(null);
  const [weekData, setWeekData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/groups/${groupId}/dashboard`);
        if (res.ok) {
          const data = await res.json();
          setGroup(data.group);
          setMemberInfos(data.memberInfos);
          setTodayResult(data.result);
          setMyScore(data.myScore);
          setWeekData(data.currentWeek);
          if (data.result?.revealed) setShowConfetti(true);
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

  if (!group) {
    return (
      <div className="min-h-screen">
        <Navbar user={session?.user || null} />
        <div className="max-w-2xl mx-auto px-4 pt-24 text-center">
          <h1 className="text-2xl font-bold text-text-primary">Group not found</h1>
        </div>
      </div>
    );
  }

  const memberIds = group.members || [];
  const revealed = todayResult?.revealed || false;

  return (
    <div className="min-h-screen">
      <Navbar user={session?.user || null} />
      <ConfettiEffect trigger={showConfetti} />

      <div className="max-w-4xl mx-auto px-4 pt-24 pb-8 space-y-6">
        <BackButton href="/groups" label="All Groups" />
        {/* Group header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              {group.name}
              {group.isOriginal && (
                <span className="text-xs bg-accent-amber/20 text-accent-amber px-2 py-0.5 rounded-full">
                  OG
                </span>
              )}
            </h1>
            <p className="text-sm text-text-secondary">
              {memberIds.length} member{memberIds.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/groups/${groupId}/leaderboard`)}
              className="px-3 py-1.5 rounded-lg bg-bg-secondary border border-border-main text-text-secondary text-sm hover:text-text-primary transition-all"
            >
              Leaderboard
            </button>
            <button
              onClick={() => router.push(`/groups/${groupId}/history`)}
              className="px-3 py-1.5 rounded-lg bg-bg-secondary border border-border-main text-text-secondary text-sm hover:text-text-primary transition-all"
            >
              History
            </button>
            <button
              onClick={() => router.push(`/groups/${groupId}/settings`)}
              className="px-3 py-1.5 rounded-lg bg-bg-secondary border border-border-main text-text-secondary text-sm hover:text-text-primary transition-all"
            >
              Settings
            </button>
          </div>
        </div>

        {/* Submission status */}
        <SubmissionStatus
          memberIds={memberIds}
          memberInfos={memberInfos}
          submittedCount={todayResult?.submittedCount || 0}
          totalMembers={memberIds.length}
          revealed={revealed}
          currentUserId={session?.user?.id || null}
          mySubmitted={!!myScore?.submitted}
        />

        {/* Today's scores */}
        {revealed && todayResult?.scores && (
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">Today&apos;s Results</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {memberIds
                .filter((id: string) => todayResult.scores[id])
                .sort((a: string, b: string) => {
                  const aTotal = todayResult.scores[a]?.total || 0;
                  const bTotal = todayResult.scores[b]?.total || 0;
                  return bTotal - aTotal;
                })
                .map((id: string, index: number) => {
                  const info = memberInfos[id] || { displayName: id, username: id };
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
                      rank={index + 1}
                      isWinner={todayResult.winner === id}
                      isGdWinner={todayResult.gdWinner === id}
                    />
                  );
                })}
            </div>
          </div>
        )}

        {/* My score (not revealed) */}
        {!revealed && myScore?.submitted && (
          <div className="glass-card p-4">
            <h2 className="text-sm font-medium text-text-secondary mb-2">Your Score (hidden until all submit)</h2>
            <div className="text-2xl font-bold text-accent-green">
              {myScore.rounds[0] + myScore.rounds[1] + myScore.rounds[2]}
            </div>
            <div className="text-sm text-text-secondary">
              {myScore.rounds.join(' + ')}
            </div>
          </div>
        )}

        {/* Weekly standings */}
        {weekData?.standings && (
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-3">This Week</h2>
            <WeeklyBoard
              standings={weekData.standings}
              memberIds={memberIds}
            />
          </div>
        )}
      </div>
    </div>
  );
}
