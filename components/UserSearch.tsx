'use client';

import { useState, useEffect, useRef } from 'react';

interface SearchResult {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
}

interface UserSearchProps {
  onSelect: (user: SearchResult) => void;
  placeholder?: string;
  excludeIds?: string[];
}

export default function UserSearch({ onSelect, placeholder = 'Search users...', excludeIds = [] }: UserSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (query.length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        const filtered = (data.users || []).filter(
          (u: SearchResult) => !excludeIds.includes(u.id)
        );
        setResults(filtered);
        setShowDropdown(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query, excludeIds]);

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl bg-bg-primary border border-border-main text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-green/50 focus:border-accent-green transition-all"
      />
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-text-secondary/30 border-t-text-secondary rounded-full animate-spin" />
      )}

      {showDropdown && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-bg-secondary border border-border-main rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {results.map((user) => (
            <button
              key={user.id}
              onClick={() => {
                onSelect(user);
                setQuery('');
                setShowDropdown(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-primary transition-colors text-left"
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-accent-green/20 flex items-center justify-center text-sm font-bold text-accent-green">
                  {user.displayName[0]}
                </div>
              )}
              <div>
                <div className="text-sm font-medium text-text-primary">{user.displayName}</div>
                <div className="text-xs text-text-secondary">@{user.username}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showDropdown && results.length === 0 && query.length >= 2 && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-bg-secondary border border-border-main rounded-xl shadow-lg p-4 text-center text-sm text-text-secondary">
          No users found
        </div>
      )}
    </div>
  );
}
