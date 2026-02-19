'use client';

import { useState, useEffect, useCallback } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  // Password validation
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordValid = hasUppercase && hasNumber;

  // Debounced username availability check
  const checkUsername = useCallback(async (name: string) => {
    if (name.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    try {
      const res = await fetch(`/api/users/search?check=${encodeURIComponent(name)}`);
      if (res.ok) {
        const data = await res.json();
        setUsernameAvailable(data.available);
      }
    } catch {
      // ignore
    } finally {
      setCheckingUsername(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (username.length >= 3) {
        checkUsername(username);
      } else {
        setUsernameAvailable(null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [username, checkUsername]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Create account
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, displayName: displayName || username }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Signup failed');
        setLoading(false);
        return;
      }

      // Sign in with credentials
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Account created but sign-in failed. Try logging in.');
        setLoading(false);
        return;
      }

      router.push('/');
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 map-grid">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm"
      >
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
            Create your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="your_username"
              maxLength={20}
              className="w-full px-4 py-2.5 rounded-xl bg-bg-primary border border-border-main text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-green/50 focus:border-accent-green transition-all"
              required
            />
            {username.length >= 3 && (
              <p className={`text-xs mt-1 ${checkingUsername ? 'text-text-secondary' : usernameAvailable ? 'text-accent-green' : 'text-accent-red'}`}>
                {checkingUsername ? 'Checking...' : usernameAvailable ? 'Available' : 'Taken'}
              </p>
            )}
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Display Name <span className="text-text-secondary/50">(optional)</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={username || 'Your Name'}
              maxLength={50}
              className="w-full px-4 py-2.5 rounded-xl bg-bg-primary border border-border-main text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-green/50 focus:border-accent-green transition-all"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-2.5 rounded-xl bg-bg-primary border border-border-main text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-green/50 focus:border-accent-green transition-all"
              required
            />
            {password.length > 0 && (
              <div className="flex gap-3 mt-1.5">
                <span className={`text-xs ${hasUppercase ? 'text-accent-green' : 'text-text-secondary'}`}>
                  {hasUppercase ? '✓' : '○'} Uppercase
                </span>
                <span className={`text-xs ${hasNumber ? 'text-accent-green' : 'text-text-secondary'}`}>
                  {hasNumber ? '✓' : '○'} Number
                </span>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-accent-red text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !username || username.length < 3 || !password || !passwordValid || usernameAvailable === false}
            className="w-full py-2.5 rounded-xl bg-accent-green text-white font-semibold hover:bg-accent-green/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>

          <div className="relative flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-border-main" />
            <span className="text-xs text-text-secondary">or</span>
            <div className="flex-1 h-px bg-border-main" />
          </div>

          <button
            type="button"
            onClick={() => signIn('google', { callbackUrl: '/' })}
            className="w-full py-2.5 px-4 rounded-xl bg-white text-gray-800 font-semibold hover:bg-gray-100 transition-all flex items-center justify-center gap-3 shadow-sm"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign up with Google
          </button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-accent-green hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
