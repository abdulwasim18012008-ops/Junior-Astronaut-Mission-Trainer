import React, { useState } from 'react';
import { LiveHudSnapshot, SaveProgress, SubtitleLine } from '../types/game';
import { CAMPAIGN_MISSIONS } from '../game/missions';
import { LunarMinimap } from './LunarMapModal';
import { FirstTimeRoverGuide, KeyCap, OnFootTutorialCard } from './ControlGuide';
import {
  Award,
  BatteryCharging,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  BookOpen,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Circle,
  Footprints,
  HelpCircle,
  Map as MapIcon,
  Moon,
  Navigation,
  Pause,
  Radio,
  Route,
  SkipForward,
  Star,
  Sun,
  Target,
  Thermometer,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';

interface GameHUDProps {
  hud: LiveHudSnapshot;
  progress: SaveProgress;
  subtitle: SubtitleLine | null;
  transmission: { sender: string; text: string } | null;
  toastText: string | null;
  muted: boolean;
  onDismissTransmission: () => void;
  onSkipCinematic: () => void;
  onAction: () => void;
  onChargeRover: () => void;
  onEmergencyBoost: () => void;
  onOpenMap: () => void;
  onOpenLog: (tab: 'crew' | 'badges' | 'optional' | 'discoveries' | 'pause') => void;
  onToggleMute: () => void;
  onCycleTimeOfDay: () => void;
  onToggleGoldenTrail: () => void;
  onDismissOnFootTutorial: () => void;
  onDismissRoverTutorial: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  progress,
  subtitle,
  transmission,
  toastText,
  muted,
  onDismissTransmission,
  onSkipCinematic,
  onAction,
  onChargeRover,
  onEmergencyBoost,
  onOpenMap,
  onOpenLog,
  onToggleMute,
  onCycleTimeOfDay,
  onToggleGoldenTrail,
  onDismissOnFootTutorial,
  onDismissRoverTutorial,
}) => {
  const [missionCollapsed, setMissionCollapsed] = useState(false);

  const isCinematic =
    hud.phase === 'cinematic_opening' ||
    hud.phase === 'cinematic_departure' ||
    hud.phase === 'cinematic_ending';

  const mission = CAMPAIGN_MISSIONS[progress.currentMissionIndex];
  const objective = mission?.objectives[progress.currentObjectiveIndex];
  const totalStars = Object.values(progress.starsByMission).reduce((a, b) => a + b, 0);

  if (isCinematic) {
    return (
      <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between">
        {/* Top Letterbox */}
        <div className="flex h-14 items-center justify-between bg-black/95 px-6">
          <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-amber-400 uppercase">
            <span>🌙</span>
            <span>
              {hud.phase === 'cinematic_opening'
                ? 'Junior Astronaut — Earthrise Overlook'
                : hud.phase === 'cinematic_departure'
                ? 'Commander Departure'
                : 'Lunar Expedition Finale'}
            </span>
          </div>
          <button
            onClick={onSkipCinematic}
            className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-800"
          >
            <SkipForward className="h-3.5 w-3.5" />
            Skip Cinematic
          </button>
        </div>

        <div className="flex-1" />

        {/* Bottom Letterbox + Subtitles */}
        <div className="flex min-h-[72px] flex-col items-center justify-center bg-black/95 px-6 py-3">
          {subtitle && (
            <div className="max-w-2xl text-center">
              <span
                className="mr-2 text-xs font-extrabold tracking-wider uppercase"
                style={{ color: subtitle.accentColor || '#fbbf24' }}
              >
                {subtitle.speaker}:
              </span>
              <span className="text-base font-semibold text-white sm:text-lg">
                "{subtitle.text}"
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const completedObjCount = mission ? progress.currentObjectiveIndex : 0;
  const totalObjCount = mission ? mission.objectives.length : 0;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4">
      {/* Subtle 3D-Projected Destination Marker (hidden cleanly when trail is toggled off) */}
      {hud.showGoldenTrail && hud.targetX !== null && hud.targetScreenPos && (
        <div
          style={{
            left: `${hud.targetScreenPos.xPct}%`,
            top: `${hud.targetScreenPos.yPct}%`,
          }}
          className="pointer-events-none fixed z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-[left,top] duration-75"
        >
          <div className="flex items-center gap-1.5 rounded-lg border border-amber-400/70 bg-slate-950/90 px-2 py-0.5 text-[11px] font-bold text-amber-200 shadow-md">
            <span className="text-amber-400">◆</span>
            <span className="max-w-[140px] truncate">{hud.targetLabel}</span>
            <span className="text-amber-400 tabular-nums">{hud.distanceToTarget}m</span>
          </div>
          <div className="h-2.5 w-0.5 bg-amber-400/75" />
        </div>
      )}

      {/* TOP BAR: Left Mission Card, Center Compass Strip + Transmission, Right Status Cluster */}
      <div className="relative z-20 flex items-start justify-between gap-4">
        {/* Left-side Mission Guidance Panel */}
        <div className="pointer-events-auto w-72 sm:w-80">
          {mission ? (
            <div className="rounded-2xl border border-slate-700 bg-slate-950/92 p-3.5 text-slate-100 shadow-xl">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold tracking-widest text-amber-400 uppercase">
                  {mission.chapterTitle}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                    {completedObjCount}/{totalObjCount}
                  </span>
                  <button
                    onClick={() => setMissionCollapsed((c) => !c)}
                    className="rounded p-0.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                    title={missionCollapsed ? 'Expand mission' : 'Collapse mission'}
                  >
                    {missionCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-sm font-black text-white">
                <Target className="h-4 w-4 shrink-0 text-amber-400" />
                <span>{mission.title}</span>
              </div>

              {!missionCollapsed && objective && (
                <div className="mt-2.5 space-y-2 border-t border-slate-800 pt-2.5">
                  <div className="space-y-1.5">
                    {mission.objectives.map((obj, idx) => {
                      const done = idx < progress.currentObjectiveIndex;
                      const active = idx === progress.currentObjectiveIndex;
                      return (
                        <div
                          key={obj.id}
                          className={`flex items-start justify-between gap-2 rounded-lg px-1.5 py-1 text-xs ${
                            done
                              ? 'text-emerald-400/80'
                              : active
                              ? 'bg-amber-500/10 font-bold text-amber-200'
                              : 'text-slate-500'
                          }`}
                        >
                          <span className="flex items-start gap-1.5">
                            {done ? (
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                            ) : active ? (
                              hud.guidanceMode === 'board_rover' || hud.guidanceMode === 'drive_rover' || hud.guidanceMode === 'exit_rover' ? (
                                <Car className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                              ) : (
                                <Navigation className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                              )
                            ) : (
                              <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />
                            )}
                            <span className={done ? 'line-through' : ''}>
                              {obj.label}
                              {active && obj.type === 'collect' && (
                                <span className="ml-1.5 text-emerald-300 tabular-nums">
                                  ({hud.collectProgress}/{hud.collectTarget})
                                </span>
                              )}
                            </span>
                          </span>
                          {active && hud.targetX !== null && (
                            <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[11px] font-bold text-amber-300 tabular-nums">
                              {hud.distanceToTarget}m
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Active Route & Rover Step Guidance */}
                  {(hud.guidanceMode === 'board_rover' ||
                    hud.guidanceMode === 'drive_rover' ||
                    hud.guidanceMode === 'exit_rover') && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-950/40 p-2 text-[11px] text-amber-100">
                      <Car className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                      <div>
                        <div className="font-bold text-amber-300">Next Step</div>
                        {hud.guidanceMode === 'board_rover' &&
                          'Follow the golden trail to your Rover and press E to climb in.'}
                        {hud.guidanceMode === 'drive_rover' &&
                          'Drive along the golden trail with W/↑ and A/D.'}
                        {hud.guidanceMode === 'exit_rover' &&
                          'Stop near the golden ring and press E to step outside.'}
                      </div>
                    </div>
                  )}

                  {hud.guidanceMode === 'walk' && (
                    <div className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-300">
                      <Footprints className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400/80" />
                      <span>{objective.hintText}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-500/50 bg-slate-950/92 p-3.5 text-slate-100 shadow-xl">
              <div className="text-xs font-extrabold text-emerald-400 uppercase">Free Moon Exploration</div>
              <div className="mt-0.5 text-sm font-bold text-white">All 20 Story Missions Complete!</div>
              <p className="mt-1 text-xs text-slate-300">
                Keep exploring craters, photographing Earth, and helping your crew!
              </p>
            </div>
          )}

          {/* Gradual First-Time On-Foot Control Guide OR First-Time Rover Driving Guide */}
          {hud.phase === 'playing' && (
            <div className="mt-3">
              {hud.inVehicle ? (
                progress.seenRoverTutorial === false && (
                  <FirstTimeRoverGuide onDismiss={onDismissRoverTutorial} />
                )
              ) : (
                progress.seenOnFootTutorial === false && (
                  <OnFootTutorialCard onDismiss={onDismissOnFootTutorial} />
                )
              )}
            </div>
          )}
        </div>

        {/* Center Compass Guidance Strip & Optional Transmission Banner */}
        <div className="hidden flex-col items-center gap-2 md:flex">
          <CompassGuidanceStrip
            cameraHeadingDeg={hud.cameraHeadingDeg}
            targetBearingDeg={hud.targetBearingDeg}
            hasTarget={hud.targetX !== null}
            targetLabel={hud.targetLabel}
            distanceToTarget={hud.distanceToTarget}
          />

          {transmission && (
            <div className="pointer-events-auto max-w-md rounded-2xl border-2 border-sky-400/70 bg-slate-950/95 p-3.5 text-slate-100 shadow-2xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-sky-400 uppercase">
                  <Radio className="h-4 w-4" />
                  <span>{transmission.sender}</span>
                </div>
                <button
                  onClick={onDismissTransmission}
                  className="rounded-md bg-sky-600 px-2.5 py-0.5 text-xs font-bold text-white hover:bg-sky-500"
                >
                  Roger!
                </button>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-200">"{transmission.text}"</p>
            </div>
          )}
        </div>

        {/* Top-Right Status Cluster */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/92 px-3 py-1.5 text-xs font-bold text-slate-100 shadow-lg tabular-nums">
            <span className="text-amber-400">{progress.points} pts</span>
            <span className="flex items-center gap-1 text-amber-300">
              <Star className="h-3.5 w-3.5 fill-current" /> {totalStars}
            </span>
            <button
              onClick={onCycleTimeOfDay}
              title="Toggle Lunar Day / Night Lighting"
              className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] text-sky-300 hover:bg-slate-700"
            >
              {hud.isShadowed ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3 text-amber-300" />}
              <Thermometer className="h-3 w-3" />
              {hud.surfaceTempC}°C
            </button>
          </div>

          <button
            onClick={onToggleGoldenTrail}
            title={hud.showGoldenTrail ? 'Hide Golden Navigation Trail' : 'Show Golden Navigation Trail'}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
              hud.showGoldenTrail
                ? 'border-amber-400/60 bg-slate-950/92 text-amber-300 hover:border-amber-300'
                : 'border-slate-700 bg-slate-950/92 text-slate-400 hover:border-slate-500 hover:text-slate-200'
            }`}
          >
            <Route className="h-4 w-4" />
            <span className="hidden lg:inline">{hud.showGoldenTrail ? 'Trail On' : 'Trail Off'}</span>
          </button>

          <button
            onClick={onOpenMap}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950/92 px-3 py-2 text-xs font-bold text-white hover:border-amber-400"
          >
            <MapIcon className="h-4 w-4 text-amber-400" />
            <span className="hidden sm:inline">Map (M)</span>
          </button>

          <button
            onClick={() => onOpenLog('crew')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950/92 px-3 py-2 text-xs font-bold text-white hover:border-amber-400"
          >
            <BookOpen className="h-4 w-4 text-sky-400" />
            <span className="hidden sm:inline">Crew & Log</span>
          </button>

          <button
            onClick={() => onOpenLog('badges')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950/92 px-3 py-2 text-xs font-bold text-white hover:border-amber-400"
            title="Badges & Progress"
          >
            <Award className="h-4 w-4 text-emerald-400" />
            <span className="tabular-nums">{progress.badges.length}</span>
          </button>

          <button
            onClick={onToggleMute}
            className="rounded-xl border border-slate-700 bg-slate-950/92 p-2 text-slate-200 hover:border-amber-400"
            title={muted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {muted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4 text-emerald-400" />}
          </button>

          <button
            onClick={() => onOpenLog('pause')}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950/92 px-2.5 py-2 text-xs font-bold text-slate-200 hover:border-amber-400"
            title="Pause & Controls Help (Esc)"
          >
            <HelpCircle className="h-4 w-4 text-sky-400" />
            <Pause className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Discovery Toast */}
      {toastText && (
        <div className="mx-auto rounded-xl border border-emerald-400/60 bg-slate-950/95 px-4 py-2 text-xs font-bold text-emerald-300 shadow-lg">
          {toastText}
        </div>
      )}

      {/* BOTTOM BAR: Left Rover Battery + Center Action/Hint + Right Minimap */}
      <div className="flex items-end justify-between gap-4">
        {/* Rover Battery Status & Charging Controls */}
        <div className="pointer-events-auto w-56 rounded-2xl border border-slate-700 bg-slate-950/92 p-3 text-slate-100 shadow-xl">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5">
              {hud.batteryStatus === 'charging' ? (
                <BatteryCharging className="h-4 w-4 text-cyan-400" />
              ) : hud.batteryStatus === 'empty' ? (
                <BatteryWarning className="h-4 w-4 text-rose-400" />
              ) : hud.batteryStatus === 'low' ? (
                <BatteryLow className="h-4 w-4 text-amber-400" />
              ) : (
                <BatteryMedium className="h-4 w-4 text-emerald-400" />
              )}
              <span>Rover Battery</span>
            </span>
            <span
              className={`tabular-nums ${
                hud.batteryStatus === 'charging'
                  ? 'text-cyan-300'
                  : hud.batteryStatus === 'empty'
                  ? 'text-rose-400'
                  : hud.batteryStatus === 'low'
                  ? 'text-amber-300'
                  : 'text-emerald-300'
              }`}
            >
              {hud.roverBattery}%
            </span>
          </div>

          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              style={{ width: `${Math.max(4, hud.roverBattery)}%` }}
              className={`h-full transition-all duration-200 ${
                hud.batteryStatus === 'charging'
                  ? 'bg-cyan-400'
                  : hud.batteryStatus === 'empty'
                  ? 'bg-rose-500'
                  : hud.batteryStatus === 'low'
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
            />
          </div>

          <div className="mt-1 text-[11px] font-semibold text-slate-400">
            {hud.batteryStatus === 'charging'
              ? `Charging at ${hud.chargingStationName || 'Pad'}...`
              : hud.emergencyBoostProgress > 0
              ? `Solar Boost: ${Math.round(hud.emergencyBoostProgress * 100)}%`
              : hud.batteryStatus === 'empty'
              ? 'Battery Empty! Recharge needed.'
              : hud.batteryStatus === 'low'
              ? 'Low Battery — visit a blue pad!'
              : hud.nearChargingStation
              ? `On ${hud.chargingStationName}`
              : 'Ready to explore'}
          </div>

          {hud.nearChargingStation && hud.roverBattery < 100 && !hud.roverCharging && (
            <button
              onClick={onChargeRover}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-cyan-500 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-cyan-400"
            >
              <Zap className="h-3.5 w-3.5" />
              Charge Rover (C)
            </button>
          )}

          {!hud.nearChargingStation && hud.roverBattery <= 0 && hud.emergencyBoostProgress <= 0 && (
            <button
              onClick={onEmergencyBoost}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-400 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-amber-300"
            >
              <Sun className="h-3.5 w-3.5" />
              Solar Boost +30% (B)
            </button>
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          {hud.nearbyPrompt && (
            <button
              onClick={onAction}
              className="pointer-events-auto flex items-center gap-2 rounded-2xl border-2 border-amber-400 bg-slate-950/95 px-5 py-2.5 text-sm font-black text-white shadow-xl hover:bg-amber-500 hover:text-slate-950"
            >
              {hud.nearbyPrompt.label.startsWith('Braking') ? (
                <span>{hud.nearbyPrompt.label}</span>
              ) : (
                <>
                  <span className="text-amber-300 group-hover:text-slate-950">Press</span>
                  <span className="rounded-md bg-amber-400 px-2 py-0.5 text-xs font-black text-slate-950">
                    {hud.nearbyPrompt.keyHint}
                  </span>
                  <span>to {hud.nearbyPrompt.label}</span>
                </>
              )}
            </button>
          )}

          {hud.vehicleState === 'PLAYER_DRIVING' ? (
            <div className="flex flex-wrap items-center justify-center gap-2.5 rounded-2xl border border-orange-400/50 bg-slate-950/94 px-4 py-2 text-xs font-bold text-slate-200 shadow-xl">
              <span className="flex items-center gap-1.5 rounded-lg bg-orange-500/20 px-2.5 py-1 text-orange-300 tabular-nums">
                <Car className="h-3.5 w-3.5" />
                {Math.abs(Math.round(hud.evSpeed * 3.6))} km/h
              </span>
              <span className="flex items-center gap-1"><KeyCap label="W" accent="orange" /> Accelerate</span>
              <span className="flex items-center gap-1"><KeyCap label="S" accent="orange" /> Brake/Rev</span>
              <span className="flex items-center gap-1"><KeyCap label="A/D" accent="orange" /> Steer</span>
              <span className="flex items-center gap-1"><KeyCap label="Space" wide accent="amber" /> Brake</span>
              <span className="flex items-center gap-1"><KeyCap label="E" accent="sky" /> Exit Rover</span>
            </div>
          ) : hud.vehicleState === 'PLAYER_ENTERING' ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/90 px-4 py-1.5 text-xs font-semibold text-orange-300">
              Boarding Lunar Rover...
            </div>
          ) : hud.vehicleState === 'PLAYER_EXITING' ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/90 px-4 py-1.5 text-xs font-semibold text-sky-300">
              Stepping out onto the Moon surface...
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-2.5 rounded-2xl border border-slate-800 bg-slate-950/92 px-3.5 py-1.5 text-[11px] font-semibold text-slate-300 shadow-lg">
              <span className="flex items-center gap-1"><KeyCap label="WASD" accent="sky" /> Move</span>
              <span className="flex items-center gap-1"><KeyCap label="Shift" accent="sky" /> Bound</span>
              <span className="flex items-center gap-1"><KeyCap label="Space" accent="amber" /> Jump</span>
              <span className="flex items-center gap-1"><KeyCap label="E" accent="amber" /> Interact</span>
              <span className="flex items-center gap-1"><KeyCap label="M" accent="emerald" /> 3D Map</span>
              <span className="flex items-center gap-1"><KeyCap label="Esc" accent="slate" /> Help</span>
              <span className="hidden text-slate-400 sm:inline">Drag: Look</span>
            </div>
          )}
        </div>

        <LunarMinimap hud={hud} progress={progress} onOpenFullMap={onOpenMap} />
      </div>
    </div>
  );
};

interface CompassStripProps {
  cameraHeadingDeg: number;
  targetBearingDeg: number;
  hasTarget: boolean;
  targetLabel: string;
  distanceToTarget: number;
}

const CARDINALS: Array<{ label: string; deg: number }> = [
  { label: 'N', deg: 0 },
  { label: 'NE', deg: 45 },
  { label: 'E', deg: 90 },
  { label: 'SE', deg: 135 },
  { label: 'S', deg: 180 },
  { label: 'SW', deg: 225 },
  { label: 'W', deg: 270 },
  { label: 'NW', deg: 315 },
];

const CompassGuidanceStrip: React.FC<CompassStripProps> = ({
  cameraHeadingDeg,
  targetBearingDeg,
  hasTarget,
  targetLabel,
  distanceToTarget,
}) => {
  const wrapDelta = (deg: number) => {
    let d = ((deg + 180) % 360 + 360) % 360 - 180;
    if (d < -180) d += 360;
    return d;
  };

  // Clamp objective marker onto [-78deg, +78deg] strip edge
  const clampedTargetOffset = Math.max(-76, Math.min(76, targetBearingDeg));
  const targetPct = 50 + (clampedTargetOffset / 85) * 46;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-7 w-72 overflow-hidden rounded-full border border-slate-700 bg-slate-950/90 shadow-lg">
        {/* Center notch */}
        <div className="absolute top-0 left-1/2 h-2 w-0.5 -translate-x-1/2 bg-slate-400" />
        {CARDINALS.map((c) => {
          const rel = wrapDelta(c.deg - cameraHeadingDeg);
          if (Math.abs(rel) > 85) return null;
          const pct = 50 + (rel / 85) * 46;
          return (
            <span
              key={c.label}
              style={{ left: `${pct}%` }}
              className={`-translate-x-1/2 -translate-y-1/2 absolute top-1/2 text-[10px] font-extrabold ${
                c.label.length === 1 ? 'text-slate-200' : 'text-slate-500'
              }`}
            >
              {c.label}
            </span>
          );
        })}

        {hasTarget && (
          <div
            style={{ left: `${targetPct}%` }}
            className="-translate-x-1/2 -translate-y-1/2 absolute top-1/2 flex h-4 w-4 items-center justify-center rounded-full border border-amber-200 bg-amber-400 text-[9px] font-black text-slate-950 shadow"
          >
            ◆
          </div>
        )}
      </div>

      {hasTarget && (
        <div className="rounded-md bg-slate-950/80 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-300 tabular-nums">
          {targetLabel} · {distanceToTarget}m
        </div>
      )}
    </div>
  );
};
