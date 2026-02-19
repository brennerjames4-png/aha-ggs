'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

interface Insight {
  date: string;
  title: string;
  body: string;
  imageUrl: string | null;
  imageCaption: string | null;
  createdAt: string;
}

export default function InsightsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status !== 'authenticated') return;

    async function load() {
      try {
        // First, try to generate today's insight (idempotent — returns cached if exists)
        setGenerating(true);
        await fetch('/api/insights', { method: 'POST' });
        setGenerating(false);

        // Then fetch all insights
        const res = await fetch('/api/insights');
        if (res.status === 403) {
          setError('This page is for OG members only');
          setLoading(false);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setInsights(data.insights || []);
        }
      } catch {
        setError('Failed to load insights');
      } finally {
        setLoading(false);
        setGenerating(false);
      }
    }
    load();
  }, [status, router]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen topo-bg">
        <Navbar user={session?.user || null} />
        <main className="pt-24 pb-8 px-4 max-w-3xl mx-auto">
          <div className="text-center text-text-secondary">
            {generating ? '🌍 Generating today\'s insight...' : 'Loading insights...'}
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen topo-bg">
        <Navbar user={session?.user || null} />
        <main className="pt-24 pb-8 px-4 max-w-3xl mx-auto">
          <div className="glass-card p-8 text-center">
            <p className="text-xl mb-2">🔒</p>
            <p className="text-text-secondary">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="mt-4 text-sm text-accent-green hover:underline"
            >
              Back to Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const todayInsight = insights.find(i => i.date === today);
  const pastInsights = insights.filter(i => i.date !== today);

  return (
    <div className="min-h-screen topo-bg">
      <Navbar user={session?.user || null} />
      <main className="pt-24 pb-8 px-4 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <span>🌍</span> Daily Insights
              <span className="text-xs bg-accent-amber/20 text-accent-amber px-2 py-0.5 rounded-full">OG</span>
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              GeoGuessr tips & clues, delivered fresh daily
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* Today's Insight — featured */}
        {todayInsight && (
          <div className="glass-card p-6 border-l-4 border-accent-green animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs bg-accent-green/20 text-accent-green px-2 py-0.5 rounded-full font-medium">
                TODAY
              </span>
              <span className="text-xs text-text-secondary">
                {formatDate(todayInsight.date)}
              </span>
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-3">{todayInsight.title}</h2>
            {todayInsight.imageUrl && (
              <div className="mb-4 rounded-xl overflow-hidden border border-border-main">
                <img
                  src={todayInsight.imageUrl}
                  alt={todayInsight.imageCaption || todayInsight.title}
                  className="w-full max-h-72 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                {todayInsight.imageCaption && (
                  <p className="text-xs text-text-secondary px-3 py-2 bg-bg-secondary">
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

        {/* Past Insights Log */}
        {pastInsights.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-text-secondary uppercase tracking-wider">
              Previous Insights
            </h3>
            {pastInsights.map((insight, idx) => (
              <InsightCard key={insight.date} insight={insight} index={idx} />
            ))}
          </div>
        )}

        {insights.length === 0 && (
          <div className="glass-card p-8 text-center">
            <p className="text-4xl mb-3">🗺️</p>
            <p className="text-text-secondary">No insights yet. Check back tomorrow!</p>
          </div>
        )}
      </main>
    </div>
  );
}

function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="glass-card p-4 cursor-pointer hover:bg-bg-card/80 transition-all animate-fade-in"
      style={{ animationDelay: `${index * 50}ms` }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary font-mono w-20">
            {formatDate(insight.date)}
          </span>
          <h3 className="text-sm font-semibold text-text-primary">{insight.title}</h3>
        </div>
        <span className="text-text-secondary text-xs">
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
                className="w-full max-h-56 object-cover"
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
