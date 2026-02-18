'use client';

import { motion } from 'framer-motion';
import { getMemberColor } from '@/lib/colors';

interface MemberInfo {
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

interface SubmissionStatusProps {
  memberIds: string[];
  memberInfos: Record<string, MemberInfo>;
  submittedCount: number;
  totalMembers: number;
  revealed: boolean;
  currentUserId: string | null;
  mySubmitted: boolean;
}

export default function SubmissionStatus({
  memberIds,
  memberInfos,
  submittedCount,
  totalMembers,
  revealed,
  currentUserId,
  mySubmitted,
}: SubmissionStatusProps) {
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
          {submittedCount}/{totalMembers}
        </span>
      </div>

      <div className="w-full h-2 rounded-full bg-bg-primary mb-4">
        <motion.div
          className="h-full rounded-full bg-accent-green"
          initial={{ width: 0 }}
          animate={{ width: `${totalMembers > 0 ? (submittedCount / totalMembers) * 100 : 0}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      <div className="space-y-2">
        {/* Show current user first */}
        {currentUserId && (
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                mySubmitted
                  ? 'bg-accent-green/20 text-accent-green font-bold'
                  : 'bg-bg-primary text-text-secondary'
              }`}
            >
              {mySubmitted ? '✓' : '⏳'}
            </div>
            <span className="text-sm text-text-primary">
              You {!mySubmitted && '(not submitted)'}
            </span>
            <span className={`text-xs ml-auto ${mySubmitted ? 'text-accent-green' : 'text-text-secondary pulse-gentle'}`}>
              {mySubmitted ? 'Submitted' : 'Waiting...'}
            </span>
          </div>
        )}

        {/* Others - just show count waiting */}
        {submittedCount < totalMembers && (
          <div className="text-xs text-text-secondary text-center mt-2">
            Waiting for {totalMembers - submittedCount} more player{totalMembers - submittedCount !== 1 ? 's' : ''}...
          </div>
        )}
      </div>
    </div>
  );
}
