import * as THREE from 'three';

export interface CraterSpec {
  id: string;
  x: number;
  z: number;
  radius: number;
  depth: number;
  rimHeight: number;
}

export const NAMED_CRATERS: CraterSpec[] = [
  { id: 'meteorite_crater', x: -145, z: -135, radius: 34, depth: 8.8, rimHeight: 2.8 },
  { id: 'signal_crater', x: 165, z: -95, radius: 30, depth: 7.4, rimHeight: 2.3 },
  { id: 'shadow_ice_crater', x: -170, z: 145, radius: 42, depth: 12.2, rimHeight: 4.1 },
  { id: 'forgotten_valley', x: 130, z: 155, radius: 24, depth: 4.6, rimHeight: 1.6 },
  { id: 'west_basin', x: -215, z: 10, radius: 28, depth: 6.8, rimHeight: 2.2 },
  { id: 'north_crater', x: -20, z: -185, radius: 26, depth: 6.2, rimHeight: 2.0 },
  { id: 'east_rim_crater', x: 205, z: 115, radius: 25, depth: 5.6, rimHeight: 1.9 },
  { id: 'south_crater', x: 75, z: -205, radius: 22, depth: 5.2, rimHeight: 1.7 },
  // Outer lunar frontier craters & geological basins
  { id: 'tranquility_frontier', x: 280, z: -195, radius: 36, depth: 8.4, rimHeight: 2.6 },
  { id: 'tycho_twin', x: -295, z: -180, radius: 32, depth: 7.8, rimHeight: 2.4 },
  { id: 'south_rim_crater_a', x: 210, z: 290, radius: 34, depth: 8.2, rimHeight: 2.7 },
  { id: 'south_rim_crater_b', x: 255, z: 325, radius: 22, depth: 5.4, rimHeight: 1.8 },
  { id: 'west_highland_pit', x: -345, z: -45, radius: 29, depth: 6.9, rimHeight: 2.1 },
  { id: 'north_basin', x: 60, z: -330, radius: 38, depth: 9.2, rimHeight: 2.9 },
  // Additional micro-craters for natural lunar topology
  { id: 'micro_nw', x: -92, z: -85, radius: 11, depth: 2.1, rimHeight: 0.65 },
  { id: 'micro_ne', x: 96, z: -72, radius: 13, depth: 2.4, rimHeight: 0.7 },
  { id: 'micro_sw', x: -86, z: 98, radius: 14, depth: 2.7, rimHeight: 0.8 },
  { id: 'micro_se', x: 78, z: 96, radius: 12, depth: 2.2, rimHeight: 0.68 },
];

export const APOLLO_SITE_X = -325;
export const APOLLO_SITE_Z = 295;

function hash2(ix: number, iz: number): number {
  const n = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function valueNoise2D(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx);
  const uz = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

function fbm(x: number, z: number, octaves = 5): number {
  let v = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    v += amp * (valueNoise2D(x * freq, z * freq) * 2 - 1);
    freq *= 2.07;
    amp *= 0.48;
  }
  return v;
}

