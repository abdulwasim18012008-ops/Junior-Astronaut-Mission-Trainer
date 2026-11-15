import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChargingStationModal } from './components/ChargingStationModal';
import { CinematicOverlay } from './components/CinematicOverlay';
import { EquipmentPanelModal } from './components/EquipmentPanels';
import {
  AdventureFinaleScreen,
  BaseMapModal,
  ControlsHelpModal,
  CreditsModal,
  CrewAssistantModal,
  HandbookModal,
  MissionFailedModal,
  MissionSelectModal,
  NasaDataModal,
  PauseModal,
  SettingsModal,
} from './components/Modals';
import { SupplyLogisticsModal } from './components/SupplyLogisticsModal';
import { LearningRecapModal } from './components/LearningRecapModal';
import { OptionalTaskTrackerItem } from './components/QuestTrackerPanel';
import { TitleScreen } from './components/TitleScreen';
import { WeatherStationModal } from './components/WeatherStationModal';
import {
  BASE_BUILDINGS,
  CAMPAIGN_MISSIONS,
  CHARACTERS_INFO,
  DELAYED_NOVA_MESSAGES,
  ENDING_CELEBRATION_LINES,
  INTERACTIVE_NODES,
  LANDING_PAD_POS,
} from './game/adventureStory';
import {
  getMevHatchWorldPos,
  REMOTE_MEV_START,
  REMOTE_SITE_POS,
  RESEARCH_CAMP_PARKING_POS,
} from './game/colonyExpansion';
import { resolveCharacterCollisions } from './game/colonyLayout';
import { getCrewInteractionDialogue } from './game/crewAI';
import {
  BADGE_CATALOG,
  LEARNING_RECAPS,
  OPTIONAL_TASKS,
  REWARD_POINTS,
} from './game/learningRecaps';
import {
  BASE_SOL_PROGRESS_PER_SEC,
  CARGO_LANDING_PAD_POS,
  CHARGING_CONSOLE_POS,
  pickNextWeather,
  STORM_STAGE_SPECS,
  SUPPLY_BUNDLES,
  WEATHER_SPECS,
  weatherToStormStage,
} from './game/marsConfig';
import { MarsColonyEngine } from './game/MarsColonyEngine';
import { computeNavigationRoute, distanceToRoute } from './game/navigation';
import {
  EXPANSION_PODS,
  LOST_ROVERS,
  LostRoverSpec,
  MARS_ANOMALIES,
  MARS_LANDMARKS,
} from './game/roversData';
import { soundEngine } from './game/soundEngine';
import {
  AstronautActionAnim,
  BuildingId,
  CargoDeliveryState,
  CrewNpcId,
  DialogueLine,
  EnvironmentTelemetry,
  EquipmentPanelType,
  EvTransitionState,
  EvTutorialStep,
  ExplorationToolId,
  FieldJournalEntry,
  GameScreen,
  GameSettings,
  InteractiveNodeId,
  IntroPhase,
  LostRoverId,
  MissionCheckpoint,
  MissionStatus,
  NavigationRoute,
  OptionalTaskSpec,
  ResourceToast,
  RewardToastEvent,
  StormStage,
  SupplyBundleId,
  SurvivalResources,
  VehicleCameraMode,
  WeatherType,
  WorldVisualState,
} from './game/types';

const STORAGE_KEY = 'junior_astronaut_adventure_save_v5';

const DEFAULT_SETTINGS: GameSettings = {
  musicEnabled: true,
  sfxEnabled: true,
  volume: 0.65,
  cameraSpeed: 1.0,
  solTimeScale: 1,
  touchControlsMode: 'auto',
  showMinimap: true,
};

const INITIAL_RESOURCES: SurvivalResources = {
  air: 100,
  water: 100,
  power: 100,
  food: 90,
  crewCondition: 100,
  spareParts: 10,
  samplesCollected: 0,
};

const INITIAL_CARGO_DELIVERY: CargoDeliveryState = {
  phase: 'IDLE',
  bundleId: null,
  bundleName: '',
  etaSec: 0,
  phaseProgress: 0,
  requestedSol: 1,
  deliveredCount: 0,
};

const INITIAL_WORLD: WorldVisualState = {
  screen: 'title',
  cameraMode: 'space_orbit',
  cutsceneTarget: null,
  cutsceneEyeOffset: null,
  missionId: 0,
  activeNodeIds: [],
  highlightedBuilding: null,
  activeCharacterId: 'alex',
  insideBuildingId: null,
  o2AlarmActive: false,
  o2FanSpinning: true,
  oxygenGeneratorRepaired: false,
  waterLeakActive: false,
  waterValveClosed: false,
  waterPuddleVisible: false,
  powerBlackout: false,
  solarDusty: false,
  cableSparking: false,
  plantsWilting: false,
  tomatoesRipe: false,
  gardenStage: 2,
  stormShuttersClosed: false,
  shelterDoorsClosed: false,
  outdoorGearSecured: false,
  stormWarningActive: false,
  stormWarningCountdown: 0,
  shelterShieldLevel: 0,
  radiationDrillActive: false,
  dustStormActive: false,
  stormStage: 1,
  beaconBeamActive: false,
  solProgress: 0.44, // Morning / Early Afternoon Martian sun
  weather: 'Clear',
  flashlightOn: false,
  crouched: false,
  drivingRover: false,
  droneActive: false,
  droneCameraView: false,
  activeTool: 'scanner',
  scanPulseCounter: 0,
  resolvedRoverIds: [],
  discoveredTrackClues: false,
  radioTransmissionPct: 0,
  radioTransmitted: false,
  actionAnim: 'none',
  actionAnimCounter: 0,
  dialogueActive: false,
  landerState: 'orbit',
  novaPresent: false,
  crewMood: 'calm',
  crewFocusPos: null,
  carryingItem: null,
  cargoDelivery: INITIAL_CARGO_DELIVERY,
  vehicleCamMode: 'exterior',
  vehicleHeadlights: false,
  vehicleChargingRequested: false,
  colonyPowerPct: 100,
  talkingNpcId: null,
};

const WEATHER_ORDER: WeatherType[] = [
  'Clear',
  'Light Dust',
  'Windy',
  'Dust Devil',
  'Local Storm',
  'Regional Storm',
  'Severe Storm',
];

