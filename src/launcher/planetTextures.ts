import * as THREE from 'three';

export interface PlanetTextureSet {
  colorMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  dispose: () => void;
}

function hash3(ix: number, iy: number, iz: number, seed: number): number {
  let n =
    Math.imul(ix, 374761393) +
    Math.imul(iy, 668265263) +
    Math.imul(iz, 1274126177) +
    Math.imul(seed, 1597334677);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function noise3(x: number, y: number, z: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = smooth(x - ix);
  const fy = smooth(y - iy);
  const fz = smooth(z - iz);

  const c000 = hash3(ix, iy, iz, seed);
  const c100 = hash3(ix + 1, iy, iz, seed);
  const c010 = hash3(ix, iy + 1, iz, seed);
  const c110 = hash3(ix + 1, iy + 1, iz, seed);
  const c001 = hash3(ix, iy, iz + 1, seed);
  const c101 = hash3(ix + 1, iy, iz + 1, seed);
  const c011 = hash3(ix, iy + 1, iz + 1, seed);
  const c111 = hash3(ix + 1, iy + 1, iz + 1, seed);

  const x00 = lerp(c000, c100, fx);
  const x10 = lerp(c010, c110, fx);
  const x01 = lerp(c001, c101, fx);
  const x11 = lerp(c011, c111, fx);

  return lerp(lerp(x00, x10, fy), lerp(x01, x11, fy), fz);
}

function fbm3(x: number, y: number, z: number, seed: number, octaves = 5): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    value += amp * noise3(x * freq, y * freq, z * freq, seed + i * 31);
    norm += amp;
    amp *= 0.5;
    freq *= 2.08;
  }
  return value / norm;
}

interface SphericalCrater {
  nx: number;
  ny: number;
  nz: number;
  radius: number;
  depth: number;
  hasRays: boolean;
}

function createDeterministicRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function generateCraters(count: number, seed: number, minR: number, maxR: number, rayChance: number): SphericalCrater[] {
  const rng = createDeterministicRng(seed);
  const craters: SphericalCrater[] = [];
  for (let i = 0; i < count; i++) {
    const u = rng();
    const v = rng();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const nx = Math.sin(phi) * Math.cos(theta);
    const ny = Math.cos(phi);
    const nz = Math.sin(phi) * Math.sin(theta);
    const r = minR + Math.pow(rng(), 2.1) * (maxR - minR);
    craters.push({
      nx,
      ny,
      nz,
      radius: r,
      depth: 0.45 + rng() * 0.55,
      hasRays: rng() < rayChance,
    });
  }
  return craters;
}

function configureTextures(
  colorCanvas: HTMLCanvasElement,
  bumpCanvas: HTMLCanvasElement,
  roughCanvas: HTMLCanvasElement,
  maxAnisotropy: number,
): PlanetTextureSet {
  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.wrapS = THREE.RepeatWrapping;
  colorMap.wrapT = THREE.ClampToEdgeWrapping;
  colorMap.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.ClampToEdgeWrapping;
  bumpMap.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.ClampToEdgeWrapping;
  roughnessMap.anisotropy = maxAnisotropy;

  return {
    colorMap,
    bumpMap,
    roughnessMap,
    dispose: () => {
      colorMap.dispose();
      bumpMap.dispose();
      roughnessMap.dispose();
    },
  };
}

