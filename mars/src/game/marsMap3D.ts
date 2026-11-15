import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CHARACTERS_INFO, LANDING_PAD_POS } from './adventureStory';
import { BUILDING_ZONES } from './colonyLayout';
import { OPTIONAL_TASKS } from './learningRecaps';
import {
  CARGO_LANDING_PAD_POS,
  CHARGING_BAY_A_POS,
  CHARGING_BAY_B_POS,
} from './marsConfig';
import {
  CRATERS,
  groundHeightAt,
  surfaceTypeAt,
  WORLD_BOULDERS,
  WORLD_MESAS,
} from './marsTerrain';
import {
  COLONY_MAP_LOCATIONS,
  EXPLORATION_MAP_LOCATIONS,
  sampleTerrainRoutePoints3D,
} from './navigation';
import { EXPANSION_PODS, LOST_ROVERS, MARS_ANOMALIES, MARS_LANDMARKS } from './roversData';
import {
  CrewNpcId,
  EnvironmentTelemetry,
  LostRoverId,
  NavigationRoute,
} from './types';

export interface MapLayerVisibility {
  terrain: boolean;
  contours: boolean;
  geology: boolean;
  infrastructure: boolean;
  discoveries: boolean;
  crewVehicles: boolean;
  objectives: boolean;
}

export const DEFAULT_MAP_LAYERS: MapLayerVisibility = {
  terrain: true,
  contours: true,
  geology: true,
  infrastructure: true,
  discoveries: true,
  crewVehicles: true,
  objectives: true,
};

export type MapPickTarget =
  | { kind: 'location'; id: string }
  | { kind: 'crew'; id: 'alex' | CrewNpcId }
  | { kind: 'mev' }
  | { kind: 'remote_rover'; id: LostRoverId }
  | { kind: 'optional'; id: string };

export interface ProjectedMapLabel {
  key: string;
  text: string;
  subText?: string;
  x: number;
  y: number;
  accentHex: string;
  kind: 'colony' | 'exploration' | 'crew' | 'vehicle' | 'objective' | 'optional';
  selected: boolean;
  target: MapPickTarget;
}

export interface MarsMapSyncState {
  telemetry: EnvironmentTelemetry | null;
  missionId: number;
  drivingRover: boolean;
  resolvedRovers: LostRoverId[];
  discoveredLandmarks: string[];
  discoveredAnomalies: string[];
  exploredSectors: string[];
  unlockedCrewIds?: CrewNpcId[];
  activeOptionalIds?: string[];
  activeRoute: NavigationRoute | null;
  activeTargetPos: [number, number] | null;
  selectedTarget: MapPickTarget | null;
  layers: MapLayerVisibility;
  filter: 'all' | 'colony' | 'exploration' | 'crew' | 'optional';
  evGuideActive?: boolean;
}

// =========================================================================
// SHARED PROCEDURAL TERRAIN & CONTOUR GEOMETRY BUILDERS
// =========================================================================

function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createMapRegolithTexture(size = 256): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#cf724b';
  ctx.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 3) {
    const wave = Math.sin(y * 0.12) * 10 + Math.cos(y * 0.05) * 6;
    ctx.fillStyle = wave > 0 ? 'rgba(240, 152, 102, 0.14)' : 'rgba(116, 48, 28, 0.14)';
    ctx.fillRect(0, y, size, 2);
  }
  for (let i = 0; i < 1800; i++) {
    const x = (i * 67) % size;
    const y = (i * 149 + Math.floor(i / size) * 23) % size;
    const s = (i % 2) + 1;
    ctx.fillStyle = i % 4 === 0 ? 'rgba(72, 30, 20, 0.28)' : 'rgba(245, 168, 118, 0.22)';
    ctx.fillRect(x, y, s, s);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(20, 20);
  tex.needsUpdate = true;
  return tex;
}

