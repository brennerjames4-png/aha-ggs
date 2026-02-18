'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setNotifications(data.notifications);
        }
        await fetch('/api/notifications', { method: 'PATCH' });
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleGroupInvite(inviteId: string, action: 'accepted' | 'declined') {
    setRespondingId(inviteId);
    try {
      const res = await fetch('/api/groups/invites/respond', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, action }),
      });
      if (res.ok) {
        setRespondedIds(prev => new Set(prev).add(inviteId));
      }
    } catch {
      // ignore
    } finally {
      setRespondingId(null);
    }
  }

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
        <BackButton href="/" label="Dashboard" />
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
          notifications.map((n, i) => {
            const inviteId = n.data?.inviteId;
            const isGroupInvite = n.type === 'group_invite' && inviteId;
            const alreadyResponded = inviteId ? respondedIds.has(inviteId) : false;

            return (
              <div
                key={n.id}
                className={`glass-card p-4 animate-fade-in ${!n.read ? 'border-l-2 border-l-accent-green' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">{typeIcons[n.type] || '📌'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-text-primary">{n.title}</div>
                    <div className="text-sm text-text-secondary mt-0.5">{n.body}</div>
                    <div className="text-xs text-text-secondary mt-1">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>

                    {/* Group invite actions */}
                    {isGroupInvite && !alreadyResponded && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleGroupInvite(inviteId, 'accepted')}
                          disabled={respondingId === inviteId}
                          className="px-3 py-1 rounded-lg bg-accent-green text-white text-sm font-medium disabled:opacity-50"
                        >
                          Join Group
                        </button>
                        <button
                          onClick={() => handleGroupInvite(inviteId, 'declined')}
                          disabled={respondingId === inviteId}
                          className="px-3 py-1 rounded-lg bg-bg-primary border border-border-main text-text-secondary text-sm disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                    {isGroupInvite && alreadyResponded && (
                      <div className="text-xs text-accent-green mt-2">Responded</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