export function generateMarsTextures(maxAnisotropy = 4): PlanetTextureSet {
  const width = 768;
  const height = 384;

  const colorCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  const roughCanvas = document.createElement('canvas');
  colorCanvas.width = bumpCanvas.width = roughCanvas.width = width;
  colorCanvas.height = bumpCanvas.height = roughCanvas.height = height;

  const cCtx = colorCanvas.getContext('2d')!;
  const bCtx = bumpCanvas.getContext('2d')!;
  const rCtx = roughCanvas.getContext('2d')!;

  const cImg = cCtx.createImageData(width, height);
  const bImg = bCtx.createImageData(width, height);
  const rImg = rCtx.createImageData(width, height);

  const craters = generateCraters(95, 4219, 0.02, 0.12, 0.03);

  for (let py = 0; py < height; py++) {
    const v = (py + 0.5) / height;
    const phi = v * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const latAbs = Math.abs(cosPhi);

    for (let px = 0; px < width; px++) {
      const u = (px + 0.5) / width;
      const theta = u * Math.PI * 2;
      const nx = sinPhi * Math.cos(theta);
      const ny = cosPhi;
      const nz = sinPhi * Math.sin(theta);

      const macro = fbm3(nx * 2.6, ny * 2.6, nz * 2.6, 17, 5);
      const detail = fbm3(nx * 10.5, ny * 10.5, nz * 10.5, 93, 4);
      const ridge = 1 - Math.abs(fbm3(nx * 16, ny * 16, nz * 16, 149, 3) * 2 - 1);
      const micro = fbm3(nx * 32, ny * 32, nz * 32, 211, 3);

      // Valles Marineris equatorial canyon scar
      const canyonBand = Math.exp(-Math.pow((ny + 0.1 + (macro - 0.5) * 0.09) * 16, 2));
      const canyonLon = Math.exp(-Math.pow((u - 0.38) * 8.0, 2));
      const canyonCut = canyonBand * canyonLon * 0.42;

      let heightVal =
        0.5 + (macro - 0.5) * 0.42 + (detail - 0.5) * 0.28 + (ridge - 0.5) * 0.14 + (micro - 0.5) * 0.14 - canyonCut;

      for (let i = 0; i < craters.length; i++) {
        const c = craters[i];
        const dx = nx - c.nx;
        const dy = ny - c.ny;
        const dz = nz - c.nz;
        const maxD = c.radius * 1.4;
        if (Math.abs(dx) > maxD || Math.abs(dy) > maxD || Math.abs(dz) > maxD) continue;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < maxD) {
          const t = dist / c.radius;
          if (t < 0.8) {
            heightVal -= (1 - (t / 0.8) * (t / 0.8)) * 0.24 * c.depth;
          } else {
            heightVal += Math.exp(-Math.pow((t - 0.92) * 5.2, 2)) * 0.16 * c.depth;
          }
        }
      }

      heightVal = Math.max(0, Math.min(1, heightVal));

      const iceThreshold = 0.895 - (detail - 0.5) * 0.08 - (macro - 0.5) * 0.04;
      const iceFactor = Math.max(0, Math.min(1, (latAbs - iceThreshold) * 20));

      const basaltMix = Math.max(0, Math.min(1, (0.49 - macro) * 2.7));
      const dustMix = Math.max(0, Math.min(1, (macro - 0.52) * 2.4));

      let r = 194;
      let g = 90;
      let b = 49;

      // Dark volcanic basaltic plains
      r = lerp(r, 94, basaltMix * 0.85);
      g = lerp(g, 46, basaltMix * 0.85);
      b = lerp(b, 34, basaltMix * 0.85);

      // Bright iron-oxide dust highlands
      r = lerp(r, 226, dustMix * 0.68);
      g = lerp(g, 134, dustMix * 0.68);
      b = lerp(b, 76, dustMix * 0.68);

      const shade = 0.78 + detail * 0.28 + ridge * 0.08 + micro * 0.1 - canyonCut * 0.6;
      r *= shade;
      g *= shade;
      b *= shade;

      r = lerp(r, 236, iceFactor);
      g = lerp(g, 239, iceFactor);
      b = lerp(b, 244, iceFactor);

      const idx = (py * width + px) * 4;
      cImg.data[idx] = Math.max(0, Math.min(255, Math.round(r)));
      cImg.data[idx + 1] = Math.max(0, Math.min(255, Math.round(g)));
      cImg.data[idx + 2] = Math.max(0, Math.min(255, Math.round(b)));
      cImg.data[idx + 3] = 255;

      const bVal = Math.round(heightVal * 255);
      bImg.data[idx] = bVal;
      bImg.data[idx + 1] = bVal;
      bImg.data[idx + 2] = bVal;
      bImg.data[idx + 3] = 255;

      const roughVal = Math.round(lerp(228, 138, iceFactor) - detail * 15);
      rImg.data[idx] = roughVal;
      rImg.data[idx + 1] = roughVal;
      rImg.data[idx + 2] = roughVal;
      rImg.data[idx + 3] = 255;
    }
  }

  cCtx.putImageData(cImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  return configureTextures(colorCanvas, bumpCanvas, roughCanvas, maxAnisotropy);
}