interface SavedProgress {
  highestMission: number;
  currentMissionId?: number;
  completedMissions: number[];
  starsEarned: number;
  totalPoints?: number;
  missionStars?: Record<number, number>;
  earnedBadgeIds?: string[];
  completedOptionalIds?: string[];
  pendingRecapMissionId?: number | null;
  pendingNextMissionId?: number | null;
  missionCheckpoints?: Record<number, MissionCheckpoint>;
  resolvedRoverIds?: LostRoverId[];
  discoveredLandmarks?: string[];
  discoveredAnomalies?: string[];
  journalEntries?: FieldJournalEntry[];
  resources?: SurvivalResources;
  solNumber?: number;
  solProgress?: number;
  weather?: WeatherType;
  roverSnapshot?: { x: number; z: number; yaw: number; battery: number };
  deliveredCount?: number;
  receivedNovaMsgs?: number[];
  evTutorialCompleted?: boolean;
}

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<MarsColonyEngine | null>(null);

  const [screen, setScreen] = useState<GameScreen>('title');
  const [missionId, setMissionId] = useState<number>(1);
  const [missionStatus, setMissionStatus] = useState<MissionStatus>('NOT_STARTED');
  const [introPhase, setIntroPhase] = useState<IntroPhase>('none');
  const [cutsceneCaption, setCutsceneCaption] = useState<string | null>(null);
  const [drivingWrongWay, setDrivingWrongWay] = useState<boolean>(false);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const activeCharacterId = 'alex' as const;
  const [insideBuildingId, setInsideBuildingId] = useState<BuildingId | null>(null);
  const [worldPatch, setWorldPatch] = useState<Partial<WorldVisualState>>({});
  const [dialogueQueue, setDialogueQueue] = useState<DialogueLine[]>([]);
  const [pendingActionAfterDialogue, setPendingActionAfterDialogue] = useState<
    null | 'intro_open_relay_panel' | 'm2_board_vehicle' | 'to_finale'
  >(null);
  const introTimersRef = useRef<number[]>([]);
  const minCampDistRef = useRef<number>(999);
  const wrongWayStartRef = useRef<number>(0);

  // Martian Sol, Weather & Exploration State
  const [solProgress, setSolProgress] = useState<number>(0.44);
  const [solNumber, setSolNumber] = useState<number>(1);
  const [weather, setWeather] = useState<WeatherType>('Clear');
  const [stormStageOverride, setStormStageOverride] = useState<StormStage | null>(null);
  const [flashlightOn, setFlashlightOn] = useState<boolean>(false);
  const [crouched, setCrouched] = useState<boolean>(false);
  const [drivingRover, setDrivingRover] = useState<boolean>(false);
  const [vehicleCamMode, setVehicleCamMode] = useState<VehicleCameraMode>('exterior');
  const [vehicleHeadlights, setVehicleHeadlights] = useState<boolean>(false);
  const [talkingNpcId, setTalkingNpcId] = useState<CrewNpcId | 'nova' | null>(null);
  const [pendingNextMissionId, setPendingNextMissionId] = useState<number | null>(null);
  const [receivedNovaMsgs, setReceivedNovaMsgs] = useState<number[]>([]);
  const [cargoDelivery, setCargoDelivery] = useState<CargoDeliveryState>(INITIAL_CARGO_DELIVERY);
  const cargoPhaseTimerRef = useRef<number>(0);
  const lastAlertTimesRef = useRef<Record<string, number>>({});
  const routeRefreshAtRef = useRef<number>(0);
  const offTrackCooldownRef = useRef<number>(0);
  const manualRouteClearedRef = useRef<boolean>(false);
  const customRouteActiveRef = useRef<boolean>(false);
  const lastStepNavKeyRef = useRef<string>('');
  const [offTrackAlert, setOffTrackAlert] = useState<boolean>(false);
  const [liveRouteDistM, setLiveRouteDistM] = useState<number | null>(null);
  const [droneActive, setDroneActive] = useState<boolean>(false);
  const [droneCameraView, setDroneCameraView] = useState<boolean>(false);
  const [activeTool, setActiveTool] = useState<ExplorationToolId>('scanner');
  const [scanPulseCounter, setScanPulseCounter] = useState<number>(0);
  const [actionAnimState, setActionAnimState] = useState<{
    anim: AstronautActionAnim;
    counter: number;
  }>({ anim: 'none', counter: 0 });
  const [photoFlash, setPhotoFlash] = useState<boolean>(false);
  const [telemetry, setTelemetry] = useState<EnvironmentTelemetry | null>(null);

  const [resolvedRoverIds, setResolvedRoverIds] = useState<LostRoverId[]>([]);
  const [activeDiagnosticRover, setActiveDiagnosticRover] = useState<LostRoverSpec | null>(null);
  const [discoveredLandmarks, setDiscoveredLandmarks] = useState<string[]>([]);
  const [discoveredAnomalies, setDiscoveredAnomalies] = useState<string[]>([]);
  const [exploredSectors, setExploredSectors] = useState<string[]>([]);
  const [journalEntries, setJournalEntries] = useState<FieldJournalEntry[]>([]);

  const [activeEquipment, setActiveEquipment] = useState<EquipmentPanelType | null>(null);
  const [nearbyNodeId, setNearbyNodeId] = useState<InteractiveNodeId | null>(null);
  const [showHint, setShowHint] = useState(false);

  const [resources, setResources] = useState<SurvivalResources>(INITIAL_RESOURCES);
  const [resourceToasts, setResourceToasts] = useState<ResourceToast[]>([]);
  const [rewardToasts, setRewardToasts] = useState<RewardToastEvent[]>([]);
  const toastIdRef = useRef(1);
  const rewardToastIdRef = useRef(1);
  const [missionFailedReason, setMissionFailedReason] = useState<{
    title: string;
    detail: string;
  } | null>(null);

  const [savedProgress, setSavedProgress] = useState<SavedProgress | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SavedProgress;
    } catch {
      return null;
    }
  });

  const [completedMissions, setCompletedMissions] = useState<number[]>([]);
  const [starsEarned, setStarsEarned] = useState<number>(0);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [missionStars, setMissionStars] = useState<Record<number, number>>({});
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<string[]>([]);
  const [completedOptionalIds, setCompletedOptionalIds] = useState<string[]>([]);
  const [pendingRecapMissionId, setPendingRecapMissionId] = useState<number | null>(null);
  const [lastMissionPointsAwarded, setLastMissionPointsAwarded] = useState<number>(REWARD_POINTS.MAIN_MISSION);

  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [activeModal, setActiveModal] = useState<
    | 'map'
    | 'badges'
    | 'missions'
    | 'settings'
    | 'credits'
    | 'pause'
    | 'nasa'
    | 'crew'
    | 'supplies'
    | 'controls'
    | null
  >(null);
  const [contextLost, setContextLost] = useState(false);

  // Guided EV Travel State (Find -> Animated Enter -> First-Time Tutorial -> Drive -> Park -> Animated Exit)
  const [evTransitionState, setEvTransitionState] = useState<EvTransitionState>('idle');
  const [evTutorialCompleted, setEvTutorialCompleted] = useState<boolean>(() =>
    Boolean(savedProgress?.evTutorialCompleted),
  );
  const [evTutorialStep, setEvTutorialStep] = useState<EvTutorialStep>('idle');
  const evTimersRef = useRef<number[]>([]);
  const evTutorialCompletedRef = useRef(evTutorialCompleted);
  evTutorialCompletedRef.current = evTutorialCompleted;
  const evMoveAccumMRef = useRef(0);
  const evLastRoverPosRef = useRef<{ x: number; z: number } | null>(null);
  const evSteerAccumSecRef = useRef(0);
  const steerKeysHeldRef = useRef(false);
  const touchSteerHeldRef = useRef(false);
  const evGuidanceToastKeyRef = useRef('');
  const evArrivalToastKeyRef = useRef('');

  const [weatherModalOpen, setWeatherModalOpen] = useState<boolean>(false);
  const [chargingModalOpen, setChargingModalOpen] = useState<boolean>(false);
  const [vehicleChargingRequested, setVehicleChargingRequested] = useState<boolean>(false);
  const [activeRoute, setActiveRoute] = useState<NavigationRoute | null>(null);
  const prevChargingActiveRef = useRef<boolean>(false);
  const [radarExpanded, setRadarExpanded] = useState<boolean>(false);
  const [stuckSeconds, setStuckSeconds] = useState<number>(0);
  const [stuckDismissedKey, setStuckDismissedKey] = useState<string>('');

  const [missionCheckpoints, setMissionCheckpoints] = useState<Record<number, MissionCheckpoint>>(
    () => savedProgress?.missionCheckpoints ?? {},
  );
  const missionCheckpointsRef = useRef(missionCheckpoints);
  missionCheckpointsRef.current = missionCheckpoints;
  const completedMissionsRef = useRef(completedMissions);
  completedMissionsRef.current = completedMissions;
  const missionStarsRef = useRef(missionStars);
  missionStarsRef.current = missionStars;
  const earnedBadgeIdsRef = useRef(earnedBadgeIds);
  earnedBadgeIdsRef.current = earnedBadgeIds;
  const completedOptionalIdsRef = useRef(completedOptionalIds);
  completedOptionalIdsRef.current = completedOptionalIds;
  const totalPointsRef = useRef(totalPoints);
  totalPointsRef.current = totalPoints;
  const starsEarnedRef = useRef(starsEarned);
  starsEarnedRef.current = starsEarned;
  const pendingRecapRef = useRef(pendingRecapMissionId);
  pendingRecapRef.current = pendingRecapMissionId;
  const pendingNextMissionIdRef = useRef(pendingNextMissionId);
  pendingNextMissionIdRef.current = pendingNextMissionId;
  const completingEquipmentRef = useRef(false);

  const pushToast = useCallback((text: string, tone: ResourceToast['tone'] = 'info') => {
    const id = toastIdRef.current++;
    setResourceToasts((prev) => [{ id, text, tone }, ...prev].slice(0, 3));
    window.setTimeout(() => {
      setResourceToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const pushRewardToast = useCallback(
    (
      title: string,
      points: number,
      opts?: { stars?: number; badgeTitle?: string; accentColor?: string },
    ) => {
      const id = rewardToastIdRef.current++;
      setRewardToasts((prev) =>
        [
          {
            id,
            title,
            points,
            stars: opts?.stars,
            badgeTitle: opts?.badgeTitle,
            accentColor: opts?.accentColor,
          },
          ...prev,
        ].slice(0, 2),
      );
      window.setTimeout(() => {
        setRewardToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    [],
  );

  const addJournalEntry = useCallback(
    (entry: Omit<FieldJournalEntry, 'solNumber'>) => {
      setJournalEntries((prev) => {
        if (prev.some((e) => e.id === entry.id)) return prev;
        return [{ ...entry, solNumber }, ...prev].slice(0, 35);
      });
    },
    [solNumber],
  );

  const syncMilestoneBadges = useCallback(
    (nextCompleted: number[], nextOptional: string[], nextDiscoveryCount: number) => {
      const existing = earnedBadgeIdsRef.current;
      const newlyUnlocked: typeof BADGE_CATALOG = [];
      for (const badge of BADGE_CATALOG) {
        if (existing.includes(badge.id)) continue;
        let qualified = false;
        if (badge.unlockType === 'mission') {
          qualified = nextCompleted.includes(badge.unlockValue);
        } else if (badge.unlockType === 'campaign') {
          qualified = nextCompleted.length >= badge.unlockValue;
        } else if (badge.unlockType === 'optional_milestone') {
          qualified = nextOptional.length >= badge.unlockValue;
        } else if (badge.unlockType === 'discovery_milestone') {
          qualified = nextDiscoveryCount >= badge.unlockValue;
        }
        if (qualified) newlyUnlocked.push(badge);
      }
      if (newlyUnlocked.length > 0) {
        const merged = [...existing, ...newlyUnlocked.map((b) => b.id)];
        earnedBadgeIdsRef.current = merged;
        setEarnedBadgeIds(merged);
        const first = newlyUnlocked[0];
        pushRewardToast(`Badge Unlocked: ${first.title}!`, 0, {
          badgeTitle: `${first.icon} ${first.title}`,
          accentColor: first.color,
        });
      }
      return newlyUnlocked;
    },
    [pushRewardToast],
  );

  const awardExplorationPoints = useCallback(
    (points: number, title: string, accentColor = '#38bdf8') => {
      const nextPts = totalPointsRef.current + points;
      totalPointsRef.current = nextPts;
      setTotalPoints(nextPts);
      pushRewardToast(title, points, { accentColor });
    },
    [pushRewardToast],
  );

  const persistSaveSnapshot = useCallback(
    (overrides?: {
      missionId?: number;
      completedMissions?: number[];
      starsEarned?: number;
      totalPoints?: number;
      missionStars?: Record<number, number>;
      earnedBadgeIds?: string[];
      completedOptionalIds?: string[];
      pendingRecapMissionId?: number | null;
      pendingNextMissionId?: number | null;
      missionCheckpoints?: Record<number, MissionCheckpoint>;
      evTutorialCompleted?: boolean;
    }) => {
      const activeMission = overrides?.missionId ?? missionId;
      const doneList = overrides?.completedMissions ?? completedMissionsRef.current;
      const stars = overrides?.starsEarned ?? starsEarnedRef.current;
      const pts = overrides?.totalPoints ?? totalPointsRef.current;
      const mStars = overrides?.missionStars ?? missionStarsRef.current;
      const badges = overrides?.earnedBadgeIds ?? earnedBadgeIdsRef.current;
      const optionals = overrides?.completedOptionalIds ?? completedOptionalIdsRef.current;
      const pendingRecap =
        overrides && 'pendingRecapMissionId' in overrides
          ? overrides.pendingRecapMissionId
          : pendingRecapRef.current;
      const pendingNext =
        overrides && 'pendingNextMissionId' in overrides
          ? overrides.pendingNextMissionId
          : pendingNextMissionIdRef.current;
      const checkpoints = overrides?.missionCheckpoints ?? missionCheckpointsRef.current;
      const evTutDone = overrides?.evTutorialCompleted ?? evTutorialCompletedRef.current;

      if (
        doneList.length === 0 &&
        Object.keys(checkpoints).length === 0 &&
        resolvedRoverIds.length === 0 &&
        discoveredAnomalies.length === 0 &&
        discoveredLandmarks.length === 0 &&
        optionals.length === 0 &&
        pts === 0 &&
        pendingRecap == null &&
        pendingNext == null
      ) {
        return;
      }

      const payload: SavedProgress = {
        highestMission: Math.max(1, activeMission, pendingNext ?? 1, ...(doneList.length ? doneList : [1])),
        currentMissionId: Math.max(1, activeMission),
        completedMissions: doneList,
        starsEarned: stars,
        totalPoints: pts,
        missionStars: mStars,
        earnedBadgeIds: badges,
        completedOptionalIds: optionals,
        pendingRecapMissionId: pendingRecap ?? null,
        pendingNextMissionId: pendingNext ?? null,
        missionCheckpoints: checkpoints,
        resolvedRoverIds,
        discoveredLandmarks,
        discoveredAnomalies,
        journalEntries,
        resources,
        solNumber,
        solProgress,
        weather,
        roverSnapshot: telemetry
          ? {
              x: telemetry.roverX,
              z: telemetry.roverZ,
              yaw: telemetry.roverYaw,
              battery: telemetry.vehicleBatteryPct,
            }
          : savedProgress?.roverSnapshot,
        deliveredCount: cargoDelivery.deliveredCount,
        receivedNovaMsgs,
        evTutorialCompleted: evTutDone,
      };
      setSavedProgress(payload);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // ignore storage errors
      }
    },
    [
      missionId,
      resolvedRoverIds,
      discoveredLandmarks,
      discoveredAnomalies,
      journalEntries,
      resources,
      solNumber,
      solProgress,
      weather,
      telemetry,
      savedProgress?.roverSnapshot,
      cargoDelivery.deliveredCount,
      receivedNovaMsgs,
    ],
  );

  useEffect(() => {
    persistSaveSnapshot();
  }, [persistSaveSnapshot]);

  const currentMission = useMemo(
    () => CAMPAIGN_MISSIONS.find((m) => m.id === missionId) ?? null,
    [missionId],
  );
  const currentStep = useMemo(
    () => (currentMission ? currentMission.steps[stepIndex] ?? null : null),
    [currentMission, stepIndex],
  );
  const rawMissionTarget = useMemo<{
    id: string;
    label: string;
    pos: [number, number];
  } | null>(() => {
    if (pendingNextMissionId !== null) {
      return {
        id: 'cargo_pad',
        label: 'Cargo Pad',
        pos: CARGO_LANDING_PAD_POS,
      };
    }
    if (introPhase === 'drive_to_camp' || missionId === 2) {
      return {
        id: 'research_camp',
        label: 'Ares Colony',
        pos: RESEARCH_CAMP_PARKING_POS,
      };
    }
    if (!currentStep) return null;
    if (missionId === 12 && stepIndex >= 3) {
      const soj = LOST_ROVERS.find((r) => r.id === 'sojourner');
      if (soj) return { id: 'sojourner', label: 'Sojourner Rover', pos: [soj.x, soj.z] };
    }
    if (missionId === 13 && stepIndex >= 1) {
      const sp = LOST_ROVERS.find((r) => r.id === 'spirit');
      if (sp) return { id: 'spirit', label: 'Spirit Rover', pos: [sp.x, sp.z] };
    }
    if (currentStep.activeNodes.length > 0) {
      const n = INTERACTIVE_NODES[currentStep.activeNodes[0]];
      if (n) {
        return {
          id: n.id,
          label: n.label,
          pos: [n.position[0], n.position[2]],
        };
      }
    }
    return null;
  }, [pendingNextMissionId, introPhase, missionId, currentStep, stepIndex]);
  const rawMissionTargetRef = useRef(rawMissionTarget);
  rawMissionTargetRef.current = rawMissionTarget;
  const highestUnlockedMission = useMemo(
    () => Math.max(1, missionId, ...completedMissions, pendingNextMissionId ?? 1),
    [missionId, completedMissions, pendingNextMissionId],
  );
  const unlockedCrewIds = useMemo<CrewNpcId[]>(() => {
    if (introPhase === 'site_inspection' || introPhase === 'relay_repair' || introPhase === 'vehicle_entry' || introPhase === 'drive_to_camp') {
      return [];
    }
    const def = CAMPAIGN_MISSIONS.find((m) => m.id === highestUnlockedMission);
    return def?.unlockedCrewIds ?? [];
  }, [highestUnlockedMission, introPhase]);

  const activeOptionalTasks = useMemo(
    () =>
      OPTIONAL_TASKS.filter(
        (t) =>
          t.unlockMissionId <= highestUnlockedMission &&
          !completedOptionalIds.includes(t.id),
      ),
    [highestUnlockedMission, completedOptionalIds],
  );
  const activeOptionalIds = useMemo(
    () => activeOptionalTasks.map((t) => t.id),
    [activeOptionalTasks],
  );
  const discoveredCount =
    discoveredLandmarks.length + discoveredAnomalies.length + resolvedRoverIds.length;

  // Authoritative WorldVisualState for Three.js Engine
  const visualState: WorldVisualState = useMemo(() => {
    const activeNodes: InteractiveNodeId[] =
      screen === 'playing' &&
      (introPhase === 'none' || introPhase === 'relay_repair' || introPhase === 'drive_to_camp') &&
      dialogueQueue.length === 0 &&
      pendingRecapMissionId === null &&
      missionFailedReason === null &&
      pendingNextMissionId === null &&
      currentStep
        ? currentStep.activeNodes
        : [];

    const firstDialogueFocus = dialogueQueue[0]?.focusTarget ?? null;

    let cameraMode: WorldVisualState['cameraMode'] = 'third_person';
    if (screen === 'title') {
      cameraMode = 'space_orbit';
    } else if (screen === 'cinematic_space') {
      cameraMode = 'space_approach';
    } else if (screen === 'cinematic_landing' || screen === 'cinematic_ending') {
      cameraMode = 'lander_descent';
    } else if (firstDialogueFocus || worldPatch.cutsceneTarget) {
      cameraMode = 'cutscene_focus';
    } else if (droneActive && droneCameraView) {
      cameraMode = 'drone_aerial';
    }

    const resolvedStormStage: StormStage =
      stormStageOverride ??
      worldPatch.stormStage ??
      weatherToStormStage(weather, Boolean(worldPatch.dustStormActive));

    return {
      ...INITIAL_WORLD,
      ...worldPatch,
      introPhase,
      screen,
      cameraMode,
      cutsceneTarget: firstDialogueFocus ?? worldPatch.cutsceneTarget ?? null,
      cutsceneEyeOffset: worldPatch.cutsceneEyeOffset ?? [6.5, 4.2, 8.5],
      missionId,
      activeNodeIds: activeNodes,
      activeCharacterId,
      insideBuildingId,
      solProgress,
      weather,
      stormStage: resolvedStormStage,
      flashlightOn,
      crouched,
      drivingRover,
      alexSeatedInRover:
        worldPatch.alexSeatedInRover ?? (drivingRover && vehicleCamMode !== 'interior'),
      novaSeatedInRover:
        worldPatch.novaSeatedInRover ??
        (introPhase === 'drive_to_camp' && drivingRover),
      droneActive,
      droneCameraView,
      activeTool,
      scanPulseCounter,
      resolvedRoverIds,
      unlockedCrewIds,
      activeOptionalIds,
      completedOptionalIds,
      actionAnim: actionAnimState.anim,
      actionAnimCounter: actionAnimState.counter,
      dialogueActive: dialogueQueue.length > 0,
      crewFocusPos: worldPatch.crewFocusPos ?? currentStep?.crewPos ?? null,
      cargoDelivery,
      vehicleCamMode,
      vehicleHeadlights,
      vehicleChargingRequested,
      colonyPowerPct: resources.power,
      talkingNpcId,
      activeRouteWaypoints: activeRoute?.waypoints ?? null,
      evGuideActive: Boolean(
        screen === 'playing' &&
          introPhase === 'none' &&
          !drivingRover &&
          evTransitionState === 'idle' &&
          pendingNextMissionId === null &&
          pendingRecapMissionId === null &&
          missionFailedReason === null &&
          rawMissionTargetRef.current &&
          telemetry &&
          Math.hypot(
            rawMissionTargetRef.current.pos[0] - telemetry.playerX,
            rawMissionTargetRef.current.pos[1] - telemetry.playerZ,
          ) >= 34 &&
          Math.hypot(
            rawMissionTargetRef.current.pos[0] - telemetry.roverX,
            rawMissionTargetRef.current.pos[1] - telemetry.roverZ,
          ) >= 14 &&
          Math.hypot(telemetry.roverX - telemetry.playerX, telemetry.roverZ - telemetry.playerZ) <=
            Math.hypot(
              rawMissionTargetRef.current.pos[0] - telemetry.playerX,
              rawMissionTargetRef.current.pos[1] - telemetry.playerZ,
            ) +
              15,
      ),
      evArrivalRingPos:
        screen === 'playing' &&
        introPhase === 'none' &&
        drivingRover &&
        rawMissionTargetRef.current &&
        telemetry &&
        Math.hypot(
          rawMissionTargetRef.current.pos[0] - telemetry.roverX,
          rawMissionTargetRef.current.pos[1] - telemetry.roverZ,
        ) <= 42
          ? rawMissionTargetRef.current.pos
          : null,
      evArrivedAtZone: Boolean(
        screen === 'playing' &&
          introPhase === 'none' &&
          drivingRover &&
          rawMissionTargetRef.current &&
          telemetry &&
          Math.hypot(
            rawMissionTargetRef.current.pos[0] - telemetry.roverX,
            rawMissionTargetRef.current.pos[1] - telemetry.roverZ,
          ) <= 11.5,
      ),
    };
  }, [
    screen,
    introPhase,
    missionId,
    currentStep,
    worldPatch,
    dialogueQueue,
    pendingRecapMissionId,
    missionFailedReason,
    pendingNextMissionId,
    activeCharacterId,
    insideBuildingId,
    solProgress,
    weather,
    stormStageOverride,
    flashlightOn,
    crouched,
    drivingRover,
    droneActive,
    droneCameraView,
    activeTool,
    scanPulseCounter,
    resolvedRoverIds,
    unlockedCrewIds,
    activeOptionalIds,
    completedOptionalIds,
    actionAnimState,
    cargoDelivery,
    vehicleCamMode,
    vehicleHeadlights,
    vehicleChargingRequested,
    resources.power,
    talkingNpcId,
    activeRoute,
    evTransitionState,
    telemetry,
  ]);

  // Sync water leak hiss SFX
  useEffect(() => {
    soundEngine.setWaterLeakSound(Boolean(visualState.waterLeakActive && screen === 'playing'));
  }, [visualState.waterLeakActive, screen]);

  // Martian Sol Day/Night Clock & Procedural Weather Evolution
  useEffect(() => {
    if (
      screen !== 'playing' ||
      activeModal === 'pause' ||
      activeEquipment !== null ||
      pendingRecapMissionId !== null ||
      settings.solTimeScale === 0
    ) {
      return;
    }
    const stepMs = 250;
    const deltaPerTick = BASE_SOL_PROGRESS_PER_SEC * settings.solTimeScale * (stepMs / 1000);
    const id = window.setInterval(() => {
      setSolProgress((prev) => {
        const next = prev + deltaPerTick;
        if (next >= 1) {
          setSolNumber((s) => s + 1);
          setWeather((w) => pickNextWeather(w));
          return next - 1;
        }
        return next;
      });
    }, stepMs);
    return () => clearInterval(id);
  }, [screen, activeModal, activeEquipment, pendingRecapMissionId, settings.solTimeScale]);

  // Fog-of-War Sector, Geological Landmark & Mars Anomaly Auto-Discovery (440m grid)
  useEffect(() => {
    if (!telemetry || screen !== 'playing') return;
    const gx = Math.floor((telemetry.playerX + 220) / 55) - 4;
    const gz = Math.floor((telemetry.playerZ + 220) / 55) - 4;
    const key = `${gx},${gz}`;
    setExploredSectors((prev) => (prev.includes(key) ? prev : [...prev, key]));

    for (let i = 0; i < MARS_LANDMARKS.length; i++) {
      const lm = MARS_LANDMARKS[i];
      const d = Math.hypot(telemetry.playerX - lm.x, telemetry.playerZ - lm.z);
      if (d <= lm.discoveryRadius && !discoveredLandmarks.includes(lm.id)) {
        const nextLandmarks = [...discoveredLandmarks, lm.id];
        setDiscoveredLandmarks(nextLandmarks);
        soundEngine.playToolSuccess();
        awardExplorationPoints(
          REWARD_POINTS.NEW_LOCATION,
          `New Location: ${lm.name}`,
          '#14b8a6',
        );
        syncMilestoneBadges(
          completedMissionsRef.current,
          completedOptionalIdsRef.current,
          nextLandmarks.length + discoveredAnomalies.length + resolvedRoverIds.length,
        );
        addJournalEntry({
          id: `lm_${lm.id}`,
          title: lm.name,
          category: 'Landmark',
          summary: lm.scienceFact,
        });
      }
    }

    for (let i = 0; i < MARS_ANOMALIES.length; i++) {
      const an = MARS_ANOMALIES[i];
      const d = Math.hypot(telemetry.playerX - an.x, telemetry.playerZ - an.z);
      if (d <= an.discoveryRadius && !discoveredAnomalies.includes(an.id)) {
        const nextAnomalies = [...discoveredAnomalies, an.id];
        setDiscoveredAnomalies(nextAnomalies);
        soundEngine.playScannerPing();
        setActionAnimState((s) => ({ anim: 'inspect', counter: s.counter + 1 }));
        awardExplorationPoints(
          REWARD_POINTS.HIDDEN_OBJECT,
          `Discovery Found: ${an.name}`,
          '#a855f7',
        );
        syncMilestoneBadges(
          completedMissionsRef.current,
          completedOptionalIdsRef.current,
          discoveredLandmarks.length + nextAnomalies.length + resolvedRoverIds.length,
        );
        addJournalEntry({
          id: `anom_${an.id}`,
          title: an.name,
          category: 'Anomaly',
          summary: `${an.storyNote} (${an.scienceFact})`,
        });
      }
    }
  }, [
    telemetry,
    screen,
    discoveredLandmarks,
    discoveredAnomalies,
    resolvedRoverIds.length,
    awardExplorationPoints,
    syncMilestoneBadges,
    addJournalEntry,
  ]);

  // Clear NPC talk focus once dialogue finishes
  useEffect(() => {
    if (dialogueQueue.length === 0 && talkingNpcId !== null) {
      setTalkingNpcId(null);
    }
  }, [dialogueQueue.length, talkingNpcId]);

  // Vehicle Charging completion + Active Navigation Route arrival & mode sync
  useEffect(() => {
    if (!telemetry || screen !== 'playing') return;

    if (
      prevChargingActiveRef.current &&
      !telemetry.vehicleChargingActive &&
      telemetry.vehicleBatteryPct >= 99
    ) {
      setVehicleChargingRequested(false);
      soundEngine.playMissionComplete();
      pushToast('6x6 Exploration Vehicle charged to 100%! Ready for expedition.', 'positive');
    } else if (vehicleChargingRequested && resources.power < 20) {
      const now = Date.now();
      if (now - (lastAlertTimesRef.current['chg_low_grid'] ?? 0) > 15000) {
        lastAlertTimesRef.current['chg_low_grid'] = now;
        pushToast('Colony Power below 20% — MEV Charging paused to protect habitat life support!', 'warning');
      }
    }
    prevChargingActiveRef.current = telemetry.vehicleChargingActive;

    // Derive active mission destination (switching to EV Locator first when long travel requires the EV)
    const rawTarget = rawMissionTargetRef.current;
    const distPToDest = rawTarget
      ? Math.hypot(rawTarget.pos[0] - telemetry.playerX, rawTarget.pos[1] - telemetry.playerZ)
      : 0;
    const distRToDest = rawTarget
      ? Math.hypot(rawTarget.pos[0] - telemetry.roverX, rawTarget.pos[1] - telemetry.roverZ)
      : 0;
    const distPToR = Math.hypot(telemetry.roverX - telemetry.playerX, telemetry.roverZ - telemetry.playerZ);
    const guideToEvNow = Boolean(
      screen === 'playing' &&
        introPhase === 'none' &&
        !drivingRover &&
        evTransitionState === 'idle' &&
        pendingNextMissionId === null &&
        pendingRecapMissionId === null &&
        missionFailedReason === null &&
        rawTarget &&
        distPToDest >= 34 &&
        distRToDest >= 14 &&
        distPToR <= distPToDest + 15,
    );

    if (guideToEvNow && rawTarget) {
      const gKey = `${missionId}_${stepIndex}_${rawTarget.id}`;
      if (evGuidanceToastKeyRef.current !== gKey) {
        evGuidanceToastKeyRef.current = gKey;
        pushToast(
          `${rawTarget.label} is ${Math.round(distPToDest)}m away! Follow the golden marker to your Exploration Vehicle!`,
          'info',
        );
      }
    }

    if (drivingRover && introPhase === 'none' && rawTarget && distRToDest <= 11.5) {
      const aKey = `${missionId}_${stepIndex}_${rawTarget.id}`;
      if (evArrivalToastKeyRef.current !== aKey) {
        evArrivalToastKeyRef.current = aKey;
        soundEngine.playToolSuccess();
        pushToast(
          `Great! We reached ${rawTarget.label}! Stop in the green ring & press E to step out.`,
          'positive',
        );
      }
    }

    // Track first-time EV driving tutorial progress
    if (drivingRover && introPhase === 'none' && (evTutorialStep === 'accel' || evTutorialStep === 'steer')) {
      const prevPos = evLastRoverPosRef.current;
      if (prevPos) {
        evMoveAccumMRef.current += Math.hypot(telemetry.roverX - prevPos.x, telemetry.roverZ - prevPos.z);
      }
      evLastRoverPosRef.current = { x: telemetry.roverX, z: telemetry.roverZ };

      if (evTutorialStep === 'accel' && evMoveAccumMRef.current >= 4.5) {
        soundEngine.playToolSuccess();
        evSteerAccumSecRef.current = 0;
        setEvTutorialStep('steer');
        pushToast('Nice driving! Now try steering left or right while rolling!', 'positive');
      } else if (evTutorialStep === 'steer') {
        if ((steerKeysHeldRef.current || touchSteerHeldRef.current) && telemetry.vehicleSpeedKmh >= 3) {
          evSteerAccumSecRef.current += 0.25;
        }
        if (evSteerAccumSecRef.current >= 0.45) {
          soundEngine.playToolSuccess();
          setEvTutorialStep('done');
          evTutorialCompletedRef.current = true;
          setEvTutorialCompleted(true);
          persistSaveSnapshot({ evTutorialCompleted: true });
          pushToast('You got it! Follow the golden route on your map!', 'positive');
        }
      }
    } else {
      evLastRoverPosRef.current = null;
    }

    let missionTargetPos: [number, number] | null = null;
    let missionTargetLabel = 'Objective';
    let missionTargetId = 'objective';
    if (guideToEvNow) {
      missionTargetPos = [telemetry.roverX, telemetry.roverZ];
      missionTargetLabel = telemetry.vehicleInChargingBay
        ? 'Exploration Vehicle (Charging Bay)'
        : 'Exploration Vehicle';
      missionTargetId = 'mev_vehicle';
    } else if (rawTarget) {
      missionTargetPos = rawTarget.pos;
      missionTargetLabel = rawTarget.label;
      missionTargetId = rawTarget.id;
    }

    const stepNavKey = `${missionId}_${stepIndex}_${introPhase}_${pendingNextMissionId ?? 'none'}_${guideToEvNow ? 'find_ev' : 'dest'}`;
    if (stepNavKey !== lastStepNavKeyRef.current) {
      lastStepNavKeyRef.current = stepNavKey;
      manualRouteClearedRef.current = false;
      customRouteActiveRef.current = false;
      setOffTrackAlert(false);
    }

    const expectedMode = drivingRover ? 'vehicle' : 'foot';

    // Auto-create persistent golden A* route when no active route exists for the current mission step
    if (
      !activeRoute &&
      !manualRouteClearedRef.current &&
      missionTargetPos &&
      (introPhase === 'none' || introPhase === 'drive_to_camp') &&
      pendingRecapMissionId === null &&
      missionFailedReason === null
    ) {
      routeRefreshAtRef.current = Date.now();
      const autoRoute = computeNavigationRoute(
        telemetry.playerX,
        telemetry.playerZ,
        missionTargetPos[0],
        missionTargetPos[1],
        expectedMode,
        {
          destinationId: missionTargetId,
          destinationName: missionTargetLabel,
          destinationCategory: 'colony',
        },
      );
      setActiveRoute(autoRoute);
      setLiveRouteDistM(autoRoute.totalDistanceM);
      return;
    }

    if (activeRoute) {
      // If step/target changed and user hasn't picked a custom map route, align to new step destination
      if (
        !customRouteActiveRef.current &&
        missionTargetPos &&
        (Math.abs(activeRoute.targetX - missionTargetPos[0]) > 1.0 ||
          Math.abs(activeRoute.targetZ - missionTargetPos[1]) > 1.0)
      ) {
        routeRefreshAtRef.current = Date.now();
        const nextRoute = computeNavigationRoute(
          telemetry.playerX,
          telemetry.playerZ,
          missionTargetPos[0],
          missionTargetPos[1],
          expectedMode,
          {
            destinationId: missionTargetId,
            destinationName: missionTargetLabel,
            destinationCategory: 'colony',
          },
        );
        setActiveRoute(nextRoute);
        setLiveRouteDistM(nextRoute.totalDistanceM);
        return;
      }

      const { distanceM: offDistM, remainingDistM } = distanceToRoute(
        telemetry.playerX,
        telemetry.playerZ,
        activeRoute,
      );
      setLiveRouteDistM(Math.round(remainingDistM));

      const destDist = Math.hypot(
        activeRoute.targetX - telemetry.playerX,
        activeRoute.targetZ - telemetry.playerZ,
      );
      if (destDist <= 4.5 && introPhase !== 'drive_to_camp' && customRouteActiveRef.current) {
        soundEngine.playToolSuccess();
        pushToast(`Arrived at ${activeRoute.destinationName}!`, 'positive');
        customRouteActiveRef.current = false;
        setOffTrackAlert(false);
        setActiveRoute(null);
      } else {
        const now = Date.now();
        const isOffTrack = offDistM > 8.5;
        const movedFromStart =
          activeRoute.waypoints.length > 0
            ? Math.hypot(
                telemetry.playerX - activeRoute.waypoints[0][0],
                telemetry.playerZ - activeRoute.waypoints[0][1],
              )
            : 999;

        if (isOffTrack) {
          setOffTrackAlert(true);
          if (now - offTrackCooldownRef.current > 4500) {
            offTrackCooldownRef.current = now;
            pushToast("You're off track! Follow the new route.", 'warning');
          }
          routeRefreshAtRef.current = now;
          setActiveRoute(
            computeNavigationRoute(
              telemetry.playerX,
              telemetry.playerZ,
              activeRoute.targetX,
              activeRoute.targetZ,
              expectedMode,
              {
                destinationId: activeRoute.destinationId,
                destinationName: activeRoute.destinationName,
                destinationCategory: activeRoute.destinationCategory,
              },
            ),
          );
        } else {
          if (offDistM <= 5.5 && offTrackAlert) {
            setOffTrackAlert(false);
          }
          if (
            activeRoute.mode !== expectedMode ||
            (movedFromStart > 7.5 && now - routeRefreshAtRef.current > 1800)
          ) {
            routeRefreshAtRef.current = now;
            setActiveRoute(
              computeNavigationRoute(
                telemetry.playerX,
                telemetry.playerZ,
                activeRoute.targetX,
                activeRoute.targetZ,
                expectedMode,
                {
                  destinationId: activeRoute.destinationId,
                  destinationName: activeRoute.destinationName,
                  destinationCategory: activeRoute.destinationCategory,
                },
              ),
            );
          }
        }
      }
    } else if (missionTargetPos) {
      setLiveRouteDistM(
        Math.round(
          Math.hypot(missionTargetPos[0] - telemetry.playerX, missionTargetPos[1] - telemetry.playerZ),
        ),
      );
    } else {
      setLiveRouteDistM(null);
    }
  }, [
    telemetry,
    screen,
    vehicleChargingRequested,
    resources.power,
    activeRoute,
    drivingRover,
    introPhase,
    evTransitionState,
    evTutorialStep,
    missionId,
    stepIndex,
    currentStep,
    pendingNextMissionId,
    pendingRecapMissionId,
    missionFailedReason,
    offTrackAlert,
    pushToast,
    persistSaveSnapshot,
  ]);

  const handleSetRoute = useCallback(
    (dest: {
      id: string;
      name: string;
      category: NavigationRoute['destinationCategory'];
      x: number;
      z: number;
    }) => {
      const sx = telemetry?.playerX ?? 0;
      const sz = telemetry?.playerZ ?? 6;
      manualRouteClearedRef.current = false;
      customRouteActiveRef.current = true;
      setOffTrackAlert(false);
      routeRefreshAtRef.current = Date.now();
      const route = computeNavigationRoute(
        sx,
        sz,
        dest.x,
        dest.z,
        drivingRover ? 'vehicle' : 'foot',
        {
          destinationId: dest.id,
          destinationName: dest.name,
          destinationCategory: dest.category,
        },
      );
      setActiveRoute(route);
      setLiveRouteDistM(route.totalDistanceM);
      soundEngine.playClick();
      if (drivingRover && telemetry && route.totalDistanceM > telemetry.vehicleSafeRangeM) {
        pushToast(
          `Battery Warning: ${dest.name} (${route.totalDistanceM}m) exceeds safe range (${telemetry.vehicleSafeRangeM}m)!`,
          'warning',
        );
      } else {
        pushToast(`Route set to ${dest.name} (${route.totalDistanceM}m).`, 'info');
      }
    },
    [telemetry, drivingRover, pushToast],
  );

  const handleSecureOutdoorGear = useCallback(() => {
    soundEngine.playToolSuccess();
    setWorldPatch((prev) => ({ ...prev, outdoorGearSecured: true }));
    pushToast('Outdoor equipment & rover gear secured ahead of storm!', 'positive');
  }, [pushToast]);

  // Supply Request Handler
  const handleRequestSupplyBundle = useCallback(
    (bundleId: SupplyBundleId) => {
      if (cargoDelivery.phase !== 'IDLE' && cargoDelivery.phase !== 'DELIVERED') return;
      const spec = SUPPLY_BUNDLES.find((b) => b.id === bundleId);
      if (!spec) return;
      soundEngine.playRadioChirp();
      cargoPhaseTimerRef.current = 0;
      setCargoDelivery((prev) => ({
        phase: 'CONFIRMED',
        bundleId: spec.id,
        bundleName: spec.name,
        etaSec: spec.etaSec,
        phaseProgress: 0.05,
        requestedSol: solNumber,
        deliveredCount: prev.deliveredCount,
      }));
      pushToast(`Supply Request Confirmed: ${spec.name} en route!`, 'positive');
    },
    [cargoDelivery.phase, solNumber, pushToast],
  );

  // Cargo Lander & Robotic Transporter Resupply State Machine
  useEffect(() => {
    if (
      screen !== 'playing' ||
      activeModal === 'pause' ||
      cargoDelivery.phase === 'IDLE'
    ) {
      return;
    }

    const tickMs = 200;
    const id = window.setInterval(() => {
      cargoPhaseTimerRef.current += tickMs / 1000;
      const elapsed = cargoPhaseTimerRef.current;

      setCargoDelivery((prev) => {
        if (prev.phase === 'CONFIRMED') {
          const dur = 1.2;
          if (elapsed >= dur) {
            cargoPhaseTimerRef.current = 0;
            return { ...prev, phase: 'IN_TRANSIT', phaseProgress: 0.12, etaSec: Math.max(1, prev.etaSec - dur) };
          }
          return { ...prev, phaseProgress: Math.min(0.12, (elapsed / dur) * 0.12), etaSec: Math.max(1, prev.etaSec - tickMs / 1000) };
        }
        if (prev.phase === 'IN_TRANSIT') {
          const dur = 2.6;
          if (elapsed >= dur) {
            cargoPhaseTimerRef.current = 0;
            soundEngine.playThrusterRumble(2.8);
            pushToast('Cargo Resupply Lander descending to Northwest Cargo Pad!', 'info');
            return { ...prev, phase: 'DESCENDING', phaseProgress: 0, etaSec: Math.max(1, prev.etaSec - 0.5) };
          }
          return { ...prev, phaseProgress: 0.12 + (elapsed / dur) * 0.18, etaSec: Math.max(1, prev.etaSec - tickMs / 1000) };
        }
        if (prev.phase === 'DESCENDING') {
          const dur = 3.2;
          if (elapsed >= dur) {
            cargoPhaseTimerRef.current = 0;
            soundEngine.playDoorAirlock(true);
            return { ...prev, phase: 'UNLOADING', phaseProgress: 0 };
          }
          return { ...prev, phaseProgress: Math.min(1, elapsed / dur), etaSec: Math.max(1, 5.5 - elapsed) };
        }
        if (prev.phase === 'UNLOADING') {
          const dur = 2.4;
          if (elapsed >= dur) {
            cargoPhaseTimerRef.current = 0;
            pushToast('Robotic Transporter carrying cargo crates to Colony Warehouse!', 'info');
            return { ...prev, phase: 'TRANSPORTING', phaseProgress: 0 };
          }
          return { ...prev, phaseProgress: Math.min(1, elapsed / dur), etaSec: Math.max(1, 3.8 - elapsed * 0.6) };
        }
        if (prev.phase === 'TRANSPORTING') {
          const dur = 3.5;
          if (elapsed >= dur) {
            cargoPhaseTimerRef.current = 0;
            const bundle = SUPPLY_BUNDLES.find((b) => b.id === prev.bundleId);
            if (bundle) {
              setResources((r) => ({
                ...r,
                air: Math.min(100, r.air + (bundle.rewards.air ?? 0)),
                water: Math.min(100, r.water + (bundle.rewards.water ?? 0)),
                food: Math.min(100, r.food + (bundle.rewards.food ?? 0)),
                power: Math.min(100, r.power + (bundle.rewards.power ?? 0)),
                crewCondition: Math.min(100, r.crewCondition + (bundle.rewards.crewCondition ?? 0)),
                spareParts: r.spareParts + (bundle.rewards.spareParts ?? 0),
              }));
              if (bundle.rewards.roverBattery) {
                engineRef.current?.addRoverBattery(bundle.rewards.roverBattery);
              }
              soundEngine.playMissionComplete();
              pushToast(`Delivered ${bundle.name} to Warehouse!`, 'positive');
              addJournalEntry({
                id: `delivery_${prev.deliveredCount + 1}_${bundle.id}`,
                title: `Cargo Delivery: ${bundle.name}`,
                category: 'Delivery',
                summary: `Landed safely at Northwest Pad (-28, -23) and stowed into the Colony Warehouse on Sol ${solNumber}.`,
              });
            }
            return {
              ...prev,
              phase: 'DELIVERED',
              phaseProgress: 0,
              etaSec: 0,
              deliveredCount: prev.deliveredCount + 1,
            };
          }
          return { ...prev, phaseProgress: Math.min(1, elapsed / dur), etaSec: Math.max(1, dur - elapsed) };
        }
        if (prev.phase === 'DELIVERED') {
          const dur = 2.2;
          if (elapsed >= dur) {
            cargoPhaseTimerRef.current = 0;
            return {
              ...prev,
              phase: 'IDLE',
              bundleId: null,
              bundleName: '',
              phaseProgress: 0,
              etaSec: 0,
            };
          }
          return { ...prev, phaseProgress: Math.min(1, elapsed / dur) };
        }
        return prev;
      });
    }, tickMs);

    return () => clearInterval(id);
  }, [screen, activeModal, cargoDelivery.phase, solNumber, pushToast, addJournalEntry]);

  // Delayed Commander Nova Transmissions (Narrative continuity ~9.5s after chapter/progress milestones)
  useEffect(() => {
    if (
      screen !== 'playing' ||
      dialogueQueue.length > 0 ||
      activeEquipment !== null ||
      pendingRecapMissionId !== null ||
      missionFailedReason !== null ||
      activeModal !== null
    ) {
      return;
    }

    const milestones = [3, 6, 11, 15, 18];
    const pendingMilestone = milestones.find(
      (id) => completedMissions.includes(id) && !receivedNovaMsgs.includes(id),
    );
    if (!pendingMilestone) return;

    const timer = window.setTimeout(() => {
      const lines = DELAYED_NOVA_MESSAGES[pendingMilestone];
      if (!lines) return;
      soundEngine.playRadioChirp();
      setReceivedNovaMsgs((prev) => (prev.includes(pendingMilestone) ? prev : [...prev, pendingMilestone]));
      setTalkingNpcId('nova');
      setDialogueQueue(lines);
      addJournalEntry({
        id: `nova_tx_${pendingMilestone}`,
        title: `Nova Radio Relay (Post-M${pendingMilestone})`,
        category: 'Transmission',
        summary: lines[0].text,
      });
    }, 9500);

    return () => clearTimeout(timer);
  }, [
    screen,
    dialogueQueue.length,
    activeEquipment,
    pendingRecapMissionId,
    missionFailedReason,
    activeModal,
    completedMissions,
    receivedNovaMsgs,
    addJournalEntry,
  ]);

  // Real Survival Consequence + Living Colony Resource Consumption Loop
  useEffect(() => {
    if (
      screen !== 'playing' ||
      dialogueQueue.length > 0 ||
      activeEquipment !== null ||
      pendingRecapMissionId !== null ||
      missionFailedReason !== null ||
      activeModal !== null
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setResources((prev) => {
        let air = prev.air;
        let water = prev.water;
        let power = prev.power;
        let food = prev.food;
        let crewCondition = prev.crewCondition;

        // Baseline living-colony daily consumption (Mission 3 keeps Air gently above 32% so kids are never failed prematurely)
        if (visualState.o2AlarmActive) {
          air = missionId === 3 ? Math.max(32, air - 0.38) : Math.max(0, air - 0.7);
        } else {
          air = Math.max(12, Math.min(100, air + 1.1 - 0.03));
        }

        if (visualState.waterLeakActive) water = Math.max(0, water - 0.8);
        else if (!visualState.waterPuddleVisible) water = Math.max(15, Math.min(100, water + 0.85 - 0.03));

        const solarEfficiency = STORM_STAGE_SPECS[visualState.stormStage].solarEfficiency;
        if (visualState.powerBlackout) power = Math.max(0, power - 0.75);
        else if (!visualState.solarDusty) {
          power = Math.max(15, Math.min(100, power + 1.05 * solarEfficiency - 0.06));
        }
        if (telemetry?.vehicleChargingActive) {
          power = Math.max(15, power - 0.14);
        }

        if (visualState.plantsWilting) food = Math.max(5, food - 0.35);
        else food = Math.max(10, food - 0.025);

        if (
          air < 30 ||
          water < 28 ||
          power < 22 ||
          food < 16 ||
          (visualState.radiationDrillActive && visualState.shelterShieldLevel < 3)
        ) {
          crewCondition = Math.max(0, crewCondition - 0.32);
        } else {
          crewCondition = Math.min(100, crewCondition + 0.6);
        }

        // Debounced low-resource crew alerts
        const now = Date.now();
        const maybeAlert = (key: string, msg: string) => {
          if (now - (lastAlertTimesRef.current[key] ?? 0) > 28000) {
            lastAlertTimesRef.current[key] = now;
            pushToast(msg, 'warning');
          }
        };
        if (food < 34 && !visualState.plantsWilting) {
          maybeAlert('food', 'Zara: Food rations are below 35%—order a Nutrition Supply Drop!');
        }
        if (prev.spareParts <= 1) {
          maybeAlert('parts', 'Leo: Spare Parts crate is nearly empty—request a Hardware Drop!');
        }
        if (telemetry && telemetry.vehicleBatteryPct < 20 && drivingRover) {
          maybeAlert('batt', 'Leo: Exploration Vehicle battery low! Drive to the Vehicle Charging Station (East Bay A).');
        }

        if (air <= 0) {
          setMissionFailedReason({
            title: 'Crew Home Air Ran Out!',
            detail:
              'The clogged filter in the Oxygen Centre blocked fresh air for too long. Let us swap in a clean filter right away!',
          });
        } else if (water <= 0) {
          setMissionFailedReason({
            title: 'Water Tanks Emptied!',
            detail:
              'The spraying pipe inside the Water Station drained our reserves. Remember to close the red shutoff valve first!',
          });
        } else if (power <= 0) {
          setMissionFailedReason({
            title: 'Battery Reserves Depleted!',
            detail:
              'Dusty solar panels and loose cables left the colony dark. Let us clean the panels and secure the power cable!',
          });
        } else if (crewCondition <= 0) {
          setMissionFailedReason({
            title: 'Crew Needs Rest & Shelter!',
            detail:
              'Colony life-support stayed low for too long. Let us reset the base systems and tackle the emergency together!',
          });
        }

        return { ...prev, air, water, power, food, crewCondition };
      });
    }, 550);

    return () => clearInterval(timer);
  }, [
    screen,
    missionId,
    dialogueQueue.length,
    activeEquipment,
    pendingRecapMissionId,
    missionFailedReason,
    activeModal,
    weather,
    drivingRover,
    telemetry,
    pushToast,
    visualState.stormStage,
    visualState.o2AlarmActive,
    visualState.waterLeakActive,
    visualState.waterPuddleVisible,
    visualState.powerBlackout,
    visualState.solarDusty,
    visualState.plantsWilting,
    visualState.radiationDrillActive,
    visualState.shelterShieldLevel,
  ]);

  // Early Storm Warning Countdown -> Stage 4 Escalation & Non-Fatal Outdoor Storm Penalties
  useEffect(() => {
    if (
      screen !== 'playing' ||
      activeModal !== null ||
      activeEquipment !== null ||
      pendingRecapMissionId !== null ||
      weatherModalOpen ||
      dialogueQueue.length > 0
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      if (worldPatch.stormWarningActive) {
        setWorldPatch((prev) => {
          const cur = prev.stormWarningCountdown ?? 0;
          if (!prev.stormWarningActive) return prev;
          if (cur <= 1) {
            soundEngine.playAlert();
            setStormStageOverride(4);
            setWeather('Regional Storm');
            pushToast(
              'STAGE 4 REGIONAL DUST STORM! Visibility reduced — shelter inside Radiation Shelter!',
              'warning',
            );
            return {
              ...prev,
              stormWarningActive: false,
              stormWarningCountdown: 0,
              stormStage: 4,
              dustStormActive: true,
              solarDusty: true,
            };
          }
          return { ...prev, stormWarningCountdown: cur - 1 };
        });
      }

      if (visualState.stormStage === 4 && !insideBuildingId) {
        setResources((r) => ({
          ...r,
          power: Math.max(12, r.power - 0.35),
        }));
        if (!worldPatch.solarDusty) {
          setWorldPatch((prev) => ({ ...prev, solarDusty: true }));
        }
        const now = Date.now();
        if (now - (lastAlertTimesRef.current['storm_outdoors'] ?? 0) > 18000) {
          lastAlertTimesRef.current['storm_outdoors'] = now;
          pushToast(
            'Dust Storm Alert: Heavy wind slows walking & drains suit power outdoors — shelter inside!',
            'warning',
          );
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [
    screen,
    activeModal,
    activeEquipment,
    pendingRecapMissionId,
    weatherModalOpen,
    dialogueQueue.length,
    worldPatch.stormWarningActive,
    worldPatch.solarDusty,
    visualState.stormStage,
    insideBuildingId,
    pushToast,
  ]);

  // Stuck Player Timer: shows gentle dismissible hint after 26s without progress
  useEffect(() => {
    setStuckSeconds(0);
  }, [missionId, stepIndex, introPhase]);

  useEffect(() => {
    if (
      screen !== 'playing' ||
      dialogueQueue.length > 0 ||
      activeEquipment !== null ||
      activeModal !== null ||
      pendingRecapMissionId !== null ||
      missionFailedReason !== null ||
      weatherModalOpen
    ) {
      return;
    }
    const timer = window.setInterval(() => {
      setStuckSeconds((s) => Math.min(120, s + 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [
    screen,
    dialogueQueue.length,
    activeEquipment,
    activeModal,
    pendingRecapMissionId,
    missionFailedReason,
    weatherModalOpen,
  ]);

  // Sync audio settings
  useEffect(() => {
    soundEngine.updateSettings(settings.musicEnabled, settings.sfxEnabled, settings.volume);
    engineRef.current?.setCameraSpeed(settings.cameraSpeed);
  }, [settings]);

  const saveCheckpointNow = useCallback(
    (mId: number, cp: MissionCheckpoint) => {
      const nextMap = { ...missionCheckpointsRef.current, [mId]: cp };
      missionCheckpointsRef.current = nextMap;
      setMissionCheckpoints(nextMap);
      persistSaveSnapshot({ missionId: mId, missionCheckpoints: nextMap });
    },
    [persistSaveSnapshot],
  );

  const clearEvTimers = useCallback(() => {
    evTimersRef.current.forEach((id) => window.clearTimeout(id));
    evTimersRef.current = [];
  }, []);

  const clearIntroChoreography = useCallback(() => {
    introTimersRef.current.forEach((id) => window.clearTimeout(id));
    introTimersRef.current = [];
    clearEvTimers();
    setEvTransitionState('idle');
    engineRef.current?.cancelScriptedWalks();
    engineRef.current?.setRoverAutopilotTarget(null);
  }, [clearEvTimers]);

  useEffect(() => {
    return () => {
      clearIntroChoreography();
    };
  }, [clearIntroChoreography]);

  const scheduleIntroTimer = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    introTimersRef.current.push(id);
    return id;
  }, []);

  // Start or Resume Mission helper
  const beginMission = useCallback(
    (id: number, forceReset = false, preserveExploration = false) => {
      clearIntroChoreography();
      completingEquipmentRef.current = false;
      setActiveEquipment(null);
      setActiveDiagnosticRover(null);
      pendingNextMissionIdRef.current = null;
      setPendingNextMissionId(null);
      setMissionFailedReason(null);
      setWeatherModalOpen(false);
      setChargingModalOpen(false);
      setShowHint(false);
      setActiveModal(null);
      setDrivingRover(false);
      setEvTutorialStep('idle');
      setCutsceneCaption(null);
      setDrivingWrongWay(false);
      pendingRecapRef.current = null;
      setPendingRecapMissionId(null);

      if (
        id >= 2 &&
        !completedMissionsRef.current.includes(id - 1) &&
        !completedMissionsRef.current.includes(id)
      ) {
        console.warn(`[Mission] Blocked start of locked Mission ${id} until Mission ${id - 1} completes`);
        pushToast(`Complete Mission ${id - 1} first to unlock Mission ${id}!`, 'warning');
        return;
      }

      const mission = CAMPAIGN_MISSIONS.find((m) => m.id === id);
      if (!mission) return;

      // Mission 1: Remote Comms Relay Opening Story (far outside main colony at [122, 48])
      if (id === 1 && (forceReset || !completedMissionsRef.current.includes(1))) {
        setMissionId(1);
        setMissionStatus('IN_PROGRESS');
        setStepIndex(0);
        setWeather('Clear');
        setStormStageOverride(1);
        setResources(INITIAL_RESOURCES);
        setActiveRoute(null);
        setVehicleHeadlights(false);
        engineRef.current?.resetPlayer();
        engineRef.current?.setRoverSnapshot(REMOTE_MEV_START.x, REMOTE_MEV_START.z, REMOTE_MEV_START.yaw, 100);
        engineRef.current?.setPlayerLocation(125.6, 49.4, Math.atan2(REMOTE_SITE_POS[0] - 125.6, REMOTE_SITE_POS[1] - 49.4));

        const startPatch: Partial<WorldVisualState> = {
          ...INITIAL_WORLD,
          ...mission.initialWorldPatch,
          introPhase: 'site_inspection',
          relayPanelOpen: false,
          relayRepaired: false,
          hatchForcedOpen: false,
          rightHatchForcedOpen: false,
          vehicleDashLit: false,
          alexSeatedInRover: false,
          novaSeatedInRover: false,
          alexPosOverride: [125.6, 49.4],
          alexYawOverride: Math.atan2(REMOTE_SITE_POS[0] - 125.6, REMOTE_SITE_POS[1] - 49.4),
          alexWalkSpeed: 0,
          alexActionOverride: 'none',
          novaPresent: true,
          novaPosOverride: [124.2, 50.2],
          novaYawOverride: Math.atan2(REMOTE_SITE_POS[0] - 124.2, REMOTE_SITE_POS[1] - 50.2),
          novaWalkSpeed: 0,
          novaActionOverride: 'none',
          landerState: 'gone',
          crewMood: 'calm',
          unlockedCrewIds: [],
          cutsceneTarget: [122.0, 1.4, 48.0],
          cutsceneEyeOffset: [7.8, 3.8, 7.6],
        };
        setIntroPhase('site_inspection');
        setWorldPatch(startPatch);
        setScreen('playing');
        setCutsceneCaption('Remote Communication Relay Outpost — Miles from Ares Colony...');

        const alexInspectPos: [number, number] = [123.3, 48.3];
        const novaInspectPos: [number, number] = [121.4, 49.2];
        const alexYaw = Math.atan2(REMOTE_SITE_POS[0] - alexInspectPos[0], REMOTE_SITE_POS[1] - alexInspectPos[1]);
        const novaYaw = Math.atan2(REMOTE_SITE_POS[0] - novaInspectPos[0], REMOTE_SITE_POS[1] - novaInspectPos[1]);

        engineRef.current?.startScriptedWalk('alex', [125.6, 49.4], alexInspectPos, 2.0, alexYaw);
        engineRef.current?.startScriptedWalk('nova', [124.2, 50.2], novaInspectPos, 2.1, novaYaw);

        scheduleIntroTimer(() => {
          soundEngine.playScannerPing();
          setWorldPatch((p) => ({
            ...p,
            alexPosOverride: alexInspectPos,
            alexYawOverride: alexYaw,
            alexWalkSpeed: 0,
            alexActionOverride: 'inspect',
            novaPosOverride: novaInspectPos,
            novaYawOverride: novaYaw,
            novaWalkSpeed: 0,
            novaActionOverride: 'point_malfunction',
            cutsceneTarget: [122.0, 1.35, 48.0],
            cutsceneEyeOffset: [5.2, 2.5, 5.8],
          }));
          setCutsceneCaption('Commander Nova points to a red blinking antenna warning...');
        }, 2200);

        scheduleIntroTimer(() => {
          soundEngine.playScannerPing();
          setWorldPatch((p) => ({
            ...p,
            novaActionOverride: 'use_scanner',
            alexActionOverride: 'inspect',
          }));
        }, 3400);

        scheduleIntroTimer(() => {
          setCutsceneCaption(null);
          setWorldPatch((p) => ({
            ...p,
            novaActionOverride: 'none',
            alexActionOverride: 'none',
          }));
          setTalkingNpcId('nova');
          setDialogueQueue([
            {
              speaker: 'Commander Nova',
              role: 'Mission Mentor',
              avatar: 'nova',
              text: 'Look over there, Alex! The Remote Communication Relay stopped sending clear signals across Mars.',
              focusTarget: [122.0, 1.45, 48.0],
            },
            {
              speaker: 'Commander Nova',
              role: 'Mission Mentor',
              avatar: 'nova',
              text: 'Before we head back to Ares Colony in the distance, you and I came out here on a real repair assignment to fix it!',
              focusTarget: [122.0, 1.45, 48.0],
            },
            {
              speaker: 'Alex',
              role: 'Lead Junior Astronaut',
              avatar: 'alex',
              text: 'Ready to learn, Commander Nova! Open the relay cabinet door and I will stabilize the radio signal!',
              focusTarget: [122.6, 1.35, 48.2],
            },
          ]);
          setPendingActionAfterDialogue('intro_open_relay_panel');
        }, 4650);
        return;
      }

      // Mission 2: Dual Boarding & Drive Back from Remote Relay to Ares Colony
      if (id === 2 && (forceReset || !completedMissionsRef.current.includes(2))) {
        setMissionId(2);
        setMissionStatus('IN_PROGRESS');
        setStepIndex(0);
        setWeather('Clear');
        setStormStageOverride(1);
        setResources((prev) => ({ ...prev, crewCondition: 100 }));
        setActiveRoute(null);
        setScreen('playing');
        setIntroPhase('vehicle_entry');
        const walkStartAlex: [number, number] = [122.8, 48.4];
        const walkStartNova: [number, number] = [120.7, 48.8];
        engineRef.current?.setRoverSnapshot(REMOTE_MEV_START.x, REMOTE_MEV_START.z, REMOTE_MEV_START.yaw, 100);
        engineRef.current?.setPlayerLocation(walkStartAlex[0], walkStartAlex[1], Math.atan2(REMOTE_MEV_START.x - walkStartAlex[0], REMOTE_MEV_START.z - walkStartAlex[1]));
        setWorldPatch({
          ...mission.initialWorldPatch,
          introPhase: 'vehicle_entry',
          relayPanelOpen: true,
          relayRepaired: true,
          hatchForcedOpen: false,
          rightHatchForcedOpen: false,
          vehicleDashLit: false,
          drivingRover: false,
          alexSeatedInRover: false,
          novaSeatedInRover: false,
          alexPosOverride: walkStartAlex,
          alexYawOverride: Math.atan2(REMOTE_MEV_START.x - walkStartAlex[0], REMOTE_MEV_START.z - walkStartAlex[1]),
          novaPresent: true,
          novaPosOverride: walkStartNova,
          novaYawOverride: Math.atan2(REMOTE_MEV_START.x - walkStartNova[0], REMOTE_MEV_START.z - walkStartNova[1]),
          unlockedCrewIds: [],
          cutsceneTarget: [118.2, 1.45, 49.6],
          cutsceneEyeOffset: [7.4, 3.6, 7.6],
        });
        setTalkingNpcId('nova');
        setDialogueQueue([
          {
            speaker: 'Commander Nova',
            role: 'Mission Mentor',
            avatar: 'nova',
            text: 'Brilliant repair, Trainee Alex! The remote relay is beaming steady green signals again.',
            focusTarget: [122.0, 1.45, 48.0],
          },
          {
            speaker: 'Commander Nova',
            role: 'Mission Mentor',
            avatar: 'nova',
            text: 'Now let us walk to our Exploration Vehicle and drive back together to the main Ares Colony!',
            focusTarget: [REMOTE_MEV_START.x, 1.45, REMOTE_MEV_START.z],
          },
        ]);
        setPendingActionAfterDialogue('m2_board_vehicle');
        return;
      }

      setIntroPhase('none');

      const existingCp = !forceReset ? missionCheckpointsRef.current[id] : undefined;
      const canRestore =
        existingCp &&
        (existingCp.status === 'IN_PROGRESS' || existingCp.status === 'OBJECTIVE_COMPLETED');

      if (canRestore) {
        const restoredStep = Math.max(0, Math.min(existingCp.stepIndex, mission.steps.length - 1));
        const restoredPatch: Partial<WorldVisualState> = {
          ...mission.initialWorldPatch,
          ...existingCp.worldPatch,
          introPhase: 'none',
          alexPosOverride: null,
          novaPosOverride: null,
          alexSeatedInRover: false,
          novaSeatedInRover: false,
          hatchForcedOpen: false,
          rightHatchForcedOpen: false,
          vehicleDashLit: true,
          carryingItem: existingCp.carryingItem ?? null,
          crewFocusPos: mission.steps[restoredStep]?.crewPos ?? null,
          unlockedCrewIds: mission.unlockedCrewIds,
        };

        setMissionId(id);
        setStepIndex(restoredStep);
        setMissionStatus('IN_PROGRESS');
        setScreen('playing');
        setPendingActionAfterDialogue(null);
        setWeather(restoredPatch.weather ?? 'Clear');
        setStormStageOverride(restoredPatch.stormStage ?? null);
        setResources((prev) => ({
          ...prev,
          air:
            id === 3 && existingCp.oxygenGeneratorRepaired
              ? 100
              : existingCp.airLevel ?? (id === 3 ? 68 : 96),
          water: id === 4 ? 72 : 96,
          power: id === 5 || id === 15 ? 64 : 96,
          food: id === 6 ? 65 : Math.max(85, prev.food),
          crewCondition: 100,
          spareParts: Math.max(6, prev.spareParts),
        }));
        setWorldPatch(restoredPatch);
        setDialogueQueue([]);
        if (!preserveExploration) {
          engineRef.current?.resetPlayer();
        }
        if (id === 3 && !existingCp.oxygenGeneratorRepaired) {
          const o2Node = INTERACTIVE_NODES.m1_o2_panel;
          setActiveRoute(
            computeNavigationRoute(0, 6, o2Node.position[0], o2Node.position[2], 'foot', {
              destinationId: 'oxygen_centre',
              destinationName: 'Oxygen Centre',
              destinationCategory: 'colony',
            }),
          );
        }
        pushToast(`Resumed ${mission.title}`, 'info');
        return;
      }

      const initialAir = id === 3 ? 68 : 96;
      const initialPatch: Partial<WorldVisualState> = {
        ...mission.initialWorldPatch,
        introPhase: 'none',
        alexPosOverride: null,
        novaPosOverride: null,
        alexSeatedInRover: false,
        novaSeatedInRover: false,
        hatchForcedOpen: false,
        rightHatchForcedOpen: false,
        vehicleDashLit: true,
        radioTransmissionPct: 0,
        radioTransmitted: false,
        carryingItem: null,
        crewFocusPos: mission.steps[0]?.crewPos ?? null,
        unlockedCrewIds: mission.unlockedCrewIds,
      };

      setMissionId(id);
      setStepIndex(0);
      setMissionStatus('IN_PROGRESS');
      setScreen('playing');
      setPendingActionAfterDialogue(null);
      setWeather(mission.initialWorldPatch.weather ?? 'Clear');
      setStormStageOverride(mission.initialWorldPatch.stormStage ?? null);
      setResources((prev) => ({
        ...prev,
        air: initialAir,
        water: id === 4 ? 72 : 96,
        power: id === 5 || id === 15 ? 64 : 96,
        food: id === 6 ? 65 : Math.max(85, prev.food),
        crewCondition: 100,
        spareParts: Math.max(6, prev.spareParts),
      }));
      setWorldPatch(initialPatch);
      if (!preserveExploration) {
        engineRef.current?.resetPlayer();
      }

      if (id === 3) {
        const o2Node = INTERACTIVE_NODES.m1_o2_panel;
        const startX = preserveExploration ? 14.5 : 0;
        const startZ = preserveExploration ? -12.2 : 6;
        setActiveRoute(
          computeNavigationRoute(startX, startZ, o2Node.position[0], o2Node.position[2], 'foot', {
            destinationId: 'oxygen_centre',
            destinationName: 'Oxygen Centre',
            destinationCategory: 'colony',
          }),
        );
      }

      if (!completedMissionsRef.current.includes(id)) {
        saveCheckpointNow(id, {
          status: 'IN_PROGRESS',
          stepIndex: 0,
          completedStepIds: [],
          oxygenGeneratorRepaired: false,
          carryingItem: null,
          airLevel: initialAir,
          worldPatch: initialPatch,
        });
      } else {
        persistSaveSnapshot({
          missionId: id,
          pendingRecapMissionId: null,
          pendingNextMissionId: null,
        });
      }

      if (mission.steps[0]?.dialogueOnStart) {
        setDialogueQueue(mission.steps[0].dialogueOnStart);
      } else {
        setDialogueQueue([]);
      }

      if (id === 3 || id === 4 || id === 5 || id === 15 || id === 19) {
        soundEngine.playAlert();
      }
    },
    [clearIntroChoreography, persistSaveSnapshot, pushToast, saveCheckpointNow, scheduleIntroTimer],
  );

  const triggerMission20Ending = useCallback(() => {
    setWeather('Clear');
    setStormStageOverride(1);
    setWorldPatch((prev) => ({
      ...prev,
      beaconBeamActive: true,
      dustStormActive: false,
      solarDusty: false,
      shelterDoorsClosed: false,
      stormWarningActive: false,
      stormWarningCountdown: 0,
      stormStage: 1,
      landerState: 'returning',
      novaPresent: true,
      crewMood: 'celebrating',
      unlockedCrewIds: ['leo', 'maya', 'zara', 'ryan'],
      crewFocusPos: [LANDING_PAD_POS[0] - 4.2, 0, LANDING_PAD_POS[1] - 3.5],
    }));
    setScreen('cinematic_ending');
    soundEngine.playThrusterRumble(2.8);
    setDialogueQueue(ENDING_CELEBRATION_LINES);
    setPendingActionAfterDialogue('to_finale');
  }, []);

  const completeMission = useCallback(
    (completedId: number) => {
      soundEngine.playMissionComplete();
      const alreadyDone = completedMissionsRef.current.includes(completedId);
      const nextCompleted = alreadyDone
        ? completedMissionsRef.current
        : [...completedMissionsRef.current, completedId];
      completedMissionsRef.current = nextCompleted;
      setCompletedMissions(nextCompleted);

      const prevMissionStarCount = missionStarsRef.current[completedId] ?? 0;
      const earnedForMission = 3;
      const nextMissionStars = {
        ...missionStarsRef.current,
        [completedId]: Math.max(prevMissionStarCount, earnedForMission),
      };
      missionStarsRef.current = nextMissionStars;
      setMissionStars(nextMissionStars);

      const totalStarsCount = Object.values(nextMissionStars).reduce((sum, v) => sum + v, 0);
      starsEarnedRef.current = totalStarsCount;
      setStarsEarned(totalStarsCount);

      const pointsAwardedNow = alreadyDone ? 0 : REWARD_POINTS.MAIN_MISSION;
      const nextPoints = totalPointsRef.current + pointsAwardedNow;
      totalPointsRef.current = nextPoints;
      setTotalPoints(nextPoints);
      setLastMissionPointsAwarded(pointsAwardedNow);

      const totalDiscoveredNow =
        discoveredLandmarks.length + discoveredAnomalies.length + resolvedRoverIds.length;
      const newBadges = syncMilestoneBadges(
        nextCompleted,
        completedOptionalIdsRef.current,
        totalDiscoveredNow,
      );

      const missionDef = CAMPAIGN_MISSIONS.find((m) => m.id === completedId);
      if (pointsAwardedNow > 0) {
        pushRewardToast(
          `${missionDef?.label ?? `Mission ${completedId}`} Complete!`,
          pointsAwardedNow,
          {
            stars: earnedForMission,
            badgeTitle: newBadges[0] ? `${newBadges[0].icon} ${newBadges[0].title}` : undefined,
            accentColor: missionDef?.badgeColor ?? '#fbbf24',
          },
        );
      }

      setMissionStatus('MISSION_COMPLETED');
      setStormStageOverride(completedId >= 15 && completedId < 20 ? null : 1);
      if (completedId < 15) setWeather('Clear');

      const completedPatch: Partial<WorldVisualState> = {
        ...worldPatch,
        introPhase: 'none',
        o2AlarmActive: false,
        o2FanSpinning: true,
        relayRepaired: completedId === 1 ? true : Boolean(worldPatch.relayRepaired),
        relayPanelOpen: completedId === 1 ? true : Boolean(worldPatch.relayPanelOpen),
        oxygenGeneratorRepaired:
          completedId === 3 ? true : Boolean(worldPatch.oxygenGeneratorRepaired),
        radioTransmitted: completedId === 16 ? true : Boolean(worldPatch.radioTransmitted),
        radioTransmissionPct:
          completedId === 16 ? 100 : (worldPatch.radioTransmissionPct ?? 0),
        waterLeakActive: false,
        waterPuddleVisible: false,
        powerBlackout: false,
        solarDusty: completedId >= 15 && completedId < 20 ? worldPatch.solarDusty : false,
        cableSparking: false,
        plantsWilting: false,
        tomatoesRipe: completedId >= 6 ? true : worldPatch.tomatoesRipe,
        gardenStage: completedId >= 6 ? 3 : worldPatch.gardenStage,
        radiationDrillActive: false,
        dustStormActive: completedId >= 15 && completedId < 20 ? worldPatch.dustStormActive : false,
        crewMood: 'celebrating',
        carryingItem: null,
        unlockedCrewIds: missionDef?.unlockedCrewIds ?? worldPatch.unlockedCrewIds ?? [],
      };
      setWorldPatch(completedPatch);

      const doneCp: MissionCheckpoint = {
        status: 'MISSION_COMPLETED',
        stepIndex: Math.max(0, (missionDef?.steps.length ?? 1) - 1),
        completedStepIds: missionDef?.steps.map((s) => s.id) ?? [],
        oxygenGeneratorRepaired:
          completedId === 3 ? true : Boolean(missionCheckpointsRef.current[completedId]?.oxygenGeneratorRepaired),
        carryingItem: null,
        airLevel: 100,
        worldPatch: completedPatch,
      };
      const nextMap = { ...missionCheckpointsRef.current, [completedId]: doneCp };
      missionCheckpointsRef.current = nextMap;
      setMissionCheckpoints(nextMap);

      pendingRecapRef.current = completedId;
      setPendingRecapMissionId(completedId);
      pendingNextMissionIdRef.current = null;
      setPendingNextMissionId(null);

      persistSaveSnapshot({
        missionId: completedId,
        completedMissions: nextCompleted,
        starsEarned: totalStarsCount,
        totalPoints: nextPoints,
        missionStars: nextMissionStars,
        earnedBadgeIds: earnedBadgeIdsRef.current,
        completedOptionalIds: completedOptionalIdsRef.current,
        pendingRecapMissionId: completedId,
        pendingNextMissionId: null,
        missionCheckpoints: nextMap,
      });
    },
    [
      discoveredAnomalies.length,
      discoveredLandmarks.length,
      persistSaveSnapshot,
      pushRewardToast,
      resolvedRoverIds.length,
      syncMilestoneBadges,
      worldPatch,
    ],
  );

  const advanceMissionStep = useCallback(
    (overridePatch?: Partial<WorldVisualState>, overrideAir?: number) => {
      if (!currentMission) return;
      setShowHint(false);
      setStuckSeconds(0);
      const finishedStep = currentMission.steps[stepIndex];
      const existingCp = missionCheckpointsRef.current[currentMission.id];
      const completedStepIds = Array.from(
        new Set([...(existingCp?.completedStepIds ?? []), ...(finishedStep ? [finishedStep.id] : [])]),
      );

      setMissionStatus('OBJECTIVE_COMPLETED');

      const nextIdx = stepIndex + 1;
      if (nextIdx < currentMission.steps.length) {
        const nextStep = currentMission.steps[nextIdx];
        const mergedPatch: Partial<WorldVisualState> = {
          ...worldPatch,
          ...overridePatch,
          crewFocusPos: nextStep.crewPos ?? null,
        };
        const nextRepaired = Boolean(
          mergedPatch.oxygenGeneratorRepaired ?? existingCp?.oxygenGeneratorRepaired,
        );

        setStepIndex(nextIdx);
        setMissionStatus('IN_PROGRESS');
        setWorldPatch(mergedPatch);

        saveCheckpointNow(currentMission.id, {
          status: 'IN_PROGRESS',
          stepIndex: nextIdx,
          completedStepIds,
          oxygenGeneratorRepaired: nextRepaired,
          carryingItem: mergedPatch.carryingItem ?? null,
          airLevel: overrideAir ?? resources.air,
          worldPatch: mergedPatch,
        });

        if (nextStep.dialogueOnStart) {
          setDialogueQueue(nextStep.dialogueOnStart);
        }
      } else {
        completeMission(currentMission.id);
      }
    },
    [currentMission, stepIndex, worldPatch, resources.air, saveCheckpointNow, completeMission],
  );

  const handleBackToMenu = useCallback(() => {
    soundEngine.playClick();
    if (missionId >= 1 && currentMission && missionStatus !== 'MISSION_COMPLETED') {
      const existingCp = missionCheckpointsRef.current[missionId];
      const clampedStep = Math.max(0, Math.min(stepIndex, currentMission.steps.length - 1));
      const repaired = Boolean(
        worldPatch.oxygenGeneratorRepaired || existingCp?.oxygenGeneratorRepaired,
      );
      saveCheckpointNow(missionId, {
        status: 'IN_PROGRESS',
        stepIndex: clampedStep,
        completedStepIds: existingCp?.completedStepIds ?? [],
        oxygenGeneratorRepaired: repaired,
        carryingItem: worldPatch.carryingItem ?? existingCp?.carryingItem ?? null,
        airLevel: repaired ? 100 : resources.air,
        worldPatch,
      });
    } else if (pendingRecapRef.current !== null || pendingNextMissionIdRef.current !== null) {
      persistSaveSnapshot({
        pendingRecapMissionId: pendingRecapRef.current,
        pendingNextMissionId: pendingNextMissionIdRef.current,
      });
    }
    setActiveEquipment(null);
    setActiveDiagnosticRover(null);
    setWeatherModalOpen(false);
    setChargingModalOpen(false);
    setActiveModal(null);
    setDialogueQueue([]);
    setScreen('title');
  }, [
    missionId,
    currentMission,
    missionStatus,
    stepIndex,
    worldPatch,
    resources.air,
    saveCheckpointNow,
    persistSaveSnapshot,
  ]);

  const completeOptionalTask = useCallback(
    (task: OptionalTaskSpec) => {
      if (completedOptionalIdsRef.current.includes(task.id)) return;
      soundEngine.playToolSuccess();
      engineRef.current?.triggerActionAnim(
        task.category === 'crew_help' ? 'communicate' : 'inspect',
        0.9,
      );

      const nextOptional = [...completedOptionalIdsRef.current, task.id];
      completedOptionalIdsRef.current = nextOptional;
      setCompletedOptionalIds(nextOptional);

      const nextPoints = totalPointsRef.current + task.rewardPoints;
      totalPointsRef.current = nextPoints;
      setTotalPoints(nextPoints);

      const totalDiscoveredNow =
        discoveredLandmarks.length + discoveredAnomalies.length + resolvedRoverIds.length;
      const newBadges = syncMilestoneBadges(
        completedMissionsRef.current,
        nextOptional,
        totalDiscoveredNow,
      );

      pushRewardToast(task.title, task.rewardPoints, {
        badgeTitle: newBadges[0] ? `${newBadges[0].icon} ${newBadges[0].title}` : undefined,
        accentColor: task.category === 'crew_help' ? '#ec4899' : '#14b8a6',
      });

      addJournalEntry({
        id: `opt_${task.id}`,
        title: `${task.categoryLabel}: ${task.title}`,
        category: 'Optional',
        summary: task.learnedFact,
      });

      persistSaveSnapshot({
        completedOptionalIds: nextOptional,
        totalPoints: nextPoints,
        earnedBadgeIds: earnedBadgeIdsRef.current,
      });
    },
    [
      addJournalEntry,
      discoveredAnomalies.length,
      discoveredLandmarks.length,
      persistSaveSnapshot,
      pushRewardToast,
      resolvedRoverIds.length,
      syncMilestoneBadges,
    ],
  );

  const handleInteractNode = useCallback(
    (nodeId: InteractiveNodeId) => {
      if (
        screen !== 'playing' ||
        dialogueQueue.length > 0 ||
        activeEquipment ||
        pendingRecapMissionId !== null ||
        missionFailedReason
      ) {
        return;
      }

      soundEngine.playClick();
      setStuckSeconds(0);
      engineRef.current?.triggerActionAnim('interact_panel', 0.8);

      if (!currentStep) return;

      // Mission 2 arrival check-in triggers smooth vehicle disembark sequence
      if (missionId === 2 && nodeId === 'm2_camp_checkin') {
        startCampArrivalSequenceRef.current();
        return;
      }

      // Safeguard: never re-open Oxygen Generator repair once already repaired in Mission 3
      if (
        missionId === 3 &&
        nodeId === 'm1_o2_panel' &&
        (worldPatch.oxygenGeneratorRepaired || missionCheckpointsRef.current[3]?.oxygenGeneratorRepaired)
      ) {
        const safePatch: Partial<WorldVisualState> = {
          ...worldPatch,
          oxygenGeneratorRepaired: true,
          o2AlarmActive: false,
          o2FanSpinning: true,
          carryingItem: null,
        };
        setWorldPatch(safePatch);
        setResources((r) => ({ ...r, air: 100 }));
        completeMission(3);
        return;
      }

      // Safeguard: never re-open Radio Console transmission once already transmitted in Mission 16
      if (
        missionId === 16 &&
        nodeId === 'm5_comms_console' &&
        stepIndex >= 3 &&
        (worldPatch.radioTransmitted || missionCheckpointsRef.current[16]?.worldPatch?.radioTransmitted)
      ) {
        pushToast('Communication dish signal already verified!', 'positive');
        completeMission(16);
        return;
      }

      const trigger = currentStep.nodeTriggers[nodeId];
      if (!trigger) return;

      const patchAccum: Partial<WorldVisualState> = {};

      if (trigger.carryingItem !== undefined) {
        patchAccum.carryingItem = trigger.carryingItem ?? null;
        setWorldPatch((prev) => ({ ...prev, carryingItem: trigger.carryingItem ?? null }));
        soundEngine.playToolSuccess();
        if (trigger.carryingItem) {
          setResources((r) => ({ ...r, spareParts: r.spareParts + 1 }));
          pushToast(`+1 Spare Part: Collected ${trigger.carryingItem}`, 'positive');
        }
      }
      if (trigger.patchWorld) {
        if (trigger.patchWorld.activeTool) {
          setActiveTool(trigger.patchWorld.activeTool);
        }
        if (trigger.patchWorld.weather) {
          setWeather(trigger.patchWorld.weather);
        }
        if (trigger.patchWorld.stormStage) {
          setStormStageOverride(trigger.patchWorld.stormStage);
        }
        Object.assign(patchAccum, trigger.patchWorld);
        setWorldPatch((prev) => ({ ...prev, ...trigger.patchWorld }));
        soundEngine.playToolSuccess();
      }
      if (trigger.dialogue) {
        setDialogueQueue(trigger.dialogue);
      }
      if (trigger.equipmentPanel) {
        completingEquipmentRef.current = false;
        setActiveEquipment(trigger.equipmentPanel);
        return;
      }
      if (nodeId === 'm6_harvest') {
        engineRef.current?.triggerActionAnim('collect_sample', 1.0);
        setResources((r) => ({ ...r, food: Math.min(100, r.food + 25) }));
        pushToast('+25% Food: Harvested ripe Mars tomatoes!', 'positive');
      }
      if (trigger.nextStep) {
        advanceMissionStep(patchAccum);
      }
    },
    [
      screen,
      dialogueQueue.length,
      activeEquipment,
      pendingRecapMissionId,
      missionFailedReason,
      missionId,
      currentStep,
      worldPatch,
      stepIndex,
      advanceMissionStep,
      completeMission,
      pushToast,
    ],
  );

  // Exploration Tool Actions (with matching 3D astronaut animation cues)
  const handleUseTool = useCallback(() => {
    if (screen !== 'playing' || dialogueQueue.length > 0 || activeEquipment) return;
    setStuckSeconds(0);
    if (activeTool === 'scanner') {
      soundEngine.playScannerPing();
      engineRef.current?.triggerActionAnim('use_scanner', 0.9);
      setScanPulseCounter((c) => c + 1);
      if (telemetry?.nearestLandmark && telemetry.nearestLandmark.distance < 25) {
        const lm = MARS_LANDMARKS.find((l) => l.id === telemetry.nearestLandmark?.id);
        if (lm) {
          pushToast(`Scanned ${lm.name}!`, 'positive');
          addJournalEntry({
            id: `scan_${lm.id}`,
            title: `Scan: ${lm.name}`,
            category: 'Sample',
            summary: lm.scienceFact,
          });
          return;
        }
      }
      if (telemetry) {
        pushToast(
          `Surface Scan: ${telemetry.surfaceType.toUpperCase()} · Alt ${telemetry.altitudeM}m · Slope ${telemetry.slopeDeg}°`,
          'info',
        );
      }
    } else if (activeTool === 'sample_collector') {
      soundEngine.playToolSuccess();
      engineRef.current?.triggerActionAnim('collect_sample', 1.1);
      setResources((r) => ({ ...r, samplesCollected: r.samplesCollected + 1 }));
      const surf = telemetry?.surfaceType ?? 'regolith';
      pushToast(`Collected Mars ${surf} sample!`, 'positive');
      addJournalEntry({
        id: `sample_${surf}_${Math.round(telemetry?.playerX ?? 0)}_${Math.round(telemetry?.playerZ ?? 0)}`,
        title: `Mars ${surf.toUpperCase()} Core Sample`,
        category: 'Sample',
        summary: `Collected near (${Math.round(telemetry?.playerX ?? 0)}, ${Math.round(telemetry?.playerZ ?? 0)}) in ${telemetry?.stormStageLabel ?? 'Calm'} conditions.`,
      });
    } else if (activeTool === 'camera') {
      soundEngine.playCameraShutter();
      engineRef.current?.triggerActionAnim('look_sky', 0.85);
      setPhotoFlash(true);
      window.setTimeout(() => setPhotoFlash(false), 140);
      const target =
        telemetry?.nearestAnomaly && telemetry.nearestAnomaly.distance < 18
          ? telemetry.nearestAnomaly.name
          : telemetry?.nearestLandmark && telemetry.nearestLandmark.distance < 25
            ? telemetry.nearestLandmark.name
            : telemetry?.solPhase === 'Sunset'
              ? 'Martian Blue Sunset'
              : telemetry?.solPhase === 'Night' && telemetry.phobosVisible
                ? 'Phobos Over Ares Outpost'
                : 'Mars Exploration Vista';
      pushToast(`Photo Saved: ${target}`, 'positive');
      addJournalEntry({
        id: `photo_${target.replace(/\s+/g, '_')}_sol${solNumber}`,
        title: `Photo: ${target}`,
        category: 'Photo',
        summary: `Captured at Sol ${solNumber} ${telemetry?.solTimeLabel ?? ''} (${telemetry?.outsideTempC ?? -30}°C simulated).`,
      });
    } else if (activeTool === 'signal_detector') {
      soundEngine.playRadioChirp();
      engineRef.current?.triggerActionAnim('communicate', 0.85);
      if (telemetry?.nearestLostRover) {
        pushToast(
          `Signal Ping: ${telemetry.nearestLostRover.id.toUpperCase()} ${telemetry.nearestLostRover.distance}m @ ${telemetry.nearestLostRover.bearingDeg}°`,
          'info',
        );
      }
    } else if (activeTool === 'drone') {
      soundEngine.playClick();
      engineRef.current?.triggerActionAnim('look_sky', 0.7);
      setDroneActive((d) => {
        const next = !d;
        if (!next) setDroneCameraView(false);
        pushToast(next ? 'Scout Drone Launched!' : 'Scout Drone Returned', 'info');
        return next;
      });
    } else if (activeTool === 'flashlight') {
      soundEngine.playClick();
      setFlashlightOn((f) => !f);
    }
  }, [
    screen,
    dialogueQueue.length,
    activeEquipment,
    activeTool,
    telemetry,
    solNumber,
    pushToast,
    addJournalEntry,
  ]);

  // Nearby Contextual Action (Lost Rover / MEV / Supply Terminal / Crew NPC / Anomaly / Pod)
  const nearbyContextAction = useMemo(() => {
    if (screen !== 'playing' || !telemetry) return null;

    if (telemetry.nearestLostRover && telemetry.nearestLostRover.distance <= 5.5) {
      const lr = LOST_ROVERS.find((r) => r.id === telemetry.nearestLostRover?.id);
      if (lr) {
        return {
          badge: 'RVR',
          label: `Inspect ${lr.name.split(' ')[0]} Rover`,
          onClick: () => {
            soundEngine.playClick();
            engineRef.current?.triggerActionAnim('inspect', 0.9);
            setActiveDiagnosticRover(lr);
            setActiveEquipment('rover_diagnostic');
          },
        };
      }
    }

    if (telemetry.nearRoverToBoard && !drivingRover) {
      const lowBat = telemetry.vehicleBatteryPct <= 2;
      return {
        badge: lowBat ? 'CHG' : 'E',
        label: lowBat
          ? 'EV Battery Empty! Solar Reserve Boost (+25%)'
          : 'Enter 6x6 Exploration Vehicle',
        onClick: () => {
          if (lowBat) {
            handleEmergencyEvBoostRef.current();
          } else {
            beginVehicleEnterRef.current();
          }
        },
      };
    }

    if ((telemetry.nearChargingConsole && !drivingRover) || (telemetry.vehicleInChargingBay && drivingRover)) {
      return {
        badge: 'CHG',
        label: 'Open Vehicle Charging Station',
        onClick: () => {
          soundEngine.playClick();
          engineRef.current?.triggerActionAnim('interact_panel', 0.7);
          setChargingModalOpen(true);
        },
      };
    }

    if (telemetry.nearSupplyTerminal && !drivingRover) {
      return {
        badge: 'SUP',
        label: 'Open Colony Supply Terminal',
        onClick: () => {
          soundEngine.playClick();
          engineRef.current?.triggerActionAnim('interact_panel', 0.7);
          setActiveModal('supplies');
        },
      };
    }

    if (telemetry.nearbyCrewId && telemetry.nearbyCrewDistance <= 3.6 && !drivingRover) {
      const cid = telemetry.nearbyCrewId;
      const prof = CHARACTERS_INFO[cid];
      const npcSt =
        cid === 'nova' ? undefined : telemetry.npcStatuses.find((n) => n.id === cid);
      return {
        badge: 'T',
        label: `Talk to ${prof.name} (${prof.role})`,
        onClick: () => {
          soundEngine.playRadioChirp();
          engineRef.current?.triggerActionAnim('communicate', 0.85);
          setTalkingNpcId(cid);
          setDialogueQueue(getCrewInteractionDialogue(cid, npcSt, visualState, resources));
        },
      };
    }

    if (!drivingRover) {
      const nearOpt = activeOptionalTasks.find(
        (t) => Math.hypot(telemetry.playerX - t.x, telemetry.playerZ - t.z) <= t.discoveryRadius,
      );
      if (nearOpt) {
        return {
          badge: `+${nearOpt.rewardPoints}`,
          label: `${nearOpt.promptAction} (E)`,
          onClick: () => completeOptionalTask(nearOpt),
        };
      }
    }

    if (telemetry.nearestAnomaly && telemetry.nearestAnomaly.distance <= 6.2 && !drivingRover) {
      const an = MARS_ANOMALIES.find((a) => a.id === telemetry.nearestAnomaly?.id);
      if (an) {
        return {
          badge: 'OBS',
          label: `Inspect ${an.name}`,
          onClick: () => {
            soundEngine.playScannerPing();
            engineRef.current?.triggerActionAnim('inspect', 1.0);
            pushToast(`${an.name}: ${an.storyNote}`, 'info');
          },
        };
      }
    }

    if (telemetry.nearestPod && telemetry.nearestPod.distance <= 5.4 && !drivingRover) {
      const pod = EXPANSION_PODS.find((p) => p.id === telemetry.nearestPod?.id);
      if (pod) {
        if (pod.id === 'weather_station') {
          return {
            badge: 'WX',
            label: 'Open Weather Monitoring Station',
            onClick: () => {
              soundEngine.playClick();
              engineRef.current?.triggerActionAnim('interact_panel', 0.7);
              setWeatherModalOpen(true);
            },
          };
        }
        return {
          badge: 'INFO',
          label: `${pod.name} Fact`,
          onClick: () => {
            soundEngine.playToolSuccess();
            pushToast(`${pod.name}: ${pod.funFact}`, 'info');
          },
        };
      }
    }

    return null;
  }, [screen, telemetry, drivingRover, pushToast, visualState, resources, activeOptionalTasks, completeOptionalTask]);

  const scheduleEvTimer = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    evTimersRef.current.push(id);
    return id;
  }, []);

  const telemetryRef = useRef(telemetry);
  telemetryRef.current = telemetry;
  const drivingRoverRef = useRef(drivingRover);
  drivingRoverRef.current = drivingRover;
  const evTransitionRef = useRef(evTransitionState);
  evTransitionRef.current = evTransitionState;
  const introPhaseRef = useRef(introPhase);
  introPhaseRef.current = introPhase;
  const activeSteerKeysRef = useRef<Set<string>>(new Set());

  const handleEmergencyEvBoost = useCallback(() => {
    engineRef.current?.addRoverBattery(25);
    soundEngine.playToolSuccess();
    pushToast('Solar Reserve Boost (+25%)! Your EV is charged and ready to enter.', 'positive');
  }, [pushToast]);
  const handleEmergencyEvBoostRef = useRef(handleEmergencyEvBoost);
  handleEmergencyEvBoostRef.current = handleEmergencyEvBoost;

  const beginVehicleEnter = useCallback(() => {
    const t = telemetryRef.current;
    if (
      introPhaseRef.current !== 'none' ||
      drivingRoverRef.current ||
      evTransitionRef.current !== 'idle' ||
      !t
    ) {
      return;
    }
    if (t.vehicleBatteryPct <= 2) {
      soundEngine.playAlert();
      pushToast('EV battery is empty! Tap Solar Reserve Boost or charge at the bay.', 'warning');
      return;
    }

    clearEvTimers();
    setEvTransitionState('entering');
    setStuckSeconds(0);

    const rx = t.roverX;
    const rz = t.roverZ;
    const ryaw = t.roverYaw;
    const leftHatch = getMevHatchWorldPos(rx, rz, ryaw, 1.68, 0.18, 'left');
    const faceRoverYaw = Math.atan2(rx - leftHatch[0], rz - leftHatch[1]);

    soundEngine.playClick();
    engineRef.current?.startScriptedWalk('alex', [t.playerX, t.playerZ], leftHatch, 0.55, faceRoverYaw);
    setWorldPatch((p) => ({
      ...p,
      hatchForcedOpen: false,
      rightHatchForcedOpen: false,
      vehicleDashLit: false,
    }));

    scheduleEvTimer(() => {
      soundEngine.playDoorAirlock(true);
      setWorldPatch((p) => ({
        ...p,
        hatchForcedOpen: true,
        alexPosOverride: leftHatch,
        alexYawOverride: faceRoverYaw,
        alexWalkSpeed: 0,
        alexActionOverride: 'boarding_left',
      }));
    }, 560);

    scheduleEvTimer(() => {
      soundEngine.playDoorAirlock(false);
      soundEngine.playVehicleBoot();
      setWorldPatch((p) => ({
        ...p,
        hatchForcedOpen: false,
        alexPosOverride: null,
        alexWalkSpeed: 0,
        alexActionOverride: 'none',
        alexSeatedInRover: true,
        vehicleDashLit: true,
      }));
    }, 1050);

    scheduleEvTimer(() => {
      setWorldPatch((p) => ({
        ...p,
        alexPosOverride: null,
        alexActionOverride: 'none',
        hatchForcedOpen: false,
        alexSeatedInRover: true,
        vehicleDashLit: true,
      }));
      setDrivingRover(true);
      setEvTransitionState('idle');

      if (!evTutorialCompletedRef.current) {
        evMoveAccumMRef.current = 0;
        evSteerAccumSecRef.current = 0;
        evLastRoverPosRef.current = { x: rx, z: rz };
        setEvTutorialStep('accel');
        pushToast('Dashboard online! Hold W / ↑ or tap Drive! to roll forward.', 'positive');
      } else {
        const destName = rawMissionTargetRef.current?.label;
        pushToast(
          destName
            ? `EV ready! Follow the golden route to ${destName}!`
            : 'Driving Exploration Vehicle! Follow the golden route or press V for Cockpit Cam.',
          'positive',
        );
      }
    }, 1450);
  }, [clearEvTimers, pushToast, scheduleEvTimer]);
  const beginVehicleEnterRef = useRef(beginVehicleEnter);
  beginVehicleEnterRef.current = beginVehicleEnter;

  const beginVehicleExit = useCallback(() => {
    const t = telemetryRef.current;
    if (
      introPhaseRef.current !== 'none' ||
      !drivingRoverRef.current ||
      evTransitionRef.current !== 'idle' ||
      !t
    ) {
      return;
    }
    if (t.vehicleSpeedKmh > 12) {
      soundEngine.playAlert();
      pushToast('Slow down to a gentle stop before stepping out!', 'warning');
      return;
    }

    clearEvTimers();
    setEvTransitionState('exiting');
    setEvTutorialStep('idle');
    setDrivingRover(false);
    setVehicleCamMode('exterior');
    setStuckSeconds(0);

    const rx = t.roverX;
    const rz = t.roverZ;
    const ryaw = t.roverYaw;
    const leftHatch = getMevHatchWorldPos(rx, rz, ryaw, 1.65, 0.18, 'left');
    const rawStepOut = getMevHatchWorldPos(rx, rz, ryaw, 2.38, 0.35, 'left');
    const safeExit = resolveCharacterCollisions(rawStepOut[0], rawStepOut[1], 0.42);
    const exitSpot: [number, number] = [safeExit.x, safeExit.z];
    const exitYaw = ryaw + Math.PI * 0.5;

    soundEngine.playDoorAirlock(true);
    setWorldPatch((p) => ({
      ...p,
      hatchForcedOpen: true,
      alexSeatedInRover: false,
      vehicleDashLit: false,
      alexPosOverride: leftHatch,
      alexYawOverride: exitYaw,
      alexWalkSpeed: 0,
      alexActionOverride: 'exiting_vehicle',
    }));

    scheduleEvTimer(() => {
      soundEngine.playDoorAirlock(false);
      setWorldPatch((p) => ({
        ...p,
        hatchForcedOpen: false,
        alexActionOverride: 'none',
      }));
      engineRef.current?.startScriptedWalk('alex', leftHatch, exitSpot, 0.52, exitYaw);
    }, 520);

    scheduleEvTimer(() => {
      engineRef.current?.setPlayerLocation(exitSpot[0], exitSpot[1], exitYaw);
      setWorldPatch((p) => ({
        ...p,
        hatchForcedOpen: false,
        alexPosOverride: null,
        alexYawOverride: null,
        alexWalkSpeed: 0,
        alexActionOverride: 'none',
        alexSeatedInRover: false,
      }));
      setEvTransitionState('idle');
      const target = rawMissionTargetRef.current;
      const distAtExit = target
        ? Math.hypot(target.pos[0] - exitSpot[0], target.pos[1] - exitSpot[1])
        : 999;
      if (target && distAtExit <= 16) {
        pushToast(`Walk up to ${target.label} and press E to get started!`, 'positive');
      } else {
        pushToast('Stepped out of Exploration Vehicle!', 'info');
      }
    }, 1080);
  }, [clearEvTimers, pushToast, scheduleEvTimer]);

  const handleVehicleInteract = useCallback(() => {
    if (introPhaseRef.current !== 'none' || evTransitionRef.current !== 'idle') return;
    if (drivingRoverRef.current) {
      beginVehicleExit();
    } else if (telemetryRef.current?.nearRoverToBoard) {
      beginVehicleEnter();
    }
  }, [beginVehicleEnter, beginVehicleExit]);
  const interactVehicleRef = useRef(handleVehicleInteract);
  interactVehicleRef.current = handleVehicleInteract;

  const interactRef = useRef(handleInteractNode);
  interactRef.current = handleInteractNode;
  const nearbyRef = useRef<InteractiveNodeId | null>(null);
  nearbyRef.current = nearbyNodeId;
  const useToolRef = useRef(handleUseTool);
  useToolRef.current = handleUseTool;
  const nearbyOptRef = useRef<OptionalTaskSpec | null>(null);
  nearbyOptRef.current =
    screen === 'playing' && telemetry && !drivingRover
      ? activeOptionalTasks.find(
          (t) => Math.hypot(telemetry.playerX - t.x, telemetry.playerZ - t.z) <= t.discoveryRadius,
        ) ?? null
      : null;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new MarsColonyEngine(container, INITIAL_WORLD, {
      onInteractNode: (nid) => interactRef.current(nid),
      onInteractVehicle: () => interactVehicleRef.current(),
      onNearbyNodeChange: (nid) => setNearbyNodeId(nid),
      onInsideBuildingChange: (bid) => setInsideBuildingId(bid),
      onTelemetryUpdate: (t) => setTelemetry(t),
      onWebGLContextLost: (lost) => setContextLost(lost),
    });
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setVisualState(visualState);
  }, [visualState]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        activeSteerKeysRef.current.add(e.code);
        steerKeysHeldRef.current = true;
      }

      if (e.code === 'Escape') {
        if (activeEquipment) {
          setActiveEquipment(null);
        } else if (chargingModalOpen) {
          setChargingModalOpen(false);
        } else if (weatherModalOpen) {
          setWeatherModalOpen(false);
        } else if (activeModal) {
          setActiveModal(null);
        } else if (screen === 'playing' && !missionFailedReason) {
          setActiveModal('pause');
        }
        return;
      }

      if (dialogueQueue.length > 0 && (e.code === 'Enter' || e.code === 'KeyE')) {
        e.preventDefault();
        handleAdvanceDialogueRef.current();
        return;
      }

      if (screen !== 'playing' || activeModal || activeEquipment || chargingModalOpen || weatherModalOpen) return;

      if (e.code === 'KeyE') {
        if (introPhase === 'none' && drivingRover) {
          e.preventDefault();
          handleVehicleInteract();
        } else if (nearbyRef.current) {
          e.preventDefault();
          interactRef.current(nearbyRef.current);
        } else if (nearbyOptRef.current) {
          e.preventDefault();
          completeOptionalTask(nearbyOptRef.current);
        } else if (introPhase === 'none' && telemetry?.nearRoverToBoard) {
          e.preventDefault();
          handleVehicleInteract();
        }
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        soundEngine.playClick();
        setSettings((s) => ({ ...s, showMinimap: !s.showMinimap }));
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        soundEngine.playClick();
        if (drivingRover) {
          setVehicleHeadlights((h) => !h);
        } else {
          setFlashlightOn((f) => !f);
        }
      } else if (e.code === 'KeyV' && drivingRover && (introPhase === 'none' || introPhase === 'drive_to_camp')) {
        e.preventDefault();
        soundEngine.playClick();
        setVehicleCamMode((m) => (m === 'exterior' ? 'interior' : 'exterior'));
      } else if (
        e.code === 'KeyT' &&
        introPhase === 'none' &&
        !drivingRover &&
        telemetry?.nearbyCrewId &&
        telemetry.nearbyCrewDistance <= 3.8
      ) {
        e.preventDefault();
        const cid = telemetry.nearbyCrewId;
        const npcSt = cid === 'nova' ? undefined : telemetry.npcStatuses.find((n) => n.id === cid);
        soundEngine.playRadioChirp();
        engineRef.current?.triggerActionAnim('communicate', 0.85);
        setTalkingNpcId(cid);
        setDialogueQueue(getCrewInteractionDialogue(cid, npcSt, visualState, resources));
      } else if (e.code === 'KeyC' && introPhase === 'none') {
        e.preventDefault();
        setCrouched((c) => !c);
      } else if (e.code === 'KeyQ' && introPhase === 'none') {
        e.preventDefault();
        useToolRef.current();
      } else if (e.code === 'KeyR' && introPhase === 'none') {
        e.preventDefault();
        handleVehicleInteract();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        activeSteerKeysRef.current.delete(e.code);
        steerKeysHeldRef.current = activeSteerKeysRef.current.size > 0;
      }
    };

    const onBlur = () => {
      activeSteerKeysRef.current.clear();
      steerKeysHeldRef.current = false;
      touchSteerHeldRef.current = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [
    activeEquipment,
    activeModal,
    chargingModalOpen,
    weatherModalOpen,
    screen,
    dialogueQueue,
    introPhase,
    missionFailedReason,
    drivingRover,
    telemetry,
    pushToast,
    visualState,
    resources,
    completeOptionalTask,
    handleVehicleInteract,
  ]);

  // Mission 1 Scene 2: Nova opens the remote relay door and hands control to Alex
  const startMission1OpenPanel = useCallback(() => {
    clearIntroChoreography();
    const novaPanelPos: [number, number] = [121.2, 48.3];
    const alexStandPos: [number, number] = [122.9, 48.35];
    const novaYaw = Math.atan2(REMOTE_SITE_POS[0] - novaPanelPos[0], REMOTE_SITE_POS[1] - novaPanelPos[1]);
    const alexYaw = Math.atan2(REMOTE_SITE_POS[0] - alexStandPos[0], REMOTE_SITE_POS[1] - alexStandPos[1]);

    setCutsceneCaption('Commander Nova opens the Remote Relay cabinet door...');
    setWorldPatch((p) => ({
      ...p,
      cutsceneTarget: [122.0, 1.35, 48.0],
      cutsceneEyeOffset: [4.6, 2.4, 5.4],
    }));
    engineRef.current?.startScriptedWalk('nova', [121.4, 49.2], novaPanelPos, 0.9, novaYaw);
    engineRef.current?.startScriptedWalk('alex', [123.3, 48.3], alexStandPos, 0.8, alexYaw);

    scheduleIntroTimer(() => {
      soundEngine.playDoorAirlock(true);
      setWorldPatch((p) => ({
        ...p,
        novaPosOverride: novaPanelPos,
        novaYawOverride: novaYaw,
        novaWalkSpeed: 0,
        novaActionOverride: 'open_panel',
        alexPosOverride: alexStandPos,
        alexYawOverride: alexYaw,
        alexWalkSpeed: 0,
        alexActionOverride: 'inspect',
        relayPanelOpen: true,
      }));
      setCutsceneCaption('Cabinet unlocked! Your turn to stabilize the relay electronics!');
    }, 1000);

    scheduleIntroTimer(() => {
      clearIntroChoreography();
      setIntroPhase('relay_repair');
      setCutsceneCaption(null);
      engineRef.current?.setPlayerLocation(alexStandPos[0], alexStandPos[1], alexYaw);
      setWorldPatch((p) => ({
        ...p,
        introPhase: 'relay_repair',
        relayPanelOpen: true,
        alexPosOverride: null,
        alexActionOverride: 'none',
        novaPosOverride: [120.7, 48.8],
        novaYawOverride: novaYaw,
        novaActionOverride: 'none',
        cutsceneTarget: null,
        cutsceneEyeOffset: null,
      }));
      pushToast('Walk up to the open Remote Relay cabinet and press E to stabilize it!', 'info');
    }, 2350);
  }, [clearIntroChoreography, pushToast, scheduleIntroTimer]);

  // Mission 2 Scene 3: Natural walking to MEV opposite hatches, dual boarding, boot, and drive transition
  const startMission2VehicleBoarding = useCallback(() => {
    clearIntroChoreography();
    const leftHatch = getMevHatchWorldPos(REMOTE_MEV_START.x, REMOTE_MEV_START.z, REMOTE_MEV_START.yaw, 1.72, 0.18, 'left');
    const rightHatch = getMevHatchWorldPos(REMOTE_MEV_START.x, REMOTE_MEV_START.z, REMOTE_MEV_START.yaw, 1.72, 0.18, 'right');
    const faceRoverLeft = Math.atan2(REMOTE_MEV_START.x - leftHatch[0], REMOTE_MEV_START.z - leftHatch[1]);
    const faceRoverRight = Math.atan2(REMOTE_MEV_START.x - rightHatch[0], REMOTE_MEV_START.z - rightHatch[1]);

    setIntroPhase('vehicle_entry');
    setCutsceneCaption('Alex and Commander Nova walk together to the parked Exploration Vehicle...');
    setWorldPatch((p) => ({
      ...p,
      introPhase: 'vehicle_entry',
      cutsceneTarget: [REMOTE_MEV_START.x, 1.45, REMOTE_MEV_START.z],
      cutsceneEyeOffset: [-7.4, 3.6, 8.0],
    }));

    engineRef.current?.startScriptedWalk('alex', [122.8, 48.4], leftHatch, 2.7, faceRoverLeft);
    engineRef.current?.startScriptedWalk('nova', [120.7, 48.8], rightHatch, 2.7, faceRoverRight);

    scheduleIntroTimer(() => {
      soundEngine.playDoorAirlock(true);
      setWorldPatch((p) => ({
        ...p,
        hatchForcedOpen: true,
        rightHatchForcedOpen: true,
        alexPosOverride: leftHatch,
        alexYawOverride: faceRoverLeft,
        alexWalkSpeed: 0,
        alexActionOverride: 'open_door',
        novaPosOverride: rightHatch,
        novaYawOverride: faceRoverRight,
        novaWalkSpeed: 0,
        novaActionOverride: 'open_door',
      }));
      setCutsceneCaption('Vehicle hatches swing open — stepping smoothly inside...');
    }, 2800);

    scheduleIntroTimer(() => {
      setWorldPatch((p) => ({
        ...p,
        alexActionOverride: 'boarding_left',
        novaActionOverride: 'boarding_right',
      }));
    }, 3450);

    scheduleIntroTimer(() => {
      setWorldPatch((p) => ({
        ...p,
        alexPosOverride: null,
        alexWalkSpeed: 0,
        alexActionOverride: 'none',
        alexSeatedInRover: true,
        novaPosOverride: null,
        novaWalkSpeed: 0,
        novaActionOverride: 'none',
        novaSeatedInRover: true,
      }));
      setDrivingRover(true);
      setCutsceneCaption('Both seated! Closing doors and starting dashboard systems...');
    }, 4350);

    scheduleIntroTimer(() => {
      soundEngine.playDoorAirlock(false);
      setWorldPatch((p) => ({
        ...p,
        hatchForcedOpen: false,
        rightHatchForcedOpen: false,
      }));
    }, 5050);

    scheduleIntroTimer(() => {
      soundEngine.playVehicleBoot();
      setVehicleHeadlights(true);
      setWorldPatch((p) => ({
        ...p,
        vehicleDashLit: true,
        cutsceneTarget: [REMOTE_MEV_START.x, 1.5, REMOTE_MEV_START.z],
        cutsceneEyeOffset: [4.2, 2.9, 6.2],
      }));
      engineRef.current?.setRoverAutopilotTarget({
        x: 109.5,
        z: 45.2,
        yaw: -Math.PI * 0.62,
      });
      setCutsceneCaption('Dashboard online! Exploration Vehicle rolling west toward Ares Colony...');
    }, 5800);

    scheduleIntroTimer(() => {
      engineRef.current?.setRoverAutopilotTarget(null);
      setIntroPhase('drive_to_camp');
      setCutsceneCaption(null);
      minCampDistRef.current = 999;
      wrongWayStartRef.current = 0;
      setDrivingWrongWay(false);
      setDrivingRover(true);
      setWorldPatch((p) => ({
        ...p,
        introPhase: 'drive_to_camp',
        alexSeatedInRover: true,
        novaSeatedInRover: true,
        cutsceneTarget: null,
        cutsceneEyeOffset: null,
      }));
      const campRoute = computeNavigationRoute(
        109.5,
        45.2,
        RESEARCH_CAMP_PARKING_POS[0],
        RESEARCH_CAMP_PARKING_POS[1],
        'vehicle',
        {
          destinationId: 'research_camp',
          destinationName: 'Ares Colony',
          destinationCategory: 'colony',
        },
      );
      setActiveRoute(campRoute);
      setLiveRouteDistM(campRoute.totalDistanceM);
      pushToast("Your turn, Astronaut! Let's return to the colony.", 'positive');
    }, 7600);
  }, [clearIntroChoreography, pushToast, scheduleIntroTimer]);

  const startCampArrivalSequence = useCallback(() => {
    clearIntroChoreography();
    setIntroPhase('camp_arrival');
    setActiveRoute(null);
    setDrivingWrongWay(false);
    setDrivingRover(false);
    const campYaw = Math.PI * 0.88;
    const leftHatch = getMevHatchWorldPos(RESEARCH_CAMP_PARKING_POS[0], RESEARCH_CAMP_PARKING_POS[1], campYaw, 1.72, 0.18, 'left');
    const rightHatch = getMevHatchWorldPos(RESEARCH_CAMP_PARKING_POS[0], RESEARCH_CAMP_PARKING_POS[1], campYaw, 1.72, 0.18, 'right');
    const alexColonySpot: [number, number] = [14.5, -12.2];
    const novaColonySpot: [number, number] = [16.8, -13.2];

    engineRef.current?.setRoverAutopilotTarget({
      x: RESEARCH_CAMP_PARKING_POS[0],
      z: RESEARCH_CAMP_PARKING_POS[1],
      yaw: campYaw,
    });
    setWorldPatch((p) => ({
      ...p,
      introPhase: 'camp_arrival',
      alexSeatedInRover: true,
      novaSeatedInRover: true,
      cutsceneTarget: [RESEARCH_CAMP_PARKING_POS[0], 1.45, RESEARCH_CAMP_PARKING_POS[1]],
      cutsceneEyeOffset: [7.5, 4.4, 7.5],
    }));
    setCutsceneCaption('Arriving at the Ares Colony Rover Bay...');

    scheduleIntroTimer(() => {
      engineRef.current?.setRoverAutopilotTarget(null);
      soundEngine.playDoorAirlock(true);
      setWorldPatch((p) => ({
        ...p,
        hatchForcedOpen: true,
        rightHatchForcedOpen: true,
        alexSeatedInRover: false,
        novaSeatedInRover: false,
        alexPosOverride: leftHatch,
        alexYawOverride: campYaw + Math.PI * 0.5,
        alexActionOverride: 'exiting_vehicle',
        novaPosOverride: rightHatch,
        novaYawOverride: campYaw - Math.PI * 0.5,
        novaActionOverride: 'exiting_vehicle',
      }));
      setCutsceneCaption('Alex and Commander Nova step out smoothly at Ares Colony...');
    }, 1850);

    scheduleIntroTimer(() => {
      soundEngine.playDoorAirlock(false);
      setWorldPatch((p) => ({
        ...p,
        hatchForcedOpen: false,
        rightHatchForcedOpen: false,
        alexActionOverride: 'none',
        novaActionOverride: 'none',
      }));
      engineRef.current?.startScriptedWalk('alex', leftHatch, alexColonySpot, 1.4, -1.6);
      engineRef.current?.startScriptedWalk('nova', rightHatch, novaColonySpot, 1.4, -1.2);
    }, 2650);

    scheduleIntroTimer(() => {
      clearIntroChoreography();
      setIntroPhase('none');
      setCutsceneCaption(null);
      engineRef.current?.setPlayerLocation(alexColonySpot[0], alexColonySpot[1], -1.6);
      setWorldPatch((p) => ({
        ...p,
        introPhase: 'none',
        alexPosOverride: null,
        novaPosOverride: null,
        cutsceneTarget: null,
        cutsceneEyeOffset: null,
      }));
      completeMission(2);
    }, 4350);
  }, [clearIntroChoreography, completeMission, scheduleIntroTimer]);

  const startCampArrivalSequenceRef = useRef(startCampArrivalSequence);
  startCampArrivalSequenceRef.current = startCampArrivalSequence;

  // Monitor Mission 2 Scene 4 Driving Progress & Gentle Non-Punishing Wrong-Way Guidance
  useEffect(() => {
    if (screen !== 'playing' || introPhase !== 'drive_to_camp' || !telemetry) return;
    const dist = Math.hypot(
      telemetry.roverX - RESEARCH_CAMP_PARKING_POS[0],
      telemetry.roverZ - RESEARCH_CAMP_PARKING_POS[1],
    );

    if (dist < 6.8) {
      startCampArrivalSequence();
      return;
    }

    if (dist < minCampDistRef.current) {
      minCampDistRef.current = dist;
      wrongWayStartRef.current = 0;
      if (drivingWrongWay) setDrivingWrongWay(false);
    } else if (dist > minCampDistRef.current + 7.5) {
      const now = Date.now();
      if (!wrongWayStartRef.current) {
        wrongWayStartRef.current = now;
      } else if (now - wrongWayStartRef.current > 1500 && !drivingWrongWay) {
        setDrivingWrongWay(true);
      }
    }
  }, [screen, introPhase, telemetry, drivingWrongWay, startCampArrivalSequence]);

  const handleAdvanceDialogue = useCallback(() => {
    soundEngine.playClick();
    const rest = dialogueQueue.slice(1);
    setDialogueQueue(rest);
    if (rest.length === 0 && pendingActionAfterDialogue) {
      const act = pendingActionAfterDialogue;
      setPendingActionAfterDialogue(null);
      if (act === 'intro_open_relay_panel') {
        startMission1OpenPanel();
      } else if (act === 'm2_board_vehicle') {
        startMission2VehicleBoarding();
      } else if (act === 'to_finale') {
        setScreen('finale');
      }
    }
  }, [
    dialogueQueue,
    pendingActionAfterDialogue,
    startMission1OpenPanel,
    startMission2VehicleBoarding,
  ]);

  const handleAdvanceDialogueRef = useRef(handleAdvanceDialogue);
  handleAdvanceDialogueRef.current = handleAdvanceDialogue;

  const handleSkipIntro = useCallback(() => {
    soundEngine.playClick();
    clearIntroChoreography();
    setPendingActionAfterDialogue(null);
    setDialogueQueue([]);
    setDrivingWrongWay(false);
    setCutsceneCaption(null);

    if (introPhase === 'site_inspection') {
      const alexStandPos: [number, number] = [122.9, 48.35];
      const alexYaw = Math.atan2(REMOTE_SITE_POS[0] - alexStandPos[0], REMOTE_SITE_POS[1] - alexStandPos[1]);
      setDrivingRover(false);
      setIntroPhase('relay_repair');
      engineRef.current?.setPlayerLocation(alexStandPos[0], alexStandPos[1], alexYaw);
      setWorldPatch((p) => ({
        ...p,
        introPhase: 'relay_repair',
        relayPanelOpen: true,
        alexPosOverride: null,
        alexActionOverride: 'none',
        novaPresent: true,
        novaPosOverride: [120.7, 48.8],
        novaYawOverride: alexYaw,
        novaActionOverride: 'none',
        cutsceneTarget: null,
        cutsceneEyeOffset: null,
      }));
      pushToast('Press E beside the open Remote Relay cabinet to repair it!', 'info');
      return;
    }

    if (introPhase === 'vehicle_entry') {
      engineRef.current?.setRoverSnapshot(109.5, 45.2, -Math.PI * 0.62, 100);
      setIntroPhase('drive_to_camp');
      setDrivingRover(true);
      setVehicleHeadlights(true);
      setWorldPatch((p) => ({
        ...p,
        introPhase: 'drive_to_camp',
        hatchForcedOpen: false,
        rightHatchForcedOpen: false,
        vehicleDashLit: true,
        alexPosOverride: null,
        novaPosOverride: null,
        alexSeatedInRover: true,
        novaSeatedInRover: true,
        cutsceneTarget: null,
        cutsceneEyeOffset: null,
      }));
      const campRoute = computeNavigationRoute(
        109.5,
        45.2,
        RESEARCH_CAMP_PARKING_POS[0],
        RESEARCH_CAMP_PARKING_POS[1],
        'vehicle',
        {
          destinationId: 'research_camp',
          destinationName: 'Ares Colony',
          destinationCategory: 'colony',
        },
      );
      setActiveRoute(campRoute);
      setLiveRouteDistM(campRoute.totalDistanceM);
      pushToast("Your turn, Astronaut! Let's return to the colony.", 'positive');
      return;
    }

    // Fast-Forward Drive or Colony Arrival -> park cleanly at Ares Colony and complete Mission 2
    setDrivingRover(false);
    setIntroPhase('none');
    engineRef.current?.setRoverSnapshot(
      RESEARCH_CAMP_PARKING_POS[0],
      RESEARCH_CAMP_PARKING_POS[1],
      Math.PI * 0.88,
      100,
    );
    engineRef.current?.setPlayerLocation(14.5, -12.2, -1.6);
    setWorldPatch((p) => ({
      ...p,
      introPhase: 'none',
      hatchForcedOpen: false,
      rightHatchForcedOpen: false,
      alexSeatedInRover: false,
      novaSeatedInRover: false,
      alexPosOverride: null,
      novaPosOverride: null,
      cutsceneTarget: null,
      cutsceneEyeOffset: null,
    }));
    completeMission(2);
  }, [clearIntroChoreography, completeMission, introPhase, pushToast]);

  const spendSparePart = (label: string) => {
    setResources((r) => ({
      ...r,
      spareParts: Math.max(0, r.spareParts - 1),
    }));
    pushToast(`−1 Spare Part: ${label}`, 'info');
  };

  const handleEquipmentComplete = () => {
    if (completingEquipmentRef.current) {
      console.warn('[Equipment] Duplicate completion callback blocked');
      return;
    }
    const panel = activeEquipment;
    if (!panel) return;
    completingEquipmentRef.current = true;
    setActiveEquipment(null);
    engineRef.current?.triggerActionAnim('repair', 1.0);

    if (panel === 'rover_diagnostic') {
      if (activeDiagnosticRover) {
        const rid = activeDiagnosticRover.id;
        const alreadyRecovered = resolvedRoverIds.includes(rid);
        if (!alreadyRecovered) {
          setResolvedRoverIds((prev) => [...prev, rid]);
          const nextPts = totalPointsRef.current + REWARD_POINTS.SPECIAL_CHALLENGE;
          totalPointsRef.current = nextPts;
          setTotalPoints(nextPts);
          pushRewardToast(
            `Recovered ${activeDiagnosticRover.name}!`,
            REWARD_POINTS.SPECIAL_CHALLENGE,
            { accentColor: '#38bdf8' },
          );
          syncMilestoneBadges(
            completedMissionsRef.current,
            completedOptionalIdsRef.current,
            discoveredLandmarks.length + discoveredAnomalies.length + resolvedRoverIds.length + 1,
          );
        } else {
          pushToast(`Re-synced ${activeDiagnosticRover.name} archive!`, 'info');
        }
        addJournalEntry({
          id: `rover_${rid}`,
          title: `Recovered: ${activeDiagnosticRover.name}`,
          category: 'Rover',
          summary: `${activeDiagnosticRover.realHistoricalFact} (${activeDiagnosticRover.simulatedMissionTask})`,
        });
      }
      setActiveDiagnosticRover(null);
      if (missionId === 12 && stepIndex >= 3) {
        setDrivingRover(false);
        completeMission(12);
      } else if (missionId === 13 && stepIndex >= 1) {
        setDrivingRover(false);
        completeMission(13);
      }
      return;
    }

    if (panel === 'm1_relay_stabilize') {
      setWorldPatch((prev) => ({ ...prev, relayPanelOpen: true, relayRepaired: true, crewMood: 'celebrating' }));
      pushToast('Remote Relay Locked Green! Radio beam restored across the canyon!', 'positive');
      completeMission(1);
    } else if (panel === 'm1_circuit_repair' || panel === 'm1_filter_repair') {
      const alreadyRepaired = Boolean(
        worldPatch.oxygenGeneratorRepaired || missionCheckpointsRef.current[3]?.oxygenGeneratorRepaired,
      );
      if (!alreadyRepaired) {
        spendSparePart('Repaired Oxygen Circuit');
      }
      setResources((r) => ({ ...r, air: 100 }));
      setWorldPatch((prev) => ({
        ...prev,
        oxygenGeneratorRepaired: true,
        o2AlarmActive: false,
        o2FanSpinning: true,
        carryingItem: null,
        crewMood: 'celebrating',
      }));
      pushToast('Great Job! Colony Oxygen Restored!', 'positive');
      setActiveRoute(null);
      completeMission(3);
    } else if (panel === 'm2_valve_turn') {
      setWorldPatch((prev) => ({ ...prev, waterLeakActive: false, waterValveClosed: true }));
      pushToast('Water Leak Stopped: Shutoff valve closed!', 'positive');
      setDialogueQueue([
        {
          speaker: 'Leo',
          role: 'Colony Engineer',
          avatar: 'leo',
          text: 'Nice turn! The water spray stopped right away! Now clamp that cracked pipe joint inside!',
          focusTarget: [-11.2, 1.2, -7.8],
        },
      ]);
      advanceMissionStep();
    } else if (panel === 'm2_pipe_repair') {
      spendSparePart('Pipe Clamp Repair');
      setResources((r) => ({ ...r, water: 100 }));
      pushToast('Water Restored: Recycled water sealed & flowing!', 'positive');
      setWorldPatch((prev) => ({
        ...prev,
        waterValveClosed: false,
        waterPuddleVisible: false,
        carryingItem: null,
      }));
      completeMission(4);
    } else if (panel === 'm3_solar_clean') {
      setWorldPatch((prev) => ({ ...prev, solarDusty: false }));
      setResources((r) => ({ ...r, power: Math.min(100, r.power + 22) }));
      pushToast('+Power Boost: Solar wings cleared of Mars dust!', 'positive');
      if (missionId === 20) {
        setDialogueQueue([
          {
            speaker: 'Ryan',
            role: 'Comms Officer',
            avatar: 'ryan',
            text: 'Solar panels are gleaming at full power! Sprint to Command Centre and ignite the golden Landing Beacon!',
            focusTarget: [0, 3.2, -11.5],
          },
        ]);
      } else {
        setDialogueQueue([
          {
            speaker: 'Maya',
            role: 'Scientist',
            avatar: 'maya',
            text: 'Solar cells are sparkling clean! Now plug the sparking junction cable back home!',
            focusTarget: [-13.0, 1.3, 13.6],
          },
        ]);
      }
      advanceMissionStep();
    } else if (panel === 'm3_cable_plug') {
      spendSparePart('Secured High-Voltage Cable');
      setResources((r) => ({ ...r, power: 100 }));
      pushToast('Power Restored: Colony solar grid back online!', 'positive');
      setWorldPatch((prev) => ({ ...prev, cableSparking: false, powerBlackout: false }));
      completeMission(5);
    } else if (panel === 'm4_water_tube') {
      spendSparePart('Replaced Irrigation Tube');
      setResources((r) => ({ ...r, water: Math.max(0, r.water - 5) }));
      setWorldPatch((prev) => ({ ...prev, plantsWilting: false, gardenStage: 1 }));
      pushToast('Hydrated Greenhouse garden beds!', 'positive');
      setDialogueQueue([
        {
          speaker: 'Zara',
          role: 'Botanist',
          avatar: 'zara',
          text: 'Water is misting across the trays! Now tune our pink grow lights!',
          focusTarget: [12.9, 1.4, -1.5],
        },
      ]);
      advanceMissionStep();
    } else if (panel === 'm4_light_tuner') {
      setResources((r) => ({ ...r, power: Math.max(0, r.power - 4) }));
      setWorldPatch((prev) => ({ ...prev, plantsWilting: false, gardenStage: 2 }));
      pushToast('Grow lights tuned to healthy pink spectrum!', 'positive');
      setDialogueQueue([
        {
          speaker: 'Zara',
          role: 'Botanist',
          avatar: 'zara',
          text: 'Perfect glow! Now plant fresh tomato seeds in the beds!',
          focusTarget: [11.3, 1.2, -1.5],
        },
      ]);
      advanceMissionStep();
    } else if (panel === 'm4_seed_garden') {
      setWorldPatch((prev) => ({ ...prev, plantsWilting: false, tomatoesRipe: true, gardenStage: 3 }));
      setResources((r) => ({ ...r, food: Math.min(100, r.food + 25) }));
      pushToast('+25% Food: Fresh Mars tomatoes grown!', 'positive');
      completeMission(6);
    } else if (panel === 'm7_recycler_clean') {
      spendSparePart('Water Recycler Filter');
      setResources((r) => ({ ...r, water: 100 }));
      setWorldPatch((prev) => ({ ...prev, carryingItem: null }));
      pushToast('Water Recycler cleaned & sparkling!', 'positive');
      completeMission(7);
    } else if (panel === 'm8_medical_scan') {
      setResources((r) => ({ ...r, crewCondition: 100 }));
      setWorldPatch((prev) => ({ ...prev, carryingItem: null }));
      pushToast('All Astronaut Health Checks Passed 100%!', 'positive');
      completeMission(8);
    } else if (panel === 'm9_food_sort') {
      setResources((r) => ({ ...r, food: 100 }));
      setWorldPatch((prev) => ({ ...prev, carryingItem: null }));
      pushToast('Colony Food Pantry sorted & stocked!', 'positive');
      completeMission(9);
    } else if (panel === 'm10_thermal_balance') {
      setWorldPatch((prev) => ({ ...prev, crewMood: 'celebrating' }));
      pushToast('Crew Home warmed up to a cozy 21°C!', 'positive');
      completeMission(10);
    } else if (panel === 'm11_beacon_tune') {
      setDrivingRover(false);
      pushToast('North Valley Exploration Beacon pulsing bright!', 'positive');
      completeMission(11);
    } else if (panel === 'm14_mountain_cal') {
      setDrivingRover(false);
      pushToast('Mountain Research Station sensors calibrated!', 'positive');
      completeMission(14);
    } else if (panel === 'm5_dish_align') {
      pushToast('Signal Locked: Parabolic dish aimed at relay satellite!', 'positive');
      advanceMissionStep();
    } else if (panel === 'm5_radio_test') {
      setWorldPatch((prev) => ({
        ...prev,
        radioTransmissionPct: 100,
        radioTransmitted: true,
      }));
      pushToast('Signal Crisp: Colony Communication Network 100% Online!', 'positive');
      addJournalEntry({
        id: 'm16_radio_restored',
        title: 'Communication Dish Re-Aligned',
        category: 'Transmission',
        summary: 'Re-aimed the parabolic space dish after storm gusts and restored full voice clarity.',
      });
      completeMission(16);
    } else if (panel === 'm17_satellite_align') {
      setResources((r) => ({ ...r, power: 100 }));
      pushToast('Sun-Tracking Uplink Locked! Solar efficiency boosted!', 'positive');
      completeMission(17);
    } else if (panel === 'm18_weather_cal') {
      pushToast('Remote Weather Mast spinning smoothly! Return forecast to Command Centre!', 'positive');
      advanceMissionStep();
    } else if (panel === 'm6_rad_shielding') {
      spendSparePart('Packed Regolith Shielding');
      setWorldPatch((prev) => ({ ...prev, shelterShieldLevel: 3, carryingItem: null }));
      pushToast('+Shelter Shielding 100%: Regolith walls & roof packed!', 'positive');
      setDialogueQueue([
        {
          speaker: 'Maya',
          role: 'Scientist',
          avatar: 'maya',
          text: 'Thick regolith soil blocks are locked into place! Run the Shelter Storm Drill console!',
          focusTarget: [-1.7, 1.3, 13.8],
        },
      ]);
      advanceMissionStep();
    } else if (panel === 'm6_rad_storm_drill') {
      setWorldPatch((prev) => ({ ...prev, radiationDrillActive: false }));
      setResources((r) => ({ ...r, crewCondition: 100 }));
      pushToast('Storm Shield Drill Passed! Check the Backup Emergency Habitat Switch outside!', 'positive');
      advanceMissionStep();
    } else if (panel === 'm19_emergency_panel') {
      setWorldPatch((prev) => ({ ...prev, radiationDrillActive: false, shelterDoorsClosed: true }));
      pushToast('Backup Emergency Dome Tested & Verified!', 'positive');
      completeMission(19);
    } else if (panel === 'm7_battery_lever') {
      setWorldPatch((prev) => ({ ...prev, powerBlackout: false }));
      setResources((r) => ({ ...r, power: 100 }));
      pushToast('+Backup Power Online: Storm batteries engaged!', 'positive');
      setDialogueQueue([
        {
          speaker: 'Maya',
          role: 'Scientist',
          avatar: 'maya',
          text: 'Backup batteries locked online! Hurry inside the Greenhouse and close the storm shields!',
          focusTarget: [9.4, 1.5, -1.5],
        },
      ]);
      advanceMissionStep();
    } else if (panel === 'm7_shutter_slide') {
      setWorldPatch((prev) => ({ ...prev, stormShuttersClosed: true }));
      pushToast('Greenhouse Shields Closed! Head inside Radiation Shelter to seal up safely.', 'positive');
      advanceMissionStep();
    } else if (panel === 'm7_beacon_ignition') {
      setWorldPatch((prev) => ({
        ...prev,
        beaconBeamActive: true,
        dustStormActive: false,
        solarDusty: false,
      }));
      advanceMissionStep();
    }
  };

  const activeProfile = CHARACTERS_INFO[activeCharacterId];

  const pendingNextMission =
    pendingNextMissionId !== null
      ? CAMPAIGN_MISSIONS.find((m) => m.id === pendingNextMissionId) ?? null
      : null;

  const evGuideActive = Boolean(visualState.evGuideActive);
  const evArrivalRingPos = visualState.evArrivalRingPos ?? null;
  const evArrivedAtZone = Boolean(visualState.evArrivedAtZone);
  const evCanExitAtZone = Boolean(evArrivedAtZone && (telemetry?.vehicleSpeedKmh ?? 0) <= 2);
  const evBatteryEmpty = Boolean(telemetry && telemetry.vehicleBatteryPct <= 2);
  const evDestinationName = rawMissionTarget?.label ?? null;

  const objectiveLabel = pendingNextMission
    ? 'Colony Free Roam'
    : currentMission?.label ?? 'Mars Adventure';
  const objectiveTitle = pendingNextMission
    ? 'Explore & Help Your Crew'
    : currentMission?.title ?? 'Ares Colony';
  const objectiveText = pendingNextMission
    ? `Explore the colony, find discoveries, or help crew members! Next: ${pendingNextMission.label}.`
    : introPhase === 'drive_to_camp'
      ? "Your turn, Astronaut! Let's return to the colony."
      : evGuideActive
        ? "Let's find our exploration vehicle!"
        : drivingRover && introPhase === 'none' && rawMissionTarget
          ? `Drive to ${rawMissionTarget.label}.`
          : currentStep?.objectiveText ?? 'Explore Ares Colony';
  const hintText = pendingNextMission
    ? 'Check Optional Tasks in your Tracker or click Start Next Mission whenever ready!'
    : introPhase === 'drive_to_camp'
      ? 'Follow the glowing golden route on your map back to Ares Colony!'
      : evGuideActive
        ? 'Follow the golden marker to the parked 6x6 Exploration Vehicle and press E or tap it!'
        : drivingRover && evArrivedAtZone
          ? 'Stop inside the green ring, then press E or tap Exit EV!'
          : currentStep?.hintText ?? 'Look for the golden beacon marker!';

  // Active minimap radar target coordinate
  let activeTargetPos: [number, number] | null = rawMissionTarget ? rawMissionTarget.pos : null;
  let activeTargetLabel: string | undefined = rawMissionTarget?.label;
  if (evGuideActive && telemetry) {
    activeTargetPos = [telemetry.roverX, telemetry.roverZ];
    activeTargetLabel = 'Exploration Vehicle';
  }

  const stuckKey = `${missionId}_${stepIndex}_${introPhase}`;
  const stuckHintText =
    (introPhase === 'none' || introPhase === 'relay_repair') &&
    stuckSeconds >= 26 &&
    stuckDismissedKey !== stuckKey
      ? hintText
      : null;
  const radarOpen =
    screen === 'playing' &&
    (introPhase === 'none' || introPhase === 'relay_repair' || introPhase === 'drive_to_camp') &&
    pendingRecapMissionId === null &&
    !weatherModalOpen &&
    !chargingModalOpen &&
    settings.showMinimap;

  const questSteps = useMemo(() => {
    if (introPhase === 'drive_to_camp') {
      return [{ id: 'drive_to_camp', label: 'Drive MEV back to Ares Colony', done: false, active: true }];
    }
    if (!currentMission || pendingNextMission) return [];
    return currentMission.steps.map((st, idx) => ({
      id: st.id,
      label: st.objectiveText,
      done: idx < stepIndex,
      active: idx === stepIndex,
    }));
  }, [introPhase, currentMission, pendingNextMission, stepIndex]);

  const optionalTaskItems = useMemo<OptionalTaskTrackerItem[]>(() => {
    const px = telemetry?.playerX ?? 0;
    const pz = telemetry?.playerZ ?? 6;
    return activeOptionalTasks.map((t) => ({
      id: t.id,
      title: t.title,
      categoryLabel: t.categoryLabel,
      rewardPoints: t.rewardPoints,
      distanceM: Math.round(Math.hypot(t.x - px, t.z - pz)),
      x: t.x,
      z: t.z,
    }));
  }, [activeOptionalTasks, telemetry?.playerX, telemetry?.playerZ]);

  const questDestinationName = evGuideActive
    ? 'Exploration Vehicle'
    : drivingRover && introPhase === 'none' && rawMissionTarget
      ? rawMissionTarget.label
      : activeRoute?.destinationName ?? activeTargetLabel ?? null;
  const questActionHint = evGuideActive
    ? telemetry?.nearRoverToBoard
      ? 'Here is our exploration vehicle! Press E / Tap to Enter'
      : 'Follow the golden marker to the EV.'
    : drivingRover && introPhase === 'none' && rawMissionTarget
      ? evCanExitAtZone
        ? 'Press E / Tap to Exit EV!'
        : evArrivedAtZone
          ? 'Hold S / Brake to stop inside the green ring!'
          : 'Follow the golden route!'
      : nearbyNodeId
        ? `Press E · ${INTERACTIVE_NODES[nearbyNodeId].promptAction}`
        : introPhase === 'drive_to_camp'
          ? 'Drive along the glowing golden path to Ares Colony'
          : currentStep?.step5Flow?.whatToDo ?? objectiveText;

  const pendingRecap =
    pendingRecapMissionId !== null ? LEARNING_RECAPS[pendingRecapMissionId] ?? null : null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#050814] select-none">
      {/* Full-viewport 3D Three.js Canvas */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {contextLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 text-white p-6">
          <div className="max-w-sm text-center space-y-2">
            <h2 className="font-display text-xl font-bold">Restoring 3D View…</h2>
            <p className="text-sm text-slate-300">
              Your graphics context paused briefly and will resume automatically.
            </p>
          </div>
        </div>
      )}

      {/* TITLE SCREEN */}
      {screen === 'title' && (
        <TitleScreen
          hasSavedProgress={Boolean(savedProgress)}
          modalOpen={Boolean(activeModal)}
          savedMissionNumber={(() => {
            if (!savedProgress) return 1;
            if (savedProgress.pendingNextMissionId) return savedProgress.pendingNextMissionId;
            if (savedProgress.pendingRecapMissionId) return savedProgress.pendingRecapMissionId;
            const curr = Math.max(1, savedProgress.currentMissionId ?? savedProgress.highestMission ?? 1);
            if (savedProgress.completedMissions.includes(curr) && curr < 20) {
              return curr + 1;
            }
            return curr;
          })()}
          onStartNew={() => {
            soundEngine.init();
            soundEngine.playClick();
            setCompletedMissions([]);
            completedMissionsRef.current = [];
            setMissionStars({});
            missionStarsRef.current = {};
            setEarnedBadgeIds([]);
            earnedBadgeIdsRef.current = [];
            setCompletedOptionalIds([]);
            completedOptionalIdsRef.current = [];
            setTotalPoints(0);
            totalPointsRef.current = 0;
            pendingRecapRef.current = null;
            setPendingRecapMissionId(null);
            pendingNextMissionIdRef.current = null;
            setPendingNextMissionId(null);
            setWeatherModalOpen(false);
            setChargingModalOpen(false);
            setVehicleChargingRequested(false);
            setActiveRoute(null);
            setStuckSeconds(0);
            setStarsEarned(0);
            starsEarnedRef.current = 0;
            setMissionCheckpoints({});
            missionCheckpointsRef.current = {};
            setResolvedRoverIds([]);
            setDiscoveredLandmarks([]);
            setDiscoveredAnomalies([]);
            setJournalEntries([]);
            setSolNumber(1);
            setSolProgress(0.44);
            setWeather('Clear');
            setCargoDelivery(INITIAL_CARGO_DELIVERY);
            setReceivedNovaMsgs([]);
            setVehicleCamMode('exterior');
            setVehicleHeadlights(false);
            evTutorialCompletedRef.current = false;
            setEvTutorialCompleted(false);
            setEvTutorialStep('idle');
            evGuidanceToastKeyRef.current = '';
            evArrivalToastKeyRef.current = '';
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch {
              // ignore
            }
            setSavedProgress(null);
            beginMission(1, true);
          }}
          onContinue={() => {
            soundEngine.init();
            soundEngine.playClick();
            if (savedProgress) {
              const restoredDone = savedProgress.completedMissions ?? [];
              setCompletedMissions(restoredDone);
              completedMissionsRef.current = restoredDone;
              const restoredMStars = savedProgress.missionStars ?? {};
              setMissionStars(restoredMStars);
              missionStarsRef.current = restoredMStars;
              const restoredBadges = savedProgress.earnedBadgeIds ?? [];
              setEarnedBadgeIds(restoredBadges);
              earnedBadgeIdsRef.current = restoredBadges;
              const restoredOpt = savedProgress.completedOptionalIds ?? [];
              setCompletedOptionalIds(restoredOpt);
              completedOptionalIdsRef.current = restoredOpt;
              const restoredPts = savedProgress.totalPoints ?? 0;
              setTotalPoints(restoredPts);
              totalPointsRef.current = restoredPts;
              setStarsEarned(savedProgress.starsEarned);
              starsEarnedRef.current = savedProgress.starsEarned;
              const restoredCps = savedProgress.missionCheckpoints ?? {};
              setMissionCheckpoints(restoredCps);
              missionCheckpointsRef.current = restoredCps;
              setResolvedRoverIds(savedProgress.resolvedRoverIds ?? []);
              setDiscoveredLandmarks(savedProgress.discoveredLandmarks ?? []);
              setDiscoveredAnomalies(savedProgress.discoveredAnomalies ?? []);
              setJournalEntries(savedProgress.journalEntries ?? []);
              if (savedProgress.solNumber) setSolNumber(savedProgress.solNumber);
              if (typeof savedProgress.solProgress === 'number') setSolProgress(savedProgress.solProgress);
              if (savedProgress.weather) setWeather(savedProgress.weather);
              setCargoDelivery({
                ...INITIAL_CARGO_DELIVERY,
                deliveredCount: savedProgress.deliveredCount ?? 0,
              });
              setReceivedNovaMsgs(savedProgress.receivedNovaMsgs ?? restoredDone);
              const restoredEvTut = Boolean(savedProgress.evTutorialCompleted);
              evTutorialCompletedRef.current = restoredEvTut;
              setEvTutorialCompleted(restoredEvTut);

              const targetMission = Math.max(1, savedProgress.currentMissionId ?? savedProgress.highestMission);
              let resumeMissionId = targetMission;

              if (savedProgress.pendingRecapMissionId) {
                const recapId = savedProgress.pendingRecapMissionId;
                const doneMission = CAMPAIGN_MISSIONS.find((m) => m.id === recapId);
                const doneCp = restoredCps[recapId];
                clearIntroChoreography();
                setMissionId(recapId);
                setMissionStatus('MISSION_COMPLETED');
                setIntroPhase('none');
                pendingNextMissionIdRef.current = null;
                setPendingNextMissionId(null);
                setStepIndex(Math.max(0, (doneMission?.steps.length ?? 1) - 1));
                setScreen('playing');
                setActiveModal(null);
                setActiveEquipment(null);
                setDialogueQueue([]);
                setPendingActionAfterDialogue(null);
                setWorldPatch({
                  ...(doneMission?.initialWorldPatch ?? {}),
                  ...(doneCp?.worldPatch ?? {}),
                  introPhase: 'none',
                  alexPosOverride: null,
                  novaPosOverride: null,
                  alexSeatedInRover: false,
                  novaSeatedInRover: false,
                  hatchForcedOpen: false,
                  rightHatchForcedOpen: false,
                  unlockedCrewIds: doneMission?.unlockedCrewIds ?? ['leo', 'maya', 'zara', 'ryan'],
                });
                if (recapId === 1) {
                  engineRef.current?.setPlayerLocation(122.9, 48.35, -1.5);
                }
                pendingRecapRef.current = recapId;
                setPendingRecapMissionId(recapId);
                resumeMissionId = recapId;
              } else if (
                savedProgress.pendingNextMissionId ||
                (restoredDone.includes(20) && targetMission >= 20)
              ) {
                const nextM = savedProgress.pendingNextMissionId ?? null;
                const prevDoneId = nextM ? Math.max(1, nextM - 1) : 20;
                const prevMission = CAMPAIGN_MISSIONS.find((m) => m.id === prevDoneId);
                const prevCp = restoredCps[prevDoneId];
                clearIntroChoreography();
                setMissionId(prevDoneId);
                setMissionStatus('MISSION_COMPLETED');
                setIntroPhase('none');
                pendingNextMissionIdRef.current = nextM;
                setPendingNextMissionId(nextM);
                pendingRecapRef.current = null;
                setPendingRecapMissionId(null);
                setStepIndex(Math.max(0, (prevMission?.steps.length ?? 1) - 1));
                setScreen('playing');
                setActiveModal(null);
                setActiveEquipment(null);
                setDialogueQueue([]);
                setPendingActionAfterDialogue(null);
                setWorldPatch({
                  ...(prevMission?.initialWorldPatch ?? {}),
                  ...(prevCp?.worldPatch ?? {}),
                  introPhase: 'none',
                  alexPosOverride: null,
                  novaPosOverride: null,
                  alexSeatedInRover: false,
                  novaSeatedInRover: false,
                  hatchForcedOpen: false,
                  rightHatchForcedOpen: false,
                  unlockedCrewIds: prevMission?.unlockedCrewIds ?? ['leo', 'maya', 'zara', 'ryan'],
                  ...(prevDoneId >= 20
                    ? { beaconBeamActive: true, landerState: 'gone' as const, dustStormActive: false, solarDusty: false }
                    : {}),
                });
                if (nextM) {
                  pushToast(`Resumed Free Roam! Explore Mars or start Mission ${nextM} whenever ready.`, 'info');
                } else {
                  pushToast('Resumed Ares Colony Free Roam — Champion Explorer!', 'positive');
                }
                resumeMissionId = prevDoneId;
              } else {
                const isMidReplay = restoredCps[targetMission]?.status === 'IN_PROGRESS';
                resumeMissionId =
                  restoredDone.includes(targetMission) && !isMidReplay && targetMission < 20
                    ? targetMission + 1
                    : targetMission;
                beginMission(resumeMissionId, false, true);
              }

              if (savedProgress.resources) {
                const m3Repaired = Boolean(restoredCps[3]?.oxygenGeneratorRepaired);
                setResources({
                  ...savedProgress.resources,
                  air: resumeMissionId === 3 && m3Repaired ? 100 : savedProgress.resources.air,
                });
              }
              if (
                savedProgress.roverSnapshot &&
                (resumeMissionId >= 2 || restoredDone.includes(1) || Boolean(savedProgress.pendingRecapMissionId))
              ) {
                const snap = savedProgress.roverSnapshot;
                engineRef.current?.setRoverSnapshot(snap.x, snap.z, snap.yaw, snap.battery);
              }
            } else {
              beginMission(1, true);
            }
          }}
          onOpenMissionSelect={() => {
            soundEngine.init();
            soundEngine.playClick();
            setActiveModal('missions');
          }}
          onOpenSettings={() => {
            soundEngine.init();
            soundEngine.playClick();
            setActiveModal('settings');
          }}
          onOpenCredits={() => {
            soundEngine.init();
            soundEngine.playClick();
            setActiveModal('credits');
          }}
        />
      )}

      {/* CINEMATIC & EXPLORATION OVERLAY */}
      {(screen === 'cinematic_space' ||
        screen === 'cinematic_landing' ||
        screen === 'playing' ||
        screen === 'cinematic_ending') && (
        <CinematicOverlay
          screen={screen}
          missionLabel={objectiveLabel}
          missionTitle={objectiveTitle}
          objectiveText={objectiveText}
          hintText={hintText}
          showHint={showHint}
          onToggleHint={() => setShowHint((h) => !h)}
          starsEarned={starsEarned}
          totalPoints={totalPoints}
          discoveredCount={discoveredCount}
          rewardToasts={rewardToasts}
          unlockedCrewIds={unlockedCrewIds}
          activeOptionalIds={activeOptionalIds}
          optionalTaskItems={optionalTaskItems}
          onRouteOptionalTask={(task) =>
            handleSetRoute({
              id: task.id,
              name: task.title,
              category: 'exploration',
              x: task.x,
              z: task.z,
            })
          }
          carryingItem={visualState.carryingItem}
          oxygenGeneratorRepaired={Boolean(visualState.oxygenGeneratorRepaired)}
          insideBuildingId={insideBuildingId}
          resources={resources}
          resourceToasts={resourceToasts}
          telemetry={telemetry ? { ...telemetry, solNumber } : null}
          nearbyNodeId={nearbyNodeId}
          nearbyContextAction={nearbyContextAction}
          onInteractNearby={() => {
            if (nearbyNodeId) handleInteractNode(nearbyNodeId);
          }}
          activeTool={activeTool}
          onSelectTool={(t) => {
            if (t === 'drone') {
              soundEngine.playClick();
              setDroneActive((prev) => {
                const next = !prev;
                if (!next) setDroneCameraView(false);
                pushToast(next ? 'Scout Drone Deployed!' : 'Scout Drone Landed', 'info');
                return next;
              });
              return;
            }
            soundEngine.playClick();
            setActiveTool(t);
          }}
          onUseTool={handleUseTool}
          flashlightOn={flashlightOn}
          onToggleFlashlight={() => {
            soundEngine.playClick();
            setFlashlightOn((f) => !f);
          }}
          crouched={crouched}
          onToggleCrouch={() => setCrouched((c) => !c)}
          drivingRover={drivingRover}
          onToggleRover={handleVehicleInteract}
          vehicleCamMode={vehicleCamMode}
          onToggleVehicleCam={() => {
            soundEngine.playClick();
            setVehicleCamMode((m) => (m === 'exterior' ? 'interior' : 'exterior'));
          }}
          vehicleHeadlights={vehicleHeadlights}
          onToggleVehicleHeadlights={() => {
            soundEngine.playClick();
            setVehicleHeadlights((h) => !h);
          }}
          cargoDelivery={cargoDelivery}
          onOpenSupplies={() => setActiveModal('supplies')}
          resolvedRovers={resolvedRoverIds}
          discoveredLandmarks={discoveredLandmarks}
          missionId={missionId}
          activeTargetPos={activeTargetPos}
          activeTargetLabel={activeTargetLabel}
          pendingNextMissionLabel={pendingNextMission ? pendingNextMission.label : null}
          onStartPendingMission={
            pendingNextMissionId !== null
              ? () => beginMission(pendingNextMissionId, true, true)
              : undefined
          }
          stormWarningActive={Boolean(visualState.stormWarningActive)}
          stormWarningCountdown={visualState.stormWarningCountdown ?? 0}
          outdoorGearSecured={Boolean(visualState.outdoorGearSecured)}
          onSecureOutdoorGear={handleSecureOutdoorGear}
          onOpenWeatherMonitor={() => setWeatherModalOpen(true)}
          onOpenChargingStation={() => setChargingModalOpen(true)}
          stuckHintText={stuckHintText}
          onDismissStuckHint={() => setStuckDismissedKey(stuckKey)}
          radarOpen={radarOpen}
          onToggleRadar={() => setSettings((s) => ({ ...s, showMinimap: !s.showMinimap }))}
          radarExpanded={radarExpanded}
          onToggleRadarExpand={() => setRadarExpanded((v) => !v)}
          mapOpen={activeModal === 'map'}
          activeRoute={activeRoute}
          onClearRoute={() => {
            manualRouteClearedRef.current = true;
            customRouteActiveRef.current = false;
            setOffTrackAlert(false);
            setActiveRoute(null);
          }}
          droneActive={droneActive}
          droneCameraView={droneCameraView}
          onToggleDroneCamera={() => {
            soundEngine.playClick();
            setDroneCameraView((v) => !v);
          }}
          photoFlash={photoFlash}
          onJoystickMove={(r, f) => {
            touchSteerHeldRef.current = Math.abs(r) > 0.2;
            engineRef.current?.setTouchMove(r, f);
          }}
          onTouchSprintChange={(active) => engineRef.current?.setTouchSprint(active)}
          onTouchJump={() => engineRef.current?.triggerJump()}
          dialogueQueue={dialogueQueue}
          onAdvanceDialogue={handleAdvanceDialogue}
          onSkipIntro={
            introPhase !== 'none' && introPhase !== 'relay_repair' ? handleSkipIntro : undefined
          }
          introPhase={introPhase}
          cutsceneCaption={cutsceneCaption}
          drivingWrongWay={drivingWrongWay}
          step5Flow={currentStep?.step5Flow}
          questSteps={questSteps}
          liveRouteDistM={liveRouteDistM}
          offTrackAlert={offTrackAlert}
          destinationName={questDestinationName}
          actionHint={questActionHint}
          questTransitionKey={`${missionId}_${stepIndex}_${introPhase}_${evGuideActive ? 'ev' : 'dest'}`}
          recapOpen={pendingRecapMissionId !== null}
          evGuideActive={evGuideActive}
          evArrivedAtZone={evArrivedAtZone && Boolean(evArrivalRingPos)}
          evCanExitAtZone={evCanExitAtZone}
          evBatteryEmpty={evBatteryEmpty}
          evDestinationName={evDestinationName}
          evTransitionState={evTransitionState}
          evTutorialStep={evTutorialStep}
          onBoardVehicle={beginVehicleEnter}
          onExitVehicle={beginVehicleExit}
          onEmergencyEvBoost={handleEmergencyEvBoost}
          onDismissEvTutorial={() => {
            setEvTutorialStep('done');
            evTutorialCompletedRef.current = true;
            setEvTutorialCompleted(true);
            persistSaveSnapshot({ evTutorialCompleted: true });
          }}
          onOpenControlsHelp={() => setActiveModal('controls')}
          touchControlsMode={settings.touchControlsMode}
          muted={!settings.musicEnabled && !settings.sfxEnabled}
          onToggleMute={() => {
            const anyOn = settings.musicEnabled || settings.sfxEnabled;
            setSettings((s) => ({ ...s, musicEnabled: !anyOn, sfxEnabled: !anyOn }));
          }}
          onOpenCrewAssistant={() => setActiveModal('crew')}
          onOpenNasaData={() => setActiveModal('nasa')}
          onOpenMap={() => setActiveModal('map')}
          onOpenBadges={() => setActiveModal('badges')}
          onBack={handleBackToMenu}
          onPause={() => setActiveModal('pause')}
        />
      )}

      {/* TACTILE EQUIPMENT CLOSE-UP MODAL */}
      {activeEquipment && (
        <EquipmentPanelModal
          panel={activeEquipment}
          activeRole={activeProfile.crewRoleId}
          shelterShieldLevel={visualState.shelterShieldLevel}
          oxygenGeneratorRepaired={Boolean(visualState.oxygenGeneratorRepaired)}
          radioTransmissionPct={worldPatch.radioTransmissionPct ?? 0}
          radioTransmitted={Boolean(worldPatch.radioTransmitted)}
          activeRover={activeDiagnosticRover}
          onShieldProgress={(lvl) =>
            setWorldPatch((prev) => ({ ...prev, shelterShieldLevel: lvl }))
          }
          onRadioProgress={(pct) =>
            setWorldPatch((prev) => ({ ...prev, radioTransmissionPct: pct }))
          }
          onComplete={handleEquipmentComplete}
          onCancel={() => {
            if (activeEquipment === 'm5_radio_test' && missionId === 16) {
              const cp = missionCheckpointsRef.current[16];
              saveCheckpointNow(16, {
                status: 'IN_PROGRESS',
                stepIndex,
                completedStepIds: cp?.completedStepIds ?? ['m16_step1', 'm16_step2', 'm16_step3'],
                oxygenGeneratorRepaired: Boolean(cp?.oxygenGeneratorRepaired),
                carryingItem: worldPatch.carryingItem ?? null,
                airLevel: resources.air,
                worldPatch,
              });
            }
            completingEquipmentRef.current = false;
            setActiveEquipment(null);
            setActiveDiagnosticRover(null);
          }}
        />
      )}

      {/* POST-MISSION VISUAL LEARNING RECAP MODAL (ZERO QUIZZES!) */}
      {pendingRecapMissionId !== null && pendingRecap && (
        <LearningRecapModal
          recap={pendingRecap}
          earnedStars={missionStars[pendingRecapMissionId] ?? 3}
          pointsAwarded={lastMissionPointsAwarded}
          totalPoints={totalPoints}
          totalStars={starsEarned}
          hasNextMission={pendingRecapMissionId < 20}
          onContinueNextMission={() => {
            const finishedId = pendingRecapMissionId;
            pendingRecapRef.current = null;
            setPendingRecapMissionId(null);
            pendingNextMissionIdRef.current = null;
            setPendingNextMissionId(null);
            persistSaveSnapshot({ pendingRecapMissionId: null, pendingNextMissionId: null });
            if (finishedId >= 20) {
              triggerMission20Ending();
            } else {
              beginMission(finishedId + 1, true, true);
            }
          }}
          onExploreColony={() => {
            const finishedId = pendingRecapMissionId;
            pendingRecapRef.current = null;
            setPendingRecapMissionId(null);
            if (finishedId < 20) {
              const nextId = finishedId + 1;
              pendingNextMissionIdRef.current = nextId;
              setPendingNextMissionId(nextId);
              persistSaveSnapshot({ pendingRecapMissionId: null, pendingNextMissionId: nextId });
              pushToast(
                `Free Roam! Explore Mars, help crew (+${REWARD_POINTS.HELP_CREW} pts), or click Start ${CAMPAIGN_MISSIONS[nextId - 1]?.label ?? 'Next'}!`,
                'info',
              );
            } else {
              pendingNextMissionIdRef.current = null;
              setPendingNextMissionId(null);
              persistSaveSnapshot({ pendingRecapMissionId: null, pendingNextMissionId: null });
              triggerMission20Ending();
            }
          }}
        />
      )}

      {/* WEATHER MONITORING STATION CONSOLE */}
      {weatherModalOpen && telemetry && (
        <WeatherStationModal
          telemetry={{ ...telemetry, solNumber }}
          stormStage={visualState.stormStage}
          stormWarningActive={Boolean(visualState.stormWarningActive)}
          stormWarningCountdown={visualState.stormWarningCountdown ?? 0}
          shelterDoorsClosed={Boolean(visualState.shelterDoorsClosed)}
          stormShuttersClosed={Boolean(visualState.stormShuttersClosed)}
          solarDusty={Boolean(visualState.solarDusty)}
          insideShelter={insideBuildingId === 'radiation_shelter'}
          outdoorGearSecured={Boolean(visualState.outdoorGearSecured)}
          powerPct={resources.power}
          onClose={() => setWeatherModalOpen(false)}
          onTriggerStormDrill={() => {
            setStormStageOverride(3);
            setWeather('Local Storm');
            setWorldPatch((prev) => ({
              ...prev,
              stormStage: 3,
              stormWarningActive: true,
              stormWarningCountdown: 35,
              dustStormActive: false,
            }));
            soundEngine.playAlert();
            pushToast('Storm Drill Started: Stage 3 Warning — 35s until Regional Storm!', 'warning');
          }}
          onToggleShelterDoors={(closed) => {
            setWorldPatch((prev) => ({ ...prev, shelterDoorsClosed: closed }));
            soundEngine.playDoorAirlock(!closed);
            pushToast(
              closed
                ? 'Radiation Shelter blast doors sealed! Use Mast Camera or Monitor safely indoors.'
                : 'Radiation Shelter blast doors unsealed!',
              'info',
            );
          }}
          onSecureOutdoorGear={handleSecureOutdoorGear}
          onAdvanceToClearing={() => {
            setStormStageOverride(5);
            setWeather('Light Dust');
            setWorldPatch((prev) => ({
              ...prev,
              stormStage: 5,
              dustStormActive: false,
              stormWarningActive: false,
              stormWarningCountdown: 0,
              shelterDoorsClosed: false,
            }));
            soundEngine.playToolSuccess();
            pushToast('Stage 5 Clearing Watch: Dust storm settling! Inspect solar wings.', 'positive');
          }}
        />
      )}

      {/* VEHICLE CHARGING STATION CONSOLE */}
      {chargingModalOpen && telemetry && (
        <ChargingStationModal
          telemetry={{ ...telemetry, solNumber }}
          colonyPowerPct={resources.power}
          chargingRequested={vehicleChargingRequested}
          onToggleCharging={() => {
            setVehicleChargingRequested((prev) => {
              const next = !prev;
              pushToast(
                next
                  ? 'Charging Station active — transfers continue even if you step out!'
                  : 'Vehicle charging paused.',
                next ? 'positive' : 'info',
              );
              return next;
            });
          }}
          onNavigateToBay={() =>
            handleSetRoute({
              id: 'charging_station',
              name: 'Vehicle Charging Station',
              category: 'colony',
              x: CHARGING_CONSOLE_POS[0] - 5.2,
              z: CHARGING_CONSOLE_POS[1] - 1.8,
            })
          }
          onClose={() => setChargingModalOpen(false)}
        />
      )}

      {/* CHILD-FRIENDLY MISSION FAILED RETRY MODAL */}
      {missionFailedReason && (
        <MissionFailedModal
          reasonTitle={missionFailedReason.title}
          reasonDetail={missionFailedReason.detail}
          onRetry={() => beginMission(missionId, true)}
          onMainMenu={handleBackToMenu}
        />
      )}

      {/* FINALE SCREEN */}
      {screen === 'finale' && (
        <AdventureFinaleScreen
          starsEarned={starsEarned}
          totalPoints={totalPoints}
          earnedBadgeIds={earnedBadgeIds}
          completedOptionalIds={completedOptionalIds}
          onPlayAgain={() => {
            setCompletedMissions([]);
            completedMissionsRef.current = [];
            setMissionStars({});
            missionStarsRef.current = {};
            setEarnedBadgeIds([]);
            earnedBadgeIdsRef.current = [];
            setCompletedOptionalIds([]);
            completedOptionalIdsRef.current = [];
            setTotalPoints(0);
            totalPointsRef.current = 0;
            pendingRecapRef.current = null;
            setPendingRecapMissionId(null);
            setWeatherModalOpen(false);
            setChargingModalOpen(false);
            setVehicleChargingRequested(false);
            setActiveRoute(null);
            setStuckSeconds(0);
            setStarsEarned(0);
            starsEarnedRef.current = 0;
            setMissionCheckpoints({});
            missionCheckpointsRef.current = {};
            setResolvedRoverIds([]);
            setDiscoveredLandmarks([]);
            setDiscoveredAnomalies([]);
            setJournalEntries([]);
            setSolNumber(1);
            setSolProgress(0.44);
            setWeather('Clear');
            setCargoDelivery(INITIAL_CARGO_DELIVERY);
            setReceivedNovaMsgs([]);
            setPendingNextMissionId(null);
            setVehicleCamMode('exterior');
            setVehicleHeadlights(false);
            evTutorialCompletedRef.current = false;
            setEvTutorialCompleted(false);
            setEvTutorialStep('idle');
            evGuidanceToastKeyRef.current = '';
            evArrivalToastKeyRef.current = '';
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch {
              // ignore
            }
            setSavedProgress(null);
            beginMission(1, true);
          }}
          onMainMenu={() => {
            setScreen('title');
            setWorldPatch(INITIAL_WORLD);
          }}
        />
      )}

      {/* SECONDARY MODALS */}
      {activeModal === 'crew' && (
        <CrewAssistantModal
          objectiveText={objectiveText}
          hintText={hintText}
          telemetry={telemetry ? { ...telemetry, solNumber } : null}
          resolvedRovers={resolvedRoverIds}
          unlockedCrewIds={unlockedCrewIds}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'supplies' && (
        <SupplyLogisticsModal
          resources={resources}
          vehicleBatteryPct={telemetry?.vehicleBatteryPct ?? 100}
          cargoDelivery={cargoDelivery}
          onRequestSupply={handleRequestSupplyBundle}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'nasa' && <NasaDataModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'map' && (
        <BaseMapModal
          telemetry={telemetry ? { ...telemetry, solNumber } : null}
          visualState={visualState}
          missionId={missionId}
          activeTargetPos={activeTargetPos}
          discoveredLandmarks={discoveredLandmarks}
          discoveredAnomalies={discoveredAnomalies}
          resolvedRovers={resolvedRoverIds}
          exploredSectors={exploredSectors}
          unlockedCrewIds={unlockedCrewIds}
          activeOptionalIds={activeOptionalIds}
          drivingRover={drivingRover}
          evGuideActive={evGuideActive}
          activeRoute={activeRoute}
          onSetRoute={(dest) => {
            handleSetRoute(dest);
          }}
          onClearRoute={() => setActiveRoute(null)}
          onOpenChargingStation={() => setChargingModalOpen(true)}
          onSetSolTime={(p) => setSolProgress(p)}
          onCycleWeather={() => {
            const idx = WEATHER_ORDER.indexOf(weather);
            const next = WEATHER_ORDER[(idx + 1) % WEATHER_ORDER.length];
            setStormStageOverride(null);
            setWeather(next);
            pushToast(`Weather: ${WEATHER_SPECS[next].label}`, 'info');
          }}
          onSetStormStage={(st) => {
            setStormStageOverride(st);
            const targetWeather: WeatherType =
              st === 1
                ? 'Clear'
                : st === 2
                  ? 'Light Dust'
                  : st === 3
                    ? 'Local Storm'
                    : st === 4
                      ? 'Regional Storm'
                      : 'Light Dust';
            setWeather(targetWeather);
            setWorldPatch((prev) => ({
              ...prev,
              stormStage: st,
              dustStormActive: st === 4,
            }));
            pushToast(`Storm Stage ${st}: ${STORM_STAGE_SPECS[st].label}`, 'info');
          }}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'badges' && (
        <HandbookModal
          completedMissions={completedMissions}
          missionStars={missionStars}
          starsEarned={starsEarned}
          totalPoints={totalPoints}
          earnedBadgeIds={earnedBadgeIds}
          completedOptionalIds={completedOptionalIds}
          journalEntries={journalEntries}
          resolvedRovers={resolvedRoverIds}
          discoveredLandmarks={discoveredLandmarks}
          discoveredAnomalies={discoveredAnomalies}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'missions' && (
        <MissionSelectModal
          completedMissions={completedMissions}
          missionStars={missionStars}
          missionCheckpoints={missionCheckpoints}
          onSelectMission={(id) => beginMission(id, false)}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'settings' && (
        <SettingsModal
          settings={settings}
          onChange={setSettings}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'credits' && <CreditsModal onClose={() => setActiveModal(null)} />}
      {activeModal === 'pause' && (
        <PauseModal
          onResume={() => setActiveModal(null)}
          onOpenControlsHelp={() => setActiveModal('controls')}
          onOpenSettings={() => setActiveModal('settings')}
          onRestart={() => beginMission(missionId, true)}
          onMainMenu={handleBackToMenu}
        />
      )}
      {activeModal === 'controls' && (
        <ControlsHelpModal
          drivingRover={drivingRover}
          onClose={() => setActiveModal(null)}
        />
      )}
    </div>
  );
}
