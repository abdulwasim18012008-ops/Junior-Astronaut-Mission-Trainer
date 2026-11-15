import { BUILDING_ZONES, ALL_WALL_COLLIDERS } from './colonyLayout';
import { CHARGING_BAY_A_POS, MEV_BATTERY_CAPACITY_KWH, MEV_BASELINE_WH_PER_M } from './marsConfig';
import { groundHeightAt, surfaceTypeAt, WORLD_ROCK_COLLIDERS } from './marsTerrain';
import { EXPANSION_PODS } from './roversData';
import { BuildingId, NavigationRoute } from './types';

export interface MapLocationSpec {
  id: string;
  name: string;
  category: 'colony' | 'exploration';
  subCategory: string;
  x: number;
  z: number;
  approachX: number;
  approachZ: number;
  accentHex: string;
  description: string;
  missionIds: number[];
  linkedDiscoveryId?: string;
  linkedDiscoveryKind?: 'landmark' | 'anomaly' | 'rover';
}

export const COLONY_MAP_LOCATIONS: MapLocationSpec[] = [
  {
    id: 'crew_home',
    name: 'Main Crew Habitat',
    category: 'colony',
    subCategory: 'Living Quarters & Command Hub',
    x: 0,
    z: 0,
    approachX: 0,
    approachZ: 6.4,
    accentHex: '#38bdf8',
    description: 'Central pressurized crew dome with sleeping pods, food pantry, thermostat, and monitors.',
    missionIds: [2, 3, 9, 10, 20],
  },
  {
    id: 'oxygen_centre',
    name: 'Oxygen Centre',
    category: 'colony',
    subCategory: 'Life Support & O₂ Scrubbers',
    x: -11.5,
    z: 4.5,
    approachX: -6.8,
    approachZ: 4.5,
    accentHex: '#0ea5e9',
    description: 'Generates breathable oxygen from Martian CO₂ and scrubs stale cabin air.',
    missionIds: [3],
  },
  {
    id: 'water_station',
    name: 'Water Processing Station',
    category: 'colony',
    subCategory: 'Hydro-Recycling Silos',
    x: -11.0,
    z: -7.5,
    approachX: -6.2,
    approachZ: -7.5,
    accentHex: '#3b82f6',
    description: 'Purifies and recycles greywater and subsurface ice into clean drinking water.',
    missionIds: [4, 7],
  },
  {
    id: 'power_station',
    name: 'Power Station',
    category: 'colony',
    subCategory: 'Colony Battery & Microgrid',
    x: -15.5,
    z: 11.5,
    approachX: -11.2,
    approachZ: 11.5,
    accentHex: '#f59e0b',
    description: 'Stores daytime solar energy in pressurized thermal battery banks for cold Mars nights.',
    missionIds: [5, 10, 15, 20],
  },
  {
    id: 'solar_expansion',
    name: 'Solar Farm & Satellite Uplink',
    category: 'colony',
    subCategory: 'Auxiliary Photovoltaic Wings',
    x: -27.5,
    z: -8.5,
    approachX: -22.8,
    approachZ: -8.5,
    accentHex: '#eab308',
    description: 'Dual tracking solar arrays feeding extra kilowatts into the colony grid and charging bays.',
    missionIds: [5, 17, 20],
  },
  {
    id: 'greenhouse',
    name: 'Greenhouse',
    category: 'colony',
    subCategory: 'Hydroponic Food Dome',
    x: 11.0,
    z: -1.5,
    approachX: 5.8,
    approachZ: -1.5,
    accentHex: '#10b981',
    description: 'LED-lit hydroponic trays growing fresh tomatoes, greens, and oxygen-producing plants.',
    missionIds: [6, 9, 15],
  },
  {
    id: 'research_lab',
    name: 'Research Laboratory',
    category: 'colony',
    subCategory: 'Regolith & Sample Chemistry',
    x: 18.5,
    z: -16.5,
    approachX: 14.5,
    approachZ: -15.0,
    accentHex: '#06b6d4',
    description: 'Microscopy and mass-spectrometry lab for testing Martian soil and rock cores.',
    missionIds: [2, 12, 14],
  },
  {
    id: 'medical_room',
    name: 'Medical Centre',
    category: 'colony',
    subCategory: 'Crew Health & Diagnostics',
    x: 8.5,
    z: 8.8,
    approachX: 4.5,
    approachZ: 8.8,
    accentHex: '#ef4444',
    description: 'Pressurized medical pod with telemetry scanner bed and emergency first-aid supplies.',
    missionIds: [8],
  },
  {
    id: 'comms_tower',
    name: 'Communication Tower',
    category: 'colony',
    subCategory: 'Deep-Space High-Gain Dish',
    x: 10.0,
    z: -11.5,
    approachX: 5.8,
    approachZ: -11.5,
    accentHex: '#a855f7',
    description: 'Orbital relay dish beaming telemetry between Ares Outpost, Mars orbiters, and Earth.',
    missionIds: [11, 12, 16, 17],
  },
  {
    id: 'weather_station',
    name: 'Weather Monitoring Station',
    category: 'colony',
    subCategory: 'Barometric & Dust Telemetry',
    x: -25.5,
    z: 2.5,
    approachX: -21.2,
    approachZ: 2.5,
    accentHex: '#38bdf8',
    description: 'Tracks wind vectors, atmospheric pressure, dust opacity (tau), and incoming dust storms.',
    missionIds: [15, 18],
  },
  {
    id: 'radiation_shelter',
    name: 'Radiation Shelter',
    category: 'colony',
    subCategory: 'Armored Regolith Bunker',
    x: -2.5,
    z: 13.5,
    approachX: -2.5,
    approachZ: 9.2,
    accentHex: '#f43f5e',
    description: 'Thick regolith-shielded safe bunker with viewport windows for storm and radiation protection.',
    missionIds: [15, 19, 20],
  },
  {
    id: 'rover_garage',
    name: 'Rover Garage',
    category: 'colony',
    subCategory: '6x6 MEV Maintenance Hangar',
    x: 23.0,
    z: -3.5,
    approachX: 18.2,
    approachZ: -3.5,
    accentHex: '#f97316',
    description: 'Service hangar for suspension checks, wheel diagnostics, and pressurized vehicle repairs.',
    missionIds: [2, 12, 13],
  },
  {
    id: 'charging_station',
    name: 'Vehicle Charging Station',
    category: 'colony',
    subCategory: 'Bay A (MEV) & Bay B (Utility)',
    x: CHARGING_BAY_A_POS[0],
    z: CHARGING_BAY_A_POS[1],
    approachX: 18.0,
    approachZ: CHARGING_BAY_A_POS[1],
    accentHex: '#06b6d4',
    description: 'Drive-in inductive & umbilical charging gantry drawing managed power from the colony microgrid.',
    missionIds: [2, 5, 12, 15],
  },
  {
    id: 'cargo_pod',
    name: 'Supply Warehouse',
    category: 'colony',
    subCategory: 'Cargo Pad & Resupply Terminal',
    x: -15.5,
    z: -23.0,
    approachX: -12.0,
    approachZ: -19.2,
    accentHex: '#f59e0b',
    description: 'Stores incoming cargo crates delivered by autonomous robotic transporters from the Cargo Pad.',
    missionIds: [4, 7, 9, 20],
  },
  {
    id: 'observatory',
    name: 'Observatory',
    category: 'colony',
    subCategory: 'Phobos & Deimos Dome',
    x: -17.5,
    z: 22.5,
    approachX: -14.0,
    approachZ: 19.0,
    accentHex: '#8b5cf6',
    description: 'Rotating optical dome tracking Phobos, Deimos, and orbital supply arrivals.',
    missionIds: [16, 17],
  },
  {
    id: 'drone_station',
    name: 'Drone Control Station',
    category: 'colony',
    subCategory: 'Aerial Scout Helipad',
    x: -25.0,
    z: 15.5,
    approachX: -21.0,
    approachZ: 15.5,
    accentHex: '#14b8a6',
    description: 'Launches and recharges the thin-atmosphere rotor scout drone for canyon reconnaissance.',
    missionIds: [11, 12],
  },
  {
    id: 'geology_station',
    name: 'Geological Research Centre',
    category: 'colony',
    subCategory: 'Core Drills & Mineral Archive',
    x: -22.0,
    z: -15.5,
    approachX: -18.0,
    approachZ: -14.0,
    accentHex: '#d97706',
    description: 'Logs canyon stratigraphy, mineral veins, and surface core samples.',
    missionIds: [14],
  },
  {
    id: 'emergency_shelter',
    name: 'Emergency Habitat',
    category: 'colony',
    subCategory: 'South Backup Life-Support Pod',
    x: 14.5,
    z: 23.5,
    approachX: 11.5,
    approachZ: 20.5,
    accentHex: '#dc2626',
    description: 'Independent reserve pressurized habitat stocked with emergency air, water, and thermal cells.',
    missionIds: [19, 20],
  },
];

