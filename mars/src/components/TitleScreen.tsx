import React, { useEffect } from 'react';
import { MarsMissionPatchLogo } from './AstronautIcons';

interface TitleScreenProps {
  hasSavedProgress: boolean;
  savedMissionNumber: number;
  modalOpen?: boolean;
  onStartNew: () => void;
  onContinue: () => void;
  onOpenMissionSelect: () => void;
  onOpenSettings: () => void;
  onOpenCredits: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hasSavedProgress,
  savedMissionNumber,
  modalOpen = false,
  onStartNew,
  onContinue,
  onOpenMissionSelect,
  onOpenSettings,
  onOpenCredits,
}) => {
  useEffect(() => {
    if (modalOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (hasSavedProgress) {
          onContinue();
        } else {
          onStartNew();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [hasSavedProgress, modalOpen, onContinue, onStartNew]);

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-6 md:p-10">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(95deg, rgba(11,16,28,0.88) 0%, rgba(11,16,28,0.48) 44%, rgba(11,16,28,0.06) 100%)',
        }}
      />

      <div className="relative z-10 max-w-xl my-auto pointer-events-auto">
        <div className="flex items-center gap-4 mb-5">
          <MarsMissionPatchLogo className="w-16 h-16 shrink-0" />
          <div className="text-xs font-semibold tracking-wide text-amber-300">
            Mars Outpost Adventure · Ages 6–10
          </div>
        </div>

        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white leading-[1.06] text-balance mb-4">
          Junior Astronaut Mission Trainer
        </h1>

        <p className="text-slate-200/95 text-base sm:text-lg leading-relaxed max-w-lg mb-8">
          Begin at a remote Mars relay station with Commander Nova! Repair colony equipment, drive the
          6-wheel Exploration Vehicle, explore craters and mountains, earn stars &amp; badges, and
          lead 20 exciting missions across 4 Martian chapters.
        </p>

        <div className="flex flex-wrap items-center gap-3 mb-6">
          {hasSavedProgress ? (
            <>
              <button
                onClick={onContinue}
                className="px-6 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 active:scale-[0.99] text-slate-950 font-bold text-base transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-lg"
              >
                Continue Adventure (Mission {savedMissionNumber}/20)
              </button>
              <button
                onClick={onStartNew}
                className="px-5 py-3.5 rounded-xl bg-slate-800/95 hover:bg-slate-700 text-white font-semibold text-sm border border-white/15 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                New Game
              </button>
            </>
          ) : (
            <button
              onClick={onStartNew}
              className="px-7 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 active:scale-[0.99] text-slate-950 font-bold text-base transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-lg"
            >
              Start Adventure
            </button>
          )}

          <button
            onClick={onOpenMissionSelect}
            className="px-5 py-3.5 rounded-xl bg-[#0e1525]/92 hover:bg-slate-800 text-slate-100 font-semibold text-sm border border-white/15 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Choose Chapter
          </button>
        </div>

        <div className="flex items-center gap-5 text-sm text-slate-300">
          <button
            onClick={onOpenSettings}
            className="hover:text-white underline-offset-4 hover:underline transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Settings
          </button>
          <span aria-hidden="true" className="text-slate-500">
            ·
          </span>
          <button
            onClick={onOpenCredits}
            className="hover:text-white underline-offset-4 hover:underline transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Space Facts &amp; Credits
          </button>
        </div>
      </div>

      <div className="relative z-10 pointer-events-none">
        <p className="text-xs sm:text-sm text-slate-300/90 font-medium">
          WASD Walk · Shift Run · Space Mars-Jump · E Interact · Drag Mouse to Look · Esc Pause
        </p>
      </div>
    </div>
  );
};
