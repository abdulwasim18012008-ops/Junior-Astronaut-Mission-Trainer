import * as THREE from 'three';
import {
  SolVisualSample,
  STORM_STAGE_SPECS,
  WEATHER_SPECS,
  weatherToStormStage,
} from './marsConfig';
import { ProceduralTextureSet } from './proceduralTextures';
import { LOST_ROVERS, MARS_ANOMALIES, MARS_LANDMARKS } from './roversData';
import { StormStage, SurfaceType, WeatherType } from './types';

export interface CraterSpec {
  x: number;
  z: number;
  radius: number;
  depth: number;
}

export interface RockCollider {
  x: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  radius: number;
  height: number;
  kind: 'boulder' | 'slab' | 'mesa';
  colorIdx: number;
}

export const CRATERS: CraterSpec[] = [
  { x: -46, z: -32, radius: 12, depth: 2.1 },
  { x: 42, z: -34, radius: 13, depth: 2.3 },
  { x: -48, z: 32, radius: 12, depth: 2.0 },
  { x: 88, z: 76, radius: 22, depth: 4.1 }, // Southeast Meteorite Impact Crater
  { x: 8, z: -64, radius: 14, depth: 2.5 },
  { x: -118, z: 12, radius: 19, depth: 3.4 },
  { x: 132, z: -18, radius: 21, depth: 3.6 },
  { x: -45, z: -128, radius: 17, depth: 3.1 },
  { x: 126, z: -98, radius: 18, depth: 3.2 },
  { x: -124, z: 112, radius: 20, depth: 3.5 },
];

export function groundHeightAt(x: number, z: number): number {
  const dist = Math.hypot(x, z);
  const cargoPadDist = Math.hypot(x + 28, z + 23);
  const remoteSiteDist = Math.hypot(x - 118, z - 49.5);
  const remoteWeatherDist = Math.hypot(x + 124, z - 34);
  const lostBeaconDist = Math.hypot(x - 64, z + 98);

  // Smooth central colony basin inside r <= 34m, Cargo Pad (-28, -23), and remote relay pad (118, 49.5)
  const colonyBlend = THREE.MathUtils.smoothstep(dist, 28, 46);
  const cargoPadBlend = THREE.MathUtils.smoothstep(cargoPadDist, 7.5, 13.5);
  const remotePadBlend = THREE.MathUtils.smoothstep(remoteSiteDist, 10.5, 20.0);
  const weatherPadBlend = THREE.MathUtils.smoothstep(remoteWeatherDist, 7.0, 14.0);
  const beaconPadBlend = THREE.MathUtils.smoothstep(lostBeaconDist, 6.5, 13.0);
  const basinBlend = Math.min(colonyBlend, cargoPadBlend, remotePadBlend, weatherPadBlend, beaconPadBlend);

  // Multi-octave Martian terrain (avoid uniform repetition)
  let h =
    (Math.sin(x * 0.042 + z * 0.029) * 1.45 +
      Math.cos(z * 0.056 - x * 0.021) * 1.05 +
      Math.sin(x * 0.014 - z * 0.017) * 2.1 +
      Math.cos((x + z) * 0.095) * 0.35) *
    basinBlend;

  // Ochre Barchan Dune Sea around (-82, +54): asymmetric windward/slipface sand ridges
  const duneDist = Math.hypot(x + 82, z - 54);
  if (duneDist < 48) {
    const df = 1 - duneDist / 48;
    const phase = x * 0.24 + z * 0.19 + Math.sin(z * 0.06) * 1.4;
    const sharpRidge = Math.sin(phase) + 0.32 * Math.sin(phase * 2.0);
    h += sharpRidge * 1.45 * df;
  }

  // Ancient River Channel winding around (74, -56)
  const riverCenterZ = -56 - Math.sin((x - 40) * 0.055) * 14;
  const riverDist = Math.abs(z - riverCenterZ);
  const riverMask = THREE.MathUtils.smoothstep(Math.hypot(x - 74, z + 56), 54, 14);
  if (riverDist < 11.5 && riverMask > 0) {
    const t = 1 - riverDist / 11.5;
    h -= t * t * 2.45 * riverMask;
  }

  // Subsurface Frost Trench at (12, -136)
  const iceDist = Math.hypot(x - 12, z + 136);
  if (iceDist < 22) {
    const it = 1 - iceDist / 22;
    h -= it * it * 2.2;
  }

  // Layered Sedimentary Canyon Cliffs & Terraced Shelf around (-96, -72)
  const strataDist = Math.hypot(x + 96, z + 72);
  if (strataDist < 34) {
    const st = 1 - strataDist / 34;
    const terrace = Math.floor(st * 5.2) * 0.95 + (st * 5.2 - Math.floor(st * 5.2)) * 0.22;
    h += terrace;
  }

  // Gentle climbable Mountain Research Station summit plateau around (-118, -96)
  const mountainDist = Math.hypot(x + 118, z + 96);
  if (mountainDist < 38) {
    const climb = 1 - THREE.MathUtils.smoothstep(mountainDist, 9.5, 38.0);
    h = h * (1 - climb * 0.65) + climb * 5.4;
  }

  // Distant Canyon Rim & Mesa Escarpments beyond r = 152m
  const rimBlend = THREE.MathUtils.smoothstep(dist, 152, 245);
  const mesaNoise =
    Math.abs(Math.sin(x * 0.025) * Math.cos(z * 0.024)) * 18 +
    Math.sin(Math.atan2(z, x) * 6) * 4.5 +
    Math.cos(Math.atan2(z, x) * 11) * 2.2;
  const mountains = rimBlend * (8.5 + mesaNoise);

  // Impact craters with raised rims
  let craterOffset = 0;
  for (let i = 0; i < CRATERS.length; i++) {
    const c = CRATERS[i];
    const cd = Math.hypot(x - c.x, z - c.z);
    if (cd < c.radius * 1.48) {
      const n = cd / c.radius;
      if (n < 1.0) {
        craterOffset -= c.depth * (1 - n * n);
      }
      const rim = Math.exp(-Math.pow((n - 1.0) * 4.0, 2)) * (c.depth * 0.44);
      craterOffset += rim;
    }
  }

  return h + mountains + craterOffset;
}

