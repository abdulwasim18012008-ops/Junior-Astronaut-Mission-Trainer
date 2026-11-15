import { getRockCollidersInCell } from './marsTerrain';
import { EXPANSION_PODS } from './roversData';
import { BuildingId } from './types';

export type DoorFacing = 'north' | 'south' | 'east' | 'west';

export interface WallAABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface BuildingZoneSpec {
  id: BuildingId;
  x: number;
  z: number;
  hx: number; // half-width along X
  hz: number; // half-depth along Z
  doorFacing: DoorFacing;
  doorX: number;
  doorZ: number;
  doorWidth: number;
  wallThick: number;
  interiorFloorY: number;
  props: WallAABB[]; // Interior & immediate exterior solid props
}

const T = 0.28; // wall thickness

function makeWalledRoomColliders(b: BuildingZoneSpec): WallAABB[] {
  const { x, z, hx, hz, doorFacing, doorX, doorZ, doorWidth, wallThick } = b;
  const hw = doorWidth * 0.5;
  const walls: WallAABB[] = [];

  // North wall (z = z - hz)
  if (doorFacing === 'north') {
    if (doorX - hw > x - hx) {
      walls.push({ minX: x - hx, maxX: doorX - hw, minZ: z - hz - wallThick * 0.5, maxZ: z - hz + wallThick * 0.5 });
    }
    if (doorX + hw < x + hx) {
      walls.push({ minX: doorX + hw, maxX: x + hx, minZ: z - hz - wallThick * 0.5, maxZ: z - hz + wallThick * 0.5 });
    }
  } else {
    walls.push({ minX: x - hx, maxX: x + hx, minZ: z - hz - wallThick * 0.5, maxZ: z - hz + wallThick * 0.5 });
  }

  // South wall (z = z + hz)
  if (doorFacing === 'south') {
    if (doorX - hw > x - hx) {
      walls.push({ minX: x - hx, maxX: doorX - hw, minZ: z + hz - wallThick * 0.5, maxZ: z + hz + wallThick * 0.5 });
    }
    if (doorX + hw < x + hx) {
      walls.push({ minX: doorX + hw, maxX: x + hx, minZ: z + hz - wallThick * 0.5, maxZ: z + hz + wallThick * 0.5 });
    }
  } else {
    walls.push({ minX: x - hx, maxX: x + hx, minZ: z + hz - wallThick * 0.5, maxZ: z + hz + wallThick * 0.5 });
  }

  // West wall (x = x - hx)
  if (doorFacing === 'west') {
    if (doorZ - hw > z - hz) {
      walls.push({ minX: x - hx - wallThick * 0.5, maxX: x - hx + wallThick * 0.5, minZ: z - hz, maxZ: doorZ - hw });
    }
    if (doorZ + hw < z + hz) {
      walls.push({ minX: x - hx - wallThick * 0.5, maxX: x - hx + wallThick * 0.5, minZ: doorZ + hw, maxZ: z + hz });
    }
  } else {
    walls.push({ minX: x - hx - wallThick * 0.5, maxX: x - hx + wallThick * 0.5, minZ: z - hz, maxZ: z + hz });
  }

  // East wall (x = x + hx)
  if (doorFacing === 'east') {
    if (doorZ - hw > z - hz) {
      walls.push({ minX: x + hx - wallThick * 0.5, maxX: x + hx + wallThick * 0.5, minZ: z - hz, maxZ: doorZ - hw });
    }
    if (doorZ + hw < z + hz) {
      walls.push({ minX: x + hx - wallThick * 0.5, maxX: x + hx + wallThick * 0.5, minZ: doorZ + hw, maxZ: z + hz });
    }
  } else {
    walls.push({ minX: x + hx - wallThick * 0.5, maxX: x + hx + wallThick * 0.5, minZ: z - hz, maxZ: z + hz });
  }

  return walls;
}

