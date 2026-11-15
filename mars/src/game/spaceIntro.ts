import * as THREE from 'three';
import { CARGO_LANDING_PAD_POS } from './marsConfig';
import { groundHeightAt } from './marsTerrain';
import { createSoftParticleTexture } from './proceduralTextures';
import { WorldVisualState } from './types';

export interface SpaceAndLanderHandles {
  spaceGroup: THREE.Group;
  landerGroup: THREE.Group;
  landingDust: THREE.Points;
  cargoLanderGroup: THREE.Group;
  cargoDust: THREE.Points;
  marsPlanet: THREE.Mesh;
  landerWorldPos: THREE.Vector3;
  cargoLanderWorldPos: THREE.Vector3;
  update: (elapsed: number, dt: number, state: WorldVisualState) => void;
  dispose: () => void;
}

function createMarsGlobeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#e5d4c5'); // north polar cap tint
  grad.addColorStop(0.12, '#c86037');
  grad.addColorStop(0.5, '#b64a28');
  grad.addColorStop(0.88, '#9b3c20');
  grad.addColorStop(1, '#e8dbd0'); // south polar cap tint
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Dark basaltic plains (Syrtis Major style regions)
  let seed = 4242;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let i = 0; i < 48; i++) {
    const x = rand() * 1024;
    const y = 70 + rand() * 372;
    const rx = 24 + rand() * 90;
    const ry = 14 + rand() * 50;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(84, 30, 18, 0.34)' : 'rgba(229, 134, 82, 0.24)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // Valles Marineris canyon scar
  ctx.strokeStyle = 'rgba(68, 22, 12, 0.55)';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(350, 265);
  ctx.bezierCurveTo(430, 250, 510, 282, 610, 268);
  ctx.stroke();

  // Impact craters
  for (let i = 0; i < 95; i++) {
    const cx = rand() * 1024;
    const cy = 65 + rand() * 380;
    const r = 3 + rand() * 15;
    ctx.fillStyle = 'rgba(66, 24, 15, 0.28)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(244, 174, 125, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 1.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createSpaceAndLander(landingPadPos: [number, number]): SpaceAndLanderHandles {
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // =========================================================================
  // 1. OUTER SPACE SCENE GROUP (Mars Globe + Atmosphere + Starfield)
  // =========================================================================
  const spaceGroup = new THREE.Group();
  spaceGroup.position.set(0, 180, 0); // Elevated far above Mars surface sky dome

  const marsTex = track(createMarsGlobeTexture());
  const marsGeo = track(new THREE.SphereGeometry(14, 48, 36));
  const marsMat = track(
    new THREE.MeshStandardMaterial({
      map: marsTex,
      roughness: 0.85,
      metalness: 0.05,
    }),
  );
  const marsPlanet = new THREE.Mesh(marsGeo, marsMat);
  marsPlanet.rotation.z = 0.42; // Mars ~25 deg axial tilt
  spaceGroup.add(marsPlanet);

  // Subtle dusty orange atmosphere rim around Mars
  const atmoGeo = track(new THREE.SphereGeometry(14.75, 40, 32));
  const atmoMat = track(
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
          gl_FragColor = vec4(0.95, 0.52, 0.25, 1.0) * clamp(intensity, 0.0, 0.85);
        }
      `,
    }),
  );
  const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
  spaceGroup.add(atmoMesh);

  // Starfield around space view
  const starCount = 900;
  const starPos = new Float32Array(starCount * 3);
  let seed = 8899;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < starCount; i++) {
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    const rad = 65 + rand() * 55;
    starPos[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = rad * Math.cos(phi);
    starPos[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = track(new THREE.BufferGeometry());
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starTex = track(createSoftParticleTexture('star'));
  const dustTex = track(createSoftParticleTexture('dust'));
  const starMat = track(
    new THREE.PointsMaterial({
      color: '#f8fafc',
      map: starTex,
      size: 0.72,
      transparent: true,
      opacity: 0.92,
      alphaTest: 0.01,
      depthWrite: false,
    }),
  );
  const stars = new THREE.Points(starGeo, starMat);
  spaceGroup.add(stars);

  // =========================================================================
  // 2. ARES SPACECRAFT LANDER (Crew Shuttle + Thruster Plumes + Dust)
  // =========================================================================
  const landerGroup = new THREE.Group();
  const padGroundY = groundHeightAt(landingPadPos[0], landingPadPos[1]);
  const parkedPos = new THREE.Vector3(landingPadPos[0], padGroundY + 0.15, landingPadPos[1]);
  const landerWorldPos = parkedPos.clone();

  const hullMat = track(new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.4, metalness: 0.25 }));
  const darkMat = track(new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.65, metalness: 0.4 }));
  const orangeMat = track(new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.38, metalness: 0.25 }));
  const amberMat = track(new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.35, metalness: 0.35 }));
  const goldMat = track(new THREE.MeshStandardMaterial({ color: '#fbbf24', roughness: 0.25, metalness: 0.88 }));
  const glassMat = track(
    new THREE.MeshStandardMaterial({
      color: '#0f172a',
      emissive: '#38bdf8',
      emissiveIntensity: 0.65,
      roughness: 0.15,
      metalness: 0.85,
    }),
  );

  // Main descent fuselage
  const lowerHull = new THREE.Mesh(track(new THREE.CylinderGeometry(1.75, 2.25, 1.4, 8)), darkMat);
  lowerHull.position.y = 1.45;
  lowerHull.castShadow = true;
  landerGroup.add(lowerHull);

  const cabin = new THREE.Mesh(track(new THREE.CylinderGeometry(1.35, 1.85, 2.0, 8)), hullMat);
  cabin.position.y = 3.1;
  cabin.castShadow = true;
  landerGroup.add(cabin);

  const noseCone = new THREE.Mesh(track(new THREE.ConeGeometry(1.35, 1.4, 8)), orangeMat);
  noseCone.position.y = 4.8;
  noseCone.castShadow = true;
  landerGroup.add(noseCone);

  const cockpit = new THREE.Mesh(track(new THREE.BoxGeometry(1.4, 0.72, 0.35)), glassMat);
  cockpit.position.set(0, 3.45, 1.45);
  cockpit.rotation.x = -0.18;
  landerGroup.add(cockpit);

  [-1.95, 1.95].forEach((px) => {
    const pod = new THREE.Mesh(track(new THREE.CylinderGeometry(0.45, 0.55, 1.8, 10)), hullMat);
    pod.position.set(px, 1.85, 0);
    pod.castShadow = true;
    landerGroup.add(pod);

    const stripe = new THREE.Mesh(track(new THREE.CylinderGeometry(0.48, 0.48, 0.3, 10)), orangeMat);
    stripe.position.set(px, 2.35, 0);
    landerGroup.add(stripe);

    const nozzle = new THREE.Mesh(track(new THREE.CylinderGeometry(0.28, 0.44, 0.45, 10)), goldMat);
    nozzle.position.set(px, 0.75, 0);
    landerGroup.add(nozzle);
  });

  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const strut = new THREE.Mesh(track(new THREE.CylinderGeometry(0.09, 0.1, 1.85, 8)), darkMat);
    strut.position.set(Math.cos(a) * 2.1, 0.8, Math.sin(a) * 2.1);
    strut.rotation.z = Math.cos(a) * 0.52;
    strut.rotation.x = -Math.sin(a) * 0.52;
    strut.castShadow = true;
    landerGroup.add(strut);

    const foot = new THREE.Mesh(track(new THREE.CylinderGeometry(0.42, 0.52, 0.16, 8)), goldMat);
    foot.position.set(Math.cos(a) * 2.65, 0.08, Math.sin(a) * 2.65);
    landerGroup.add(foot);
  }

  const flameMat = track(
    new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.85,
    }),
  );
  const flameCoreMat = track(
    new THREE.MeshBasicMaterial({
      color: '#fef08a',
      transparent: true,
      opacity: 0.9,
    }),
  );
  const flames: THREE.Mesh[] = [];
  [-1.95, 0, 1.95].forEach((fx) => {
    const outer = new THREE.Mesh(track(new THREE.ConeGeometry(0.44, 2.6, 12)), flameMat);
    outer.rotation.x = Math.PI;
    outer.position.set(fx, -0.7, 0);
    landerGroup.add(outer);
    flames.push(outer);

    const inner = new THREE.Mesh(track(new THREE.ConeGeometry(0.22, 1.6, 10)), flameCoreMat);
    inner.rotation.x = Math.PI;
    inner.position.set(fx, -0.35, 0);
    landerGroup.add(inner);
    flames.push(inner);
  });

  const dustRingCount = 80;
  const dustRingPos = new Float32Array(dustRingCount * 3);
  const dustRingGeo = track(new THREE.BufferGeometry());
  dustRingGeo.setAttribute('position', new THREE.BufferAttribute(dustRingPos, 3));
  const dustRingMat = track(
    new THREE.PointsMaterial({
      color: '#e6a075',
      map: dustTex,
      size: 1.65,
      transparent: true,
      opacity: 0,
      alphaTest: 0.01,
      depthWrite: false,
    }),
  );
  const landingDust = new THREE.Points(dustRingGeo, dustRingMat);
  landingDust.position.copy(parkedPos);

  // =========================================================================
  // 3. HEAVY CARGO RESUPPLY LANDER (Dedicated to Cargo Pad [-28, -23])
  // =========================================================================
  const cargoLanderGroup = new THREE.Group();
  const cargoPadY = groundHeightAt(CARGO_LANDING_PAD_POS[0], CARGO_LANDING_PAD_POS[1]);
  const cargoParkedPos = new THREE.Vector3(
    CARGO_LANDING_PAD_POS[0],
    cargoPadY + 0.14,
    CARGO_LANDING_PAD_POS[1],
  );
  const cargoLanderWorldPos = cargoParkedPos.clone();

  // Wide industrial octagonal freight deck + amber gantry ribs (clearly distinct from crew lander)
  const cargoDeck = new THREE.Mesh(track(new THREE.BoxGeometry(4.4, 0.75, 4.4)), darkMat);
  cargoDeck.position.y = 1.35;
  cargoDeck.castShadow = true;
  cargoLanderGroup.add(cargoDeck);

  const cargoBayHull = new THREE.Mesh(track(new THREE.CylinderGeometry(2.15, 2.55, 2.25, 8)), hullMat);
  cargoBayHull.position.y = 2.75;
  cargoBayHull.castShadow = true;
  cargoLanderGroup.add(cargoBayHull);

  const cargoTopCap = new THREE.Mesh(track(new THREE.CylinderGeometry(1.4, 2.15, 0.95, 8)), amberMat);
  cargoTopCap.position.y = 4.35;
  cargoTopCap.castShadow = true;
  cargoLanderGroup.add(cargoTopCap);

  // Strobe beacon on crown
  const cargoBeaconMat = track(
    new THREE.MeshStandardMaterial({
      color: '#fbbf24',
      emissive: '#f59e0b',
      emissiveIntensity: 1.6,
    }),
  );
  const cargoBeacon = new THREE.Mesh(track(new THREE.SphereGeometry(0.24, 10, 8)), cargoBeaconMat);
  cargoBeacon.position.y = 4.95;
  cargoLanderGroup.add(cargoBeacon);

  // 4 heavy outer freight thrusters + struts
  const cargoFlames: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const cx = Math.cos(a) * 2.55;
    const cz = Math.sin(a) * 2.55;

    const thrPod = new THREE.Mesh(track(new THREE.CylinderGeometry(0.36, 0.45, 1.3, 10)), amberMat);
    thrPod.position.set(cx, 1.85, cz);
    thrPod.castShadow = true;
    cargoLanderGroup.add(thrPod);

    const noz = new THREE.Mesh(track(new THREE.CylinderGeometry(0.25, 0.38, 0.42, 10)), darkMat);
    noz.position.set(cx, 1.05, cz);
    cargoLanderGroup.add(noz);

    const cOuter = new THREE.Mesh(track(new THREE.ConeGeometry(0.38, 2.3, 10)), flameMat);
    cOuter.rotation.x = Math.PI;
    cOuter.position.set(cx, -0.25, cz);
    cargoLanderGroup.add(cOuter);
    cargoFlames.push(cOuter);

    const leg = new THREE.Mesh(track(new THREE.CylinderGeometry(0.11, 0.12, 1.85, 8)), darkMat);
    leg.position.set(Math.cos(a) * 2.45, 0.72, Math.sin(a) * 2.45);
    leg.rotation.z = Math.cos(a) * 0.48;
    leg.rotation.x = -Math.sin(a) * 0.48;
    cargoLanderGroup.add(leg);

    const padFoot = new THREE.Mesh(track(new THREE.CylinderGeometry(0.45, 0.56, 0.16, 8)), goldMat);
    padFoot.position.set(Math.cos(a) * 2.95, 0.08, Math.sin(a) * 2.95);
    cargoLanderGroup.add(padFoot);
  }

  // East-facing Cargo Ramp (faces toward Cargo Warehouse at [-15.5, -23])
  const rampPivot = new THREE.Group();
  rampPivot.position.set(2.15, 1.05, 0);
  const rampMesh = new THREE.Mesh(track(new THREE.BoxGeometry(2.1, 0.14, 1.75)), metalMatPlaceholder());
  rampMesh.position.set(0.95, 0, 0);
  rampPivot.add(rampMesh);
  cargoLanderGroup.add(rampPivot);

  function metalMatPlaceholder() {
    return track(new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.45, metalness: 0.7 }));
  }

  // Stacked cargo crate visible on deck during unloading
  const deckCrate = new THREE.Mesh(track(new THREE.BoxGeometry(1.3, 0.95, 1.3)), orangeMat);
  deckCrate.position.set(1.2, 1.9, 0);
  deckCrate.castShadow = true;
  cargoLanderGroup.add(deckCrate);

  cargoLanderGroup.position.copy(cargoParkedPos);
  cargoLanderGroup.visible = false;

  const cargoDustGeo = track(new THREE.BufferGeometry());
  const cargoDustPos = new Float32Array(dustRingCount * 3);
  cargoDustGeo.setAttribute('position', new THREE.BufferAttribute(cargoDustPos, 3));
  const cargoDustMat = track(
    new THREE.PointsMaterial({
      color: '#e6a075',
      map: dustTex,
      size: 1.85,
      transparent: true,
      opacity: 0,
      alphaTest: 0.01,
      depthWrite: false,
    }),
  );
  const cargoDust = new THREE.Points(cargoDustGeo, cargoDustMat);
  cargoDust.position.copy(cargoParkedPos);

  let animAltitude = 0;
  let lastLanderState: WorldVisualState['landerState'] = 'parked';

  let cargoAltitude = 42;
  let lastCargoPhase: WorldVisualState['cargoDelivery']['phase'] = 'IDLE';

  const update = (elapsed: number, dt: number, state: WorldVisualState) => {
    marsPlanet.rotation.y += dt * 0.09;
    stars.rotation.y += dt * 0.008;

    // --- Crew Lander Update ---
    if (state.landerState !== lastLanderState) {
      if (state.landerState === 'descending') {
        animAltitude = 46;
      } else if (state.landerState === 'returning') {
        animAltitude = 42;
      } else if (state.landerState === 'parked' || state.landerState === 'departing') {
        animAltitude = 0;
      }
      lastLanderState = state.landerState;
    }

    let thrustersOn = false;
    let dustStrength = 0;

    if (state.landerState === 'orbit') {
      landerGroup.visible = true;
      landerGroup.position.set(
        Math.cos(elapsed * 0.35) * 19,
        180 + Math.sin(elapsed * 0.5) * 2.5,
        Math.sin(elapsed * 0.35) * 19,
      );
      landerGroup.rotation.set(0.22, -elapsed * 0.35, -0.2);
      landerGroup.scale.setScalar(0.28);
      thrustersOn = true;
    } else if (state.landerState === 'descending' || state.landerState === 'returning') {
      landerGroup.visible = true;
      landerGroup.scale.setScalar(1.0);
      animAltitude = THREE.MathUtils.damp(animAltitude, 0, 1.15, dt);
      landerGroup.position.set(parkedPos.x, parkedPos.y + animAltitude, parkedPos.z);
      landerGroup.rotation.set(
        Math.sin(elapsed * 3.5) * 0.025 * Math.min(1, animAltitude / 8),
        -0.65,
        Math.cos(elapsed * 2.8) * 0.025 * Math.min(1, animAltitude / 8),
      );
      thrustersOn = animAltitude > 0.35;
      dustStrength = animAltitude < 16 && animAltitude > 0.25 ? (1 - animAltitude / 16) * 0.85 : 0;
    } else if (state.landerState === 'departing') {
      landerGroup.visible = true;
      landerGroup.scale.setScalar(1.0);
      animAltitude += dt * (4.5 + animAltitude * 0.9);
      landerGroup.position.set(parkedPos.x, parkedPos.y + animAltitude, parkedPos.z);
      landerGroup.rotation.set(0, -0.65, 0);
      thrustersOn = true;
      dustStrength = animAltitude < 14 ? (1 - animAltitude / 14) * 0.9 : 0;
      if (animAltitude > 75) {
        landerGroup.visible = false;
      }
    } else if (state.landerState === 'gone') {
      landerGroup.visible = false;
    } else {
      landerGroup.visible = true;
      landerGroup.scale.setScalar(1.0);
      landerGroup.position.copy(parkedPos);
      landerGroup.rotation.set(0, -0.65, 0);
    }

    landerWorldPos.copy(landerGroup.position);

    flames.forEach((f, idx) => {
      f.visible = thrustersOn;
      if (thrustersOn) {
        const flicker = 0.85 + Math.sin(elapsed * 38 + idx * 1.9) * 0.25;
        f.scale.set(1, flicker, 1);
      }
    });

    dustRingMat.opacity = THREE.MathUtils.damp(dustRingMat.opacity, dustStrength, 6, dt);
    if (dustRingMat.opacity > 0.02) {
      const attr = dustRingGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < dustRingCount; i++) {
        const a = (i / dustRingCount) * Math.PI * 2 + elapsed * 1.4;
        const r = 2.4 + ((elapsed * 5.2 + (i % 7) * 0.9) % 6.5);
        const h = 0.25 + (r / 9) * 1.8;
        attr.setXYZ(i, Math.cos(a) * r, h, Math.sin(a) * r);
      }
      attr.needsUpdate = true;
    }

    // --- Cargo Resupply Lander Update ---
    const cPhase = state.cargoDelivery.phase;
    if (cPhase !== lastCargoPhase) {
      if (cPhase === 'DESCENDING') cargoAltitude = 42;
      else if (cPhase === 'UNLOADING' || cPhase === 'TRANSPORTING') cargoAltitude = 0;
      lastCargoPhase = cPhase;
    }

    let cThrusters = false;
    let cDust = 0;
    let rampAngle = 1.2; // tucked up

    if (cPhase === 'DESCENDING') {
      cargoLanderGroup.visible = true;
      cargoAltitude = THREE.MathUtils.damp(cargoAltitude, 0, 1.3, dt);
      cargoLanderGroup.position.set(cargoParkedPos.x, cargoParkedPos.y + cargoAltitude, cargoParkedPos.z);
      cargoLanderGroup.rotation.set(
        Math.sin(elapsed * 3.1) * 0.02 * Math.min(1, cargoAltitude / 10),
        0,
        Math.cos(elapsed * 2.6) * 0.02 * Math.min(1, cargoAltitude / 10),
      );
      cThrusters = cargoAltitude > 0.3;
      cDust = cargoAltitude < 18 && cargoAltitude > 0.2 ? (1 - cargoAltitude / 18) * 0.92 : 0;
      deckCrate.visible = true;
    } else if (cPhase === 'UNLOADING') {
      cargoLanderGroup.visible = true;
      cargoAltitude = 0;
      cargoLanderGroup.position.copy(cargoParkedPos);
      cargoLanderGroup.rotation.set(0, 0, 0);
      rampAngle = -0.46; // lowered onto Cargo Pad surface
      deckCrate.visible = true;
    } else if (cPhase === 'TRANSPORTING') {
      cargoLanderGroup.visible = true;
      cargoLanderGroup.position.copy(cargoParkedPos);
      cargoLanderGroup.rotation.set(0, 0, 0);
      rampAngle = -0.46;
      deckCrate.visible = false; // loaded onto Robotic Transporter!
    } else if (cPhase === 'DELIVERED') {
      cargoAltitude += dt * (4.2 + cargoAltitude * 0.95);
      cargoLanderGroup.position.set(cargoParkedPos.x, cargoParkedPos.y + cargoAltitude, cargoParkedPos.z);
      cThrusters = true;
      cDust = cargoAltitude < 14 ? (1 - cargoAltitude / 14) * 0.85 : 0;
      deckCrate.visible = false;
      cargoLanderGroup.visible = cargoAltitude <= 68;
    } else {
      cargoLanderGroup.visible = false;
    }

    cargoLanderWorldPos.copy(cargoLanderGroup.position);
    rampPivot.rotation.z = THREE.MathUtils.damp(rampPivot.rotation.z, rampAngle, 5, dt);
    cargoBeaconMat.emissiveIntensity = 0.7 + Math.abs(Math.sin(elapsed * 6.5)) * 1.6;

    cargoFlames.forEach((f, idx) => {
      f.visible = cThrusters;
      if (cThrusters) {
        const flicker = 0.85 + Math.sin(elapsed * 36 + idx * 1.7) * 0.28;
        f.scale.set(1, flicker, 1);
      }
    });

    cargoDustMat.opacity = THREE.MathUtils.damp(cargoDustMat.opacity, cDust, 6, dt);
    if (cargoDustMat.opacity > 0.02) {
      const attr = cargoDustGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < dustRingCount; i++) {
        const a = (i / dustRingCount) * Math.PI * 2 + elapsed * 1.6;
        const r = 2.8 + ((elapsed * 5.8 + (i % 7) * 0.95) % 7.2);
        const h = 0.25 + (r / 9.5) * 1.9;
        attr.setXYZ(i, Math.cos(a) * r, h, Math.sin(a) * r);
      }
      attr.needsUpdate = true;
    }
  };

  return {
    spaceGroup,
    landerGroup,
    landingDust,
    cargoLanderGroup,
    cargoDust,
    marsPlanet,
    landerWorldPos,
    cargoLanderWorldPos,
    update,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