export const EXPLORATION_MAP_LOCATIONS: MapLocationSpec[] = [
  {
    id: 'exp_remote_relay_start',
    name: 'Remote Relay Outpost',
    category: 'exploration',
    subCategory: 'East Canyon Relay Station',
    x: 122,
    z: 48,
    approachX: 115,
    approachZ: 50,
    accentHex: '#38bdf8',
    description: 'Remote desert relay box stabilized at the beginning of your Mars journey.',
    missionIds: [1, 2],
  },
  {
    id: 'exp_lost_beacon',
    name: 'Lost Exploration Beacon',
    category: 'exploration',
    subCategory: 'Northern Valley Lighthouse',
    x: 64,
    z: -98,
    approachX: 64,
    approachZ: -98,
    accentHex: '#f97316',
    description: 'Solar trail marker north of Ares Basin guiding distant field vehicles safely home.',
    missionIds: [11],
  },
  {
    id: 'exp_mountain_station',
    name: 'Mountain Research Station',
    category: 'exploration',
    subCategory: 'Northwest High Ridge Outpost',
    x: -118,
    z: -96,
    approachX: -118,
    approachZ: -96,
    accentHex: '#10b981',
    description: 'Elevated hillside science pod overlooking layered canyon cliffs and basin winds.',
    missionIds: [14],
  },
  {
    id: 'exp_remote_weather',
    name: 'Remote Weather Station',
    category: 'exploration',
    subCategory: 'West Plains Anemometer Mast',
    x: -124,
    z: 34,
    approachX: -124,
    approachZ: 34,
    accentHex: '#0ea5e9',
    description: 'Autonomous western wind and dust sensor pod providing early storm warnings.',
    missionIds: [18],
  },
  {
    id: 'exp_old_landing',
    name: 'Old Landing Zone',
    category: 'exploration',
    subCategory: 'Historic Heat Shield & Parachute',
    x: 52,
    z: -24,
    approachX: 52,
    approachZ: -24,
    accentHex: '#f97316',
    description: 'Early arrival debris field featuring a scorched thermal heat shield and parachute canopy.',
    missionIds: [12],
    linkedDiscoveryId: 'old_heatshield',
    linkedDiscoveryKind: 'anomaly',
  },
  {
    id: 'exp_sojourner',
    name: 'Sojourner Heritage Site',
    category: 'exploration',
    subCategory: 'Northeast Floodplain Rover',
    x: 68,
    z: -44,
    approachX: 68,
    approachZ: -44,
    accentHex: '#38bdf8',
    description: 'Historic Pathfinder wheeled explorer blinking faintly across the northeast floodplain.',
    missionIds: [12],
    linkedDiscoveryId: 'sojourner',
    linkedDiscoveryKind: 'rover',
  },
  {
    id: 'exp_ancient_formation',
    name: 'Ancient Geological Formation',
    category: 'exploration',
    subCategory: 'Wind-Carved Basalt Arch',
    x: 60,
    z: 48,
    approachX: 60,
    approachZ: 48,
    accentHex: '#ea580c',
    description: 'Dramatic natural basalt stone arch sculpted over millions of years by Martian windblown sand.',
    missionIds: [],
    linkedDiscoveryId: 'basalt_arch',
    linkedDiscoveryKind: 'anomaly',
  },
  {
    id: 'exp_southern_crater',
    name: 'Southern Crater',
    category: 'exploration',
    subCategory: 'Southeast Impact Rim',
    x: 88,
    z: 76,
    approachX: 88,
    approachZ: 76,
    accentHex: '#f59e0b',
    description: 'Deep meteorite impact basin exposing ancient subsurface bedrock along its raised rim.',
    missionIds: [],
    linkedDiscoveryId: 'impact_crater',
    linkedDiscoveryKind: 'landmark',
  },
  {
    id: 'exp_exploration_ridge',
    name: 'Exploration Ridge',
    category: 'exploration',
    subCategory: 'Marathon Rover Beacon',
    x: 102,
    z: 66,
    approachX: 102,
    approachZ: 66,
    accentHex: '#eab308',
    description: 'High eastern ridge overlooking the impact crater where an endurance rover signal persists.',
    missionIds: [],
    linkedDiscoveryId: 'opportunity',
    linkedDiscoveryKind: 'rover',
  },
  {
    id: 'exp_remote_rover',
    name: 'Spirit Dune Rover Site',
    category: 'exploration',
    subCategory: 'Ochre Dune Spirit Site',
    x: -92,
    z: 62,
    approachX: -92,
    approachZ: 62,
    accentHex: '#fb923c',
    description: 'Soft crescent dunes in the southwest plains surrounding a historic trapped exploration rover.',
    missionIds: [13],
    linkedDiscoveryId: 'spirit',
    linkedDiscoveryKind: 'rover',
  },
  {
    id: 'exp_remote_relay',
    name: 'Canyon Telemetry Mast',
    category: 'exploration',
    subCategory: 'Northwest Signal Mast',
    x: -64,
    z: -48,
    approachX: -64,
    approachZ: -48,
    accentHex: '#a855f7',
    description: 'Tilted autonomous radio mast echoing telemetry from the northwest canyon shelf.',
    missionIds: [16],
    linkedDiscoveryId: 'remote_relay',
    linkedDiscoveryKind: 'anomaly',
  },
  {
    id: 'exp_rocky_highlands',
    name: 'Rocky Highlands',
    category: 'exploration',
    subCategory: 'Layered Sedimentary Cliffs',
    x: -96,
    z: -72,
    approachX: -96,
    approachZ: -72,
    accentHex: '#10b981',
    description: 'Terraced canyon ledges preserving ancient lakebed sediment bands and boulder fields.',
    missionIds: [14],
    linkedDiscoveryId: 'rock_strata',
    linkedDiscoveryKind: 'landmark',
  },
  {
    id: 'exp_scientific_sample',
    name: 'Scientific Sample Zone',
    category: 'exploration',
    subCategory: 'Ancient Pale Mineral Vein',
    x: -18,
    z: -98,
    approachX: -18,
    approachZ: -98,
    accentHex: '#38bdf8',
    description: 'Bright hydrated sulfate veins indicating liquid water once flowed beneath the canyon floor.',
    missionIds: [],
    linkedDiscoveryId: 'clay_vein',
    linkedDiscoveryKind: 'anomaly',
  },
  {
    id: 'exp_distant_outpost',
    name: 'Northern Frost Trench',
    category: 'exploration',
    subCategory: 'Frozen Water Shelf',
    x: 12,
    z: -136,
    approachX: 12,
    approachZ: -136,
    accentHex: '#60a5fa',
    description: 'Far northern permafrost shelf holding clean water-ice deposits just under the red dust.',
    missionIds: [],
    linkedDiscoveryId: 'ice_trench',
    linkedDiscoveryKind: 'landmark',
  },
  {
    id: 'exp_northern_research',
    name: 'Northern Research Zone',
    category: 'exploration',
    subCategory: 'Perseverance Delta Basin',
    x: 18,
    z: -152,
    approachX: 18,
    approachZ: -152,
    accentHex: '#8b5cf6',
    description: 'Deep northern exploration frontier housing cached sample telemetry and delta geology.',
    missionIds: [],
    linkedDiscoveryId: 'perseverance',
    linkedDiscoveryKind: 'rover',
  },
];