export const BUILDING_ZONES: Record<BuildingId, BuildingZoneSpec> = {
  crew_home: {
    id: 'crew_home',
    x: 0,
    z: 0,
    hx: 4.3,
    hz: 4.3,
    doorFacing: 'south',
    doorX: 0,
    doorZ: 4.3,
    doorWidth: 2.0,
    wallThick: T,
    interiorFloorY: 0.08,
    props: [
      // Central briefing table
      { minX: -0.95, maxX: 0.95, minZ: -0.75, maxZ: 0.75 },
      // 4 bunk beds tucked near corners
      { minX: -3.55, maxX: -2.05, minZ: -3.45, maxZ: -2.25 },
      { minX: 2.05, maxX: 3.55, minZ: -3.45, maxZ: -2.25 },
      { minX: -3.55, maxX: -2.05, minZ: 2.05, maxZ: 3.25 },
      { minX: 2.05, maxX: 3.55, minZ: 2.05, maxZ: 3.25 },
    ],
  },
  oxygen_centre: {
    id: 'oxygen_centre',
    x: -11.5,
    z: 4.5,
    hx: 2.4,
    hz: 2.1,
    doorFacing: 'east',
    doorX: -9.1,
    doorZ: 4.5,
    doorWidth: 1.85,
    wallThick: T,
    interiorFloorY: 0.08,
    props: [
      // Back O2 Scrubber Machinery along west wall
      { minX: -13.75, maxX: -12.45, minZ: 3.2, maxZ: 5.8 },
    ],
  },
  water_station: {
    id: 'water_station',
    x: -11.0,
    z: -7.5,
    hx: 2.7,
    hz: 2.4,
    doorFacing: 'east',
    doorX: -8.3,
    doorZ: -7.5,
    doorWidth: 1.85,
    wallThick: T,
    interiorFloorY: 0.08,
    props: [
      // Dual blue filtration silos on west interior side
      { minX: -13.5, maxX: -12.1, minZ: -9.4, maxZ: -5.6 },
    ],
  },
  power_station: {
    id: 'power_station',
    x: -15.5,
    z: 11.5,
    hx: 1.9,
    hz: 1.7,
    doorFacing: 'east',
    doorX: -13.6,
    doorZ: 11.5,
    doorWidth: 1.75,
    wallThick: T,
    interiorFloorY: 0.08,
    props: [
      // Battery bank console inside west wall
      { minX: -17.25, maxX: -16.15, minZ: 10.6, maxZ: 12.4 },
      // Exterior solar wing pedestals
      { minX: -20.6, maxX: -17.6, minZ: 8.6, maxZ: 10.4 },
      { minX: -20.6, maxX: -17.6, minZ: 12.6, maxZ: 14.4 },
      { minX: -16.8, maxX: -13.8, minZ: 14.2, maxZ: 16.0 },
    ],
  },
  greenhouse: {
    id: 'greenhouse',
    x: 11.0,
    z: -1.5,
    hx: 3.2,
    hz: 2.4,
    doorFacing: 'west',
    doorX: 7.8,
    doorZ: -1.5,
    doorWidth: 1.95,
    wallThick: T,
    interiorFloorY: 0.08,
    props: [
      // Two raised planter trays with clean center aisle
      { minX: 10.1, maxX: 12.4, minZ: -3.45, maxZ: -2.15 },
      { minX: 10.1, maxX: 12.4, minZ: -0.85, maxZ: 0.45 },
    ],
  },
  comms_tower: {
    id: 'comms_tower',
    x: 10.0,
    z: -11.5,
    hx: 2.0,
    hz: 1.8,
    doorFacing: 'west',
    doorX: 8.0,
    doorZ: -11.5,
    doorWidth: 1.75,
    wallThick: T,
    interiorFloorY: 0.08,
    props: [
      // Comms rack on east wall
      { minX: 10.85, maxX: 11.8, minZ: -12.6, maxZ: -10.4 },
    ],
  },
  medical_room: {
    id: 'medical_room',
    x: 8.5,
    z: 8.8,
    hx: 2.2,
    hz: 2.1,
    doorFacing: 'west',
    doorX: 6.3,
    doorZ: 8.8,
    doorWidth: 1.8,
    wallThick: T,
    interiorFloorY: 0.08,
    props: [
      // Med bed along east wall
      { minX: 9.2, maxX: 10.45, minZ: 7.7, maxZ: 9.9 },
    ],
  },
  radiation_shelter: {
    id: 'radiation_shelter',
    x: -2.5,
    z: 13.5,
    hx: 2.7,
    hz: 2.3,
    doorFacing: 'north',
    doorX: -2.5,
    doorZ: 11.2,
    doorWidth: 1.9,
    wallThick: T,
    interiorFloorY: 0.08,
    props: [
      // Shielding console at south-east wall
      { minX: -1.1, maxX: -0.05, minZ: 14.3, maxZ: 15.4 },
    ],
  },
  command_centre: {
    id: 'command_centre',
    x: 0,
    z: -11.5,
    hx: 2.5,
    hz: 2.2,
    doorFacing: 'south',
    doorX: 0,
    doorZ: -9.3,
    doorWidth: 1.9,
    wallThick: T,
    interiorFloorY: 0.08,
    props: [
      // Tactical holo console at north end
      { minX: -1.15, maxX: 1.15, minZ: -13.35, maxZ: -12.3 },
    ],
  },
};

