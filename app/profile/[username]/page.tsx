'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';

interface UserProfileData {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  type: string;
  createdAt: string;
  groups: string[];
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const params = useParams();
  const username = params.username as string;
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [loading, setLoading] = useState(true);
  const [friendLoading, setFriendLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(username)}`);
        if (res.ok) {
          const data = await res.json();
          setProfile(data.user);
          setIsFriend(data.isFriend);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [username]);

  async function handleAddFriend() {
    if (!profile) return;
    setFriendLoading(true);
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: profile.id }),
      });
      if (res.ok) {
        // Show pending state
        setFriendLoading(false);
      }
    } catch {
      // ignore
    } finally {
      setFriendLoading(false);
    }
  }

  const isOwnProfile = session?.user?.username === username;

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar user={session?.user || null} />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-accent-green/30 border-t-accent-green rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen">
        <Navbar user={session?.user || null} />
        <div className="max-w-2xl mx-auto px-4 pt-24 text-center">
          <h1 className="text-2xl font-bold text-text-primary">User not found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar user={session?.user || null} />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-8 space-y-4">
        <BackButton label="Back" />
        <div className="glass-card p-6 animate-fade-in">
          <div className="flex items-center gap-4 mb-6">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-accent-green/20 flex items-center justify-center text-2xl font-bold text-accent-green">
                {profile.displayName[0]}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-text-primary">{profile.displayName}</h1>
              <p className="text-text-secondary">@{profile.username}</p>
              {profile.type === 'legacy' && (
                <span className="inline-block text-xs bg-accent-amber/20 text-accent-amber px-2 py-0.5 rounded-full mt-1">
                  OG Player
                </span>
              )}
            </div>
          </div>

          {!isOwnProfile && !isFriend && (
            <button
              onClick={handleAddFriend}
              disabled={friendLoading}
              className="w-full py-2 rounded-xl bg-accent-blue text-white font-semibold hover:bg-accent-blue/90 transition-all disabled:opacity-50"
            >
              {friendLoading ? 'Sending...' : 'Add Friend'}
            </button>
          )}

          {isFriend && (
            <div className="text-center text-sm text-accent-green font-medium py-2">
              Friends
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-border-main">
            <p className="text-xs text-text-secondary">
              Member since {new Date(profile.createdAt).toLocaleDateString()}
            </p>
            <p className="text-xs text-text-secondary">
              {profile.groups.length} group{profile.groups.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