export const ALL_MAP_LOCATIONS: MapLocationSpec[] = [
  ...COLONY_MAP_LOCATIONS,
  ...EXPLORATION_MAP_LOCATIONS,
];

export function getStructureWorldCoords(structureId: string): { x: number; z: number; name: string } {
  const found = ALL_MAP_LOCATIONS.find((l) => l.id === structureId);
  if (found) return { x: found.x, z: found.z, name: found.name };
  if (structureId === 'command_centre') {
    const b = BUILDING_ZONES.command_centre;
    return { x: b.x, z: b.z, name: 'Command Centre' };
  }
  const pod = EXPANSION_PODS.find((p) => p.id === structureId);
  if (pod) return { x: pod.x, z: pod.z, name: pod.name };
  return { x: 0, z: 0, name: 'Colony Hub' };
}

// =========================================================================
// OBSTACLE-AWARE GRID A* NAVIGATION (4m grid over -212m..+212m + LOS Smoothing)
// =========================================================================
const GRID_MIN = -212;
const CELL_SIZE = 4;
const GRID_N = 107; // 107 * 4 = 428m (-212..216)

let cachedFootGrid: Uint8Array | null = null;
let cachedVehicleGrid: Uint8Array | null = null;

function worldToGrid(v: number): number {
  return Math.max(0, Math.min(GRID_N - 1, Math.round((v - GRID_MIN) / CELL_SIZE)));
}

