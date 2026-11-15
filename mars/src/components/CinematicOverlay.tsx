import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Award,
  BatteryCharging,
  Camera,
  Car,
  ChevronRight,
  Compass,
  Eye,
  Flashlight,
  FlaskConical,
  Heart,
  HelpCircle,
  Package,
  Pause,
  Plane,
  Radio,
  Satellite,
  Scan,
  Star,
  Thermometer,
  Users,
  Video,
  Volume2,
  VolumeX,
  Wind,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  BASE_BUILDINGS,
  CHARACTERS_INFO,
  CREW_NPC_ORDER,
} from '../game/adventureStory';
import { RESEARCH_CAMP_PARKING_POS } from '../game/colonyExpansion';
import { getStructureDisplayName } from '../game/crewAI';
import {
  BuildingId,
  CargoDeliveryState,
  CrewNpcId,
  DialogueLine,
  EnvironmentTelemetry,
  EvTransitionState,
  EvTutorialStep,
  ExplorationToolId,
  GameScreen,
  GameSettings,
  InteractiveNodeId,
  IntroPhase,
  LostRoverId,
  NavigationRoute,
  ResourceToast,
  RewardToastEvent,
  Step5Flow,
  SurvivalResources,
  VehicleCameraMode,
} from '../game/types';
import { INTERACTIVE_NODES } from '../game/adventureStory';
import { AstronautPortrait, ResourceIcon } from './AstronautIcons';
import { DirectionalCompassBar, MinimapHUD } from './MinimapHUD';
import { OptionalTaskTrackerItem, QuestStepItem, QuestTrackerPanel } from './QuestTrackerPanel';

interface CinematicOverlayProps {
  screen: GameScreen;
  missionLabel: string;
  missionTitle: string;
  objectiveText: string;
  hintText: string;
  showHint: boolean;
  onToggleHint: () => void;
  starsEarned: number;
  totalPoints?: number;
  discoveredCount?: number;
  rewardToasts?: RewardToastEvent[];
  unlockedCrewIds?: CrewNpcId[];
  activeOptionalIds?: string[];
  optionalTaskItems?: OptionalTaskTrackerItem[];
  onRouteOptionalTask?: (task: OptionalTaskTrackerItem) => void;
  carryingItem: string | null;
  oxygenGeneratorRepaired?: boolean;
  insideBuildingId: BuildingId | null;
  resources: SurvivalResources;
  resourceToasts: ResourceToast[];
  telemetry: EnvironmentTelemetry | null;
  nearbyNodeId: InteractiveNodeId | null;
  nearbyContextAction: { label: string; badge: string; onClick: () => void } | null;
  onInteractNearby: () => void;
  activeTool: ExplorationToolId;
  onSelectTool: (tool: ExplorationToolId) => void;
  onUseTool: () => void;
  flashlightOn: boolean;
  onToggleFlashlight: () => void;
  crouched: boolean;
  onToggleCrouch: () => void;
  drivingRover: boolean;
  onToggleRover: () => void;
  vehicleCamMode: VehicleCameraMode;
  onToggleVehicleCam: () => void;
  vehicleHeadlights: boolean;
  onToggleVehicleHeadlights: () => void;
  cargoDelivery: CargoDeliveryState;
  onOpenSupplies: () => void;
  resolvedRovers: LostRoverId[];
  discoveredLandmarks?: string[];
  missionId: number;
  activeTargetPos?: [number, number] | null;
  activeTargetLabel?: string;
  pendingNextMissionLabel?: string | null;
  onStartPendingMission?: () => void;
  stormWarningActive?: boolean;
  stormWarningCountdown?: number;
  outdoorGearSecured?: boolean;
  onSecureOutdoorGear?: () => void;
  onOpenWeatherMonitor?: () => void;
  onOpenChargingStation?: () => void;
  stuckHintText?: string | null;
  onDismissStuckHint?: () => void;
  radarOpen?: boolean;
  onToggleRadar?: () => void;
  radarExpanded?: boolean;
  onToggleRadarExpand?: () => void;
  mapOpen?: boolean;
  activeRoute?: NavigationRoute | null;
  onClearRoute?: () => void;
  droneActive: boolean;
  droneCameraView: boolean;
  onToggleDroneCamera: () => void;
  photoFlash: boolean;
  onJoystickMove: (right: number, forward: number) => void;
  onTouchSprintChange: (active: boolean) => void;
  onTouchJump: () => void;
  dialogueQueue: DialogueLine[];
  onAdvanceDialogue: () => void;
  onSkipIntro?: () => void;
  introPhase?: IntroPhase;
  cutsceneCaption?: string | null;
  drivingWrongWay?: boolean;
  step5Flow?: Step5Flow;
  questSteps?: QuestStepItem[];
  liveRouteDistM?: number | null;
  offTrackAlert?: boolean;
  destinationName?: string | null;
  actionHint?: string | null;
  questTransitionKey?: string;
  recapOpen?: boolean;
  evGuideActive?: boolean;
  evArrivedAtZone?: boolean;
  evCanExitAtZone?: boolean;
  evBatteryEmpty?: boolean;
  evDestinationName?: string | null;
  evTransitionState?: EvTransitionState;
  evTutorialStep?: EvTutorialStep;
  onBoardVehicle?: () => void;
  onExitVehicle?: () => void;
  onEmergencyEvBoost?: () => void;
  onDismissEvTutorial?: () => void;
  onOpenControlsHelp?: () => void;
  touchControlsMode?: GameSettings['touchControlsMode'];
  muted: boolean;
  onToggleMute: () => void;
  onOpenCrewAssistant: () => void;
  onOpenNasaData: () => void;
  onOpenMap: () => void;
  onOpenBadges: () => void;
  onBack?: () => void;
  onPause: () => void;
}

const TOOL_BUTTONS: Array<{
  id: ExplorationToolId;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: 'scanner', label: 'Scan', icon: Scan },
  { id: 'sample_collector', label: 'Sample', icon: FlaskConical },
  { id: 'camera', label: 'Photo', icon: Camera },
  { id: 'signal_detector', label: 'Signal', icon: Radio },
  { id: 'drone', label: 'Drone', icon: Plane },
  { id: 'flashlight', label: 'Light', icon: Flashlight },
];