function ridgedNoise(x: number, z: number): number {
  const n = valueNoise2D(x, z) * 2 - 1;
  return 1 - Math.abs(n);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export const WORLD_PLAYABLE_RADIUS = 450;

/**
 * High-detail analytical lunar terrain height at world (x, z).
 * Includes multi-octave rolling regolith, sculpted terraced craters with ejecta rims,
 * Earthrise Overlook ridge, highland valleys, flat colony pad, tranquil Apollo plain, and towering outer mountains.
 */
export function groundHeightAt(x: number, z: number): number {
  // Multi-scale lunar maria & highland undulations
  let h =
    fbm(x * 0.0075, z * 0.0075, 5) * 5.2 +
    fbm(x * 0.036, z * 0.036, 3) * 0.95 +
    fbm(x * 0.11, z * 0.11, 2) * 0.18;

  // Geological ridge spine running along far north-west & south-east
  const ridgeBand = Math.max(0, ridgedNoise(x * 0.009 + 4.1, z * 0.009 - 2.3) - 0.55) * 2.2;
  const distBase = Math.hypot(x, z);
  if (distBase > 75) {
    h += ridgeBand * 6.5 * smoothstep(75, 130, distBase);
  }

  // Earthrise Overlook ridge (-75, -48)
  const distObs = Math.hypot(x - -75, z - -48);
  if (distObs < 36) {
    const mound = 1 - smoothstep(9, 36, distObs);
    h += mound * 8.2;
  }

  // Far-side Research Outpost plateau (225, 25)
  const distOutpost = Math.hypot(x - 225, z - 25);
  if (distOutpost < 40) {
    const flatBlend = 1 - smoothstep(15, 40, distOutpost);
    h = THREE.MathUtils.lerp(h, 4.2, flatBlend);
  }

  // Relay Ridge hill (-35, 225)
  const distRelay = Math.hypot(x - -35, z - 225);
  if (distRelay < 44) {
    const hill = 1 - smoothstep(9, 44, distRelay);
    h += hill * 11.2;
  }

  // Rockfall Pass canyon walls flanking (55, 195)
  const distPass = Math.hypot(x - 55, z - 195);
  if (distPass < 38 && distPass > 12) {
    h += (1 - smoothstep(12, 38, distPass)) * 4.2;
  }

  // Outer Highland Scenic Overlook at Tranquility Frontier (280, -195) & Basalt Canyon (-265, -245)
  const distArch = Math.hypot(x - -265, z - -245);
  if (distArch < 34) {
    const canyonBlend = 1 - smoothstep(10, 34, distArch);
    h = THREE.MathUtils.lerp(h, 2.4, canyonBlend);
  }

  const distVault = Math.hypot(x - 285, z - -240);
  if (distVault < 30) {
    const vBlend = 1 - smoothstep(10, 30, distVault);
    h = THREE.MathUtils.lerp(h, 3.1, vBlend);
  }

  // Named Craters with terraced inner walls & raised ejecta aprons
  for (let i = 0; i < NAMED_CRATERS.length; i++) {
    const c = NAMED_CRATERS[i];
    const d = Math.hypot(x - c.x, z - c.z);
    if (d < c.radius * 1.75) {
      const rNorm = d / c.radius;
      if (rNorm < 1.0) {
        const bowl = 1 - rNorm * rNorm;
        const terrace = Math.sin(rNorm * Math.PI * 3.0) * 0.22 * (1 - rNorm);
        h -= bowl * c.depth - terrace;
        h += smoothstep(0.72, 1.0, rNorm) * c.rimHeight;
      } else {
        const falloff = 1 - smoothstep(1.0, 1.75, rNorm);
        h += falloff * c.rimHeight;
      }
    }
  }

  // Smoothly flatten main Lunar Research Base basin (radius 70m around origin)
  if (distBase < 70) {
    const blend = 1 - smoothstep(50, 70, distBase);
    h = THREE.MathUtils.lerp(h, 0, blend);
  }

  // Quiet, untouched Tranquility plain for Historic Apollo 11 Site (-325, 295)
  const distApollo = Math.hypot(x - APOLLO_SITE_X, z - APOLLO_SITE_Z);
  if (distApollo < 36) {
    const blend = 1 - smoothstep(14, 36, distApollo);
    h = THREE.MathUtils.lerp(h, 0.8, blend);
  }

  // Distant mountain range ring beyond playable radius (no boxed walls!)
  if (distBase > 455) {
    const ridgeT = smoothstep(455, 590, distBase);
    const mountain = ridgedNoise(x * 0.016, z * 0.016) * 0.78 + 0.22;
    h += ridgeT * (48 * mountain + 18);
  }

  return h;
}

const _nUp = new THREE.Vector3();
export function groundNormalAt(x: number, z: number, target = _nUp): THREE.Vector3 {
  const eps = 0.55;
  const hL = groundHeightAt(x - eps, z);
  const hR = groundHeightAt(x + eps, z);
  const hD = groundHeightAt(x, z - eps);
  const hU = groundHeightAt(x, z + eps);
  target.set(hL - hR, 2 * eps, hD - hU).normalize();
  return target;
}

/**
 * Seamless 1024x1024 procedural lunar regolith albedo + normal-like bump + roughness maps.
 * Paired with dual-scale UV sampling in onBeforeCompile so zero tiling pattern is visible.
 */
export function createRegolithTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 1024;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const cCtx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  cCtx.fillStyle = '#848992';
  cCtx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Soft cloudy patches to break up uniform gray
  for (let i = 0; i < 120; i++) {
    const px = Math.random() * size;
    const py = Math.random() * size;
    const rad = 28 + Math.random() * 90;
    const bright = Math.random() > 0.5;
    const grad = cCtx.createRadialGradient(px, py, 2, px, py, rad);
    grad.addColorStop(0, bright ? 'rgba(155, 160, 168, 0.24)' : 'rgba(92, 97, 105, 0.24)');
    grad.addColorStop(1, 'rgba(132, 137, 146, 0)');
    cCtx.fillStyle = grad;
    cCtx.beginPath();
    cCtx.arc(px, py, rad, 0, Math.PI * 2);
    cCtx.fill();
  }

  // Fine basalt/anorthosite regolith grit
  for (let i = 0; i < 38000; i++) {
    const px = Math.random() * size;
    const py = Math.random() * size;
    const r = 0.7 + Math.random() * 2.1;
    const v = 90 + Math.floor(Math.random() * 82);
    cCtx.fillStyle = `rgb(${v},${v + 1},${v + 4})`;
    cCtx.fillRect(px, py, r, r);

    const bv = 92 + Math.floor(Math.random() * 75);
    bCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
    bCtx.fillRect(px, py, r, r);
  }

  // Realistic micro-pockmarks & pebbles
  for (let i = 0; i < 140; i++) {
    const cx = Math.random() * size;
    const cy = Math.random() * size;
    const cr = 3 + Math.random() * 16;
    const grad = cCtx.createRadialGradient(cx, cy, 0.5, cx, cy, cr);
    grad.addColorStop(0, 'rgba(58, 62, 68, 0.52)');
    grad.addColorStop(0.68, 'rgba(96, 101, 109, 0.3)');
    grad.addColorStop(0.88, 'rgba(170, 174, 182, 0.26)');
    grad.addColorStop(1, 'rgba(132, 137, 146, 0)');
    cCtx.fillStyle = grad;
    cCtx.beginPath();
    cCtx.arc(cx, cy, cr, 0, Math.PI * 2);
    cCtx.fill();

    const bGrad = bCtx.createRadialGradient(cx, cy, 0.5, cx, cy, cr);
    bGrad.addColorStop(0, 'rgba(42,42,42,0.72)');
    bGrad.addColorStop(0.82, 'rgba(210,210,210,0.48)');
    bGrad.addColorStop(1, 'rgba(128,128,128,0)');
    bCtx.fillStyle = bGrad;
    bCtx.beginPath();
    bCtx.arc(cx, cy, cr, 0, Math.PI * 2);
    bCtx.fill();
  }

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(28, 28);
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(28, 28);
  bumpMap.anisotropy = maxAnisotropy;

  return { map, bumpMap };
}

