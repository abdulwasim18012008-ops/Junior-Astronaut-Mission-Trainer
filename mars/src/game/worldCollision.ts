import { groundHeightAt } from './marsTerrain';
import { BuildingId } from './types';

export interface BoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface CircleCollider {
  x: number;
  z: number;
  r: number;
}

export interface HollowCylinderCollider {
  id: BuildingId;
  x: number;
  z: number;
  innerR: number;
  outerR: number;
  doorAngle: number; // radians from +Z axis via atan2(dx, dz)
  doorHalfAngle: number;
}

export interface InteriorZone {
  id: BuildingId;
  name: string;
  floorYOffset: number;
  bounds:
    | { kind: 'circle'; x: number; z: number; r: number }
    | { kind: 'box'; minX: number; maxX: number; minZ: number; maxZ: number };
  doorPos: [number, number];
}

// Doorways & Interior Walkable Zones for all 8 colony buildings
export const INTERIOR_ZONES: InteriorZone[] = [
  {
    id: 'crew_home',
    name: 'Crew Habitat & Mission Control',
    floorYOffset: 0.34,
    bounds: { kind: 'circle', x: 0, z: 0, r: 4.35 },
    doorPos: [0, 4.55],
  },
  {
    id: 'oxygen_centre',
    name: 'Oxygen Centre',
    floorYOffset: 0.28,
    bounds: { kind: 'box', minX: -14.1, maxX: -8.9, minZ: 2.3, maxZ: 6.7 },
    doorPos: [-8.75, 4.5],
  },
  {
    id: 'water_station',
    name: 'Water Station',
    floorYOffset: 0.28,
    bounds: { kind: 'box', minX: -13.6, maxX: -8.4, minZ: -9.8, maxZ: -5.2 },
    doorPos: [-8.25, -7.5],
  },
  {
    id: 'power_station',
    name: 'Power Control Room',
    floorYOffset: 0.26,
    bounds: { kind: 'box', minX: -17.3, maxX: -13.7, minZ: 9.7, maxZ: 13.3 },
    doorPos: [-13.55, 11.5],
  },
  {
    id: 'greenhouse',
    name: 'Greenhouse',
    floorYOffset: 0.28,
    bounds: { kind: 'box', minX: 7.7, maxX: 14.3, minZ: -3.7, maxZ: 0.7 },
    doorPos: [7.55, -1.5],
  },
  {
    id: 'comms_tower',
    name: 'Communication Hub',
    floorYOffset: 0.26,
    bounds: { kind: 'box', minX: 8.1, maxX: 11.9, minZ: -13.4, maxZ: -9.6 },
    doorPos: [8.0, -11.5],
  },
  {
    id: 'medical_room',
    name: 'Medical Room',
    floorYOffset: 0.28,
    bounds: { kind: 'circle', x: 8.5, z: 8.8, r: 2.45 },
    doorPos: [6.75, 10.55],
  },
  {
    id: 'radiation_shelter',
    name: 'Radiation Shelter',
    floorYOffset: 0.30,
    bounds: { kind: 'box', minX: -3.1, maxX: 3.1, minZ: -15.0, maxZ: -9.0 },
    doorPos: [0, -8.85],
  },
];

// Hollow dome/octagonal buildings with real openable doorways
const HOLLOW_DOMES: HollowCylinderCollider[] = [
  // Crew Habitat at (0, 0), door facing South (+Z, angle 0)
  { id: 'crew_home', x: 0, z: 0, innerR: 4.1, outerR: 4.9, doorAngle: 0, doorHalfAngle: 0.36 },
  // Medical Room at (8.5, 8.8), door facing South-West (-PI/4 from +Z -> atan2(-1.75, 1.75) = -0.785)
  {
    id: 'medical_room',
    x: 8.5,
    z: 8.8,
    innerR: 2.15,
    outerR: 2.85,
    doorAngle: -Math.PI / 4,
    doorHalfAngle: 0.48,
  },
];

