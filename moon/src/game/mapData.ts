import { LiveHudSnapshot, MissionDef, SaveProgress, WorldLocation } from '../types/game';
import { groundHeightAt, NAMED_CRATERS, WORLD_PLAYABLE_RADIUS } from './lunarTerrain';
import { CAMPAIGN_MISSIONS, OPTIONAL_ACTIVITIES, WORLD_LOCATIONS } from './missions';

export type MapLayerMode =
  | 'exploration'
  | 'elevation'
  | 'missions'
  | 'base'
  | 'npcs'
  | 'rover'
  | 'discoveries';

export interface MapLayerDef {
  id: MapLayerMode;
  label: string;
  shortLabel: string;
  description: string;
}

export const MAP_LAYER_MODES: MapLayerDef[] = [
  {
    id: 'exploration',
    label: 'Exploration Map',
    shortLabel: 'Exploration',
    description: 'Standard lunar atlas with regions, roads, base, crew, rover, and active route.',
  },
  {
    id: 'elevation',
    label: 'Geology & Terrain',
    shortLabel: 'Geology',
    description: 'Hypsometric elevation relief, craters, mountain ranges, and geological regions.',
  },
  {
    id: 'missions',
    label: 'Missions',
    shortLabel: 'Missions',
    description: 'Story mission beacons, completed sites, and active golden navigation trail.',
  },
  {
    id: 'base',
    label: 'Base Buildings',
    shortLabel: 'Base',
    description: 'Zoomed-in colony layout with tunnels, walkways, and every facility.',
  },
  {
    id: 'npcs',
    label: 'Crew Locations',
    shortLabel: 'Crew NPCs',
    description: 'Live tracking of Maya, Leo, Zara, and Ryan across the colony.',
  },
  {
    id: 'rover',
    label: 'Rover & Charging',
    shortLabel: 'Rover & Power',
    description: 'Live Lunar EV battery state and fast solar charging bays.',
  },
  {
    id: 'discoveries',
    label: 'Discoveries & Craters',
    shortLabel: 'Discoveries',
    description: 'Craters, optional science spots, landmarks, and quiet uncharted plains.',
  },
];

export interface LunarRegionDef {
  id: string;
  name: string;
  subtitle: string;
  x: number;
  z: number;
  radius: number;
  tintRgb: [number, number, number];
}

export const LUNAR_REGIONS: LunarRegionDef[] = [
  {
    id: 'central_mare',
    name: 'Main Lunar Base',
    subtitle: 'Pressurized Colony Basin',
    x: 0,
    z: 0,
    radius: 75,
    tintRgb: [110, 128, 152],
  },
  {
    id: 'earthrise_ridge',
    name: 'Scenic Earth Observation Point',
    subtitle: 'Earthrise Overlook Ridge',
    x: -75,
    z: -48,
    radius: 52,
    tintRgb: [148, 138, 126],
  },
  {
    id: 'meteorite_valley',
    name: 'Meteorite Impact Region',
    subtitle: 'Scorched Impact Crater & Fragments',
    x: -145,
    z: -135,
    radius: 78,
    tintRgb: [122, 114, 140],
  },
  {
    id: 'basalt_canyon',
    name: 'Crater Highlands',
    subtitle: 'Ancient Basalt Arch & Twin Basins',
    x: -265,
    z: -215,
    radius: 95,
    tintRgb: [134, 122, 112],
  },
  {
    id: 'northern_highlands',
    name: 'Lunar Mountain Range',
    subtitle: 'Northern Highland Rim & Peaks',
    x: 45,
    z: -315,
    radius: 120,
    tintRgb: [144, 140, 130],
  },
  {
    id: 'resonance_crags',
    name: 'Geological Research Valley',
    subtitle: 'Resonance Signal Crater & Crags',
    x: 165,
    z: -95,
    radius: 84,
    tintRgb: [106, 130, 146],
  },
  {
    id: 'tranquility_frontier',
    name: 'Tranquility Frontier',
    subtitle: 'Sunlit Eastern Plains & Buried Vault',
    x: 265,
    z: -200,
    radius: 105,
    tintRgb: [118, 132, 144],
  },
  {
    id: 'farside_basin',
    name: 'Remote Research Outpost',
    subtitle: 'Far-Side Autonomous Basin',
    x: 225,
    z: 25,
    radius: 88,
    tintRgb: [112, 122, 136],
  },
  {
    id: 'shadow_ice_basin',
    name: 'Shadowed Ice Crater Basin',
    subtitle: 'Cold Permanently Shaded Crater',
    x: -170,
    z: 145,
    radius: 82,
    tintRgb: [90, 112, 142],
  },
  {
    id: 'boulder_canyon',
    name: 'Rover Exploration Zone',
    subtitle: 'Forgotten Valley, Canyon Pass & Relay Ridge',
    x: 75,
    z: 185,
    radius: 112,
    tintRgb: [138, 132, 122],
  },
  {
    id: 'south_crater_field',
    name: 'South Rim Crater Field',
    subtitle: 'Bright Anorthosite Highlands',
    x: 210,
    z: 285,
    radius: 105,
    tintRgb: [142, 136, 128],
  },
  {
    id: 'quiet_mare_plain',
    name: 'Quiet Mare Plain',
    subtitle: 'Undisturbed Southwest Flatland',
    x: -250,
    z: 345,
    radius: 95,
    tintRgb: [98, 108, 124],
  },
];

