'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Navbar from '@/components/Navbar';

export default function SettingsPage() {
  const { data: session } = useSession();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/users/me');
      if (res.ok) {
        const data = await res.json();
        setDisplayName(data.user.displayName);
      }
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName }),
      });
      if (res.ok) {
        setMessage('Saved!');
      }
    } catch {
      setMessage('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar user={session?.user || null} />
      <div className="max-w-lg mx-auto px-4 pt-24 pb-8 space-y-6">
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>

        <div className="glass-card p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-bg-primary border border-border-main text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-green/50 focus:border-accent-green transition-all"
              maxLength={30}
            />
          </div>

          {session?.user?.image && (
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Avatar
              </label>
              <img
                src={session.user.image}
                alt="Avatar"
                className="w-16 h-16 rounded-full"
              />
              <p className="text-xs text-text-secondary mt-1">
                Avatar comes from your Google account
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded-xl bg-accent-green text-white font-medium text-sm hover:bg-accent-green/90 disabled:opacity-50 transition-all"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {message && (
              <span className="text-sm text-accent-green">{message}</span>
            )}
          </div>
        </div>

        <div className="glass-card p-4">
          <h2 className="text-sm font-medium text-text-secondary mb-2">Account Info</h2>
          <div className="space-y-1 text-sm">
            <p className="text-text-secondary">
              Username: <span className="text-text-primary">@{session?.user?.username || '—'}</span>
            </p>
            <p className="text-text-secondary">
              Email: <span className="text-text-primary">{session?.user?.email || '—'}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
