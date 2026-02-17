'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ScoreCard from '@/components/ScoreCard';
import SubmissionStatus from '@/components/SubmissionStatus';
import WeeklyBoard from '@/components/WeeklyBoard';
import StatsCard from '@/components/StatsCard';
import ConfettiEffect from '@/components/ConfettiEffect';
import { motion } from 'framer-motion';
import { DISPLAY_NAMES, PLAYERS } from '@/lib/types';
import type { Username, WeeklyStanding, DailyResult, PlayerStats } from '@/lib/types';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<Username | null>(null);
  const [todayData, setTodayData] = useState<{
    date: string;
    submitted: boolean;
    myScores: [number, number, number] | null;
    status: { submitted: Username[]; notSubmitted: Username[]; revealed: boolean; total: number };
    result: DailyResult | null;
  } | null>(null);
  const [stats, setStats] = useState<Record<Username, PlayerStats> | null>(null);
  const [weekStandings, setWeekStandings] = useState<WeeklyStanding[] | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [authRes, todayRes, statsRes] = await Promise.all([
          fetch('/api/auth'),
          fetch('/api/scores/today'),
          fetch('/api/stats'),
        ]);

        if (!authRes.ok) {
          router.push('/login');
          return;
        }

        const authData = await authRes.json();
        setUser(authData.user);

        if (todayRes.ok) {
          const td = await todayRes.json();
          setTodayData(td);
          if (td.result?.revealed && td.result?.winner === authData.user) {
            setShowConfetti(true);
          }
        }

        if (statsRes.ok) {
          const sd = await statsRes.json();
          setStats(sd.stats);
          setWeekStandings(sd.currentWeek.standings);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl block mb-3 animate-bounce">🌍</span>
          <p className="text-text-secondary">Loading your globe...</p>
        </div>
      </div>
    );
  }

  const myStats = stats?.[user];

  return (
    <div className="min-h-screen">
      <ConfettiEffect trigger={showConfetti} />
      <Navbar user={user} />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Welcome back, {DISPLAY_NAMES[user]}!
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              {todayData?.date ? `Today: ${todayData.date}` : "Ready for today's challenge?"}
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
        </motion.div>

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

            {todayData && (
              <SubmissionStatus
                submitted={todayData.status.submitted}
                notSubmitted={todayData.status.notSubmitted}
                revealed={todayData.status.revealed}
              />
            )}

            {todayData && !todayData.submitted && (
              <motion.a
                href="/submit"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="block glass-card p-4 text-center hover:bg-bg-card-hover transition-colors cursor-pointer"
              >
                <span className="text-3xl block mb-2">📝</span>
                <p className="font-semibold text-accent-green">Submit Today&apos;s Scores</p>
                <p className="text-xs text-text-secondary mt-1">Enter your 3 round scores</p>
              </motion.a>
            )}

            {todayData && todayData.submitted && !todayData.status.revealed && todayData.myScores && (
              <div className="glass-card p-4">
                <p className="text-sm font-medium text-text-primary mb-2">Your Scores (Locked In)</p>
                <div className="grid grid-cols-3 gap-2">
                  {todayData.myScores.map((s, i) => (
                    <div key={i} className="text-center bg-bg-primary rounded-lg p-2">
                      <p className="text-xs text-text-secondary">R{i + 1}</p>
                      <p className="text-lg font-bold text-accent-green">{s.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
                <p className="text-center text-sm text-text-secondary mt-3">
                  Total: <span className="font-bold text-text-primary">
                    {todayData.myScores.reduce((a: number, b: number) => a + b, 0).toLocaleString()}
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
                weekLabel="Current Week"
                compact
              />
            )}
          </div>
        </div>

        {/* Today's Results (if revealed) */}
        {todayData?.result?.revealed && todayData.result && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-text-primary">
              Today&apos;s Results
              {todayData.result.winner && (
                <span className="ml-2 text-sm text-accent-gold">
                  🏆 {DISPLAY_NAMES[todayData.result.winner]} wins!
                </span>
              )}
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              {(() => {
                const sortedPlayers = [...PLAYERS].sort((a, b) => {
                  const aTotal = todayData.result!.scores[a]?.total ?? 0;
                  const bTotal = todayData.result!.scores[b]?.total ?? 0;
                  return bTotal - aTotal;
                });
                return sortedPlayers.map((player, i) => {
                  const pScore = todayData.result!.scores[player];
                  return (
                    <ScoreCard
                      key={player}
                      player={player}
                      rounds={pScore?.rounds ?? null}
                      total={pScore?.total ?? null}
                      isWinner={todayData.result!.winner === player}
                      isGdWinner={todayData.result!.gdWinner === player}
                      rank={i + 1}
                      revealed={true}
                      delay={i}
                    />
                  );
                });
              })()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