export type CameraPresetId = 'overview' | 'explore' | 'base' | 'topdown';

export interface CameraPresetDef {
  id: CameraPresetId;
  label: string;
  target: [number, number, number];
  offset: [number, number, number];
  description: string;
}

export const CAMERA_PRESETS: CameraPresetDef[] = [
  {
    id: 'overview',
    label: 'World Overview',
    target: [0, 0, 0],
    offset: [0, 315, 365],
    description: 'High-angle cinematic overview of the entire lunar frontier.',
  },
  {
    id: 'explore',
    label: 'Explore View',
    target: [0, 2, 0],
    offset: [-115, 135, 195],
    description: 'Medium-height angled exploration perspective.',
  },
  {
    id: 'base',
    label: 'Lunar Base',
    target: [0, 2, -4],
    offset: [-44, 46, 74],
    description: 'Close-up architectural view of colony domes, solar arrays, and tunnels.',
  },
  {
    id: 'topdown',
    label: 'Top-Down 3D',
    target: [0, 0, 0],
    offset: [0, 445, 36],
    description: 'High overhead 3D tactical view across craters and routes.',
  },
];

export type FacilityIconKind =
  | 'command'
  | 'habitat'
  | 'research'
  | 'geology'
  | 'oxygen'
  | 'water'
  | 'solar'
  | 'charging'
  | 'greenhouse'
  | 'medical'
  | 'garage'
  | 'comms'
  | 'shelter'
  | 'storage'
  | 'observatory'
  | 'quarters'
  | 'launchpad';

export interface BaseFacilityDef {
  id: string;
  name: string;
  shortName: string;
  x: number;
  z: number;
  iconKind: FacilityIconKind;
  accentHex: string;
  purpose: string;
  interactions: string[];
  relatedMissionIds: number[];
}