export function generateMoonTextures(maxAnisotropy = 4): PlanetTextureSet {
  const width = 768;
  const height = 384;

  const colorCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  const roughCanvas = document.createElement('canvas');
  colorCanvas.width = bumpCanvas.width = roughCanvas.width = width;
  colorCanvas.height = bumpCanvas.height = roughCanvas.height = height;

  const cCtx = colorCanvas.getContext('2d')!;
  const bCtx = bumpCanvas.getContext('2d')!;
  const rCtx = roughCanvas.getContext('2d')!;

  const cImg = cCtx.createImageData(width, height);
  const bImg = bCtx.createImageData(width, height);
  const rImg = rCtx.createImageData(width, height);

  const largeCraters = generateCraters(24, 8801, 0.09, 0.22, 0.35);
  const mediumCraters = generateCraters(95, 8802, 0.038, 0.09, 0.16);
  const smallCraters = generateCraters(220, 8803, 0.014, 0.038, 0.04);
  const allCraters = [...largeCraters, ...mediumCraters, ...smallCraters];

  for (let py = 0; py < height; py++) {
    const v = (py + 0.5) / height;
    const phi = v * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);

    for (let px = 0; px < width; px++) {
      const u = (px + 0.5) / width;
      const theta = u * Math.PI * 2;
      const nx = sinPhi * Math.cos(theta);
      const ny = cosPhi;
      const nz = sinPhi * Math.sin(theta);

      const mareNoise = fbm3(nx * 1.9, ny * 1.9, nz * 1.9, 501, 5);
      const detail = fbm3(nx * 10.5, ny * 10.5, nz * 10.5, 613, 4);
      const micro = fbm3(nx * 30.0, ny * 30.0, nz * 30.0, 727, 3);

      const isMare = Math.max(0, Math.min(1, (0.48 - mareNoise) * 4.5));
      let albedo = lerp(0.68, 0.33, isMare) + (detail - 0.5) * 0.15 + (micro - 0.5) * 0.09;
      let heightVal = 0.54 - isMare * 0.16 + (detail - 0.5) * 0.18 + (micro - 0.5) * 0.1;

      for (let i = 0; i < allCraters.length; i++) {
        const c = allCraters[i];
        const dx = nx - c.nx;
        const dy = ny - c.ny;
        const dz = nz - c.nz;
        const maxDist = c.hasRays ? c.radius * 2.8 : c.radius * 1.38;
        if (Math.abs(dx) > maxDist || Math.abs(dy) > maxDist || Math.abs(dz) > maxDist) continue;

        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < maxDist) {
          const t = dist / c.radius;
          if (t < 0.78) {
            const bowl = (1 - Math.pow(t / 0.78, 2)) * 0.3 * c.depth;
            heightVal -= bowl;
            albedo -= bowl * 0.2;
          } else if (t < 1.32) {
            const rim = Math.exp(-Math.pow((t - 0.9) * 5.6, 2)) * 0.21 * c.depth;
            heightVal += rim;
            albedo += rim * 0.58;
          }
          if (c.hasRays && t > 0.85 && t < 2.8) {
            const rayAngle = Math.atan2(dy + dx * 0.7, dz - dy * 0.5);
            const rayPattern = 0.5 + 0.5 * Math.sin(rayAngle * 7 + i * 2.1) * Math.cos(rayAngle * 11 - i);
            const falloff = Math.max(0, 1 - (t - 0.85) / 1.95);
            albedo += rayPattern * falloff * 0.11;
          }
        }
      }

      heightVal = Math.max(0, Math.min(1, heightVal));
      albedo = Math.max(0.18, Math.min(0.92, albedo));

      const lum = albedo * 255;
      const r = Math.max(0, Math.min(255, Math.round(lum * 0.99)));
      const g = Math.max(0, Math.min(255, Math.round(lum * 1.0)));
      const b = Math.max(0, Math.min(255, Math.round(lum * 1.04)));

      const idx = (py * width + px) * 4;
      cImg.data[idx] = r;
      cImg.data[idx + 1] = g;
      cImg.data[idx + 2] = b;
      cImg.data[idx + 3] = 255;

      const bVal = Math.round(heightVal * 255);
      bImg.data[idx] = bVal;
      bImg.data[idx + 1] = bVal;
      bImg.data[idx + 2] = bVal;
      bImg.data[idx + 3] = 255;

      const roughVal = Math.round(lerp(240, 210, isMare));
      rImg.data[idx] = roughVal;
      rImg.data[idx + 1] = roughVal;
      rImg.data[idx + 2] = roughVal;
      rImg.data[idx + 3] = 255;
    }
  }

  cCtx.putImageData(cImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);

  return configureTextures(colorCanvas, bumpCanvas, roughCanvas, maxAnisotropy);
}
