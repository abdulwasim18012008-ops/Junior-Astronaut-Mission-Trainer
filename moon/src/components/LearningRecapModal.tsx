import React from 'react';
import { MissionDef, RecapAnimationType } from '../types/game';
import { Award, Star, ArrowRight } from 'lucide-react';

interface LearningRecapModalProps {
  mission: MissionDef;
  starsEarned: number;
  pointsEarned: number;
  onContinue: () => void;
}

export const LearningRecapModal: React.FC<LearningRecapModalProps> = ({
  mission,
  starsEarned,
  pointsEarned,
  onContinue,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4">
      <div className="w-full max-w-xl rounded-3xl border-2 border-amber-400/60 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="text-center">
          <div className="text-xs font-extrabold tracking-widest text-amber-400 uppercase">
            Mission Complete!
          </div>
          <h2 className="mt-1 text-2xl font-black text-white">{mission.title}</h2>

          {/* Earned Stars */}
          <div className="my-4 flex items-center justify-center gap-3">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${
                  s <= starsEarned
                    ? 'border-amber-300 bg-amber-500/20 text-amber-400'
                    : 'border-slate-700 bg-slate-800 text-slate-600'
                }`}
              >
                <Star className="h-7 w-7 fill-current" />
              </div>
            ))}
          </div>

          <div className="mb-5 inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/70 px-4 py-1.5 text-sm font-bold text-emerald-300">
            +{pointsEarned} Explorer Points
          </div>
        </div>

        {/* Animated Visual Science Demonstration (NO QUIZZES!) */}
        <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
          <div className="mb-2 text-xs font-bold tracking-wider text-sky-400 uppercase">
            What Did You Do?
          </div>
          <p className="text-base font-bold text-white">{mission.recapHeadline}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">{mission.recapFact}</p>

          <div className="mt-4 flex h-28 items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-900/90">
            <ScienceDemoSVG type={mission.recapAnimation} />
          </div>
        </div>

        {mission.badgeReward && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-400/40 bg-amber-950/40 p-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 text-2xl">
              {mission.badgeReward.icon}
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase">
                <Award className="h-3.5 w-3.5" /> New Badge Unlocked
              </div>
              <div className="font-bold text-white">{mission.badgeReward.name}</div>
            </div>
          </div>
        )}

        <button
          onClick={onContinue}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 text-base font-extrabold text-slate-950 hover:bg-amber-400"
        >
          Continue Moon Adventure
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

const ScienceDemoSVG: React.FC<{ type: RecapAnimationType }> = ({ type }) => {
  return (
    <svg viewBox="0 0 320 96" className="h-full w-full">
      {type === 'solar_power' || type === 'far_side' ? (
        <>
          <circle cx="55" cy="24" r="14" fill="#fbbf24" />
          <line x1="72" y1="30" x2="145" y2="54" stroke="#fde047" strokeWidth="2.5" strokeDasharray="5 4" />
          <line x1="68" y1="38" x2="145" y2="62" stroke="#fde047" strokeWidth="2.5" strokeDasharray="5 4" />
          <rect x="145" y="45" width="70" height="28" rx="4" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="2" />
          <text x="235" y="64" fill="#fde047" fontSize="14" fontWeight="bold">⚡ POWER ON</text>
        </>
      ) : type === 'water_cycle' || type === 'lunar_ice' ? (
        <>
          <polygon points="75,65 95,28 115,65" fill="#7dd3fc" stroke="#e0f2fe" strokeWidth="2" />
          <text x="132" y="54" fill="#94a3b8" fontSize="16">→</text>
          <circle cx="185" cy="48" r="18" fill="#0284c7" />
          <text x="176" y="54" fill="#ffffff" fontSize="14">💧</text>
          <text x="220" y="53" fill="#7dd3fc" fontSize="13" fontWeight="bold">PURE WATER</text>
        </>
      ) : type === 'oxygen' || type === 'greenhouse' ? (
        <>
          <circle cx="95" cy="48" r="16" fill="#22c55e" />
          <text x="86" y="54" fill="#ffffff" fontSize="15">🌿</text>
          <text x="128" y="53" fill="#94a3b8" fontSize="15">→</text>
          <circle cx="176" cy="48" r="15" fill="#0ea5e9" />
          <text x="167" y="53" fill="#ffffff" fontSize="12" fontWeight="bold">O₂</text>
          <text x="206" y="53" fill="#86efac" fontSize="13" fontWeight="bold">CLEAN AIR</text>
        </>
      ) : type === 'commander_launch' ? (
        <>
          <rect x="0" y="76" width="320" height="20" fill="#334155" />
          <polygon points="155,14 143,48 167,48" fill="#f8fafc" />
          <polygon points="148,48 162,48 155,74" fill="#f97316" />
          <text x="188" y="46" fill="#fde047" fontSize="13" fontWeight="bold">1.62 m/s² LIFTOFF</text>
        </>
      ) : (
        <>
          <circle cx="72" cy="48" r="22" fill="#2563eb" />
          <circle cx="78" cy="44" r="7" fill="#22c55e" />
          <line x1="100" y1="48" x2="215" y2="48" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="6 4" />
          <circle cx="242" cy="48" r="14" fill="#94a3b8" />
          <text x="125" y="34" fill="#7dd3fc" fontSize="11" fontWeight="bold">EARTH ↔ MOON</text>
        </>
      )}
    </svg>
  );
};