function gridToWorld(g: number): number {
  return GRID_MIN + g * CELL_SIZE;
}

function localTerrainSlope(x: number, z: number): number {
  const hC = groundHeightAt(x, z);
  const d = 2.0;
  const gx = (groundHeightAt(x + d, z) - groundHeightAt(x - d, z)) / (2 * d);
  const gz = (groundHeightAt(x, z + d) - groundHeightAt(x, z - d)) / (2 * d);
  // Finite difference centered around (x, z); clamp extreme micro-steps at terrace ledges
  void hC;
  return Math.hypot(gx, gz);
}

function isPointBlocked(x: number, z: number, mode: 'foot' | 'vehicle'): boolean {
  if (Math.hypot(x, z) > 210) return true;

  // Reject impassable cliffs / steep crater walls
  const maxSlope = mode === 'vehicle' ? 0.68 : 0.92;
  if (Math.hypot(x, z) > 30 && localTerrainSlope(x, z) > maxSlope) {
    return true;
  }

  if (mode === 'vehicle') {
    const pad = 1.45;
    // Vehicles route around full building enclosures rather than driving indoors
    const bKeys = Object.keys(BUILDING_ZONES) as Array<keyof typeof BUILDING_ZONES>;
    for (let i = 0; i < bKeys.length; i++) {
      const b = BUILDING_ZONES[bKeys[i]];
      if (
        x >= b.x - b.hx - pad &&
        x <= b.x + b.hx + pad &&
        z >= b.z - b.hz - pad &&
        z <= b.z + b.hz + pad
      ) {
        return true;
      }
    }
    for (let i = 0; i < ALL_WALL_COLLIDERS.length; i++) {
      const w = ALL_WALL_COLLIDERS[i];
      if (x >= w.minX - pad && x <= w.maxX + pad && z >= w.minZ - pad && z <= w.maxZ + pad) {
        return true;
      }
    }
    for (let i = 0; i < EXPANSION_PODS.length; i++) {
      const pod = EXPANSION_PODS[i];
      if (Math.hypot(x - pod.x, z - pod.z) < pod.radius + 1.55) return true;
    }
    for (let i = 0; i < WORLD_ROCK_COLLIDERS.length; i++) {
      const r = WORLD_ROCK_COLLIDERS[i];
      if (r.kind === 'slab') continue;
      if (r.kind === 'boulder' && r.radius <= 0.72) continue;
      if (Math.hypot(x - r.x, z - r.z) < r.radius + 1.45) return true;
    }
    return false;
  }

  // Pedestrian grid: avoids walls (keeping doors open), pods, and large rocks
  const fPad = 0.55;
  for (let i = 0; i < ALL_WALL_COLLIDERS.length; i++) {
    const w = ALL_WALL_COLLIDERS[i];
    if (x >= w.minX - fPad && x <= w.maxX + fPad && z >= w.minZ - fPad && z <= w.maxZ + fPad) {
      return true;
    }
  }
  for (let i = 0; i < EXPANSION_PODS.length; i++) {
    const pod = EXPANSION_PODS[i];
    if (Math.hypot(x - pod.x, z - pod.z) < pod.radius + 0.65) return true;
  }
  for (let i = 0; i < WORLD_ROCK_COLLIDERS.length; i++) {
    const r = WORLD_ROCK_COLLIDERS[i];
    if (r.kind === 'slab') continue;
    if (r.kind === 'boulder' && r.radius <= 0.72) continue;
    if (Math.hypot(x - r.x, z - r.z) < r.radius + 0.6) return true;
  }
  return false;
}

