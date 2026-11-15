import * as THREE from 'three';
import { WEATHER_SPECS } from './marsConfig';
import { groundHeightAt } from './marsTerrain';
import { createSoftParticleTexture } from './proceduralTextures';
import { WeatherType } from './types';

export interface CelestialMoonsHandles {
  group: THREE.Group;
  phobosElevationDeg: number;
  deimosElevationDeg: number;
  update: (elapsed: number, dt: number, solProgress: number, weather: WeatherType) => void;
  dispose: () => void;
}

function makeCrateredMoonGeometry(radius: number, seedOffset: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(radius, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Potato-like irregular triaxial distortion + crater indentations
    const lump =
      1.0 +
      0.16 * Math.sin(x * 1.2 + seedOffset) +
      0.11 * Math.cos(z * 1.4 - seedOffset) -
      0.1 * Math.exp(-Math.pow((x - radius * 0.45) / (radius * 0.4), 2));
    pos.setXYZ(i, x * 1.24 * lump, y * 0.86 * lump, z * 0.96 * lump);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createCelestialMoonsAndDustDevils(): CelestialMoonsHandles {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(d: T): T => {
    disposables.push(d);
    return d;
  };

  // 1. PHOBOS (Larger, closer, orbits Mars ~3x faster than Mars rotates -> rises West, sets East!)
  const phobosMat = track(
    new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      emissive: '#94a3b8',
      emissiveIntensity: 0.45,
      roughness: 0.92,
      metalness: 0.05,
      flatShading: true,
    }),
  );
  const phobosMesh = new THREE.Mesh(track(makeCrateredMoonGeometry(4.4, 1.3)), phobosMat);
  group.add(phobosMesh);

  // 2. DEIMOS (Smaller, farther, slower arc across the sky)
  const deimosMat = track(
    new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      emissive: '#cbd5e1',
      emissiveIntensity: 0.55,
      roughness: 0.88,
      metalness: 0.05,
      flatShading: true,
    }),
  );
  const deimosMesh = new THREE.Mesh(track(makeCrateredMoonGeometry(2.1, 4.7)), deimosMat);
  group.add(deimosMesh);

  // 3. Pooled 3D Rotating Dust Devils (up to 3 active vortices in outer desert)
  const devilCount = 3;
  const devilAnchors: Array<{
    group: THREE.Group;
    points: THREE.Points;
    baseX: number;
    baseZ: number;
    phase: number;
  }> = [];

  const funnelParticles = 140;
  for (let d = 0; d < devilCount; d++) {
    const dGroup = new THREE.Group();
    const arr = new Float32Array(funnelParticles * 3);
    for (let i = 0; i < funnelParticles; i++) {
      const t = i / funnelParticles;
      const r = 0.6 + t * 3.8;
      const a = t * Math.PI * 12;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = t * 18;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = track(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const dustSprite = track(createSoftParticleTexture('dust'));
    const mat = track(
      new THREE.PointsMaterial({
        color: '#e89d6b',
        map: dustSprite,
        size: 0.95,
        transparent: true,
        opacity: 0.56,
        alphaTest: 0.01,
        depthWrite: false,
      }),
    );
    const pts = new THREE.Points(geo, mat);
    dGroup.add(pts);
    dGroup.visible = false;
    group.add(dGroup);

    const angle = d * 2.1 + 0.6;
    const dist = 54 + d * 16;
    devilAnchors.push({
      group: dGroup,
      points: pts,
      baseX: Math.cos(angle) * dist,
      baseZ: Math.sin(angle) * dist,
      phase: d * 1.9,
    });
  }

  let phobosElevDeg = -10;
  let deimosElevDeg = -10;

  const update: CelestialMoonsHandles['update'] = (elapsed, dt, solProgress, weather) => {
    // Phobos crosses west-to-east ~3.1 times per Sol
    const pAngle = solProgress * Math.PI * 2 * 3.1 + 0.4;
    const pR = 245;
    const px = -Math.cos(pAngle) * pR;
    const py = Math.sin(pAngle) * pR * 0.85;
    const pz = -56 + Math.cos(pAngle * 0.5) * 24;
    phobosMesh.position.set(px, py, pz);
    phobosMesh.rotation.y += dt * 0.25;
    phobosMesh.visible = py > -10;
    phobosElevDeg = Math.round((Math.atan2(py, Math.hypot(px, pz)) * 180) / Math.PI);

    // Deimos glides slower (~0.85 cycles per Sol)
    const dAngle = solProgress * Math.PI * 2 * 0.85 + 2.2;
    const dR = 265;
    const dx = Math.cos(dAngle) * dR;
    const dy = Math.sin(dAngle) * dR * 0.78;
    const dz = 74;
    deimosMesh.position.set(dx, dy, dz);
    deimosMesh.rotation.y -= dt * 0.12;
    deimosMesh.visible = dy > -10;
    deimosElevDeg = Math.round((Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI);

    // Dust devils active based on WeatherSpec
    const activeCount = WEATHER_SPECS[weather].dustDevils;
    for (let i = 0; i < devilCount; i++) {
      const dev = devilAnchors[i];
      const active = i < activeCount;
      dev.group.visible = active;
      if (active) {
        const wx = dev.baseX + Math.sin(elapsed * 0.14 + dev.phase) * 18;
        const wz = dev.baseZ + Math.cos(elapsed * 0.11 + dev.phase) * 18;
        dev.group.position.set(wx, groundHeightAt(wx, wz), wz);
        dev.points.rotation.y += dt * (4.2 + i * 0.6);
      }
    }
  };

  return {
    group,
    get phobosElevationDeg() {
      return phobosElevDeg;
    },
    get deimosElevationDeg() {
      return deimosElevDeg;
    },
    update,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