export const CinematicOverlay: React.FC<CinematicOverlayProps> = ({
  screen,
  missionLabel,
  missionTitle,
  objectiveText,
  hintText,
  showHint,
  onToggleHint,
  starsEarned,
  totalPoints = 0,
  discoveredCount = 0,
  rewardToasts = [],
  unlockedCrewIds,
  activeOptionalIds,
  optionalTaskItems = [],
  onRouteOptionalTask,
  carryingItem,
  oxygenGeneratorRepaired = false,
  insideBuildingId,
  resources,
  resourceToasts,
  telemetry,
  nearbyNodeId,
  nearbyContextAction,
  onInteractNearby,
  activeTool,
  onSelectTool,
  onUseTool,
  flashlightOn,
  onToggleFlashlight,
  crouched,
  onToggleCrouch,
  drivingRover,
  onToggleRover,
  vehicleCamMode,
  onToggleVehicleCam,
  vehicleHeadlights,
  onToggleVehicleHeadlights,
  cargoDelivery,
  onOpenSupplies,
  resolvedRovers,
  discoveredLandmarks = [],
  missionId,
  activeTargetPos,
  activeTargetLabel,
  pendingNextMissionLabel,
  onStartPendingMission,
  stormWarningActive = false,
  stormWarningCountdown = 0,
  outdoorGearSecured = false,
  onSecureOutdoorGear,
  onOpenWeatherMonitor,
  onOpenChargingStation,
  stuckHintText = null,
  onDismissStuckHint,
  radarOpen = false,
  onToggleRadar,
  radarExpanded = false,
  onToggleRadarExpand,
  mapOpen = false,
  activeRoute = null,
  onClearRoute,
  droneActive,
  droneCameraView,
  onToggleDroneCamera,
  photoFlash,
  onJoystickMove,
  onTouchSprintChange,
  onTouchJump,
  dialogueQueue,
  onAdvanceDialogue,
  onSkipIntro,
  introPhase = 'none',
  cutsceneCaption = null,
  drivingWrongWay = false,
  step5Flow,
  questSteps = [],
  liveRouteDistM = null,
  offTrackAlert = false,
  destinationName = null,
  actionHint = null,
  questTransitionKey = '0_0',
  recapOpen = false,
  evGuideActive = false,
  evArrivedAtZone = false,
  evCanExitAtZone = false,
  evBatteryEmpty = false,
  evDestinationName = null,
  evTransitionState = 'idle',
  evTutorialStep = 'idle',
  onBoardVehicle,
  onExitVehicle,
  onEmergencyEvBoost,
  onDismissEvTutorial,
  onOpenControlsHelp,
  touchControlsMode = 'auto',
  muted,
  onToggleMute,
  onOpenCrewAssistant,
  onOpenNasaData,
  onOpenMap,
  onOpenBadges,
  onBack,
  onPause,
}) => {
  const isAutomatedIntro =
    introPhase === 'site_inspection' ||
    introPhase === 'vehicle_entry' ||
    introPhase === 'camp_arrival';
  const isDriveIntro = introPhase === 'drive_to_camp' && dialogueQueue.length === 0 && !recapOpen;

  const isCutscene =
    screen === 'cinematic_space' ||
    screen === 'cinematic_landing' ||
    screen === 'cinematic_ending' ||
    isAutomatedIntro ||
    dialogueQueue.length > 0;

  const currentLine = dialogueQueue[0] ?? null;
  const nearbySpec = nearbyNodeId ? INTERACTIVE_NODES[nearbyNodeId] : null;
  const insideName = insideBuildingId ? BASE_BUILDINGS[insideBuildingId].name : null;

  // Virtual Analog Touch Joystick state
  const joyRef = useRef<HTMLDivElement | null>(null);
  const joyActiveRef = useRef(false);
  const [joyOffset, setJoyOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [sprintLocked, setSprintLocked] = useState(false);

  // Simple child-friendly Driving Pedal / Steer state (Scene 3)
  const driveSteerRef = useRef<number>(0);
  const drivePedalRef = useRef<number>(0);
  const [driveButtonsActive, setDriveButtonsActive] = useState({
    left: false,
    right: false,
    accel: false,
    brake: false,
  });

  useEffect(() => {
    if (!isDriveIntro && !drivingRover) {
      driveSteerRef.current = 0;
      drivePedalRef.current = 0;
      setDriveButtonsActive({ left: false, right: false, accel: false, brake: false });
    }
  }, [isDriveIntro, drivingRover]);

  const setDriveControl = (
    patch: Partial<{ left: boolean; right: boolean; accel: boolean; brake: boolean }>,
  ) => {
    setDriveButtonsActive((prev) => {
      const next = { ...prev, ...patch };
      const steer = (next.right ? 1 : 0) - (next.left ? 1 : 0);
      const pedal = (next.accel ? 1 : 0) - (next.brake ? 1 : 0);
      driveSteerRef.current = steer;
      drivePedalRef.current = pedal;
      onJoystickMove(steer, pedal);
      return next;
    });
  };

  // Compute Research Camp guidance direction & distance during Scene 3
  const campDistM = telemetry
    ? Math.max(0, Math.round(Math.hypot(RESEARCH_CAMP_PARKING_POS[0] - telemetry.roverX, RESEARCH_CAMP_PARKING_POS[1] - telemetry.roverZ)))
    : 48;
  let campRelAngleDeg = 0;
  let campGuideText = 'Go Straight';
  if (telemetry) {
    const dx = RESEARCH_CAMP_PARKING_POS[0] - telemetry.roverX;
    const dz = RESEARCH_CAMP_PARKING_POS[1] - telemetry.roverZ;
    const targetYaw = Math.atan2(dx, dz);
    let diff = targetYaw - telemetry.roverYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    // Note: in Three.js Y-up, +yaw rotates CCW (left); negative diff means target is to the right
    campRelAngleDeg = Math.round((-diff * 180) / Math.PI);
    const absDeg = Math.abs(campRelAngleDeg);
    if (absDeg <= 22) campGuideText = 'Go Straight Ahead!';
    else if (absDeg >= 135) campGuideText = 'Turn Around Gently';
    else if (campRelAngleDeg < 0) campGuideText = absDeg < 60 ? 'Steer Slightly Left' : 'Turn Left';
    else campGuideText = absDeg < 60 ? 'Steer Slightly Right' : 'Turn Right';
  }

  const updateJoystick = (clientX: number, clientY: number) => {
    const el = joyRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const maxR = rect.width * 0.36;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR && dist > 0) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setJoyOffset({ x: dx, y: dy });
    onJoystickMove(dx / maxR, -dy / maxR);
  };

  const resetJoystick = () => {
    joyActiveRef.current = false;
    setJoyOffset({ x: 0, y: 0 });
    onJoystickMove(0, 0);
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between">
      {/* Camera Snapshot Flash */}
      {photoFlash && <div className="fixed inset-0 bg-white/80 z-50 pointer-events-none" />}

      {/* Simulated Aerial Drone / Rover Cam Dust Haze & Visibility Readout */}
      {screen === 'playing' && droneCameraView && telemetry && (
        <div
          className="fixed inset-0 pointer-events-none z-10 transition-opacity duration-500"
          style={{
            background:
              telemetry.stormStage >= 3
                ? `radial-gradient(circle at center, rgba(180,83,9,${telemetry.stormStage >= 4 ? 0.24 : 0.12}) 0%, rgba(120,53,15,${telemetry.stormStage >= 4 ? 0.48 : 0.22}) 100%)`
                : 'none',
          }}
        >
          <div className="absolute top-20 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-xl bg-[#0b1222]/90 border border-amber-400/45 text-[11px] font-bold text-amber-200 font-mono-num shadow-lg">
            Aerial Cam · Visibility {telemetry.roverCamVisibilityPct}% ({telemetry.stormStageLabel}) · GAME SIMULATION
          </div>
        </div>
      )}

      {/* Subtle letterbox bars during opening/ending/automated intro cutscenes */}
      {(screen === 'cinematic_space' ||
        screen === 'cinematic_landing' ||
        screen === 'cinematic_ending' ||
        isAutomatedIntro) && (
        <>
          <div className="fixed top-0 inset-x-0 h-9 bg-black/80 pointer-events-none" />
          <div className="fixed bottom-0 inset-x-0 h-9 bg-black/80 pointer-events-none" />
        </>
      )}

      {/* Animated Star / Point / Badge Reward Toast Banners */}
      {rewardToasts.length > 0 && !recapOpen && (
        <div className="fixed top-14 inset-x-0 z-30 flex flex-col items-center gap-1.5 px-4 pointer-events-none">
          {rewardToasts.slice(0, 2).map((rt) => (
            <div
              key={rt.id}
              className="px-4 py-2 rounded-2xl bg-[#0e172a]/96 border-2 border-amber-400/60 shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-extrabold text-white animate-bounce"
              style={{ animationIterationCount: 1, animationDuration: '0.5s' }}
            >
              <Star className="w-4 h-4 fill-amber-400 text-amber-400 shrink-0" />
              <span>{rt.title}</span>
              <span className="px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950 font-mono-num text-xs">
                +{rt.points} pts
              </span>
              {rt.stars && rt.stars > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-emerald-400 text-slate-950 font-mono-num text-xs">
                  +{rt.stars}★
                </span>
              )}
              {rt.badgeTitle && (
                <span className="px-2 py-0.5 rounded-lg bg-purple-400 text-slate-950 text-xs">
                  Badge: {rt.badgeTitle}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Automated Intro Header & Skip Intro */}
      {isAutomatedIntro && screen === 'playing' && (
        <div className="relative z-20 flex items-center justify-between px-4 sm:px-6 pt-11">
          <div className="px-3.5 py-1.5 rounded-xl bg-[#0b1222]/90 border border-sky-400/35 text-xs font-bold text-sky-200">
            {introPhase === 'site_inspection'
              ? 'Scene 1 · Remote Communication Relay'
              : introPhase === 'vehicle_entry'
                ? 'Scene 3 · Boarding Exploration Vehicle'
                : 'Ares Colony · Checking In'}
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            {onSkipIntro && (
              <button
                onClick={onSkipIntro}
                className="px-4 py-1.5 rounded-xl bg-slate-900/95 hover:bg-slate-800 border border-white/20 text-xs font-bold text-slate-100 cursor-pointer"
              >
                Skip Intro
              </button>
            )}
          </div>
        </div>
      )}

      {/* SCENE 4 — CHILD-FRIENDLY DRIVING HUD WITH LEFT QUEST TRACKER */}
      {isDriveIntro && screen === 'playing' && (
        <div className="flex flex-wrap items-start justify-between gap-2.5 p-3 sm:p-5">
          {/* Left-Side Quest Tracker + Clear Steer Arrow */}
          <div className="pointer-events-auto w-full sm:w-auto space-y-2">
            <QuestTrackerPanel
              missionTitle={missionTitle}
              objectiveText={objectiveText}
              destinationName={destinationName ?? 'Ares Colony'}
              distanceM={liveRouteDistM ?? campDistM}
              actionHint={actionHint ?? 'Follow the golden path to Ares Colony'}
              steps={questSteps}
              offTrackAlert={offTrackAlert || drivingWrongWay}
              onOpenMap={onOpenMap}
              transitionKey={questTransitionKey}
              totalPoints={totalPoints}
              starsEarned={starsEarned}
              discoveredCount={discoveredCount}
            />

            <div className="w-full sm:w-[318px] flex items-center gap-2.5 p-2 rounded-xl bg-[#0b1222]/92 border border-sky-400/35 shadow-lg">
              <div
                className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/50 flex items-center justify-center shrink-0 transition-transform"
                style={{ transform: `rotate(${campRelAngleDeg}deg)` }}
              >
                <ArrowUp className="w-4 h-4 text-sky-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-extrabold text-sky-200">{campGuideText}</div>
                <div className="text-[10px] text-slate-300">
                  Follow the glowing golden route on Mars &amp; your Map!
                </div>
              </div>
            </div>
          </div>

          {/* Top-Right: Map + Sound Mute + Pause + Corner Minimap */}
          <div className="pointer-events-auto flex flex-col items-end gap-2 ml-auto">
            <div className="flex items-center gap-1.5">
              {onSkipIntro && (
                <button
                  onClick={onSkipIntro}
                  className="px-3 py-2 rounded-xl bg-slate-900/95 hover:bg-slate-800 border border-white/20 text-xs font-bold text-slate-100 cursor-pointer min-h-[40px]"
                >
                  Fast-Forward Drive
                </button>
              )}
              <button
                onClick={onOpenMap}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs shadow-lg cursor-pointer min-h-[40px]"
              >
                <Compass className="w-4 h-4" />
                <span>Map</span>
              </button>
              <button
                onClick={onToggleMute}
                title={muted ? 'Unmute Sound' : 'Mute Sound'}
                className="p-2 rounded-xl bg-[#0b1222]/92 hover:bg-slate-800 border border-white/15 text-slate-200 cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                onClick={onPause}
                title="Pause (Esc)"
                className="p-2 rounded-xl bg-[#0b1222]/92 hover:bg-slate-800 border border-white/15 text-slate-200 cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>

            {telemetry && radarOpen && (
              <MinimapHUD
                telemetry={telemetry}
                missionId={missionId}
                drivingRover={drivingRover}
                resolvedRovers={resolvedRovers}
                discoveredLandmarks={discoveredLandmarks}
                unlockedCrewIds={unlockedCrewIds}
                activeOptionalIds={activeOptionalIds}
                activeTargetPos={activeTargetPos}
                activeTargetLabel={activeTargetLabel}
                activeRoute={activeRoute}
                onClearRoute={onClearRoute}
                evGuideActive={evGuideActive}
                expanded={radarExpanded}
                paused={mapOpen}
                onToggleExpand={() => onToggleRadarExpand?.()}
                onClose={() => onToggleRadar?.()}
                onOpenFullMap={onOpenMap}
              />
            )}
          </div>
        </div>
      )}

      {/* TOP-CENTER SLIM DIRECTIONAL COMPASS */}
      {screen === 'playing' && !isCutscene && !isDriveIntro && !recapOpen && telemetry && (
        <div className="fixed top-2.5 inset-x-0 z-20 px-4 hidden md:flex justify-center pointer-events-none">
          <DirectionalCompassBar
            telemetry={telemetry}
            activeTargetPos={activeRoute ? [activeRoute.targetX, activeRoute.targetZ] : activeTargetPos}
            activeTargetLabel={activeRoute ? `Route: ${activeRoute.destinationName}` : activeTargetLabel}
          />
        </div>
      )}

      {/* TOP BAR (Normal Colony Gameplay) */}
      {screen === 'playing' && !isCutscene && !isDriveIntro && !recapOpen && (
        <div className="flex flex-wrap items-start justify-between gap-2.5 p-2.5 sm:p-4">
          {/* Left-Side Permanent Quest Tracker + Compact Survival Resources */}
          <div className="pointer-events-auto w-full sm:w-[318px] space-y-1.5">
            <QuestTrackerPanel
              missionTitle={`${missionLabel} · ${missionTitle}`}
              objectiveText={objectiveText}
              destinationName={destinationName ?? activeTargetLabel ?? null}
              distanceM={liveRouteDistM}
              actionHint={actionHint ?? step5Flow?.whatToDo ?? null}
              steps={questSteps}
              offTrackAlert={offTrackAlert}
              onOpenMap={onOpenMap}
              transitionKey={questTransitionKey}
              totalPoints={totalPoints}
              starsEarned={starsEarned}
              discoveredCount={discoveredCount}
              optionalTasks={optionalTaskItems}
              onRouteOptionalTask={onRouteOptionalTask}
            />

            <div className="bg-[#0b1222]/90 border border-white/12 rounded-2xl px-3 py-2 shadow-lg space-y-1.5">
              {(insideName || drivingRover || carryingItem || oxygenGeneratorRepaired) && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {insideName && (
                    <span className="px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-400/40 text-[10px] font-bold text-sky-200">
                      Inside: {insideName} (+20°C)
                    </span>
                  )}
                  {!insideName && drivingRover && (
                    <span className="px-2 py-0.5 rounded-md bg-orange-500/20 border border-orange-400/40 text-[10px] font-bold text-orange-200">
                      MEV ({vehicleCamMode === 'interior' ? 'Cockpit' : 'Chase'})
                    </span>
                  )}
                  {oxygenGeneratorRepaired && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-bold text-emerald-300">
                      O₂ Online
                    </span>
                  )}
                  {carryingItem && (
                    <span className="text-[10px] font-semibold text-sky-300">
                      Carrying: {carryingItem}
                    </span>
                  )}
                </div>
              )}

              {/* Live Base Survival Resources */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {(
                  [
                    { key: 'air', label: 'Air', val: Math.round(resources.air), pct: true, kind: 'air' as const },
                    { key: 'water', label: 'Water', val: Math.round(resources.water), pct: true, kind: 'water' as const },
                    { key: 'power', label: 'Power', val: Math.round(resources.power), pct: true, kind: 'power' as const },
                    { key: 'food', label: 'Food', val: Math.round(resources.food), pct: true, kind: 'food' as const },
                    { key: 'crew', label: 'Crew', val: Math.round(resources.crewCondition), pct: true, kind: 'crew' as const },
                    { key: 'parts', label: 'Parts', val: resources.spareParts, pct: false, kind: 'parts' as const },
                  ] as const
                ).map((item) => {
                  const low = item.pct ? item.val < 50 : item.val <= 1;
                  const mid = item.pct ? item.val >= 50 && item.val < 80 : item.val <= 3;
                  const colorClass = low ? 'text-red-400' : mid ? 'text-amber-300' : 'text-emerald-300';
                  const barClass = low ? 'bg-red-500' : mid ? 'bg-amber-400' : 'bg-emerald-400';
                  return (
                    <div key={item.key} className="space-y-0.5">
                      <div className={`flex items-center justify-between text-[10px] font-bold ${colorClass}`}>
                        <span className="flex items-center gap-0.5">
                          {item.kind === 'crew' ? (
                            <Heart className="w-2.5 h-2.5" />
                          ) : item.kind === 'parts' ? (
                            <Wrench className="w-2.5 h-2.5" />
                          ) : (
                            <ResourceIcon kind={item.kind} className="w-2.5 h-2.5" />
                          )}
                          {item.label}
                        </span>
                        <span className="font-mono-num">
                          {item.val}
                          {item.pct ? '%' : ''}
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${barClass}`}
                          style={{ width: `${item.pct ? item.val : Math.min(100, item.val * 10)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Compact Sol Time, Simulated Temp, Slope & Clickable Weather Station Strip */}
              {telemetry && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 mt-1.5 border-t border-white/10 text-[10px] text-slate-300">
                  <span className="font-mono-num font-bold text-sky-200">
                    Sol {telemetry.solNumber} · {telemetry.solTimeLabel} · {telemetry.solPhase}
                  </span>
                  <span className="flex items-center gap-1 font-mono-num">
                    <Thermometer className="w-3 h-3 text-sky-300" />
                    {telemetry.outsideTempC}°C · Slope {telemetry.slopeDeg}°
                  </span>
                  <button
                    type="button"
                    onClick={onOpenWeatherMonitor}
                    title="Open Mars Weather Monitoring Station"
                    className={`flex items-center gap-1 font-bold px-2 py-0.5 rounded-lg border cursor-pointer transition-colors ${
                      telemetry.stormStage >= 4
                        ? 'bg-red-500/20 border-red-400/40 text-red-200 hover:bg-red-500/30'
                        : telemetry.stormStage >= 3 || stormWarningActive
                          ? 'bg-amber-500/20 border-amber-400/40 text-amber-200 hover:bg-amber-500/30'
                          : 'bg-slate-800/80 border-white/10 text-sky-200 hover:bg-slate-700'
                    }`}
                  >
                    <Wind className="w-3 h-3" /> Stage {telemetry.stormStage}: {telemetry.stormStageLabel}
                  </button>
                </div>
              )}
            </div>

            {/* Early Storm Warning / Approaching Dust Storm Alert */}
            {(stormWarningActive || (telemetry?.stormStage ?? 1) >= 4) && !insideName && (
              <div
                className={`w-full px-3.5 py-2 rounded-xl border text-xs font-bold shadow-lg flex flex-wrap items-center justify-between gap-2 ${
                  (telemetry?.stormStage ?? 1) >= 4
                    ? 'bg-red-950/90 border-red-400/50 text-red-100'
                    : 'bg-amber-950/90 border-amber-400/50 text-amber-100'
                }`}
              >
                <span className="flex-1 min-w-[160px]">
                  {(telemetry?.stormStage ?? 1) >= 4
                    ? 'Storm Alert: Dust storm active! Move to Shelter & seal blast doors.'
                    : `Weather Warning (GAME SIMULATION): Storm in ${Math.max(0, Math.ceil(stormWarningCountdown))}s — prepare Shelter!`}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {(telemetry?.stormStage ?? 1) < 4 && !outdoorGearSecured && onSecureOutdoorGear && (
                    <button
                      onClick={onSecureOutdoorGear}
                      className="px-2 py-0.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-extrabold cursor-pointer"
                    >
                      Secure Gear
                    </button>
                  )}
                  <button
                    onClick={onOpenWeatherMonitor}
                    className="px-2 py-0.5 rounded bg-black/35 hover:bg-black/55 text-[10px] font-bold cursor-pointer"
                  >
                    Monitor
                  </button>
                </div>
              </div>
            )}

            {pendingNextMissionLabel && onStartPendingMission && (
              <button
                onClick={onStartPendingMission}
                className="w-full flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg cursor-pointer"
              >
                <span>Free Roam Active · Ready for {pendingNextMissionLabel}</span>
                <span className="flex items-center gap-0.5 font-extrabold">
                  Start Now <ChevronRight className="w-4 h-4" />
                </span>
              </button>
            )}

            {stuckHintText && (
              <div className="bg-amber-950/95 border border-amber-400/50 rounded-xl px-3.5 py-2 text-xs text-amber-100 shadow-lg flex items-start justify-between gap-2">
                <span>
                  <strong className="text-amber-300">Tip:</strong> {stuckHintText}
                </span>
                {onDismissStuckHint && (
                  <button
                    onClick={onDismissStuckHint}
                    className="text-amber-300 hover:text-white font-bold px-1.5 cursor-pointer shrink-0"
                  >
                    Got it
                  </button>
                )}
              </div>
            )}

            {showHint && (
              <div className="bg-[#0f172a]/95 border border-sky-400/35 rounded-xl px-3.5 py-2 text-xs text-sky-100 shadow-lg">
                {hintText}
              </div>
            )}

            {/* Resource & Discovery Explanation Toasts */}
            {resourceToasts.length > 0 && (
              <div className="space-y-1">
                {resourceToasts.slice(0, 2).map((toast) => (
                  <div
                    key={toast.id}
                    className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold shadow-md ${
                      toast.tone === 'positive'
                        ? 'bg-emerald-950/92 border-emerald-400/40 text-emerald-200'
                        : toast.tone === 'warning'
                          ? 'bg-amber-950/92 border-amber-400/40 text-amber-200'
                          : 'bg-slate-900/92 border-sky-400/35 text-sky-200'
                    }`}
                  >
                    {toast.text}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top-Right: Utilities + Crew Assistant + Tool Belt + Crew Switcher */}
          <div className="pointer-events-auto flex flex-col items-end gap-1.5 shrink-0 ml-auto">
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <button
                onClick={onOpenSupplies}
                title="Colony Supply & Cargo Resupply"
                className="flex items-center gap-1.5 bg-amber-500/95 hover:bg-amber-400 text-slate-950 rounded-xl px-2.5 py-2 font-bold text-xs cursor-pointer min-h-[38px]"
              >
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Supplies</span>
                {cargoDelivery.phase !== 'IDLE' && cargoDelivery.phase !== 'DELIVERED' && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-950/20 text-[10px] font-mono-num">
                    {Math.max(1, Math.ceil(cargoDelivery.etaSec))}s
                  </span>
                )}
              </button>

              <button
                onClick={onOpenCrewAssistant}
                title="View Autonomous Crew Schedule & Tips"
                className="flex items-center gap-1.5 bg-orange-500/95 hover:bg-orange-400 text-slate-950 rounded-xl px-2.5 py-2 font-bold text-xs cursor-pointer min-h-[38px]"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Crew</span>
              </button>

              <button
                onClick={onOpenNasaData}
                title="NASA Space Science Data"
                className="flex items-center gap-1.5 bg-[#0b1222]/92 hover:bg-slate-800 border border-sky-400/35 rounded-xl px-2.5 py-2 text-sky-300 font-bold text-xs cursor-pointer min-h-[38px]"
              >
                <Satellite className="w-4 h-4" />
                <span className="hidden md:inline">NASA Data</span>
              </button>

              <button
                onClick={onOpenBadges}
                title="Rewards, Badges &amp; Field Journal"
                className="flex items-center gap-1.5 bg-[#0b1222]/92 hover:bg-slate-800 border border-white/15 rounded-xl px-2.5 py-2 text-amber-300 font-bold text-xs cursor-pointer min-h-[38px]"
              >
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-mono-num">{starsEarned}</span>
                <span className="text-slate-500">·</span>
                <span className="font-mono-num text-sky-300">{totalPoints} pts</span>
              </button>

              <button
                onClick={onToggleHint}
                title="Show Hint"
                className={`p-2 rounded-xl border transition-colors cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center ${
                  showHint
                    ? 'bg-sky-500 text-slate-950 border-sky-400'
                    : 'bg-[#0b1222]/92 hover:bg-slate-800 text-slate-200 border-white/15'
                }`}
              >
                <HelpCircle className="w-4 h-4" />
              </button>

              {onToggleRadar && (
                <button
                  onClick={onToggleRadar}
                  title="Toggle Contextual Radar (M)"
                  className={`flex items-center gap-1 px-2.5 py-2 rounded-xl border text-xs font-bold cursor-pointer min-h-[38px] ${
                    radarOpen
                      ? 'bg-sky-500 text-slate-950 border-sky-400'
                      : 'bg-[#0b1222]/92 hover:bg-slate-800 border-white/15 text-slate-200'
                  }`}
                >
                  <Compass className="w-4 h-4" />
                  <span className="hidden lg:inline">Radar</span>
                </button>
              )}

              <button
                onClick={onOpenMap}
                title="Full Mars Exploration Map"
                className="p-2 rounded-xl bg-[#0b1222]/92 hover:bg-slate-800 border border-white/15 text-slate-200 cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center text-xs font-bold"
              >
                Map
              </button>

              {onOpenControlsHelp && (
                <button
                  onClick={onOpenControlsHelp}
                  title="Controls Help"
                  className="px-2.5 py-2 rounded-xl bg-[#0b1222]/92 hover:bg-slate-800 border border-white/15 text-sky-200 cursor-pointer min-h-[38px] flex items-center justify-center text-xs font-bold"
                >
                  Controls
                </button>
              )}

              <button
                onClick={onToggleMute}
                title={muted ? 'Unmute Sound' : 'Mute Sound'}
                className="p-2 rounded-xl bg-[#0b1222]/92 hover:bg-slate-800 border border-white/15 text-slate-200 cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center"
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {onBack && (
                <button
                  onClick={onBack}
                  title="Back to Menu (Saves Progress)"
                  aria-label="Back"
                  className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[#0b1222]/92 hover:bg-slate-800 border border-white/15 text-slate-200 font-bold text-xs cursor-pointer min-h-[38px]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back</span>
                </button>
              )}

              <button
                onClick={onPause}
                title="Pause (Esc)"
                className="p-2 rounded-xl bg-[#0b1222]/92 hover:bg-slate-800 border border-white/15 text-slate-200 cursor-pointer min-w-[38px] min-h-[38px] flex items-center justify-center"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>

            {/* Exploration Tool Belt */}
            <div className="bg-[#0b1222]/92 border border-white/15 rounded-xl p-1 flex items-center gap-1 shadow-lg">
              {TOOL_BUTTONS.map((tb) => {
                const Icon = tb.icon;
                const active =
                  tb.id === 'flashlight'
                    ? flashlightOn
                    : tb.id === 'drone'
                      ? droneActive
                      : activeTool === tb.id;
                return (
                  <button
                    key={tb.id}
                    onClick={() => {
                      if (tb.id === 'flashlight') onToggleFlashlight();
                      else onSelectTool(tb.id);
                    }}
                    title={tb.label}
                    className={`px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-bold transition-colors cursor-pointer min-h-[32px] ${
                      active
                        ? 'bg-sky-500 text-slate-950'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">{tb.label}</span>
                  </button>
                );
              })}

              {droneActive && (
                <button
                  onClick={onToggleDroneCamera}
                  title="Toggle Aerial Drone Camera"
                  className={`px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-bold cursor-pointer min-h-[32px] ${
                    droneCameraView
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-amber-200 hover:bg-slate-700'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Drone Cam</span>
                </button>
              )}
            </div>

            {/* Single Playable Hero (Alex) + Autonomous Crew Status Bar */}
            <div className="bg-[#0b1222]/92 border border-white/15 rounded-xl p-1 flex items-center gap-1 shadow-lg">
              <div
                title="Alex · You control Alex directly across Mars"
                className="px-2 py-1 rounded-lg flex items-center gap-1.5 text-[11px] font-bold bg-orange-500 text-slate-950 min-h-[30px]"
              >
                <AstronautPortrait id="alex" className="w-4 h-4 rounded-md shrink-0" />
                <span className="hidden sm:inline">Alex · You</span>
              </div>

              {CREW_NPC_ORDER.filter(
                (cid) => !unlockedCrewIds || unlockedCrewIds.includes(cid),
              ).map((cid) => {
                const prof = CHARACTERS_INFO[cid];
                const st = telemetry?.npcStatuses.find((n) => n.id === cid);
                const locName = st ? getStructureDisplayName(st.buildingId).split(' ')[0] : '';
                return (
                  <button
                    key={cid}
                    onClick={onOpenCrewAssistant}
                    title={`${prof.name} (${prof.role}): ${st?.taskLabel ?? prof.specialtyTip ?? ''}`}
                    className="px-1.5 py-1 rounded-lg flex items-center gap-1 text-[10px] font-bold text-slate-200 hover:bg-slate-800 cursor-pointer min-h-[30px]"
                  >
                    <AstronautPortrait id={cid} className="w-4 h-4 rounded-md shrink-0" />
                    <span className="hidden lg:inline">{prof.name}</span>
                    {locName && (
                      <span className="hidden xl:inline text-[9px] text-sky-300 font-normal">
                        · {locName}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {telemetry && radarOpen && (
              <MinimapHUD
                telemetry={telemetry}
                missionId={missionId}
                drivingRover={drivingRover}
                resolvedRovers={resolvedRovers}
                discoveredLandmarks={discoveredLandmarks}
                unlockedCrewIds={unlockedCrewIds}
                activeOptionalIds={activeOptionalIds}
                activeTargetPos={activeTargetPos}
                activeTargetLabel={activeTargetLabel}
                activeRoute={activeRoute}
                onClearRoute={onClearRoute}
                evGuideActive={evGuideActive}
                expanded={radarExpanded}
                paused={mapOpen}
                onToggleExpand={() => onToggleRadarExpand?.()}
                onClose={() => onToggleRadar?.()}
                onOpenFullMap={onOpenMap}
              />
            )}
          </div>
        </div>
      )}

      {/* Scene 1 Space Title Overlay */}
      {screen === 'cinematic_space' && (
        <div className="flex items-start justify-between p-6 sm:p-8 z-10">
          <div>
            <div className="text-xs font-bold tracking-widest uppercase text-orange-400">
              Chapter 1 · Journey To The Red Planet
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-bold text-white mt-1">
              Junior Astronaut Mission Trainer
            </h2>
          </div>
          {onSkipIntro && (
            <button
              onClick={onSkipIntro}
              className="pointer-events-auto px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/20 text-xs font-semibold text-slate-200 cursor-pointer"
            >
              Skip Intro
            </button>
          )}
        </div>
      )}

      {screen === 'cinematic_landing' && onSkipIntro && (
        <div className="flex justify-end p-6 z-10">
          <button
            onClick={onSkipIntro}
            className="pointer-events-auto px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/20 text-xs font-semibold text-slate-200 cursor-pointer"
          >
            Skip Intro
          </button>
        </div>
      )}

      {/* BOTTOM AREA */}
      <div className="p-3 sm:p-5 flex flex-col items-center gap-2 z-10 mt-auto">
        {currentLine ? (
          <div className="pointer-events-auto w-full max-w-2xl bg-[#0c1426]/95 border-2 border-white/15 rounded-2xl p-4 shadow-2xl flex items-center gap-3 sm:gap-4">
            <AstronautPortrait id={currentLine.avatar} className="w-14 h-14 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="font-display font-bold text-white text-sm sm:text-base">
                  {currentLine.speaker}
                </span>
                <span className="text-xs text-sky-300 font-medium">{currentLine.role}</span>
              </div>
              <p className="text-slate-100 text-sm sm:text-base leading-relaxed mt-1">
                {currentLine.text}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={onAdvanceDialogue}
                className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs sm:text-sm shrink-0 cursor-pointer flex items-center gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : isAutomatedIntro && cutsceneCaption ? (
          <div className="pointer-events-auto px-5 py-3 rounded-2xl bg-[#0b1222]/95 border border-sky-400/40 text-sm sm:text-base font-bold text-white shadow-2xl mb-6 text-center max-w-xl">
            {cutsceneCaption}
          </div>
        ) : evTransitionState !== 'idle' && screen === 'playing' && !recapOpen ? (
          <div className="pointer-events-auto px-5 py-3 rounded-2xl bg-[#0b1222]/95 border-2 border-amber-400/50 text-sm sm:text-base font-bold text-white shadow-2xl mb-6 text-center max-w-xl">
            {evTransitionState === 'entering'
              ? 'Opening EV hatch & stepping into the driver seat...'
              : 'Parking EV safely & stepping outside...'}
          </div>
        ) : (isDriveIntro || drivingRover) && screen === 'playing' && !isAutomatedIntro && !recapOpen ? (
          /* UNIFIED KID-FRIENDLY EV DRIVING CONTROLS, TUTORIAL & ARRIVAL ZONE EXIT */
          <div className="w-full flex flex-col items-center gap-2">
            {/* Simple First-Time Driving Tutorial Banner */}
            {!isDriveIntro && (evTutorialStep === 'accel' || evTutorialStep === 'steer') && (
              <div className="pointer-events-auto w-full max-w-2xl bg-[#0b1222]/96 border-2 border-amber-400/70 rounded-2xl px-4 py-3 shadow-2xl flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-extrabold text-amber-300">
                    {evTutorialStep === 'accel'
                      ? 'EV Driving Lesson 1 of 2: Move Forward!'
                      : 'EV Driving Lesson 2 of 2: Steer Gently!'}
                  </span>
                  {onDismissEvTutorial && (
                    <button
                      onClick={onDismissEvTutorial}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-[11px] font-bold text-slate-200 cursor-pointer"
                    >
                      Got it!
                    </button>
                  )}
                </div>
                <p className="text-xs sm:text-sm font-semibold text-white">
                  {evTutorialStep === 'accel'
                    ? 'Hold W / Up Arrow (or the glowing Drive! pedal) to roll forward a short distance.'
                    : 'While moving, hold A / D or Left / Right Arrows (or the Left / Right pedals) to steer gently!'}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                  <span
                    className={`px-2 py-0.5 rounded-md border ${
                      evTutorialStep === 'accel'
                        ? 'bg-emerald-500 text-slate-950 border-white'
                        : 'bg-slate-900 text-emerald-300 border-emerald-400/35'
                    }`}
                  >
                    W / ↑ Accelerate
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-900 text-red-200 border border-red-400/35">
                    S / ↓ Brake / Reverse
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md border ${
                      evTutorialStep === 'steer'
                        ? 'bg-amber-400 text-slate-950 border-white'
                        : 'bg-slate-900 text-amber-200 border-amber-400/35'
                    }`}
                  >
                    A D / ← → Steer
                  </span>
                  <button
                    onClick={onOpenMap}
                    className="px-2 py-0.5 rounded-md bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/40 cursor-pointer"
                  >
                    Map: View Destination
                  </button>
                </div>
              </div>
            )}

            {/* Arrival Zone Notification & Exit Prompt */}
            {!isDriveIntro && evArrivedAtZone && (
              <div className="pointer-events-auto flex flex-col items-center gap-1.5">
                <div className="px-4 py-1.5 rounded-xl bg-emerald-950/95 border border-emerald-400/70 text-xs sm:text-sm font-extrabold text-emerald-200 shadow-lg">
                  Great! We reached {evDestinationName ?? 'the research site'}!
                </div>
                {evCanExitAtZone ? (
                  <button
                    onClick={() => (onExitVehicle ? onExitVehicle() : onToggleRover())}
                    className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 border-2 border-white text-slate-950 font-extrabold text-sm shadow-2xl flex items-center gap-2 cursor-pointer min-h-[48px]"
                  >
                    <span className="px-2 py-0.5 rounded-md bg-slate-950 text-emerald-300 font-mono-num text-xs font-extrabold">
                      E / Tap
                    </span>
                    <span>Press E / Tap to Exit EV</span>
                  </button>
                ) : (
                  <div className="px-4 py-1.5 rounded-xl bg-[#0b1222]/95 border border-amber-400/60 text-xs font-bold text-amber-200 shadow-lg">
                    Hold S / ↓ (or Brake) to stop inside the green ring, then press E to step out!
                  </div>
                )}
              </div>
            )}

            <div className="w-full flex items-end justify-between gap-3">
              {/* Bottom-Left: Steer Left & Steer Right */}
              {touchControlsMode !== 'off' ? (
                <div className="pointer-events-auto flex items-center gap-2 shrink-0">
                  <button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                      setDriveControl({ left: true });
                    }}
                    onPointerUp={() => setDriveControl({ left: false })}
                    onPointerCancel={() => setDriveControl({ left: false })}
                    aria-label="Steer Left"
                    className={`touch-none w-16 h-16 sm:w-18 sm:h-18 rounded-2xl border-2 flex flex-col items-center justify-center text-xs font-extrabold shadow-xl cursor-pointer ${
                      driveButtonsActive.left
                        ? 'bg-orange-500 border-white text-slate-950'
                        : evTutorialStep === 'steer'
                          ? 'bg-amber-500/35 border-amber-300 ring-2 ring-amber-300 text-white'
                          : 'bg-[#0b1222]/92 border-white/25 text-white'
                    }`}
                  >
                    <ArrowLeft className="w-6 h-6" />
                    <span>Left</span>
                  </button>
                  <button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                      setDriveControl({ right: true });
                    }}
                    onPointerUp={() => setDriveControl({ right: false })}
                    onPointerCancel={() => setDriveControl({ right: false })}
                    aria-label="Steer Right"
                    className={`touch-none w-16 h-16 sm:w-18 sm:h-18 rounded-2xl border-2 flex flex-col items-center justify-center text-xs font-extrabold shadow-xl cursor-pointer ${
                      driveButtonsActive.right
                        ? 'bg-orange-500 border-white text-slate-950'
                        : evTutorialStep === 'steer'
                          ? 'bg-amber-500/35 border-amber-300 ring-2 ring-amber-300 text-white'
                          : 'bg-[#0b1222]/92 border-white/25 text-white'
                    }`}
                  >
                    <ArrowRight className="w-6 h-6" />
                    <span>Right</span>
                  </button>
                </div>
              ) : (
                <div />
              )}

              {/* Bottom-Center: EV Instrument Strip */}
              <div className="pointer-events-auto flex flex-col items-center gap-1.5">
                {isDriveIntro ? (
                  <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-[#0b1222]/92 border border-white/20 text-xs font-bold text-white shadow-xl">
                    <span className="font-mono-num text-orange-300">
                      {telemetry?.vehicleSpeedKmh ?? 0} km/h
                    </span>
                    <span className="text-slate-600">|</span>
                    <span className="font-mono-num text-sky-200">{campDistM} m to Colony</span>
                    <button
                      onClick={onOpenMap}
                      className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold cursor-pointer"
                    >
                      Map
                    </button>
                  </div>
                ) : (
                  telemetry && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 rounded-2xl bg-[#0b1222]/94 border border-orange-400/45 text-[11px] font-bold text-white shadow-xl max-w-[92vw]">
                      <span className="font-mono-num text-orange-300">
                        {telemetry.vehicleSpeedKmh} km/h
                      </span>
                      <span className="text-slate-600">|</span>
                      <span
                        className={`flex items-center gap-1 font-mono-num ${
                          telemetry.vehicleBatteryPct < 25 ? 'text-red-400' : 'text-emerald-300'
                        }`}
                      >
                        <BatteryCharging className="w-3.5 h-3.5" />
                        {telemetry.vehicleBatteryPct}%
                      </span>
                      <span className="hidden md:inline font-mono-num text-cyan-200">
                        Safe {telemetry.vehicleSafeRangeM}m
                      </span>
                      {telemetry.vehicleInChargingBay && onOpenChargingStation && (
                        <button
                          onClick={onOpenChargingStation}
                          className="px-2 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-[10px] font-extrabold cursor-pointer"
                        >
                          Charge Bay
                        </button>
                      )}
                      <button
                        onClick={onToggleVehicleCam}
                        title="Switch Interior Cockpit / Chase Camera (V)"
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer ${
                          vehicleCamMode === 'interior'
                            ? 'bg-sky-500 text-slate-950'
                            : 'bg-slate-800 text-sky-200 hover:bg-slate-700'
                        }`}
                      >
                        <Video className="w-3 h-3" />
                        {vehicleCamMode === 'interior' ? 'Cockpit (V)' : 'Chase (V)'}
                      </button>
                      <button
                        onClick={onToggleVehicleHeadlights}
                        title="Toggle Vehicle Headlights (F)"
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer ${
                          vehicleHeadlights
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                        }`}
                      >
                        <Flashlight className="w-3 h-3" /> Lights
                      </button>
                      <button
                        onClick={onOpenMap}
                        className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-[10px] font-extrabold cursor-pointer"
                      >
                        Map
                      </button>
                      {onOpenControlsHelp && (
                        <button
                          onClick={onOpenControlsHelp}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold cursor-pointer"
                        >
                          ? Help
                        </button>
                      )}
                      <button
                        onClick={() => (onExitVehicle ? onExitVehicle() : onToggleRover())}
                        title="Exit Exploration Vehicle (E or R)"
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer ${
                          evCanExitAtZone
                            ? 'bg-emerald-400 text-slate-950'
                            : 'bg-orange-500 hover:bg-orange-400 text-slate-950'
                        }`}
                      >
                        Exit EV (E)
                      </button>
                    </div>
                  )
                )}
                <div className="hidden md:block text-[11px] text-slate-200/85 font-medium">
                  W/↑ Drive · S/↓ Brake/Reverse · A/D Steer · V Cockpit · E/R Exit EV
                </div>
              </div>

              {/* Bottom-Right: Brake & Accelerate */}
              {touchControlsMode !== 'off' ? (
                <div className="pointer-events-auto flex items-center gap-2 shrink-0">
                  <button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                      setDriveControl({ brake: true });
                    }}
                    onPointerUp={() => setDriveControl({ brake: false })}
                    onPointerCancel={() => setDriveControl({ brake: false })}
                    aria-label="Brake or Reverse"
                    className={`touch-none w-16 h-16 sm:w-18 sm:h-18 rounded-2xl border-2 flex flex-col items-center justify-center text-xs font-extrabold shadow-xl cursor-pointer ${
                      driveButtonsActive.brake
                        ? 'bg-red-500 border-white text-white'
                        : 'bg-[#0b1222]/92 border-red-400/50 text-red-200'
                    }`}
                  >
                    <ArrowDown className="w-6 h-6" />
                    <span>Brake</span>
                  </button>
                  <button
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                      setDriveControl({ accel: true });
                    }}
                    onPointerUp={() => setDriveControl({ accel: false })}
                    onPointerCancel={() => setDriveControl({ accel: false })}
                    aria-label="Accelerate"
                    className={`touch-none w-20 h-18 sm:w-22 sm:h-20 rounded-2xl border-2 flex flex-col items-center justify-center text-xs font-extrabold shadow-xl cursor-pointer ${
                      driveButtonsActive.accel
                        ? 'bg-emerald-400 border-white text-slate-950'
                        : evTutorialStep === 'accel'
                          ? 'bg-emerald-400 border-white ring-4 ring-emerald-300/70 text-slate-950'
                          : 'bg-emerald-500/95 border-emerald-200 text-slate-950'
                    }`}
                  >
                    <ArrowUp className="w-6 h-6" />
                    <span>Drive!</span>
                  </button>
                </div>
              ) : (
                <div />
              )}
            </div>
          </div>
        ) : (
          screen === 'playing' &&
          !isAutomatedIntro &&
          !recapOpen && (
            <div className="w-full flex items-end justify-between gap-3">
              {/* Bottom-Left: Touch-Friendly Virtual Movement Joystick */}
              {touchControlsMode !== 'off' ? (
                <div
                  ref={joyRef}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    joyActiveRef.current = true;
                    updateJoystick(e.clientX, e.clientY);
                  }}
                  onPointerMove={(e) => {
                    if (!joyActiveRef.current) return;
                    e.stopPropagation();
                    updateJoystick(e.clientX, e.clientY);
                  }}
                  onPointerUp={(e) => {
                    e.stopPropagation();
                    resetJoystick();
                  }}
                  onPointerCancel={resetJoystick}
                  className="pointer-events-auto touch-none select-none w-26 h-26 sm:w-28 sm:h-28 rounded-full bg-[#0b1222]/80 border-2 border-white/20 relative flex items-center justify-center shadow-xl cursor-grab active:cursor-grabbing shrink-0"
                  aria-label="Move Astronaut Joystick"
                >
                  <div className="w-14 h-14 rounded-full border border-white/10 pointer-events-none" />
                  <div
                    className="w-10 h-10 rounded-full bg-orange-500 border-2 border-white/75 shadow-lg pointer-events-none absolute"
                    style={{
                      transform: `translate(${joyOffset.x}px, ${joyOffset.y}px)`,
                    }}
                  />
                </div>
              ) : (
                <div />
              )}

              {/* Center Prompt (Mission Node / Guided EV Boarding / Nearby Action) */}
              <div className="flex flex-col items-center gap-1.5 mb-1">
                {nearbySpec ? (
                  <button
                    onClick={onInteractNearby}
                    className="pointer-events-auto px-4 sm:px-5 py-2.5 rounded-2xl bg-[#0b1222]/95 hover:bg-slate-800 border-2 border-amber-400 text-white font-bold text-xs sm:text-sm shadow-xl flex items-center gap-2 cursor-pointer min-h-[48px]"
                  >
                    <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-mono-num text-xs font-extrabold">
                      E
                    </span>
                    <span>{nearbySpec.promptAction}</span>
                  </button>
                ) : telemetry?.nearRoverToBoard && evGuideActive ? (
                  <div className="pointer-events-auto flex flex-col items-center gap-1.5">
                    <div className="px-3.5 py-1 rounded-xl bg-[#0b1222]/95 border border-amber-400/60 text-xs font-bold text-amber-200 shadow-lg">
                      Here is our exploration vehicle!
                    </div>
                    {evBatteryEmpty && onEmergencyEvBoost ? (
                      <button
                        onClick={onEmergencyEvBoost}
                        className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 border-2 border-white text-slate-950 font-extrabold text-xs sm:text-sm shadow-2xl flex items-center gap-2 cursor-pointer min-h-[48px]"
                      >
                        <Zap className="w-4 h-4" />
                        <span>EV Battery Empty! Solar Reserve Boost (+25%)</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => (onBoardVehicle ? onBoardVehicle() : onToggleRover())}
                        className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 border-2 border-white text-slate-950 font-extrabold text-sm shadow-2xl flex items-center gap-2 cursor-pointer min-h-[48px]"
                      >
                        <Car className="w-5 h-5" />
                        <span>Press E / Tap to Enter</span>
                      </button>
                    )}
                  </div>
                ) : nearbyContextAction ? (
                  <button
                    onClick={nearbyContextAction.onClick}
                    className="pointer-events-auto px-4 sm:px-5 py-2.5 rounded-2xl bg-[#0b1222]/95 hover:bg-slate-800 border-2 border-sky-400 text-white font-bold text-xs sm:text-sm shadow-xl flex items-center gap-2 cursor-pointer min-h-[48px]"
                  >
                    <span className="px-2 py-0.5 rounded-md bg-sky-400 text-slate-950 font-mono-num text-xs font-extrabold">
                      {nearbyContextAction.badge}
                    </span>
                    <span>{nearbyContextAction.label}</span>
                  </button>
                ) : activeTool === 'signal_detector' && telemetry?.nearestLostRover ? (
                  <div className="px-3.5 py-1.5 rounded-xl bg-[#0b1222]/90 border border-orange-400/40 text-[11px] font-bold text-orange-200 font-mono-num shadow-lg">
                    Signal: {telemetry.nearestLostRover.id.toUpperCase()} ·{' '}
                    {telemetry.nearestLostRover.distance}m @ {telemetry.nearestLostRover.bearingDeg}°
                  </div>
                ) : (
                  <div className="hidden md:block text-[11px] text-slate-200/80 font-medium drop-shadow text-center">
                    WASD Walk · Space Jump · E Interact · R Enter Vehicle · T Talk Crew · Q Use Tool
                  </div>
                )}
              </div>

              {/* Bottom-Right: Touch Action Buttons (Use Tool, EV, Crouch, Sprint, Jump) */}
              <div className="pointer-events-auto flex items-end gap-1.5 sm:gap-2 shrink-0">
                {telemetry?.nearRoverToBoard && (
                  <button
                    onClick={() => (onBoardVehicle ? onBoardVehicle() : onToggleRover())}
                    aria-label="Enter Exploration Vehicle"
                    className="touch-none w-13 h-13 rounded-2xl border-2 bg-amber-400 border-white text-slate-950 flex flex-col items-center justify-center text-[10px] font-extrabold shadow-lg cursor-pointer"
                  >
                    <Car className="w-4 h-4" />
                    <span>Enter</span>
                  </button>
                )}

                <button
                  onClick={onUseTool}
                  aria-label="Use Active Tool"
                  className="touch-none w-12 h-12 rounded-2xl bg-sky-600/90 active:bg-sky-400 border-2 border-sky-200/70 text-white flex flex-col items-center justify-center text-[9px] font-bold shadow-lg cursor-pointer"
                >
                  <Scan className="w-4 h-4" />
                  <span>Use</span>
                </button>

                <button
                  onClick={onToggleCrouch}
                  aria-label="Toggle Crouch"
                  className={`touch-none w-12 h-12 rounded-2xl border-2 flex flex-col items-center justify-center text-[9px] font-bold shadow-lg cursor-pointer ${
                    crouched
                      ? 'bg-emerald-500 border-emerald-200 text-slate-950'
                      : 'bg-[#0b1222]/85 border-white/20 text-slate-200'
                  }`}
                >
                  <ArrowDown className="w-4 h-4" />
                  <span>Duck</span>
                </button>

                <button
                  onClick={() => {
                    const next = !sprintLocked;
                    setSprintLocked(next);
                    onTouchSprintChange(next);
                  }}
                  aria-label="Toggle Sprint"
                  className={`touch-none w-12 h-12 rounded-2xl border-2 flex flex-col items-center justify-center text-[9px] font-bold shadow-lg cursor-pointer ${
                    sprintLocked
                      ? 'bg-sky-500 border-sky-200 text-slate-950'
                      : 'bg-[#0b1222]/85 border-white/20 text-slate-200'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>Run</span>
                </button>

                <button
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onTouchJump();
                  }}
                  aria-label="Mars Jump"
                  className="touch-none w-13 h-13 rounded-2xl bg-[#0b1222]/85 active:bg-orange-500 border-2 border-white/25 text-white flex flex-col items-center justify-center text-[10px] font-bold shadow-lg cursor-pointer"
                >
                  <ArrowUp className="w-5 h-5" />
                  <span>Jump</span>
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};
