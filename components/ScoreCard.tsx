'use client';

import { motion } from 'framer-motion';

interface ScoreCardProps {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  color: string;
  rounds: [number, number, number];
  total: number;
  rank: number;
  isWinner: boolean;
  isGdWinner: boolean;
  delay?: number;
}

export default function ScoreCard({
  userId,
  displayName,
  avatarUrl,
  color,
  rounds,
  total,
  rank,
  isWinner,
  isGdWinner,
  delay = 0,
}: ScoreCardProps) {
  const scorePercent = (total / 15000) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay: delay * 0.15 }}
      className={`glass-card p-4 relative overflow-hidden ${
        isWinner ? 'ring-2 ring-accent-gold glow-gold' : ''
      }`}
    >
      {/* Rank badge */}
      <div className="absolute top-3 right-3">
        {rank === 1 && <span className="text-2xl">🥇</span>}
        {rank === 2 && <span className="text-2xl">🥈</span>}
        {rank === 3 && <span className="text-2xl">🥉</span>}
      </div>

      {/* GD badge */}
      {isGdWinner && (
        <div className="absolute top-3 right-12">
          <span className="text-lg" title="Goal Difference - Best Single Round">🎯</span>
        </div>
      )}

      <div className="flex items-center gap-3 mb-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-10 h-10 rounded-full"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg"
            style={{ backgroundColor: `${color}20`, color }}
          >
            {displayName[0]}
          </div>
        )}
        <div>
          <p className="font-semibold text-text-primary">{displayName}</p>
          {isWinner && (
            <p className="text-xs text-accent-gold font-medium">Daily Winner!</p>
          )}
        </div>
      </div>

      {/* Round scores */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {rounds.map((score, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: delay * 0.15 + i * 0.1 }}
            className="text-center"
          >
            <p className="text-xs text-text-secondary mb-1">R{i + 1}</p>
            <p
              className={`text-lg font-bold ${
                score === 5000 ? 'text-accent-gold' : 'text-text-primary'
              }`}
            >
              {score.toLocaleString()}
              {score === 5000 && <span className="ml-1 text-xs">⭐</span>}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Total and progress bar */}
      <div className="mt-2">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-sm text-text-secondary">Total</span>
          <span className="text-xl font-bold" style={{ color }}>
            {total.toLocaleString()}
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-bg-primary overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${scorePercent}%` }}
            transition={{ duration: 1, delay: delay * 0.15 + 0.3 }}
          />
        </div>
        <p className="text-xs text-text-secondary mt-1 text-right">
          {scorePercent.toFixed(1)}%
        </p>
      </div>
    </motion.div>
  );
}
