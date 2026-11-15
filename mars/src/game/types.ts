export type GameScreen =
  | 'title'
  | 'cinematic_space'
  | 'cinematic_landing'
  | 'playing'
  | 'cinematic_ending'
  | 'finale';

export type ChapterId = 1 | 2 | 3 | 4;

export type BuildingId =
  | 'crew_home'
  | 'oxygen_centre'
  | 'water_station'
  | 'power_station'
  | 'greenhouse'
  | 'comms_tower'
  | 'medical_room'
  | 'radiation_shelter'
  | 'command_centre';

export type ExpansionPodId =
  | 'rover_garage'
  | 'research_lab'
  | 'geology_station'
  | 'weather_station'
  | 'ice_station'
  | 'emergency_shelter'
  | 'observatory'
  | 'relay_station'
  | 'cargo_pod'
  | 'suit_maintenance'
  | 'drone_station'
  | 'solar_expansion';

export type AnyStructureId = BuildingId | ExpansionPodId;

export type PlayableCharacterId = 'alex';
export type CrewNpcId = 'leo' | 'maya' | 'zara' | 'ryan';
export type CharacterId = PlayableCharacterId | CrewNpcId | 'nova';

export type CrewRoleId = 'engineer' | 'scientist' | 'comms' | 'botanist';

export type NpcActivityState =
  | 'idle'
  | 'walking'
  | 'working'
  | 'inspecting'
  | 'interacting'
  | 'talking'
  | 'resting'
  | 'emergency';

export interface NpcRuntimeStatus {
  id: CrewNpcId;
  name: string;
  role: string;
  state: NpcActivityState;
  taskLabel: string;
  buildingId: string;
  x: number;
  z: number;
}

export type CargoDeliveryPhase =
  | 'IDLE'
  | 'CONFIRMED'
  | 'IN_TRANSIT'
  | 'DESCENDING'
  | 'UNLOADING'
  | 'TRANSPORTING'
  | 'DELIVERED';

export type SupplyBundleId = 'life_support' | 'food_rations' | 'spare_parts' | 'full_colony';

export interface CargoDeliveryState {
  phase: CargoDeliveryPhase;
  bundleId: SupplyBundleId | null;
  bundleName: string;
  etaSec: number;
  phaseProgress: number;
  requestedSol: number;
  deliveredCount: number;
}

export type VehicleCameraMode = 'exterior' | 'interior';

export type SolPhase =
  | 'Sunrise'
  | 'Morning'
  | 'Midday'
  | 'Afternoon'
  | 'Sunset'
  | 'Dusk'
  | 'Night'
  | 'Pre-dawn';

export type WeatherType =
  | 'Clear'
  | 'Light Dust'
  | 'Windy'
  | 'Local Storm'
  | 'Dust Devil'
  | 'Regional Storm'
  | 'Severe Storm';

export type StormStage = 1 | 2 | 3 | 4 | 5;

export type SurfaceType = 'colony' | 'sand' | 'rock' | 'ice';

export type ExplorationToolId =
  | 'scanner'
  | 'sample_collector'
  | 'camera'
  | 'signal_detector'
  | 'drone'
  | 'flashlight';

export type LostRoverId =
  | 'sojourner'
  | 'spirit'
  | 'opportunity'
  | 'curiosity'
  | 'perseverance';

export type AstronautActionAnim =
  | 'none'
  | 'inspect'
  | 'collect_sample'
  | 'use_scanner'
  | 'repair'
  | 'open_door'
  | 'open_panel'
  | 'point_malfunction'
  | 'interact_panel'
  | 'enter_exit'
  | 'boarding_left'
  | 'boarding_right'
  | 'exiting_vehicle'
  | 'emergency'
  | 'look_sky'
  | 'communicate';