export function buildMarsTerrainMeshGeometry(
  sizeM: number,
  segments: number,
  centerX = 0,
  centerZ = 0,
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(sizeM, sizeM, segments, segments);
  geo.rotateX(-Math.PI / 2);

  const posAttr = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(posAttr.count * 3);

  const cTrench = new THREE.Color('#6b2919');
  const cLow = new THREE.Color('#9c4226');
  const cMid = new THREE.Color('#c8653c');
  const cHigh = new THREE.Color('#e39766');
  const cPeak = new THREE.Color('#f2bb8d');
  const cColony = new THREE.Color('#b05837');
  const cSand = new THREE.Color('#df8754');
  const cIce = new THREE.Color('#cce9fb');
  const cStrata = new THREE.Color('#7a3425');
  const cMineral = new THREE.Color('#e2d5c8');
  const tmp = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    const wx = lx + centerX;
    const wz = lz + centerZ;
    const y = groundHeightAt(wx, wz);
    posAttr.setY(i, y);

    const sType = surfaceTypeAt(wx, wz);
    const mineralDist = Math.hypot(wx + 18, wz + 98);
    if (sType === 'colony') {
      tmp.copy(cColony);
    } else if (sType === 'ice') {
      const iceBlend = THREE.MathUtils.clamp(1 - Math.hypot(wx - 12, wz + 136) / 18, 0, 0.88);
      tmp.copy(cLow).lerp(cIce, iceBlend);
    } else if (mineralDist < 12) {
      tmp.copy(cMid).lerp(cMineral, (1 - mineralDist / 12) * 0.65);
    } else if (sType === 'sand') {
      const duneWave = 0.5 + 0.35 * Math.sin(wx * 0.24 + wz * 0.19);
      tmp.copy(cMid).lerp(cSand, 0.45 + duneWave * 0.35);
    } else if (Math.hypot(wx + 96, wz + 72) < 34) {
      const band = Math.floor(y * 2.2) % 2 === 0 ? 0.72 : 0.2;
      tmp.copy(cStrata).lerp(cHigh, band);
    } else if (y < -0.5) {
      tmp.copy(cTrench).lerp(cLow, THREE.MathUtils.clamp((y + 4.2) / 3.7, 0, 1));
    } else if (y < 2.2) {
      tmp.copy(cLow).lerp(cMid, THREE.MathUtils.clamp((y + 0.5) / 2.7, 0, 1));
    } else if (y < 10) {
      tmp.copy(cMid).lerp(cHigh, THREE.MathUtils.clamp((y - 2.2) / 7.8, 0, 1));
    } else {
      tmp.copy(cHigh).lerp(cPeak, THREE.MathUtils.clamp((y - 10) / 15, 0, 1));
    }

    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Marching-squares topographic contour line segments projected directly on groundHeightAt(x,z). */
export function buildContourGeometry(
  halfSpan: number,
  gridRes: number,
  levels: number[],
  yLift = 0.08,
): THREE.BufferGeometry {
  const step = (halfSpan * 2) / gridRes;
  const n = gridRes + 1;
  const heights = new Float32Array(n * n);
  for (let gz = 0; gz < n; gz++) {
    const wz = -halfSpan + gz * step;
    for (let gx = 0; gx < n; gx++) {
      const wx = -halfSpan + gx * step;
      heights[gz * n + gx] = groundHeightAt(wx, wz);
    }
  }

  const pts: number[] = [];
  const interp = (a: number, b: number, level: number) => {
    const denom = b - a;
    if (Math.abs(denom) < 1e-5) return 0.5;
    return THREE.MathUtils.clamp((level - a) / denom, 0, 1);
  };

  for (let li = 0; li < levels.length; li++) {
    const level = levels[li];
    for (let gz = 0; gz < gridRes; gz++) {
      const z0 = -halfSpan + gz * step;
      const z1 = z0 + step;
      for (let gx = 0; gx < gridRes; gx++) {
        const x0 = -halfSpan + gx * step;
        const x1 = x0 + step;

        const h0 = heights[gz * n + gx];
        const h1 = heights[gz * n + gx + 1];
        const h2 = heights[(gz + 1) * n + gx + 1];
        const h3 = heights[(gz + 1) * n + gx];

        const mask =
          (h0 >= level ? 1 : 0) |
          (h1 >= level ? 2 : 0) |
          (h2 >= level ? 4 : 0) |
          (h3 >= level ? 8 : 0);
        if (mask === 0 || mask === 15) continue;

        const ePts: Array<[number, number]> = [];
        // Top edge (0-1)
        if (((mask & 1) !== 0) !== ((mask & 2) !== 0)) {
          const t = interp(h0, h1, level);
          ePts.push([x0 + (x1 - x0) * t, z0]);
        }
        // Right edge (1-2)
        if (((mask & 2) !== 0) !== ((mask & 4) !== 0)) {
          const t = interp(h1, h2, level);
          ePts.push([x1, z0 + (z1 - z0) * t]);
        }
        // Bottom edge (3-2)
        if (((mask & 8) !== 0) !== ((mask & 4) !== 0)) {
          const t = interp(h3, h2, level);
          ePts.push([x0 + (x1 - x0) * t, z1]);
        }
        // Left edge (0-3)
        if (((mask & 1) !== 0) !== ((mask & 8) !== 0)) {
          const t = interp(h0, h3, level);
          ePts.push([x0, z0 + (z1 - z0) * t]);
        }

        if (ePts.length >= 2) {
          pts.push(ePts[0][0], level + yLift, ePts[0][1]);
          pts.push(ePts[1][0], level + yLift, ePts[1][1]);
        }
        if (ePts.length === 4) {
          pts.push(ePts[2][0], level + yLift, ePts[2][1]);
          pts.push(ePts[3][0], level + yLift, ePts[3][1]);
        }
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return geo;
}

function createTerrainSkirtGeometry(halfSpan: number, segments: number, floorY = -9.5): THREE.BufferGeometry {
  const positions: number[] = [];
  const step = (halfSpan * 2) / segments;
  const addQuadEdge = (x0: number, z0: number, x1: number, z1: number) => {
    const y0 = groundHeightAt(x0, z0);
    const y1 = groundHeightAt(x1, z1);
    positions.push(x0, y0, z0, x0, floorY, z0, x1, y1, z1);
    positions.push(x1, y1, z1, x0, floorY, z0, x1, floorY, z1);
  };
  for (let i = 0; i < segments; i++) {
    const a = -halfSpan + i * step;
    const b = a + step;
    addQuadEdge(a, -halfSpan, b, -halfSpan);
    addQuadEdge(b, halfSpan, a, halfSpan);
    addQuadEdge(-halfSpan, b, -halfSpan, a);
    addQuadEdge(halfSpan, a, halfSpan, b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

function createTerrainPathRibbon(
  a: [number, number],
  b: [number, number],
  width: number,
  yOffset = 0.06,
): THREE.BufferGeometry {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const steps = Math.max(2, Math.ceil(len / 2.2));
  const nx = -(b[1] - a[1]) / Math.max(0.001, len);
  const nz = (b[0] - a[0]) / Math.max(0.001, len);
  const hw = width * 0.5;

  const verts: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = a[0] + (b[0] - a[0]) * t;
    const cz = a[1] + (b[1] - a[1]) * t;
    const lx = cx - nx * hw;
    const lz = cz - nz * hw;
    const rx = cx + nx * hw;
    const rz = cz + nz * hw;
    verts.push(lx, groundHeightAt(lx, lz) + yOffset, lz);
    verts.push(rx, groundHeightAt(rx, rz) + yOffset, rz);
    if (i < steps) {
      const base = i * 2;
      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// =========================================================================
// MINIATURE 3D BUILDING MODELS (LOD CLOSE + FAR SIMPLIFIED)
// =========================================================================

function buildColonyBuildingLOD(
  id: string,
  accentHex: string,
  track: <T extends { dispose: () => void }>(d: T) => T,
  shared: {
    hullMat: THREE.Material;
    darkMat: THREE.Material;
    metalMat: THREE.Material;
    glassMat: THREE.Material;
    ghGlassMat: THREE.Material;
    solarMat: THREE.Material;
    regolithMat: THREE.Material;
    goldMat: THREE.Material;
    iceMat: THREE.Material;
  },
): { lod: THREE.LOD; pickMesh: THREE.Mesh } {
  const lod = new THREE.LOD();
  const detail = new THREE.Group();
  const simple = new THREE.Group();
  const accentMat = track(
    new THREE.MeshStandardMaterial({
      color: accentHex,
      roughness: 0.38,
      metalness: 0.25,
      emissive: accentHex,
      emissiveIntensity: 0.14,
    }),
  );

  // Far-zoom simplified iconic silhouette + glowing rooftop marker disc
  const isCoreZone = id in BUILDING_ZONES;
  const podSpec = EXPANSION_PODS.find((p) => p.id === id);
  const footprintR = isCoreZone
    ? Math.max(BUILDING_ZONES[id as keyof typeof BUILDING_ZONES].hx, BUILDING_ZONES[id as keyof typeof BUILDING_ZONES].hz)
    : podSpec
      ? podSpec.radius
      : 2.6;

  const simplePad = new THREE.Mesh(
    track(new THREE.CylinderGeometry(footprintR * 0.96, footprintR * 1.06, 0.45, 14)),
    shared.darkMat,
  );
  simplePad.position.y = 0.25;
  simple.add(simplePad);

  const simpleMass = new THREE.Mesh(
    track(
      id === 'crew_home' || id === 'greenhouse' || id === 'observatory' || id === 'emergency_shelter'
        ? new THREE.SphereGeometry(footprintR * 0.85, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2)
        : new THREE.BoxGeometry(footprintR * 1.45, 2.2, footprintR * 1.3),
    ),
    shared.hullMat,
  );
  simpleMass.position.y = id === 'crew_home' || id === 'greenhouse' || id === 'observatory' || id === 'emergency_shelter' ? 0.45 : 1.5;
  simple.add(simpleMass);

  const beaconPuck = new THREE.Mesh(
    track(new THREE.CylinderGeometry(1.15, 1.35, 0.38, 16)),
    accentMat,
  );
  beaconPuck.position.y = 3.1;
  simple.add(beaconPuck);

  // Close-zoom detailed structure matching actual world architecture
  const pad = new THREE.Mesh(
    track(new THREE.CylinderGeometry(footprintR * 1.02, footprintR * 1.1, 0.28, 18)),
    shared.darkMat,
  );
  pad.position.y = 0.14;
  detail.add(pad);

  if (id === 'crew_home') {
    const wall = new THREE.Mesh(track(new THREE.CylinderGeometry(4.35, 4.5, 1.5, 16)), shared.hullMat);
    wall.position.y = 0.9;
    const dome = new THREE.Mesh(
      track(new THREE.SphereGeometry(4.35, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2)),
      shared.glassMat,
    );
    dome.position.y = 1.65;
    const ring = new THREE.Mesh(track(new THREE.TorusGeometry(4.38, 0.14, 8, 24)), accentMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.68;
    detail.add(wall, dome, ring);
  } else if (id === 'greenhouse') {
    const base = new THREE.Mesh(track(new THREE.BoxGeometry(5.6, 0.95, 4.4)), shared.hullMat);
    base.position.y = 0.65;
    const vault = new THREE.Mesh(
      track(new THREE.CylinderGeometry(2.2, 2.2, 5.4, 14, 1, false, 0, Math.PI)),
      shared.ghGlassMat,
    );
    vault.rotation.z = Math.PI / 2;
    vault.position.y = 1.15;
    const strip = new THREE.Mesh(track(new THREE.BoxGeometry(4.8, 0.4, 2.6)), accentMat);
    strip.position.y = 0.9;
    detail.add(base, vault, strip);
  } else if (id === 'oxygen_centre') {
    const hall = new THREE.Mesh(track(new THREE.BoxGeometry(4.8, 2.2, 4.0)), shared.hullMat);
    hall.position.y = 1.25;
    const fan = new THREE.Mesh(track(new THREE.CylinderGeometry(0.95, 0.95, 0.45, 14)), shared.metalMat);
    fan.position.y = 2.5;
    for (const tz of [-0.9, 0.9]) {
      const tank = new THREE.Mesh(track(new THREE.CapsuleGeometry(0.45, 1.2, 6, 10)), accentMat);
      tank.position.set(-1.9, 1.4, tz);
      detail.add(tank);
    }
    detail.add(hall, fan);
  } else if (id === 'water_station') {
    const hall = new THREE.Mesh(track(new THREE.BoxGeometry(4.6, 1.9, 3.8)), shared.hullMat);
    hall.position.y = 1.1;
    for (const sz of [-0.9, 0.9]) {
      const silo = new THREE.Mesh(track(new THREE.CylinderGeometry(0.82, 0.88, 3.1, 14)), accentMat);
      silo.position.set(-1.6, 1.6, sz);
      detail.add(silo);
    }
    detail.add(hall);
  } else if (id === 'power_station') {
    const hall = new THREE.Mesh(track(new THREE.BoxGeometry(4.6, 2.1, 3.8)), shared.hullMat);
    hall.position.y = 1.2;
    const roofTrim = new THREE.Mesh(track(new THREE.BoxGeometry(4.8, 0.28, 4.0)), accentMat);
    roofTrim.position.y = 2.3;
    const wing = new THREE.Mesh(track(new THREE.BoxGeometry(5.6, 0.14, 2.0)), shared.solarMat);
    wing.position.set(0, 2.8, -0.4);
    wing.rotation.x = 0.35;
    detail.add(hall, roofTrim, wing);
  } else if (id === 'solar_expansion') {
    for (const row of [-1.25, 1.25]) {
      const mast = new THREE.Mesh(track(new THREE.CylinderGeometry(0.16, 0.2, 1.4, 8)), shared.metalMat);
      mast.position.set(0, 0.85, row);
      const wing = new THREE.Mesh(track(new THREE.BoxGeometry(5.4, 0.12, 1.95)), shared.solarMat);
      wing.position.set(0, 1.65, row);
      wing.rotation.x = 0.35;
      const bar = new THREE.Mesh(track(new THREE.BoxGeometry(5.5, 0.09, 0.18)), accentMat);
      bar.position.set(0, 1.72, row);
      detail.add(mast, wing, bar);
    }
  } else if (id === 'comms_tower') {
    const pod = new THREE.Mesh(track(new THREE.CylinderGeometry(2.1, 2.3, 1.9, 14)), shared.hullMat);
    pod.position.y = 1.1;
    const mast = new THREE.Mesh(track(new THREE.CylinderGeometry(0.18, 0.28, 4.2, 8)), shared.metalMat);
    mast.position.y = 3.9;
    const dish = new THREE.Mesh(track(new THREE.ConeGeometry(1.75, 0.85, 16, 1, true)), accentMat);
    dish.position.set(0.35, 5.9, 0);
    dish.rotation.set(0.65, 0, -0.45);
    detail.add(pod, mast, dish);
  } else if (id === 'radiation_shelter') {
    const bunker = new THREE.Mesh(track(new THREE.BoxGeometry(5.8, 2.35, 4.4)), shared.regolithMat);
    bunker.position.y = 1.3;
    const cap = new THREE.Mesh(track(new THREE.BoxGeometry(6.1, 0.36, 4.7)), accentMat);
    cap.position.y = 2.52;
    detail.add(bunker, cap);
  } else if (id === 'medical_room') {
    const pod = new THREE.Mesh(track(new THREE.BoxGeometry(4.4, 2.0, 3.6)), shared.hullMat);
    pod.position.y = 1.15;
    const crossA = new THREE.Mesh(track(new THREE.BoxGeometry(1.6, 0.22, 0.46)), accentMat);
    crossA.position.y = 2.25;
    const crossB = new THREE.Mesh(track(new THREE.BoxGeometry(0.46, 0.22, 1.6)), accentMat);
    crossB.position.y = 2.25;
    detail.add(pod, crossA, crossB);
  } else if (id === 'rover_garage') {
    const bay = new THREE.Mesh(track(new THREE.BoxGeometry(5.6, 2.7, 4.9)), shared.hullMat);
    bay.position.y = 1.5;
    const canopy = new THREE.Mesh(track(new THREE.BoxGeometry(6.0, 0.3, 5.2)), accentMat);
    canopy.position.y = 2.95;
    const solarTop = new THREE.Mesh(track(new THREE.BoxGeometry(4.5, 0.1, 3.6)), shared.solarMat);
    solarTop.position.y = 3.15;
    detail.add(bay, canopy, solarTop);
  } else if (id === 'charging_station') {
    for (const bz of [0, 3.6]) {
      const bayPad = new THREE.Mesh(track(new THREE.BoxGeometry(4.2, 0.16, 2.8)), shared.darkMat);
      bayPad.position.set(0, 0.16, bz);
      const archL = new THREE.Mesh(track(new THREE.BoxGeometry(0.24, 2.5, 0.24)), accentMat);
      archL.position.set(1.7, 1.3, bz - 1.1);
      const archR = archL.clone();
      archR.position.set(1.7, 1.3, bz + 1.1);
      const archBar = new THREE.Mesh(track(new THREE.BoxGeometry(0.32, 0.28, 2.5)), accentMat);
      archBar.position.set(1.7, 2.55, bz);
      detail.add(bayPad, archL, archR, archBar);
    }
  } else if (id === 'observatory') {
    const drum = new THREE.Mesh(track(new THREE.CylinderGeometry(2.1, 2.25, 1.85, 16)), shared.hullMat);
    drum.position.y = 1.1;
    const dome = new THREE.Mesh(
      track(new THREE.SphereGeometry(2.12, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2)),
      accentMat,
    );
    dome.position.y = 2.02;
    const slit = new THREE.Mesh(track(new THREE.BoxGeometry(0.55, 1.4, 1.4)), shared.darkMat);
    slit.position.set(0, 2.65, 1.3);
    slit.rotation.x = -0.35;
    detail.add(drum, dome, slit);
  } else if (id === 'weather_station') {
    const base = new THREE.Mesh(track(new THREE.CylinderGeometry(1.5, 1.7, 1.7, 12)), shared.hullMat);
    base.position.y = 0.95;
    const mast = new THREE.Mesh(track(new THREE.CylinderGeometry(0.12, 0.16, 2.5, 8)), shared.metalMat);
    mast.position.y = 3.0;
    const cross = new THREE.Mesh(track(new THREE.BoxGeometry(1.9, 0.12, 0.14)), accentMat);
    cross.position.y = 4.1;
    detail.add(base, mast, cross);
  } else if (id === 'drone_station') {
    const pod = new THREE.Mesh(track(new THREE.CylinderGeometry(1.9, 2.1, 1.3, 14)), shared.hullMat);
    pod.position.y = 0.78;
    const helipad = new THREE.Mesh(track(new THREE.CylinderGeometry(1.65, 1.65, 0.14, 16)), accentMat);
    helipad.position.y = 1.5;
    const droneBody = new THREE.Mesh(track(new THREE.BoxGeometry(0.65, 0.25, 0.65)), shared.goldMat);
    droneBody.position.y = 1.75;
    detail.add(pod, helipad, droneBody);
  } else if (id === 'cargo_pod') {
    const hall = new THREE.Mesh(track(new THREE.BoxGeometry(4.4, 2.1, 3.8)), shared.hullMat);
    hall.position.y = 1.15;
    const gantry = new THREE.Mesh(track(new THREE.BoxGeometry(0.35, 2.7, 2.4)), shared.goldMat);
    gantry.position.set(-2.5, 1.4, 0);
    const band = new THREE.Mesh(track(new THREE.BoxGeometry(4.55, 0.28, 3.95)), accentMat);
    band.position.y = 2.15;
    detail.add(hall, gantry, band);
  } else if (id === 'emergency_shelter') {
    const ring = new THREE.Mesh(track(new THREE.CylinderGeometry(2.0, 2.1, 1.1, 16)), shared.hullMat);
    ring.position.y = 0.68;
    const cap = new THREE.Mesh(
      track(new THREE.SphereGeometry(2.0, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2)),
      accentMat,
    );
    cap.position.y = 1.22;
    detail.add(ring, cap);
  } else {
    // research_lab, geology_station, etc.
    const body = new THREE.Mesh(track(new THREE.BoxGeometry(4.0, 2.1, 3.4)), shared.hullMat);
    body.position.y = 1.18;
    const band = new THREE.Mesh(track(new THREE.BoxGeometry(4.15, 0.3, 3.55)), accentMat);
    band.position.y = 2.18;
    const dish = new THREE.Mesh(track(new THREE.CylinderGeometry(0.55, 0.55, 0.35, 10)), shared.iceMat);
    dish.position.set(0.8, 2.45, 0);
    detail.add(body, band, dish);
  }

  lod.addLevel(detail, 0);
  lod.addLevel(simple, 92);

  // Invisible pick collider sized nicely for touch/click selection
  const pickMesh = new THREE.Mesh(
    track(new THREE.CylinderGeometry(Math.max(3.2, footprintR * 1.15), Math.max(3.2, footprintR * 1.15), 5.2, 12)),
    track(new THREE.MeshBasicMaterial({ visible: false })),
  );
  pickMesh.position.y = 2.4;
  pickMesh.userData.pickTarget = { kind: 'location', id } as MapPickTarget;
  lod.add(pickMesh);

  return { lod, pickMesh };
}

// =========================================================================
// MAIN 3D MARS TERRAIN MAP ENGINE
// =========================================================================

export interface Mars3DMapController {
  setSyncState: (state: MarsMapSyncState) => void;
  focusPoint: (x: number, z: number, distance?: number) => void;
  resetView: () => void;
  setColonyView: () => void;
  rotateBy: (deltaYawRad: number) => void;
  tiltBy: (deltaPolarRad: number) => void;
  zoomBy: (factor: number) => void;
  setTouchMode: (mode: 'rotate' | 'pan') => void;
  requestRender: () => void;
  dispose: () => void;
}

const _projVec = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _pointer = new THREE.Vector2();
const _tmpColor = new THREE.Color();

export function createMars3DMapController(
  container: HTMLElement,
  callbacks: {
    onSelect: (target: MapPickTarget) => void;
    onLabelsUpdate: (labels: ProjectedMapLabel[]) => void;
  },
): Mars3DMapController {
  const isSoftwareGl = detectSoftwareWebGL();
  const width = Math.max(120, container.clientWidth || 640);
  const height = Math.max(120, container.clientHeight || 420);

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'high-performance',
  });
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.touchAction = 'none';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1a0e0b');
  scene.fog = new THREE.FogExp2('#1a0e0b', 0.00145);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  scene.environment = pmrem.fromScene(roomEnv, 0.04).texture;
  roomEnv.dispose();
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(44, width / height, 1.5, 1100);
  camera.position.set(0, 118, 128);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.rotateSpeed = 0.82;
  controls.panSpeed = 0.92;
  controls.zoomSpeed = 1.05;
  controls.minDistance = 16;
  controls.maxDistance = 330;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = Math.PI * 0.44;
  controls.screenSpacePanning = false;
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN,
  };
  controls.target.set(0, groundHeightAt(0, 0), 0);

  // Lighting tuned to reveal Martian ridge relief, valley shadows & crater rims
  const hemiLight = new THREE.HemisphereLight('#f6b793', '#2d1a16', 0.85);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight('#fff1e0', 2.45);
  sunLight.position.set(130, 155, 85);
  if (!isSoftwareGl) {
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 20;
    sunLight.shadow.camera.far = 480;
    sunLight.shadow.camera.left = -210;
    sunLight.shadow.camera.right = 210;
    sunLight.shadow.camera.top = 210;
    sunLight.shadow.camera.bottom = -210;
    sunLight.shadow.bias = -0.0005;
  }
  scene.add(sunLight);

  const rimLight = new THREE.DirectionalLight('#60a5fa', 0.52);
  rimLight.position.set(-140, 65, -120);
  scene.add(rimLight);

  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(d: T): T => {
    disposables.push(d);
    return d;
  };

  // Layer Root Groups
  const terrainGroup = new THREE.Group();
  const contourGroup = new THREE.Group();
  const geologyGroup = new THREE.Group();
  const infrastructureGroup = new THREE.Group();
  const discoveriesGroup = new THREE.Group();
  const crewVehiclesGroup = new THREE.Group();
  const objectivesGroup = new THREE.Group();
  const routeGroup = new THREE.Group();

  scene.add(
    terrainGroup,
    contourGroup,
    geologyGroup,
    infrastructureGroup,
    discoveriesGroup,
    crewVehiclesGroup,
    objectivesGroup,
    routeGroup,
  );

  // 1. ACTUAL 3D TERRAIN + SKIRT + CONTOURS
  const regolithTex = track(createMapRegolithTexture(256));
  const terrainGeo = track(buildMarsTerrainMeshGeometry(520, isSoftwareGl ? 128 : 168));
  const terrainMat = track(
    new THREE.MeshStandardMaterial({
      map: regolithTex,
      vertexColors: true,
      roughness: 0.91,
      metalness: 0.04,
    }),
  );
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = !isSoftwareGl;
  terrainGroup.add(terrainMesh);

  const skirtGeo = track(createTerrainSkirtGeometry(260, 80, -11));
  const skirtMat = track(
    new THREE.MeshStandardMaterial({
      color: '#321610',
      roughness: 0.95,
      metalness: 0.05,
      side: THREE.DoubleSide,
    }),
  );
  terrainGroup.add(new THREE.Mesh(skirtGeo, skirtMat));

  // Explorable perimeter boundary ring (r = 212m) projected onto actual terrain
  const boundaryPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const bx = Math.cos(a) * 212;
    const bz = Math.sin(a) * 212;
    boundaryPts.push(new THREE.Vector3(bx, groundHeightAt(bx, bz) + 0.35, bz));
  }
  const boundaryGeo = track(new THREE.BufferGeometry().setFromPoints(boundaryPts));
  const boundaryLine = new THREE.Line(
    boundaryGeo,
    track(new THREE.LineBasicMaterial({ color: '#f97316', transparent: true, opacity: 0.42 })),
  );
  terrainGroup.add(boundaryLine);

  // Topographic Contour Lines (minor 1.5m & major 3.0m)
  const minorLevels: number[] = [];
  const majorLevels: number[] = [];
  for (let h = -4.5; h <= 24.0; h += 1.5) {
    if (Math.abs(Math.round(h / 3) * 3 - h) < 0.01) {
      majorLevels.push(h);
    } else {
      minorLevels.push(h);
    }
  }
  const minorContourGeo = track(buildContourGeometry(254, 128, minorLevels, 0.1));
  const majorContourGeo = track(buildContourGeometry(254, 128, majorLevels, 0.13));
  contourGroup.add(
    new THREE.LineSegments(
      minorContourGeo,
      track(new THREE.LineBasicMaterial({ color: '#fb923c', transparent: true, opacity: 0.25 })),
    ),
    new THREE.LineSegments(
      majorContourGeo,
      track(new THREE.LineBasicMaterial({ color: '#fde047', transparent: true, opacity: 0.5 })),
    ),
  );

  // 2. GEOLOGICAL FEATURES (Mesas, Boulders, Crater Rim Rings, Frost Trench Ice)
  const mesaGeo = track(new THREE.CylinderGeometry(2.2, 4.4, 4.8, 7, 3));
  const mesaMat = track(
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, metalness: 0.05, flatShading: true }),
  );
  const mesaInst = new THREE.InstancedMesh(mesaGeo, mesaMat, WORLD_MESAS.length);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < WORLD_MESAS.length; i++) {
    const r = WORLD_MESAS[i];
    dummy.position.set(r.x, groundHeightAt(r.x, r.z) + r.sy * 1.4, r.z);
    dummy.rotation.set(r.rotX, r.rotY, r.rotZ);
    dummy.scale.set(r.sx, r.sy, r.sz);
    dummy.updateMatrix();
    mesaInst.setMatrixAt(i, dummy.matrix);
    _tmpColor.set(r.colorIdx === 0 ? '#8c3f26' : '#ad5535');
    mesaInst.setColorAt(i, _tmpColor);
  }
  mesaInst.instanceMatrix.needsUpdate = true;
  if (mesaInst.instanceColor) mesaInst.instanceColor.needsUpdate = true;
  mesaInst.castShadow = !isSoftwareGl;
  geologyGroup.add(mesaInst);

  const boulderGeo = track(new THREE.DodecahedronGeometry(0.7, 0));
  const boulderMat = track(
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, metalness: 0.06, flatShading: true }),
  );
  const boulderInst = new THREE.InstancedMesh(boulderGeo, boulderMat, WORLD_BOULDERS.length);
  const rockPalette = ['#7d3a27', '#9e4b30', '#5a3126', '#b8623d', '#6e3d2f'];
  for (let i = 0; i < WORLD_BOULDERS.length; i++) {
    const r = WORLD_BOULDERS[i];
    dummy.position.set(r.x, groundHeightAt(r.x, r.z) + r.sy * 0.2, r.z);
    dummy.rotation.set(r.rotX, r.rotY, r.rotZ);
    dummy.scale.set(r.sx, r.sy * 0.72, r.sz);
    dummy.updateMatrix();
    boulderInst.setMatrixAt(i, dummy.matrix);
    _tmpColor.set(rockPalette[r.colorIdx % rockPalette.length]);
    boulderInst.setColorAt(i, _tmpColor);
  }
  boulderInst.instanceMatrix.needsUpdate = true;
  if (boulderInst.instanceColor) boulderInst.instanceColor.needsUpdate = true;
  geologyGroup.add(boulderInst);

  // Crater rim outlines projected onto actual terrain
  const craterMat = track(new THREE.LineBasicMaterial({ color: '#fdba74', transparent: true, opacity: 0.45 }));
  CRATERS.forEach((c) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const cx = c.x + Math.cos(a) * c.radius;
      const cz = c.z + Math.sin(a) * c.radius;
      pts.push(new THREE.Vector3(cx, groundHeightAt(cx, cz) + 0.18, cz));
    }
    const line = new THREE.Line(track(new THREE.BufferGeometry().setFromPoints(pts)), craterMat);
    geologyGroup.add(line);
  });

  // Frost Trench exposed water-ice crystals at (12, -136)
  const iceMat = track(
    new THREE.MeshStandardMaterial({
      color: '#dbeafe',
      emissive: '#38bdf8',
      emissiveIntensity: 0.25,
      roughness: 0.25,
    }),
  );
  for (let i = 0; i < 8; i++) {
    const ix = 12 + (i - 3.5) * 3.1;
    const iz = -136 + Math.sin(i * 1.4) * 2.5;
    const ice = new THREE.Mesh(track(new THREE.DodecahedronGeometry(1.25, 0)), iceMat);
    ice.scale.set(1.5, 0.45, 1.15);
    ice.position.set(ix, groundHeightAt(ix, iz) + 0.22, iz);
    geologyGroup.add(ice);
  }

  // 3. COLONY INFRASTRUCTURE (Gravel Ring, Walkways, Service Roads, Pads, 18 Buildings)
  const sharedBuildMats = {
    hullMat: track(new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.55, metalness: 0.16 })),
    darkMat: track(new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.7, metalness: 0.32 })),
    metalMat: track(new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.32, metalness: 0.8 })),
    glassMat: track(
      new THREE.MeshPhysicalMaterial({
        color: '#bae6fd',
        roughness: 0.15,
        metalness: 0.05,
        transparent: true,
        opacity: 0.65,
      }),
    ),
    ghGlassMat: track(
      new THREE.MeshPhysicalMaterial({
        color: '#a7f3d0',
        roughness: 0.16,
        metalness: 0.05,
        transparent: true,
        opacity: 0.65,
      }),
    ),
    solarMat: track(
      new THREE.MeshStandardMaterial({ color: '#1d4ed8', emissive: '#0f172a', roughness: 0.22, metalness: 0.78 }),
    ),
    regolithMat: track(new THREE.MeshStandardMaterial({ color: '#9a3412', roughness: 0.9, metalness: 0.05 })),
    goldMat: track(new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.28, metalness: 0.82 })),
    iceMat,
  };

  // Colony Gravel Ring & Walkway Segments from baseWorld.ts
  const pathMat = track(
    new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.85, metalness: 0.1 }),
  );
  const ringGeo = track(new THREE.RingGeometry(4.6, 5.8, 48));
  ringGeo.rotateX(-Math.PI / 2);
  const ringMesh = new THREE.Mesh(ringGeo, pathMat);
  ringMesh.position.y = groundHeightAt(0, 0) + 0.06;
  infrastructureGroup.add(ringMesh);

  const colonyRoads: Array<[number, number, number, number, number]> = [
    [0, 5.2, -9.1, 4.5, 1.3],
    [0, 5.2, -2.5, 11.2, 1.3],
    [0, 5.2, 6.3, 8.8, 1.3],
    [0, 5.2, 13.5, 11.5, 1.4],
    [0, -5.0, 0, -9.3, 1.4],
    [0, -5.0, -8.3, -7.5, 1.3],
    [0, -5.0, 7.8, -1.5, 1.3],
    [0, -5.0, 8.0, -11.5, 1.3],
    [-9.1, 4.5, -13.6, 11.5, 1.3],
    [14.0, -1.5, 21.5, -3.5, 2.2],
    [-11.0, -10.0, -15.5, -20.5, 2.0],
    [-15.5, -23.0, -28.0, -23.0, 2.6],
    [-15.5, -23.0, -6.5, -24.5, 1.6],
    [18.5, -3.5, CHARGING_BAY_A_POS[0], CHARGING_BAY_A_POS[1], 2.2],
    [CHARGING_BAY_A_POS[0], CHARGING_BAY_A_POS[1], CHARGING_BAY_B_POS[0], CHARGING_BAY_B_POS[1], 2.2],
  ];
  colonyRoads.forEach(([ax, az, bx, bz, w]) => {
    const rMesh = new THREE.Mesh(track(createTerrainPathRibbon([ax, az], [bx, bz], w, 0.06)), pathMat);
    infrastructureGroup.add(rMesh);
  });

  // Cargo Pad & Crew Landing Pad discs
  const cargoPadMesh = new THREE.Mesh(
    track(new THREE.CylinderGeometry(5.6, 6.0, 0.25, 24)),
    sharedBuildMats.darkMat,
  );
  cargoPadMesh.position.set(
    CARGO_LANDING_PAD_POS[0],
    groundHeightAt(CARGO_LANDING_PAD_POS[0], CARGO_LANDING_PAD_POS[1]) + 0.12,
    CARGO_LANDING_PAD_POS[1],
  );
  const cargoRing = new THREE.Mesh(
    track(new THREE.RingGeometry(4.5, 5.2, 24)),
    track(new THREE.MeshBasicMaterial({ color: '#f59e0b', side: THREE.DoubleSide })),
  );
  cargoRing.rotation.x = -Math.PI / 2;
  cargoRing.position.y = 0.14;
  cargoPadMesh.add(cargoRing);
  infrastructureGroup.add(cargoPadMesh);

  const crewPadMesh = new THREE.Mesh(
    track(new THREE.CylinderGeometry(4.2, 4.6, 0.22, 24)),
    sharedBuildMats.darkMat,
  );
  crewPadMesh.position.set(
    LANDING_PAD_POS[0],
    groundHeightAt(LANDING_PAD_POS[0], LANDING_PAD_POS[1]) + 0.1,
    LANDING_PAD_POS[1],
  );
  infrastructureGroup.add(crewPadMesh);

  // Build all 18 Colony Buildings with LOD + Pick Targets
  const pickMeshes: THREE.Object3D[] = [];
  const buildingRecords = new Map<string, { lod: THREE.LOD; ring: THREE.Mesh }>();

  COLONY_MAP_LOCATIONS.forEach((loc) => {
    const { lod, pickMesh } = buildColonyBuildingLOD(loc.id, loc.accentHex, track, sharedBuildMats);
    lod.position.set(loc.x, groundHeightAt(loc.x, loc.z), loc.z);
    infrastructureGroup.add(lod);
    pickMeshes.push(pickMesh);

    const ringGeoB = track(new THREE.RingGeometry(4.2, 5.0, 28));
    ringGeoB.rotateX(-Math.PI / 2);
    const ringMatB = track(
      new THREE.MeshBasicMaterial({
        color: '#fde047',
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      }),
    );
    const ringB = new THREE.Mesh(ringGeoB, ringMatB);
    ringB.position.set(loc.x, groundHeightAt(loc.x, loc.z) + 0.22, loc.z);
    ringB.visible = false;
    objectivesGroup.add(ringB);
    buildingRecords.set(loc.id, { lod, ring: ringB });
  });

  // 4. EXPLORATION DISCOVERIES LAYER (Landmarks, Anomalies, Fog-of-War Veil)
  const sectorVeils: Array<{ key: string; mesh: THREE.Mesh }> = [];
  const veilMat = track(
    new THREE.MeshBasicMaterial({
      color: '#070b18',
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  for (let gx = 0; gx < 8; gx++) {
    for (let gz = 0; gz < 8; gz++) {
      const key = `${gx - 4},${gz - 4}`;
      const isCenter = Math.abs(gx - 3.5) < 1.2 && Math.abs(gz - 3.5) < 1.2;
      if (isCenter) continue;
      const cx = (gx - 3.5) * 55;
      const cz = (gz - 3.5) * 55;
      const vGeo = track(new THREE.PlaneGeometry(55, 55, 8, 8));
      vGeo.rotateX(-Math.PI / 2);
      const vp = vGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < vp.count; i++) {
        const wx = vp.getX(i) + cx;
        const wz = vp.getZ(i) + cz;
        vp.setY(i, groundHeightAt(wx, wz) + 0.65);
      }
      const vMesh = new THREE.Mesh(vGeo, veilMat);
      vMesh.position.set(cx, 0, cz);
      discoveriesGroup.add(vMesh);
      sectorVeils.push({ key, mesh: vMesh });
    }
  }

  // Discovered Exploration Site 3D Pins + Landmark/Anomaly Structures
  const explorationNodes = new Map<string, THREE.Group>();
  EXPLORATION_MAP_LOCATIONS.forEach((loc) => {
    const eg = new THREE.Group();
    const ey = groundHeightAt(loc.x, loc.z);
    eg.position.set(loc.x, ey, loc.z);

    // Subtle physical terrain feature preview on discovered sites
    if (loc.linkedDiscoveryId === 'basalt_arch') {
      const pillarMat = track(new THREE.MeshStandardMaterial({ color: '#9a452a', roughness: 0.9 }));
      const pL = new THREE.Mesh(track(new THREE.CylinderGeometry(0.9, 1.3, 5.2, 7)), pillarMat);
      pL.position.set(-2.3, 2.5, 0);
      const pR = pL.clone();
      pR.position.set(2.3, 2.5, 0);
      const bridge = new THREE.Mesh(track(new THREE.BoxGeometry(5.6, 1.2, 1.9)), pillarMat);
      bridge.position.set(0, 4.9, 0);
      eg.add(pL, pR, bridge);
    } else if (loc.linkedDiscoveryId === 'old_heatshield') {
      const shield = new THREE.Mesh(
        track(new THREE.ConeGeometry(2.2, 1.0, 12, 1, true)),
        sharedBuildMats.darkMat,
      );
      shield.position.y = 0.5;
      shield.rotation.x = 0.25;
      eg.add(shield);
    } else if (loc.linkedDiscoveryId === 'remote_relay') {
      const mast = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.18, 0.24, 4.5, 8)),
        sharedBuildMats.metalMat,
      );
      mast.position.y = 2.2;
      mast.rotation.z = 0.2;
      eg.add(mast);
    }

    const pinBase = new THREE.Mesh(
      track(new THREE.CylinderGeometry(2.4, 2.8, 0.35, 16)),
      track(new THREE.MeshBasicMaterial({ color: loc.accentHex, transparent: true, opacity: 0.72 })),
    );
    pinBase.position.y = 0.2;
    const beacon = new THREE.Mesh(
      track(new THREE.OctahedronGeometry(1.45, 0)),
      track(
        new THREE.MeshStandardMaterial({
          color: loc.accentHex,
          emissive: loc.accentHex,
          emissiveIntensity: 0.45,
          roughness: 0.25,
        }),
      ),
    );
    beacon.position.y = 4.2;
    const stem = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.12, 0.12, 3.6, 6)),
      sharedBuildMats.metalMat,
    );
    stem.position.y = 1.9;
    eg.add(pinBase, stem, beacon);

    const pick = new THREE.Mesh(
      track(new THREE.CylinderGeometry(3.8, 3.8, 6.5, 10)),
      track(new THREE.MeshBasicMaterial({ visible: false })),
    );
    pick.position.y = 3.2;
    pick.userData.pickTarget = { kind: 'location', id: loc.id } as MapPickTarget;
    eg.add(pick);
    pickMeshes.push(pick);

    discoveriesGroup.add(eg);
    explorationNodes.set(loc.id, eg);
  });

  // Discovered Landmark Survey Flags
  const landmarkFlags = new Map<string, THREE.Group>();
  MARS_LANDMARKS.forEach((lm) => {
    const fg = new THREE.Group();
    fg.position.set(lm.x, groundHeightAt(lm.x, lm.z), lm.z);
    const pole = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.14, 0.14, 4.6, 6)),
      sharedBuildMats.metalMat,
    );
    pole.position.y = 2.3;
    const flag = new THREE.Mesh(track(new THREE.BoxGeometry(2.2, 1.15, 0.12)), sharedBuildMats.goldMat);
    flag.position.set(1.1, 4.0, 0);
    fg.add(pole, flag);
    discoveriesGroup.add(fg);
    landmarkFlags.set(lm.id, fg);
  });

  // Additional anomalies not directly mapped to EXPLORATION_MAP_LOCATIONS (e.g. buried_probe)
  const anomalyMarkers = new Map<string, THREE.Group>();
  MARS_ANOMALIES.filter((a) => a.id === 'buried_probe').forEach((an) => {
    const ag = new THREE.Group();
    ag.position.set(an.x, groundHeightAt(an.x, an.z), an.z);
    const box = new THREE.Mesh(track(new THREE.BoxGeometry(1.6, 0.9, 1.6)), sharedBuildMats.goldMat);
    box.position.y = 0.5;
    const mast = new THREE.Mesh(track(new THREE.CylinderGeometry(0.12, 0.12, 3.0, 6)), sharedBuildMats.metalMat);
    mast.position.y = 1.8;
    ag.add(box, mast);
    discoveriesGroup.add(ag);
    anomalyMarkers.set(an.id, ag);
  });

  // Optional Exploration & Crew-Help Task Cyan Pins
  const optionalNodes = new Map<string, THREE.Group>();
  const optGemGeo = track(new THREE.OctahedronGeometry(1.35, 0));
  const optMat = track(
    new THREE.MeshStandardMaterial({
      color: '#22d3ee',
      emissive: '#06b6d4',
      emissiveIntensity: 0.72,
      roughness: 0.25,
    }),
  );
  const optRingGeo = track(new THREE.RingGeometry(2.1, 2.7, 20));
  optRingGeo.rotateX(-Math.PI / 2);
  const optRingMat = track(
    new THREE.MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
  );
  OPTIONAL_TASKS.forEach((task) => {
    const og = new THREE.Group();
    og.position.set(task.x, groundHeightAt(task.x, task.z), task.z);
    const ring = new THREE.Mesh(optRingGeo, optRingMat);
    ring.position.y = 0.2;
    const gem = new THREE.Mesh(optGemGeo, optMat);
    gem.position.y = 3.4;
    const pick = new THREE.Mesh(
      track(new THREE.CylinderGeometry(3.2, 3.2, 5.2, 10)),
      track(new THREE.MeshBasicMaterial({ visible: false })),
    );
    pick.position.y = 2.4;
    pick.userData.pickTarget = { kind: 'optional', id: task.id } as MapPickTarget;
    og.add(ring, gem, pick);
    pickMeshes.push(pick);
    objectivesGroup.add(og);
    optionalNodes.set(task.id, og);
  });

  // 5. LIVE CREW & VEHICLE MARKERS
  const makeCrewMarker = (id: 'alex' | CrewNpcId, suitColor: string): THREE.Group => {
    const cg = new THREE.Group();
    const ring = new THREE.Mesh(
      track(new THREE.RingGeometry(1.4, 2.0, 20)),
      track(new THREE.MeshBasicMaterial({ color: suitColor, side: THREE.DoubleSide })),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.18;

    const torso = new THREE.Mesh(
      track(new THREE.CapsuleGeometry(0.62, 0.95, 6, 10)),
      track(
        new THREE.MeshStandardMaterial({
          color: id === 'alex' ? '#ffffff' : suitColor,
          emissive: suitColor,
          emissiveIntensity: 0.3,
          roughness: 0.35,
        }),
      ),
    );
    torso.position.y = 1.3;
    const visor = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.55, 12, 10)),
      track(
        new THREE.MeshStandardMaterial({
          color: id === 'alex' ? '#38bdf8' : '#e2e8f0',
          emissive: id === 'alex' ? '#0284c7' : suitColor,
          emissiveIntensity: 0.35,
          roughness: 0.15,
          metalness: 0.65,
        }),
      ),
    );
    visor.position.y = 2.45;
    cg.add(ring, torso, visor);

    if (id === 'alex') {
      // Heading wedge cone for Alex
      const wedgeGeo = track(new THREE.CircleGeometry(7.2, 18, -Math.PI / 2 - 0.36, 0.72));
      wedgeGeo.rotateX(-Math.PI / 2);
      const wedge = new THREE.Mesh(
        wedgeGeo,
        track(
          new THREE.MeshBasicMaterial({
            color: '#38bdf8',
            transparent: true,
            opacity: 0.28,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        ),
      );
      wedge.position.y = 0.15;
      cg.add(wedge);
    }

    const pick = new THREE.Mesh(
      track(new THREE.CylinderGeometry(2.6, 2.6, 4.5, 10)),
      track(new THREE.MeshBasicMaterial({ visible: false })),
    );
    pick.position.y = 2.2;
    pick.userData.pickTarget = { kind: 'crew', id } as MapPickTarget;
    cg.add(pick);
    pickMeshes.push(pick);

    crewVehiclesGroup.add(cg);
    return cg;
  };

  const crewMarkers: Record<'alex' | CrewNpcId, THREE.Group> = {
    alex: makeCrewMarker('alex', '#38bdf8'),
    leo: makeCrewMarker('leo', CHARACTERS_INFO.leo.suitColor),
    maya: makeCrewMarker('maya', CHARACTERS_INFO.maya.suitColor),
    zara: makeCrewMarker('zara', CHARACTERS_INFO.zara.suitColor),
    ryan: makeCrewMarker('ryan', CHARACTERS_INFO.ryan.suitColor),
  };

  // 6x6 Pressurized Exploration Vehicle (MEV)
  const mevGroup = new THREE.Group();
  const mevBody = new THREE.Mesh(
    track(new THREE.BoxGeometry(2.2, 1.35, 3.6)),
    track(
      new THREE.MeshStandardMaterial({
        color: '#fbbf24',
        emissive: '#d97706',
        emissiveIntensity: 0.25,
        roughness: 0.3,
        metalness: 0.3,
      }),
    ),
  );
  mevBody.position.y = 1.05;
  const mevCab = new THREE.Mesh(track(new THREE.BoxGeometry(1.9, 0.85, 1.3)), sharedBuildMats.glassMat);
  mevCab.position.set(0, 1.45, 1.15);
  mevGroup.add(mevBody, mevCab);
  for (const wx of [-1.2, 1.2]) {
    for (const wz of [-1.35, 0, 1.35]) {
      const wheel = new THREE.Mesh(
        track(new THREE.CylinderGeometry(0.45, 0.45, 0.35, 10)),
        sharedBuildMats.darkMat,
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.45, wz);
      mevGroup.add(wheel);
    }
  }
  const mevPick = new THREE.Mesh(
    track(new THREE.CylinderGeometry(3.2, 3.2, 4.0, 10)),
    track(new THREE.MeshBasicMaterial({ visible: false })),
  );
  mevPick.position.y = 1.8;
  mevPick.userData.pickTarget = { kind: 'mev' } as MapPickTarget;
  mevGroup.add(mevPick);
  pickMeshes.push(mevPick);

  const mevHighlightGroup = new THREE.Group();
  const mevHaloRing = new THREE.Mesh(
    track(new THREE.RingGeometry(2.9, 3.85, 28)),
    track(new THREE.MeshBasicMaterial({ color: '#fde047', side: THREE.DoubleSide })),
  );
  mevHaloRing.rotation.x = -Math.PI / 2;
  mevHaloRing.position.y = 0.28;
  const mevBeaconGem = new THREE.Mesh(
    track(new THREE.OctahedronGeometry(1.15, 0)),
    track(new THREE.MeshBasicMaterial({ color: '#fbbf24' })),
  );
  mevBeaconGem.position.y = 4.5;
  mevHighlightGroup.add(mevHaloRing, mevBeaconGem);
  mevHighlightGroup.visible = false;
  mevGroup.add(mevHighlightGroup);

  crewVehiclesGroup.add(mevGroup);

  // Remote / Lost NASA Rovers
  const remoteRoverGroups = new Map<LostRoverId, { group: THREE.Group; mat: THREE.MeshStandardMaterial }>();
  LOST_ROVERS.forEach((lr) => {
    const rg = new THREE.Group();
    rg.position.set(lr.x, groundHeightAt(lr.x, lr.z), lr.z);
    const mat = track(
      new THREE.MeshStandardMaterial({
        color: lr.accentHex,
        emissive: lr.accentHex,
        emissiveIntensity: 0.45,
        roughness: 0.32,
      }),
    );
    const deck = new THREE.Mesh(track(new THREE.BoxGeometry(1.8, 0.42, 2.2)), mat);
    deck.position.y = 0.72;
    const mast = new THREE.Mesh(track(new THREE.CylinderGeometry(0.1, 0.12, 1.5, 8)), sharedBuildMats.metalMat);
    mast.position.set(0, 1.45, 0.4);
    const beaconRing = new THREE.Mesh(
      track(new THREE.RingGeometry(2.0, 2.6, 20)),
      track(new THREE.MeshBasicMaterial({ color: lr.accentHex, side: THREE.DoubleSide })),
    );
    beaconRing.rotation.x = -Math.PI / 2;
    beaconRing.position.y = 0.2;
    rg.add(deck, mast, beaconRing);

    const pick = new THREE.Mesh(
      track(new THREE.CylinderGeometry(3.2, 3.2, 4.2, 10)),
      track(new THREE.MeshBasicMaterial({ visible: false })),
    );
    pick.position.y = 1.8;
    pick.userData.pickTarget = { kind: 'remote_rover', id: lr.id } as MapPickTarget;
    rg.add(pick);
    pickMeshes.push(pick);

    crewVehiclesGroup.add(rg);
    remoteRoverGroups.set(lr.id, { group: rg, mat });
  });

  // 6. SELECTION HIGHLIGHT & MISSION OBJECTIVE BEACON
  const selectionRingGeo = track(new THREE.RingGeometry(4.8, 5.8, 32));
  selectionRingGeo.rotateX(-Math.PI / 2);
  const selectionRing = new THREE.Mesh(
    selectionRingGeo,
    track(new THREE.MeshBasicMaterial({ color: '#38bdf8', side: THREE.DoubleSide })),
  );
  selectionRing.visible = false;
  scene.add(selectionRing);

  const objectiveGroup = new THREE.Group();
  const objRingGeo = track(new THREE.RingGeometry(3.6, 4.5, 28));
  objRingGeo.rotateX(-Math.PI / 2);
  const objRing = new THREE.Mesh(
    objRingGeo,
    track(new THREE.MeshBasicMaterial({ color: '#fde047', side: THREE.DoubleSide })),
  );
  objRing.position.y = 0.22;
  const objBeacon = new THREE.Mesh(
    track(new THREE.OctahedronGeometry(1.5, 0)),
    track(
      new THREE.MeshStandardMaterial({
        color: '#fde047',
        emissive: '#f59e0b',
        emissiveIntensity: 0.9,
        roughness: 0.2,
      }),
    ),
  );
  objBeacon.position.y = 6.2;
  const objBeam = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.18, 0.45, 7.5, 8)),
    track(new THREE.MeshBasicMaterial({ color: '#fde047', transparent: true, opacity: 0.35 })),
  );
  objBeam.position.y = 3.8;
  objectiveGroup.add(objRing, objBeacon, objBeam);
  objectiveGroup.visible = false;
  objectivesGroup.add(objectiveGroup);

  // 7. 3D TERRAIN-FOLLOWING ROUTE REBUILDER
  let routeKey = '';
  const clearRouteVisuals = () => {
    while (routeGroup.children.length > 0) {
      const child = routeGroup.children[0] as THREE.Mesh;
      routeGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
      else if (child.material) child.material.dispose();
    }
  };

  const rebuildRouteVisuals = (route: NavigationRoute | null) => {
    const nextKey = route
      ? `${route.destinationId}|${route.mode}|${route.waypoints.map((w) => `${w[0].toFixed(1)},${w[1].toFixed(1)}`).join(';')}`
      : '';
    if (nextKey === routeKey) return;
    routeKey = nextKey;
    clearRouteVisuals();
    if (!route || route.waypoints.length < 2) return;

    const pts = sampleTerrainRoutePoints3D(route.waypoints, 1.8, 0.32);
    if (pts.length < 2) return;

    const vecPts = pts.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    const curve = new THREE.CatmullRomCurve3(vecPts, false, 'centripetal', 0.25);

    if (route.mode === 'vehicle') {
      // Driving route: bold golden/yellow terrain-projected ribbon
      const tubeGeo = new THREE.TubeGeometry(curve, Math.max(24, pts.length * 2), 0.58, 6, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: '#facc15',
        emissive: '#f59e0b',
        emissiveIntensity: 0.88,
        roughness: 0.28,
      });
      routeGroup.add(new THREE.Mesh(tubeGeo, tubeMat));
    } else {
      // Walking route: bright golden/yellow path ribbon + warm gold stepping markers hugging terrain
      const tubeGeo = new THREE.TubeGeometry(curve, Math.max(20, pts.length * 2), 0.34, 6, false);
      const tubeMat = new THREE.MeshStandardMaterial({
        color: '#facc15',
        emissive: '#f59e0b',
        emissiveIntensity: 0.92,
        roughness: 0.25,
      });
      routeGroup.add(new THREE.Mesh(tubeGeo, tubeMat));

      const dotGeo = new THREE.SphereGeometry(0.42, 8, 6);
      const dotMat = new THREE.MeshBasicMaterial({ color: '#fef08a' });
      const count = Math.max(2, Math.floor(pts.length / 2));
      const dots = new THREE.InstancedMesh(dotGeo, dotMat, count);
      for (let i = 0; i < count; i++) {
        const p = pts[Math.min(pts.length - 1, i * 2)];
        dummy.position.set(p[0], p[1] + 0.14, p[2]);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 0.6, 1);
        dummy.updateMatrix();
        dots.setMatrixAt(i, dummy.matrix);
      }
      dots.instanceMatrix.needsUpdate = true;
      routeGroup.add(dots);
    }

    // Destination beacon ring at route end
    const destY = groundHeightAt(route.targetX, route.targetZ);
    const destRingGeo = new THREE.RingGeometry(2.8, 3.6, 24);
    destRingGeo.rotateX(-Math.PI / 2);
    const destRing = new THREE.Mesh(
      destRingGeo,
      new THREE.MeshBasicMaterial({
        color: '#facc15',
        side: THREE.DoubleSide,
      }),
    );
    destRing.position.set(route.targetX, destY + 0.28, route.targetZ);
    routeGroup.add(destRing);
  };

  // =========================================================================
  // CAMERA ANIMATION, POINTER TAP-VS-DRAG PICKING & ANTI-OVERLAP LABELS
  // =========================================================================
  let currentSync: MarsMapSyncState | null = null;
  let dirty = true;
  let disposed = false;
  let rafId = 0;
  let animTargetPos: THREE.Vector3 | null = null;
  let animCamOffset: THREE.Vector3 | null = null;
  let lastLabelSig = '';

  const requestRender = () => {
    dirty = true;
  };

  controls.addEventListener('change', () => {
    // Clamp pan target inside explorable Martian terrain
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -205, 205);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -205, 205);
    const groundY = groundHeightAt(controls.target.x, controls.target.z);
    controls.target.y = THREE.MathUtils.clamp(controls.target.y, groundY - 2, groundY + 12);
    requestRender();
  });

  controls.addEventListener('start', () => {
    animTargetPos = null;
    animCamOffset = null;
  });

  // Tap vs Drag disambiguation so rotating/panning never triggers accidental marker clicks
  let pointerDownInfo: { x: number; y: number; time: number; pointerId: number } | null = null;

  const onPointerDown = (ev: PointerEvent) => {
    if (!ev.isPrimary) return;
    pointerDownInfo = {
      x: ev.clientX,
      y: ev.clientY,
      time: performance.now(),
      pointerId: ev.pointerId,
    };
  };

  const onPointerUp = (ev: PointerEvent) => {
    if (!pointerDownInfo || ev.pointerId !== pointerDownInfo.pointerId) return;
    const travel = Math.hypot(ev.clientX - pointerDownInfo.x, ev.clientY - pointerDownInfo.y);
    const elapsedMs = performance.now() - pointerDownInfo.time;
    pointerDownInfo = null;

    if (travel > 9 || elapsedMs > 420) return;

    const rect = renderer.domElement.getBoundingClientRect();
    _pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    _pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    _raycaster.setFromCamera(_pointer, camera);

    const activePickables = pickMeshes.filter((m) => {
      let cur: THREE.Object3D | null = m;
      while (cur) {
        if (!cur.visible) return false;
        cur = cur.parent;
      }
      return true;
    });

    const hits = _raycaster.intersectObjects(activePickables, false);
    if (hits.length > 0) {
      const target = hits[0].object.userData.pickTarget as MapPickTarget | undefined;
      if (target) {
        callbacks.onSelect(target);
      }
    }
  };

  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);

  const isExplored = (x: number, z: number, sync: MarsMapSyncState, linkedKind?: string, linkedId?: string) => {
    const sgx = Math.floor((x + 220) / 55) - 4;
    const sgz = Math.floor((z + 220) / 55) - 4;
    if (sync.exploredSectors.includes(`${sgx},${sgz}`)) return true;
    if (linkedKind === 'landmark' && linkedId && sync.discoveredLandmarks.includes(linkedId)) return true;
    if (linkedKind === 'anomaly' && linkedId && sync.discoveredAnomalies.includes(linkedId)) return true;
    if (linkedKind === 'rover' && linkedId && sync.resolvedRovers.includes(linkedId as LostRoverId)) return true;
    return false;
  };

  const updateProjectedLabels = () => {
    if (!currentSync) return;
    const sync = currentSync;
    const w = renderer.domElement.clientWidth || width;
    const h = renderer.domElement.clientHeight || height;
    const camDist = camera.position.distanceTo(controls.target);

    interface RawLabel {
      key: string;
      text: string;
      subText?: string;
      wx: number;
      wy: number;
      wz: number;
      accentHex: string;
      kind: ProjectedMapLabel['kind'];
      selected: boolean;
      priority: number;
      target: MapPickTarget;
    }

    const candidates: RawLabel[] = [];
    const sel = sync.selectedTarget;
    const isSel = (t: MapPickTarget) => {
      if (!sel || sel.kind !== t.kind) return false;
      if (t.kind === 'mev') return true;
      return 'id' in t && 'id' in sel && t.id === sel.id;
    };

    // Crew & Vehicles
    if (sync.layers.crewVehicles && (sync.filter === 'all' || sync.filter === 'crew')) {
      const px = sync.telemetry?.playerX ?? 0;
      const pz = sync.telemetry?.playerZ ?? 6;
      candidates.push({
        key: 'crew_alex',
        text: 'Alex (You)',
        subText: sync.drivingRover ? 'Driving MEV' : undefined,
        wx: px,
        wy: groundHeightAt(px, pz) + 3.8,
        wz: pz,
        accentHex: '#38bdf8',
        kind: 'crew',
        selected: isSel({ kind: 'crew', id: 'alex' }),
        priority: 100,
        target: { kind: 'crew', id: 'alex' },
      });

      sync.telemetry?.npcStatuses.forEach((npc) => {
        if (sync.unlockedCrewIds && !sync.unlockedCrewIds.includes(npc.id)) return;
        const mPos = crewMarkers[npc.id].position;
        candidates.push({
          key: `crew_${npc.id}`,
          text: `${npc.name} · ${npc.role}`,
          wx: mPos.x,
          wy: mPos.y + 3.4,
          wz: mPos.z,
          accentHex: CHARACTERS_INFO[npc.id].suitColor,
          kind: 'crew',
          selected: isSel({ kind: 'crew', id: npc.id }),
          priority: 88,
          target: { kind: 'crew', id: npc.id },
        });
      });

      const rx = sync.telemetry?.roverX ?? 21.3;
      const rz = sync.telemetry?.roverZ ?? 1.6;
      if (!sync.drivingRover || Math.hypot(rx - px, rz - pz) > 3) {
        candidates.push({
          key: 'mev_vehicle',
          text: sync.evGuideActive ? '6x6 EV (Enter Here!)' : '6x6 MEV',
          subText: sync.telemetry ? `${Math.round(sync.telemetry.vehicleBatteryPct)}%` : undefined,
          wx: rx,
          wy: groundHeightAt(rx, rz) + (sync.evGuideActive ? 5.6 : 3.0),
          wz: rz,
          accentHex: '#fbbf24',
          kind: 'vehicle',
          selected: isSel({ kind: 'mev' }) || Boolean(sync.evGuideActive),
          priority: sync.evGuideActive ? 105 : 85,
          target: { kind: 'mev' },
        });
      }

      LOST_ROVERS.forEach((lr) => {
        const resolved = sync.resolvedRovers.includes(lr.id);
        const trackedNow =
          (sync.missionId === 12 && lr.id === 'sojourner') ||
          (sync.missionId === 13 && lr.id === 'spirit');
        if (!resolved && !trackedNow) return;
        candidates.push({
          key: `rover_${lr.id}`,
          text: lr.name.split(' ')[0],
          subText: resolved ? 'Synced' : 'Signal',
          wx: lr.x,
          wy: groundHeightAt(lr.x, lr.z) + 3.4,
          wz: lr.z,
          accentHex: lr.accentHex,
          kind: 'vehicle',
          selected: isSel({ kind: 'remote_rover', id: lr.id }),
          priority: trackedNow ? 92 : 74,
          target: { kind: 'remote_rover', id: lr.id },
        });
      });
    }

    // Active Optional Exploration & Crew-Help Tasks
    if (
      sync.layers.objectives &&
      sync.activeOptionalIds &&
      sync.activeOptionalIds.length > 0 &&
      (sync.filter === 'all' || sync.filter === 'exploration' || sync.filter === 'optional')
    ) {
      OPTIONAL_TASKS.forEach((task) => {
        if (!sync.activeOptionalIds?.includes(task.id)) return;
        const selectedFlag = isSel({ kind: 'optional', id: task.id });
        if (camDist > 195 && !selectedFlag && sync.filter !== 'optional') return;
        candidates.push({
          key: `opt_${task.id}`,
          text: task.title,
          subText: `+${task.rewardPoints} pts`,
          wx: task.x,
          wy: groundHeightAt(task.x, task.z) + 5.2,
          wz: task.z,
          accentHex: '#22d3ee',
          kind: 'optional',
          selected: selectedFlag,
          priority: selectedFlag ? 97 : sync.filter === 'optional' ? 86 : 72,
          target: { kind: 'optional', id: task.id },
        });
      });
    }

    // Exploration sites
    if (sync.layers.discoveries && (sync.filter === 'all' || sync.filter === 'exploration')) {
      EXPLORATION_MAP_LOCATIONS.forEach((loc) => {
        if (!isExplored(loc.x, loc.z, sync, loc.linkedDiscoveryKind, loc.linkedDiscoveryId)) return;
        const selectedFlag = isSel({ kind: 'location', id: loc.id });
        candidates.push({
          key: `loc_${loc.id}`,
          text: loc.name,
          wx: loc.x,
          wy: groundHeightAt(loc.x, loc.z) + 6.0,
          wz: loc.z,
          accentHex: loc.accentHex,
          kind: 'exploration',
          selected: selectedFlag,
          priority: selectedFlag ? 98 : loc.missionIds.includes(sync.missionId) ? 76 : 62,
          target: { kind: 'location', id: loc.id },
        });
      });
    }

    // Colony Buildings
    if (sync.layers.infrastructure && (sync.filter === 'all' || sync.filter === 'colony')) {
      COLONY_MAP_LOCATIONS.forEach((loc) => {
        const selectedFlag = isSel({ kind: 'location', id: loc.id });
        const isMission = loc.missionIds.includes(sync.missionId);
        // At very wide orbital zoom, keep priority colony landmarks + mission/selected buildings
        if (camDist > 165 && !selectedFlag && !isMission && loc.id !== 'crew_home' && loc.id !== 'charging_station' && loc.id !== 'greenhouse') {
          return;
        }
        candidates.push({
          key: `loc_${loc.id}`,
          text: loc.name,
          wx: loc.x,
          wy: groundHeightAt(loc.x, loc.z) + 4.4,
          wz: loc.z,
          accentHex: loc.accentHex,
          kind: 'colony',
          selected: selectedFlag,
          priority: selectedFlag ? 99 : isMission ? 82 : loc.id === 'crew_home' ? 78 : 52,
          target: { kind: 'location', id: loc.id },
        });
      });
    }

    // Sort highest priority first, project to screen, and perform non-overlapping box placement
    candidates.sort((a, b) => b.priority - a.priority);
    const placedBoxes: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    const out: ProjectedMapLabel[] = [];
    const nudgeOffsets: Array<[number, number]> = [
      [0, 0],
      [0, -22],
      [0, 22],
      [-58, -14],
      [58, -14],
      [-58, 16],
      [58, 16],
    ];

    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      _projVec.set(c.wx, c.wy, c.wz).project(camera);
      if (_projVec.z < -1 || _projVec.z > 1) continue;
      const sx = (_projVec.x * 0.5 + 0.5) * w;
      const sy = (-_projVec.y * 0.5 + 0.5) * h;
      if (sx < 30 || sx > w - 30 || sy < 20 || sy > h - 20) continue;

      const boxW = Math.min(148, c.text.length * 6.4 + 24);
      const boxH = c.subText ? 26 : 20;

      let chosen: [number, number] | null = null;
      for (let oi = 0; oi < nudgeOffsets.length; oi++) {
        const px = sx + nudgeOffsets[oi][0];
        const py = sy + nudgeOffsets[oi][1];
        if (px - boxW * 0.5 < 8 || px + boxW * 0.5 > w - 8 || py - boxH < 8 || py > h - 8) continue;
        const x1 = px - boxW * 0.5 - 3;
        const x2 = px + boxW * 0.5 + 3;
        const y1 = py - boxH - 2;
        const y2 = py + 2;

        let overlaps = false;
        for (let bi = 0; bi < placedBoxes.length; bi++) {
          const b = placedBoxes[bi];
          if (x1 < b.x2 && x2 > b.x1 && y1 < b.y2 && y2 > b.y1) {
            overlaps = true;
            break;
          }
        }
        if (!overlaps) {
          chosen = [px, py];
          placedBoxes.push({ x1, y1, x2, y2 });
          break;
        }
      }

      if (chosen) {
        out.push({
          key: c.key,
          text: c.text,
          subText: c.subText,
          x: Math.round(chosen[0]),
          y: Math.round(chosen[1]),
          accentHex: c.accentHex,
          kind: c.kind,
          selected: c.selected,
          target: c.target,
        });
      }
    }

    const sig = out.map((l) => `${l.key}:${l.x},${l.y},${l.selected ? 1 : 0}`).join('|');
    if (sig !== lastLabelSig) {
      lastLabelSig = sig;
      callbacks.onLabelsUpdate(out);
    }
  };

  const applySyncToScene = (sync: MarsMapSyncState) => {
    // Layer visibility
    terrainGroup.visible = sync.layers.terrain;
    contourGroup.visible = sync.layers.contours;
    geologyGroup.visible = sync.layers.geology;
    infrastructureGroup.visible = sync.layers.infrastructure;
    discoveriesGroup.visible = sync.layers.discoveries;
    crewVehiclesGroup.visible = sync.layers.crewVehicles;
    objectivesGroup.visible = sync.layers.objectives;
    routeGroup.visible = sync.layers.objectives || Boolean(sync.activeRoute);

    // Filter visibility on colony buildings
    const showColony = sync.filter === 'all' || sync.filter === 'colony';
    buildingRecords.forEach(({ lod, ring }, id) => {
      lod.visible = showColony;
      const loc = COLONY_MAP_LOCATIONS.find((l) => l.id === id);
      ring.visible = Boolean(showColony && sync.layers.objectives && loc?.missionIds.includes(sync.missionId));
    });

    // Fog-of-war sectors
    sectorVeils.forEach(({ key, mesh }) => {
      mesh.visible = !sync.exploredSectors.includes(key);
    });

    // Exploration sites
    const showExp = sync.filter === 'all' || sync.filter === 'exploration';
    explorationNodes.forEach((grp, id) => {
      const loc = EXPLORATION_MAP_LOCATIONS.find((l) => l.id === id);
      if (!loc) return;
      grp.visible = showExp && isExplored(loc.x, loc.z, sync, loc.linkedDiscoveryKind, loc.linkedDiscoveryId);
    });
    landmarkFlags.forEach((grp, id) => {
      grp.visible = showExp && sync.discoveredLandmarks.includes(id);
    });
    anomalyMarkers.forEach((grp, id) => {
      grp.visible = showExp && sync.discoveredAnomalies.includes(id);
    });

    // Crew Positions with automatic anti-clustering spread when co-located
    const px = sync.telemetry?.playerX ?? 0;
    const pz = sync.telemetry?.playerZ ?? 6;
    const headingYaw = sync.drivingRover
      ? sync.telemetry?.roverYaw ?? 0
      : sync.telemetry?.playerYaw ?? 0;
    crewMarkers.alex.position.set(px, groundHeightAt(px, pz), pz);
    crewMarkers.alex.rotation.y = headingYaw;
    const showCrew = sync.filter === 'all' || sync.filter === 'crew';
    crewMarkers.alex.visible = showCrew;

    const placedCrew: Array<{ x: number; z: number }> = [{ x: px, z: pz }];
    (['leo', 'maya', 'zara', 'ryan'] as CrewNpcId[]).forEach((cid) => {
      const unlocked = !sync.unlockedCrewIds || sync.unlockedCrewIds.includes(cid);
      const npc = sync.telemetry?.npcStatuses.find((n) => n.id === cid);
      const marker = crewMarkers[cid];
      if (!unlocked || !npc || !showCrew) {
        marker.visible = false;
        return;
      }
      marker.visible = true;
      let mx = npc.x;
      let mz = npc.z;
      let overlapCount = 0;
      for (let i = 0; i < placedCrew.length; i++) {
        if (Math.hypot(mx - placedCrew[i].x, mz - placedCrew[i].z) < 2.2) {
          overlapCount++;
        }
      }
      if (overlapCount > 0) {
        const ang = (overlapCount * Math.PI * 2) / 4 + 0.4;
        mx += Math.cos(ang) * 1.85;
        mz += Math.sin(ang) * 1.85;
      }
      placedCrew.push({ x: mx, z: mz });
      marker.position.set(mx, groundHeightAt(mx, mz), mz);
    });

    // 6x6 MEV
    const rx = sync.telemetry?.roverX ?? 21.3;
    const rz = sync.telemetry?.roverZ ?? 1.6;
    mevGroup.position.set(rx, groundHeightAt(rx, rz), rz);
    mevGroup.rotation.y = sync.telemetry?.roverYaw ?? -Math.PI * 0.5;
    mevGroup.visible = Boolean(sync.evGuideActive) || showCrew || sync.filter === 'colony';
    mevHighlightGroup.visible = Boolean(sync.evGuideActive && !sync.drivingRover);

    // Remote rovers (resolved or tracked)
    remoteRoverGroups.forEach(({ group: rg, mat }, lid) => {
      const resolved = sync.resolvedRovers.includes(lid);
      const tracked =
        (sync.missionId === 12 && lid === 'sojourner') ||
        (sync.missionId === 13 && lid === 'spirit');
      rg.visible = (resolved || tracked) && (showExp || sync.filter === 'crew');
      mat.emissiveIntensity = resolved ? 0.55 : 0.9;
    });

    // Optional Tasks visibility
    const showOptional =
      sync.filter === 'all' || sync.filter === 'exploration' || sync.filter === 'optional';
    optionalNodes.forEach((og, id) => {
      og.visible = Boolean(
        showOptional && sync.activeOptionalIds && sync.activeOptionalIds.includes(id),
      );
    });

    // Active Mission Objective Beacon
    if (sync.activeTargetPos && sync.layers.objectives) {
      const [ox, oz] = sync.activeTargetPos;
      objectiveGroup.position.set(ox, groundHeightAt(ox, oz), oz);
      objectiveGroup.visible = true;
    } else {
      objectiveGroup.visible = false;
    }

    // Selection Ring
    selectionRing.visible = false;
    if (sync.selectedTarget) {
      const t = sync.selectedTarget;
      let sx: number | null = null;
      let sz: number | null = null;
      if (t.kind === 'location') {
        const loc =
          COLONY_MAP_LOCATIONS.find((l) => l.id === t.id) ??
          EXPLORATION_MAP_LOCATIONS.find((l) => l.id === t.id);
        if (loc) {
          sx = loc.x;
          sz = loc.z;
        }
      } else if (t.kind === 'crew') {
        const mPos = crewMarkers[t.id].position;
        sx = mPos.x;
        sz = mPos.z;
      } else if (t.kind === 'mev') {
        sx = mevGroup.position.x;
        sz = mevGroup.position.z;
      } else if (t.kind === 'remote_rover') {
        const lr = LOST_ROVERS.find((r) => r.id === t.id);
        if (lr) {
          sx = lr.x;
          sz = lr.z;
        }
      } else if (t.kind === 'optional') {
        const task = OPTIONAL_TASKS.find((o) => o.id === t.id);
        if (task) {
          sx = task.x;
          sz = task.z;
        }
      }
      if (sx !== null && sz !== null) {
        selectionRing.position.set(sx, groundHeightAt(sx, sz) + 0.3, sz);
        selectionRing.visible = true;
      }
    }

    // 3D Terrain-Following Route
    rebuildRouteVisuals(sync.activeRoute);
    requestRender();
  };

  // Smooth Camera Focus Helper
  const focusPoint = (x: number, z: number, distance = 58) => {
    const ty = groundHeightAt(x, z);
    animTargetPos = new THREE.Vector3(x, ty, z);
    const dir = camera.position.clone().sub(controls.target);
    if (dir.lengthSq() < 1) dir.set(0, 1, 1);
    dir.normalize().multiplyScalar(THREE.MathUtils.clamp(distance, 18, 290));
    if (dir.y < distance * 0.45) dir.y = distance * 0.62;
    animCamOffset = dir;
    requestRender();
  };

  const resetView = () => {
    animTargetPos = new THREE.Vector3(0, groundHeightAt(0, 0), 0);
    animCamOffset = new THREE.Vector3(0, 118, 128);
    requestRender();
  };

  const setColonyView = () => {
    animTargetPos = new THREE.Vector3(0, groundHeightAt(0, 0), 0);
    animCamOffset = new THREE.Vector3(24, 40, 44);
    requestRender();
  };

  const rotateBy = (deltaYawRad: number) => {
    animTargetPos = null;
    animCamOffset = null;
    const offset = camera.position.clone().sub(controls.target);
    offset.applyAxisAngle(THREE.Object3D.DEFAULT_UP, deltaYawRad);
    camera.position.copy(controls.target).add(offset);
    camera.lookAt(controls.target);
    requestRender();
  };

  const tiltBy = (deltaPolarRad: number) => {
    animTargetPos = null;
    animCamOffset = null;
    const offset = camera.position.clone().sub(controls.target);
    const sph = new THREE.Spherical().setFromVector3(offset);
    sph.phi = THREE.MathUtils.clamp(sph.phi + deltaPolarRad, controls.minPolarAngle, controls.maxPolarAngle);
    offset.setFromSpherical(sph);
    camera.position.copy(controls.target).add(offset);
    camera.lookAt(controls.target);
    requestRender();
  };

  const zoomBy = (factor: number) => {
    animTargetPos = null;
    animCamOffset = null;
    const offset = camera.position.clone().sub(controls.target);
    const len = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);
    offset.setLength(len);
    camera.position.copy(controls.target).add(offset);
    camera.lookAt(controls.target);
    requestRender();
  };

  const setTouchMode = (mode: 'rotate' | 'pan') => {
    controls.touches.ONE = mode === 'rotate' ? THREE.TOUCH.ROTATE : THREE.TOUCH.PAN;
  };

  // ResizeObserver for crisp layout transitions
  const ro = new ResizeObserver(() => {
    if (disposed) return;
    const nw = Math.max(120, container.clientWidth);
    const nh = Math.max(120, container.clientHeight);
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
    requestRender();
  });
  ro.observe(container);

  // Render Loop (on-demand + smooth damping; software-GL paced)
  const loop = () => {
    if (disposed) return;
    if (animTargetPos && animCamOffset) {
      controls.target.lerp(animTargetPos, 0.14);
      const desiredCam = animTargetPos.clone().add(animCamOffset);
      camera.position.lerp(desiredCam, 0.14);
      if (
        controls.target.distanceToSquared(animTargetPos) < 0.04 &&
        camera.position.distanceToSquared(desiredCam) < 0.08
      ) {
        controls.target.copy(animTargetPos);
        camera.position.copy(desiredCam);
        animTargetPos = null;
        animCamOffset = null;
      }
      dirty = true;
    }

    const moved = controls.update();
    if (moved || dirty) {
      dirty = false;
      renderer.render(scene, camera);
      updateProjectedLabels();
    }

    if (isSoftwareGl) {
      setTimeout(() => {
        if (!disposed) rafId = requestAnimationFrame(loop);
      }, 48);
    } else {
      rafId = requestAnimationFrame(loop);
    }
  };
  rafId = requestAnimationFrame(loop);

  return {
    setSyncState: (state) => {
      currentSync = state;
      applySyncToScene(state);
    },
    focusPoint,
    resetView,
    setColonyView,
    rotateBy,
    tiltBy,
    zoomBy,
    setTouchMode,
    requestRender,
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      clearRouteVisuals();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

// =========================================================================
// COMPACT 3D TERRAIN MINIMAP RENDERER (SYNCHRONIZED 1:1 WITH WORLD)
// =========================================================================

export interface Mars3DMinimapState {
  telemetry: EnvironmentTelemetry;
  missionId: number;
  drivingRover: boolean;
  resolvedRovers: LostRoverId[];
  discoveredLandmarks: string[];
  unlockedCrewIds?: CrewNpcId[];
  activeOptionalIds?: string[];
  activeTargetPos: [number, number] | null;
  activeRoute: NavigationRoute | null;
  viewRadiusM: number;
  paused: boolean;
  evGuideActive?: boolean;
}

export interface Mars3DMinimapController {
  updateState: (state: Mars3DMinimapState) => void;
  resize: (size: number) => void;
  dispose: () => void;
}

export function createMars3DMinimapController(
  container: HTMLElement,
  initialSize: number,
): Mars3DMinimapController {
  const isSoftwareGl = detectSoftwareWebGL();
  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: 'low-power',
  });
  renderer.setSize(initialSize, initialSize);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.5));
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#22110c');
  scene.fog = new THREE.FogExp2('#22110c', 0.0022);

  const camera = new THREE.PerspectiveCamera(40, 1, 2, 420);

  const hemi = new THREE.HemisphereLight('#f6b793', '#2d1a16', 1.15);
  const sun = new THREE.DirectionalLight('#fff1e0', 2.0);
  sun.position.set(110, 150, 90);
  scene.add(hemi, sun);

  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(d: T): T => {
    disposables.push(d);
    return d;
  };

  // Lightweight 3D Terrain Mesh + Contours
  const tGeo = track(buildMarsTerrainMeshGeometry(520, 96));
  const tMat = track(
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.04,
    }),
  );
  scene.add(new THREE.Mesh(tGeo, tMat));

  const cLevels: number[] = [];
  for (let h = -3; h <= 21; h += 3) cLevels.push(h);
  const cGeo = track(buildContourGeometry(240, 72, cLevels, 0.14));
  scene.add(
    new THREE.LineSegments(
      cGeo,
      track(new THREE.LineBasicMaterial({ color: '#fb923c', transparent: true, opacity: 0.35 })),
    ),
  );

  // Colony building silhouettes
  const darkMat = track(new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.7 }));
  COLONY_MAP_LOCATIONS.forEach((loc) => {
    const bMat = track(
      new THREE.MeshStandardMaterial({
        color: loc.accentHex,
        emissive: loc.accentHex,
        emissiveIntensity: 0.28,
        roughness: 0.45,
      }),
    );
    const base = new THREE.Mesh(track(new THREE.CylinderGeometry(2.6, 2.9, 1.8, 10)), darkMat);
    const roof = new THREE.Mesh(track(new THREE.CylinderGeometry(2.1, 2.4, 0.65, 10)), bMat);
    const gy = groundHeightAt(loc.x, loc.z);
    base.position.set(loc.x, gy + 0.9, loc.z);
    roof.position.set(loc.x, gy + 2.0, loc.z);
    scene.add(base, roof);
  });

  // Player marker + heading cone
  const playerMarker = new THREE.Group();
  const pDot = new THREE.Mesh(
    track(new THREE.SphereGeometry(1.6, 12, 10)),
    track(new THREE.MeshBasicMaterial({ color: '#ffffff' })),
  );
  pDot.position.y = 1.6;
  const pRing = new THREE.Mesh(
    track(new THREE.RingGeometry(1.9, 2.7, 16)),
    track(new THREE.MeshBasicMaterial({ color: '#38bdf8', side: THREE.DoubleSide })),
  );
  pRing.rotation.x = -Math.PI / 2;
  pRing.position.y = 0.35;
  const coneGeo = track(new THREE.CircleGeometry(10.5, 14, -Math.PI / 2 - 0.38, 0.76));
  coneGeo.rotateX(-Math.PI / 2);
  const cone = new THREE.Mesh(
    coneGeo,
    track(
      new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    ),
  );
  cone.position.y = 0.28;
  playerMarker.add(pDot, pRing, cone);
  scene.add(playerMarker);

  // MEV marker
  const mevMarker = new THREE.Mesh(
    track(new THREE.BoxGeometry(2.8, 1.8, 4.0)),
    track(new THREE.MeshBasicMaterial({ color: '#fbbf24' })),
  );
  const mevGuideRing = new THREE.Mesh(
    track(new THREE.RingGeometry(2.8, 4.0, 20)),
    track(new THREE.MeshBasicMaterial({ color: '#fde047', side: THREE.DoubleSide })),
  );
  mevGuideRing.rotation.x = -Math.PI / 2;
  mevGuideRing.position.y = 0.2;
  mevGuideRing.visible = false;
  mevMarker.add(mevGuideRing);
  scene.add(mevMarker);

  // Crew NPC markers
  const npcDots: Record<CrewNpcId, THREE.Mesh> = {
    leo: new THREE.Mesh(
      track(new THREE.SphereGeometry(1.25, 10, 8)),
      track(new THREE.MeshBasicMaterial({ color: CHARACTERS_INFO.leo.suitColor })),
    ),
    maya: new THREE.Mesh(
      track(new THREE.SphereGeometry(1.25, 10, 8)),
      track(new THREE.MeshBasicMaterial({ color: CHARACTERS_INFO.maya.suitColor })),
    ),
    zara: new THREE.Mesh(
      track(new THREE.SphereGeometry(1.25, 10, 8)),
      track(new THREE.MeshBasicMaterial({ color: CHARACTERS_INFO.zara.suitColor })),
    ),
    ryan: new THREE.Mesh(
      track(new THREE.SphereGeometry(1.25, 10, 8)),
      track(new THREE.MeshBasicMaterial({ color: CHARACTERS_INFO.ryan.suitColor })),
    ),
  };
  (Object.keys(npcDots) as CrewNpcId[]).forEach((k) => scene.add(npcDots[k]));

  // Active Objective Marker
  const objBeacon = new THREE.Mesh(
    track(new THREE.OctahedronGeometry(2.1, 0)),
    track(new THREE.MeshBasicMaterial({ color: '#fde047' })),
  );
  objBeacon.visible = false;
  scene.add(objBeacon);

  // Remote rover markers
  const roverPins = new Map<LostRoverId, THREE.Mesh>();
  LOST_ROVERS.forEach((lr) => {
    const m = new THREE.Mesh(
      track(new THREE.OctahedronGeometry(1.8, 0)),
      track(new THREE.MeshBasicMaterial({ color: lr.accentHex })),
    );
    m.position.set(lr.x, groundHeightAt(lr.x, lr.z) + 2.4, lr.z);
    m.visible = false;
    scene.add(m);
    roverPins.set(lr.id, m);
  });

  // Discovered landmark markers
  const landmarkPins = new Map<string, THREE.Mesh>();
  MARS_LANDMARKS.forEach((lm) => {
    const m = new THREE.Mesh(
      track(new THREE.ConeGeometry(1.5, 3.0, 4)),
      track(new THREE.MeshBasicMaterial({ color: '#38bdf8' })),
    );
    m.position.set(lm.x, groundHeightAt(lm.x, lm.z) + 1.8, lm.z);
    m.visible = false;
    scene.add(m);
    landmarkPins.set(lm.id, m);
  });

  // Active optional task markers on minimap
  const optionalPins = new Map<string, THREE.Mesh>();
  const miniOptGeo = track(new THREE.OctahedronGeometry(1.5, 0));
  const miniOptMat = track(new THREE.MeshBasicMaterial({ color: '#22d3ee' }));
  OPTIONAL_TASKS.forEach((task) => {
    const m = new THREE.Mesh(miniOptGeo, miniOptMat);
    m.position.set(task.x, groundHeightAt(task.x, task.z) + 2.2, task.z);
    m.visible = false;
    scene.add(m);
    optionalPins.set(task.id, m);
  });

  // Terrain-following route tube
  const routeHolder = new THREE.Group();
  scene.add(routeHolder);
  let lastRouteKey = '';

  const clearRoute = () => {
    while (routeHolder.children.length > 0) {
      const m = routeHolder.children[0] as THREE.Mesh;
      routeHolder.remove(m);
      m.geometry?.dispose();
      if (Array.isArray(m.material)) m.material.forEach((x) => x.dispose());
      else m.material?.dispose();
    }
  };

  let latestState: Mars3DMinimapState | null = null;
  let disposed = false;
  let timerId = 0;

  const renderMinimap = () => {
    if (disposed || !latestState || latestState.paused) return;
    const st = latestState;
    const tel = st.telemetry;
    const py = groundHeightAt(tel.playerX, tel.playerZ);

    playerMarker.position.set(tel.playerX, py, tel.playerZ);
    playerMarker.rotation.y = st.drivingRover ? tel.roverYaw : tel.playerYaw;

    mevMarker.position.set(tel.roverX, groundHeightAt(tel.roverX, tel.roverZ) + 1.0, tel.roverZ);
    mevMarker.rotation.y = tel.roverYaw;
    mevGuideRing.visible = Boolean(st.evGuideActive && !st.drivingRover);

    tel.npcStatuses.forEach((npc) => {
      const dot = npcDots[npc.id];
      if (!dot) return;
      const unlocked = !st.unlockedCrewIds || st.unlockedCrewIds.includes(npc.id);
      dot.visible = unlocked;
      if (unlocked) dot.position.set(npc.x, groundHeightAt(npc.x, npc.z) + 1.4, npc.z);
    });

    if (st.activeTargetPos) {
      objBeacon.position.set(
        st.activeTargetPos[0],
        groundHeightAt(st.activeTargetPos[0], st.activeTargetPos[1]) + 3.2,
        st.activeTargetPos[1],
      );
      objBeacon.visible = true;
    } else {
      objBeacon.visible = false;
    }

    roverPins.forEach((m, id) => {
      const resolved = st.resolvedRovers.includes(id);
      const tracked =
        (st.missionId === 12 && id === 'sojourner') ||
        (st.missionId === 13 && id === 'spirit');
      m.visible = resolved || tracked;
    });

    landmarkPins.forEach((m, id) => {
      m.visible = st.discoveredLandmarks.includes(id);
    });

    optionalPins.forEach((m, id) => {
      m.visible = Boolean(st.activeOptionalIds && st.activeOptionalIds.includes(id));
    });

    const nextRKey = st.activeRoute
      ? `${st.activeRoute.destinationId}|${st.activeRoute.mode}|${st.activeRoute.waypoints.map((w) => `${w[0].toFixed(0)},${w[1].toFixed(0)}`).join(';')}`
      : '';
    if (nextRKey !== lastRouteKey) {
      lastRouteKey = nextRKey;
      clearRoute();
      if (st.activeRoute && st.activeRoute.waypoints.length >= 2) {
        const pts3d = sampleTerrainRoutePoints3D(st.activeRoute.waypoints, 2.5, 0.45);
        const curve = new THREE.CatmullRomCurve3(
          pts3d.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
        );
        const geo = new THREE.TubeGeometry(curve, Math.max(16, pts3d.length), 0.78, 5, false);
        const mat = new THREE.MeshBasicMaterial({
          color: '#facc15',
        });
        routeHolder.add(new THREE.Mesh(geo, mat));
      }
    }

    // Tilted 3D North-up perspective over the player showing mountains & valleys around them
    const camHeight = st.viewRadiusM * 1.15;
    const camBackZ = st.viewRadiusM * 0.72;
    camera.position.set(tel.playerX, py + camHeight, tel.playerZ + camBackZ);
    camera.lookAt(tel.playerX, py, tel.playerZ);
    renderer.render(scene, camera);
  };

  // Throttled 10fps render cadence for lightweight HUD minimap
  timerId = window.setInterval(renderMinimap, isSoftwareGl ? 140 : 95);

  return {
    updateState: (state) => {
      const wasNull = !latestState;
      latestState = state;
      if (wasNull) renderMinimap();
    },
    resize: (size) => {
      if (disposed) return;
      renderer.setSize(size, size);
      renderMinimap();
    },
    dispose: () => {
      disposed = true;
      window.clearInterval(timerId);
      clearRoute();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