export const BASE_FACILITIES: BaseFacilityDef[] = [
  {
    id: 'mission_control',
    name: 'Mission Control',
    shortName: 'Mission Control',
    x: 0,
    z: -18,
    iconKind: 'command',
    accentHex: '#38bdf8',
    purpose: 'Central lunar command hub coordinating Earth transmissions, base power, and rover navigation.',
    interactions: ['Review active briefing console', 'Transmit discovery reports to Earth', 'Synthesize final expedition findings'],
    relatedMissionIds: [1, 6, 20],
  },
  {
    id: 'research_habitat',
    name: 'Crew Habitat',
    shortName: 'Crew Habitat',
    x: -22,
    z: -12,
    iconKind: 'habitat',
    accentHex: '#60a5fa',
    purpose: 'Main pressurized living and research habitat shielded against micrometeoroids and lunar chill.',
    interactions: ['Inspect habitat pressure & thermal panels', 'Balance thermal heaters during lunar shadow'],
    relatedMissionIds: [12],
  },
  {
    id: 'lunar_research_lab',
    name: 'Research Laboratory',
    shortName: 'Research Lab',
    x: 10,
    z: -40,
    iconKind: 'research',
    accentHex: '#818cf8',
    purpose: 'Studies low-gravity physics, electrostatic moon dust, and lightweight spacecraft materials.',
    interactions: ['Inspect vacuum dust testing chamber', 'Read low-gravity material logs'],
    relatedMissionIds: [],
  },
  {
    id: 'geological_lab',
    name: 'Geological Laboratory',
    shortName: 'Geo Lab',
    x: -24,
    z: 12,
    iconKind: 'geology',
    accentHex: '#c084fc',
    purpose: 'Analyzes meteorites, core drillings, and moon rocks with a laser mineral spectrometer.',
    interactions: ['Deliver sealed meteorite samples', 'Help Maya filter lunar water samples'],
    relatedMissionIds: [6],
  },
  {
    id: 'oxygen_facility',
    name: 'Oxygen Centre',
    shortName: 'Oxygen Centre',
    x: 24,
    z: -14,
    iconKind: 'oxygen',
    accentHex: '#38bdf8',
    purpose: 'Stores cryogenic oxygen and scrubs carbon dioxide so astronauts can breathe safely inside.',
    interactions: ['Repair O2 scrubber circuits', 'Help Leo organize rover spare tools'],
    relatedMissionIds: [8],
  },
  {
    id: 'water_station',
    name: 'Water Recycling Plant',
    shortName: 'Water Plant',
    x: 26,
    z: 8,
    iconKind: 'water',
    accentHex: '#22d3ee',
    purpose: 'Cleans and recycles over 90% of colony water through three vertical filtration towers.',
    interactions: ['Align and seal leaking water pipes', 'Check closed-loop purity sensors'],
    relatedMissionIds: [9],
  },
  {
    id: 'solar_station',
    name: 'Solar Energy Station',
    shortName: 'Solar Station',
    x: 46,
    z: -24,
    iconKind: 'solar',
    accentHex: '#facc15',
    purpose: 'Captures unfiltered sunlight across six sun-tracking silicon arrays to power the entire colony.',
    interactions: ['Swap damaged photovoltaic panels', 'Aim solar wings toward sunlight'],
    relatedMissionIds: [10],
  },
  {
    id: 'solar_charging_bay',
    name: 'Solar Charging Bay',
    shortName: 'Charging Bay',
    x: 40,
    z: -6,
    iconKind: 'charging',
    accentHex: '#22d3ee',
    purpose: 'Outdoor solar inductive charging pad on the east road for rapid Lunar EV battery top-ups.',
    interactions: ['Park the Lunar EV on the glowing ring to recharge to 100%'],
    relatedMissionIds: [],
  },
  {
    id: 'greenhouse',
    name: 'Greenhouse',
    shortName: 'Greenhouse',
    x: 16,
    z: 26,
    iconKind: 'greenhouse',
    accentHex: '#4ade80',
    purpose: 'Hydroponic biodome growing fresh leafy greens while naturally refreshing colony air.',
    interactions: ['Tune purple-spectrum grow lights', 'Help Zara cultivate lunar sprouts'],
    relatedMissionIds: [11],
  },
  {
    id: 'medical_module',
    name: 'Medical Module',
    shortName: 'Medical Module',
    x: -18,
    z: -32,
    iconKind: 'medical',
    accentHex: '#f87171',
    purpose: 'Tracks crew heart rate, bone density, and astronaut wellness in low lunar gravity.',
    interactions: ['Reconnect medical diagnostic scanner', 'Inspect crew bio-telemetry screen'],
    relatedMissionIds: [13],
  },
  {
    id: 'rover_garage',
    name: 'Rover Garage',
    shortName: 'Rover Garage',
    x: 0,
    z: 26,
    iconKind: 'garage',
    accentHex: '#fb923c',
    purpose: 'Drive-through hangar housing the Lunar Electric Vehicle, spare mesh wheels, and floor charger.',
    interactions: ['Board or exit the Lunar EV (E)', 'Recharge EV battery on the indoor inductive pad'],
    relatedMissionIds: [2],
  },
  {
    id: 'comm_tower',
    name: 'Communication Tower',
    shortName: 'Comm Tower',
    x: 34,
    z: -36,
    iconKind: 'comms',
    accentHex: '#a78bfa',
    purpose: 'High-gain parabolic lattice tower locking continuous radio signals onto Earth.',
    interactions: ['Help Ryan tune deep-space Earth beacon', 'Inspect antenna tracking angle'],
    relatedMissionIds: [],
  },
  {
    id: 'radiation_shelter',
    name: 'Radiation Shelter',
    shortName: 'Radiation Shelter',
    x: -38,
    z: -24,
    iconKind: 'shelter',
    accentHex: '#94a3b8',
    purpose: 'Thick compacted lunar-soil bunker protecting the crew whenever solar storms flare.',
    interactions: ['Inspect regolith radiation shielding & storm airlock'],
    relatedMissionIds: [],
  },
  {
    id: 'sample_storage',
    name: 'Sample Storage',
    shortName: 'Sample Storage',
    x: -38,
    z: 6,
    iconKind: 'storage',
    accentHex: '#38bdf8',
    purpose: 'Vacuum-sealed cryogenic vault preserving pristine meteorite fragments and lunar ice cores.',
    interactions: ['Inspect sealed rock & water-ice canisters'],
    relatedMissionIds: [],
  },
  {
    id: 'observatory',
    name: 'Observatory',
    shortName: 'Observatory',
    x: -48,
    z: 32,
    iconKind: 'observatory',
    accentHex: '#93c5fd',
    purpose: 'Rotating optical telescope dome gazing cleanly at Earth, the Sun, and starfields without clouds.',
    interactions: ['Use optical telescope (optional Stargazer challenge)'],
    relatedMissionIds: [],
  },
  {
    id: 'crew_quarters',
    name: 'Crew Quarters',
    shortName: 'Crew Quarters',
    x: -12,
    z: 34,
    iconKind: 'quarters',
    accentHex: '#cbd5e1',
    purpose: 'Pressurized sleeping berths and lounge with Earth-view portholes for the teenage astronauts.',
    interactions: ['Inspect astronaut living quarters & Earth portholes'],
    relatedMissionIds: [],
  },
  {
    id: 'launch_pad',
    name: 'Launch Pad',
    shortName: 'Launch Pad',
    x: -52,
    z: -2,
    iconKind: 'launchpad',
    accentHex: '#fbbf24',
    purpose: 'Heavy-duty spacecraft landing and liftoff pad on the western rim of the colony.',
    interactions: ['Gather for Commander Vance’s departure ceremony'],
    relatedMissionIds: [7],
  },
];

export const COLONY_TUNNELS: Array<[number, number, number, number]> = [
  [0, -18, -22, -12],
  [-22, -12, -24, 12],
  [0, -18, 24, -14],
  [24, -14, 26, 8],
  [-24, 12, -38, 6],
  [-22, -12, -18, -32],
  [-22, -12, -38, -24],
  [0, -18, 10, -40],
];

export const COLONY_WALKWAYS: Array<[number, number, number, number]> = [
  [0, -10, 0, 20],
  [0, 20, -12, 30],
  [0, 20, 12, 24],
  [0, 10, 36, -6],
  [-24, 18, -42, 30],
  [-24, 6, -45, -2],
  [0, -24, 10, -35],
  [14, -36, 31, -34],
];

