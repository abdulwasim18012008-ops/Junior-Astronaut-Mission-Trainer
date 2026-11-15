import * as THREE from 'three';
import {
  groundHeightAt,
  NAMED_CRATERS,
  TerrainObstacle,
} from './lunarTerrain';

const GRID_MIN = -456;
const GRID_MAX = 456;
const CELL_SIZE = 6;
const GRID_N = Math.floor((GRID_MAX - GRID_MIN) / CELL_SIZE) + 1; // 153
const TOTAL_CELLS = GRID_N * GRID_N;
const MAX_RIBBON_POINTS = 560;

export interface NavCollider {
  x: number;
  z: number;
  radius: number;
}

function worldToGrid(v: number): number {
  return THREE.MathUtils.clamp(Math.round((v - GRID_MIN) / CELL_SIZE), 0, GRID_N - 1);
}

function gridToWorld(g: number): number {
  return GRID_MIN + g * CELL_SIZE;
}

export class LunarNavGrid {
  private blocked = new Uint8Array(TOTAL_CELLS);
  private baseCost = new Float32Array(TOTAL_CELLS);
  private craterIdx = new Int8Array(TOTAL_CELLS);

  // Reusable A* scratch buffers (zero GC per search)
  private gScore = new Float32Array(TOTAL_CELLS);
  private closed = new Uint8Array(TOTAL_CELLS);
  private cameFrom = new Int32Array(TOTAL_CELLS);
  private heap = new Int32Array(TOTAL_CELLS);
  private heapF = new Float32Array(TOTAL_CELLS);
  private heapPos = new Int32Array(TOTAL_CELLS);

  constructor(colliders: NavCollider[], rockObstacles: TerrainObstacle[]) {
    this.craterIdx.fill(-1);
    this.baseCost.fill(1);

    // 1. Precompute terrain slope & crater penalties
    for (let gz = 0; gz < GRID_N; gz++) {
      const wz = gridToWorld(gz);
      for (let gx = 0; gx < GRID_N; gx++) {
        const wx = gridToWorld(gx);
        const idx = gz * GRID_N + gx;

        if (Math.hypot(wx, wz) > 452) {
          this.blocked[idx] = 1;
          continue;
        }

        const hC = groundHeightAt(wx, wz);
        const hR = groundHeightAt(wx + 2.5, wz);
        const hU = groundHeightAt(wx, wz + 2.5);
        const slope = Math.hypot(hR - hC, hU - hC) / 2.5;
        let cost = 1 + slope * 3.8;
        if (slope > 0.72) {
          cost += 18;
        }

        for (let ci = 0; ci < NAMED_CRATERS.length; ci++) {
          const c = NAMED_CRATERS[ci];
          const d = Math.hypot(wx - c.x, wz - c.z);
          if (d < c.radius * 0.92) {
            this.craterIdx[idx] = ci;
            break;
          }
        }
        this.baseCost[idx] = cost;
      }
    }

    // 2. Mark building colliders & rockfall pass + soft proximity buffer
    const stampObstacle = (ox: number, oz: number, r: number, hardPad: number, softPad: number, softWeight: number) => {
      const minGx = worldToGrid(ox - r - softPad);
      const maxGx = worldToGrid(ox + r + softPad);
      const minGz = worldToGrid(oz - r - softPad);
      const maxGz = worldToGrid(oz + r + softPad);
      for (let gz = minGz; gz <= maxGz; gz++) {
        const wz = gridToWorld(gz);
        for (let gx = minGx; gx <= maxGx; gx++) {
          const wx = gridToWorld(gx);
          const d = Math.hypot(wx - ox, wz - oz);
          const idx = gz * GRID_N + gx;
          if (d < r + hardPad) {
            this.blocked[idx] = 1;
          } else if (d < r + softPad) {
            const t = 1 - (d - (r + hardPad)) / (softPad - hardPad);
            this.baseCost[idx] += t * softWeight;
          }
        }
      }
    };

    for (const c of colliders) {
      stampObstacle(c.x, c.z, c.radius, 1.5, 4.2, 6.0);
    }

    // Rockfall pass boulders at (55, 195)
    stampObstacle(55, 195, 6.5, 1.6, 5.0, 7.0);

    // Placed rocks & basalt outcrops
    for (const r of rockObstacles) {
      stampObstacle(r.x, r.z, r.radius, 0.75, 2.6, 4.5);
    }
  }