export type InteractiveNodeId =
  // Mission 1 & 2: Remote Comms Relay & Return to Colony
  | 'm1_remote_relay'
  | 'm2_camp_checkin'
  // Mission 3: Restore Oxygen
  | 'm1_crew_monitor'
  | 'm1_o2_panel'
  | 'm1_filter_crate'
  // Mission 4: Water Emergency
  | 'm2_leaking_pipe'
  | 'm2_shutoff_valve'
  | 'm2_repair_kit'
  | 'm2_water_console'
  // Mission 5: Restore Colony Power
  | 'm3_power_monitor'
  | 'm3_solar_panel'
  | 'm3_loose_cable'
  | 'm3_power_restart'
  // Mission 6: Greenhouse Rescue
  | 'm6_plants'
  | 'm6_water_tube'
  | 'm6_grow_light'
  | 'm6_plant_seeds'
  | 'm6_harvest'
  // Mission 7: Repair Water Recycler
  | 'm7_recycler_inspect'
  | 'm7_recycler_filter'
  | 'm7_recycler_console'
  // Mission 8: Medical Station Emergency
  | 'm8_med_scanner'
  | 'm8_med_supply'
  | 'm8_med_console'
  // Mission 9: Food Supply Problem
  | 'm9_food_storage'
  | 'm9_food_greenhouse'
  | 'm9_food_sorter'
  // Mission 10: Habitat Temperature Control
  | 'm10_thermostat'
  | 'm10_heater_coil'
  | 'm10_crew_check'
  // Mission 11: Lost Exploration Beacon
  | 'm11_comms_clue'
  | 'm11_lost_beacon'
  // Mission 12: Forgotten Rover (Sojourner)
  | 'm4_comms_signal'
  | 'm4_garage_prep'
  | 'm4_track_clue'
  // Mission 13: Rover Recovery (Spirit)
  | 'm13_dune_clue'
  // Mission 14: Mountain Research Station
  | 'm14_mountain_terminal'
  | 'm14_mountain_sensor'
  // Mission 15: Dust Storm Preparation
  | 'm7_weather_console'
  | 'm7_greenhouse_shutter'
  | 'm7_battery_switch'
  // Mission 16: Communication Network Failure
  | 'm5_comms_console'
  | 'm5_antenna_cable'
  | 'm5_dish_gear'
  // Mission 17: Power Satellite Problem
  | 'm17_satellite_pad'
  | 'm17_solar_sync'
  // Mission 18: Remote Weather Station
  | 'm18_remote_weather'
  | 'm18_weather_report'
  // Mission 19: Colony Emergency
  | 'm8_rad_inspect'
  | 'm8_rad_blocks'
  | 'm8_rad_shield'
  | 'm8_rad_drill'
  | 'm19_emergency_override'
  // Mission 20: Final Mars Mission
  | 'm9_shelter_check'
  | 'm9_solar_dust_check'
  | 'm9_landing_beacon'
  // Guided Tour / General building inspections
  | 'tour_crew_home'
  | 'tour_oxygen_centre'
  | 'tour_water_station'
  | 'tour_power_station'
  | 'tour_greenhouse'
  | 'tour_comms_tower'
  | 'tour_medical_room'
  | 'tour_radiation_shelter'
  | 'tour_command_centre';

export type IntroPhase =
  | 'none'
  | 'site_inspection'
  | 'relay_repair'
  | 'vehicle_entry'
  | 'drive_to_camp'
  | 'camp_arrival';

export interface Step5Flow {
  whatHappened: string;
  whereToGo: string;
  whatToDo: string;
  actionLabel: string;
  successMessage: string;
}

export type EquipmentPanelType =
  | 'm1_relay_stabilize'
  | 'm1_circuit_repair'
  | 'm1_filter_repair'
  | 'm2_valve_turn'
  | 'm2_pipe_repair'
  | 'm3_solar_clean'
  | 'm3_cable_plug'
  | 'm4_water_tube'
  | 'm4_light_tuner'
  | 'm4_seed_garden'
  | 'm5_dish_align'
  | 'm5_radio_test'
  | 'm6_rad_shielding'
  | 'm6_rad_storm_drill'
  | 'm7_battery_lever'
  | 'm7_shutter_slide'
  | 'm7_beacon_ignition'
  | 'm7_recycler_clean'
  | 'm8_medical_scan'
  | 'm9_food_sort'
  | 'm10_thermal_balance'
  | 'm11_beacon_tune'
  | 'm14_mountain_cal'
  | 'm17_satellite_align'
  | 'm18_weather_cal'
  | 'm19_emergency_panel'
  | 'rover_diagnostic';

export interface DialogueLine {
  speaker: string;
  role: string;
  avatar: CharacterId;
  text: string;
  focusTarget?: [number, number, number];
}

export interface InteractiveNodeSpec {
  id: InteractiveNodeId;
  label: string;
  promptAction: string;
  position: [number, number, number];
  buildingId: BuildingId;
  recommendedRole?: CrewRoleId;
}

export type CameraDirectorMode =
  | 'space_orbit'
  | 'space_approach'
  | 'lander_descent'
  | 'lander_depart'
  | 'third_person'
  | 'drone_aerial'
  | 'cutscene_focus';