// Wall segments (leaving doorways cleanly open!) and solid equipment inside buildings
const WALL_BOXES: BoxCollider[] = [
  // --- OXYGEN CENTRE (-11.5, 4.5), outer X:[-14.3,-8.7], Z:[2.1,6.9], door on East wall (X=-8.7, Z=3.6..5.4) ---
  { minX: -14.35, maxX: -13.95, minZ: 2.05, maxZ: 6.95 }, // West wall
  { minX: -14.35, maxX: -8.65, minZ: 2.05, maxZ: 2.45 }, // North wall
  { minX: -14.35, maxX: -8.65, minZ: 6.55, maxZ: 6.95 }, // South wall
  { minX: -9.05, maxX: -8.65, minZ: 2.05, maxZ: 3.55 }, // East wall north of door
  { minX: -9.05, maxX: -8.65, minZ: 5.45, maxZ: 6.95 }, // East wall south of door
  // Interior O2 generator core (left-center, walkable around!)
  { minX: -13.6, maxX: -12.1, minZ: 3.4, maxZ: 5.6 },

  // --- WATER STATION (-11.0, -7.5), outer X:[-13.8,-8.2], Z:[-10.0,-5.0], door on East wall (X=-8.2, Z=-8.4..-6.6) ---
  { minX: -13.85, maxX: -13.45, minZ: -10.05, maxZ: -4.95 }, // West wall
  { minX: -13.85, maxX: -8.15, minZ: -10.05, maxZ: -9.65 }, // North wall
  { minX: -13.85, maxX: -8.15, minZ: -5.35, maxZ: -4.95 }, // South wall
  { minX: -8.55, maxX: -8.15, minZ: -10.05, maxZ: -8.45 }, // East wall north of door
  { minX: -8.55, maxX: -8.15, minZ: -6.55, maxZ: -4.95 }, // East wall south of door
  // Interior water tanks (west side)
  { minX: -13.2, maxX: -11.4, minZ: -9.2, maxZ: -5.8 },

  // --- POWER CONTROL ROOM (-15.5, 11.5), outer X:[-17.5,-13.5], Z:[9.5,13.5], door on East wall (Z=10.6..12.4) ---
  { minX: -17.55, maxX: -17.15, minZ: 9.45, maxZ: 13.55 }, // West wall
  { minX: -17.55, maxX: -13.45, minZ: 9.45, maxZ: 9.85 }, // North wall
  { minX: -17.55, maxX: -13.45, minZ: 13.15, maxZ: 13.55 }, // South wall
  { minX: -13.85, maxX: -13.45, minZ: 9.45, maxZ: 10.55 }, // East north
  { minX: -13.85, maxX: -13.45, minZ: 12.45, maxZ: 13.55 }, // East south
  // Interior battery unit
  { minX: -16.9, maxX: -15.4, minZ: 10.6, maxZ: 12.4 },

  // --- GREENHOUSE (11.0, -1.5), outer X:[7.5,14.5], Z:[-3.9,0.9], door on West wall (X=7.5, Z=-2.4..-0.6) ---
  { minX: 14.15, maxX: 14.55, minZ: -3.95, maxZ: 0.95 }, // East wall
  { minX: 7.45, maxX: 14.55, minZ: -3.95, maxZ: -3.55 }, // North wall
  { minX: 7.45, maxX: 14.55, minZ: 0.55, maxZ: 0.95 }, // South wall
  { minX: 7.45, maxX: 7.85, minZ: -3.95, maxZ: -2.45 }, // West north
  { minX: 7.45, maxX: 7.85, minZ: -0.55, maxZ: 0.95 }, // West south
  // Interior plant tray islands (center aisle stays wide open!)
  { minX: 9.8, maxX: 12.6, minZ: -3.2, maxZ: -2.15 },
  { minX: 9.8, maxX: 12.6, minZ: -0.85, maxZ: 0.2 },

  // --- COMMUNICATION HUB (10.0, -11.5), outer X:[7.9,12.1], Z:[-13.6,-9.4], door on West wall (Z=-12.4..-10.6) ---
  { minX: 11.75, maxX: 12.15, minZ: -13.65, maxZ: -9.35 }, // East wall
  { minX: 7.85, maxX: 12.15, minZ: -13.65, maxZ: -13.25 }, // North wall
  { minX: 7.85, maxX: 12.15, minZ: -9.75, maxZ: -9.35 }, // South wall
  { minX: 7.85, maxX: 8.25, minZ: -13.65, maxZ: -12.45 }, // West north
  { minX: 7.85, maxX: 8.25, minZ: -10.55, maxZ: -9.35 }, // West south
  // Interior comms console
  { minX: 10.6, maxX: 11.6, minZ: -12.3, maxZ: -10.7 },

  // --- RADIATION SHELTER (0, -12.0), outer X:[-3.4,3.4], Z:[-15.3,-8.7], door on South wall (X=-1.0..1.0) ---
  { minX: -3.45, maxX: -2.9, minZ: -15.35, maxZ: -8.65 }, // Thick West regolith wall
  { minX: 2.9, maxX: 3.45, minZ: -15.35, maxZ: -8.65 }, // Thick East regolith wall
  { minX: -3.45, maxX: 3.45, minZ: -15.35, maxZ: -14.8 }, // Thick North regolith wall
  { minX: -3.45, maxX: -1.05, minZ: -9.15, maxZ: -8.65 }, // South wall left of airlock
  { minX: 1.05, maxX: 3.45, minZ: -9.15, maxZ: -8.65 }, // South wall right of airlock
  // Interior shielding monitor & central bench
  { minX: -1.3, maxX: 1.3, minZ: -14.4, maxZ: -13.4 },

  // --- INTERIOR FURNITURE INSIDE CREW HABITAT (0,0) ---
  { minX: -0.95, maxX: 0.95, minZ: -2.9, maxZ: -1.9 }, // Mission Control Console (North side inside dome)
];