export function surfaceTypeAt(x: number, z: number): SurfaceType {
  if (Math.hypot(x, z) < 34) return 'colony';
  if (Math.hypot(x - 12, z + 136) < 20) return 'ice';
  if (Math.hypot(x + 82, z - 54) < 38) return 'sand';
  if (Math.hypot(x + 96, z + 72) < 30 || Math.hypot(x + 118, z + 96) < 26 || Math.hypot(x - 88, z - 76) < 26) {
    return 'rock';
  }
  return Math.sin(x * 0.045 + z * 0.038) + Math.cos(x * 0.02) * 0.4 > 0.28 ? 'sand' : 'rock';
}

const POI_CLEAR_POINTS: Array<[number, number, number]> = [
  [-28, -23, 8.5],
  [43.5, -25.5, 5.5],
  [21.6, 1.6, 8.0],
  [122, 48, 13.0],
  [114.6, 50.8, 9.0],
  [64, -98, 7.5],
  [-118, -96, 10.5],
  [-124, 34, 8.5],
  [-29.5, -14, 6.0],
  [17.5, -10.5, 7.0],
  ...LOST_ROVERS.map((r): [number, number, number] => [r.x, r.z, 6.2]),
  ...MARS_LANDMARKS.map((l): [number, number, number] => [l.x, l.z, 6.5]),
  ...MARS_ANOMALIES.map((a): [number, number, number] => [a.x, a.z, 6.2]),
];

function isPoiClear(x: number, z: number, pad = 0): boolean {
  for (let i = 0; i < POI_CLEAR_POINTS.length; i++) {
    const [px, pz, r] = POI_CLEAR_POINTS[i];
    if (Math.hypot(x - px, z - pz) < r + pad) return false;
  }
  return true;
}

export const WORLD_ROCK_COLLIDERS: RockCollider[] = [];
export const WORLD_BOULDERS: RockCollider[] = [];
export const WORLD_SLABS: RockCollider[] = [];
export const WORLD_MESAS: RockCollider[] = [];

const ROCK_CELL_SIZE = 16;
const ROCK_GRID = new Map<number, RockCollider[]>();

function rockCellKey(cx: number, cz: number): number {
  return (cx + 128) * 256 + (cz + 128);
}

function addRockToGrid(r: RockCollider) {
  WORLD_ROCK_COLLIDERS.push(r);
  const minCx = Math.floor((r.x - r.radius) / ROCK_CELL_SIZE);
  const maxCx = Math.floor((r.x + r.radius) / ROCK_CELL_SIZE);
  const minCz = Math.floor((r.z - r.radius) / ROCK_CELL_SIZE);
  const maxCz = Math.floor((r.z + r.radius) / ROCK_CELL_SIZE);
  for (let cx = minCx; cx <= maxCx; cx++) {
    for (let cz = minCz; cz <= maxCz; cz++) {
      const k = rockCellKey(cx, cz);
      let arr = ROCK_GRID.get(k);
      if (!arr) {
        arr = [];
        ROCK_GRID.set(k, arr);
      }
      arr.push(r);
    }
  }
}