// Visible rover exploration tracks across the lunar plains (deliberately avoids Apollo 11 quiet plain)
export const EXPEDITION_ROUTES: Array<Array<[number, number]>> = [
  [[0, 26], [-48, -18], [-75, -48], [-115, -96], [-145, -135], [-215, -190], [-265, -245]],
  [[0, 26], [40, -6], [105, -52], [165, -95], [225, -145], [280, -195]],
  [[40, -6], [132, 12], [225, 25]],
  [[0, 26], [68, 92], [130, 155], [172, 224], [210, 290]],
  [[0, 26], [30, 112], [55, 195], [10, 214], [-35, 225]],
  [[0, 26], [-85, 84], [-170, 145]],
  [[0, -18], [-12, -105], [-20, -185], [22, -262], [60, -330]],
];

export const BASE_OVERVIEW_ZOOM = 1.0; // Shows full ±450m world clearly
export const BASE_FOCUS_ZOOM = 3.8; // Shows individual base buildings cleanly

/**
 * Converts 3D Orbit camera distance (meters) into normalized zoom factor
 * so building LOD grouping stays consistent across 3D and summary helpers.
 */
export function cameraDistanceToZoom(camDist: number): number {
  return Math.max(0.5, Math.min(10, 380 / Math.max(24, camDist)));
}

/**
 * Determines whether nearby base buildings should be grouped into a single
 * "Lunar Research Base" hub marker vs rendered individually.
 */
export function shouldGroupBaseBuildings(zoom: number, layerMode: MapLayerMode): boolean {
  if (layerMode === 'base') return false;
  return zoom < 2.15;
}

/**
 * Controls when projected 3D labels should appear or fade cleanly based on
 * camera-to-marker distance and active map layer.
 */
export function shouldShow3DLabel(
  marker: MapMarkerItem,
  camDistToMarker: number,
  layerMode: MapLayerMode,
): boolean {
  if (marker.markerKind === 'active_mission' || marker.markerKind === 'rover' || marker.markerKind === 'base_hub') {
    return true;
  }
  if (marker.markerKind === 'apollo_discovered') {
    return camDistToMarker < 900;
  }
  if (marker.markerKind === 'apollo_hidden') {
    return (layerMode === 'discoveries' || layerMode === 'exploration' || layerMode === 'elevation') && camDistToMarker < 900;
  }
  if (marker.entityKind === 'building') {
    return layerMode === 'base' ? camDistToMarker < 260 : camDistToMarker < 185;
  }
  if (marker.entityKind === 'crew') {
    return layerMode === 'npcs' ? camDistToMarker < 360 : camDistToMarker < 220;
  }
  if (marker.entityKind === 'optional') {
    return camDistToMarker < 290;
  }
  return camDistToMarker < 560;
}

export function worldToScreen(
  wx: number,
  wz: number,
  camX: number,
  camZ: number,
  zoom: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const baseScale = Math.min(width, height) / (WORLD_PLAYABLE_RADIUS * 2.14);
  const pxPerMeter = baseScale * zoom;
  return {
    x: width / 2 + (wx - camX) * pxPerMeter,
    y: height / 2 + (wz - camZ) * pxPerMeter,
  };
}

export function screenToWorld(
  sx: number,
  sy: number,
  camX: number,
  camZ: number,
  zoom: number,
  width: number,
  height: number,
): { x: number; z: number } {
  const baseScale = Math.min(width, height) / (WORLD_PLAYABLE_RADIUS * 2.14);
  const pxPerMeter = baseScale * zoom;
  return {
    x: camX + (sx - width / 2) / pxPerMeter,
    z: camZ + (sy - height / 2) / pxPerMeter,
  };
}

export function getRevealedLocationIds(progress: SaveProgress): Set<string> {
  const revealed = new Set<string>();
  WORLD_LOCATIONS.forEach((loc) => {
    if (loc.id === 'apollo_11_site') {
      if (progress.apolloDiscovered || progress.discoveredLocations.includes('apollo_11_site')) {
        revealed.add(loc.id);
      }
      return;
    }
    if (loc.alwaysVisible || progress.discoveredLocations.includes(loc.id)) {
      revealed.add(loc.id);
    }
  });
  for (let i = 0; i <= progress.currentMissionIndex && i < CAMPAIGN_MISSIONS.length; i++) {
    CAMPAIGN_MISSIONS[i].unlocksLocations.forEach((id) => revealed.add(id));
  }
  return revealed;
}

export function getFacilityStatus(
  facilityId: string,
  progress: SaveProgress,
  hud: LiveHudSnapshot,
): { statusText: string; statusTone: 'amber' | 'emerald' | 'cyan' | 'slate'; activeMission: MissionDef | null } {
  const currentMission = CAMPAIGN_MISSIONS[progress.currentMissionIndex] ?? null;
  const currentObj = currentMission?.objectives[progress.currentObjectiveIndex];

  if (currentObj?.targetLocationId === facilityId) {
    return {
      statusText: `Active Mission Target: ${currentMission?.title ?? 'Objective'}`,
      statusTone: 'amber',
      activeMission: currentMission,
    };
  }

  if (facilityId === 'solar_charging_bay' || facilityId === 'rover_garage') {
    const chargingHere =
      hud.roverCharging &&
      Math.hypot(hud.evX - (facilityId === 'rover_garage' ? 0 : 40), hud.evZ - (facilityId === 'rover_garage' ? 26 : -6)) < 8;
    if (chargingHere) {
      return {
        statusText: `Charging Lunar EV (${Math.round(hud.roverBattery)}%)`,
        statusTone: 'cyan',
        activeMission: null,
      };
    }
  }

  const facility = BASE_FACILITIES.find((f) => f.id === facilityId);
  if (facility) {
    const completedLinked = facility.relatedMissionIds.some((id) => progress.completedMissions.includes(id));
    if (completedLinked) {
      return {
        statusText: 'Systems Verified & Nominal',
        statusTone: 'emerald',
        activeMission: null,
      };
    }
  }

  if (progress.inspectedBuildings.includes(facilityId)) {
    return {
      statusText: 'Inspected · Nominal Online',
      statusTone: 'emerald',
      activeMission: null,
    };
  }

  return {
    statusText: 'Nominal Online',
    statusTone: 'slate',
    activeMission: null,
  };
}

