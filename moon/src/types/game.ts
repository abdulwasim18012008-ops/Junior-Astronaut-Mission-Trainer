export type GamePhase =
  | 'cinematic_opening'
  | 'playing'
  | 'cinematic_departure'
  | 'cinematic_ending'
  | 'paused';

export type VehicleState =
  | 'PARKED'
  | 'PLAYER_ENTERING'
  | 'PLAYER_DRIVING'
  | 'PLAYER_EXITING';

export type MiniGameType =
  | 'none'
  | 'crater_scan'
  | 'sample_containment'
  | 'circuit_match'
  | 'pipe_align'
  | 'water_filter'
  | 'solar_replace'
  | 'greenhouse_lights'
  | 'thermal_balance'
  | 'medical_match'
  | 'signal_frequency'
  | 'ice_drill'
  | 'rover_repair'
  | 'path_detour'
  | 'dish_align'
  | 'outpost_power'
  | 'final_synthesis'
  | 'earth_photo'
  | 'observatory_sky'
  | 'buried_vault'
  | 'crew_tools'
  | 'crew_botany';

export type RecapAnimationType =
  | 'earth_moon'
  | 'rover_drive'
  | 'meteorite'
  | 'lab_analysis'
  | 'commander_launch'
  | 'oxygen'
  | 'water_cycle'
  | 'solar_power'
  | 'greenhouse'
  | 'thermal'
  | 'medical'
  | 'underground_signal'
  | 'lunar_ice'
  | 'rover_engineering'
  | 'safe_path'
  | 'radio_wave'
  | 'far_side'
  | 'final_discovery';

export interface MissionObjective {
  id: string;
  label: string;
  type:
    | 'cinematic'
    | 'reach'
    | 'enter_ev'
    | 'drive_to'
    | 'exit_ev'
    | 'interact'
    | 'collect'
    | 'minigame'
    | 'transmit';
  targetLocationId?: string;
  targetPosition?: [number, number]; // x, z
  radius?: number;
  requiredCount?: number;
  miniGame?: MiniGameType;
  requiresVehicle?: boolean;
  requiresExitVehicle?: boolean;
  hintText: string;
}

export interface MissionDef {
  id: number;
  chapter: 1 | 2 | 3 | 4;
  chapterTitle: string;
  title: string;
  summary: string;
  briefingSpeaker: string;
  briefingText: string;
  unlocksLocations: string[];
  objectives: MissionObjective[];
  recapHeadline: string;
  recapFact: string;
  recapAnimation: RecapAnimationType;
  badgeReward?: {
    id: string;
    name: string;
    description: string;
    icon: string;
  };
}

export interface WorldLocation {
  id: string;
  name: string;
  category: 'colony' | 'crater' | 'outpost' | 'landmark' | 'scenic' | 'historic';
  x: number;
  z: number;
  description: string;
  alwaysVisible?: boolean;
}

export interface CrewMemberDef {
  id: string;
  name: string;
  role: string;
  suitColor: string;
  accentHex: number;
  personality: string;
  homeBuildingId: string;
  waypoints: [number, number][];
  statusLine: string;
}

export interface OptionalActivityDef {
  id: string;
  title: string;
  category: 'discovery' | 'rock' | 'equipment' | 'scenic' | 'crew_help';
  points: 20 | 25 | 30 | 40;
  x: number;
  z: number;
  description: string;
  minMissionId: number;
  miniGame?: MiniGameType;
  crewId?: string;
  funFact: string;
}

export interface SubtitleLine {
  speaker: string;
  text: string;
  accentColor?: string;
}

export interface BadgeInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface SaveProgress {
  currentMissionIndex: number; // 0..19 (or 20 when story complete)
  currentObjectiveIndex: number;
  completedMissions: number[];
  starsByMission: Record<number, number>;
  points: number;
  badges: string[];
  discoveredLocations: string[];
  completedOptionals: string[];
  unlockedChapters: number[];
  storyCompleted: boolean;
  lunarTime: number; // 0..1 day/night cycle
  roverBattery: number; // 0..100
  apolloDiscovered: boolean;
  inspectedBuildings: string[];
  cameraSensitivity?: number;
  showGoldenTrail?: boolean;
  seenOnFootTutorial?: boolean;
  seenRoverTutorial?: boolean;
}

export interface LiveHudSnapshot {
  phase: GamePhase;
  cinematicScene: number;
  vehicleState: VehicleState;
  inVehicle: boolean;
  playerX: number;
  playerZ: number;
  playerY: number;
  playerHeading: number;
  evX: number;
  evZ: number;
  evSpeed: number;
  roverBattery: number;
  roverCharging: boolean;
  roverChargeProgress: number;
  batteryStatus: 'healthy' | 'low' | 'empty' | 'charging';
  nearChargingStation: boolean;
  chargingStationName: string;
  emergencyBoostProgress: number;
  apolloDiscovered: boolean;
  showGoldenTrail: boolean;
  activeCameraMode: 'walk' | 'run' | 'jump' | 'interact' | 'drive';
  targetX: number | null;
  targetZ: number | null;
  targetLabel: string;
  distanceToTarget: number;
  targetBearingDeg: number; // Relative angle (-180..180) from camera forward to active destination
  cameraHeadingDeg: number; // Compass heading 0..360
  sunElevation: number;
  surfaceTempC: number;
  isShadowed: boolean;
  nearbyPrompt: {
    label: string;
    actionType: string;
    keyHint: string;
  } | null;
  crewPositions: Array<{
    id: string;
    name: string;
    role: string;
    x: number;
    z: number;
    activity: string;
  }>;
  collectProgress: number;
  collectTarget: number;
  vehicleTutorialStep: number; // 0=none, 1=find EV, 2=enter EV, 3=drive, 4=park & exit
  routeWaypoints: Array<[number, number]>;
  targetScreenPos: { xPct: number; yPct: number } | null;
  guidanceMode: 'walk' | 'board_rover' | 'drive_rover' | 'exit_rover' | 'none';
}