  private findNearestWalkableCell(gx: number, gz: number): number {
    const startIdx = gz * GRID_N + gx;
    if (!this.blocked[startIdx]) return startIdx;
    for (let rad = 1; rad <= 5; rad++) {
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let dz = -rad; dz <= rad; dz++) {
        for (let dx = -rad; dx <= rad; dx++) {
          const nx = gx + dx;
          const nz = gz + dz;
          if (nx < 0 || nx >= GRID_N || nz < 0 || nz >= GRID_N) continue;
          const idx = nz * GRID_N + nx;
          if (!this.blocked[idx]) {
            const d = dx * dx + dz * dz;
            if (d < bestDist) {
              bestDist = d;
              bestIdx = idx;
            }
          }
        }
      }
      if (bestIdx !== -1) return bestIdx;
    }
    return startIdx;
  }

  private isSegmentClear(
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    allowedCraterA: number,
    allowedCraterB: number,
  ): boolean {
    const dist = Math.hypot(x2 - x1, z2 - z1);
    const steps = Math.max(2, Math.ceil(dist / 2.2));
    for (let i = 1; i < steps; i++) {
      const u = i / steps;
      const sx = x1 + (x2 - x1) * u;
      const sz = z1 + (z2 - z1) * u;
      const gx = worldToGrid(sx);
      const gz = worldToGrid(sz);
      const idx = gz * GRID_N + gx;
      if (this.blocked[idx]) return false;
      const ci = this.craterIdx[idx];
      if (ci !== -1 && ci !== allowedCraterA && ci !== allowedCraterB) {
        return false;
      }
      if (this.baseCost[idx] > 4.5) return false;
    }
    return true;
  }

  public findPath(
    startX: number,
    startZ: number,
    goalX: number,
    goalZ: number,
  ): Array<[number, number]> {
    const sCell = this.findNearestWalkableCell(worldToGrid(startX), worldToGrid(startZ));
    const gCell = this.findNearestWalkableCell(worldToGrid(goalX), worldToGrid(goalZ));

    if (sCell === gCell || Math.hypot(goalX - startX, goalZ - startZ) < 5.5) {
      return [
        [startX, startZ],
        [goalX, goalZ],
      ];
    }

    const allowedCraterStart = this.craterIdx[sCell];
    const allowedCraterGoal = this.craterIdx[gCell];

    this.gScore.fill(Infinity);
    this.closed.fill(0);
    this.cameFrom.fill(-1);
    this.heapPos.fill(-1);

    let heapSize = 0;
    const heapSwap = (i: number, j: number) => {
      const ci = this.heap[i];
      const cj = this.heap[j];
      const fi = this.heapF[i];
      const fj = this.heapF[j];
      this.heap[i] = cj;
      this.heap[j] = ci;
      this.heapF[i] = fj;
      this.heapF[j] = fi;
      this.heapPos[cj] = i;
      this.heapPos[ci] = j;
    };
    const heapPushOrUpdate = (cell: number, f: number) => {
      let i = this.heapPos[cell];
      if (i === -1) {
        i = heapSize++;
        this.heap[i] = cell;
        this.heapF[i] = f;
        this.heapPos[cell] = i;
      } else {
        this.heapF[i] = f;
      }
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (this.heapF[p] <= this.heapF[i]) break;
        heapSwap(i, p);
        i = p;
      }
    };
    const heapPop = (): number => {
      const top = this.heap[0];
      this.heapPos[top] = -1;
      heapSize--;
      if (heapSize > 0) {
        this.heap[0] = this.heap[heapSize];
        this.heapF[0] = this.heapF[heapSize];
        this.heapPos[this.heap[0]] = 0;
        let i = 0;
        while (true) {
          const l = i * 2 + 1;
          const r = l + 1;
          let smallest = i;
          if (l < heapSize && this.heapF[l] < this.heapF[smallest]) smallest = l;
          if (r < heapSize && this.heapF[r] < this.heapF[smallest]) smallest = r;
          if (smallest === i) break;
          heapSwap(i, smallest);
          i = smallest;
        }
      }
      return top;
    };

    const gGx = gCell % GRID_N;
    const gGz = Math.floor(gCell / GRID_N);
    const heuristic = (gx: number, gz: number) => {
      const dx = Math.abs(gx - gGx);
      const dz = Math.abs(gz - gGz);
      return (dx + dz + (1.41421356 - 2) * Math.min(dx, dz));
    };

    this.gScore[sCell] = 0;
    heapPushOrUpdate(sCell, heuristic(sCell % GRID_N, Math.floor(sCell / GRID_N)));

    const dirs: ReadonlyArray<[number, number, number]> = [
      [1, 0, 1],
      [-1, 0, 1],
      [0, 1, 1],
      [0, -1, 1],
      [1, 1, 1.41421356],
      [-1, 1, 1.41421356],
      [1, -1, 1.41421356],
      [-1, -1, 1.41421356],
    ];

    let found = false;
    while (heapSize > 0) {
      const cur = heapPop();
      if (cur === gCell) {
        found = true;
        break;
      }
      this.closed[cur] = 1;
      const cx = cur % GRID_N;
      const cz = Math.floor(cur / GRID_N);
      const curG = this.gScore[cur];

      for (let d = 0; d < 8; d++) {
        const [dx, dz, stepLen] = dirs[d];
        const nx = cx + dx;
        const nz = cz + dz;
        if (nx < 0 || nx >= GRID_N || nz < 0 || nz >= GRID_N) continue;
        const nIdx = nz * GRID_N + nx;
        if (this.closed[nIdx] || this.blocked[nIdx]) continue;
        // Prevent corner cutting across blocked diagonals
        if (dx !== 0 && dz !== 0) {
          if (this.blocked[cz * GRID_N + nx] || this.blocked[nz * GRID_N + cx]) continue;
        }

        let cellCost = this.baseCost[nIdx];
        const ci = this.craterIdx[nIdx];
        if (ci !== -1 && ci !== allowedCraterStart && ci !== allowedCraterGoal) {
          // Strongly route around unrelated craters along the way
          cellCost += 28;
        }

        const tentativeG = curG + stepLen * cellCost;
        if (tentativeG < this.gScore[nIdx]) {
          this.cameFrom[nIdx] = cur;
          this.gScore[nIdx] = tentativeG;
          heapPushOrUpdate(nIdx, tentativeG + heuristic(nx, nz));
        }
      }
    }

    if (!found) {
      return [
        [startX, startZ],
        [goalX, goalZ],
      ];
    }

    // Reconstruct raw grid waypoints
    const raw: Array<[number, number]> = [];
    let trace = gCell;
    while (trace !== -1) {
      const tx = trace % GRID_N;
      const tz = Math.floor(trace / GRID_N);
      raw.push([gridToWorld(tx), gridToWorld(tz)]);
      if (trace === sCell) break;
      trace = this.cameFrom[trace];
    }
    raw.reverse();
    raw[0] = [startX, startZ];
    raw[raw.length - 1] = [goalX, goalZ];

    // String-pull smoothing preserving obstacle/crater clearance
    const smoothed: Array<[number, number]> = [raw[0]];
    let anchor = 0;
    while (anchor < raw.length - 1) {
      let furthest = anchor + 1;
      for (let test = raw.length - 1; test > anchor + 1; test--) {
        if (
          this.isSegmentClear(
            raw[anchor][0],
            raw[anchor][1],
            raw[test][0],
            raw[test][1],
            allowedCraterStart,
            allowedCraterGoal,
          )
        ) {
          furthest = test;
          break;
        }
      }
      smoothed.push(raw[furthest]);
      anchor = furthest;
    }

    // Subdivide long segments slightly so Catmull-Rom doesn't bow into obstacles
    const controlPts: THREE.Vector3[] = [];
    for (let i = 0; i < smoothed.length; i++) {
      const [ax, az] = smoothed[i];
      controlPts.push(new THREE.Vector3(ax, 0, az));
      if (i < smoothed.length - 1) {
        const [bx, bz] = smoothed[i + 1];
        const segLen = Math.hypot(bx - ax, bz - az);
        if (segLen > 24) {
          const subs = Math.ceil(segLen / 18);
          for (let s = 1; s < subs; s++) {
            const u = s / subs;
            controlPts.push(new THREE.Vector3(ax + (bx - ax) * u, 0, az + (bz - az) * u));
          }
        }
      }
    }

    if (controlPts.length <= 2) {
      return smoothed;
    }

    const curve = new THREE.CatmullRomCurve3(controlPts, false, 'centripetal', 0.35);
    const totalLength = curve.getLength();
    const sampleCount = THREE.MathUtils.clamp(Math.ceil(totalLength / 4.2), 8, 130);
    const result: Array<[number, number]> = [];
    for (let i = 0; i <= sampleCount; i++) {
      const pt = curve.getPoint(i / sampleCount);
      result.push([pt.x, pt.z]);
    }
    return result;
  }
}