// Exterior solid props (solar wings, crates, rover, bunks)
const CIRCLE_PROPS: CircleCollider[] = [
  // Solar wing masts outside Power Control Room
  { x: -11.8, z: 9.8, r: 0.75 },
  { x: -11.8, z: 13.4, r: 0.75 },
  { x: -19.2, z: 9.8, r: 0.75 },
  { x: -19.2, z: 13.4, r: 0.75 },
  // Medical bed inside Medical Room (south-east corner)
  { x: 9.3, z: 8.2, r: 0.85 },
  // Bunks inside Crew Habitat
  { x: -2.7, z: 1.2, r: 0.75 },
  { x: 2.7, z: 1.2, r: 0.75 },
  { x: -2.5, z: -2.0, r: 0.75 },
  { x: 2.5, z: -2.0, r: 0.75 },
  // Crates & Mars rocks near base perimeter
  { x: -14.2, z: 7.6, r: 0.75 },
  { x: -5.6, z: -9.2, r: 0.7 },
  // Landing Pad Lander footprint clearance when parked
  { x: 15.5, z: 13.5, r: 2.1 },
];

function resolveBox(
  x: number,
  z: number,
  radius: number,
  b: BoxCollider,
): [number, number] {
  const closestX = Math.max(b.minX, Math.min(x, b.maxX));
  const closestZ = Math.max(b.minZ, Math.min(z, b.maxZ));
  const dx = x - closestX;
  const dz = z - closestZ;
  const distSq = dx * dx + dz * dz;

  if (distSq >= radius * radius) return [x, z];

  if (distSq > 0.00001) {
    const dist = Math.sqrt(distSq);
    const push = radius - dist;
    return [x + (dx / dist) * push, z + (dz / dist) * push];
  }

  // Center is inside box: push out toward nearest edge
  const leftPen = Math.abs(x - b.minX);
  const rightPen = Math.abs(b.maxX - x);
  const topPen = Math.abs(z - b.minZ);
  const botPen = Math.abs(b.maxZ - z);
  const minPen = Math.min(leftPen, rightPen, topPen, botPen);
  if (minPen === leftPen) return [b.minX - radius, z];
  if (minPen === rightPen) return [b.maxX + radius, z];
  if (minPen === topPen) return [x, b.minZ - radius];
  return [x, b.maxZ + radius];
}