export type MapMarkerKind =
  | 'base_hub'
  | 'building'
  | 'active_mission'
  | 'completed_mission'
  | 'charging'
  | 'rover'
  | 'crew'
  | 'optional'
  | 'discovery_site'
  | 'apollo_hidden'
  | 'apollo_discovered';

export interface MapMarkerItem {
  id: string;
  entityKind: 'base_hub' | 'building' | 'location' | 'crew' | 'rover' | 'optional' | 'apollo';
  markerKind: MapMarkerKind;
  name: string;
  subtitle: string;
  x: number;
  z: number;
  iconKind?: FacilityIconKind;
  accentHex: string;
  priority: number;
  locId?: string;
  facilityId?: string;
  crewId?: string;
  optionalId?: string;
  missionId?: number;
}

export function getVisibleMapMarkers(
  hud: LiveHudSnapshot,
  progress: SaveProgress,
  layerMode: MapLayerMode,
  zoom: number,
): MapMarkerItem[] {
  const markers: MapMarkerItem[] = [];
  const revealedIds = getRevealedLocationIds(progress);
  const groupBase = shouldGroupBaseBuildings(zoom, layerMode);
  const currentMission = CAMPAIGN_MISSIONS[progress.currentMissionIndex] ?? null;
  const currentObj = currentMission?.objectives[progress.currentObjectiveIndex];
  const activeTargetId = currentObj?.targetLocationId;

  // 1. Base Facilities OR Grouped Base Hub
  const showBaseLayer =
    layerMode === 'exploration' || layerMode === 'base' || layerMode === 'elevation' || layerMode === 'missions' || layerMode === 'rover';

  if (showBaseLayer) {
    if (groupBase && layerMode !== 'rover') {
      markers.push({
        id: 'base_hub',
        entityKind: 'base_hub',
        markerKind: 'base_hub',
        name: 'Lunar Research Base',
        subtitle: '17 Colony Facilities · Click to Zoom In',
        x: 0,
        z: 0,
        accentHex: '#38bdf8',
        priority: 80,
      });
    } else if (!groupBase) {
      BASE_FACILITIES.forEach((f) => {
        const isCharging = f.iconKind === 'charging' || f.id === 'rover_garage';
        if (layerMode === 'rover' && !isCharging) return;
        const isMissionTarget = activeTargetId === f.id;
        markers.push({
          id: `building:${f.id}`,
          entityKind: 'building',
          markerKind: isMissionTarget ? 'active_mission' : isCharging && layerMode === 'rover' ? 'charging' : 'building',
          name: f.shortName,
          subtitle: f.name,
          x: f.x,
          z: f.z,
          iconKind: f.iconKind,
          accentHex: isMissionTarget ? '#facc15' : f.accentHex,
          priority: isMissionTarget ? 95 : 70,
          facilityId: f.id,
          locId: f.id,
        });
      });
    }
  }

  // Always show Charging Pads on Rover & Power layer even when zoomed out
  if (layerMode === 'rover' && groupBase) {
    [
      { id: 'rover_garage', name: 'Garage Charging Pad', x: 0, z: 26 },
      { id: 'solar_charging_bay', name: 'Solar Charging Bay', x: 40, z: -6 },
    ].forEach((c) => {
      markers.push({
        id: `building:${c.id}`,
        entityKind: 'building',
        markerKind: 'charging',
        name: c.name,
        subtitle: 'Fast Inductive Rover Charger',
        x: c.x,
        z: c.z,
        iconKind: 'charging',
        accentHex: '#22d3ee',
        priority: 85,
        facilityId: c.id,
        locId: c.id,
      });
    });
  }

  // 2. Non-Colony World Locations (Craters, Outposts, Landmarks)
  const completedTargetIds = new Set<string>();
  CAMPAIGN_MISSIONS.forEach((m) => {
    if (progress.completedMissions.includes(m.id)) {
      m.unlocksLocations.forEach((id) => completedTargetIds.add(id));
    }
  });

  if (layerMode === 'exploration' || layerMode === 'elevation' || layerMode === 'missions' || layerMode === 'discoveries') {
    WORLD_LOCATIONS.forEach((loc) => {
      if (loc.category === 'colony') return;
      if (loc.id === 'apollo_11_site') return; // Handled delicately below

      const isRevealed = revealedIds.has(loc.id);
      const isMissionTarget = activeTargetId === loc.id;
      if (!isRevealed && !isMissionTarget && layerMode !== 'discoveries') return;
      if (!isRevealed && layerMode === 'discoveries') {
        // Show craters subtly as unexplored terrain landmarks
        markers.push({
          id: `loc:${loc.id}`,
          entityKind: 'location',
          markerKind: 'discovery_site',
          name: loc.name,
          subtitle: 'Unexplored Frontier Region',
          x: loc.x,
          z: loc.z,
          accentHex: '#94a3b8',
          priority: 45,
          locId: loc.id,
        });
        return;
      }

      const isDone = completedTargetIds.has(loc.id) && !isMissionTarget;
      markers.push({
        id: `loc:${loc.id}`,
        entityKind: 'location',
        markerKind: isMissionTarget ? 'active_mission' : isDone ? 'completed_mission' : 'discovery_site',
        name: loc.name,
        subtitle: loc.description,
        x: loc.x,
        z: loc.z,
        accentHex: isMissionTarget ? '#facc15' : isDone ? '#34d399' : '#38bdf8',
        priority: isMissionTarget ? 98 : isDone ? 62 : 66,
        locId: loc.id,
      });
    });
  }

  // 3. Optional Science Activities (distinct purple diamond, never confused with golden main missions)
  if (layerMode === 'discoveries' || (layerMode === 'exploration' && zoom >= 1.45)) {
    const currentId = (CAMPAIGN_MISSIONS[progress.currentMissionIndex]?.id ?? 20);
    OPTIONAL_ACTIVITIES.forEach((opt) => {
      if (opt.crewId && layerMode !== 'discoveries') return;
      if (opt.minMissionId > currentId + 2 && layerMode !== 'discoveries') return;
      const done = progress.completedOptionals.includes(opt.id);
      markers.push({
        id: `opt:${opt.id}`,
        entityKind: 'optional',
        markerKind: 'optional',
        name: opt.title,
        subtitle: done ? `Completed (+${opt.points} pts)` : `Optional Discovery (+${opt.points} pts)`,
        x: opt.x,
        z: opt.z,
        accentHex: done ? '#34d399' : '#c084fc',
        priority: 40,
        optionalId: opt.id,
      });
    });
  }

  // 4. Hidden vs Discovered Apollo 11 Historic Landing Site
  const apolloLoc = WORLD_LOCATIONS.find((l) => l.id === 'apollo_11_site');
  if (apolloLoc) {
    if (progress.apolloDiscovered || hud.apolloDiscovered) {
      if (layerMode === 'exploration' || layerMode === 'discoveries' || layerMode === 'elevation' || layerMode === 'missions') {
        markers.push({
          id: 'apollo:site',
          entityKind: 'apollo',
          markerKind: 'apollo_discovered',
          name: 'Historic Landing Site',
          subtitle: 'Explored · Apollo 11 — Tranquility Base (+500 pts)',
          x: apolloLoc.x,
          z: apolloLoc.z,
          accentHex: '#fbbf24',
          priority: 88,
          locId: 'apollo_11_site',
        });
      }
    } else if (layerMode === 'discoveries' || layerMode === 'exploration' || layerMode === 'elevation') {
      // Subtle unexplored historical indicator — NO footprint icon, NO badge name, NO points, NO mission trail
      markers.push({
        id: 'apollo:quiet_plain',
        entityKind: 'apollo',
        markerKind: 'apollo_hidden',
        name: 'Historic Landing Site',
        subtitle: 'An unexplored historical location.',
        x: apolloLoc.x,
        z: apolloLoc.z,
        accentHex: '#94a3b8',
        priority: 35,
        locId: 'apollo_11_site',
      });
    }
  }

  // 5. Crew NPCs Live Tracking
  if (layerMode === 'npcs' || layerMode === 'base' || (layerMode === 'exploration' && (!groupBase || zoom >= 1.5))) {
    hud.crewPositions.forEach((c) => {
      markers.push({
        id: `crew:${c.id}`,
        entityKind: 'crew',
        markerKind: 'crew',
        name: c.name,
        subtitle: `${c.role} · ${c.activity}`,
        x: c.x,
        z: c.z,
        accentHex: '#34d399',
        priority: layerMode === 'npcs' ? 92 : 72,
        crewId: c.id,
      });
    });
  }

  // 6. Rover Live Tracking
  if (layerMode === 'exploration' || layerMode === 'rover' || layerMode === 'missions' || layerMode === 'base') {
    markers.push({
      id: 'rover:ev',
      entityKind: 'rover',
      markerKind: 'rover',
      name: `Lunar EV (${Math.round(hud.roverBattery)}%)`,
      subtitle: hud.inVehicle
        ? 'Player Driving'
        : hud.roverCharging
        ? 'Charging on Inductive Pad'
        : `Parked · Battery ${Math.round(hud.roverBattery)}%`,
      x: hud.evX,
      z: hud.evZ,
      accentHex: '#fb923c',
      priority: layerMode === 'rover' ? 99 : 84,
    });
  }

  return markers;
}

