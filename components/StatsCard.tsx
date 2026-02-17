'use client';

import { motion } from 'framer-motion';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
  delay?: number;
}

export default function StatsCard({ label, value, icon, color = '#10B981', delay = 0 }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass-card p-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-text-secondary uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold mt-1" style={{ color }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </motion.div>
  );
}
