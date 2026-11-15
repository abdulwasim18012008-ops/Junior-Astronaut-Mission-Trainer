import * as THREE from 'three';
import { APOLLO_SITE_X, APOLLO_SITE_Z, groundHeightAt } from './lunarTerrain';

export interface EarthRig {
  group: THREE.Group;
  surfaceMesh: THREE.Mesh;
  cloudMesh: THREE.Mesh;
  atmosphereMesh: THREE.Mesh;
}

function createEarthTextures(maxAnisotropy: number): {
  surfaceMap: THREE.CanvasTexture;
  cloudMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const w = 1024;
  const h = 512;

  const surfaceCanvas = document.createElement('canvas');
  surfaceCanvas.width = w;
  surfaceCanvas.height = h;
  const sCtx = surfaceCanvas.getContext('2d')!;

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = w;
  roughCanvas.height = h;
  const rCtx = roughCanvas.getContext('2d')!;

  // Deep ocean gradient
  const oceanGrad = sCtx.createLinearGradient(0, 0, 0, h);
  oceanGrad.addColorStop(0, '#0a2b5e');
  oceanGrad.addColorStop(0.2, '#0b4a8c');
  oceanGrad.addColorStop(0.5, '#0e63b8');
  oceanGrad.addColorStop(0.8, '#0b4a8c');
  oceanGrad.addColorStop(1, '#08254f');
  sCtx.fillStyle = oceanGrad;
  sCtx.fillRect(0, 0, w, h);

  // Smooth specular ocean in roughness map (dark = low roughness)
  rCtx.fillStyle = '#383838';
  rCtx.fillRect(0, 0, w, h);

  // Stylized realistic continents
  const continents: Array<{ cx: number; cy: number; rx: number; ry: number; rot: number; color: string }> = [
    // Americas
    { cx: 240, cy: 170, rx: 85, ry: 65, rot: -0.3, color: '#2f7a44' },
    { cx: 285, cy: 255, rx: 38, ry: 22, rot: 0.4, color: '#3b8b4c' },
    { cx: 315, cy: 340, rx: 52, ry: 80, rot: 0.2, color: '#2b6f3e' },
    // Africa & Europe & Asia
    { cx: 520, cy: 155, rx: 75, ry: 42, rot: -0.1, color: '#3b7e46' },
    { cx: 530, cy: 265, rx: 68, ry: 78, rot: 0.1, color: '#c49d56' },
    { cx: 545, cy: 310, rx: 45, ry: 55, rot: 0.0, color: '#357b42' },
    { cx: 680, cy: 165, rx: 140, ry: 68, rot: 0.05, color: '#3d8248' },
    { cx: 710, cy: 215, rx: 75, ry: 40, rot: -0.2, color: '#b48d4d' },
    // Australia
    { cx: 815, cy: 345, rx: 52, ry: 34, rot: -0.15, color: '#b57d44' },
    // Greenland
    { cx: 375, cy: 78, rx: 42, ry: 24, rot: -0.2, color: '#d8e6f0' },
  ];

  for (const c of continents) {
    sCtx.save();
    sCtx.translate(c.cx, c.cy);
    sCtx.rotate(c.rot);
    sCtx.fillStyle = c.color;
    sCtx.beginPath();
    for (let a = 0; a <= 32; a++) {
      const th = (a / 32) * Math.PI * 2;
      const wobble = 0.78 + 0.24 * Math.sin(th * 3 + c.cx) + 0.14 * Math.cos(th * 5 + c.cy);
      const px = Math.cos(th) * c.rx * wobble;
      const py = Math.sin(th) * c.ry * wobble;
      if (a === 0) sCtx.moveTo(px, py);
      else sCtx.lineTo(px, py);
    }
    sCtx.closePath();
    sCtx.fill();

    // Land is rougher than ocean
    rCtx.save();
    rCtx.translate(c.cx, c.cy);
    rCtx.rotate(c.rot);
    rCtx.fillStyle = '#c8c8c8';
    rCtx.beginPath();
    for (let a = 0; a <= 32; a++) {
      const th = (a / 32) * Math.PI * 2;
      const wobble = 0.78 + 0.24 * Math.sin(th * 3 + c.cx) + 0.14 * Math.cos(th * 5 + c.cy);
      const px = Math.cos(th) * c.rx * wobble;
      const py = Math.sin(th) * c.ry * wobble;
      if (a === 0) rCtx.moveTo(px, py);
      else rCtx.lineTo(px, py);
    }
    rCtx.closePath();
    rCtx.fill();
    rCtx.restore();
    sCtx.restore();
  }

  // Polar ice caps
  sCtx.fillStyle = '#eef6ff';
  sCtx.fillRect(0, 0, w, 34);
  sCtx.fillRect(0, h - 38, w, 38);

  // Swirling clouds canvas
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = w;
  cloudCanvas.height = h;
  const clCtx = cloudCanvas.getContext('2d')!;
  clCtx.clearRect(0, 0, w, h);

  for (let i = 0; i < 240; i++) {
    const cx = Math.random() * w;
    const cy = 30 + Math.random() * (h - 60);
    const rw = 26 + Math.random() * 88;
    const rh = 7 + Math.random() * 18;
    const grad = clCtx.createRadialGradient(cx, cy, 2, cx, cy, rw);
    grad.addColorStop(0, 'rgba(255,255,255,0.68)');
    grad.addColorStop(0.6, 'rgba(240,248,255,0.32)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    clCtx.fillStyle = grad;
    clCtx.save();
    clCtx.translate(cx, cy);
    clCtx.rotate((Math.random() - 0.5) * 0.45);
    clCtx.scale(1, rh / rw);
    clCtx.beginPath();
    clCtx.arc(0, 0, rw, 0, Math.PI * 2);
    clCtx.fill();
    clCtx.restore();
  }

  const surfaceMap = new THREE.CanvasTexture(surfaceCanvas);
  surfaceMap.colorSpace = THREE.SRGBColorSpace;
  surfaceMap.anisotropy = maxAnisotropy;

  const cloudMap = new THREE.CanvasTexture(cloudCanvas);
  cloudMap.colorSpace = THREE.SRGBColorSpace;
  cloudMap.anisotropy = maxAnisotropy;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.anisotropy = maxAnisotropy;

  return { surfaceMap, cloudMap, roughnessMap };
}

export function createEarthRig(radius: number, maxAnisotropy: number): EarthRig {
  const group = new THREE.Group();
  const { surfaceMap, cloudMap, roughnessMap } = createEarthTextures(maxAnisotropy);

  const surfaceGeo = new THREE.SphereGeometry(radius, 48, 48);
  const surfaceMat = new THREE.MeshStandardMaterial({
    map: surfaceMap,
    roughnessMap,
    roughness: 0.72,
    metalness: 0.06,
    fog: false,
  });
  const surfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
  group.add(surfaceMesh);

  const cloudGeo = new THREE.SphereGeometry(radius * 1.016, 48, 48);
  const cloudMat = new THREE.MeshStandardMaterial({
    map: cloudMap,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    roughness: 0.9,
    fog: false,
  });
  const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
  group.add(cloudMesh);

  // Fresnel Atmospheric Rim Glow
  const atmosGeo = new THREE.SphereGeometry(radius * 1.06, 48, 48);
  const atmosMat = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(0x4ea8ff) },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float rim = 1.0 - max(0.0, dot(vNormal, vViewDir));
        float intensity = pow(rim, 3.2) * 0.95;
        gl_FragColor = vec4(glowColor, intensity);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const atmosphereMesh = new THREE.Mesh(atmosGeo, atmosMat);
  group.add(atmosphereMesh);

  return { group, surfaceMesh, cloudMesh, atmosphereMesh };
}