function getObstacleGrid(mode: 'foot' | 'vehicle'): Uint8Array {
  if (mode === 'foot' && cachedFootGrid) return cachedFootGrid;
  if (mode === 'vehicle' && cachedVehicleGrid) return cachedVehicleGrid;

  const grid = new Uint8Array(GRID_N * GRID_N);
  for (let gz = 0; gz < GRID_N; gz++) {
    const wz = gridToWorld(gz);
    for (let gx = 0; gx < GRID_N; gx++) {
      const wx = gridToWorld(gx);
      if (isPointBlocked(wx, wz, mode)) {
        grid[gz * GRID_N + gx] = 1;
      }
    }
  }
  if (mode === 'foot') cachedFootGrid = grid;
  else cachedVehicleGrid = grid;
  return grid;
}

function findNearestFreeCell(
  grid: Uint8Array,
  gx: number,
  gz: number,
  refX?: number,
  refZ?: number,
  mode: 'foot' | 'vehicle' = 'foot',
): [number, number] {
  if (
    grid[gz * GRID_N + gx] === 0 &&
    (refX === undefined || refZ === undefined || hasSegmentObstacleClearance(refX, refZ, gridToWorld(gx), gridToWorld(gz), mode))
  ) {
    return [gx, gz];
  }
  if (refX !== undefined && refZ !== undefined) {
    let bestCell: [number, number] | null = null;
    let bestDist = Infinity;
    for (let r = 0; r <= 8; r++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          const nx = gx + dx;
          const nz = gz + dz;
          if (nx < 0 || nx >= GRID_N || nz < 0 || nz >= GRID_N || grid[nz * GRID_N + nx] !== 0) continue;
          const wx = gridToWorld(nx);
          const wz = gridToWorld(nz);
          if (!hasSegmentObstacleClearance(refX, refZ, wx, wz, mode)) continue;
          const d = Math.hypot(wx - refX, wz - refZ);
          if (d < bestDist) {
            bestDist = d;
            bestCell = [nx, nz];
          }
        }
      }
      if (bestCell) return bestCell;
    }
  }
  for (let r = 0; r <= 10; r++) {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        const nx = gx + dx;
        const nz = gz + dz;
        if (nx >= 0 && nx < GRID_N && nz >= 0 && nz < GRID_N && grid[nz * GRID_N + nx] === 0) {
          return [nx, nz];
        }
      }
    }
  }
  return [gx, gz];
}