export const ALL_WALL_COLLIDERS: WallAABB[] = (() => {
  const list: WallAABB[] = [];
  (Object.keys(BUILDING_ZONES) as BuildingId[]).forEach((id) => {
    const b = BUILDING_ZONES[id];
    list.push(...makeWalledRoomColliders(b));
    list.push(...b.props);
  });
  // Static exterior props (parked Colony Utility Rover, Cafeteria Annex, Fuel & Energy Storage Tanks, Vehicle Charging Station)
  list.push({ minX: 12.1, maxX: 14.1, minZ: 3.1, maxZ: 4.9 }); // Colony Utility Rover
  list.push({ minX: 4.9, maxX: 7.5, minZ: 1.7, maxZ: 3.9 }); // Cafeteria & Recreation Annex
  list.push({ minX: -24.2, maxX: -21.4, minZ: 9.9, maxZ: 13.1 }); // Fuel & Energy Cryo Storage Tanks
  // Vehicle Charging Station (Bay A centered [21.6, 1.6], Bay B centered [21.6, 5.2], West open drive-in)
  list.push({ minX: 24.9, maxX: 25.9, minZ: -0.4, maxZ: 7.3 }); // Rear structural wall & battery cabinet
  list.push({ minX: 19.1, maxX: 19.7, minZ: -0.5, maxZ: 0.0 }); // North gantry pillar
  list.push({ minX: 19.1, maxX: 19.7, minZ: 6.8, maxZ: 7.4 }); // South gantry pillar
  list.push({ minX: 23.9, maxX: 24.5, minZ: 3.1, maxZ: 3.7 }); // Charging console pedestal
  return list;
})();

export function detectInsideBuilding(x: number, z: number): BuildingId | null {
  const ids = Object.keys(BUILDING_ZONES) as BuildingId[];
  for (let i = 0; i < ids.length; i++) {
    const b = BUILDING_ZONES[ids[i]];
    if (
      x >= b.x - b.hx + 0.18 &&
      x <= b.x + b.hx - 0.18 &&
      z >= b.z - b.hz + 0.18 &&
      z <= b.z + b.hz - 0.18
    ) {
      return b.id;
    }
  }
  return null;
}

function resolveRockCellCollisions(
  rx: number,
  rz: number,
  radius: number,
): { x: number; z: number; maxPen: number } {
  let x = rx;
  let z = rz;
  let maxPen = 0;
  for (let ox = -16; ox <= 16; ox += 16) {
    for (let oz = -16; oz <= 16; oz += 16) {
      const rocks = getRockCollidersInCell(x + ox, z + oz);
      if (!rocks) continue;
      for (let i = 0; i < rocks.length; i++) {
        const r = rocks[i];
        if (r.kind === 'slab') continue;
        if (r.kind === 'boulder' && r.radius <= 0.72) continue;
        const dx = x - r.x;
        const dz = z - r.z;
        const minD = r.radius + radius;
        const distSq = dx * dx + dz * dz;
        if (distSq < minD * minD && distSq > 0.00001) {
          const d = Math.sqrt(distSq);
          const pen = minD - d;
          if (pen > maxPen) maxPen = pen;
          x = r.x + (dx / d) * minD;
          z = r.z + (dz / d) * minD;
        }
      }
    }
  }
  return { x, z, maxPen };
}