export interface WorldVisualState {
  screen: GameScreen;
  cameraMode: CameraDirectorMode;
  cutsceneTarget: [number, number, number] | null;
  cutsceneEyeOffset: [number, number, number] | null;
  missionId: number;
  activeNodeIds: InteractiveNodeId[];
  highlightedBuilding: BuildingId | null;
  activeCharacterId: PlayableCharacterId;
  insideBuildingId: BuildingId | null;
  // Physical world hazard & repair states
  o2AlarmActive: boolean;
  o2FanSpinning: boolean;
  oxygenGeneratorRepaired?: boolean;
  waterLeakActive: boolean;
  waterValveClosed: boolean;
  waterPuddleVisible: boolean;
  powerBlackout: boolean;
  solarDusty: boolean;
  cableSparking: boolean;
  plantsWilting: boolean;
  tomatoesRipe: boolean;
  gardenStage: 0 | 1 | 2 | 3;
  stormShuttersClosed: boolean;
  shelterDoorsClosed: boolean;
  outdoorGearSecured: boolean;
  stormWarningActive: boolean;
  stormWarningCountdown: number;
  discoveredTrackClues: boolean;
  radioTransmissionPct?: number;
  radioTransmitted?: boolean;
  shelterShieldLevel: number;
  radiationDrillActive: boolean;
  dustStormActive: boolean;
  stormStage: StormStage;
  beaconBeamActive: boolean;
  // Mars Environment, Sol Cycle, Weather & Exploration
  solProgress: number; // 0..1 across 24h 37m Martian Sol
  weather: WeatherType;
  flashlightOn: boolean;
  crouched: boolean;
  drivingRover: boolean;
  droneActive: boolean;
  droneCameraView: boolean;
  activeTool: ExplorationToolId;
  scanPulseCounter: number;
  resolvedRoverIds: LostRoverId[];
  // Active one-shot character animation cue
  actionAnim: AstronautActionAnim;
  actionAnimCounter: number;
  dialogueActive: boolean;
  // Spacecraft & Mentor presence
  landerState: 'orbit' | 'descending' | 'parked' | 'departing' | 'gone' | 'returning';
  novaPresent: boolean;
  crewMood: 'calm' | 'worried' | 'celebrating';
  crewFocusPos: [number, number, number] | null;
  carryingItem: string | null;
  // Living Colony Crew AI, Cargo Resupply & Pressurized Exploration Vehicle
  cargoDelivery: CargoDeliveryState;
  vehicleCamMode: VehicleCameraMode;
  vehicleHeadlights: boolean;
  vehicleChargingRequested?: boolean;
  colonyPowerPct?: number;
  talkingNpcId: CrewNpcId | 'nova' | null;
  // Progressive Colony Unlock & Remote Opening Story States
  introPhase?: IntroPhase;
  relayPanelOpen?: boolean;
  relayRepaired?: boolean;
  hatchForcedOpen?: boolean;
  rightHatchForcedOpen?: boolean;
  vehicleDashLit?: boolean;
  alexSeatedInRover?: boolean;
  novaSeatedInRover?: boolean;
  alexPosOverride?: [number, number] | null;
  alexYawOverride?: number | null;
  alexWalkSpeed?: number;
  alexActionOverride?: AstronautActionAnim;
  novaPosOverride?: [number, number] | null;
  novaYawOverride?: number | null;
  novaWalkSpeed?: number;
  novaActionOverride?: AstronautActionAnim;
  unlockedCrewIds?: CrewNpcId[];
  activeOptionalIds?: string[];
  completedOptionalIds?: string[];
  activeRouteWaypoints?: Array<[number, number]> | null;
  evGuideActive?: boolean;
  evArrivalRingPos?: [number, number] | null;
  evArrivedAtZone?: boolean;
}

export type EvTransitionState = 'idle' | 'entering' | 'exiting';
export type EvTutorialStep = 'idle' | 'accel' | 'steer' | 'done';

export interface SurvivalResources {
  air: number;
  water: number;
  power: number;
  food: number;
  crewCondition: number;
  spareParts: number;
  samplesCollected: number;
}

export interface ResourceToast {
  id: number;
  text: string;
  tone: 'positive' | 'warning' | 'info';
}

export interface RewardToastEvent {
  id: number;
  title: string;
  points: number;
  stars?: number;
  badgeTitle?: string;
  accentColor?: string;
}