function segmentIntersectsAABB(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
): boolean {
  const dx = bx - ax;
  const dz = bz - az;
  let tMin = 0;
  let tMax = 1;

  if (Math.abs(dx) < 1e-6) {
    if (ax < minX || ax > maxX) return false;
  } else {
    const invD = 1 / dx;
    let t1 = (minX - ax) * invD;
    let t2 = (maxX - ax) * invD;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }

  if (Math.abs(dz) < 1e-6) {
    if (az < minZ || az > maxZ) return false;
  } else {
    const invD = 1 / dz;
    let t1 = (minZ - az) * invD;
    let t2 = (maxZ - az) * invD;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

function segmentIntersectsCircle(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  cx: number,
  cz: number,
  r: number,
): boolean {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  let t = 0;
  if (lenSq > 1e-6) {
    t = Math.max(0, Math.min(1, ((cx - ax) * dx + (cz - az) * dz) / lenSq));
  }
  const px = ax + dx * t;
  const pz = az + dz * t;
  return Math.hypot(px - cx, pz - cz) < r;
}

function findContainingBuilding(x: number, z: number, margin = 0.2): BuildingId | null {
  const keys = Object.keys(BUILDING_ZONES) as BuildingId[];
  for (let i = 0; i < keys.length; i++) {
    const b = BUILDING_ZONES[keys[i]];
    if (
      x >= b.x - b.hx + margin &&
      x <= b.x + b.hx - margin &&
      z >= b.z - b.hz + margin &&
      z <= b.z + b.hz - margin
    ) {
      return keys[i];
    }
  }
  return null;
}

function getDoorThresholdPoint(id: BuildingId, outwardOffset = 1.6): [number, number] {
  const b = BUILDING_ZONES[id];
  if (b.doorFacing === 'north') return [b.doorX, b.doorZ - outwardOffset];
  if (b.doorFacing === 'south') return [b.doorX, b.doorZ + outwardOffset];
  if (b.doorFacing === 'west') return [b.doorX - outwardOffset, b.doorZ];
  return [b.doorX + outwardOffset, b.doorZ];
}

function hasSegmentObstacleClearance(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  mode: 'foot' | 'vehicle',
): boolean {
  const pad = mode === 'vehicle' ? 1.45 : 0.45;
  if (mode === 'vehicle') {
    const bKeys = Object.keys(BUILDING_ZONES) as BuildingId[];
    for (let i = 0; i < bKeys.length; i++) {
      const b = BUILDING_ZONES[bKeys[i]];
      if (
        segmentIntersectsAABB(
          ax,
          az,
          bx,
          bz,
          b.x - b.hx - pad,
          b.x + b.hx + pad,
          b.z - b.hz - pad,
          b.z + b.hz + pad,
        )
      ) {
        return false;
      }
    }
  }
  for (let i = 0; i < ALL_WALL_COLLIDERS.length; i++) {
    const w = ALL_WALL_COLLIDERS[i];
    if (
      segmentIntersectsAABB(
        ax,
        az,
        bx,
        bz,
        w.minX - pad,
        w.maxX + pad,
        w.minZ - pad,
        w.maxZ + pad,
      )
    ) {
      return false;
    }
  }
  const podPad = mode === 'vehicle' ? 1.55 : 0.55;
  for (let i = 0; i < EXPANSION_PODS.length; i++) {
    const pod = EXPANSION_PODS[i];
    if (segmentIntersectsCircle(ax, az, bx, bz, pod.x, pod.z, pod.radius + podPad)) {
      return false;
    }
  }
  const rockPad = mode === 'vehicle' ? 1.45 : 0.5;
  for (let i = 0; i < WORLD_ROCK_COLLIDERS.length; i++) {
    const r = WORLD_ROCK_COLLIDERS[i];
    if (r.kind === 'slab') continue;
    if (r.kind === 'boulder' && r.radius <= 0.72) continue;
    if (segmentIntersectsCircle(ax, az, bx, bz, r.x, r.z, r.radius + rockPad)) {
      return false;
    }
  }
  return true;
}

function hasGridLineOfSight(
  grid: Uint8Array,
  ax: number,
  az: number,
  bx: number,
  bz: number,
  mode: 'foot' | 'vehicle',
): boolean {
  if (!hasSegmentObstacleClearance(ax, az, bx, bz, mode)) return false;

  const dist = Math.hypot(bx - ax, bz - az);
  const steps = Math.max(2, Math.ceil(dist / 1.4));
  const maxStepSlope = mode === 'vehicle' ? 0.58 : 0.82;
  let prevX = ax;
  let prevZ = az;
  let prevY = groundHeightAt(ax, az);

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const z = az + (bz - az) * t;
    if (i < steps) {
      const gx = worldToGrid(x);
      const gz = worldToGrid(z);
      if (grid[gz * GRID_N + gx] === 1) return false;
    }

    const y = groundHeightAt(x, z);
    const segLen = Math.hypot(x - prevX, z - prevZ);
    if (segLen > 0.1 && Math.abs(y - prevY) / segLen > maxStepSlope) {
      return false;
    }
    prevX = x;
    prevZ = z;
    prevY = y;
  }
  return true;
}

export function sampleTerrainRoutePoints3D(
  waypoints: Array<[number, number]>,
  stepM = 2.0,
  yOffset = 0.24,
): Array<[number, number, number]> {
  if (waypoints.length === 0) return [];
  const pts: Array<[number, number, number]> = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [ax, az] = waypoints[i];
    const [bx, bz] = waypoints[i + 1];
    const segLen = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(1, Math.ceil(segLen / stepM));
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const x = ax + (bx - ax) * t;
      const z = az + (bz - az) * t;
      pts.push([x, groundHeightAt(x, z) + yOffset, z]);
    }
  }
  const [lx, lz] = waypoints[waypoints.length - 1];
  pts.push([lx, groundHeightAt(lx, lz) + yOffset, lz]);
  return pts;
}

