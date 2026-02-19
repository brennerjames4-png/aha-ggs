'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import UserSearch from '@/components/UserSearch';

export default function GroupSettings() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<any>(null);
  const [memberInfos, setMemberInfos] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');

  const isAdmin = group?.admins?.includes(session?.user?.id);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/groups/${groupId}`);
        if (res.ok) {
          const data = await res.json();
          setGroup(data.group);
          setMemberInfos(data.memberInfos);
          setName(data.group.name);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [groupId]);

  async function handleSaveName() {
    await fetch(`/api/groups/${groupId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
  }

  async function handleInvite(user: { id: string }) {
    await fetch(`/api/groups/${groupId}/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toUserId: user.id }),
    });
  }

  async function handleLeave() {
    await fetch(`/api/groups/${groupId}/members`, { method: 'DELETE' });
    router.push('/groups');
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar user={session?.user || null} />
        <div className="flex items-center justify-center h-64 pt-20">
          <div className="w-8 h-8 border-2 border-accent-green/30 border-t-accent-green rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!group) return null;

  const memberIds = group.members || [];

  return (
    <div className="min-h-screen">
      <Navbar user={session?.user || null} />
      <div className="max-w-lg mx-auto px-4 pt-24 pb-8 space-y-6">
        <BackButton href={`/groups/${groupId}`} label={group?.name || 'Back to Group'} />
        <h1 className="text-2xl font-bold text-text-primary">Group Settings</h1>

        {/* Name */}
        {isAdmin && (
          <div className="glass-card p-4 space-y-3">
            <label className="block text-sm font-medium text-text-secondary">Group Name</label>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-bg-primary border border-border-main text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-green/50"
              />
              <button
                onClick={handleSaveName}
                className="px-4 py-2 rounded-xl bg-accent-green text-white text-sm font-medium"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Members */}
        <div className="glass-card p-4 space-y-3">
          <h2 className="text-sm font-medium text-text-secondary">
            Members ({memberIds.length})
          </h2>
          <div className="space-y-2">
            {memberIds.map((id: string) => {
              const info = memberInfos[id] || { displayName: id };
              const isGroupAdmin = group.admins.includes(id);
              return (
                <div key={id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    {info.avatarUrl ? (
                      <img src={info.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-accent-green/20 flex items-center justify-center text-sm font-bold text-accent-green">
                        {(info.displayName || '?')[0]}
                      </div>
                    )}
                    <div>
                      <span className="text-text-primary text-sm font-medium">{info.displayName}</span>
                      {info.username && <span className="text-text-secondary text-xs ml-1">@{info.username}</span>}
                    </div>
                  </div>
                  {isGroupAdmin && (
                    <span className="text-xs text-accent-amber">Admin</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Invite */}
        <div className="glass-card p-4 space-y-3 relative z-20 overflow-visible">
          <h2 className="text-sm font-medium text-text-secondary">Invite Friends</h2>
          <UserSearch
            onSelect={handleInvite}
            excludeIds={memberIds}
            placeholder="Search for friends..."
          />
        </div>

        {/* Leave */}
        {!group.isOriginal && (
          <button
            onClick={handleLeave}
            className="w-full py-2 rounded-xl border border-accent-red/50 text-accent-red text-sm hover:bg-accent-red/10 transition-all"
          >
            Leave Group
          </button>
        )}
      </div>
    </div>
  );
}