export function createStarfield(count = 2200, radius = 920): THREE.Points {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const u = Math.random();
    const v = Math.random();
    const theta = u * 2.0 * Math.PI;
    const phi = Math.acos(2.0 * v - 1.0);
    const r = radius + (Math.random() - 0.5) * 140;

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.85 + (Math.random() > 0.25 ? 25 : -120);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    const tintRoll = Math.random();
    if (tintRoll < 0.15) c.setHex(0xbbe1ff);
    else if (tintRoll < 0.25) c.setHex(0xffe7c2);
    else c.setHex(0xffffff);

    const brightness = 0.55 + Math.random() * 0.45;
    colors[i * 3] = c.r * brightness;
    colors[i * 3 + 1] = c.g * brightness;
    colors[i * 3 + 2] = c.b * brightness;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    size: 2.1,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    fog: false,
  });
  return new THREE.Points(geo, mat);
}

export interface SpacecraftRig {
  group: THREE.Group;
  doorMesh: THREE.Mesh;
  thrusterGlow: THREE.Mesh;
  thrusterLight: THREE.PointLight;
}

export function createDepartureSpacecraft(): SpacecraftRig {
  const group = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({ color: 0xe6ecf2, roughness: 0.35, metalness: 0.35 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x262d38, roughness: 0.45, metalness: 0.78 });
  const goldFoil = new THREE.MeshStandardMaterial({ color: 0xd99b26, roughness: 0.22, metalness: 0.88 });
  const blueTrim = new THREE.MeshStandardMaterial({ color: 0x1d6fe8, roughness: 0.4, metalness: 0.25 });

  // Lower descent stage octagon + gold thermal foil
  const lowerStage = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.0, 2.2, 8), goldFoil);
  lowerStage.position.y = 2.0;
  lowerStage.castShadow = true;
  group.add(lowerStage);

  // 4 Landing legs + footpads
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const legGroup = new THREE.Group();
    legGroup.rotation.y = angle;
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.5, 8), darkMetal);
    strut.position.set(2.9, 1.15, 0);
    strut.rotation.z = -0.42;
    strut.castShadow = true;
    legGroup.add(strut);

    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.18, 12), darkMetal);
    pad.position.set(3.45, 0.09, 0);
    legGroup.add(pad);
    group.add(legGroup);
  }

  // Crew ascent cabin
  const cabin = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 2.2, 3.2, 16), hullMat);
  cabin.position.y = 4.65;
  cabin.castShadow = true;
  group.add(cabin);

  // Nose cone
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.75, 1.8, 16), hullMat);
  nose.position.y = 7.15;
  nose.castShadow = true;
  group.add(nose);

  // Blue stripe & cockpit windows
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(2.02, 2.08, 0.35, 16), blueTrim);
  stripe.position.y = 4.1;
  group.add(stripe);

  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x6fd4ff,
    emissive: 0x19578c,
    emissiveIntensity: 0.7,
    roughness: 0.15,
    metalness: 0.6,
  });
  const cockpitWin = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.65, 0.25), windowMat);
  cockpitWin.position.set(0, 5.2, 1.82);
  group.add(cockpitWin);

  // Boarding airlock door
  const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.8, 0.18), darkMetal);
  doorMesh.position.set(1.9, 3.8, 0);
  doorMesh.rotation.y = Math.PI / 2;
  group.add(doorMesh);

  // Main Engine Nozzle
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.1, 1.1, 16), darkMetal);
  nozzle.position.y = 0.65;
  group.add(nozzle);

  // Thruster exhaust plume (hidden until ignition)
  const thrusterGlow = new THREE.Mesh(
    new THREE.ConeGeometry(1.15, 4.6, 16),
    new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0.85,
    }),
  );
  thrusterGlow.rotation.x = Math.PI;
  thrusterGlow.position.y = -2.0;
  thrusterGlow.visible = false;
  group.add(thrusterGlow);

  const thrusterLight = new THREE.PointLight(0xff8c2a, 0, 45);
  thrusterLight.position.set(0, -1.2, 0);
  group.add(thrusterLight);

  return { group, doorMesh, thrusterGlow, thrusterLight };
}

