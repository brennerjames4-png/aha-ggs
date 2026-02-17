'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import SubmissionStatus from '@/components/SubmissionStatus';
import ConfettiEffect from '@/components/ConfettiEffect';
import { motion } from 'framer-motion';
import type { Username } from '@/lib/types';

export default function SubmitPage() {
  const router = useRouter();
  const [user, setUser] = useState<Username | null>(null);
  const [rounds, setRounds] = useState(['', '', '']);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<{
    submitted: Username[];
    notSubmitted: Username[];
    revealed: boolean;
    total: number;
  } | null>(null);
  const [myScores, setMyScores] = useState<[number, number, number] | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [authRes, todayRes] = await Promise.all([
          fetch('/api/auth'),
          fetch('/api/scores/today'),
        ]);

        if (!authRes.ok) {
          router.push('/login');
          return;
        }

        const authData = await authRes.json();
        setUser(authData.user);

        if (todayRes.ok) {
          const td = await todayRes.json();
          setSubmitted(td.submitted);
          setStatus(td.status);
          setMyScores(td.myScores);
          if (td.status.revealed) {
            setRevealed(true);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  function handleRoundChange(index: number, value: string) {
    const newRounds = [...rounds];
    newRounds[index] = value;
    setRounds(newRounds);
    setError('');
  }

  function validateRounds(): [number, number, number] | null {
    const parsed: number[] = [];
    for (let i = 0; i < 3; i++) {
      const val = parseInt(rounds[i]);
      if (isNaN(val) || val < 0 || val > 5000) {
        setError(`Round ${i + 1} must be a number between 0 and 5,000`);
        return null;
      }
      parsed.push(val);
    }
    return parsed as [number, number, number];
  }

  function handlePreSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = validateRounds();
    if (!valid) return;
    setConfirming(true);
  }

  async function handleConfirmSubmit() {
    const valid = validateRounds();
    if (!valid) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/scores/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rounds: valid }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setConfirming(false);
        return;
      }

      setSubmitted(true);
      setMyScores(valid);
      setMessage(data.message);
      setConfirming(false);

      if (data.revealed) {
        setRevealed(true);
        setShowConfetti(true);
      }

      // Refresh status
      const todayRes = await fetch('/api/scores/today');
      if (todayRes.ok) {
        const td = await todayRes.json();
        setStatus(td.status);
      }
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl block mb-3 animate-bounce">🌍</span>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  const total = rounds.reduce((sum, r) => sum + (parseInt(r) || 0), 0);

  return (
    <div className="min-h-screen">
      <ConfettiEffect trigger={showConfetti} />
      <Navbar user={user} />

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold text-text-primary">Submit Scores</h1>
          <p className="text-text-secondary text-sm mt-1">
            Enter your 3 round scores from today&apos;s GeoGuessr challenge
          </p>
        </motion.div>

        {/* Status */}
        {status && (
          <SubmissionStatus
            submitted={status.submitted}
            notSubmitted={status.notSubmitted}
            revealed={status.revealed}
          />
        )}

        {/* Already submitted */}
        {submitted && myScores ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card p-6 text-center space-y-4"
          >
            <span className="text-4xl block">✅</span>
            <p className="text-lg font-semibold text-accent-green">
              Scores Locked In!
            </p>
            {message && (
              <p className="text-sm text-text-secondary">{message}</p>
            )}

            <div className="grid grid-cols-3 gap-3 mt-4">
              {myScores.map((s, i) => (
                <div key={i} className="bg-bg-primary rounded-xl p-3 text-center">
                  <p className="text-xs text-text-secondary">Round {i + 1}</p>
                  <p className="text-xl font-bold text-accent-green">{s.toLocaleString()}</p>
                </div>
              ))}
            </div>

            <div className="bg-bg-primary rounded-xl p-3">
              <p className="text-sm text-text-secondary">Total</p>
              <p className="text-2xl font-bold text-text-primary">
                {myScores.reduce((a, b) => a + b, 0).toLocaleString()}
                <span className="text-sm text-text-secondary font-normal"> / 15,000</span>
              </p>
            </div>

            {revealed ? (
              <a
                href="/"
                className="inline-block px-6 py-2 rounded-xl bg-accent-green text-white font-semibold hover:bg-accent-green/90 transition-colors"
              >
                View Results
              </a>
            ) : (
              <p className="text-sm text-text-secondary pulse-gentle">
                Waiting for all players to submit...
              </p>
            )}
          </motion.div>
        ) : (
          /* Score entry form */
          <motion.form
            onSubmit={handlePreSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6 space-y-5"
          >
            {[0, 1, 2].map(i => (
              <div key={i}>
                <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                  <span className="w-6 h-6 rounded-full bg-accent-green/20 text-accent-green flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </span>
                  Round {i + 1}
                  <span className="text-xs text-text-secondary/60 ml-auto">0 - 5,000</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="5000"
                  value={rounds[i]}
                  onChange={(e) => handleRoundChange(i, e.target.value)}
                  placeholder="Enter score"
                  className="w-full px-4 py-3 rounded-xl bg-bg-primary border border-border-main text-text-primary text-lg font-mono placeholder:text-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-accent-green/50 focus:border-accent-green transition-all"
                  required
                />
              </div>
            ))}

            {/* Live total */}
            <div className="flex items-center justify-between pt-2 border-t border-border-main">
              <span className="text-sm text-text-secondary">Running Total</span>
              <span className={`text-2xl font-bold ${total > 12000 ? 'text-accent-green' : total > 8000 ? 'text-accent-amber' : 'text-text-primary'}`}>
                {total.toLocaleString()}
                <span className="text-sm text-text-secondary font-normal"> / 15,000</span>
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-bg-primary overflow-hidden">
              <div
                className="h-full rounded-full bg-accent-green transition-all duration-300"
                style={{ width: `${Math.min((total / 15000) * 100, 100)}%` }}
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm text-accent-red text-center"
              >
                {error}
              </motion.p>
            )}

            {!confirming ? (
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-accent-green text-white font-semibold text-lg hover:bg-accent-green/90 transition-all"
              >
                Submit Scores
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-accent-amber/10 border border-accent-amber/30 rounded-xl p-4 text-center">
                  <p className="text-sm font-medium text-accent-amber">
                    Are you sure? Scores cannot be changed after submission.
                  </p>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {rounds.map((r, i) => (
                      <div key={i} className="text-center">
                        <span className="text-xs text-text-secondary">R{i + 1}</span>
                        <p className="font-bold text-text-primary">{parseInt(r).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="py-2.5 rounded-xl border border-border-main text-text-secondary hover:bg-bg-card transition-colors"
                  >
                    Go Back
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSubmit}
                    disabled={submitting}
                    className="py-2.5 rounded-xl bg-accent-green text-white font-semibold hover:bg-accent-green/90 disabled:opacity-50 transition-all"
                  >
                    {submitting ? 'Submitting...' : 'Confirm'}
                  </button>
                </div>
              </div>
            )}
          </motion.form>
        )}
      </main>
    </div>
  );
}
