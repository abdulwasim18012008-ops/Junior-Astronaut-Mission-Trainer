import React, { useEffect, useState } from 'react';
import { Award, CheckCircle2, Compass, Sparkles, Star } from 'lucide-react';
import { LearningIllustrationKind, LearningRecapSpec } from '../game/types';

interface LearningRecapModalProps {
  recap: LearningRecapSpec;
  earnedStars: number;
  pointsAwarded: number;
  totalPoints: number;
  totalStars: number;
  hasNextMission: boolean;
  onContinueNextMission: () => void;
  onExploreColony: () => void;
}

const IllustrationDiagram: React.FC<{ kind: LearningIllustrationKind; accent: string }> = ({
  kind,
  accent,
}) => {
  const [pulseStep, setPulseStep] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPulseStep((p) => (p + 1) % 3);
    }, 1100);
    return () => window.clearInterval(id);
  }, []);

  if (kind === 'oxygen_fan') {
    return (
      <svg viewBox="0 0 260 128" className="w-full h-32">
        <rect x="8" y="10" width="244" height="108" rx="18" fill="#0f172a" stroke="#38bdf8" strokeOpacity="0.4" strokeWidth="2" />
        {/* Air intake arrows */}
        <path d="M26 52 H66" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" strokeDasharray="6 6" />
        <path d="M26 74 H66" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" strokeDasharray="6 6" />
        {/* Filter box */}
        <rect x="70" y="34" width="38" height="60" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
        <line x1="78" y1="44" x2="100" y2="44" stroke="#7dd3fc" strokeWidth="3" />
        <line x1="78" y1="56" x2="100" y2="56" stroke="#7dd3fc" strokeWidth="3" />
        <line x1="78" y1="68" x2="100" y2="68" stroke="#7dd3fc" strokeWidth="3" />
        <line x1="78" y1="80" x2="100" y2="80" stroke="#7dd3fc" strokeWidth="3" />
        {/* Spinning O2 Fan */}
        <g transform="translate(152 64)">
          <circle r="28" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="2.5" />
          <g className="origin-center animate-spin" style={{ animationDuration: '2.4s' }}>
            <ellipse cx="0" cy="-14" rx="6" ry="12" fill="#38bdf8" />
            <ellipse cx="0" cy="14" rx="6" ry="12" fill="#38bdf8" />
            <ellipse cx="-14" cy="0" rx="12" ry="6" fill="#7dd3fc" />
            <ellipse cx="14" cy="0" rx="12" ry="6" fill="#7dd3fc" />
          </g>
          <circle r="6" fill="#f8fafc" />
        </g>
        {/* Clean O2 bubbles */}
        <circle cx="204" cy={pulseStep === 0 ? 48 : 42} r="7" fill="#22d3ee" opacity="0.9" />
        <circle cx="224" cy={pulseStep === 1 ? 66 : 60} r="9" fill="#38bdf8" opacity="0.95" />
        <circle cx="208" cy={pulseStep === 2 ? 84 : 78} r="6" fill="#a5f3fc" opacity="0.85" />
        <text x="216" y="30" fill="#bae6fd" fontSize="11" fontWeight="bold" textAnchor="middle">
          O₂ AIR
        </text>
      </svg>
    );
  }

  if (kind === 'water_pipe' || kind === 'water_recycler') {
    return (
      <svg viewBox="0 0 260 128" className="w-full h-32">
        <rect x="8" y="10" width="244" height="108" rx="18" fill="#0f172a" stroke="#3b82f6" strokeOpacity="0.4" strokeWidth="2" />
        {/* Pipe segments */}
        <rect x="24" y="54" width="90" height="20" rx="6" fill="#1d4ed8" />
        <rect x="146" y="54" width="90" height="20" rx="6" fill="#1d4ed8" />
        {/* Sealed green clamp in center */}
        <rect x="108" y="46" width="44" height="36" rx="8" fill="#10b981" stroke="#a7f3d0" strokeWidth="2.5" />
        <circle cx="120" cy="64" r="4" fill="#ecfdf5" />
        <circle cx="140" cy="64" r="4" fill="#ecfdf5" />
        {/* Flowing water droplets inside */}
        <circle cx={42 + pulseStep * 28} cy="64" r="5" fill="#93c5fd" />
        <circle cx={166 + pulseStep * 24} cy="64" r="5" fill="#bfdbfe" />
        <text x="130" y="34" fill="#6ee7b7" fontSize="11" fontWeight="bold" textAnchor="middle">
          SEALED &amp; SAVED!
        </text>
      </svg>
    );
  }

  if (kind === 'solar_power' || kind === 'satellite_uplink') {
    return (
      <svg viewBox="0 0 260 128" className="w-full h-32">
        <rect x="8" y="10" width="244" height="108" rx="18" fill="#0f172a" stroke="#eab308" strokeOpacity="0.45" strokeWidth="2" />
        {/* Sun */}
        <circle cx="48" cy="42" r="16" fill="#fbbf24" />
        {/* Sunlight rays */}
        <line x1="68" y1="48" x2="112" y2="66" stroke="#fde047" strokeWidth={pulseStep === 0 ? 4 : 2.5} strokeDasharray="5 4" />
        <line x1="62" y1="58" x2="106" y2="78" stroke="#fde047" strokeWidth={pulseStep === 1 ? 4 : 2.5} strokeDasharray="5 4" />
        {/* Clean Solar Panel */}
        <polygon points="96,86 156,56 172,76 112,104" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="2.5" />
        <line x1="126" y1="71" x2="142" y2="90" stroke="#93c5fd" strokeWidth="1.5" />
        {/* Wire to battery */}
        <path d="M168 74 H194" stroke="#eab308" strokeWidth="4" strokeLinecap="round" />
        {/* Charged Battery */}
        <rect x="196" y="42" width="34" height="54" rx="7" fill="#1e293b" stroke="#4ade80" strokeWidth="2.5" />
        <rect x="206" y="36" width="14" height="6" rx="2" fill="#4ade80" />
        <rect x="202" y="50" width="22" height="12" rx="3" fill="#22c55e" />
        <rect x="202" y="65" width="22" height="12" rx="3" fill="#22c55e" />
        <rect x="202" y="80" width="22" height="10" rx="3" fill="#4ade80" />
      </svg>
    );
  }

  if (kind === 'greenhouse' || kind === 'food_supply') {
    return (
      <svg viewBox="0 0 260 128" className="w-full h-32">
        <rect x="8" y="10" width="244" height="108" rx="18" fill="#0f172a" stroke="#10b981" strokeOpacity="0.45" strokeWidth="2" />
        {/* Pink grow light bar */}
        <rect x="44" y="22" width="172" height="10" rx="5" fill="#ec4899" />
        <polygon points="56,32 204,32 224,96 36,96" fill="#f472b6" fillOpacity="0.14" />
        {/* Planter Box */}
        <rect x="52" y="88" width="156" height="18" rx="6" fill="#78350f" />
        {/* Green Stems & Red Mars Tomatoes */}
        {[82, 130, 178].map((cx, i) => (
          <g key={cx}>
            <line x1={cx} y1="88" x2={cx} y2={58 - (pulseStep === i ? 4 : 0)} stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
            <ellipse cx={cx - 10} cy="72" rx="9" ry="5" fill="#4ade80" />
            <ellipse cx={cx + 10} cy="68" rx="9" ry="5" fill="#4ade80" />
            <circle cx={cx} cy={52 - (pulseStep === i ? 4 : 0)} r="9" fill="#ef4444" stroke="#fca5a5" strokeWidth="1.5" />
          </g>
        ))}
      </svg>
    );
  }

  if (kind === 'colony_drive' || kind === 'rover_sojourner' || kind === 'rover_spirit' || kind === 'mountain_station') {
    return (
      <svg viewBox="0 0 260 128" className="w-full h-32">
        <rect x="8" y="10" width="244" height="108" rx="18" fill="#0f172a" stroke={accent} strokeOpacity="0.45" strokeWidth="2" />
        {/* Martian ground line */}
        <path d="M18 96 Q90 84 150 94 T242 90" fill="none" stroke="#c2410c" strokeWidth="4" strokeLinecap="round" />
        {/* Rover body sliding smoothly */}
        <g transform={`translate(${12 + pulseStep * 16}, 0)`}>
          <rect x="64" y="54" width="74" height="24" rx="7" fill="#f8fafc" stroke="#f97316" strokeWidth="2.5" />
          <rect x="116" y="42" width="22" height="18" rx="5" fill="#38bdf8" />
          <circle cx="76" cy="84" r="9" fill="#334155" stroke="#fbbf24" strokeWidth="2" />
          <circle cx="101" cy="84" r="9" fill="#334155" stroke="#fbbf24" strokeWidth="2" />
          <circle cx="126" cy="84" r="9" fill="#334155" stroke="#fbbf24" strokeWidth="2" />
        </g>
        {/* Signal / path arc */}
        <circle cx="212" cy="48" r="7" fill="#fbbf24" />
        <circle cx="212" cy="48" r={13 + pulseStep * 4} fill="none" stroke="#fbbf24" strokeWidth="2" strokeOpacity="0.6" />
      </svg>
    );
  }

  if (kind === 'dust_storm' || kind === 'emergency_drill' || kind === 'thermostat') {
    return (
      <svg viewBox="0 0 260 128" className="w-full h-32">
        <rect x="8" y="10" width="244" height="108" rx="18" fill="#0f172a" stroke={accent} strokeOpacity="0.45" strokeWidth="2" />
        {/* Armored Dome / Shelter */}
        <path d="M72 98 C72 52 188 52 188 98 Z" fill="#1e293b" stroke="#fbbf24" strokeWidth="3.5" />
        <rect x="114" y="72" width="32" height="26" rx="5" fill="#0ea5e9" fillOpacity="0.65" />
        {/* Warm core glow inside */}
        <circle cx="130" cy="84" r={8 + pulseStep * 2} fill="#f97316" fillOpacity="0.6" />
        {/* Gentle wind lines outside */}
        <path d="M22 44 H62" stroke="#fdba74" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        <path d="M196 50 H238" stroke="#fdba74" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
        <text x="130" y="34" fill="#fde68a" fontSize="11" fontWeight="bold" textAnchor="middle">
          SAFE &amp; PROTECTED INSIDE
        </text>
      </svg>
    );
  }

  // Default animated Relay / Dish / Beacon / Medical / Weather illustration
  return (
    <svg viewBox="0 0 260 128" className="w-full h-32">
      <rect x="8" y="10" width="244" height="108" rx="18" fill="#0f172a" stroke={accent} strokeOpacity="0.5" strokeWidth="2" />
      {/* Equipment Tower */}
      <rect x="64" y="48" width="44" height="50" rx="8" fill="#1e293b" stroke="#94a3b8" strokeWidth="2.5" />
      <rect x="74" y="58" width="24" height="18" rx="4" fill="#10b981" />
      <line x1="86" y1="48" x2="86" y2="28" stroke="#cbd5e1" strokeWidth="3.5" />
      <circle cx="86" cy="26" r="6" fill={accent} />
      {/* Expanding Radio Waves */}
      <path
        d="M118 38 Q134 26 118 14"
        fill="none"
        stroke={accent}
        strokeWidth="3"
        strokeLinecap="round"
        opacity={pulseStep >= 0 ? 1 : 0.25}
      />
      <path
        d="M132 44 Q154 26 132 8"
        fill="none"
        stroke={accent}
        strokeWidth="3"
        strokeLinecap="round"
        opacity={pulseStep >= 1 ? 1 : 0.25}
      />
      <path
        d="M148 50 Q174 26 148 2"
        fill="none"
        stroke={accent}
        strokeWidth="3"
        strokeLinecap="round"
        opacity={pulseStep === 2 ? 1 : 0.25}
      />
      {/* Colony Dish / Receiver */}
      <circle cx="198" cy="64" r="22" fill="#1e293b" stroke="#38bdf8" strokeWidth="2.5" />
      <circle cx="198" cy="64" r="8" fill="#4ade80" />
    </svg>
  );
};