export function distanceToRouteXZ(
  px: number,
  pz: number,
  route: ReadonlyArray<[number, number]>,
): { lateralDist: number; closestSegIdx: number } {
  if (route.length === 0) return { lateralDist: Infinity, closestSegIdx: 0 };
  if (route.length === 1) {
    return { lateralDist: Math.hypot(px - route[0][0], pz - route[0][1]), closestSegIdx: 0 };
  }
  let bestDistSq = Infinity;
  let bestIdx = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const ax = route[i][0];
    const az = route[i][1];
    const bx = route[i + 1][0];
    const bz = route[i + 1][1];
    const dx = bx - ax;
    const dz = bz - az;
    const lenSq = dx * dx + dz * dz;
    let t = 0;
    if (lenSq > 0.0001) {
      t = THREE.MathUtils.clamp(((px - ax) * dx + (pz - az) * dz) / lenSq, 0, 1);
    }
    const cx = ax + dx * t;
    const cz = az + dz * t;
    const dSq = (px - cx) * (px - cx) + (pz - cz) * (pz - cz);
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestIdx = i;
    }
  }
  return { lateralDist: Math.sqrt(bestDistSq), closestSegIdx: bestIdx };
}

function createGoldenTrailTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const w = 128;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);

  // Soft lateral glow ribbon (edges fade smoothly to zero alpha)
  const sideGrad = ctx.createLinearGradient(0, 0, w, 0);
  sideGrad.addColorStop(0.0, 'rgba(251, 191, 36, 0.0)');
  sideGrad.addColorStop(0.18, 'rgba(245, 158, 11, 0.24)');
  sideGrad.addColorStop(0.5, 'rgba(253, 224, 71, 0.42)');
  sideGrad.addColorStop(0.82, 'rgba(245, 158, 11, 0.24)');
  sideGrad.addColorStop(1.0, 'rgba(251, 191, 36, 0.0)');
  ctx.fillStyle = sideGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle forward-pointing directional chevrons
  for (const cy of [64, 192]) {
    ctx.strokeStyle = 'rgba(254, 249, 195, 0.85)';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(30, cy + 28);
    ctx.lineTo(64, cy - 18);
    ctx.lineTo(98, cy + 28);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export class GoldenTrailMesh {
  public readonly mesh: THREE.Mesh;
  private geometry: THREE.BufferGeometry;
  private texture: THREE.CanvasTexture;
  private positions: Float32Array;
  private uvs: Float32Array;
  private colors: Float32Array;
  private indices: Uint16Array;

  constructor(maxAnisotropy: number) {
    this.positions = new Float32Array(MAX_RIBBON_POINTS * 2 * 3);
    this.uvs = new Float32Array(MAX_RIBBON_POINTS * 2 * 2);
    this.colors = new Float32Array(MAX_RIBBON_POINTS * 2 * 3);
    this.indices = new Uint16Array((MAX_RIBBON_POINTS - 1) * 6);

    for (let i = 0; i < MAX_RIBBON_POINTS - 1; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      const base = i * 6;
      this.indices[base] = a;
      this.indices[base + 1] = c;
      this.indices[base + 2] = b;
      this.indices[base + 3] = b;
      this.indices[base + 4] = c;
      this.indices[base + 5] = d;
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setIndex(new THREE.BufferAttribute(this.indices, 1));
    this.geometry.setDrawRange(0, 0);

    this.texture = createGoldenTrailTexture(maxAnisotropy);
    const mat = new THREE.MeshBasicMaterial({
      map: this.texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

    this.mesh = new THREE.Mesh(this.geometry, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
  }

  public updateRoute(route: ReadonlyArray<[number, number]>, halfWidth = 0.46) {
    if (route.length < 2) {
      this.geometry.setDrawRange(0, 0);
      return;
    }

    // Resample route at ~1.5m intervals so ribbon drapes tightly over lunar hills & craters
    const dense: Array<[number, number]> = [];
    for (let i = 0; i < route.length - 1; i++) {
      const [ax, az] = route[i];
      const [bx, bz] = route[i + 1];
      const segLen = Math.hypot(bx - ax, bz - az);
      const steps = Math.max(1, Math.ceil(segLen / 1.55));
      for (let s = 0; s < steps; s++) {
        if (dense.length >= MAX_RIBBON_POINTS - 1) break;
        const u = s / steps;
        dense.push([ax + (bx - ax) * u, az + (bz - az) * u]);
      }
      if (dense.length >= MAX_RIBBON_POINTS - 1) break;
    }
    const last = route[route.length - 1];
    if (dense.length < MAX_RIBBON_POINTS) {
      dense.push([last[0], last[1]]);
    }

    const n = dense.length;
    if (n < 2) {
      this.geometry.setDrawRange(0, 0);
      return;
    }

    let accumDist = 0;
    for (let i = 0; i < n; i++) {
      const [px, pz] = dense[i];
      const prev = dense[Math.max(0, i - 1)];
      const next = dense[Math.min(n - 1, i + 1)];
      if (i > 0) {
        accumDist += Math.hypot(px - prev[0], pz - prev[1]);
      }

      let tx = next[0] - prev[0];
      let tz = next[1] - prev[1];
      const tLen = Math.hypot(tx, tz);
      if (tLen > 0.0001) {
        tx /= tLen;
        tz /= tLen;
      } else {
        tx = 0;
        tz = 1;
      }

      // Perpendicular lateral vector in XZ plane
      const perpX = -tz;
      const perpZ = tx;

      const lx = px - perpX * halfWidth;
      const lz = pz - perpZ * halfWidth;
      const rx = px + perpX * halfWidth;
      const rz = pz + perpZ * halfWidth;

      const cY = groundHeightAt(px, pz);
      const ly = Math.max(cY, groundHeightAt(lx, lz)) + 0.09;
      const ry = Math.max(cY, groundHeightAt(rx, rz)) + 0.09;

      const vIdx = i * 2;
      this.positions[vIdx * 3] = lx;
      this.positions[vIdx * 3 + 1] = ly;
      this.positions[vIdx * 3 + 2] = lz;

      this.positions[(vIdx + 1) * 3] = rx;
      this.positions[(vIdx + 1) * 3 + 1] = ry;
      this.positions[(vIdx + 1) * 3 + 2] = rz;

      const vCoord = accumDist * 0.36;
      this.uvs[vIdx * 2] = 0;
      this.uvs[vIdx * 2 + 1] = vCoord;
      this.uvs[(vIdx + 1) * 2] = 1;
      this.uvs[(vIdx + 1) * 2 + 1] = vCoord;

      // Subtle fade at player end and destination end
      const startFade = Math.min(1, i / 3);
      const endFade = Math.min(1, (n - 1 - i) / 3);
      const brightness = 0.25 + 0.75 * Math.min(startFade, endFade);
      this.colors[vIdx * 3] = brightness;
      this.colors[vIdx * 3 + 1] = brightness * 0.92;
      this.colors[vIdx * 3 + 2] = brightness * 0.65;
      this.colors[(vIdx + 1) * 3] = brightness;
      this.colors[(vIdx + 1) * 3 + 1] = brightness * 0.92;
      this.colors[(vIdx + 1) * 3 + 2] = brightness * 0.65;
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.uv as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    this.geometry.setDrawRange(0, (n - 1) * 6);
    this.geometry.computeBoundingSphere();
  }

  public animate(dt: number) {
    // Scroll chevrons forward along V toward destination
    this.texture.offset.y = (this.texture.offset.y - dt * 0.95) % 1;
  }

  public dispose() {
    this.geometry.dispose();
    this.texture.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
