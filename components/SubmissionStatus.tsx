'use client';

import { motion } from 'framer-motion';
import { DISPLAY_NAMES, PLAYER_COLORS } from '@/lib/types';
import type { Username } from '@/lib/types';

interface SubmissionStatusProps {
  submitted: Username[];
  notSubmitted: Username[];
  revealed: boolean;
}

export default function SubmissionStatus({ submitted, notSubmitted, revealed }: SubmissionStatusProps) {
  if (revealed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-4 text-center"
      >
        <span className="text-2xl">🎉</span>
        <p className="text-accent-green font-semibold mt-1">All scores revealed!</p>
      </motion.div>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-text-primary">Submission Status</p>
        <span className="text-sm text-text-secondary">
          {submitted.length}/3
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-bg-primary mb-4">
        <motion.div
          className="h-full rounded-full bg-accent-green"
          initial={{ width: 0 }}
          animate={{ width: `${(submitted.length / 3) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="space-y-2">
        {submitted.map(player => (
          <div key={player} className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: `${PLAYER_COLORS[player]}20`, color: PLAYER_COLORS[player] }}
            >
              ✓
            </div>
            <span className="text-sm text-text-primary">{DISPLAY_NAMES[player]}</span>
            <span className="text-xs text-accent-green ml-auto">Submitted</span>
          </div>
        ))}
        {notSubmitted.map(player => (
          <div key={player} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs bg-bg-primary text-text-secondary">
              ⏳
            </div>
            <span className="text-sm text-text-secondary">{DISPLAY_NAMES[player]}</span>
            <span className="text-xs text-text-secondary ml-auto pulse-gentle">Waiting...</span>
          </div>
        ))}
      </div>
    </div>
  );
}