(() => {
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  // 260 Angular Basalt Boulders
  for (let i = 0; i < 260; i++) {
    let rx = 0;
    let rz = 0;
    let s = 1;
    let tries = 0;
    do {
      const angle = rand() * Math.PI * 2;
      const radius = 36 + rand() * 156;
      rx = Math.cos(angle) * radius;
      rz = Math.sin(angle) * radius;
      s = (0.55 + rand() * 1.85) * (radius > 95 ? 1.45 : 1.0);
      tries++;
    } while (!isPoiClear(rx, rz, s * 0.8) && tries < 6);

    const sx = s * (0.85 + rand() * 0.35);
    const sy = s * (0.65 + rand() * 0.45);
    const sz = s * (0.85 + rand() * 0.35);
    const r: RockCollider = {
      x: rx,
      z: rz,
      sx,
      sy,
      sz,
      rotX: rand() * 0.4,
      rotY: rand() * Math.PI * 2,
      rotZ: rand() * 0.4,
      radius: Math.max(sx, sz) * 0.68,
      height: sy * 0.82,
      kind: 'boulder',
      colorIdx: i % 5,
    };
    WORLD_BOULDERS.push(r);
    addRockToGrid(r);
  }

  // 180 Wind-Eroded Flat Slab Stones (drive-over wheel suspension bumps!)
  for (let i = 0; i < 180; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 35 + rand() * 150;
    const rx = Math.cos(angle) * radius;
    const rz = Math.sin(angle) * radius;
    const s = 0.7 + rand() * 1.6;
    const sx = s;
    const sy = 0.6 + rand() * 0.6;
    const sz = s * (0.75 + rand() * 0.5);
    const r: RockCollider = {
      x: rx,
      z: rz,
      sx,
      sy,
      sz,
      rotX: (rand() - 0.5) * 0.25,
      rotY: rand() * Math.PI * 2,
      rotZ: (rand() - 0.5) * 0.25,
      radius: Math.max(sx, sz) * 0.85,
      height: 0.16 * sy,
      kind: 'slab',
      colorIdx: (i + 2) % 5,
    };
    WORLD_SLABS.push(r);
    addRockToGrid(r);
  }

  // 48 Layered Mesa / Butte Rock Outcrops
  for (let i = 0; i < 48; i++) {
    let rx = 0;
    let rz = 0;
    let s = 1;
    let tries = 0;
    do {
      const angle = (i / 48) * Math.PI * 2 + (rand() - 0.5) * 0.15;
      const radius = 115 + rand() * 88;
      rx = Math.cos(angle) * radius;
      rz = Math.sin(angle) * radius;
      s = 0.9 + rand() * 1.5;
      tries++;
    } while (!isPoiClear(rx, rz, s * 4.5) && tries < 6);

    const sx = s * (0.85 + rand() * 0.45);
    const sy = s * (0.7 + rand() * 0.8);
    const sz = s * (0.85 + rand() * 0.45);
    const r: RockCollider = {
      x: rx,
      z: rz,
      sx,
      sy,
      sz,
      rotX: 0,
      rotY: rand() * Math.PI * 2,
      rotZ: 0,
      radius: Math.max(sx, sz) * 3.4,
      height: sy * 4.6,
      kind: 'mesa',
      colorIdx: i % 2,
    };
    WORLD_MESAS.push(r);
    addRockToGrid(r);
  }
})();

export function getRockCollidersInCell(x: number, z: number): RockCollider[] | undefined {
  const cx = Math.floor(x / ROCK_CELL_SIZE);
  const cz = Math.floor(z / ROCK_CELL_SIZE);
  return ROCK_GRID.get(rockCellKey(cx, cz));
}

/** Fast O(1) suspension bump height from flat slab rocks & small boulders beneath a wheel. */
export function rockBumpAt(x: number, z: number): number {
  const list = getRockCollidersInCell(x, z);
  if (!list) return 0;
  let maxBump = 0;
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    if (r.kind === 'mesa') continue;
    // Only traversable slabs and low boulders provide wheel ride-over bumps
    if (r.kind === 'boulder' && r.radius > 0.72) continue;
    const d = Math.hypot(x - r.x, z - r.z);
    if (d < r.radius) {
      const falloff = 1 - (d / r.radius) * (d / r.radius);
      const b = r.height * falloff;
      if (b > maxBump) maxBump = b;
    }
  }
  return maxBump;
}