export function resolveCharacterCollisions(
  x: number,
  z: number,
  radius = 0.42,
): { x: number; z: number } {
  let rx = x;
  let rz = z;

  // Keep within 520m x 520m open Mars exploration region (r <= 212m)
  const distOrigin = Math.hypot(rx, rz);
  if (distOrigin > 212) {
    rx = (rx / distOrigin) * 212;
    rz = (rz / distOrigin) * 212;
  }

  // Two-pass circle vs AABB + Expansion Pod + Solid Rock resolution prevents corner wedging
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < ALL_WALL_COLLIDERS.length; i++) {
      const box = ALL_WALL_COLLIDERS[i];
      const closestX = Math.max(box.minX, Math.min(rx, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(rz, box.maxZ));
      const dx = rx - closestX;
      const dz = rz - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        if (distSq > 0.00001) {
          const dist = Math.sqrt(distSq);
          const push = radius - dist;
          rx += (dx / dist) * push;
          rz += (dz / dist) * push;
        } else {
          const left = Math.abs(rx - box.minX);
          const right = Math.abs(box.maxX - rx);
          const top = Math.abs(rz - box.minZ);
          const bottom = Math.abs(box.maxZ - rz);
          const m = Math.min(left, right, top, bottom);
          if (m === left) rx = box.minX - radius;
          else if (m === right) rx = box.maxX + radius;
          else if (m === top) rz = box.minZ - radius;
          else rz = box.maxZ + radius;
        }
      }
    }

    for (let i = 0; i < EXPANSION_PODS.length; i++) {
      const pod = EXPANSION_PODS[i];
      const dx = rx - pod.x;
      const dz = rz - pod.z;
      const d = Math.hypot(dx, dz);
      const minD = pod.radius + radius;
      if (d < minD && d > 0.0001) {
        rx = pod.x + (dx / d) * minD;
        rz = pod.z + (dz / d) * minD;
      }
    }

    const rockRes = resolveRockCellCollisions(rx, rz, radius);
    rx = rockRes.x;
    rz = rockRes.z;
  }

  return { x: rx, z: rz };
}

export function resolveVehicleCollisions(
  x: number,
  z: number,
  radius = 1.45,
): { x: number; z: number; hitForce: number } {
  let rx = x;
  let rz = z;
  let maxPen = 0;

  const distOrigin = Math.hypot(rx, rz);
  if (distOrigin > 210) {
    maxPen = Math.max(maxPen, distOrigin - 210);
    rx = (rx / distOrigin) * 210;
    rz = (rz / distOrigin) * 210;
  }

  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < ALL_WALL_COLLIDERS.length; i++) {
      const box = ALL_WALL_COLLIDERS[i];
      const closestX = Math.max(box.minX, Math.min(rx, box.maxX));
      const closestZ = Math.max(box.minZ, Math.min(rz, box.maxZ));
      const dx = rx - closestX;
      const dz = rz - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < radius * radius) {
        if (distSq > 0.00001) {
          const dist = Math.sqrt(distSq);
          const push = radius - dist;
          if (push > maxPen) maxPen = push;
          rx += (dx / dist) * push;
          rz += (dz / dist) * push;
        } else {
          const left = Math.abs(rx - box.minX);
          const right = Math.abs(box.maxX - rx);
          const top = Math.abs(rz - box.minZ);
          const bottom = Math.abs(box.maxZ - rz);
          const m = Math.min(left, right, top, bottom);
          maxPen = Math.max(maxPen, radius);
          if (m === left) rx = box.minX - radius;
          else if (m === right) rx = box.maxX + radius;
          else if (m === top) rz = box.minZ - radius;
          else rz = box.maxZ + radius;
        }
      }
    }

    for (let i = 0; i < EXPANSION_PODS.length; i++) {
      const pod = EXPANSION_PODS[i];
      const dx = rx - pod.x;
      const dz = rz - pod.z;
      const d = Math.hypot(dx, dz);
      const minD = pod.radius + radius;
      if (d < minD && d > 0.0001) {
        const pen = minD - d;
        if (pen > maxPen) maxPen = pen;
        rx = pod.x + (dx / d) * minD;
        rz = pod.z + (dz / d) * minD;
      }
    }

    const rockRes = resolveRockCellCollisions(rx, rz, radius);
    rx = rockRes.x;
    rz = rockRes.z;
    if (rockRes.maxPen > maxPen) maxPen = rockRes.maxPen;
  }

  return {
    x: rx,
    z: rz,
    hitForce: Math.min(1, maxPen / 0.35),
  };
}
