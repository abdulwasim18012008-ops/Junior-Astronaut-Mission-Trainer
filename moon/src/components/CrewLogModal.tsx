import React, { useState } from 'react';
import { SaveProgress } from '../types/game';
import { ALL_BADGES, CAMPAIGN_MISSIONS, OPTIONAL_ACTIVITIES, WORLD_LOCATIONS } from '../game/missions';
import { CREW_ROSTER } from '../game/characters';
import { Award, CheckCircle2, Compass, HelpCircle, MapPin, Star, Users, X } from 'lucide-react';
import { LunarPioneerEmblem } from './LunarPioneerBadge';
import { ControlsHelpPanel } from './ControlGuide';

interface CrewLogModalProps {
  progress: SaveProgress;
  initialTab?: 'crew' | 'badges' | 'optional' | 'discoveries' | 'pause';
  onClose: () => void;
  onResetBase: () => void;
  onRestartCampaign: () => void;
  onUpdateSettings: (patch: Partial<SaveProgress>) => void;
  onReplayTutorial: () => void;
}

export const CrewLogModal: React.FC<CrewLogModalProps> = ({
  progress,
  initialTab = 'crew',
  onClose,
  onResetBase,
  onRestartCampaign,
  onUpdateSettings,
  onReplayTutorial,
}) => {
  const [tab, setTab] = useState<'crew' | 'badges' | 'optional' | 'discoveries' | 'pause'>(initialTab);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const totalStars = Object.values(progress.starsByMission).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4">
      <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border-2 border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌙</span>
            <div>
              <h2 className="text-xl font-black text-white">Lunar Explorer Logbook</h2>
              <div className="text-xs font-semibold text-slate-400 tabular-nums">
                {progress.points} Points · {totalStars} / 60 Stars · {progress.completedMissions.length} / 20 Missions
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-sm font-bold hover:bg-slate-700"
          >
            <X className="h-4 w-4" /> Resume
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 bg-slate-950 px-6 py-3">
          {[
            { id: 'crew', label: 'Teenage Crew', icon: Users },
            { id: 'badges', label: 'Badges & Missions', icon: Award },
            { id: 'discoveries', label: 'Discovery Log', icon: MapPin },
            { id: 'optional', label: 'Side Activities', icon: Compass },
            { id: 'pause', label: 'Controls & Help', icon: HelpCircle },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as typeof tab)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold ${
                  active ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'crew' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-amber-400/50 bg-slate-950 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-amber-400">You (Explorer)</div>
                  <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300">
                    {progress.completedMissions.includes(7) ? 'Base Captain' : 'Junior Explorer'}
                  </span>
                </div>
                <div className="mt-1 text-xs font-semibold text-sky-300">Exploration & Mission Coordination</div>
                <p className="mt-2 text-sm text-slate-300">
                  Leading lunar rover expeditions, geological investigations, and crew teamwork.
                </p>
              </div>
              {CREW_ROSTER.map((c) => (
                <div key={c.id} className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-white">{c.name}</div>
                    <span
                      className="h-4 w-4 rounded-full border border-white/40"
                      style={{ backgroundColor: c.suitColor }}
                    />
                  </div>
                  <div className="mt-1 text-xs font-semibold text-sky-300">{c.role}</div>
                  <p className="mt-2 text-sm text-slate-300">{c.personality}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'badges' && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-extrabold tracking-wider text-amber-400 uppercase">
                  Earned Badges ({progress.badges.length} / {ALL_BADGES.length})
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {ALL_BADGES.map((b) => {
                    const earned = progress.badges.includes(b.id);
                    return (
                      <div
                        key={b.id}
                        className={`rounded-xl border p-3 text-center ${
                          earned ? 'border-amber-400/60 bg-amber-950/30' : 'border-slate-800 bg-slate-950 opacity-50'
                        }`}
                      >
                        {b.id === 'lunar_pioneer' ? (
                          <LunarPioneerEmblem size={56} unlocked={earned} className="mx-auto" />
                        ) : (
                          <div className="text-3xl">{b.icon}</div>
                        )}
                        <div className="mt-1.5 text-xs font-bold text-white">{b.name}</div>
                        <div className="mt-1 text-[11px] text-slate-400">{b.description}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-extrabold tracking-wider text-sky-400 uppercase">
                  Completed Missions ({progress.completedMissions.length} / 20)
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {CAMPAIGN_MISSIONS.map((m) => {
                    const done = progress.completedMissions.includes(m.id);
                    const stars = progress.starsByMission[m.id] ?? 0;
                    return (
                      <div
                        key={m.id}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${
                          done ? 'border-emerald-500/40 bg-emerald-950/30 text-white' : 'border-slate-800 bg-slate-950 text-slate-500'
                        }`}
                      >
                        <span className="font-semibold">{m.title}</span>
                        {done ? (
                          <span className="flex items-center gap-0.5 text-amber-400">
                            {Array.from({ length: stars }).map((_, i) => (
                              <Star key={i} className="h-3.5 w-3.5 fill-current" />
                            ))}
                          </span>
                        ) : (
                          <span>Locked</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'optional' && (
            <div>
              <p className="mb-4 text-sm text-slate-300">
                Explore craters, snap photos of Earth, discover hidden equipment, and help your fellow crew members for bonus points!
                Discovered locations: {progress.discoveredLocations.length} / {WORLD_LOCATIONS.length}.
              </p>
              <div className="space-y-2.5">
                {OPTIONAL_ACTIVITIES.map((opt) => {
                  const done = progress.completedOptionals.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      className={`flex items-center justify-between rounded-xl border p-3.5 ${
                        done ? 'border-emerald-500/40 bg-emerald-950/30' : 'border-slate-800 bg-slate-950'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 font-bold text-white">
                          {done && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                          <span>{opt.title}</span>
                        </div>
                        <div className="mt-0.5 text-xs text-slate-400">{opt.description}</div>
                      </div>
                      <div className="rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 tabular-nums">
                        +{opt.points} pts
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'discoveries' && (
            <div className="space-y-4">
              <div
                className={`rounded-2xl border-2 p-4 ${
                  progress.apolloDiscovered
                    ? 'border-amber-400/70 bg-amber-950/30'
                    : 'border-slate-700 bg-slate-950'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {progress.apolloDiscovered && <LunarPioneerEmblem size={44} unlocked />}
                    <div className="text-base font-black text-amber-300">
                      {progress.apolloDiscovered
                        ? 'Historic Landing Site — Apollo 11 (Tranquility Base)'
                        : 'Historic Landing Site — Unexplored'}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-lg bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300 tabular-nums">
                    {progress.apolloDiscovered ? 'Explored (+500 pts)' : 'Unexplored'}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-slate-300">
                  {progress.apolloDiscovered
                    ? 'Here, humanity first set foot on the Moon — you discovered the preserved first astronaut footprint and the American flag standing in the lunar regolith.'
                    : 'An unexplored historical location far from the main lunar base.'}
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-extrabold tracking-wider text-sky-400 uppercase">
                  Discovered Lunar Locations ({progress.discoveredLocations.length} / {WORLD_LOCATIONS.length})
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {WORLD_LOCATIONS.filter(
                    (l) =>
                      l.id !== 'apollo_11_site' &&
                      (l.alwaysVisible || progress.discoveredLocations.includes(l.id)),
                  ).map((loc) => (
                    <div key={loc.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                      <div className="text-sm font-bold text-white">{loc.name}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{loc.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'pause' && (
            <div className="space-y-5">
              <ControlsHelpPanel
                cameraSensitivity={progress.cameraSensitivity ?? 1.0}
                showGoldenTrail={progress.showGoldenTrail !== false}
                onChangeSensitivity={(val) => onUpdateSettings({ cameraSensitivity: val })}
                onToggleGoldenTrail={(enabled) => onUpdateSettings({ showGoldenTrail: enabled })}
                onReplayTutorial={() => {
                  onReplayTutorial();
                  onClose();
                }}
              />

              <div className="flex flex-wrap gap-3 border-t border-slate-800 pt-4">
                <button
                  onClick={() => {
                    onResetBase();
                    onClose();
                  }}
                  className="rounded-xl border border-sky-400/50 bg-sky-900/50 px-5 py-3 text-sm font-bold text-sky-200 hover:bg-sky-800/60"
                >
                  Return Safely to Base Pad (Unstuck)
                </button>

                {!confirmRestart ? (
                  <button
                    onClick={() => setConfirmRestart(true)}
                    className="rounded-xl border border-red-500/50 bg-red-950/60 px-5 py-3 text-sm font-bold text-red-200 hover:bg-red-900/60"
                  >
                    Restart Moon Campaign from Opening
                  </button>
                ) : (
                  <button
                    onClick={onRestartCampaign}
                    className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-500"
                  >
                    Confirm Full Campaign Reset
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
