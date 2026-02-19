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

interface Insight {
  date: string;
  title: string;
  body: string;
  imageUrl: string | null;
  imageCaption: string | null;
  createdAt: string;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const params = useParams();
  const username = params.username as string;
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [loading, setLoading] = useState(true);
  const [friendLoading, setFriendLoading] = useState(false);

  // Insights state (OG members only)
  const [insights, setInsights] = useState<Insight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [isOgMember, setIsOgMember] = useState(false);

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

  const isOwnProfile = session?.user?.username === username;

  // Load insights if viewing own profile
  useEffect(() => {
    if (!isOwnProfile || !session?.user?.id) return;

    async function loadInsights() {
      setInsightsLoading(true);
      try {
        // Trigger today's insight generation (idempotent)
        await fetch('/api/insights', { method: 'POST' });
        // Fetch all insights
        const res = await fetch('/api/insights');
        if (res.ok) {
          const data = await res.json();
          setInsights(data.insights || []);
          setIsOgMember(true);
        } else if (res.status === 403) {
          // Not an OG member — that's fine, just don't show insights
          setIsOgMember(false);
        }
      } catch {
        // ignore
      } finally {
        setInsightsLoading(false);
      }
    }
    loadInsights();
  }, [isOwnProfile, session?.user?.id]);

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
        setFriendLoading(false);
      }
    } catch {
      // ignore
    } finally {
      setFriendLoading(false);
    }
  }

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

  const today = new Date().toISOString().split('T')[0];
  const todayInsight = insights.find(i => i.date === today);
  const pastInsights = insights.filter(i => i.date !== today);

  return (
    <div className="min-h-screen">
      <Navbar user={session?.user || null} />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-8 space-y-4">
        <BackButton label="Back" />

        {/* User Profile Card */}
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

        {/* Daily Insights Section — OG members viewing own profile only */}
        {isOwnProfile && isOgMember && (
          <div className="space-y-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-text-primary">🔮 Daily Insights</h2>
              <span className="text-xs bg-accent-amber/20 text-accent-amber px-2 py-0.5 rounded-full">OG</span>
            </div>

            {insightsLoading && (
              <div className="glass-card p-6 text-center text-text-secondary text-sm">
                🌍 Loading insights...
              </div>
            )}

            {/* Today's Insight — featured */}
            {todayInsight && (
              <div className="glass-card p-5 border-l-4 border-accent-green">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs bg-accent-green/20 text-accent-green px-2 py-0.5 rounded-full font-medium">
                    TODAY
                  </span>
                  <span className="text-xs text-text-secondary">
                    {formatDate(todayInsight.date)}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-2">{todayInsight.title}</h3>
                {todayInsight.imageUrl && (
                  <div className="mb-3 rounded-xl overflow-hidden border border-border-main">
                    <img
                      src={todayInsight.imageUrl}
                      alt={todayInsight.imageCaption || todayInsight.title}
                      className="w-full max-h-64 object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    {todayInsight.imageCaption && (
                      <p className="text-xs text-text-secondary px-3 py-1.5 bg-bg-secondary">
                        {todayInsight.imageCaption}
                      </p>
                    )}
                  </div>
                )}
                <div className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">
                  {todayInsight.body}
                </div>
              </div>
            )}

            {/* Past Insights */}
            {pastInsights.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Previous Insights
                </h3>
                {pastInsights.map((insight, idx) => (
                  <InsightCard key={insight.date} insight={insight} index={idx} />
                ))}
              </div>
            )}

            {!insightsLoading && insights.length === 0 && (
              <div className="glass-card p-6 text-center">
                <p className="text-2xl mb-2">🗺️</p>
                <p className="text-sm text-text-secondary">No insights yet. Check back tomorrow!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="glass-card p-4 cursor-pointer hover:bg-bg-card/80 transition-all animate-fade-in"
      style={{ animationDelay: `${(index + 1) * 50}ms` }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs text-text-secondary font-mono shrink-0">
            {formatDate(insight.date)}
          </span>
          <h4 className="text-sm font-semibold text-text-primary truncate">{insight.title}</h4>
        </div>
        <span className="text-text-secondary text-xs shrink-0 ml-2">
          {expanded ? '▲' : '▼'}
        </span>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border-main">
          {insight.imageUrl && (
            <div className="mb-3 rounded-lg overflow-hidden border border-border-main">
              <img
                src={insight.imageUrl}
                alt={insight.imageCaption || insight.title}
                className="w-full max-h-52 object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              {insight.imageCaption && (
                <p className="text-xs text-text-secondary px-3 py-1.5 bg-bg-secondary">
                  {insight.imageCaption}
                </p>
              )}
            </div>
          )}
          <div className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">
            {insight.body}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
