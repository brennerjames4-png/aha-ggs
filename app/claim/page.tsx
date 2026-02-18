'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const LEGACY_PLAYERS = [
  { name: 'James', username: 'jimbo', id: 'legacy_james' },
  { name: 'Tyler', username: 'tbone', id: 'legacy_tyler' },
  { name: 'David', username: 'thewizard', id: 'legacy_david' },
];

export default function ClaimPage() {
  const { update } = useSession();
  const router = useRouter();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [claimCode, setClaimCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlayer) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ legacyId: selectedPlayer, code: claimCode.toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid claim code');
        return;
      }

      await update();
      router.push('/');
      router.refresh();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 map-grid">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔑</div>
          <h1 className="text-3xl font-bold text-text-primary">Claim Your Account</h1>
          <p className="text-text-secondary mt-2 text-sm">
            OG players can claim their legacy account and keep all their history
          </p>
        </div>

        <div className="glass-card p-6 space-y-5">
          {/* Player selection */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              Which player are you?
            </label>
            <div className="grid grid-cols-3 gap-3">
              {LEGACY_PLAYERS.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => { setSelectedPlayer(player.id); setError(''); }}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    selectedPlayer === player.id
                      ? 'border-accent-green bg-accent-green/10'
                      : 'border-border-main hover:border-border-hover bg-bg-primary'
                  }`}
                >
                  <div className="text-lg font-semibold text-text-primary">{player.name}</div>
                  <div className="text-xs text-text-secondary">@{player.username}</div>
                </button>
              ))}
            </div>
          </div>

          {selectedPlayer && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              onSubmit={handleClaim}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Claim Code
                </label>
                <input
                  type="text"
                  value={claimCode}
                  onChange={(e) => { setClaimCode(e.target.value.toUpperCase()); setError(''); }}
                  placeholder="Enter your 6-character code"
                  maxLength={6}
                  className="w-full px-4 py-2.5 rounded-xl bg-bg-primary border border-border-main text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-green/50 focus:border-accent-green transition-all text-center text-2xl tracking-[0.3em] font-mono"
                  required
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-accent-red text-center"
                >
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={loading || claimCode.length !== 6}
                className="w-full py-2.5 rounded-xl bg-accent-green text-white font-semibold hover:bg-accent-green/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Claiming...
                  </span>
                ) : (
                  'Claim Account'
                )}
              </button>
            </motion.form>
          )}

          <div className="text-center pt-2 border-t border-border-main">
            <a href="/onboarding" className="text-sm text-accent-blue hover:underline">
              I&apos;m new here — create a fresh account
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
