'use client';

import { motion } from 'framer-motion';
import { getMemberColor } from '@/lib/colors';

interface Standing {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  daysWon: number;
  gdPoints: number;
  totalPoints: number;
  isWeekWinner: boolean;
}

interface WeeklyBoardProps {
  standings: Standing[];
  memberIds: string[];
  weekLabel?: string;
  compact?: boolean;
}

export default function WeeklyBoard({ standings, memberIds, weekLabel, compact = false }: WeeklyBoardProps) {
  return (
    <div className="glass-card p-4">
      {weekLabel && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-text-primary">
            {compact ? 'This Week' : weekLabel}
          </h3>
          {standings.some(s => s.isWeekWinner) && (
            <span className="text-sm text-accent-gold font-medium">
              {standings.find(s => s.isWeekWinner)?.displayName}
            </span>
          )}
        </div>
      )}

      <div className="space-y-3">
        {standings.map((s, i) => {
          const color = getMemberColor(memberIds.indexOf(s.userId));
          const medals = ['🥇', '🥈', '🥉'];
          return (
            <motion.div
              key={s.userId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                s.isWeekWinner ? 'bg-accent-gold/10 ring-1 ring-accent-gold/30' : 'bg-bg-primary/50'
              }`}
            >
              {/* Rank */}
              <span className="text-xl w-8 text-center">
                {i < 3 ? medals[i] : <span className="text-sm text-text-secondary">{i + 1}</span>}
              </span>

              {/* Avatar */}
              {s.avatarUrl ? (
                <img src={s.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{ backgroundColor: `${color}20`, color }}
                >
                  {s.displayName[0]}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-text-primary truncate">
                  {s.displayName}
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