export interface MarsEnvironmentHandles {
  group: THREE.Group;
  skyMaterial: THREE.ShaderMaterial;
  dustPoints: THREE.Points;
  starPoints: THREE.Points;
  update: (
    elapsed: number,
    dt: number,
    sol: SolVisualSample,
    weather: WeatherType,
    sunDir: THREE.Vector3,
    stormOverride?: boolean,
    stormStageOverride?: StormStage,
  ) => void;
  dispose: () => void;
}

export function createMarsEnvironment(textures: ProceduralTextureSet): MarsEnvironmentHandles {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  // 1. Vast 520m x 520m Open-World Martian Terrain Mesh with Multi-Region Geology
  const terrainGeo = new THREE.PlaneGeometry(520, 520, 192, 192);
  terrainGeo.rotateX(-Math.PI / 2);

  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(posAttr.count * 3);
  const cLow = new THREE.Color('#7c341d');
  const cMid = new THREE.Color('#c45f39');
  const cHigh = new THREE.Color('#df8e5e');
  const cColony = new THREE.Color('#b45937');
  const cSand = new THREE.Color('#d97d4f');
  const cIce = new THREE.Color('#d4ebf9');
  const cStrata = new THREE.Color('#743628');
  const cMineral = new THREE.Color('#d6c6b8');
  const tmpColor = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const y = groundHeightAt(x, z);
    posAttr.setY(i, y);

    const sType = surfaceTypeAt(x, z);
    const mineralDist = Math.hypot(x + 18, z + 98);
    if (sType === 'colony') {
      tmpColor.copy(cColony);
    } else if (sType === 'ice') {
      const iceBlend = THREE.MathUtils.clamp(1 - Math.hypot(x - 12, z + 136) / 18, 0, 0.88);
      tmpColor.copy(cLow).lerp(cIce, iceBlend);
    } else if (mineralDist < 10) {
      tmpColor.copy(cMid).lerp(cMineral, (1 - mineralDist / 10) * 0.55);
    } else if (sType === 'sand') {
      tmpColor.copy(cMid).lerp(cSand, 0.62);
    } else if (Math.hypot(x + 96, z + 72) < 32) {
      const band = Math.floor(y * 2.1) % 2 === 0 ? 0.68 : 0.22;
      tmpColor.copy(cStrata).lerp(cHigh, band);
    } else if (y < 0.2) {
      tmpColor.copy(cLow).lerp(cMid, THREE.MathUtils.clamp((y + 2.5) / 2.8, 0, 1));
    } else {
      tmpColor.copy(cMid).lerp(cHigh, THREE.MathUtils.clamp(y / 14, 0, 1));
    }
    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }

  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  // Repeat procedural albedo/bump more finely across the 520m expanse
  textures.marsAlbedo.repeat.set(28, 28);
  textures.marsBump.repeat.set(28, 28);

  const terrainMat = new THREE.MeshStandardMaterial({
    map: textures.marsAlbedo,
    bumpMap: textures.marsBump,
    bumpScale: 0.34,
    vertexColors: true,
    roughness: 0.93,
    metalness: 0.04,
  });

  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);
  disposables.push(terrainGeo, terrainMat);

  // 2. Colony Gravel Ring Path
  const pathMat = new THREE.MeshStandardMaterial({
    color: '#6b4032',
    roughness: 0.95,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const pathRingGeo = new THREE.RingGeometry(4.6, 5.8, 48);
  pathRingGeo.rotateX(-Math.PI / 2);
  const pathRing = new THREE.Mesh(pathRingGeo, pathMat);
  pathRing.position.y = 0.03;
  pathRing.receiveShadow = true;
  group.add(pathRing);
  disposables.push(pathRingGeo, pathMat);

  // 3. Multi-Scale Geological Formations (4 InstancedMesh Classes: Boulders, Slabs, Layered Mesas, Pebbles)
  let seed = 1337;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const dummy = new THREE.Object3D();
  const rockTint = new THREE.Color();
  const rockPalette = ['#7d3a27', '#9e4b30', '#5a3126', '#b8623d', '#6e3d2f'];

  // 3a. Angular Basalt Boulders (260 — matched 1:1 with WORLD_BOULDERS colliders)
  const boulderGeo = new THREE.DodecahedronGeometry(0.7, 1);
  const bPos = boulderGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < bPos.count; i++) {
    const vx = bPos.getX(i);
    const vy = bPos.getY(i);
    const vz = bPos.getZ(i);
    const warp = 1 + 0.22 * Math.sin(vx * 5.1 + vz * 3.7);
    bPos.setXYZ(i, vx * warp, vy * 0.72, vz * warp);
  }
  boulderGeo.computeVertexNormals();
  const rockMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.89,
    metalness: 0.08,
    flatShading: true,
  });
  const boulders = new THREE.InstancedMesh(boulderGeo, rockMat, WORLD_BOULDERS.length);
  boulders.castShadow = true;
  boulders.receiveShadow = true;
  for (let i = 0; i < WORLD_BOULDERS.length; i++) {
    const r = WORLD_BOULDERS[i];
    dummy.position.set(r.x, groundHeightAt(r.x, r.z) + r.sy * 0.2, r.z);
    dummy.rotation.set(r.rotX, r.rotY, r.rotZ);
    dummy.scale.set(r.sx, r.sy, r.sz);
    dummy.updateMatrix();
    boulders.setMatrixAt(i, dummy.matrix);
    rockTint.set(rockPalette[r.colorIdx % rockPalette.length]);
    boulders.setColorAt(i, rockTint);
  }
  boulders.instanceMatrix.needsUpdate = true;
  if (boulders.instanceColor) boulders.instanceColor.needsUpdate = true;
  boulders.computeBoundingSphere();
  group.add(boulders);
  disposables.push(boulderGeo, rockMat);

  // 3b. Wind-Eroded Flat Slab Stones (180 — matched 1:1 with WORLD_SLABS bump rocks)
  const slabGeo = new THREE.CylinderGeometry(0.85, 1.05, 0.34, 7);
  const slabMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.94,
    metalness: 0.04,
    flatShading: true,
  });
  const slabs = new THREE.InstancedMesh(slabGeo, slabMat, WORLD_SLABS.length);
  slabs.castShadow = true;
  slabs.receiveShadow = true;
  for (let i = 0; i < WORLD_SLABS.length; i++) {
    const r = WORLD_SLABS[i];
    dummy.position.set(r.x, groundHeightAt(r.x, r.z) + 0.05, r.z);
    dummy.rotation.set(r.rotX, r.rotY, r.rotZ);
    dummy.scale.set(r.sx, r.sy, r.sz);
    dummy.updateMatrix();
    slabs.setMatrixAt(i, dummy.matrix);
    rockTint.set(rockPalette[r.colorIdx % rockPalette.length]);
    slabs.setColorAt(i, rockTint);
  }
  slabs.instanceMatrix.needsUpdate = true;
  if (slabs.instanceColor) slabs.instanceColor.needsUpdate = true;
  slabs.computeBoundingSphere();
  group.add(slabs);
  disposables.push(slabGeo, slabMat);

  // 3c. Layered Mesa / Butte Rock Outcrops in Outer Regions (48 — matched 1:1 with WORLD_MESAS)
  const mesaGeo = new THREE.CylinderGeometry(2.2, 4.4, 4.8, 7, 3);
  const mPos = mesaGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < mPos.count; i++) {
    const vx = mPos.getX(i);
    const vy = mPos.getY(i);
    const vz = mPos.getZ(i);
    const step = 1 + 0.14 * Math.sin(vy * 3.5) + 0.12 * Math.cos(vx * 1.4 + vz * 1.1);
    mPos.setXYZ(i, vx * step, vy, vz * step);
  }
  mesaGeo.computeVertexNormals();
  const mesaMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.92,
    metalness: 0.05,
    flatShading: true,
  });
  const mesas = new THREE.InstancedMesh(mesaGeo, mesaMat, WORLD_MESAS.length);
  mesas.castShadow = true;
  mesas.receiveShadow = true;
  for (let i = 0; i < WORLD_MESAS.length; i++) {
    const r = WORLD_MESAS[i];
    dummy.position.set(r.x, groundHeightAt(r.x, r.z) + r.sy * 1.4, r.z);
    dummy.rotation.set(r.rotX, r.rotY, r.rotZ);
    dummy.scale.set(r.sx, r.sy, r.sz);
    dummy.updateMatrix();
    mesas.setMatrixAt(i, dummy.matrix);
    rockTint.set(r.colorIdx === 0 ? '#8c3f26' : '#a85234');
    mesas.setColorAt(i, rockTint);
  }
  mesas.instanceMatrix.needsUpdate = true;
  if (mesas.instanceColor) mesas.instanceColor.needsUpdate = true;
  mesas.computeBoundingSphere();
  group.add(mesas);
  disposables.push(mesaGeo, mesaMat);

  // 3d. Small Regolith Scatter Pebbles (240)
  const pebbleGeo = new THREE.IcosahedronGeometry(0.18, 0);
  const pebbles = new THREE.InstancedMesh(pebbleGeo, rockMat, 240);
  pebbles.receiveShadow = true;
  for (let i = 0; i < 240; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 12 + rand() * 145;
    const rx = Math.cos(angle) * radius;
    const rz = Math.sin(angle) * radius;
    const s = 0.6 + rand() * 1.1;
    dummy.position.set(rx, groundHeightAt(rx, rz) + 0.04, rz);
    dummy.rotation.set(rand(), rand() * Math.PI, rand());
    dummy.scale.set(s, s * 0.55, s);
    dummy.updateMatrix();
    pebbles.setMatrixAt(i, dummy.matrix);
    rockTint.set(rockPalette[i % rockPalette.length]);
    pebbles.setColorAt(i, rockTint);
  }
  pebbles.instanceMatrix.needsUpdate = true;
  if (pebbles.instanceColor) pebbles.instanceColor.needsUpdate = true;
  pebbles.computeBoundingSphere();
  group.add(pebbles);
  disposables.push(pebbleGeo);

  // 4. Stylized Mars Atmospheric Sky Dome with Authentic Localized Blue Sunset & Dust Storm Scattering
  const skyGeo = new THREE.SphereGeometry(310, 36, 22);
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uSunDir: { value: new THREE.Vector3(0.4, 0.5, 0.4).normalize() },
      uDaylight: { value: 1.0 },
      uSunset: { value: 0.0 },
      uNight: { value: 0.0 },
      uStormMix: { value: 0.0 },
    },
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      varying vec3 vWorldDir;
      uniform vec3 uSunDir;
      uniform float uDaylight;
      uniform float uSunset;
      uniform float uNight;
      uniform float uStormMix;

      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = clamp(dir.y, 0.0, 1.0);

        // Day Martian butterscotch-salmon sky
        vec3 dayHorizon = vec3(0.89, 0.56, 0.38);
        vec3 dayMid = vec3(0.65, 0.34, 0.24);
        vec3 dayTop = vec3(0.16, 0.21, 0.33);
        vec3 daySky = mix(dayHorizon, dayMid, smoothstep(0.0, 0.26, h));
        daySky = mix(daySky, dayTop, smoothstep(0.24, 0.78, h));

        // Night deep slate-indigo Martian sky
        vec3 nightHorizon = vec3(0.09, 0.08, 0.14);
        vec3 nightTop = vec3(0.02, 0.03, 0.07);
        vec3 nightSky = mix(nightHorizon, nightTop, smoothstep(0.0, 0.55, h));

        vec3 baseSky = mix(daySky, nightSky, uNight);

        // Warm dust sunset horizon away from the sun
        vec3 sunsetRust = vec3(0.72, 0.31, 0.18);
        baseSky = mix(baseSky, sunsetRust, uSunset * 0.42 * (1.0 - smoothstep(0.0, 0.45, h)));

        // REAL MARS BLUE SUNSET: forward-scattered cool blue halo localized around setting/rising Sun
        float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
        float sunGlowHalo = pow(sunDot, 10.0) * (0.28 + uSunset * 0.85);
        float sunWideBlue = pow(sunDot, 4.5) * uSunset * 0.55;
        vec3 marsBlueHalo = vec3(0.38, 0.64, 0.94);
        baseSky = mix(baseSky, marsBlueHalo, clamp((sunGlowHalo + sunWideBlue) * (1.0 - uStormMix * 0.65), 0.0, 0.88));

        // Crisp sun disc when above horizon & not heavily diffused by storm dust
        float sunDisc = smoothstep(0.9985, 0.9996, sunDot) * (1.0 - uNight * 0.9) * (1.0 - uStormMix * 0.82);
        vec3 sunColor = mix(vec3(1.0, 0.93, 0.82), vec3(0.78, 0.91, 1.0), uSunset);
        baseSky += sunColor * sunDisc * 1.35;

        // Smooth atmospheric storm scattering (muted amber haze gradient, never bright neon orange)
        vec3 stormHorizon = mix(vec3(0.72, 0.42, 0.27), vec3(0.22, 0.12, 0.10), uNight * 0.82);
        vec3 stormZenith = mix(vec3(0.50, 0.27, 0.18), vec3(0.11, 0.08, 0.09), uNight * 0.85);
        vec3 stormCol = mix(stormHorizon, stormZenith, smoothstep(0.0, 0.65, h));
        vec3 finalCol = mix(baseSky, stormCol, clamp(uStormMix * 0.78, 0.0, 0.85));

        gl_FragColor = vec4(finalCol, 1.0);
      }
    `,
  });
  const skyMesh = new THREE.Mesh(skyGeo, skyMaterial);
  group.add(skyMesh);
  disposables.push(skyGeo, skyMaterial);

  // 5. Night Starfield Dome
  const starCount = 620;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(0.08 + rand() * 0.92);
    const r = 295;
    starPos[i * 3] = Math.sin(phi) * Math.cos(theta) * r;
    starPos[i * 3 + 1] = Math.cos(phi) * r;
    starPos[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * r;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: '#f8fafc',
    map: textures.softDustMote,
    size: 1.35,
    transparent: true,
    opacity: 0,
    alphaTest: 0.01,
    depthWrite: false,
    fog: false,
  });
  const starPoints = new THREE.Points(starGeo, starMat);
  group.add(starPoints);
  disposables.push(starGeo, starMat);

  // 6. Volumetric-Style Multi-Layer Regional Martian Dust Storm System (Android-Friendly)
  // Layer A: Suspended fine dust grains drifting WNW -> ESE
  const dustCount = 340;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (rand() - 0.5) * 140;
    dustPositions[i * 3 + 1] = 0.35 + rand() * 11;
    dustPositions[i * 3 + 2] = (rand() - 0.5) * 140;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = new THREE.PointsMaterial({
    color: '#c98e6b',
    map: textures.softDustMote,
    size: 0.38,
    transparent: true,
    opacity: 0.18,
    alphaTest: 0.01,
    depthWrite: false,
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  group.add(dustPoints);
  disposables.push(dustGeo, dustMat);

  // Layer B: Low terrain-hugging saltation drift sheets (muted terracotta mist matched to Mars fog)
  const saltGeo = new THREE.PlaneGeometry(54, 16);
  const groundVeilMat = new THREE.MeshBasicMaterial({
    map: textures.dustSaltationBand,
    color: '#ad6344',
    transparent: true,
    opacity: 0.04,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  // Layer C: Wide overlapping volumetric-style regional dust curtains (zero glowing streaks or flat card edges)
  const cloudSheetGeo = new THREE.PlaneGeometry(66, 36);
  const midHazeMat = new THREE.MeshBasicMaterial({
    map: textures.dustCloudSoft,
    color: '#9e573b',
    transparent: true,
    opacity: 0.03,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  disposables.push(saltGeo, cloudSheetGeo, groundVeilMat, midHazeMat);

  const windDirX = 0.88;
  const windDirZ = 0.47;
  const windStreamYaw = Math.atan2(windDirX, windDirZ);

  const groundVeils: Array<{ mesh: THREE.Mesh; speedMul: number; baseY: number; phase: number }> = [];
  for (let i = 0; i < 20; i++) {
    const m = new THREE.Mesh(saltGeo, groundVeilMat);
    const gx = (rand() - 0.5) * 190;
    const gz = (rand() - 0.5) * 190;
    const baseY = 1.2 + rand() * 2.1;
    m.position.set(gx, groundHeightAt(gx, gz) + baseY, gz);
    m.rotation.order = 'YXZ';
    m.rotation.y = windStreamYaw + (rand() - 0.5) * 0.48;
    m.rotation.x = -0.38 + (rand() - 0.5) * 0.18;
    m.scale.set(0.95 + rand() * 0.85, 0.65 + rand() * 0.45, 1);
    group.add(m);
    groundVeils.push({ mesh: m, speedMul: 0.78 + rand() * 0.42, baseY, phase: rand() * Math.PI * 2 });
  }

  const midVeils: Array<{ mesh: THREE.Mesh; speedMul: number; baseY: number; phase: number }> = [];
  for (let i = 0; i < 22; i++) {
    const m = new THREE.Mesh(cloudSheetGeo, midHazeMat);
    const angle = (i / 22) * Math.PI * 2 + (rand() - 0.5) * 0.25;
    const dist = 28 + rand() * 105;
    const mx = Math.cos(angle) * dist;
    const mz = Math.sin(angle) * dist;
    const baseY = 5.5 + rand() * 9.5;
    m.position.set(mx, groundHeightAt(mx, mz) + baseY, mz);
    m.rotation.order = 'YXZ';
    m.rotation.y = -angle + Math.PI * 0.5 + (rand() - 0.5) * 0.4;
    m.rotation.x = -0.14 + (rand() - 0.5) * 0.12;
    m.scale.set(1.25 + rand() * 1.15, 0.9 + rand() * 0.7, 1);
    group.add(m);
    midVeils.push({ mesh: m, speedMul: 0.55 + rand() * 0.35, baseY, phase: rand() * Math.PI * 2 });
  }

  const update: MarsEnvironmentHandles['update'] = (
    elapsed,
    dt,
    sol,
    weather,
    sunDir,
    stormOverride,
    stormStageOverride,
  ) => {
    const stage = stormStageOverride ?? weatherToStormStage(weather, stormOverride);
    const sSpec = STORM_STAGE_SPECS[stage];
    const wSpec = WEATHER_SPECS[weather];

    skyMaterial.uniforms.uSunDir.value.copy(sunDir).normalize();
    skyMaterial.uniforms.uDaylight.value = sol.daylightFactor;
    skyMaterial.uniforms.uSunset.value = sol.sunsetFactor;
    skyMaterial.uniforms.uNight.value = sol.nightFactor;
    skyMaterial.uniforms.uStormMix.value = THREE.MathUtils.damp(
      skyMaterial.uniforms.uStormMix.value,
      sSpec.skyWarmthTint,
      1.3,
      dt,
    );

    const targetStarOpacity = Math.max(0, sol.nightFactor * 0.95 * (1 - sSpec.skyWarmthTint * 0.9));
    starMat.opacity = THREE.MathUtils.damp(starMat.opacity, targetStarOpacity, 2.5, dt);

    const targetMoteOp = Math.max(sSpec.fineMoteOpacity * 0.78, wSpec.dustOpacity * 0.52) * (1 - sol.nightFactor * 0.38);
    dustMat.opacity = THREE.MathUtils.damp(dustMat.opacity, targetMoteOp, 1.5, dt);

    const windV = stormStageOverride
      ? sSpec.windSpeedVis
      : stormOverride
        ? 11.4
        : wSpec.dustSpeed;
    const dAttr = dustGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < dustCount; i++) {
      let x = dAttr.getX(i) + windDirX * windV * dt;
      let z = dAttr.getZ(i) + windDirZ * windV * dt;
      if (x > 70) x -= 140;
      if (z > 70) z -= 140;
      const y = dAttr.getY(i) + Math.sin(elapsed * 1.2 + i) * 0.004;
      dAttr.setXYZ(i, x, y, z);
    }
    dAttr.needsUpdate = true;

    // Smooth atmospheric mist & ground saltation fade (darker at night to match Mars fog)
    const dayDim = 1 - sol.nightFactor * 0.58;
    groundVeilMat.color.setHex(sol.nightFactor > 0.45 ? 0x5c3627 : 0xad6344);
    midHazeMat.color.setHex(sol.nightFactor > 0.45 ? 0x512e22 : 0x9e573b);

    groundVeilMat.opacity = THREE.MathUtils.damp(
      groundVeilMat.opacity,
      sSpec.groundDustOpacity * 0.52 * dayDim,
      1.4,
      dt,
    );
    midHazeMat.opacity = THREE.MathUtils.damp(
      midHazeMat.opacity,
      sSpec.hazeOpacity * 0.58 * dayDim,
      1.2,
      dt,
    );

    for (let i = 0; i < groundVeils.length; i++) {
      const gv = groundVeils[i];
      gv.mesh.position.x += windDirX * windV * gv.speedMul * 0.78 * dt;
      gv.mesh.position.z += windDirZ * windV * gv.speedMul * 0.78 * dt;
      if (gv.mesh.position.x > 95) gv.mesh.position.x -= 190;
      if (gv.mesh.position.z > 95) gv.mesh.position.z -= 190;
      gv.mesh.position.y =
        groundHeightAt(gv.mesh.position.x, gv.mesh.position.z) +
        gv.baseY +
        Math.sin(elapsed * 0.7 + gv.phase) * 0.25;
    }

    for (let i = 0; i < midVeils.length; i++) {
      const mv = midVeils[i];
      mv.mesh.position.x += windDirX * windV * mv.speedMul * 0.42 * dt;
      mv.mesh.position.z += windDirZ * windV * mv.speedMul * 0.42 * dt;
      if (mv.mesh.position.x > 135) mv.mesh.position.x -= 270;
      if (mv.mesh.position.z > 135) mv.mesh.position.z -= 270;
      mv.mesh.position.y =
        groundHeightAt(mv.mesh.position.x, mv.mesh.position.z) +
        mv.baseY +
        Math.sin(elapsed * 0.45 + mv.phase) * 0.4;
    }
  };

  return {
    group,
    skyMaterial,
    dustPoints,
    starPoints,
    update,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