export function createFootprintTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 64, 128);

  // Outer boot rim impression
  ctx.fillStyle = 'rgba(42, 46, 54, 0.65)';
  ctx.beginPath();
  ctx.roundRect(12, 10, 40, 108, 16);
  ctx.fill();

  // Classic Apollo-style horizontal boot tread ribs
  ctx.fillStyle = 'rgba(24, 27, 32, 0.85)';
  for (let y = 18; y < 108; y += 11) {
    ctx.fillRect(16, y, 32, 5);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createRoverTrackTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, 64, 128);

  ctx.fillStyle = 'rgba(48, 52, 60, 0.58)';
  ctx.fillRect(10, 0, 44, 128);

  ctx.strokeStyle = 'rgba(25, 28, 34, 0.82)';
  ctx.lineWidth = 5;
  for (let y = 8; y < 128; y += 22) {
    ctx.beginPath();
    ctx.moveTo(12, y);
    ctx.lineTo(32, y + 10);
    ctx.lineTo(52, y);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface TerrainObstacle {
  x: number;
  z: number;
  radius: number;
}

export function buildLunarTerrainMesh(maxAnisotropy: number): {
  terrainMesh: THREE.Mesh;
  rockInstanced: THREE.InstancedMesh;
  slabInstanced: THREE.InstancedMesh;
  rockObstacles: TerrainObstacle[];
} {
  const size = 1200;
  const segs = 250;
  const geo = new THREE.PlaneGeometry(size, size, segs, segs);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const col = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vz = pos.getZ(i);
    const vy = groundHeightAt(vx, vz);
    pos.setY(i, vy);

    const distShadow = Math.hypot(vx - -170, vz - 145);
    const distMeteor = Math.hypot(vx - -145, vz - -135);
    const distBase = Math.hypot(vx, vz);

    // Richer mare/highland mineral shading + ejecta ray streaks around meteorite crater
    let shade = 0.52 + 0.13 * valueNoise2D(vx * 0.028, vz * 0.028) + 0.06 * valueNoise2D(vx * 0.09, vz * 0.09);

    if (distShadow < 44) {
      shade *= 0.52 + 0.48 * (distShadow / 44);
    } else if (distMeteor < 55) {
      const ang = Math.atan2(vz - -135, vx - -145);
      const ray = Math.max(0, Math.sin(ang * 7 + 1.2)) * 0.14;
      if (distMeteor < 14) {
        // Dark scorched impact pit
        shade *= 0.62 + 0.3 * (distMeteor / 14);
      } else {
        // Displaced bright ejecta apron & rays
        shade += ray * (1 - smoothstep(16, 55, distMeteor));
      }
    } else if (distBase < 58) {
      shade = 0.59 + 0.02 * valueNoise2D(vx * 0.15, vz * 0.15);
    }

    col.setRGB(shade, shade * 1.005, shade * 1.03);
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const { map, bumpMap } = createRegolithTextures(maxAnisotropy);
  map.repeat.set(42, 42);
  bumpMap.repeat.set(42, 42);
  const mat = new THREE.MeshStandardMaterial({
    map,
    bumpMap,
    bumpScale: 0.65,
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.04,
  });

  // Dual-scale anti-tiling shader injection so surface never repeats visibly
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
      #ifdef USE_MAP
        vec4 texPrimary = texture2D( map, vMapUv );
        vec4 texMacro = texture2D( map, vMapUv * 0.23 + vec2(0.37, 0.61) );
        vec4 texMicro = texture2D( map, vMapUv * 2.71 - vec2(0.19, 0.43) );
        vec4 sampledDiffuseColor = mix(texPrimary, texMacro, 0.35);
        sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, texMicro.rgb, 0.22);
        diffuseColor *= sampledDiffuseColor;
      #endif
      `,
    );
  };

  const terrainMesh = new THREE.Mesh(geo, mat);
  terrainMesh.receiveShadow = true;

  // 1. Rounded Highland Cobbles & Boulders (InstancedMesh)
  const rockGeo = new THREE.DodecahedronGeometry(0.68, 2);
  const rPos = rockGeo.attributes.position;
  for (let i = 0; i < rPos.count; i++) {
    const rx = rPos.getX(i);
    const ry = rPos.getY(i);
    const rz = rPos.getZ(i);
    const warp = 0.8 + 0.26 * Math.sin(rx * 4.7 + ry * 3.1 + rz * 5.2) + 0.1 * Math.cos(rx * 9.0 - rz * 7.0);
    rPos.setXYZ(i, rx * warp, ry * 0.72 * warp, rz * warp);
  }
  rockGeo.computeVertexNormals();

  const rockMat = new THREE.MeshStandardMaterial({
    color: 0xa1a7b0,
    bumpMap,
    bumpScale: 0.2,
    roughness: 0.89,
    metalness: 0.06,
  });

  const rockCount = 680;
  const rockInstanced = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  rockInstanced.castShadow = true;
  rockInstanced.receiveShadow = true;

  // 2. Angular Fractured Basalt Outcrops (InstancedMesh)
  const slabGeo = new THREE.OctahedronGeometry(0.9, 1);
  const sPos = slabGeo.attributes.position;
  for (let i = 0; i < sPos.count; i++) {
    const sx = sPos.getX(i);
    const sy = sPos.getY(i);
    const sz = sPos.getZ(i);
    const crag = 0.75 + 0.3 * Math.sin(sx * 6.2 + sz * 4.5);
    sPos.setXYZ(i, sx * 1.25 * crag, sy * 0.55 * crag, sz * 0.85 * crag);
  }
  slabGeo.computeVertexNormals();

  const slabMat = new THREE.MeshStandardMaterial({
    color: 0x767c85,
    bumpMap,
    bumpScale: 0.25,
    roughness: 0.92,
    metalness: 0.08,
  });

  const slabCount = 320;
  const slabInstanced = new THREE.InstancedMesh(slabGeo, slabMat, slabCount);
  slabInstanced.castShadow = true;
  slabInstanced.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();
  const rockObstacles: TerrainObstacle[] = [];

  const populateRocks = (
    inst: THREE.InstancedMesh,
    maxCount: number,
    seedOffset: number,
    minScale: number,
    maxScale: number,
    baseRadius: number,
  ) => {
    let placed = 0;
    let attempt = 0;
    while (placed < maxCount && attempt < 4600) {
      attempt++;
      const a = attempt + seedOffset;
      const angle = hash2(a, 11) * Math.PI * 2;
      const radius = 64 + hash2(a, 29) * 380;
      const rx = Math.cos(angle) * radius;
      const rz = Math.sin(angle) * radius;
      if (Math.hypot(rx - 225, rz - 25) < 22) continue;
      if (Math.hypot(rx - -145, rz - -135) < 16) continue; // Keep meteorite center clear
      if (Math.hypot(rx - -75, rz - -48) < 12) continue; // Keep Earthrise Overlook cinematic spot clear
      if (Math.hypot(rx - APOLLO_SITE_X, rz - APOLLO_SITE_Z) < 30) continue; // Keep Apollo 11 Historic Landing Site untouched
      if (Math.hypot(rx - 285, rz - -240) < 18) continue; // Keep Buried Vault clear
      if (Math.hypot(rx - -265, rz - -245) < 18) continue; // Keep Lava Arch clear

      const ry = groundHeightAt(rx, rz);
      const baseScale = minScale + hash2(a, 47) * (maxScale - minScale);
      dummy.position.set(rx, ry + baseScale * 0.16, rz);
      dummy.rotation.set(
        hash2(a, 61) * Math.PI * 0.5,
        hash2(a, 73) * Math.PI * 2,
        hash2(a, 89) * Math.PI * 0.5,
      );
      dummy.scale.set(
        baseScale * (0.85 + hash2(a, 101) * 0.3),
        baseScale * (0.72 + hash2(a, 113) * 0.35),
        baseScale * (0.85 + hash2(a, 127) * 0.3),
      );
      dummy.updateMatrix();
      inst.setMatrixAt(placed, dummy.matrix);

      const worldRadius = baseScale * baseRadius;
      if (worldRadius >= 0.95) {
        rockObstacles.push({ x: rx, z: rz, radius: worldRadius });
      }

      const tone = 0.68 + hash2(a, 139) * 0.44;
      tint.setRGB(tone, tone * 1.005, tone * 1.03);
      inst.setColorAt(placed, tint);
      placed++;
    }
    inst.count = placed;
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.computeBoundingSphere();
  };

  populateRocks(rockInstanced, rockCount, 0, 0.45, 2.3, 0.68);
  populateRocks(slabInstanced, slabCount, 5000, 0.85, 2.9, 0.9);

  return { terrainMesh, rockInstanced, slabInstanced, rockObstacles };
}