function createRealisticMeteoriteMesh(radius: number, seed: number, isMainCore = false): THREE.Group {
  const g = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(radius, isMainCore ? 3 : 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    // Irregular stony lobes + regmaglypt thumbprint ablation pits
    const lobe = 0.78 + 0.24 * Math.sin(vx * 2.1 + seed) * Math.cos(vz * 1.9 - seed * 0.7);
    const dimple = Math.abs(Math.sin(vx * 4.8 + vy * 5.2 + seed)) * 0.14;
    const scale = lobe - dimple;
    pos.setXYZ(i, vx * scale * 1.18, vy * scale * 0.82, vz * scale);

    // Metallic nickel-iron streaks mixed into dark fusion-crusted silicate crust
    const metallicVein = Math.sin(vx * 3.7 + vy * 4.4 + seed) * Math.cos(vz * 4.1);
    if (metallicVein > 0.38) {
      c.setRGB(0.56, 0.58, 0.62); // Glinting nickel-iron metal fleck
    } else if (metallicVein < -0.2) {
      c.setRGB(0.14, 0.13, 0.14); // Charred dark fusion crust
    } else {
      c.setRGB(0.27, 0.23, 0.2); // Stony iron-oxide chondrite
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.42,
    metalness: 0.78,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);

  // Embedded metallic chondrule nodules so it is unmistakably distinct from grey lunar regolith
  if (isMainCore) {
    const noduleMat = new THREE.MeshStandardMaterial({
      color: 0xb0b8c4,
      roughness: 0.22,
      metalness: 0.94,
    });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      const nod = new THREE.Mesh(new THREE.DodecahedronGeometry(radius * 0.22, 0), noduleMat);
      nod.position.set(Math.cos(a) * radius * 0.72, radius * 0.18 * (k % 2 === 0 ? 1 : -0.4), Math.sin(a) * radius * 0.68);
      nod.rotation.set(k, k * 1.4, 0);
      g.add(nod);
    }
  }
  return g;
}

