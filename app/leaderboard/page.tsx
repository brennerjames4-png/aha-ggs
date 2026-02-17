'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import WeeklyBoard from '@/components/WeeklyBoard';
import ScoreCard from '@/components/ScoreCard';
import { motion } from 'framer-motion';
import { DISPLAY_NAMES, PLAYER_COLORS, PLAYERS } from '@/lib/types';
import { getWeekLabel } from '@/lib/dates';
import type { Username, WeeklyStanding, DailyResult } from '@/lib/types';

interface WeekData {
  start: string;
  end: string;
  dates: string[];
  dailyResults: DailyResult[];
  standings: WeeklyStanding[];
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<Username | null>(null);
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [authRes, histRes] = await Promise.all([
          fetch('/api/auth'),
          fetch('/api/scores/history'),
        ]);

        if (!authRes.ok) {
          router.push('/login');
          return;
        }

        const authData = await authRes.json();
        setUser(authData.user);

        if (histRes.ok) {
          const data = await histRes.json();
          setWeeks(data.weeks);
        }
      } catch (err) {
        console.error(err);
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
          <p className="text-text-secondary">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  const currentWeek = weeks[0];

  return (
    <div className="min-h-screen">
      <Navbar user={user} />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-text-primary">🏆 Weekly Leaderboard</h1>
          <p className="text-text-secondary text-sm mt-1">
            Week runs Saturday to Friday. Most daily wins takes the week.
          </p>
        </motion.div>

        {/* Current Week */}
        {currentWeek && (
          <div className="space-y-4">
            <WeeklyBoard
              standings={currentWeek.standings}
              weekLabel={getWeekLabel(currentWeek.start, currentWeek.end)}
            />

            {/* Daily breakdown */}
            <div className="glass-card p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Daily Breakdown</h3>
              <div className="space-y-2">
                {currentWeek.dates.map(dateKey => {
                  const dayResult = currentWeek.dailyResults.find(d => d.date === dateKey);
                  const dayName = new Date(dateKey + 'T12:00:00Z').toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'UTC',
                  });

                  return (
                    <div key={dateKey}>
                      <button
                        onClick={() => setExpandedDay(expandedDay === dateKey ? null : dateKey)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-bg-primary/50 hover:bg-bg-primary transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-text-secondary w-28">{dayName}</span>
                          {dayResult?.revealed ? (
                            <>
                              {dayResult.winner && (
                                <span className="text-sm">
                                  🏆 <span style={{ color: PLAYER_COLORS[dayResult.winner] }}>
                                    {DISPLAY_NAMES[dayResult.winner]}
                                  </span>
                                </span>
                              )}
                              {dayResult.gdWinner && (
                                <span className="text-sm ml-2">
                                  🎯 <span style={{ color: PLAYER_COLORS[dayResult.gdWinner] }}>
                                    {DISPLAY_NAMES[dayResult.gdWinner]}
                                  </span>
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-text-secondary">
                              {dayResult ? `${dayResult.submittedCount}/3 submitted` : 'No data'}
                            </span>
                          )}
                        </div>
                        <span className="text-text-secondary text-sm">
                          {expandedDay === dateKey ? '▲' : '▼'}
                        </span>
                      </button>

                      {/* Expanded day details */}
                      {expandedDay === dateKey && dayResult?.revealed && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="grid md:grid-cols-3 gap-3 mt-2 ml-4"
                        >
                          {(() => {
                            const sorted = [...PLAYERS].sort((a, b) => {
                              const aTotal = dayResult.scores[a]?.total ?? 0;
                              const bTotal = dayResult.scores[b]?.total ?? 0;
                              return bTotal - aTotal;
                            });
                            return sorted.map((player, i) => {
                              const pScore = dayResult.scores[player];
                              return (
                                <ScoreCard
                                  key={player}
                                  player={player}
                                  rounds={pScore?.rounds ?? null}
                                  total={pScore?.total ?? null}
                                  isWinner={dayResult.winner === player}
                                  isGdWinner={dayResult.gdWinner === player}
                                  rank={i + 1}
                                  revealed={true}
                                  delay={0}
                                />
                              );
                            });
                          })()}
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Previous Weeks */}
        {weeks.slice(1).filter(w => w.dailyResults.length > 0).map((week, idx) => (
          <motion.div
            key={week.start}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <WeeklyBoard
              standings={week.standings}
              weekLabel={getWeekLabel(week.start, week.end)}
            />
          </motion.div>
        ))}

        {weeks.length === 0 && (
          <div className="glass-card p-8 text-center">
            <span className="text-4xl block mb-3">🗺️</span>
            <p className="text-text-secondary">No data yet. Start submitting scores!</p>
          </div>
        )}
      </main>
    </div>
  );
}
