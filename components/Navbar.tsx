'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import NotificationBell from './NotificationBell';

interface NavbarUser {
  id?: string | null;
  name?: string | null;
  image?: string | null;
  username?: string | null;
  onboarded?: boolean;
}

export default function Navbar({ user }: { user: NavbarUser | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isOgMember, setIsOgMember] = useState(false);

  // Check if user is in OG group
  useEffect(() => {
    if (!user?.onboarded) return;
    async function checkOg() {
      try {
        const res = await fetch('/api/groups');
        if (res.ok) {
          const data = await res.json();
          const og = data.groups?.some((g: any) => g.isOriginal);
          setIsOgMember(!!og);
        }
      } catch {}
    }
    checkOg();
  }, [user?.onboarded]);

  const links = [
    { href: '/', label: 'Dashboard', icon: '🏠' },
    { href: '/submit', label: 'Submit', icon: '📝' },
    { href: '/groups', label: 'Groups', icon: '👥' },
    { href: '/friends', label: 'Friends', icon: '🤝' },
  ];

  if (isOgMember) {
    links.push({ href: '/insights', label: 'Insights', icon: '🔮' });
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border-main bg-bg-secondary/90 backdrop-blur-md">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3">
            <span className="text-2xl">🌍</span>
            <span className="text-xl font-bold tracking-tight">
              <span className="text-accent-green">AHA</span>{' '}
              <span className="text-text-primary">GGs</span>
            </span>
          </a>

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

          {/* User section */}
          <div className="flex items-center gap-2">
            {user?.onboarded && <NotificationBell />}

            {user && (
              <a
                href={user.username ? `/profile/${user.username}` : '#'}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                {user.image ? (
                  <img src={user.image} alt="" className="w-7 h-7 rounded-full" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-accent-green/20 flex items-center justify-center text-xs font-bold text-accent-green">
                    {(user.name || '?')[0]}
                  </div>
                )}
                <span className="hidden sm:block text-sm text-text-secondary">
                  {user.name || user.username}
                </span>
              </a>
            )}

            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
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
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full text-left px-4 py-2.5 rounded-lg text-sm text-accent-red hover:bg-bg-card transition-colors"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
