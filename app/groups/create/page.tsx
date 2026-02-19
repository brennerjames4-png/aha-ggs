'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import UserSearch from '@/components/UserSearch';

interface InviteUser {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

export default function CreateGroupPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [inviteList, setInviteList] = useState<InviteUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Create group
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create group');
        return;
      }

      const groupId = data.group.id;

      // Send invites
      for (const user of inviteList) {
        await fetch(`/api/groups/${groupId}/invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toUserId: user.id }),
        });
      }

      router.push(`/groups/${groupId}`);
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar user={session?.user || null} />
      <div className="max-w-lg mx-auto px-4 pt-24 pb-8 space-y-6">
        <BackButton href="/groups" label="Groups" />
        <h1 className="text-2xl font-bold text-text-primary">Create a Group</h1>

        <form onSubmit={handleCreate} className="glass-card p-6 space-y-5 overflow-visible">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Group Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., The Globetrotters"
              maxLength={50}
              className="w-full px-4 py-2.5 rounded-xl bg-bg-primary border border-border-main text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-green/50 focus:border-accent-green transition-all"
              required
            />
          </div>

          <div className="relative z-20">
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Invite Friends (optional)
            </label>
            <UserSearch
              onSelect={(user) => {
                if (!inviteList.find(u => u.id === user.id)) {
                  setInviteList([...inviteList, user]);
                }
              }}
              excludeIds={[session?.user?.id || '', ...inviteList.map(u => u.id)]}
              placeholder="Search for friends to invite..."
            />

            {inviteList.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {inviteList.map((user) => (
                  <span
                    key={user.id}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-bg-primary border border-border-main text-sm"
                  >
                    <span className="text-text-primary">{user.displayName}</span>
                    <button
                      type="button"
                      onClick={() => setInviteList(inviteList.filter(u => u.id !== user.id))}
                      className="text-text-secondary hover:text-accent-red ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-accent-red text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full py-2.5 rounded-xl bg-accent-green text-white font-semibold hover:bg-accent-green/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  );
}
