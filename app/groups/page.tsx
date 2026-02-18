'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';

interface GroupItem {
  id: string;
  name: string;
  isOriginal: boolean;
  members: string[];
}

export default function GroupsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/groups');
        if (res.ok) {
          const data = await res.json();
          setGroups(data.groups);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar user={session?.user || null} />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Your Groups</h1>
          <button
            onClick={() => router.push('/groups/create')}
            className="px-4 py-2 rounded-xl bg-accent-green text-white font-medium text-sm hover:bg-accent-green/90 transition-all"
          >
            + New Group
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-accent-green/30 border-t-accent-green rounded-full animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <div className="text-4xl mb-4">🌍</div>
            <p className="text-text-secondary">You&apos;re not in any groups yet.</p>
            <p className="text-text-secondary text-sm mt-1">Create one and invite your friends!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group, i) => (
              <motion.button
                key={group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => router.push(`/groups/${group.id}`)}
                className="w-full glass-card p-4 flex items-center justify-between hover:bg-bg-secondary/50 transition-all text-left"
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
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