export const LearningRecapModal: React.FC<LearningRecapModalProps> = ({
  recap,
  earnedStars,
  pointsAwarded,
  totalPoints,
  totalStars,
  hasNextMission,
  onContinueNextMission,
  onExploreColony,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6">
      <div className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl border-2 border-emerald-400/50 bg-slate-900 text-white shadow-2xl overflow-hidden">
        {/* Top Celebration Banner */}
        <div
          className="px-5 py-4 border-b border-slate-700/80 flex items-center justify-between gap-3 shrink-0"
          style={{
            background: `linear-gradient(135deg, ${recap.badgeColor}33, rgba(15,23,42,0.95))`,
          }}
        >
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-300">
              <Sparkles className="w-3.5 h-3.5" />
              {recap.title} · Mission {recap.missionId}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5 leading-tight">
              {recap.headline}
            </h2>
          </div>

          <div className="flex flex-col items-end shrink-0">
            <div className="flex items-center gap-1">
              {[1, 2, 3].map((s) => (
                <Star
                  key={s}
                  className={`w-6 h-6 transition-transform ${
                    s <= earnedStars
                      ? 'text-amber-300 fill-amber-300 scale-105'
                      : 'text-slate-600'
                  }`}
                />
              ))}
            </div>
            <span className="mt-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-2.5 py-0.5 text-xs font-black text-emerald-200">
              +{pointsAwarded} Points!
            </span>
          </div>
        </div>

        {/* Visual Animated Equipment Diagram */}
        <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto astro-scroll">
          <div className="rounded-2xl bg-slate-950/80 border border-slate-700/70 p-3">
            <IllustrationDiagram kind={recap.illustrationKind} accent={recap.badgeColor} />
            <div className="grid grid-cols-3 gap-2 mt-2.5">
              {recap.diagramSteps.map((step, i) => (
                <div
                  key={step.label}
                  className="rounded-xl bg-slate-800/80 border border-slate-700 px-2.5 py-2 text-center"
                >
                  <div className="text-[10px] font-black uppercase tracking-wider text-sky-300">
                    {i + 1}. {step.label}
                  </div>
                  <div className="text-[11px] text-slate-200 font-semibold mt-0.5 leading-snug">
                    {step.caption}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3 Kid-Friendly Takeaways (No Quiz, No Long Paragraphs!) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="rounded-2xl bg-amber-500/10 border border-amber-400/30 p-3">
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                What Problem Happened?
              </div>
              <p className="text-xs sm:text-sm text-slate-100 mt-1 leading-snug">
                {recap.problemDiscovered}
              </p>
            </div>

            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-400/30 p-3">
              <div className="text-[11px] font-black uppercase tracking-wider text-emerald-300">
                How You Fixed It
              </div>
              <p className="text-xs sm:text-sm text-slate-100 mt-1 leading-snug">
                {recap.whatYouDid}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-sky-500/15 border border-sky-400/40 p-3.5">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-sky-300">
              <CheckCircle2 className="w-4 h-4 text-sky-300" />
              What Did You Learn?
            </div>
            <p className="text-sm sm:text-base font-bold text-white mt-1 leading-snug">
              {recap.whatYouLearned}
            </p>
          </div>

          {/* Earned Badge & Running Totals */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-800/70 border border-slate-700 px-3.5 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">{recap.badgeIcon}</span>
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-amber-300">
                  Badge Unlocked
                </div>
                <div className="text-xs font-black text-white">{recap.badgeTitle}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs font-extrabold">
              <span className="inline-flex items-center gap-1 text-amber-300">
                <Star className="w-3.5 h-3.5 fill-amber-300" />
                {totalStars} Stars
              </span>
              <span className="inline-flex items-center gap-1 text-sky-300">
                <Award className="w-3.5 h-3.5" />
                {totalPoints} Pts
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            {hasNextMission ? (
              <button
                onClick={onContinueNextMission}
                className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 active:scale-[0.99] px-5 py-3 text-sm sm:text-base font-black text-white shadow-lg transition cursor-pointer"
              >
                Continue to Mission {recap.missionId + 1} →
              </button>
            ) : (
              <button
                onClick={onContinueNextMission}
                className="flex-1 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 active:scale-[0.99] px-5 py-3 text-sm sm:text-base font-black text-white shadow-lg transition cursor-pointer"
              >
                Finish Mars Campaign Celebration! 🏆
              </button>
            )}

            <button
              onClick={onExploreColony}
              className="rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-600 px-4 py-3 text-xs sm:text-sm font-bold text-slate-200 inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Compass className="w-4 h-4 text-sky-300" />
              Explore Colony First
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
