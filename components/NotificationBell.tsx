'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, string>;
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [respondedIds, setRespondedIds] = useState<Set<string>>(new Set());
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount);
          setNotifications(data.notifications);
        }
      } catch {
        // ignore
      }
    }

    poll();
    const interval = setInterval(poll, 60000);
    return () => clearInterval(interval);
  }, []);

  async function handleOpen() {
    setShowDropdown(!showDropdown);
    if (!showDropdown && unreadCount > 0) {
      await fetch('/api/notifications', { method: 'PATCH' });
      setUnreadCount(0);
    }
  }

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

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-bg-secondary transition-colors"
      >
        <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-accent-red text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-bg-secondary border border-border-main rounded-xl shadow-lg max-h-96 overflow-y-auto z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-main">
            <span className="text-sm font-semibold text-text-primary">Notifications</span>
            <button
              onClick={() => { setShowDropdown(false); router.push('/notifications'); }}
              className="text-xs text-accent-blue hover:underline"
            >
              View all
            </button>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-text-secondary">
              No notifications yet
            </div>
          ) : (
            notifications.slice(0, 8).map((n) => {
              const inviteId = n.data?.inviteId;
              const isGroupInvite = n.type === 'group_invite' && inviteId;
              const alreadyResponded = inviteId ? respondedIds.has(inviteId) : false;

              return (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-border-main/50 ${!n.read ? 'bg-accent-green/5' : ''}`}
                >
                  <div className="text-sm font-medium text-text-primary">{n.title}</div>
                  <div className="text-xs text-text-secondary mt-0.5">{n.body}</div>
                  <div className="text-[10px] text-text-secondary mt-1">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </div>

                  {isGroupInvite && !alreadyResponded && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleGroupInvite(inviteId, 'accepted')}
                        disabled={respondingId === inviteId}
                        className="px-2.5 py-0.5 rounded-md bg-accent-green text-white text-xs font-medium disabled:opacity-50"
                      >
                        Join
                      </button>
                      <button
                        onClick={() => handleGroupInvite(inviteId, 'declined')}
                        disabled={respondingId === inviteId}
                        className="px-2.5 py-0.5 rounded-md bg-bg-primary border border-border-main text-text-secondary text-xs disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                  {isGroupInvite && alreadyResponded && (
                    <div className="text-[10px] text-accent-green mt-1">Responded</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
