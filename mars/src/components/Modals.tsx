import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  Lock,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  Satellite,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react';
import { CAMPAIGN_MISSIONS } from '../game/adventureStory';
import { getStructureDisplayName } from '../game/crewAI';
import {
  BADGE_CATALOG,
  CAMPAIGN_CHAPTERS,
  LEARNING_RECAPS,
  OPTIONAL_TASKS,
} from '../game/learningRecaps';
import { loadNasaScienceDatasets, NasaScienceDataset } from '../game/nasaData';
import { LOST_ROVERS } from '../game/roversData';
import {
  CrewNpcId,
  EnvironmentTelemetry,
  FieldJournalEntry,
  GameSettings,
  LostRoverId,
  MissionCheckpoint,
} from '../game/types';
import { AstronautPortrait } from './AstronautIcons';

export { Mars3DMapModal as BaseMapModal } from './Mars3DMapModal';

interface ModalShellProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClass?: string;
}

const ModalShell: React.FC<ModalShellProps> = ({
  title,
  onClose,
  children,
  maxWidthClass = 'max-w-2xl',
}) => (
  <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75">
    <div
      className={`w-full ${maxWidthClass} max-h-[88vh] flex flex-col bg-[#0e1526] border-2 border-white/15 rounded-3xl shadow-2xl overflow-hidden`}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <h2 className="font-display text-xl font-bold text-white">{title}</h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6 overflow-y-auto astro-scroll">{children}</div>
    </div>
  </div>
);

