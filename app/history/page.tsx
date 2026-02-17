'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import StatsCard from '@/components/StatsCard';
import { motion } from 'framer-motion';
import { DISPLAY_NAMES, PLAYER_COLORS, PLAYERS } from '@/lib/types';
import type { Username, PlayerStats } from '@/lib/types';

export default function HistoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<Username | null>(null);
  const [stats, setStats] = useState<Record<Username, PlayerStats> | null>(null);
  const [h2h, setH2h] = useState<Record<string, { wins: number; losses: number }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<Username | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [authRes, statsRes] = await Promise.all([
          fetch('/api/auth'),
          fetch('/api/stats'),
        ]);

        if (!authRes.ok) {
          router.push('/login');
          return;
        }

        const authData = await authRes.json();
        setUser(authData.user);
        setSelectedPlayer(authData.user);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data.stats);
          setH2h(data.headToHead);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  if (loading || !user || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl block mb-3 animate-bounce">🌍</span>
          <p className="text-text-secondary">Loading stats...</p>
        </div>
      </div>
    );
  }

  const current = selectedPlayer ? stats[selectedPlayer] : null;

  return (
    <div className="min-h-screen">
      <Navbar user={user} />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-text-primary">📊 Stats & History</h1>
          <p className="text-text-secondary text-sm mt-1">
            All-time stats, personal bests, and head-to-head records
          </p>
        </motion.div>

        {/* Player selector */}
        <div className="flex gap-2">
          {PLAYERS.map(p => (
            <button
              key={p}
              onClick={() => setSelectedPlayer(p)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                selectedPlayer === p
                  ? 'ring-2'
                  : 'bg-bg-card/50 text-text-secondary hover:bg-bg-card'
              }`}
              style={selectedPlayer === p ? {
                backgroundColor: `${PLAYER_COLORS[p]}15`,
                color: PLAYER_COLORS[p],
                boxShadow: `0 0 0 2px ${PLAYER_COLORS[p]}40`,
              } : {}}
            >
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: `${PLAYER_COLORS[p]}20`, color: PLAYER_COLORS[p] }}
              >
                {DISPLAY_NAMES[p][0]}
              </span>
              {DISPLAY_NAMES[p]}
            </button>
          ))}
        </div>

        {current && selectedPlayer && (
          <>
            {/* Main stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatsCard label="Games Played" value={current.gamesPlayed} icon="🎮" color={PLAYER_COLORS[selectedPlayer]} delay={0} />
              <StatsCard label="Total Points" value={current.totalPoints} icon="🌍" color={PLAYER_COLORS[selectedPlayer]} delay={0.05} />
              <StatsCard label="Days Won" value={current.daysWon} icon="🏆" color="#D4A017" delay={0.1} />
              <StatsCard label="Weeks Won" value={current.weeksWon} icon="👑" color="#D4A017" delay={0.15} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatsCard label="Avg Daily Score" value={current.averageDaily} icon="📊" color="#3B82F6" delay={0.2} />
              <StatsCard label="Best Daily" value={current.bestDaily} icon="🔥" color="#EF4444" delay={0.25} />
              <StatsCard label="Best Round" value={current.bestRound} icon="⭐" color="#F59E0B" delay={0.3} />
              <StatsCard label="Perfect Rounds" value={current.perfectRounds} icon="💎" color="#8B5CF6" delay={0.35} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatsCard label="GD Points" value={current.gdPoints} icon="🎯" color="#EF4444" delay={0.4} />
              <StatsCard label="Current Streak" value={current.currentStreak} icon="🔥" color="#F59E0B" delay={0.45} />
              <StatsCard label="Best Streak" value={current.bestStreak} icon="💪" color="#10B981" delay={0.5} />
            </div>

            {/* Head to Head */}
            {h2h && (
              <div className="glass-card p-4">
                <h3 className="text-lg font-bold text-text-primary mb-4">⚔️ Head-to-Head</h3>
                <div className="space-y-4">
                  {PLAYERS.filter(p => p !== selectedPlayer).map(opponent => {
                    const key = `${selectedPlayer}_vs_${opponent}`;
                    const record = h2h[key];
                    if (!record) return null;

                    const totalGames = record.wins + record.losses;
                    const winRate = totalGames > 0 ? (record.wins / totalGames * 100).toFixed(0) : '0';

                    return (
                      <motion.div
                        key={opponent}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-bg-primary/50 rounded-xl p-4"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                              style={{ backgroundColor: `${PLAYER_COLORS[selectedPlayer]}20`, color: PLAYER_COLORS[selectedPlayer] }}
                            >
                              {DISPLAY_NAMES[selectedPlayer][0]}
                            </span>
                            <span className="text-text-secondary text-sm">vs</span>
                            <span
                              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                              style={{ backgroundColor: `${PLAYER_COLORS[opponent]}20`, color: PLAYER_COLORS[opponent] }}
                            >
                              {DISPLAY_NAMES[opponent][0]}
                            </span>
                            <span className="font-medium text-text-primary">{DISPLAY_NAMES[opponent]}</span>
                          </div>
                          <span className="text-sm text-text-secondary">{winRate}% win rate</span>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold" style={{ color: PLAYER_COLORS[selectedPlayer] }}>
                              {record.wins}
                            </p>
                            <p className="text-xs text-text-secondary">Wins</p>
                          </div>

                          {/* Win bar */}
                          <div className="flex-1 h-3 rounded-full overflow-hidden bg-bg-card flex">
                            <div
                              className="h-full transition-all duration-500"
                              style={{
                                width: totalGames > 0 ? `${(record.wins / totalGames) * 100}%` : '50%',
                                backgroundColor: PLAYER_COLORS[selectedPlayer],
                              }}
                            />
                            <div
                              className="h-full transition-all duration-500"
                              style={{
                                width: totalGames > 0 ? `${(record.losses / totalGames) * 100}%` : '50%',
                                backgroundColor: PLAYER_COLORS[opponent],
                              }}
                            />
                          </div>

                          <div className="text-center">
                            <p className="text-2xl font-bold" style={{ color: PLAYER_COLORS[opponent] }}>
                              {record.losses}
                            </p>
                            <p className="text-xs text-text-secondary">Losses</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All-time comparison */}
            <div className="glass-card p-4">
              <h3 className="text-lg font-bold text-text-primary mb-4">🌍 All Players Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-main">
                      <th className="text-left py-2 text-text-secondary font-medium">Stat</th>
                      {PLAYERS.map(p => (
                        <th key={p} className="text-center py-2 font-medium" style={{ color: PLAYER_COLORS[p] }}>
                          {DISPLAY_NAMES[p]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-main/30">
                    {[
                      { label: 'Games Played', key: 'gamesPlayed' },
                      { label: 'Days Won', key: 'daysWon' },
                      { label: 'Weeks Won', key: 'weeksWon' },
                      { label: 'Total Points', key: 'totalPoints' },
                      { label: 'Avg Daily', key: 'averageDaily' },
                      { label: 'Best Daily', key: 'bestDaily' },
                      { label: 'Best Round', key: 'bestRound' },
                      { label: 'GD Points', key: 'gdPoints' },
                      { label: 'Best Streak', key: 'bestStreak' },
                      { label: 'Perfect Rounds', key: 'perfectRounds' },
                    ].map(row => {
                      const values = PLAYERS.map(p => stats[p][row.key as keyof PlayerStats] as number);
                      const maxVal = Math.max(...values);
                      return (
                        <tr key={row.key}>
                          <td className="py-2 text-text-secondary">{row.label}</td>
                          {PLAYERS.map((p, i) => (
                            <td
                              key={p}
                              className={`text-center py-2 font-mono ${
                                values[i] === maxVal && maxVal > 0 ? 'font-bold' : 'text-text-secondary'
                              }`}
                              style={values[i] === maxVal && maxVal > 0 ? { color: PLAYER_COLORS[p] } : {}}
                            >
                              {values[i].toLocaleString()}
                              {values[i] === maxVal && maxVal > 0 && ' 👑'}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {!current && (
          <div className="glass-card p-8 text-center">
            <span className="text-4xl block mb-3">🗺️</span>
            <p className="text-text-secondary">No stats yet. Start playing to build your record!</p>
          </div>
        )}
      </main>
    </div>
  );
}
