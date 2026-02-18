'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

interface GroupItem {
  id: string;
  name: string;
  isOriginal: boolean;
  members: string[];
}

interface PendingInvite {
  id: string;
  groupId: string;
  groupName: string;
  from: string;
  fromDisplayName: string;
  fromUsername: string | null;
  fromAvatarUrl: string | null;
  createdAt: string;
}

export default function GroupsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  async function loadData() {
    try {
      const res = await fetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups);
        setInvites(data.pendingInvites || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleInvite(inviteId: string, action: 'accepted' | 'declined') {
    setRespondingId(inviteId);
    try {
      await fetch('/api/groups/invites/respond', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteId, action }),
      });
      setInvites(invites.filter(i => i.id !== inviteId));
      if (action === 'accepted') {
        await loadData();
      }
    } catch {
      // ignore
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar user={session?.user || null} />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text-primary">Your Groups</h1>
          <button
            onClick={() => router.push('/groups/create')}
            className="px-4 py-2 rounded-xl bg-accent-green text-white font-medium text-sm hover:bg-accent-green/90 transition-all"
          >
            + New Group
          </button>
        </div>

        {/* Pending Invites */}
        {invites.length > 0 && (
          <div className="glass-card p-4 space-y-3 border-l-2 border-l-accent-amber">
            <h2 className="text-sm font-medium text-accent-amber">
              Pending Invites ({invites.length})
            </h2>
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3 min-w-0">
                  {invite.fromAvatarUrl ? (
                    <img src={invite.fromAvatarUrl} alt="" className="w-8 h-8 rounded-full shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-accent-green/20 flex items-center justify-center text-sm font-bold text-accent-green shrink-0">
                      {invite.fromDisplayName[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">
                      {invite.groupName}
                    </div>
                    <div className="text-xs text-text-secondary truncate">
                      Invited by {invite.fromDisplayName}
                      {invite.fromUsername && <span> @{invite.fromUsername}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 ml-3">
                  <button
                    onClick={() => handleInvite(invite.id, 'accepted')}
                    disabled={respondingId === invite.id}
                    className="px-3 py-1 rounded-lg bg-accent-green text-white text-sm font-medium disabled:opacity-50"
                  >
                    Join
                  </button>
                  <button
                    onClick={() => handleInvite(invite.id, 'declined')}
                    disabled={respondingId === invite.id}
                    className="px-3 py-1 rounded-lg bg-bg-primary border border-border-main text-text-secondary text-sm disabled:opacity-50"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-accent-green/30 border-t-accent-green rounded-full animate-spin" />
          </div>
        ) : groups.length === 0 && invites.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <div className="text-4xl mb-4">🌍</div>
            <p className="text-text-secondary">You&apos;re not in any groups yet.</p>
            <p className="text-text-secondary text-sm mt-1">Create one and invite your friends!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group, i) => (
              <button
                key={group.id}
                onClick={() => router.push(`/groups/${group.id}`)}
                className="w-full glass-card p-4 flex items-center justify-between hover:bg-bg-secondary/50 transition-all text-left animate-fade-in"
              >
                <div>
                  <div className="font-semibold text-text-primary flex items-center gap-2">
                    {group.name}
                    {group.isOriginal && (
                      <span className="text-xs bg-accent-amber/20 text-accent-amber px-2 py-0.5 rounded-full">
                        OG
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-text-secondary">
                    {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <span className="text-text-secondary">&rarr;</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