export interface MapSearchResult {
  id: string;
  label: string;
  categoryLabel: string;
  x: number;
  z: number;
  entityKind: MapMarkerItem['entityKind'];
  facilityId?: string;
  locId?: string;
  crewId?: string;
  optionalId?: string;
}

export function searchMapEntities(
  query: string,
  hud: LiveHudSnapshot,
  progress: SaveProgress,
): MapSearchResult[] {
  const q = query.trim().toLowerCase();
  const revealed = getRevealedLocationIds(progress);
  const results: MapSearchResult[] = [];

  BASE_FACILITIES.forEach((f) => {
    results.push({
      id: `building:${f.id}`,
      label: f.name,
      categoryLabel: 'Base Facility',
      x: f.x,
      z: f.z,
      entityKind: 'building',
      facilityId: f.id,
      locId: f.id,
    });
  });

  WORLD_LOCATIONS.forEach((l) => {
    if (l.category === 'colony') return;
    if (l.id === 'apollo_11_site') {
      if (progress.apolloDiscovered || hud.apolloDiscovered) {
        results.push({
          id: 'apollo:site',
          label: l.name,
          categoryLabel: 'Historic Discovery',
          x: l.x,
          z: l.z,
          entityKind: 'apollo',
          locId: l.id,
        });
      }
      return;
    }
    if (revealed.has(l.id)) {
      results.push({
        id: `loc:${l.id}`,
        label: l.name,
        categoryLabel: l.category === 'crater' ? 'Crater' : l.category === 'outpost' ? 'Outpost' : 'Landmark',
        x: l.x,
        z: l.z,
        entityKind: 'location',
        locId: l.id,
      });
    }
  });

  hud.crewPositions.forEach((c) => {
    results.push({
      id: `crew:${c.id}`,
      label: c.name,
      categoryLabel: `${c.role} (Crew)`,
      x: c.x,
      z: c.z,
      entityKind: 'crew',
      crewId: c.id,
    });
  });

  results.push({
    id: 'rover:ev',
    label: `Lunar EV (${Math.round(hud.roverBattery)}%)`,
    categoryLabel: 'Vehicle',
    x: hud.evX,
    z: hud.evZ,
    entityKind: 'rover',
  });

  if (!q) return results;
  return results.filter(
    (r) => r.label.toLowerCase().includes(q) || r.categoryLabel.toLowerCase().includes(q),
  );
}

