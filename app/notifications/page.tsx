'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications);
        }
        // Mark all as read
        await fetch('/api/notifications', { method: 'PATCH' });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const typeIcons: Record<string, string> = {
    friend_request: '👤',
    friend_accepted: '🤝',
    group_invite: '👥',
    scores_revealed: '🎯',
    legacy_claimed: '🔑',
  };

  return (
    <div className="min-h-screen">
      <Navbar user={session?.user || null} />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-8 space-y-4">
        <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-accent-green/30 border-t-accent-green rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <div className="text-4xl mb-4">🔔</div>
            <p className="text-text-secondary">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`glass-card p-4 ${!n.read ? 'border-l-2 border-l-accent-green' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{typeIcons[n.type] || '📌'}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text-primary">{n.title}</div>
                  <div className="text-sm text-text-secondary mt-0.5">{n.body}</div>
                  <div className="text-xs text-text-secondary mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