export const APOLLO_FOOTPRINT_OFFSET_X = -1.25;
export const APOLLO_FOOTPRINT_OFFSET_Z = 0.75;
export const APOLLO_FLAG_OFFSET_X = 0.85;
export const APOLLO_FLAG_OFFSET_Z = -0.55;

export interface WorldPropsRig {
  meteoriteFragments: THREE.Group[];
  meteoriteCore: THREE.Group;
  iceNodes: THREE.Group[];
  forgottenRover: THREE.Group;
  forgottenRoverWheels: THREE.Mesh[];
  forgottenRoverBeacon: THREE.Mesh;
  rockfallGroup: THREE.Group;
  relayStation: THREE.Group;
  relayDishPivot: THREE.Group;
  apollo11Group: THREE.Group;
  apolloDiscoveryRing: THREE.Mesh;
  optionalMarkers: Map<string, THREE.Group>;
}

function drawFivePointStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, outerR: number, innerR: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function createAmericanFlagTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 270;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  const stripeH = h / 13;
  for (let i = 0; i < 13; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#b91c1c' : '#f8fafc';
    ctx.fillRect(0, i * stripeH, w, stripeH + 0.6);
  }
  const cantonW = w * 0.4;
  const cantonH = stripeH * 7;
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(0, 0, cantonW, cantonH);

  ctx.fillStyle = '#ffffff';
  for (let row = 0; row < 9; row++) {
    const cols = row % 2 === 0 ? 6 : 5;
    const y = (row + 0.85) * (cantonH / 9.8);
    for (let col = 0; col < cols; col++) {
      const xOff = row % 2 === 0 ? 0.62 : 1.12;
      const x = (col + xOff) * (cantonW / 6.7);
      drawFivePointStar(ctx, x, y, 4.4, 1.85);
    }
  }

  // Subtle nylon fabric ripple shading
  for (let x = 0; x < w; x += 36) {
    const grad = ctx.createLinearGradient(x, 0, x + 36, 0);
    grad.addColorStop(0, 'rgba(0,0,0,0.0)');
    grad.addColorStop(0.5, 'rgba(0,0,0,0.11)');
    grad.addColorStop(1, 'rgba(255,255,255,0.08)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, 36, h);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createRegolithGrainBumpTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6500; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const v = 86 + Math.floor(Math.random() * 88);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createApolloBootprintAssembly(): THREE.Group {
  const group = new THREE.Group();
  const grainBump = createRegolithGrainBumpTexture();
  grainBump.repeat.set(3, 3);

  // Sculpted 3D regolith bed with genuine depressed sole cavity, raised dust rim & tread channels
  const size = 2.6;
  const segs = 64;
  const bedGeo = new THREE.PlaneGeometry(size, size, segs, segs);
  bedGeo.rotateX(-Math.PI / 2);

  const pos = bedGeo.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  // Boot sole local half-dimensions (~0.24m wide x ~0.50m long, iconic Apollo overshoe silhouette)
  const halfW = 0.23;
  const halfL = 0.49;

  for (let i = 0; i < pos.count; i++) {
    const lx = pos.getX(i);
    const lz = pos.getZ(i);

    // Taper slightly narrower at heel/arch vs forefoot like real Apollo overshoe
    const waist = 1.0 - 0.14 * Math.exp(-Math.pow((lz - 0.12) / 0.14, 2));
    const sx = lx / (halfW * waist);
    const sz = lz / halfL;
    // Rounded-rectangle signed distance approximation in normalized coordinates
    const ax = Math.max(0, Math.abs(sx) - 0.34);
    const az = Math.max(0, Math.abs(sz) - 0.54);
    const normDist = Math.hypot(ax / 0.66, az / 0.46);

    const radialEdge = Math.hypot(lx, lz);
    const outerFade = Math.max(0, 1 - Math.max(0, radialEdge - 0.72) / 0.55);

    let y = 0.008 * outerFade;
    let shade = 0.54;

    if (normDist < 1.0) {
      // Physically embedded sole impression (-0.072m deep)
      const wall = 1 - Math.pow(normDist, 4);
      const treadWave = Math.cos(lz * 56.0);
      // Distinct deep heel-to-forefoot arch separation + horizontal transverse tread grooves
      const archRidge = Math.exp(-Math.pow((lz - 0.13) / 0.032, 2)) * 0.018;
      const treadRelief = treadWave * 0.016;
      y = (-0.068 * wall + treadRelief * wall + archRidge * wall) + 0.005;
      // Compacted shaded regolith inside depression
      shade = 0.34 + 0.06 * treadWave;
    } else if (normDist < 1.65) {
      // Displaced lunar soil pushed up along the perimeter rim around the boot
      const rimT = 1 - Math.abs((normDist - 1.24) / 0.41);
      const rim = Math.max(0, rimT);
      y = (rim * rim * 0.044 + (Math.sin(lx * 24 + lz * 19) * 0.004) * rim) * outerFade;
      shade = 0.54 + rim * 0.09;
    } else {
      // Blend smoothly into surrounding lunar soil height
      const micro = Math.sin(lx * 17 + lz * 13) * 0.004 * outerFade;
      y = micro - 0.004 * (1 - outerFade);
      shade = 0.54;
    }

    pos.setY(i, y);
    colors[i * 3] = shade;
    colors[i * 3 + 1] = shade * 1.005;
    colors[i * 3 + 2] = shade * 1.025;
  }

  bedGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  bedGeo.computeVertexNormals();

  const soilMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    bumpMap: grainBump,
    bumpScale: 0.045,
    roughness: 0.96,
    metalness: 0.02,
  });
  const bedMesh = new THREE.Mesh(bedGeo, soilMat);
  bedMesh.receiveShadow = true;
  bedMesh.castShadow = true;
  group.add(bedMesh);

  // Additional sculpted 3D sole tread bars pressed along the bottom of the print for crisp oblique shadows
  const ribMat = new THREE.MeshStandardMaterial({
    color: 0x525864,
    bumpMap: grainBump,
    bumpScale: 0.03,
    roughness: 0.95,
    metalness: 0.03,
  });
  const ribOffsetsZ = [-0.36, -0.27, -0.18, -0.09, 0.0, 0.12, 0.22, 0.31, 0.39];
  ribOffsetsZ.forEach((rz, idx) => {
    const widthScale = idx === 0 || idx === ribOffsetsZ.length - 1 ? 0.72 : idx === 5 ? 0.8 : 0.96;
    const rib = new THREE.Mesh(
      new THREE.BoxGeometry(0.32 * widthScale, 0.024, 0.036),
      ribMat,
    );
    rib.position.set(0, -0.044, rz);
    rib.castShadow = true;
    rib.receiveShadow = true;
    group.add(rib);
  });

  return group;
}

