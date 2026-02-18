'use client';

import { useState, useEffect } from 'react';

interface GroupOption {
  id: string;
  name: string;
  isOriginal: boolean;
}

interface GroupSelectorProps {
  groups: GroupOption[];
  selectedGroupId: string | null;
  onSelect: (groupId: string) => void;
}

export default function GroupSelector({ groups, selectedGroupId, onSelect }: GroupSelectorProps) {
  if (groups.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {groups.map((g) => (
        <button
          key={g.id}
          onClick={() => onSelect(g.id)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            selectedGroupId === g.id
              ? 'bg-accent-green text-white'
              : 'bg-bg-secondary text-text-secondary hover:bg-bg-secondary/80 border border-border-main'
          }`}
        >
          {g.name}
          {g.isOriginal && ' ★'}
        </button>
      ))}
    </div>
  );
}