export function computeNavigationRoute(
  startX: number,
  startZ: number,
  destX: number,
  destZ: number,
  mode: 'foot' | 'vehicle',
  meta: {
    destinationId: string;
    destinationName: string;
    destinationCategory: NavigationRoute['destinationCategory'];
    avgWhPerM?: number;
  },
): NavigationRoute {
  const grid = getObstacleGrid(mode);

  // Route cleanly through building doorways when walking into or out of an enclosed module
  const startBuilding = mode === 'foot' ? findContainingBuilding(startX, startZ, 0.1) : null;
  const destBuilding = mode === 'foot' ? findContainingBuilding(destX, destZ, 0.1) : null;
  const sameBuilding = startBuilding !== null && startBuilding === destBuilding;

  let navStartX = startX;
  let navStartZ = startZ;
  const prefixPts: Array<[number, number]> = [[startX, startZ]];
  if (startBuilding && !sameBuilding) {
    const sb = BUILDING_ZONES[startBuilding];
    const [thX, thZ] = getDoorThresholdPoint(startBuilding, 1.55);
    prefixPts.push([sb.doorX, sb.doorZ], [thX, thZ]);
    navStartX = thX;
    navStartZ = thZ;
  }

  let navDestX = destX;
  let navDestZ = destZ;
  const suffixPts: Array<[number, number]> = [];
  if (destBuilding && !sameBuilding) {
    const db = BUILDING_ZONES[destBuilding];
    const [thX, thZ] = getDoorThresholdPoint(destBuilding, 1.55);
    navDestX = thX;
    navDestZ = thZ;
    suffixPts.push([db.doorX, db.doorZ], [destX, destZ]);
  } else {
    suffixPts.push([destX, destZ]);
  }

  let waypoints: Array<[number, number]>;
  if (sameBuilding) {
    waypoints = [
      [startX, startZ],
      [destX, destZ],
    ];
  } else {
    const sRawX = worldToGrid(navStartX);
    const sRawZ = worldToGrid(navStartZ);
    const gRawX = worldToGrid(navDestX);
    const gRawZ = worldToGrid(navDestZ);

    const [sx, sz] = findNearestFreeCell(grid, sRawX, sRawZ, navStartX, navStartZ, mode);
    const [tx, tz] = findNearestFreeCell(grid, gRawX, gRawZ, navDestX, navDestZ, mode);

    const totalCells = GRID_N * GRID_N;
    const gScore = new Float32Array(totalCells).fill(Infinity);
    const fScore = new Float32Array(totalCells).fill(Infinity);
    const cameFrom = new Int32Array(totalCells).fill(-1);
    const closed = new Uint8Array(totalCells);
    const inOpen = new Uint8Array(totalCells);

    const startIdx = sz * GRID_N + sx;
    const goalIdx = tz * GRID_N + tx;
    gScore[startIdx] = 0;
    fScore[startIdx] = Math.hypot(tx - sx, tz - sz);

    // Compact binary min-heap for fast <2ms elevation-aware A*
    const heap: number[] = [startIdx];
    inOpen[startIdx] = 1;

    const pushHeap = (idx: number) => {
      heap.push(idx);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (fScore[heap[p]] <= fScore[heap[i]]) break;
        const tmp = heap[p];
        heap[p] = heap[i];
        heap[i] = tmp;
        i = p;
      }
    };
    const popHeap = (): number => {
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length > 0) {
        heap[0] = last;
        let i = 0;
        const n = heap.length;
        while (true) {
          let best = i;
          const l = 2 * i + 1;
          const r = 2 * i + 2;
          if (l < n && fScore[heap[l]] < fScore[heap[best]]) best = l;
          if (r < n && fScore[heap[r]] < fScore[heap[best]]) best = r;
          if (best === i) break;
          const tmp = heap[i];
          heap[i] = heap[best];
          heap[best] = tmp;
          i = best;
        }
      }
      return top;
    };

    const dirs = [
      [1, 0, 1],
      [-1, 0, 1],
      [0, 1, 1],
      [0, -1, 1],
      [1, 1, 1.414],
      [-1, 1, 1.414],
      [1, -1, 1.414],
      [-1, -1, 1.414],
    ];

    let foundGoal = startIdx === goalIdx;
    while (heap.length > 0) {
      const cur = popHeap();
      inOpen[cur] = 0;
      if (cur === goalIdx) {
        foundGoal = true;
        break;
      }
      closed[cur] = 1;

      const cx = cur % GRID_N;
      const cz = (cur - cx) / GRID_N;
      const cwx = gridToWorld(cx);
      const cwz = gridToWorld(cz);
      const curY = groundHeightAt(cwx, cwz);

      for (let d = 0; d < dirs.length; d++) {
        const nx = cx + dirs[d][0];
        const nz = cz + dirs[d][1];
        if (nx < 0 || nx >= GRID_N || nz < 0 || nz >= GRID_N) continue;
        const nIdx = nz * GRID_N + nx;
        if (closed[nIdx] || grid[nIdx] === 1) continue;
        // Prevent corner cutting across blocked diagonal neighbors
        if (dirs[d][0] !== 0 && dirs[d][1] !== 0) {
          if (grid[cz * GRID_N + nx] === 1 || grid[nz * GRID_N + cx] === 1) continue;
        }

        const nwx = gridToWorld(nx);
        const nwz = gridToWorld(nz);
        if (!hasSegmentObstacleClearance(cwx, cwz, nwx, nwz, mode)) continue;
        const nextY = groundHeightAt(nwx, nwz);
        const stepDistM = dirs[d][2] * CELL_SIZE;
        const slope = Math.abs(nextY - curY) / stepDistM;

        // Prefer gentle grades & colony pathways; penalize steep inclines & loose sand for vehicles
        const surf = surfaceTypeAt(nwx, nwz);
        const surfaceFactor =
          surf === 'colony' ? 0.9 : mode === 'vehicle' && surf === 'sand' ? 1.18 : 1.0;
        const slopePenalty = 1 + slope * (mode === 'vehicle' ? 2.6 : 1.45);
        const stepCost = dirs[d][2] * surfaceFactor * slopePenalty;

        const tentativeG = gScore[cur] + stepCost;
        if (tentativeG < gScore[nIdx]) {
          cameFrom[nIdx] = cur;
          gScore[nIdx] = tentativeG;
          fScore[nIdx] = tentativeG + Math.hypot(tx - nx, tz - nz) * 1.02;
          if (!inOpen[nIdx]) {
            inOpen[nIdx] = 1;
            pushHeap(nIdx);
          }
        }
      }
    }

    const rawPoints: Array<[number, number]> = [[navStartX, navStartZ]];
    if (foundGoal) {
      if (startIdx === goalIdx) {
        rawPoints.push([gridToWorld(sx), gridToWorld(sz)]);
      } else {
        const rev: Array<[number, number]> = [];
        let c = goalIdx;
        while (c !== -1) {
          const gx = c % GRID_N;
          const gz = (c - gx) / GRID_N;
          rev.push([gridToWorld(gx), gridToWorld(gz)]);
          if (c === startIdx) break;
          c = cameFrom[c];
        }
        for (let i = rev.length - 1; i >= 0; i--) {
          rawPoints.push(rev[i]);
        }
      }
    }
    rawPoints.push([navDestX, navDestZ]);

    // Greedy line-of-sight & slope-safe smoothing to eliminate grid staircasing
    const smoothedExterior: Array<[number, number]> = [rawPoints[0]];
    let anchorIdx = 0;
    while (anchorIdx < rawPoints.length - 1) {
      let farthest = anchorIdx + 1;
      for (let probe = rawPoints.length - 1; probe > anchorIdx + 1; probe--) {
        if (
          hasGridLineOfSight(
            grid,
            rawPoints[anchorIdx][0],
            rawPoints[anchorIdx][1],
            rawPoints[probe][0],
            rawPoints[probe][1],
            mode,
          )
        ) {
          farthest = probe;
          break;
        }
      }
      smoothedExterior.push(rawPoints[farthest]);
      anchorIdx = farthest;
    }

    const combined = [...prefixPts.slice(0, -1), ...smoothedExterior, ...suffixPts];
    waypoints = [];
    for (let i = 0; i < combined.length; i++) {
      const prev = waypoints[waypoints.length - 1];
      if (!prev || Math.hypot(combined[i][0] - prev[0], combined[i][1] - prev[1]) > 0.25) {
        waypoints.push(combined[i]);
      }
    }
    if (waypoints.length < 2) {
      waypoints = [
        [startX, startZ],
        [destX, destZ],
      ];
    }
  }

  // Compute true 3D surface path distance
  const pts3d = sampleTerrainRoutePoints3D(waypoints, 3.0, 0);
  let totalDistanceM = 0;
  for (let i = 1; i < pts3d.length; i++) {
    totalDistanceM += Math.hypot(
      pts3d[i][0] - pts3d[i - 1][0],
      pts3d[i][1] - pts3d[i - 1][1],
      pts3d[i][2] - pts3d[i - 1][2],
    );
  }
  totalDistanceM = Math.round(totalDistanceM);

  const whPerM = Math.max(85, meta.avgWhPerM ?? MEV_BASELINE_WH_PER_M);
  const estimatedEnergyPct =
    mode === 'vehicle'
      ? Math.min(100, Math.round(((totalDistanceM * (whPerM / 1000)) / MEV_BATTERY_CAPACITY_KWH) * 1000) / 10)
      : 0;

  return {
    destinationId: meta.destinationId,
    destinationName: meta.destinationName,
    destinationCategory: meta.destinationCategory,
    targetX: destX,
    targetZ: destZ,
    waypoints,
    totalDistanceM,
    estimatedEnergyPct,
    mode,
  };
}