export interface EnvironmentTelemetry {
  solNumber: number;
  solProgress: number;
  solTimeLabel: string;
  solPhase: SolPhase;
  weather: WeatherType;
  stormStage: StormStage;
  stormStageLabel: string;
  outsideTempC: number;
  suitTempC: number;
  insideTempC: number;
  solarEfficiencyPct: number;
  roverCamVisibilityPct: number;
  windSpeedMs: number;
  surfaceType: SurfaceType;
  altitudeM: number;
  slopeDeg: number;
  phobosVisible: boolean;
  phobosElevationDeg: number;
  deimosVisible: boolean;
  deimosElevationDeg: number;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  roverX: number;
  roverZ: number;
  roverYaw: number;
  vehicleSpeedKmh: number;
  vehicleBatteryPct: number;
  vehicleBatteryKwh: number;
  vehicleCapacityKwh: number;
  vehicleInstantKw: number;
  vehicleConsumptionWhPerM: number;
  vehicleEstimatedRangeM: number;
  vehicleSafeRangeM: number;
  vehicleDistToColonyM: number;
  vehicleDistToChargerM: number;
  vehicleChargingActive: boolean;
  vehicleInChargingBay: boolean;
  vehicleChargingBayId: 'BAY_A' | 'BAY_B' | null;
  vehicleChargeRatePctPerSec: number;
  vehicleTimeToFullSec: number;
  vehicleTractionPct: number;
  vehicleStormSpeedLimited: boolean;
  nearChargingConsole: boolean;
  nearRoverToBoard: boolean;
  nearSupplyTerminal: boolean;
  nearbyCrewId: CrewNpcId | 'nova' | null;
  nearbyCrewDistance: number;
  npcStatuses: NpcRuntimeStatus[];
  cargoPadPos: [number, number];
  nearestLostRover: { id: LostRoverId; distance: number; bearingDeg: number } | null;
  nearestLandmark: { id: string; name: string; distance: number } | null;
  nearestAnomaly: { id: string; name: string; distance: number } | null;
  nearestPod: { id: ExpansionPodId; name: string; distance: number } | null;
}

export interface NavigationRoute {
  destinationId: string;
  destinationName: string;
  destinationCategory: 'colony' | 'exploration' | 'crew' | 'mission' | 'optional';
  targetX: number;
  targetZ: number;
  waypoints: Array<[number, number]>;
  totalDistanceM: number;
  estimatedEnergyPct: number;
  mode: 'foot' | 'vehicle';
}

export interface FieldJournalEntry {
  id: string;
  title: string;
  category: 'Sample' | 'Photo' | 'Landmark' | 'Rover' | 'Sky' | 'Anomaly' | 'Delivery' | 'Transmission' | 'Optional';
  solNumber: number;
  summary: string;
}

export interface GameSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  volume: number;
  cameraSpeed: number;
  solTimeScale: number;
  touchControlsMode: 'auto' | 'always' | 'off';
  showMinimap: boolean;
}

export type MissionStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'OBJECTIVE_COMPLETED'
  | 'MISSION_COMPLETED';

export interface MissionCheckpoint {
  status: MissionStatus;
  stepIndex: number;
  completedStepIds: string[];
  oxygenGeneratorRepaired: boolean;
  carryingItem: string | null;
  airLevel: number;
  worldPatch: Partial<WorldVisualState>;
}

export type LearningIllustrationKind =
  | 'comms_relay'
  | 'colony_drive'
  | 'oxygen_fan'
  | 'water_pipe'
  | 'solar_power'
  | 'greenhouse'
  | 'water_recycler'
  | 'medical_pod'
  | 'food_supply'
  | 'thermostat'
  | 'beacon'
  | 'rover_sojourner'
  | 'rover_spirit'
  | 'mountain_station'
  | 'dust_storm'
  | 'comms_dish'
  | 'satellite_uplink'
  | 'weather_station'
  | 'emergency_drill'
  | 'landing_beacon';

export interface LearningRecapSpec {
  missionId: number;
  chapterId: ChapterId;
  title: string;
  headline: string;
  problemDiscovered: string;
  whatYouDid: string;
  whatYouLearned: string;
  badgeTitle: string;
  badgeIcon: string;
  badgeColor: string;
  illustrationKind: LearningIllustrationKind;
  diagramSteps: Array<{ label: string; caption: string }>;
}

export type OptionalTaskCategory =
  | 'geology'
  | 'gear'
  | 'probe'
  | 'overlook'
  | 'tracks'
  | 'hidden_log'
  | 'crew_help';

export interface OptionalTaskSpec {
  id: string;
  title: string;
  category: OptionalTaskCategory;
  categoryLabel: string;
  description: string;
  promptAction: string;
  rewardPoints: number;
  x: number;
  z: number;
  discoveryRadius: number;
  unlockMissionId: number;
  linkedCrewId?: CrewNpcId;
  learnedFact: string;
}

export interface BadgeSpec {
  id: string;
  title: string;
  icon: string;
  color: string;
  description: string;
  unlockType: 'mission' | 'optional_milestone' | 'discovery_milestone' | 'campaign';
  unlockValue: number;
}
