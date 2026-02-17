'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';
import { DISPLAY_NAMES } from '@/lib/types';
import type { Username } from '@/lib/types';

export default function Navbar({ user }: { user: Username }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = [
    { href: '/', label: 'Dashboard', icon: '🏠' },
    { href: '/submit', label: 'Submit', icon: '📝' },
    { href: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
    { href: '/history', label: 'History', icon: '📊' },
  ];

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' });
    router.push('/login');
    router.refresh();
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border-main bg-bg-secondary/90 backdrop-blur-md">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌍</span>
            <span className="text-xl font-bold tracking-tight">
              <span className="text-accent-green">AHA</span>{' '}
              <span className="text-text-primary">GGs</span>
            </span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(link => (
              <a
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-bg-card text-accent-green'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-card/50'
                }`}
              >
                <span className="mr-1.5">{link.icon}</span>
                {link.label}
              </a>
            ))}
          </div>

          {/* User & logout */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary">
              {DISPLAY_NAMES[user]}
            </span>
            <button
              onClick={handleLogout}
              className="hidden md:block text-xs text-text-secondary hover:text-accent-red transition-colors px-3 py-1.5 rounded-lg border border-border-main hover:border-accent-red/30"
            >
              Logout
            </button>
            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-text-secondary"
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-1">
            {links.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-bg-card text-accent-green'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="mr-2">{link.icon}</span>
                {link.label}
              </a>
            ))}
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 rounded-lg text-sm text-accent-red hover:bg-bg-card transition-colors"
            >
              🚪 Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
