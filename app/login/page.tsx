'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Invalid username or password');
      setLoading(false);
      return;
    }

    router.push('/');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 map-grid">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.5, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="text-6xl mb-4"
          >
            🌍
          </motion.div>
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="text-accent-green">AHA</span>{' '}
            <span className="text-text-primary">GGs</span>
          </h1>
          <p className="text-text-secondary mt-2 text-sm">
            Where in the world are your points?
          </p>
        </div>

        {/* Sign in card */}
        <div className="glass-card p-6 space-y-4">
          <form onSubmit={handleCredentials} className="space-y-3">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="Username"
              className="w-full px-4 py-2.5 rounded-xl bg-bg-primary border border-border-main text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-green/50 focus:border-accent-green transition-all"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-2.5 rounded-xl bg-bg-primary border border-border-main text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-green/50 focus:border-accent-green transition-all"
            />
            {error && (
              <p className="text-sm text-accent-red text-center">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-2.5 rounded-xl bg-accent-green text-white font-semibold hover:bg-accent-green/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-border-main" />
            <span className="text-xs text-text-secondary">or</span>
            <div className="flex-1 h-px bg-border-main" />
          </div>

          <button
            onClick={() => signIn('google', { callbackUrl: '/' })}
            className="w-full py-2.5 px-4 rounded-xl bg-white text-gray-800 font-semibold hover:bg-gray-100 transition-all flex items-center justify-center gap-3 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </button>
        </div>

        <p className="text-center text-sm text-text-secondary mt-4">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-accent-green hover:underline">
            Sign up
          </Link>
        </p>

        <p className="text-center text-xs text-text-secondary mt-2">
          Globe-trotting glory awaits
        </p>
      </motion.div>
    </div>
  );
}