export function formatRegionForCoords(x: number, z: number): string {
  let best = LUNAR_REGIONS[0];
  let bestScore = Infinity;
  for (const r of LUNAR_REGIONS) {
    const d = Math.hypot(x - r.x, z - r.z) / Math.max(40, r.radius);
    if (d < bestScore) {
      bestScore = d;
      best = r;
    }
  }
  return best.name;
}

export function getMissionById(id: number): MissionDef | undefined {
  return CAMPAIGN_MISSIONS.find((m) => m.id === id);
}

/**
 * Generates crisp offscreen raster canvases for both:
 * 1) Standard Exploration Lunar Atlas (hillshaded regolith + geological region washes + contour lines)
 * 2) Scientific Elevation Relief Map (hypsometric color ramp + hillshading + contour lines)
 */
export function bakeLunarMapTextures(resolution = 512): {
  explorationCanvas: HTMLCanvasElement;
  elevationCanvas: HTMLCanvasElement;
  minHeight: number;
  maxHeight: number;
} {
  const expCanvas = document.createElement('canvas');
  expCanvas.width = resolution;
  expCanvas.height = resolution;
  const expCtx = expCanvas.getContext('2d')!;
  const expImg = expCtx.createImageData(resolution, resolution);

  const elevCanvas = document.createElement('canvas');
  elevCanvas.width = resolution;
  elevCanvas.height = resolution;
  const elevCtx = elevCanvas.getContext('2d')!;
  const elevImg = elevCtx.createImageData(resolution, resolution);

  const span = WORLD_PLAYABLE_RADIUS * 2.14; // [-481.5 .. +481.5]
  const half = span / 2;
  const heights = new Float32Array(resolution * resolution);
  let minH = Infinity;
  let maxH = -Infinity;

  for (let py = 0; py < resolution; py++) {
    const wz = (py / (resolution - 1)) * span - half;
    for (let px = 0; px < resolution; px++) {
      const wx = (px / (resolution - 1)) * span - half;
      const h = groundHeightAt(wx, wz);
      heights[py * resolution + px] = h;
      if (Math.hypot(wx, wz) <= WORLD_PLAYABLE_RADIUS + 20) {
        if (h < minH) minH = h;
        if (h > maxH) maxH = h;
      }
    }
  }

  // Light vector for clear NW hillshading
  const lx = -0.62;
  const ly = 0.68;
  const lz = -0.39;
  const stepMeters = span / (resolution - 1);

  const elevStops: Array<{ h: number; rgb: [number, number, number] }> = [
    { h: -11, rgb: [30, 58, 138] }, // Deep crater floor (indigo blue)
    { h: -4, rgb: [14, 116, 144] }, // Low basin (teal cyan)
    { h: 0, rgb: [51, 108, 116] }, // Mare baseline
    { h: 4, rgb: [77, 134, 106] }, // Gentle rolling plains
    { h: 9, rgb: [184, 158, 86] }, // Elevated ridges
    { h: 16, rgb: [226, 138, 68] }, // Highland peaks
    { h: 28, rgb: [248, 224, 184] }, // Outer rim crests
  ];

  const sampleElevColor = (h: number): [number, number, number] => {
    if (h <= elevStops[0].h) return elevStops[0].rgb;
    for (let i = 0; i < elevStops.length - 1; i++) {
      const a = elevStops[i];
      const b = elevStops[i + 1];
      if (h <= b.h) {
        const t = (h - a.h) / (b.h - a.h);
        return [
          a.rgb[0] + (b.rgb[0] - a.rgb[0]) * t,
          a.rgb[1] + (b.rgb[1] - a.rgb[1]) * t,
          a.rgb[2] + (b.rgb[2] - a.rgb[2]) * t,
        ];
      }
    }
    return elevStops[elevStops.length - 1].rgb;
  };

  for (let py = 0; py < resolution; py++) {
    const wz = (py / (resolution - 1)) * span - half;
    const pyUp = Math.max(0, py - 1);
    const pyDn = Math.min(resolution - 1, py + 1);
    for (let px = 0; px < resolution; px++) {
      const wx = (px / (resolution - 1)) * span - half;
      const pxL = Math.max(0, px - 1);
      const pxR = Math.min(resolution - 1, px + 1);

      const idx = py * resolution + px;
      const h = heights[idx];
      const dhx = (heights[py * resolution + pxR] - heights[py * resolution + pxL]) / (2 * stepMeters);
      const dhz = (heights[pyDn * resolution + px] - heights[pyUp * resolution + px]) / (2 * stepMeters);

      // Surface normal (-dhx, 1, -dhz) normalized
      const invLen = 1 / Math.sqrt(dhx * dhx + 1 + dhz * dhz);
      const nx = -dhx * invLen;
      const ny = invLen;
      const nz = -dhz * invLen;
      const dot = Math.max(0.18, Math.min(1.25, nx * lx + ny * ly + nz * lz + 0.16));

      // Contour detection every 3.5m
      const hRight = heights[py * resolution + pxR];
      const hDown = heights[pyDn * resolution + px];
      const cInterval = 3.5;
      const band = Math.floor(h / cInterval);
      const isContour =
        Math.floor(hRight / cInterval) !== band || Math.floor(hDown / cInterval) !== band;

      // Region tint blending for Exploration map
      let baseR = 72;
      let baseG = 82;
      let baseB = 98;
      let wSum = 1.0;
      for (let rIdx = 0; rIdx < LUNAR_REGIONS.length; rIdx++) {
        const reg = LUNAR_REGIONS[rIdx];
        const d = Math.hypot(wx - reg.x, wz - reg.z);
        if (d < reg.radius * 1.45) {
          const w = (1 - d / (reg.radius * 1.45)) * 1.6;
          baseR += reg.tintRgb[0] * w;
          baseG += reg.tintRgb[1] * w;
          baseB += reg.tintRgb[2] * w;
          wSum += w;
        }
      }
      baseR /= wSum;
      baseG /= wSum;
      baseB /= wSum;

      // Crater floor shading + subtle rim ring
      let craterTone = 1.0;
      for (let ci = 0; ci < NAMED_CRATERS.length; ci++) {
        const c = NAMED_CRATERS[ci];
        const dc = Math.hypot(wx - c.x, wz - c.z);
        if (dc < c.radius * 1.08) {
          const rn = dc / c.radius;
          if (rn < 0.85) craterTone *= 0.82 + rn * 0.16;
          else if (rn <= 1.06) craterTone *= 1.15;
        }
      }

      // Dim outer mountain ring beyond playable radius 450m cleanly
      const distOrigin = Math.hypot(wx, wz);
      const boundaryFade =
        distOrigin > WORLD_PLAYABLE_RADIUS
          ? Math.max(0.32, 1 - (distOrigin - WORLD_PLAYABLE_RADIUS) / 65)
          : 1.0;

      const shade = dot * craterTone * boundaryFade;
      let er = Math.min(255, baseR * shade * 1.08);
      let eg = Math.min(255, baseG * shade * 1.08);
      let eb = Math.min(255, baseB * shade * 1.12);
      if (isContour && distOrigin <= WORLD_PLAYABLE_RADIUS + 10) {
        er = er * 0.84 + 28;
        eg = eg * 0.84 + 34;
        eb = eb * 0.84 + 44;
      }

      const o = idx * 4;
      expImg.data[o] = er;
      expImg.data[o + 1] = eg;
      expImg.data[o + 2] = eb;
      expImg.data[o + 3] = 255;

      // Elevation map pixel
      const [hr, hg, hb] = sampleElevColor(h);
      const eShade = (0.58 + 0.56 * dot) * boundaryFade;
      let vr = Math.min(255, hr * eShade);
      let vg = Math.min(255, hg * eShade);
      let vb = Math.min(255, hb * eShade);
      if (isContour && distOrigin <= WORLD_PLAYABLE_RADIUS + 10) {
        vr *= 0.72;
        vg *= 0.72;
        vb *= 0.72;
      }
      elevImg.data[o] = vr;
      elevImg.data[o + 1] = vg;
      elevImg.data[o + 2] = vb;
      elevImg.data[o + 3] = 255;
    }
  }

  expCtx.putImageData(expImg, 0, 0);
  elevCtx.putImageData(elevImg, 0, 0);

  return {
    explorationCanvas: expCanvas,
    elevationCanvas: elevCanvas,
    minHeight: Math.round(minH),
    maxHeight: Math.round(maxH),
  };
}
