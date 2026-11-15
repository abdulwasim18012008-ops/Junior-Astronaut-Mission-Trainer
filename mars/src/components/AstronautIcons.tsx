import React from 'react';
import { CharacterId } from '../game/types';

export const MarsMissionPatchLogo: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
    <circle cx="40" cy="40" r="37" fill="#0f172a" stroke="#f97316" strokeWidth="3" />
    <circle cx="40" cy="40" r="31" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="4 3" />
    <path d="M12 52C22 44 58 44 68 52A31 31 0 0 1 12 52Z" fill="#c2410c" />
    <path d="M18 54C29 48 51 48 62 54A28 28 0 0 1 18 54Z" fill="#ea580c" />
    <path d="M31 49A9 9 0 0 1 49 49H31Z" fill="#e2e8f0" />
    <rect x="28" y="49" width="24" height="3" rx="1.5" fill="#94a3b8" />
    <path d="M18 35C28 20 52 19 63 32" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
    <polygon points="62,25 66,34 57,31" fill="#fbbf24" />
    <circle cx="24" cy="23" r="1.5" fill="#f8fafc" />
    <circle cx="53" cy="18" r="1.2" fill="#f8fafc" />
  </svg>
);

export const AstronautPortrait: React.FC<{ id: CharacterId; className?: string }> = ({
  id,
  className = 'w-12 h-12',
}) => {
  const palette: Record<CharacterId, { suit: string; trim: string; bg: string }> = {
    alex: { suit: '#f1f5f9', trim: '#f97316', bg: '#7c2d12' },
    leo: { suit: '#f1f5f9', trim: '#ec4899', bg: '#831843' },
    nova: { suit: '#f1f5f9', trim: '#2563eb', bg: '#1e3a8a' },
    maya: { suit: '#f1f5f9', trim: '#06b6d4', bg: '#164e63' },
    ryan: { suit: '#f1f5f9', trim: '#eab308', bg: '#713f12' },
    zara: { suit: '#f1f5f9', trim: '#10b981', bg: '#064e3b' },
  };
  const p = palette[id];

  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill={p.bg} />
      <path d="M12 64C12 50 20 44 32 44C44 44 52 50 52 64H12Z" fill={p.suit} />
      <path d="M22 45H42V55H22V45Z" fill={p.trim} />
      <circle cx="32" cy="27" r="16" fill={p.suit} stroke="#cbd5e1" strokeWidth="2" />
      <rect x="20" y="19" width="24" height="15" rx="7.5" fill="#f59e0b" />
      <path d="M24 23C27 21 32 21 35 23" stroke="#fef3c7" strokeWidth="2" strokeLinecap="round" />
      <rect x="46" y="14" width="3" height="12" rx="1.5" fill="#94a3b8" />
      <circle cx="47.5" cy="13" r="2.2" fill={p.trim} />
    </svg>
  );
};

export const ResourceIcon: React.FC<{
  kind: 'air' | 'water' | 'food' | 'power';
  className?: string;
}> = ({ kind, className = 'w-4 h-4' }) => {
  switch (kind) {
    case 'air':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M4 10h11a3 3 0 1 0-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M4 14h14a3 3 0 1 1-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'water':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M12 3C12 3 6 10.5 6 14.5C6 17.8 8.7 20.5 12 20.5C15.3 20.5 18 17.8 18 14.5C18 10.5 12 3 12 3Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'food':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M12 20V11M12 11C12 7 15.5 4.5 19 4.5C19 8.5 16.5 11 12 11ZM12 13C12 9 8.5 6.5 5 6.5C5 10.5 7.5 13 12 13Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'power':
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path d="M13 2L5 14H12L11 22L19 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
  }
};