export function distanceToRoute(
  px: number,
  pz: number,
  route: NavigationRoute,
): { distanceM: number; remainingDistM: number } {
  const wps = route.waypoints;
  if (wps.length === 0) {
    const d = Math.hypot(route.targetX - px, route.targetZ - pz);
    return { distanceM: d, remainingDistM: Math.round(d) };
  }
  if (wps.length === 1) {
    const d = Math.hypot(wps[0][0] - px, wps[0][1] - pz);
    return { distanceM: d, remainingDistM: Math.round(d) };
  }

  // Precompute cumulative tail distances from each waypoint to end
  const tailDist = new Array<number>(wps.length).fill(0);
  for (let i = wps.length - 2; i >= 0; i--) {
    tailDist[i] =
      tailDist[i + 1] + Math.hypot(wps[i + 1][0] - wps[i][0], wps[i + 1][1] - wps[i][1]);
  }

  let minDist = Infinity;
  let bestRemaining = tailDist[0];

  for (let i = 0; i < wps.length - 1; i++) {
    const [ax, az] = wps[i];
    const [bx, bz] = wps[i + 1];
    const dx = bx - ax;
    const dz = bz - az;
    const lenSq = dx * dx + dz * dz;
    let t = 0;
    if (lenSq > 1e-6) {
      t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / lenSq));
    }
    const projX = ax + dx * t;
    const projZ = az + dz * t;
    const d = Math.hypot(px - projX, pz - projZ);
    if (d < minDist) {
      minDist = d;
      bestRemaining = Math.hypot(bx - projX, bz - projZ) + tailDist[i + 1];
    }
  }

  return {
    distanceM: minDist,
    remainingDistM: Math.max(0, Math.round(bestRemaining)),
  };
}
