'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import UserSearch from '@/components/UserSearch';

interface Friend {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

interface FriendRequestItem {
  id: string;
  from: string;
  fromUser: Friend | null;
  createdAt: string;
}

export default function FriendsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [friendsRes, requestsRes] = await Promise.all([
          fetch('/api/friends'),
          fetch('/api/friends/request'),
        ]);
        if (friendsRes.ok) {
          const data = await friendsRes.json();
          setFriends(data.friends);
        }
        if (requestsRes.ok) {
          const data = await requestsRes.json();
          setRequests(data.requests);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleRequest(requestId: string, action: 'accepted' | 'declined') {
    await fetch(`/api/friends/${requestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setRequests(requests.filter(r => r.id !== requestId));
    if (action === 'accepted') {
      // Refresh friends list
      const res = await fetch('/api/friends');
      if (res.ok) {
        const data = await res.json();
        setFriends(data.friends);
      }
    }
  }

  async function handleAddFriend(user: { id: string; displayName: string }) {
    await fetch('/api/friends/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId: user.id }),
    });
  }

  return (
    <div className="min-h-screen">
      <Navbar user={session?.user || null} />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-8 space-y-6">
        <BackButton href="/" label="Dashboard" />
        <h1 className="text-2xl font-bold text-text-primary">Friends</h1>

        {/* Add friend search */}
        <div className="glass-card p-4 relative z-20 overflow-visible">
          <h2 className="text-sm font-medium text-text-secondary mb-2">Add Friends</h2>
          <UserSearch
            onSelect={handleAddFriend}
            excludeIds={[session?.user?.id || '', ...friends.map(f => f.id)]}
            placeholder="Search by name or username..."
          />
        </div>

        {/* Pending requests */}
        {requests.length > 0 && (
          <div className="glass-card p-4 space-y-3">
            <h2 className="text-sm font-medium text-text-secondary">
              Pending Requests ({requests.length})
            </h2>
            {requests.map((req) => (
              <div key={req.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  {req.fromUser?.avatarUrl ? (
                    <img src={req.fromUser.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-accent-green/20 flex items-center justify-center text-sm font-bold text-accent-green">
                      {(req.fromUser?.displayName || '?')[0]}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium text-text-primary">
                      {req.fromUser?.displayName || 'Unknown'}
                    </div>
                    {req.fromUser?.username && (
                      <div className="text-xs text-text-secondary">@{req.fromUser.username}</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRequest(req.id, 'accepted')}
                    className="px-3 py-1 rounded-lg bg-accent-green text-white text-sm font-medium"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => handleRequest(req.id, 'declined')}
                    className="px-3 py-1 rounded-lg bg-bg-primary border border-border-main text-text-secondary text-sm"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Friends list */}
        <div className="glass-card p-4 space-y-3">
          <h2 className="text-sm font-medium text-text-secondary">
            Your Friends ({friends.length})
          </h2>
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-accent-green/30 border-t-accent-green rounded-full animate-spin" />
            </div>
          ) : friends.length === 0 ? (
            <p className="text-sm text-text-secondary py-4 text-center">
              No friends yet. Search for users above to add friends!
            </p>
          ) : (
            friends.map((friend) => (
              <button
                key={friend.id}
                onClick={() => router.push(`/profile/${friend.username}`)}
                className="w-full flex items-center gap-3 py-2 hover:bg-bg-primary/50 rounded-lg px-2 transition-all text-left"
              >
                {friend.avatarUrl ? (
                  <img src={friend.avatarUrl} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-accent-green/20 flex items-center justify-center text-lg font-bold text-accent-green">
                    {friend.displayName[0]}
                  </div>
                )}
                <div>
                  <div className="font-medium text-text-primary">{friend.displayName}</div>
                  <div className="text-sm text-text-secondary">@{friend.username}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
