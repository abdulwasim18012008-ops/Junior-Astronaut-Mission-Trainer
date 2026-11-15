import React, { useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Compass,
  MapPin,
  Navigation,
  Sparkles,
  Star,
} from 'lucide-react';

export interface QuestStepItem {
  id: string;
  label: string;
  done: boolean;
  active: boolean;
}

export interface OptionalTaskTrackerItem {
  id: string;
  title: string;
  categoryLabel: string;
  rewardPoints: number;
  distanceM: number;
  x: number;
  z: number;
}

interface QuestTrackerPanelProps {
  missionTitle: string;
  objectiveText: string;
  destinationName?: string | null;
  distanceM?: number | null;
  actionHint?: string | null;
  steps?: QuestStepItem[];
  offTrackAlert?: boolean;
  onOpenMap?: () => void;
  transitionKey: string;
  totalPoints?: number;
  starsEarned?: number;
  discoveredCount?: number;
  optionalTasks?: OptionalTaskTrackerItem[];
  onRouteOptionalTask?: (task: OptionalTaskTrackerItem) => void;
}

export const QuestTrackerPanel: React.FC<QuestTrackerPanelProps> = ({
  missionTitle,
  objectiveText,
  destinationName,
  distanceM,
  actionHint,
  steps = [],
  offTrackAlert = false,
  onOpenMap,
  transitionKey,
  totalPoints,
  starsEarned,
  discoveredCount,
  optionalTasks = [],
  onRouteOptionalTask,
}) => {
  const [optionalExpanded, setOptionalExpanded] = useState(false);

  return (
    <div className="pointer-events-auto w-full sm:w-[318px] bg-[#0b1222]/94 border border-amber-400/35 rounded-2xl px-3.5 py-2.5 shadow-xl space-y-2">
      {/* Compact Reward Bar */}
      {typeof totalPoints === 'number' && (
        <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10 text-[10px] font-extrabold">
          <span className="inline-flex items-center gap-1 text-sky-300">
            <Award className="w-3 h-3 text-sky-400" />
            <span className="font-mono-num">{totalPoints}</span> pts
          </span>
          {typeof starsEarned === 'number' && (
            <span className="inline-flex items-center gap-1 text-amber-300">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="font-mono-num">{starsEarned}</span> Stars
            </span>
          )}
          {typeof discoveredCount === 'number' && (
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <Compass className="w-3 h-3 text-emerald-400" />
              <span className="font-mono-num">{discoveredCount}</span> Found
            </span>
          )}
        </div>
      )}

      {/* Header: CURRENT MISSION */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
        <div className="min-w-0">
          <div className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-amber-400">
            Main Mission
          </div>
          <div className="font-display text-xs sm:text-sm font-bold text-white truncate">
            {missionTitle}
          </div>
        </div>
        {onOpenMap && (
          <button
            type="button"
            onClick={onOpenMap}
            title="Open 3D Mars Map"
            className="shrink-0 px-2 py-1 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/45 text-amber-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Compass className="w-3 h-3" />
            <span>Map</span>
          </button>
        )}
      </div>

      {/* Active OBJECTIVE with subtle key-driven slide/fade transition */}
      <div key={transitionKey} className="space-y-1.5 transition-all duration-300">
        <div>
          <div className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-sky-300">
            Objective
          </div>
          <div className="text-xs sm:text-[13px] font-bold text-white leading-snug mt-0.5">
            {objectiveText}
          </div>
        </div>

        {/* DESTINATION + DISTANCE */}
        {(destinationName || distanceM !== null) && (
          <div className="grid grid-cols-[1fr_auto] gap-2 items-center bg-slate-900/90 border border-white/10 rounded-xl px-2.5 py-1.5">
            <div className="min-w-0 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                  Destination
                </div>
                <div className="text-[11px] font-bold text-slate-100 truncate">
                  {destinationName ?? 'Target'}
                </div>
              </div>
            </div>
            {typeof distanceM === 'number' && (
              <div className="text-right shrink-0 pl-2 border-l border-white/10">
                <div className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                  Distance
                </div>
                <div className="font-mono-num text-xs font-extrabold text-amber-300">
                  {Math.max(0, Math.round(distanceM))} m
                </div>
              </div>
            )}
          </div>
        )}

        {/* ACTION */}
        {actionHint && (
          <div className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/12 border border-amber-400/30">
            <Navigation className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-amber-300 mr-1.5">
                Action:
              </span>
              <span className="text-[11px] font-semibold text-amber-100 leading-snug">
                {actionHint}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Off-route warning pill */}
      {offTrackAlert && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-950/95 border border-amber-400/65 text-[11px] font-bold text-amber-100">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span>Off track — new golden route updated!</span>
        </div>
      )}

      {/* Compact step checklist */}
      {steps.length > 1 && (
        <div className="pt-1 border-t border-white/10 space-y-1">
          {steps.map((st) => (
            <div
              key={st.id}
              className={`flex items-center gap-1.5 text-[10px] leading-tight ${
                st.done
                  ? 'text-emerald-300/85 line-through'
                  : st.active
                    ? 'text-amber-200 font-bold'
                    : 'text-slate-400'
              }`}
            >
              {st.done ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              ) : (
                <Circle
                  className={`w-3 h-3 shrink-0 ${
                    st.active ? 'text-amber-400 fill-amber-400/30' : 'text-slate-600'
                  }`}
                />
              )}
              <span className="truncate">{st.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Separate Optional Exploration & Crew-Help Tasks */}
      {optionalTasks.length > 0 && (
        <div className="pt-1.5 border-t border-white/10">
          <button
            type="button"
            onClick={() => setOptionalExpanded((v) => !v)}
            className="w-full flex items-center justify-between gap-2 text-[10px] font-extrabold text-cyan-300 hover:text-cyan-200 cursor-pointer py-0.5"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Optional Exploration ({optionalTasks.length})
            </span>
            {optionalExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {optionalExpanded && (
            <div className="mt-1.5 space-y-1 max-h-36 overflow-y-auto astro-scroll pr-0.5">
              {optionalTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl bg-cyan-950/35 border border-cyan-400/25 text-[10px]"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-cyan-100 truncate">{task.title}</div>
                    <div className="text-[9px] text-cyan-300/80 font-mono-num">
                      +{task.rewardPoints} pts · {task.distanceM}m
                    </div>
                  </div>
                  {onRouteOptionalTask && (
                    <button
                      type="button"
                      onClick={() => onRouteOptionalTask(task)}
                      className="shrink-0 px-2 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-[9px] cursor-pointer"
                    >
                      GPS
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

