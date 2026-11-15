import React from 'react';

interface EmblemProps {
  size?: number;
  unlocked?: boolean;
  className?: string;
}

/**
 * Circular Gold & Silver achievement emblem for the LUNAR PIONEER badge:
 * features an astronaut boot footprint on lunar regolith with a small American flag beside it.
 */
export const LunarPioneerEmblem: React.FC<EmblemProps> = ({
  size = 56,
  unlocked = true,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      aria-label="Lunar Pioneer Badge Emblem"
    >
      <defs>
        <linearGradient id="lpGoldRim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="45%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="lpSilverInner" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="55%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="lpLunarSoil" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="lpSilverRing" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <clipPath id="lpInnerClip">
          <circle cx="60" cy="60" r="46" />
        </clipPath>
      </defs>

      {/* Outer Gold Medallion Rim */}
      <circle
        cx="60"
        cy="60"
        r="56"
        fill="url(#lpGoldRim)"
        stroke="#fef3c7"
        strokeWidth="2"
        opacity={unlocked ? 1 : 0.45}
      />

      {/* Inner Silver Bezel */}
      <circle
        cx="60"
        cy="60"
        r="50"
        fill="none"
        stroke="url(#lpSilverRing)"
        strokeWidth="3.5"
      />

      {/* Deep Space Background & Clipped Lunar Horizon Scene */}
      <g clipPath="url(#lpInnerClip)">
        <circle cx="60" cy="60" r="46" fill="url(#lpSilverInner)" />

        {/* Subtle stars in sky */}
        <circle cx="32" cy="34" r="1.2" fill="#f8fafc" opacity="0.85" />
        <circle cx="48" cy="24" r="1.4" fill="#fde68a" opacity="0.9" />
        <circle cx="88" cy="32" r="1.1" fill="#f8fafc" opacity="0.8" />
        <circle cx="76" cy="21" r="0.9" fill="#e2e8f0" opacity="0.7" />
        <circle cx="24" cy="50" r="0.9" fill="#cbd5e1" opacity="0.7" />

        {/* Subtle Lunar Surface Horizon Curve */}
        <path
          d="M 10 74 Q 60 62 110 74 L 110 112 L 10 112 Z"
          fill="url(#lpLunarSoil)"
        />
        {/* Subtle crater dimples on horizon */}
        <ellipse cx="30" cy="84" rx="7" ry="2.2" fill="#475569" opacity="0.55" />
        <ellipse cx="90" cy="89" rx="6" ry="2" fill="#475569" opacity="0.5" />

        {/* American Flag Detail Standing Beside Footprint */}
        <g transform="translate(72, 34)">
          {/* Flagpole & Crossbar */}
          <rect x="0" y="0" width="2.4" height="39" rx="1" fill="#e2e8f0" />
          <circle cx="1.2" cy="0" r="2" fill="#fbbf24" />
          <rect x="1" y="2" width="22" height="1.6" fill="#cbd5e1" />
          {/* Flag Banner */}
          <g transform="translate(2.4, 3.6)">
            <rect x="0" y="0" width="20" height="12.5" fill="#f8fafc" rx="0.6" />
            <rect x="0" y="0" width="20" height="1.8" fill="#dc2626" />
            <rect x="0" y="3.6" width="20" height="1.8" fill="#dc2626" />
            <rect x="0" y="7.2" width="20" height="1.8" fill="#dc2626" />
            <rect x="0" y="10.8" width="20" height="1.7" fill="#dc2626" />
            {/* Blue Canton + tiny stars */}
            <rect x="0" y="0" width="8.5" height="7.2" fill="#1d4ed8" />
            <circle cx="2.2" cy="2.1" r="0.7" fill="#ffffff" />
            <circle cx="4.3" cy="2.1" r="0.7" fill="#ffffff" />
            <circle cx="6.4" cy="2.1" r="0.7" fill="#ffffff" />
            <circle cx="3.2" cy="3.7" r="0.7" fill="#ffffff" />
            <circle cx="5.4" cy="3.7" r="0.7" fill="#ffffff" />
            <circle cx="2.2" cy="5.3" r="0.7" fill="#ffffff" />
            <circle cx="4.3" cy="5.3" r="0.7" fill="#ffffff" />
            <circle cx="6.4" cy="5.3" r="0.7" fill="#ffffff" />
          </g>
        </g>

        {/* Recognizable Ribbed Astronaut Boot Footprint Pressed Into Soil */}
        <g transform="translate(47, 86) rotate(-18)">
          {/* Outer displaced lunar soil halo */}
          <rect
            x="-12.5"
            y="-19.5"
            width="25"
            height="39"
            rx="11"
            fill="#e2e8f0"
            opacity="0.45"
          />
          {/* Deep recessed sole print */}
          <rect
            x="-9.5"
            y="-16.5"
            width="19"
            height="33"
            rx="8.5"
            fill="#1e293b"
            stroke="#475569"
            strokeWidth="1.2"
          />
          {/* Horizontal Apollo boot sole tread grooves */}
          <rect x="-7" y="-12.5" width="14" height="2.2" rx="1" fill="#64748b" />
          <rect x="-7.4" y="-8.5" width="14.8" height="2.2" rx="1" fill="#64748b" />
          <rect x="-7.4" y="-4.5" width="14.8" height="2.2" rx="1" fill="#64748b" />
          <rect x="-7" y="-0.5" width="14" height="2.2" rx="1" fill="#64748b" />
          <rect x="-6.4" y="4.5" width="12.8" height="2.2" rx="1" fill="#64748b" />
          <rect x="-6.2" y="8.5" width="12.4" height="2.2" rx="1" fill="#64748b" />
          <rect x="-5.5" y="12.3" width="11" height="2" rx="1" fill="#64748b" />
        </g>
      </g>

      {/* Top/Bottom Subtle Gold Accent Stars on Medallion Ring */}
      <circle cx="60" cy="7.5" r="2.2" fill="#fef3c7" />
      <circle cx="60" cy="112.5" r="2.2" fill="#fef3c7" />
    </svg>
  );
};
