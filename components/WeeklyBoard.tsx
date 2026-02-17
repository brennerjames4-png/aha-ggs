'use client';

import { motion } from 'framer-motion';
import { DISPLAY_NAMES, PLAYER_COLORS } from '@/lib/types';
import type { Username, WeeklyStanding } from '@/lib/types';

interface WeeklyBoardProps {
  standings: WeeklyStanding[];
  weekLabel: string;
  compact?: boolean;
}

export default function WeeklyBoard({ standings, weekLabel, compact = false }: WeeklyBoardProps) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-text-primary">
          📅 {compact ? 'This Week' : weekLabel}
        </h3>
        {standings.some(s => s.isWeekWinner) && (
          <span className="text-sm text-accent-gold font-medium">
            🏆 {DISPLAY_NAMES[standings.find(s => s.isWeekWinner)!.player]}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {standings.map((s, i) => {
          const color = PLAYER_COLORS[s.player];
          return (
            <motion.div
              key={s.player}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                s.isWeekWinner ? 'bg-accent-gold/10 ring-1 ring-accent-gold/30' : 'bg-bg-primary/50'
              }`}
            >
              {/* Rank */}
              <span className="text-xl w-8 text-center">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
              </span>

              {/* Player */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                style={{ backgroundColor: `${color}20`, color }}
              >
                {DISPLAY_NAMES[s.player][0]}
              </div>

              <div className="flex-1">
                <p className="font-semibold text-sm text-text-primary">
                  {DISPLAY_NAMES[s.player]}
                  {s.isWeekWinner && <span className="ml-2">👑</span>}
                </p>
                {!compact && (
                  <p className="text-xs text-text-secondary">
                    {s.totalPoints.toLocaleString()} total pts
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-right">
                <div>
                  <p className="text-lg font-bold" style={{ color }}>
                    {s.daysWon}
                  </p>
                  <p className="text-xs text-text-secondary">Wins</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-accent-amber">
                    {s.gdPoints}
                  </p>
                  <p className="text-xs text-text-secondary">GD</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