export const CrewAssistantModal: React.FC<{
  objectiveText: string;
  hintText: string;
  telemetry: EnvironmentTelemetry | null;
  resolvedRovers: LostRoverId[];
  unlockedCrewIds?: CrewNpcId[];
  onClose: () => void;
}> = ({ objectiveText, hintText, telemetry, resolvedRovers, unlockedCrewIds, onClose }) => {
  const visibleCrew: Array<'leo' | 'maya' | 'zara' | 'ryan' | 'nova'> = [
    ...(['leo', 'maya', 'zara', 'ryan'] as const).filter(
      (id) => !unlockedCrewIds || unlockedCrewIds.includes(id),
    ),
    'nova',
  ];
  const [selectedCrew, setSelectedCrew] = useState<'leo' | 'maya' | 'zara' | 'ryan' | 'nova'>(
    visibleCrew[0] ?? 'nova',
  );

  const activeSelection = visibleCrew.includes(selectedCrew) ? selectedCrew : visibleCrew[0];
  const npcStatus =
    activeSelection !== 'nova'
      ? telemetry?.npcStatuses.find((n) => n.id === activeSelection) ?? null
      : null;

  const advice = {
    leo: {
      name: 'Leo',
      role: 'Colony Engineer',
      text: npcStatus
        ? `Right now I am at ${getStructureDisplayName(npcStatus.buildingId)} (${npcStatus.taskLabel}). Watch your Spare Parts and call the Supply Terminal whenever we run low!`
        : 'I keep our Oxygen Scrubbers, Water Pumps, Power Lines, and Cargo Warehouse running smoothly!',
    },
    maya: {
      name: 'Maya',
      role: 'Scientist',
      text: `Current Mission Step: "${objectiveText}". Tip: ${hintText}`,
    },
    zara: {
      name: 'Zara',
      role: 'Botanist',
      text: telemetry
        ? `Outside Mars temp is ${telemetry.outsideTempC}°C (GAME SIMULATION), while our heated domes stay around +${telemetry.insideTempC}°C! Check the Greenhouse anytime for fresh crops.`
        : 'Greenhouses recycle air and grow fresh Martian tomatoes under pink-and-blue grow lights!',
    },
    ryan: {
      name: 'Ryan',
      role: 'Comms Officer',
      text: telemetry?.nearestLostRover
        ? `Our Signal Detector picks up ${telemetry.nearestLostRover.id.toUpperCase()} ${telemetry.nearestLostRover.distance}m away at bearing ${telemetry.nearestLostRover.bearingDeg}°! Drive the 6-wheel Exploration Vehicle to track lost rovers (${resolvedRovers.length}/5 recovered).`
        : 'Use the Signal Detector or drive the 6-wheel Pressurized Exploration Vehicle to explore distant craters!',
    },
    nova: {
      name: 'Commander Nova',
      role: 'Mission Mentor',
      text: 'Remember: Mars gravity is 3.71 m/s², so jumps soar smoothly! Leo, Maya, Zara, and Ryan join as you complete missions—walk up and press T anytime to talk with them!',
    },
  }[activeSelection];

  const visibleAssignments =
    telemetry?.npcStatuses.filter((n) => !unlockedCrewIds || unlockedCrewIds.includes(n.id)) ?? [];

  return (
    <ModalShell title="Living Mars Colony Crew Roster" onClose={onClose} maxWidthClass="max-w-xl">
      <div className="space-y-4">
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {visibleCrew.map((id) => {
            const liveNpc = id !== 'nova' ? telemetry?.npcStatuses.find((n) => n.id === id) : null;
            return (
              <button
                key={id}
                onClick={() => setSelectedCrew(id)}
                className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                  activeSelection === id
                    ? 'bg-orange-500/20 border-orange-400 text-white'
                    : 'bg-slate-900 border-white/10 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <AstronautPortrait id={id} className="w-10 h-10 rounded-xl" />
                <span className="text-xs font-bold capitalize">{id === 'nova' ? 'Nova' : id}</span>
                <span className="text-[9px] text-sky-300 truncate max-w-full">
                  {liveNpc ? getStructureDisplayName(liveNpc.buildingId).split(' ')[0] : 'Mentor'}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-sky-400/30 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-300">
              <Users className="w-4 h-4" /> {advice.name} · {advice.role}
            </div>
            {npcStatus && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                {npcStatus.taskLabel}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-100 leading-relaxed">{advice.text}</p>
        </div>

        {visibleAssignments.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Live Autonomous Colony Assignments
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {visibleAssignments.map((npc) => (
                <div
                  key={npc.id}
                  className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10 flex items-center gap-2.5 text-xs"
                >
                  <AstronautPortrait id={npc.id} className="w-8 h-8 rounded-lg shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-white">
                      {npc.name} <span className="text-slate-400 font-normal">· {npc.role}</span>
                    </div>
                    <div className="text-[11px] text-sky-300 truncate">
                      {npc.taskLabel} ({getStructureDisplayName(npc.buildingId)})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
};

export const HandbookModal: React.FC<{
  completedMissions: number[];
  missionStars?: Record<number, number>;
  starsEarned: number;
  totalPoints?: number;
  earnedBadgeIds?: string[];
  completedOptionalIds?: string[];
  journalEntries: FieldJournalEntry[];
  resolvedRovers: LostRoverId[];
  discoveredLandmarks: string[];
  discoveredAnomalies: string[];
  onClose: () => void;
}> = ({
  completedMissions,
  missionStars = {},
  starsEarned,
  totalPoints = 0,
  earnedBadgeIds = [],
  completedOptionalIds = [],
  journalEntries,
  resolvedRovers,
  discoveredLandmarks,
  discoveredAnomalies,
  onClose,
}) => {
  const [tab, setTab] = useState<'badges' | 'recaps' | 'optional' | 'rovers' | 'journal'>('badges');
  const totalDiscovered = discoveredLandmarks.length + discoveredAnomalies.length + resolvedRovers.length;

  return (
    <ModalShell title="Astronaut Rewards, Learning Recaps &amp; Field Journal" onClose={onClose} maxWidthClass="max-w-3xl">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3.5 rounded-2xl bg-slate-900 border border-white/10 mb-4 text-center">
        <div className="p-2 rounded-xl bg-slate-950/70">
          <div className="text-[10px] font-bold uppercase text-sky-300">Total Points</div>
          <div className="font-display text-lg font-extrabold text-white font-mono-num">{totalPoints}</div>
        </div>
        <div className="p-2 rounded-xl bg-slate-950/70">
          <div className="text-[10px] font-bold uppercase text-amber-300">Stars</div>
          <div className="font-display text-lg font-extrabold text-amber-300 font-mono-num flex items-center justify-center gap-1">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            {starsEarned}/{CAMPAIGN_MISSIONS.length * 3}
          </div>
        </div>
        <div className="p-2 rounded-xl bg-slate-950/70">
          <div className="text-[10px] font-bold uppercase text-orange-300">Missions</div>
          <div className="font-display text-lg font-extrabold text-white font-mono-num">
            {completedMissions.length}/{CAMPAIGN_MISSIONS.length}
          </div>
        </div>
        <div className="p-2 rounded-xl bg-slate-950/70">
          <div className="text-[10px] font-bold uppercase text-cyan-300">Optional Tasks</div>
          <div className="font-display text-lg font-extrabold text-white font-mono-num">
            {completedOptionalIds.length}/{OPTIONAL_TASKS.length}
          </div>
        </div>
        <div className="p-2 rounded-xl bg-slate-950/70 col-span-2 sm:col-span-1">
          <div className="text-[10px] font-bold uppercase text-emerald-300">Discoveries</div>
          <div className="font-display text-lg font-extrabold text-white font-mono-num">
            {totalDiscovered}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {(
          [
            { id: 'badges', label: `Badges (${earnedBadgeIds.length}/${BADGE_CATALOG.length})`, icon: Award },
            { id: 'recaps', label: `Learning Recaps (${completedMissions.length}/20)`, icon: Sparkles },
            { id: 'optional', label: `Optional (${completedOptionalIds.length}/${OPTIONAL_TASKS.length})`, icon: Compass },
            { id: 'rovers', label: `Rovers (${resolvedRovers.length}/5)`, icon: Radio },
            { id: 'journal', label: `Journal (${journalEntries.length})`, icon: BookOpen },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                tab === t.id
                  ? 'bg-orange-500 text-slate-950'
                  : 'bg-slate-900 text-slate-300 border border-white/10 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'badges' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BADGE_CATALOG.map((b) => {
            const unlocked = earnedBadgeIds.includes(b.id);
            return (
              <div
                key={b.id}
                className={`p-4 rounded-2xl border flex items-start gap-3 ${
                  unlocked ? 'bg-slate-900 border-amber-400/40' : 'bg-slate-900/50 border-white/8 opacity-65'
                }`}
              >
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0"
                  style={{ backgroundColor: unlocked ? `${b.color}28` : '#1e293b' }}
                >
                  {unlocked ? b.icon : <Lock className="w-4 h-4 text-slate-500" />}
                </div>
                <div className="min-w-0">
                  <div className="font-display text-sm font-bold text-white">
                    {b.title}
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">{b.description}</div>
                  <div className={`text-[10px] font-bold mt-1 ${unlocked ? 'text-emerald-300' : 'text-slate-500'}`}>
                    {unlocked ? 'Earned!' : 'Keep exploring to unlock'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'recaps' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CAMPAIGN_MISSIONS.map((m) => {
            const unlocked = completedMissions.includes(m.id);
            const recap = LEARNING_RECAPS[m.id];
            const mStars = missionStars[m.id] ?? (unlocked ? 3 : 0);
            return (
              <div
                key={m.id}
                className={`p-4 rounded-2xl border ${
                  unlocked ? 'bg-slate-900 border-amber-400/35' : 'bg-slate-900/50 border-white/8 opacity-65'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <div className="text-[11px] font-bold text-orange-300">{m.label}</div>
                    <div className="font-display text-sm font-bold text-white">
                      {unlocked ? m.title : 'Locked Mission Recap'}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {[1, 2, 3].map((idx) => (
                      <Star
                        key={idx}
                        className={`w-3.5 h-3.5 ${
                          idx <= mStars ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {unlocked && recap ? (
                  <div className="space-y-1.5 text-xs">
                    <div className="font-bold text-emerald-300">{recap.headline}</div>
                    <div className="text-slate-200">{recap.whatYouLearned}</div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400">
                    Complete “{m.title}” to unlock this learning card!
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'optional' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OPTIONAL_TASKS.map((t) => {
            const done = completedOptionalIds.includes(t.id);
            return (
              <div
                key={t.id}
                className={`p-4 rounded-2xl border space-y-1.5 ${
                  done ? 'bg-cyan-950/35 border-cyan-400/40' : 'bg-slate-900 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase text-cyan-300">{t.categoryLabel}</span>
                  <span className="text-[10px] font-bold font-mono-num text-amber-300">
                    +{t.rewardPoints} pts
                  </span>
                </div>
                <div className="font-display text-sm font-bold text-white flex items-center gap-1.5">
                  {done && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  <span>{t.title}</span>
                </div>
                <p className="text-xs text-slate-300">{done ? t.learnedFact : t.description}</p>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'rovers' && (
        <div className="space-y-3">
          {LOST_ROVERS.map((lr) => {
            const done = resolvedRovers.includes(lr.id);
            return (
              <div
                key={lr.id}
                className={`p-4 rounded-2xl border space-y-2 ${
                  done ? 'bg-emerald-950/35 border-emerald-400/40' : 'bg-slate-900 border-white/12'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-bold text-sky-300">{lr.era}</div>
                    <div className="font-display text-base font-bold text-white">{lr.name}</div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                      done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-200'
                    }`}
                  >
                    {done ? 'Archive Synced' : `Signal ${lr.signalFreqMHz}`}
                  </span>
                </div>
                <p className="text-xs text-slate-200">{lr.realHistoricalFact}</p>
                <p className="text-xs text-amber-200">{lr.simulatedMissionTask}</p>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'journal' && (
        <div className="space-y-2.5">
          {journalEntries.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-900 border border-white/10 text-center text-sm text-slate-300">
              Use your Scanner, Sample Collector, or Camera out on Mars to record discoveries here!
            </div>
          ) : (
            journalEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="text-[10px] font-bold uppercase text-sky-400">
                    {entry.category} · Sol {entry.solNumber}
                  </div>
                  <div className="font-display text-sm font-bold text-white">{entry.title}</div>
                  <div className="text-xs text-slate-300 mt-0.5">{entry.summary}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </ModalShell>
  );
};

export const MissionSelectModal: React.FC<{
  completedMissions: number[];
  missionStars?: Record<number, number>;
  missionCheckpoints?: Record<number, MissionCheckpoint>;
  onSelectMission: (missionId: number) => void;
  onClose: () => void;
}> = ({ completedMissions, missionStars = {}, missionCheckpoints, onSelectMission, onClose }) => (
  <ModalShell title="Choose Chapter &amp; Mission (20-Mission Campaign)" onClose={onClose} maxWidthClass="max-w-4xl">
    <p className="text-sm text-slate-300 mb-4">
      Begin at the Remote Comms Relay (Mission 1), or jump back into any unlocked Mars adventure across 4 chapters!
    </p>
    <div className="space-y-5">
      {CAMPAIGN_CHAPTERS.map((ch) => {
        const chapterMissions = CAMPAIGN_MISSIONS.filter((m) => ch.missionIds.includes(m.id));
        return (
          <div key={ch.id} className="space-y-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-1.5">
              <h3 className="font-display text-base font-extrabold" style={{ color: ch.accentHex }}>
                {ch.title}
              </h3>
              <span className="text-xs text-slate-400">{ch.subtitle}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {chapterMissions.map((m) => {
                const done = completedMissions.includes(m.id);
                const unlocked =
                  m.id === 1 || completedMissions.includes(m.id - 1) || completedMissions.includes(m.id);
                const cp = missionCheckpoints?.[m.id];
                const inProgress =
                  unlocked && !done && cp && (cp.status === 'IN_PROGRESS' || cp.status === 'OBJECTIVE_COMPLETED');
                const mStars = missionStars[m.id] ?? (done ? 3 : 0);
                return (
                  <button
                    key={m.id}
                    disabled={!unlocked}
                    onClick={() => {
                      if (unlocked) onSelectMission(m.id);
                    }}
                    className={`text-left p-3.5 rounded-2xl border transition-colors flex flex-col justify-between gap-2 ${
                      unlocked
                        ? 'bg-slate-900 hover:bg-slate-800 border-white/12 hover:border-orange-400/60 cursor-pointer'
                        : 'bg-slate-900/45 border-white/8 opacity-55 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className={`font-semibold ${unlocked ? 'text-orange-400' : 'text-slate-400'}`}>
                          {m.label}
                        </span>
                        {done ? (
                          <span className="flex items-center gap-0.5">
                            {[1, 2, 3].map((idx) => (
                              <Star
                                key={idx}
                                className={`w-3 h-3 ${
                                  idx <= mStars ? 'fill-amber-400 text-amber-400' : 'text-slate-700'
                                }`}
                              />
                            ))}
                          </span>
                        ) : inProgress ? (
                          <span className="text-sky-300 font-semibold">
                            Step {Math.min(cp.stepIndex + 1, m.steps.length)}/{m.steps.length}
                          </span>
                        ) : !unlocked ? (
                          <span className="text-slate-400 font-semibold flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        ) : null}
                      </div>
                      <div className="font-display text-sm font-bold text-white">{m.title}</div>
                    </div>
                    <div
                      className={`text-xs font-semibold flex items-center gap-1 pt-1.5 border-t border-white/8 ${
                        unlocked ? 'text-sky-300' : 'text-slate-500'
                      }`}
                    >
                      {unlocked ? (
                        <>
                          <Play className="w-3 h-3" /> {inProgress ? `Resume` : m.id === 1 ? 'Play Opening Story' : `Play ${m.label}`}
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3" /> Finish Mission {m.id - 1}
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  </ModalShell>
);

export const SettingsModal: React.FC<{
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onClose: () => void;
}> = ({ settings, onChange, onClose }) => (
  <ModalShell title="Settings" onClose={onClose} maxWidthClass="max-w-md">
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-white">Space Music &amp; Wind</div>
          <div className="text-xs text-slate-400">Gentle Mars adventure soundtrack</div>
        </div>
        <button
          onClick={() => onChange({ ...settings, musicEnabled: !settings.musicEnabled })}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
            settings.musicEnabled ? 'bg-orange-500 text-slate-950' : 'bg-slate-800 text-slate-300'
          }`}
        >
          {settings.musicEnabled ? 'On' : 'Off'}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-white">Sound Effects</div>
          <div className="text-xs text-slate-400">Footsteps, doors, thrusters, and scanner</div>
        </div>
        <button
          onClick={() => onChange({ ...settings, sfxEnabled: !settings.sfxEnabled })}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
            settings.sfxEnabled ? 'bg-orange-500 text-slate-950' : 'bg-slate-800 text-slate-300'
          }`}
        >
          {settings.sfxEnabled ? 'On' : 'Off'}
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-semibold text-white">Volume</span>
          <span className="font-mono-num text-slate-300">{Math.round(settings.volume * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.volume}
          onChange={(e) => onChange({ ...settings, volume: parseFloat(e.target.value) })}
          className="w-full accent-orange-500 cursor-pointer"
        />
      </div>

      <div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-semibold text-white">Camera Speed</span>
          <span className="font-mono-num text-slate-300">{settings.cameraSpeed.toFixed(1)}×</span>
        </div>
        <input
          type="range"
          min={0.5}
          max={1.5}
          step={0.1}
          value={settings.cameraSpeed}
          onChange={(e) => onChange({ ...settings, cameraSpeed: parseFloat(e.target.value) })}
          className="w-full accent-sky-500 cursor-pointer"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-white">Always Show Minimap</div>
          <div className="text-xs text-slate-400">Keep corner navigation radar visible on Mars</div>
        </div>
        <button
          onClick={() => onChange({ ...settings, showMinimap: !settings.showMinimap })}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
            settings.showMinimap ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-300'
          }`}
        >
          {settings.showMinimap ? 'On' : 'Off'}
        </button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-white">Martian Sol Day/Night Cycle</div>
          <div className="text-xs text-slate-400">24h 37m simulated sun &amp; moons speed</div>
        </div>
        <div className="flex gap-1">
          {[
            { label: 'Pause', v: 0 },
            { label: '1×', v: 1 },
            { label: '3×', v: 3 },
          ].map((opt) => (
            <button
              key={opt.label}
              onClick={() => onChange({ ...settings, solTimeScale: opt.v })}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                settings.solTimeScale === opt.v
                  ? 'bg-sky-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  </ModalShell>
);

export const CreditsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <ModalShell title="Space Facts &amp; Credits" onClose={onClose}>
    <div className="space-y-4 text-sm text-slate-200 leading-relaxed">
      <p>
        <strong>Junior Astronaut Mission Trainer</strong> is a story-driven 3D Mars adventure
        created for children aged 6–10 to explore Martian gravity (3.71 m/s²), blue sunsets, Phobos and
        Deimos, weather, NASA rover history, and survival teamwork.
      </p>
      <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 text-xs text-slate-300 space-y-1.5">
        <div className="font-semibold text-amber-300 text-sm">Real Space Inspiration</div>
        <p>
          Inspired by NASA’s Perseverance MOXIE oxygen experiment, Sojourner, Spirit, Opportunity,
          and Curiosity rovers, ISS water recycling, NASA Veggie space gardens, and CCMC DONKI
          solar weather observations.
        </p>
      </div>
    </div>
  </ModalShell>
);

export const PauseModal: React.FC<{
  onResume: () => void;
  onOpenControlsHelp?: () => void;
  onOpenSettings: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}> = ({ onResume, onOpenControlsHelp, onOpenSettings, onRestart, onMainMenu }) => (
  <ModalShell title="Game Paused" onClose={onResume} maxWidthClass="max-w-sm">
    <div className="flex flex-col gap-2.5">
      <button
        onClick={onResume}
        className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-sm cursor-pointer min-h-[44px]"
      >
        Keep Playing
      </button>
      {onOpenControlsHelp && (
        <button
          onClick={onOpenControlsHelp}
          className="w-full py-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 font-bold text-sm cursor-pointer min-h-[44px]"
        >
          Driving &amp; Exploration Controls
        </button>
      )}
      <button
        onClick={onOpenSettings}
        className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm cursor-pointer min-h-[44px]"
      >
        Settings
      </button>
      <button
        onClick={onRestart}
        className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm cursor-pointer min-h-[44px]"
      >
        Start Over
      </button>
      <button
        onClick={onMainMenu}
        className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold text-sm border border-white/10 cursor-pointer min-h-[44px]"
      >
        Back to Main Menu (Save Progress)
      </button>
    </div>
  </ModalShell>
);

export const ControlsHelpModal: React.FC<{
  drivingRover: boolean;
  onClose: () => void;
}> = ({ drivingRover, onClose }) => (
  <ModalShell title="Astronaut & Vehicle Controls" onClose={onClose} maxWidthClass="max-w-xl">
    <div className="space-y-4">
      <div
        className={`p-4 rounded-2xl border ${
          drivingRover
            ? 'bg-orange-500/12 border-orange-400/45'
            : 'bg-slate-900 border-white/12'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-base font-bold text-amber-300">
            6x6 Exploration Vehicle (EV)
          </h3>
          {drivingRover && (
            <span className="px-2 py-0.5 rounded-md bg-orange-500 text-slate-950 text-[10px] font-extrabold">
              Driving Now
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/75 border border-white/10 flex items-center gap-2.5">
            <span className="px-2 py-1 rounded-lg bg-emerald-500 text-slate-950 font-mono-num font-extrabold shrink-0">
              W / ↑
            </span>
            <div>
              <div className="font-bold text-white">Accelerate</div>
              <div className="text-[11px] text-slate-300">Or hold the Drive! button</div>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/75 border border-white/10 flex items-center gap-2.5">
            <span className="px-2 py-1 rounded-lg bg-red-500/90 text-white font-mono-num font-extrabold shrink-0">
              S / ↓
            </span>
            <div>
              <div className="font-bold text-white">Brake or Reverse</div>
              <div className="text-[11px] text-slate-300">Or hold Brake to slow &amp; back up</div>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/75 border border-white/10 flex items-center gap-2.5">
            <span className="px-2 py-1 rounded-lg bg-orange-400 text-slate-950 font-mono-num font-extrabold shrink-0">
              A D / ← →
            </span>
            <div>
              <div className="font-bold text-white">Steer Left &amp; Right</div>
              <div className="text-[11px] text-slate-300">Works gently while moving</div>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/75 border border-white/10 flex items-center gap-2.5">
            <span className="px-2 py-1 rounded-lg bg-amber-400 text-slate-950 font-mono-num font-extrabold shrink-0">
              E / R
            </span>
            <div>
              <div className="font-bold text-white">Enter or Exit EV</div>
              <div className="text-[11px] text-slate-300">Or tap the EV / Exit button</div>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/75 border border-white/10 flex items-center gap-2.5">
            <span className="px-2 py-1 rounded-lg bg-sky-500 text-slate-950 font-mono-num font-extrabold shrink-0">
              V / F
            </span>
            <div>
              <div className="font-bold text-white">Cockpit Cam &amp; Lights</div>
              <div className="text-[11px] text-slate-300">Switch view or headlights</div>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/75 border border-white/10 flex items-center gap-2.5">
            <span className="px-2 py-1 rounded-lg bg-sky-400 text-slate-950 font-mono-num font-extrabold shrink-0">
              M / Map
            </span>
            <div>
              <div className="font-bold text-white">View Destination Route</div>
              <div className="text-[11px] text-slate-300">Follow the golden path</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900 border border-white/12">
        <h3 className="font-display text-base font-bold text-sky-300 mb-2.5">
          On-Foot Exploration
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-200">
          <div className="p-2 rounded-xl bg-slate-950/60 border border-white/10">
            <strong className="text-white">Move:</strong> WASD / Arrow Keys / Touch Joystick
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-white/10">
            <strong className="text-white">Interact / Repair:</strong> Press E or Tap Highlight
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-white/10">
            <strong className="text-white">Mars Jump:</strong> Spacebar (high low-gravity leap!)
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-white/10">
            <strong className="text-white">Crew &amp; Tools:</strong> T Talk Crew · Q Use Tool
          </div>
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-extrabold text-sm cursor-pointer min-h-[44px]"
      >
        Got It! Back to Mars
      </button>
    </div>
  </ModalShell>
);

export const AdventureFinaleScreen: React.FC<{
  starsEarned: number;
  totalPoints?: number;
  earnedBadgeIds?: string[];
  completedOptionalIds?: string[];
  onPlayAgain: () => void;
  onMainMenu: () => void;
}> = ({
  starsEarned,
  totalPoints = 0,
  earnedBadgeIds = [],
  completedOptionalIds = [],
  onPlayAgain,
  onMainMenu,
}) => (
  <div className="fixed inset-0 z-30 flex items-center justify-center p-4 sm:p-6 bg-[#080d18]/85">
    <div className="w-full max-w-4xl max-h-[92vh] bg-[#0e1526] border-2 border-amber-400/30 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
      <div className="px-6 py-5 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-amber-300">All 4 Chapters Complete!</div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">
            Certified Junior Mars Explorers!
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-amber-300 font-display text-xl font-bold">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-400/15 border border-amber-400/35">
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
            <span className="font-mono-num">{starsEarned}</span> Stars
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-400/15 border border-sky-400/35 text-sky-200">
            <Award className="w-5 h-5 text-sky-300" />
            <span className="font-mono-num">{totalPoints}</span> pts
          </span>
        </div>
      </div>

      <div className="p-6 overflow-y-auto astro-scroll space-y-6">
        <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center -space-x-2 shrink-0">
            <AstronautPortrait id="nova" className="w-12 h-12 ring-2 ring-[#0e1526]" />
            <AstronautPortrait id="alex" className="w-12 h-12 ring-2 ring-[#0e1526]" />
            <AstronautPortrait id="leo" className="w-12 h-12 ring-2 ring-[#0e1526]" />
            <AstronautPortrait id="maya" className="w-12 h-12 ring-2 ring-[#0e1526]" />
            <AstronautPortrait id="ryan" className="w-12 h-12 ring-2 ring-[#0e1526]" />
            <AstronautPortrait id="zara" className="w-12 h-12 ring-2 ring-[#0e1526]" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-300 mb-1">Commander Nova &amp; Ares Crew</div>
            <p className="text-sm sm:text-base text-white leading-relaxed">
              From your very first remote relay repair to rescuing lost rovers, climbing the northwest
              mountain ridge, braving Mars dust storms, and lighting the Landing Beacon—you completed
              all 20 missions and {completedOptionalIds.length} bonus exploration tasks!
            </p>
          </div>
        </div>

        {earnedBadgeIds.length > 0 && (
          <div>
            <h3 className="font-display text-base font-bold text-white mb-2">
              Milestone Badges Unlocked ({earnedBadgeIds.length}/{BADGE_CATALOG.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {BADGE_CATALOG.filter((b) => earnedBadgeIds.includes(b.id)).map((b) => (
                <div
                  key={b.id}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-amber-400/35 flex items-center gap-2 text-xs font-bold text-white"
                >
                  <span>{b.icon}</span>
                  <span>{b.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="font-display text-lg font-bold text-white mb-3">
            Your 20 Mars Discoveries &amp; Badges
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CAMPAIGN_MISSIONS.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 flex items-start gap-3"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: `${m.badgeColor}28` }}
                >
                  <Award className="w-5 h-5" style={{ color: m.badgeColor }} />
                </div>
                <div className="text-xs space-y-1">
                  <div className="font-bold text-white text-sm">
                    {m.label}: {m.badgeTitle}
                  </div>
                  <div className="text-slate-300">{m.simpleLesson}</div>
                  <div className="text-sky-300 font-semibold">Space Word: {m.scienceTerm}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 bg-[#0b101d]">
        <div className="text-xs text-slate-400">
          Thank you for exploring Mars with Alex, Leo, Maya, Ryan, Zara, and Commander Nova!
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onMainMenu}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold cursor-pointer"
          >
            Main Menu
          </button>
          <button
            onClick={onPlayAgain}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 text-sm font-bold cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Play Again
          </button>
        </div>
      </div>
    </div>
  </div>
);

export const NasaDataModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [datasets, setDatasets] = useState<NasaScienceDataset[] | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const list = await loadNasaScienceDatasets();
    setDatasets(list);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <ModalShell title="NASA Mars Science Data" onClose={onClose} maxWidthClass="max-w-3xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl bg-slate-900 border border-sky-400/25">
          <div className="flex items-center gap-2.5 text-xs text-sky-100">
            <Satellite className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              Real space science sources! Every card lists its exact source, date/timestamp, data
              type, and whether it is Live, Archived, or Sample Data.
            </span>
          </div>
          <button
            onClick={() => void refresh()}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading && !datasets ? (
          <div className="py-8 text-center text-sm text-slate-300">
            Checking NASA public science feeds…
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {datasets?.map((ds) => {
              const badgeStyle =
                ds.status === 'Live Public API'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                  : ds.status === 'Archived Measurement'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-400/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-400/40';
              return (
                <div
                  key={ds.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-white/12 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-base font-bold text-white">{ds.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-md border text-[10px] font-bold shrink-0 ${badgeStyle}`}
                      >
                        {ds.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 space-y-0.5">
                      <div>
                        <strong className="text-slate-300">Source:</strong> {ds.source}
                      </div>
                      <div>
                        <strong className="text-slate-300">Data Type:</strong> {ds.dataType}
                      </div>
                      <div>
                        <strong className="text-slate-300">Timestamp:</strong> {ds.timestamp}
                      </div>
                    </div>

                    <div className="text-xs font-bold text-orange-300 pt-1">{ds.headline}</div>
                    <p className="text-xs text-slate-200 leading-relaxed">{ds.kidSummary}</p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <div className="grid grid-cols-3 gap-1.5">
                      {ds.metrics.map((m) => (
                        <div key={m.label} className="p-1.5 rounded-lg bg-slate-950/90 text-center">
                          <div className="text-[9px] text-slate-400 leading-tight">{m.label}</div>
                          <div className="text-[11px] font-bold text-white mt-0.5">{m.value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="text-[10px] text-slate-400 italic">{ds.safetyNote}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ModalShell>
  );
};

export const MissionFailedModal: React.FC<{
  reasonTitle: string;
  reasonDetail: string;
  onRetry: () => void;
  onMainMenu: () => void;
}> = ({ reasonTitle, reasonDetail, onRetry, onMainMenu }) => (
  <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80">
    <div className="w-full max-w-md bg-[#0e1526] border-2 border-amber-400/50 rounded-3xl p-6 shadow-2xl space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-7 h-7 text-amber-400" />
        </div>
        <div>
          <div className="text-xs font-bold text-amber-300">Training Reset Needed</div>
          <h2 className="font-display text-xl font-bold text-white">{reasonTitle}</h2>
        </div>
      </div>

      <p className="text-sm text-slate-200 leading-relaxed">{reasonDetail}</p>

      <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 text-xs text-sky-200">
        Real astronauts practice emergencies many times! Let us reset the colony tanks and try this
        mission again as a team.
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
        <button
          onClick={onRetry}
          className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-sm cursor-pointer flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" /> Try Mission Again
        </button>
        <button
          onClick={onMainMenu}
          className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm cursor-pointer"
        >
          Main Menu
        </button>
      </div>
    </div>
  </div>
);