function normalizeAngle(a: number): number {
  let out = a;
  while (out > Math.PI) out -= Math.PI * 2;
  while (out < -Math.PI) out += Math.PI * 2;
  return out;
}

export function resolveCharacterCollision(
  prevX: number,
  prevZ: number,
  nextX: number,
  nextZ: number,
  radius = 0.42,
): [number, number] {
  let x = nextX;
  let z = nextZ;

  // World canyon perimeter boundary (r <= 27m)
  const distOrigin = Math.hypot(x, z);
  if (distOrigin > 27) {
    x = (x / distOrigin) * 27;
    z = (z / distOrigin) * 27;
  }

  // Resolve hollow circular/octagonal walls with doorway openings
  for (let i = 0; i < HOLLOW_DOMES.length; i++) {
    const dSpec = HOLLOW_DOMES[i];
    const dx = x - dSpec.x;
    const dz = z - dSpec.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.001) continue;

    const ang = Math.atan2(dx, dz);
    const angDiff = Math.abs(normalizeAngle(ang - dSpec.doorAngle));
    const inDoorway = angDiff <= dSpec.doorHalfAngle;

    if (!inDoorway && dist > dSpec.innerR - radius && dist < dSpec.outerR + radius) {
      const prevDist = Math.hypot(prevX - dSpec.x, prevZ - dSpec.z);
      const midR = (dSpec.innerR + dSpec.outerR) * 0.5;
      const pushOut = prevDist >= midR;
      const targetR = pushOut ? dSpec.outerR + radius : dSpec.innerR - radius;
      x = dSpec.x + (dx / dist) * targetR;
      z = dSpec.z + (dz / dist) * targetR;
    }
  }

  // Two passes over wall boxes & props prevent corner snagging
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < WALL_BOXES.length; i++) {
      [x, z] = resolveBox(x, z, radius, WALL_BOXES[i]);
    }
    for (let i = 0; i < CIRCLE_PROPS.length; i++) {
      const c = CIRCLE_PROPS[i];
      const dx = x - c.x;
      const dz = z - c.z;
      const d = Math.hypot(dx, dz);
      const minD = c.r + radius;
      if (d < minD && d > 0.001) {
        x = c.x + (dx / d) * minD;
        z = c.z + (dz / d) * minD;
      }
    }
  }

  return [x, z];
}

export function detectCurrentInterior(x: number, z: number): InteriorZone | null {
  for (let i = 0; i < INTERIOR_ZONES.length; i++) {
    const zone = INTERIOR_ZONES[i];
    if (zone.bounds.kind === 'circle') {
      if (Math.hypot(x - zone.bounds.x, z - zone.bounds.z) <= zone.bounds.r) {
        return zone;
      }
    } else {
      if (
        x >= zone.bounds.minX &&
        x <= zone.bounds.maxX &&
        z >= zone.bounds.minZ &&
        z <= zone.bounds.maxZ
      ) {
        return zone;
      }
    }
  }
  return null;
}

export function walkableFloorHeightAt(x: number, z: number): number {
  const baseY = groundHeightAt(x, z);
  const interior = detectCurrentInterior(x, z);
  if (!interior) return baseY;
  const centerX = interior.bounds.kind === 'circle' ? interior.bounds.x : (interior.bounds.minX + interior.bounds.maxX) * 0.5;
  const centerZ = interior.bounds.kind === 'circle' ? interior.bounds.z : (interior.bounds.minZ + interior.bounds.maxZ) * 0.5;
  return groundHeightAt(centerX, centerZ) + interior.floorYOffset;
}