export function buildMissionWorldProps(): { root: THREE.Group; rig: WorldPropsRig } {
  const root = new THREE.Group();
  const meteoriteFragments: THREE.Group[] = [];
  const iceNodes: THREE.Group[] = [];
  const optionalMarkers = new Map<string, THREE.Group>();

  // 1. Realistic Meteorite Impact Site at (-145, -135)
  const meteorCenter = new THREE.Group();
  const mcY = groundHeightAt(-145, -135);
  meteorCenter.position.set(-145, mcY, -135);

  // Displaced scorched regolith mound & skid gouge around main meteorite
  const moundMat = new THREE.MeshStandardMaterial({ color: 0x3b3d42, roughness: 0.95, metalness: 0.08 });
  const impactMound = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.72, 10, 24), moundMat);
  impactMound.rotation.x = Math.PI / 2;
  impactMound.scale.set(1.25, 1.0, 0.6);
  impactMound.position.y = 0.08;
  impactMound.receiveShadow = true;
  meteorCenter.add(impactMound);

  const meteoriteCore = createRealisticMeteoriteMesh(2.2, 1.3, true);
  meteoriteCore.position.set(0, 0.95, 0);
  meteoriteCore.rotation.set(0.32, 0.85, -0.22);
  meteorCenter.add(meteoriteCore);

  // Scattered non-collectible impact pebbles & regolith chunks of varied sizes
  const pebbleMat = new THREE.MeshStandardMaterial({ color: 0x454952, roughness: 0.85, metalness: 0.35 });
  for (let p = 0; p < 16; p++) {
    const a = (p / 16) * Math.PI * 2 + 0.3;
    const dist = 3.8 + (p % 4) * 3.4;
    const px = -145 + Math.cos(a) * dist;
    const pz = -135 + Math.sin(a) * dist;
    const peb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 + (p % 3) * 0.14, 0), pebbleMat);
    peb.position.set(px, groundHeightAt(px, pz) + 0.12, pz);
    peb.rotation.set(p, p * 0.7, 0);
    peb.castShadow = true;
    root.add(peb);
  }
  root.add(meteorCenter);

  // 3 Collectible Realistic Metallic-Stony Meteorite Fragments (different sizes, NO cartoon glow!)
  const fragSpecs: Array<{ x: number; z: number; size: number; seed: number }> = [
    { x: -133, z: -127, size: 0.56, seed: 2.1 },
    { x: -156, z: -124, size: 0.44, seed: 4.8 },
    { x: -149, z: -149, size: 0.64, seed: 7.3 },
  ];
  fragSpecs.forEach((spec) => {
    const fg = new THREE.Group();
    fg.position.set(spec.x, groundHeightAt(spec.x, spec.z), spec.z);
    const rock = createRealisticMeteoriteMesh(spec.size, spec.seed, false);
    rock.position.y = spec.size * 0.58;
    fg.add(rock);

    // Subtle holographic surveyor ring on ground (clean scientific marker, not glowing rock)
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 0.96, 28),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide, transparent: true, opacity: 0.55 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.08;
    fg.add(ring);

    root.add(fg);
    meteoriteFragments.push(fg);
  });

  // 2. Underground Signal Node at Signal Crater (165, -95) — Seismic Resonance Outcrop & Probe
  const sigY = groundHeightAt(165, -95);
  const sigBeacon = new THREE.Group();
  sigBeacon.position.set(165, sigY, -95);
  const oreMesh = createRealisticMeteoriteMesh(1.4, 9.2, false);
  oreMesh.position.y = 0.65;
  sigBeacon.add(oreMesh);
  const probeSpike = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 1.9, 10),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.7 }),
  );
  probeSpike.position.set(0.9, 0.95, 0.6);
  sigBeacon.add(probeSpike);
  const probeLed = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x06b6d4, emissiveIntensity: 1.1 }),
  );
  probeLed.position.set(0.9, 1.95, 0.6);
  sigBeacon.add(probeLed);
  root.add(sigBeacon);

  // 3. Permanently Shadowed Crater Ice Deposits at (-170, 145)
  const iceCoords: [number, number][] = [
    [-170, 145],
    [-162, 152],
    [-178, 139],
  ];
  iceCoords.forEach(([ix, iz], idx) => {
    const ig = new THREE.Group();
    ig.position.set(ix, groundHeightAt(ix, iz), iz);
    const iceSlab = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.95, 1),
      new THREE.MeshPhysicalMaterial({
        color: 0xcffafe,
        roughness: 0.18,
        metalness: 0.05,
        clearcoat: 0.85,
        clearcoatRoughness: 0.15,
      }),
    );
    iceSlab.scale.set(1.35, 0.42, 1.05);
    iceSlab.rotation.y = idx * 1.1;
    iceSlab.position.y = 0.25;
    ig.add(iceSlab);
    root.add(ig);
    iceNodes.push(ig);
  });

  // 4. Forgotten Historic Rover at (130, 155) — Detailed 6-wheel heritage explorer
  const forgottenRover = new THREE.Group();
  forgottenRover.position.set(130, groundHeightAt(130, 155), 155);
  forgottenRover.rotation.y = 0.7;
  const fGold = new THREE.MeshStandardMaterial({ color: 0xd49b2a, roughness: 0.32, metalness: 0.82 });
  const fFrame = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.65, metalness: 0.55 });
  const fSolar = new THREE.MeshStandardMaterial({ color: 0x172554, roughness: 0.25, metalness: 0.7 });

  const fBody = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.62, 3.0), fGold);
  fBody.position.y = 0.92;
  fBody.castShadow = true;
  forgottenRover.add(fBody);

  const fDeck = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 2.2), fSolar);
  fDeck.position.set(0, 1.3, -0.35);
  forgottenRover.add(fDeck);

  const fMast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.6, 8), fFrame);
  fMast.position.set(0.4, 1.85, 0.95);
  forgottenRover.add(fMast);

  const fCam = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.32, 0.42), fFrame);
  fCam.position.set(0.4, 2.68, 0.95);
  forgottenRover.add(fCam);

  const forgottenRoverBeacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x64748b, emissive: 0x000000, emissiveIntensity: 0 }),
  );
  forgottenRoverBeacon.position.set(-0.6, 1.9, -1.0);
  forgottenRover.add(forgottenRoverBeacon);

  const forgottenRoverWheels: THREE.Mesh[] = [];
  for (const wx of [-1.25, 1.25]) {
    for (const wz of [-1.15, 0, 1.15]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 14), fFrame);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.42, wz);
      wheel.castShadow = true;
      forgottenRover.add(wheel);
      forgottenRoverWheels.push(wheel);
    }
  }
  root.add(forgottenRover);

  // 5. Rockfall Pass Barrier at (55, 195)
  const rockfallGroup = new THREE.Group();
  rockfallGroup.position.set(55, groundHeightAt(55, 195), 195);
  const boulderMat = new THREE.MeshStandardMaterial({ color: 0x676d77, roughness: 0.92, metalness: 0.06 });
  const boulderOffsets: [number, number, number, number][] = [
    [-3.4, 1.2, 0.5, 2.2],
    [0.0, 1.7, -0.4, 2.8],
    [3.5, 1.1, 0.8, 2.0],
    [-1.4, 2.4, 1.2, 1.6],
    [1.8, 2.1, -1.1, 1.8],
  ];
  boulderOffsets.forEach(([bx, by, bz, sc], idx) => {
    const b = new THREE.Mesh(new THREE.DodecahedronGeometry(sc, 1), boulderMat);
    b.position.set(bx, by, bz);
    b.rotation.set(idx, idx * 1.2, 0);
    b.castShadow = true;
    b.receiveShadow = true;
    rockfallGroup.add(b);
  });
  root.add(rockfallGroup);

  // 6. Remote Communication Relay Station at (-35, 225)
  const relayStation = new THREE.Group();
  relayStation.position.set(-35, groundHeightAt(-35, 225), 225);
  const rMetal = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.38, metalness: 0.65 });
  const rDark = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.6 });
  const rBase = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.3, 1.3, 8), rMetal);
  rBase.position.y = 0.65;
  rBase.castShadow = true;
  relayStation.add(rBase);
  const rMast = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 4.8, 10), rDark);
  rMast.position.y = 3.3;
  rMast.castShadow = true;
  relayStation.add(rMast);
  const relayDishPivot = new THREE.Group();
  relayDishPivot.position.set(0, 5.7, 0);
  const rDish = new THREE.Mesh(
    new THREE.ConeGeometry(2.3, 1.05, 22, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.28, metalness: 0.4, side: THREE.DoubleSide }),
  );
  rDish.rotation.x = Math.PI * 0.45;
  relayDishPivot.add(rDish);
  const feedhorn = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.1, 8), rDark);
  feedhorn.position.set(0, 0.4, 0.9);
  feedhorn.rotation.x = Math.PI * 0.45;
  relayDishPivot.add(feedhorn);
  relayStation.add(relayDishPivot);
  root.add(relayStation);

  // 7. Historic Apollo 11 Landing Site at (-325, 295) — Quiet, uncluttered tribute: ONLY the footprint & US flag
  const apollo11Group = new THREE.Group();
  apollo11Group.position.set(APOLLO_SITE_X, groundHeightAt(APOLLO_SITE_X, APOLLO_SITE_Z), APOLLO_SITE_Z);

  // Sculpted 3D boot footprint embedded physically into lunar regolith
  const bootPrintAssembly = createApolloBootprintAssembly();
  bootPrintAssembly.position.set(APOLLO_FOOTPRINT_OFFSET_X, 0.01, APOLLO_FOOTPRINT_OFFSET_Z);
  bootPrintAssembly.rotation.y = 0.32;
  apollo11Group.add(bootPrintAssembly);

  // Telescoping flagpole + top horizontal crossbar + American Flag standing nearby
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.28, metalness: 0.88 });
  const finialMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.25, metalness: 0.9 });
  const vPole = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 2.65, 12), poleMat);
  vPole.position.set(APOLLO_FLAG_OFFSET_X, 1.32, APOLLO_FLAG_OFFSET_Z);
  vPole.castShadow = true;
  apollo11Group.add(vPole);

  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), finialMat);
  finial.position.set(APOLLO_FLAG_OFFSET_X, 2.66, APOLLO_FLAG_OFFSET_Z);
  apollo11Group.add(finial);

  const hBar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.56, 8), poleMat);
  hBar.rotation.z = Math.PI / 2;
  hBar.position.set(APOLLO_FLAG_OFFSET_X + 0.76, 2.55, APOLLO_FLAG_OFFSET_Z);
  hBar.castShadow = true;
  apollo11Group.add(hBar);

  const flagGeo = new THREE.PlaneGeometry(1.52, 0.86, 14, 5);
  const fPos = flagGeo.attributes.position;
  for (let i = 0; i < fPos.count; i++) {
    const fx = fPos.getX(i);
    fPos.setZ(i, Math.sin((fx + 0.76) * 4.4) * 0.042);
  }
  flagGeo.computeVertexNormals();
  const flagMesh = new THREE.Mesh(
    flagGeo,
    new THREE.MeshStandardMaterial({
      map: createAmericanFlagTexture(),
      roughness: 0.72,
      metalness: 0.04,
      side: THREE.DoubleSide,
    }),
  );
  flagMesh.position.set(APOLLO_FLAG_OFFSET_X + 0.77, 2.11, APOLLO_FLAG_OFFSET_Z);
  flagMesh.castShadow = true;
  apollo11Group.add(flagMesh);

  // Subtle discovery highlight ring centered neatly around the footprint (opacity controlled by proximity/discovery)
  const apolloDiscoveryRing = new THREE.Mesh(
    new THREE.RingGeometry(0.95, 1.12, 36),
    new THREE.MeshBasicMaterial({
      color: 0xfde68a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    }),
  );
  apolloDiscoveryRing.rotation.x = -Math.PI / 2;
  apolloDiscoveryRing.position.set(APOLLO_FOOTPRINT_OFFSET_X, 0.06, APOLLO_FOOTPRINT_OFFSET_Z);
  apollo11Group.add(apolloDiscoveryRing);
  root.add(apollo11Group);

  // 8. Partially Buried Research Archive at (285, -240)
  {
    const buried = new THREE.Group();
    buried.position.set(285, groundHeightAt(285, -240), -240);
    const oldDome = new THREE.Mesh(
      new THREE.SphereGeometry(4.2, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.75, metalness: 0.4 }),
    );
    oldDome.position.set(0, -1.1, 0);
    oldDome.rotation.z = 0.22;
    oldDome.castShadow = true;
    buried.add(oldDome);

    const dustMound = new THREE.Mesh(
      new THREE.SphereGeometry(3.8, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.45),
      new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.95 }),
    );
    dustMound.position.set(1.8, -0.9, 1.4);
    dustMound.scale.set(1.3, 0.6, 1.1);
    buried.add(dustMound);

    const oldSolar = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.12, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4, metalness: 0.5 }),
    );
    oldSolar.position.set(-2.5, 1.1, -1.2);
    oldSolar.rotation.set(0.3, 0.4, -0.25);
    buried.add(oldSolar);
    root.add(buried);
  }

  // 9. Ancient Basalt Lava Arch at (-265, -245)
  {
    const archGroup = new THREE.Group();
    archGroup.position.set(-265, groundHeightAt(-265, -245), -245);
    const archMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.92, metalness: 0.08 });
    const archGeo = new THREE.TorusGeometry(6.5, 1.55, 8, 18, Math.PI);
    const archMesh = new THREE.Mesh(archGeo, archMat);
    archMesh.position.y = 0.4;
    archMesh.rotation.y = 0.55;
    archMesh.castShadow = true;
    archMesh.receiveShadow = true;
    archGroup.add(archMesh);
    root.add(archGroup);
  }

  // Optional Activity Interactive Markers (compact scientific survey tripods)
  const optionalCoords: Array<[string, number, number, number]> = [
    ['opt_basalt_rock', -95, -80, 0xfbbf24],
    ['opt_earth_photo_overlook', -75, -48, 0x38bdf8],
    ['opt_observatory_view', -41, 32, 0x60a5fa],
    ['opt_hidden_equip', 88, -65, 0x34d399],
    ['opt_old_tracks', 65, 92, 0xf59e0b],
    ['opt_buried_vault', 285, -240, 0xf59e0b],
    ['opt_west_crater_rim', -215, 10, 0x60a5fa],
    ['opt_abandoned_beacon', -295, -180, 0x34d399],
    ['opt_lava_arch', -265, -245, 0xfbbf24],
    ['opt_tranquility_ridge', 280, -195, 0x38bdf8],
    ['opt_hidden_log_north', -20, -185, 0xa78bfa],
    ['opt_south_geology', 75, -205, 0xf472b6],
    ['opt_south_crater_samples', 210, 290, 0xf472b6],
  ];
  for (const [id, ox, oz, hex] of optionalCoords) {
    const og = new THREE.Group();
    og.position.set(ox, groundHeightAt(ox, oz), oz);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.09, 1.5, 8),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.65 }),
    );
    pole.position.y = 0.75;
    og.add(pole);
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.28, 0.28),
      new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.65, roughness: 0.25 }),
    );
    head.position.y = 1.62;
    og.add(head);
    root.add(og);
    optionalMarkers.set(id, og);
  }

  return {
    root,
    rig: {
      meteoriteFragments,
      meteoriteCore,
      iceNodes,
      forgottenRover,
      forgottenRoverWheels,
      forgottenRoverBeacon,
      rockfallGroup,
      relayStation,
      relayDishPivot,
      apollo11Group,
      apolloDiscoveryRing,
      optionalMarkers,
    },
  };
}

