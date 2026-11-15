import * as THREE from 'three';
import { resolveVehicleCollisions } from './colonyLayout';
import {
  CARGO_LANDING_PAD_POS,
  CHARGING_BAY_A_POS,
  CHARGING_BAY_B_POS,
  CHARGING_CONSOLE_POS,
  MARS_GRAVITY,
  MEV_BASELINE_WH_PER_M,
  MEV_BATTERY_CAPACITY_KWH,
  MEV_MASS_KG,
  MEV_WHEELBASE_M,
  MEV_WHEEL_RADIUS,
  ROVER_MAX_SPEED,
  ROVER_REVERSE_SPEED,
  SURFACE_TRACTION,
} from './marsConfig';
import { groundHeightAt, rockBumpAt, surfaceTypeAt } from './marsTerrain';
import { ProceduralTextureSet } from './proceduralTextures';
import { EXPANSION_PODS, LOST_ROVERS, MARS_ANOMALIES, MARS_LANDMARKS } from './roversData';
import { LostRoverId, WorldVisualState } from './types';

export const REMOTE_SITE_POS: [number, number] = [122, 48];
export const REMOTE_MEV_START = { x: 114.6, z: 50.8, yaw: -Math.PI * 0.72 };
export const RESEARCH_CAMP_PARKING_POS: [number, number] = [17.5, -10.5];
export const RESEARCH_DROP_PAD_POS: [number, number] = [15.8, -14.2];

/** Exact world position beside the MEV airlock hatch (port left = driver, starboard right = co-pilot) */
export function getMevHatchWorldPos(
  roverX: number,
  roverZ: number,
  roverYaw: number,
  lateralOutM = 1.68,
  forwardOffsetM = 0.2,
  side: 'left' | 'right' = 'left',
): [number, number] {
  const sinR = Math.sin(roverYaw);
  const cosR = Math.cos(roverYaw);
  const lx = side === 'left' ? -lateralOutM : lateralOutM;
  const lz = forwardOffsetM;
  return [roverX + lx * cosR + lz * sinR, roverZ - lx * sinR + lz * cosR];
}

export interface ColonyExpansionHandles {
  group: THREE.Group;
  roverPos: THREE.Vector3;
  vehicleProxy: THREE.Mesh;
  roverYaw: number;
  vehicleSpeedKmh: number;
  vehicleBatteryPct: number;
  vehicleBatteryKwh: number;
  vehicleInstantKw: number;
  vehicleConsumptionWhPerM: number;
  vehicleTractionPct: number;
  vehicleChargingActive: boolean;
  vehicleInChargingBay: boolean;
  vehicleChargingBayId: 'BAY_A' | 'BAY_B' | null;
  vehicleChargeRatePctPerSec: number;
  vehicleTimeToFullSec: number;
  vehicleStormSpeedLimited: boolean;
  nearChargingConsole: boolean;
  nearSupplyTerminal: boolean;
  dronePos: THREE.Vector3;
  getRoverInteriorCamPose: (
    eyeOut: THREE.Vector3,
    lookOut: THREE.Vector3,
    lookYawOffset?: number,
    lookPitchOffset?: number,
  ) => void;
  setRoverSnapshot: (x: number, z: number, yaw: number, batteryPct: number) => void;
  setRoverAutopilotTarget: (target: { x: number; z: number; yaw: number } | null) => void;
  addRoverBattery: (amount: number) => void;
  triggerScanPulse: (x: number, z: number) => void;
  resetRoverAndDrone: () => void;
  update: (
    elapsed: number,
    dt: number,
    state: WorldVisualState,
    nightFactor: number,
    playerPos: THREE.Vector3,
    playerYaw: number,
    driveInput: { forward: number; right: number },
  ) => void;
  dispose: () => void;
}

const _treadDummy = new THREE.Object3D();
const _camLocal = new THREE.Vector3();
const _lookLocal = new THREE.Vector3();

export function createColonyExpansion(
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean,
): ColonyExpansionHandles {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(d: T): T => {
    disposables.push(d);
    return d;
  };

  // Shared materials
  const hullMat = track(
    new THREE.MeshStandardMaterial({
      color: '#f1f5f9',
      map: textures.hullPanel,
      roughness: 0.55,
      metalness: 0.14,
    }),
  );
  const darkMat = track(
    new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.65, metalness: 0.35 }),
  );
  const metalMat = track(
    new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.3, metalness: 0.8 }),
  );
  const orangeMat = track(
    new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.36, metalness: 0.24 }),
  );
  const solarMat = track(
    new THREE.MeshStandardMaterial({ map: textures.solarCell, roughness: 0.22, metalness: 0.78 }),
  );
  const goldMat = track(
    new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.25, metalness: 0.88 }),
  );
  const hazardMat = track(
    new THREE.MeshStandardMaterial({ map: textures.hazardStripe, roughness: 0.55 }),
  );
  const rustStoneMat = track(
    new THREE.MeshStandardMaterial({ color: '#8f4229', roughness: 0.92, metalness: 0.06, flatShading: true }),
  );
  const scorchMat = track(
    new THREE.MeshStandardMaterial({ color: '#2b2421', roughness: 0.95, metalness: 0.15 }),
  );
  const paleMineralMat = track(
    new THREE.MeshStandardMaterial({ color: '#e5ddd5', roughness: 0.8, metalness: 0.04 }),
  );
  const nightWindowMat = track(
    new THREE.MeshStandardMaterial({
      color: '#0f172a',
      emissive: '#38bdf8',
      emissiveIntensity: 0.45,
      roughness: 0.2,
    }),
  );
  const mevWindshieldMat = track(
    new THREE.MeshPhysicalMaterial({
      color: '#bae6fd',
      roughness: 0.08,
      metalness: 0.05,
      transmission: isSoftwareGl ? 0 : 0.76,
      transparent: true,
      opacity: isSoftwareGl ? 0.34 : 0.84,
      ior: 1.48,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const lampHeadMat = track(
    new THREE.MeshStandardMaterial({
      color: '#fef08a',
      emissive: '#fbbf24',
      emissiveIntensity: 0.2,
      roughness: 0.2,
    }),
  );
  const iceMat = track(
    new THREE.MeshStandardMaterial({
      color: '#dbeafe',
      emissive: '#38bdf8',
      emissiveIntensity: 0.15,
      roughness: 0.22,
      metalness: 0.1,
    }),
  );

  // =========================================================================
  // 1. 12 COLONY EXPANSION PODS (Including Large Vehicle Hangar & Cargo Warehouse)
  // =========================================================================
  let observatoryDome: THREE.Mesh | null = null;
  const weatherSpinners: THREE.Object3D[] = [];

  EXPANSION_PODS.forEach((pod) => {
    const pGroup = new THREE.Group();
    const gy = groundHeightAt(pod.x, pod.z);
    pGroup.position.set(pod.x, gy, pod.z);
    const accentMat = track(
      new THREE.MeshStandardMaterial({ color: pod.accentHex, roughness: 0.42, metalness: 0.24 }),
    );

    const pad = new THREE.Mesh(
      track(new THREE.CylinderGeometry(pod.radius, pod.radius * 1.06, 0.24, 16)),
      darkMat,
    );
    pad.position.y = 0.12;
    pad.receiveShadow = true;
    pGroup.add(pad);

    if (pod.kind === 'observatory') {
      const drum = new THREE.Mesh(
        track(new THREE.CylinderGeometry(pod.radius * 0.78, pod.radius * 0.82, 1.85, 18)),
        hullMat,
      );
      drum.position.y = 1.1;
      drum.castShadow = true;
      pGroup.add(drum);

      const dome = new THREE.Mesh(
        track(new THREE.SphereGeometry(pod.radius * 0.79, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2)),
        accentMat,
      );
      dome.position.y = 2.02;
      dome.castShadow = true;
      const slit = new THREE.Mesh(track(new THREE.BoxGeometry(0.45, 1.4, 1.4)), darkMat);
      slit.position.set(0, 0.7, pod.radius * 0.52);
      slit.rotation.x = -0.35;
      dome.add(slit);
      if (pod.id === 'observatory') observatoryDome = dome;
      pGroup.add(dome);
    } else if (pod.kind === 'garage') {
      // Large Vehicle Hangar with overhead charging canopy
      const bay = new THREE.Mesh(
        track(new THREE.BoxGeometry(pod.radius * 1.85, 2.8, pod.radius * 1.65)),
        hullMat,
      );
      bay.position.y = 1.5;
      bay.castShadow = true;
      pGroup.add(bay);
      const canopy = new THREE.Mesh(
        track(new THREE.BoxGeometry(pod.radius * 1.95, 0.26, pod.radius * 1.75)),
        accentMat,
      );
      canopy.position.y = 2.95;
      pGroup.add(canopy);
      const doorFrame = new THREE.Mesh(
        track(new THREE.BoxGeometry(3.2, 2.25, 0.25)),
        darkMat,
      );
      doorFrame.position.set(0, 1.25, pod.radius * 0.84);
      pGroup.add(doorFrame);
      const solarRoof = new THREE.Mesh(track(new THREE.BoxGeometry(4.4, 0.08, 3.6)), solarMat);
      solarRoof.position.y = 3.12;
      pGroup.add(solarRoof);
    } else if (pod.kind === 'solar_array') {
      for (let row = -1; row <= 1; row += 2) {
        const mast = new THREE.Mesh(track(new THREE.CylinderGeometry(0.14, 0.18, 1.4, 8)), metalMat);
        mast.position.set(0, 0.8, row * 1.05);
        pGroup.add(mast);
        const wing = new THREE.Mesh(track(new THREE.BoxGeometry(4.8, 0.08, 1.65)), solarMat);
        wing.position.set(0, 1.55, row * 1.05);
        wing.rotation.x = 0.34;
        wing.castShadow = true;
        pGroup.add(wing);
      }
    } else if (pod.kind === 'dish') {
      const base = new THREE.Mesh(
        track(new THREE.CylinderGeometry(pod.radius * 0.65, pod.radius * 0.75, 1.6, 12)),
        hullMat,
      );
      base.position.y = 0.95;
      base.castShadow = true;
      pGroup.add(base);
      const mast = new THREE.Mesh(track(new THREE.CylinderGeometry(0.1, 0.14, 2.1, 8)), metalMat);
      mast.position.y = 2.75;
      pGroup.add(mast);
      const spinner = new THREE.Group();
      spinner.position.y = 3.75;
      const bar = new THREE.Mesh(track(new THREE.BoxGeometry(1.5, 0.08, 0.1)), accentMat);
      spinner.add(bar);
      weatherSpinners.push(spinner);
      pGroup.add(spinner);
    } else if (pod.kind === 'dome') {
      const ring = new THREE.Mesh(
        track(new THREE.CylinderGeometry(pod.radius * 0.82, pod.radius * 0.86, 0.95, 16)),
        hullMat,
      );
      ring.position.y = 0.65;
      ring.castShadow = true;
      pGroup.add(ring);
      const cap = new THREE.Mesh(
        track(new THREE.SphereGeometry(pod.radius * 0.82, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2)),
        accentMat,
      );
      cap.position.y = 1.1;
      cap.castShadow = true;
      pGroup.add(cap);
    } else {
      const body = new THREE.Mesh(
        track(new THREE.BoxGeometry(pod.radius * 1.65, 2.1, pod.radius * 1.4)),
        hullMat,
      );
      body.position.y = 1.15;
      body.castShadow = true;
      pGroup.add(body);
      const band = new THREE.Mesh(
        track(new THREE.BoxGeometry(pod.radius * 1.7, 0.24, pod.radius * 1.45)),
        accentMat,
      );
      band.position.y = 2.18;
      pGroup.add(band);
      const win = new THREE.Mesh(track(new THREE.BoxGeometry(1.4, 0.58, 0.1)), nightWindowMat);
      win.position.set(0, 1.3, pod.radius * 0.72);
      pGroup.add(win);

      // Extra Cargo Warehouse gantry & stacked crates
      if (pod.id === 'cargo_pod') {
        const gantryL = new THREE.Mesh(track(new THREE.BoxGeometry(0.18, 2.5, 0.18)), goldMat);
        gantryL.position.set(-2.5, 1.35, 0.9);
        const gantryR = gantryL.clone();
        gantryR.position.set(-2.5, 1.35, -0.9);
        const gantryBar = new THREE.Mesh(track(new THREE.BoxGeometry(0.24, 0.24, 2.2)), goldMat);
        gantryBar.position.set(-2.5, 2.6, 0);
        pGroup.add(gantryL, gantryR, gantryBar);

        [
          [1.4, 0.42, 1.6],
          [2.05, 0.42, 1.4],
          [1.65, 1.0, 1.5],
        ].forEach(([cx, cy, cz], ci) => {
          const crate = new THREE.Mesh(
            track(new THREE.BoxGeometry(0.65, 0.52, 0.65)),
            ci % 2 === 0 ? orangeMat : goldMat,
          );
          crate.position.set(cx, cy, cz);
          crate.castShadow = true;
          pGroup.add(crate);
        });
      }
    }

    // Wall Sign Plaque facing toward colony center
    const toCenterYaw = Math.atan2(-pod.x, -pod.z);
    const signTex = textures.createSignTexture(pod.name, pod.shortDesc, pod.accentHex);
    const signFrame = new THREE.Mesh(track(new THREE.BoxGeometry(2.0, 0.64, 0.07)), darkMat);
    signFrame.position.set(
      Math.sin(toCenterYaw) * (pod.radius + 0.18),
      1.32,
      Math.cos(toCenterYaw) * (pod.radius + 0.18),
    );
    signFrame.rotation.y = toCenterYaw;
    const signFace = new THREE.Mesh(
      track(new THREE.PlaneGeometry(1.88, 0.54)),
      track(new THREE.MeshBasicMaterial({ map: signTex })),
    );
    signFace.position.z = 0.04;
    signFrame.add(signFace);
    pGroup.add(signFrame);

    group.add(pGroup);
  });

  // =========================================================================
  // 1B. DEDICATED CARGO RESUPPLY LANDING PAD + SUPPLY TERMINAL + TRANSPORTER
  // =========================================================================
  const cargoPadGroup = new THREE.Group();
  const cPadY = groundHeightAt(CARGO_LANDING_PAD_POS[0], CARGO_LANDING_PAD_POS[1]);
  cargoPadGroup.position.set(CARGO_LANDING_PAD_POS[0], cPadY, CARGO_LANDING_PAD_POS[1]);

  const cPadBase = new THREE.Mesh(track(new THREE.CylinderGeometry(5.8, 6.4, 0.24, 8)), darkMat);
  cPadBase.position.y = 0.12;
  cPadBase.receiveShadow = true;
  cargoPadGroup.add(cPadBase);

  const cPadApron = new THREE.Mesh(
    track(new THREE.CircleGeometry(5.55, 32)),
    track(new THREE.MeshStandardMaterial({ map: textures.landingPad, roughness: 0.78 })),
  );
  cPadApron.rotation.x = -Math.PI / 2;
  cPadApron.position.y = 0.255;
  cPadApron.receiveShadow = true;
  cargoPadGroup.add(cPadApron);

  const cPadHazardRing = new THREE.Mesh(track(new THREE.RingGeometry(5.15, 5.55, 24)), hazardMat);
  cPadHazardRing.rotation.x = -Math.PI / 2;
  cPadHazardRing.position.y = 0.265;
  cargoPadGroup.add(cPadHazardRing);

  const cargoStrobeMat = track(
    new THREE.MeshStandardMaterial({
      color: '#fbbf24',
      emissive: '#f59e0b',
      emissiveIntensity: 0.4,
      roughness: 0.25,
    }),
  );
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const post = new THREE.Mesh(track(new THREE.CylinderGeometry(0.11, 0.13, 0.55, 8)), darkMat);
    post.position.set(Math.cos(a) * 5.65, 0.35, Math.sin(a) * 5.65);
    const orb = new THREE.Mesh(track(new THREE.SphereGeometry(0.14, 8, 8)), cargoStrobeMat);
    orb.position.y = 0.32;
    post.add(orb);
    cargoPadGroup.add(post);
  }

  const cargoPadSignTex = textures.createSignTexture('Cargo Resupply Pad', 'Automated Lander Zone', '#f59e0b');
  const cargoPadSign = new THREE.Mesh(
    track(new THREE.PlaneGeometry(2.1, 0.58)),
    track(new THREE.MeshBasicMaterial({ map: cargoPadSignTex })),
  );
  cargoPadSign.position.set(4.9, 1.35, 3.6);
  cargoPadSign.rotation.y = Math.PI * 0.25;
  const signPost = new THREE.Mesh(track(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 6)), metalMat);
  signPost.position.set(4.9, 0.65, 3.6);
  cargoPadGroup.add(cargoPadSign, signPost);
  group.add(cargoPadGroup);

  // Supply Request Terminal Kiosk outside Cargo Warehouse ([-15.5, -19.5])
  const supplyTermPos = { x: -15.5, z: -19.5 };
  const supplyTermGroup = new THREE.Group();
  supplyTermGroup.position.set(
    supplyTermPos.x,
    groundHeightAt(supplyTermPos.x, supplyTermPos.z),
    supplyTermPos.z,
  );
  const stPedestal = new THREE.Mesh(track(new THREE.BoxGeometry(0.85, 1.35, 0.55)), darkMat);
  stPedestal.position.y = 0.68;
  stPedestal.castShadow = true;
  supplyTermGroup.add(stPedestal);
  const stScreen = new THREE.Mesh(track(new THREE.BoxGeometry(0.68, 0.44, 0.08)), nightWindowMat);
  stScreen.position.set(0, 1.12, 0.27);
  supplyTermGroup.add(stScreen);
  const stBeacon = new THREE.Mesh(track(new THREE.SphereGeometry(0.13, 10, 8)), goldMat);
  stBeacon.position.y = 1.5;
  supplyTermGroup.add(stBeacon);
  group.add(supplyTermGroup);

  // Autonomous Robotic Cargo Transporter (travels along service road z = -23)
  const transporter = new THREE.Group();
  const transStart = { x: -18.2, z: -23.0 };
  const transPadStop = { x: -24.4, z: -23.0 };
  transporter.position.set(transStart.x, groundHeightAt(transStart.x, transStart.z), transStart.z);
  const trChassis = new THREE.Mesh(track(new THREE.BoxGeometry(1.5, 0.4, 1.1)), goldMat);
  trChassis.position.y = 0.42;
  trChassis.castShadow = true;
  transporter.add(trChassis);
  const trBumper = new THREE.Mesh(track(new THREE.BoxGeometry(1.62, 0.14, 1.15)), hazardMat);
  trBumper.position.y = 0.3;
  transporter.add(trBumper);
  for (const wx of [-0.52, 0.52]) {
    for (const wz of [-0.6, 0.6]) {
      const w = new THREE.Mesh(track(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 10)), darkMat);
      w.rotation.x = Math.PI / 2;
      w.position.set(wx, 0.22, wz);
      transporter.add(w);
    }
  }
  const transporterCrate = new THREE.Mesh(track(new THREE.BoxGeometry(0.95, 0.68, 0.85)), orangeMat);
  transporterCrate.position.set(0, 0.96, 0);
  transporterCrate.castShadow = true;
  transporterCrate.visible = false;
  transporter.add(transporterCrate);
  group.add(transporter);

  // Zone Directional Signposts across the colony plaza
  const zoneSigns: Array<{ x: number; z: number; rotY: number; title: string; sub: string; hex: string }> = [
    { x: -6.2, z: 2.2, rotY: 0.7, title: 'Life-Support Zone', sub: 'O₂ Centre · Water', hex: '#38bdf8' },
    { x: 6.2, z: -4.2, rotY: -0.7, title: 'Science & Crops', sub: 'Greenhouse · Comms', hex: '#10b981' },
    { x: -10.5, z: -15.5, rotY: 0.4, title: 'Cargo & Logistics', sub: 'Supply Pad -> West', hex: '#f59e0b' },
    { x: 16.5, z: -1.5, rotY: -1.2, title: 'Vehicle Hangar', sub: '6x6 MEV Explorer ->', hex: '#f97316' },
  ];
  zoneSigns.forEach((zs) => {
    const zg = new THREE.Group();
    zg.position.set(zs.x, groundHeightAt(zs.x, zs.z), zs.z);
    zg.rotation.y = zs.rotY;
    const pole = new THREE.Mesh(track(new THREE.CylinderGeometry(0.05, 0.06, 1.5, 6)), metalMat);
    pole.position.y = 0.75;
    zg.add(pole);
    const tex = textures.createSignTexture(zs.title, zs.sub, zs.hex);
    const board = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.65, 0.52, 0.06)),
      darkMat,
    );
    board.position.y = 1.45;
    const face = new THREE.Mesh(
      track(new THREE.PlaneGeometry(1.56, 0.44)),
      track(new THREE.MeshBasicMaterial({ map: tex })),
    );
    face.position.z = 0.036;
    board.add(face);
    zg.add(board);
    group.add(zg);
  });

  // =========================================================================
  // 2. SOLAR NIGHT LAMPS ALONG COLONY PATHWAYS
  // =========================================================================
  const lampCoords: Array<[number, number]> = [
    [-5.8, 5.2],
    [5.8, 5.2],
    [-5.8, -5.2],
    [5.8, -5.2],
    [11.5, 9.5],
    [-10.5, 9.5],
    [16.0, -7.5],
    [-16.0, -7.5],
    [-21.5, -20.5],
  ];
  const colonyLampLights: THREE.PointLight[] = [];
  lampCoords.forEach(([lx, lz], idx) => {
    const lGroup = new THREE.Group();
    lGroup.position.set(lx, groundHeightAt(lx, lz), lz);
    const pole = new THREE.Mesh(track(new THREE.CylinderGeometry(0.06, 0.08, 2.35, 8)), metalMat);
    pole.position.y = 1.18;
    lGroup.add(pole);
    const bulb = new THREE.Mesh(track(new THREE.SphereGeometry(0.18, 10, 8)), lampHeadMat);
    bulb.position.y = 2.4;
    lGroup.add(bulb);
    if (idx % 2 === 0 && !isSoftwareGl) {
      const pt = new THREE.PointLight('#fbbf24', 0, 12, 1.8);
      pt.position.y = 2.3;
      lGroup.add(pt);
      colonyLampLights.push(pt);
    }
    group.add(lGroup);
  });

  // =========================================================================
  // 3. DISTANT GEOLOGICAL LANDMARKS & 5 REMOTE ENVIRONMENTAL STORY ANOMALIES
  // =========================================================================
  for (let i = 0; i < 8; i++) {
    const ix = 12 + (i - 3.5) * 3.1;
    const iz = -136 + Math.sin(i * 1.4) * 2.5;
    const iceBlock = new THREE.Mesh(track(new THREE.DodecahedronGeometry(1.25, 0)), iceMat);
    iceBlock.scale.set(1.5, 0.45, 1.15);
    iceBlock.position.set(ix, groundHeightAt(ix, iz) + 0.14, iz);
    iceBlock.rotation.y = i * 0.7;
    group.add(iceBlock);
  }

  MARS_LANDMARKS.forEach((lm) => {
    const pole = new THREE.Mesh(track(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8)), metalMat);
    const ly = groundHeightAt(lm.x, lm.z);
    pole.position.set(lm.x, ly + 1.3, lm.z);
    const flag = new THREE.Mesh(track(new THREE.BoxGeometry(1.05, 0.58, 0.06)), goldMat);
    flag.position.set(0.52, 0.95, 0);
    pole.add(flag);
    group.add(pole);
  });

  MARS_ANOMALIES.forEach((an) => {
    const ag = new THREE.Group();
    const ay = groundHeightAt(an.x, an.z);
    ag.position.set(an.x, ay, an.z);

    if (an.kind === 'landing_remains') {
      const shield = new THREE.Mesh(track(new THREE.ConeGeometry(2.1, 0.9, 14, 1, true)), scorchMat);
      shield.position.set(0, 0.4, 0);
      shield.rotation.set(0.28, 0.5, 0.12);
      ag.add(shield);

      const chute = new THREE.Mesh(
        track(new THREE.SphereGeometry(1.9, 10, 6, 0, Math.PI, 0, Math.PI * 0.55)),
        hullMat,
      );
      chute.position.set(3.4, 0.1, 1.8);
      chute.scale.set(1.4, 0.25, 0.9);
      chute.rotation.y = 0.7;
      ag.add(chute);
    } else if (an.kind === 'buried_probe') {
      const body = new THREE.Mesh(track(new THREE.BoxGeometry(1.1, 0.7, 1.1)), goldMat);
      body.position.set(0, 0.22, 0);
      body.rotation.set(0.24, 0.4, -0.32);
      ag.add(body);
      const dustyWing = new THREE.Mesh(track(new THREE.BoxGeometry(2.2, 0.06, 0.9)), solarMat);
      dustyWing.position.set(0.8, 0.35, 0.2);
      dustyWing.rotation.set(0.18, 0.4, -0.25);
      ag.add(dustyWing);
    } else if (an.kind === 'stone_arch') {
      const leftPillar = new THREE.Mesh(track(new THREE.CylinderGeometry(0.9, 1.4, 5.2, 7)), rustStoneMat);
      leftPillar.position.set(-2.3, 2.4, 0);
      leftPillar.rotation.z = -0.14;
      const rightPillar = new THREE.Mesh(track(new THREE.CylinderGeometry(0.85, 1.35, 5.0, 7)), rustStoneMat);
      rightPillar.position.set(2.3, 2.3, 0);
      rightPillar.rotation.z = 0.15;
      const bridge = new THREE.Mesh(track(new THREE.BoxGeometry(5.6, 1.25, 1.9)), rustStoneMat);
      bridge.position.set(0, 4.9, 0);
      ag.add(leftPillar, rightPillar, bridge);
    } else if (an.kind === 'damaged_relay') {
      const mast = new THREE.Mesh(track(new THREE.CylinderGeometry(0.1, 0.16, 4.2, 8)), metalMat);
      mast.position.set(0, 1.95, 0);
      mast.rotation.z = 0.22;
      const dish = new THREE.Mesh(track(new THREE.ConeGeometry(0.9, 0.45, 12)), hullMat);
      dish.position.set(-0.4, 3.8, 0.2);
      dish.rotation.x = Math.PI * 0.4;
      ag.add(mast, dish);
    } else if (an.kind === 'mineral_vein') {
      for (let k = 0; k < 5; k++) {
        const rib = new THREE.Mesh(track(new THREE.BoxGeometry(3.2, 0.22, 0.34)), paleMineralMat);
        rib.position.set((k - 2) * 1.4, 0.08, Math.sin(k) * 1.1);
        rib.rotation.y = 0.5 + k * 0.15;
        ag.add(rib);
      }
    }

    group.add(ag);
  });

  // =========================================================================
  // 4. WEATHERED HISTORICAL ROVER TRACKS + DYNAMIC MEV TIRE TRACKS
  // =========================================================================
  const trackGeo = track(new THREE.PlaneGeometry(0.56, 0.78));
  trackGeo.rotateX(-Math.PI / 2);
  const trackMat = track(
    new THREE.MeshBasicMaterial({
      color: '#5c2614',
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );

  const histPairs = 54;
  const histTracks = new THREE.InstancedMesh(trackGeo, trackMat, histPairs * 2);
  let hIdx = 0;
  const placeTrackPair = (
    mesh: THREE.InstancedMesh,
    index: number,
    cx: number,
    cz: number,
    yaw: number,
    halfAxle = 1.05,
  ) => {
    const lx = Math.cos(yaw) * halfAxle;
    const lz = -Math.sin(yaw) * halfAxle;
    [-1, 1].forEach((side, sOff) => {
      const px = cx + lx * side;
      const pz = cz + lz * side;
      _treadDummy.position.set(px, groundHeightAt(px, pz) + 0.03, pz);
      _treadDummy.rotation.set(0, yaw, 0);
      _treadDummy.scale.setScalar(1);
      _treadDummy.updateMatrix();
      mesh.setMatrixAt(index + sOff, _treadDummy.matrix);
    });
  };
  for (let i = 0; i < 18; i++) {
    const t = 0.42 + (i / 18) * 0.54;
    const sx = -92 * t + Math.sin(i * 0.6) * 2.5;
    const sz = 62 * t;
    placeTrackPair(histTracks, hIdx, sx, sz, Math.atan2(-92, 62), 0.62);
    hIdx += 2;
  }
  for (let i = 0; i < 18; i++) {
    const t = 0.42 + (i / 18) * 0.54;
    const ox = 102 * t + Math.cos(i * 0.5) * 2.5;
    const oz = 66 * t;
    placeTrackPair(histTracks, hIdx, ox, oz, Math.atan2(102, 66), 0.62);
    hIdx += 2;
  }
  // Sojourner Heritage Trail leading NE from Colony Perimeter -> Track Clue [43.5,-25.5] -> Sojourner [68,-44]
  for (let i = 0; i < 18; i++) {
    const t = i / 17;
    const jx = 29 + t * 38 + Math.sin(t * Math.PI * 2) * 1.4;
    const jz = -15 - t * 28.5 + Math.cos(t * Math.PI * 2) * 0.9;
    placeTrackPair(histTracks, hIdx, jx, jz, Math.atan2(38, -28.5), 0.48);
    hIdx += 2;
  }
  histTracks.instanceMatrix.needsUpdate = true;
  histTracks.computeBoundingSphere();
  group.add(histTracks);

  // Small Solar Signal Marker Post at NE Track Clue Site [43.5, -25.5]
  const clueX = 43.5;
  const clueZ = -25.5;
  const cluePost = new THREE.Group();
  cluePost.position.set(clueX, groundHeightAt(clueX, clueZ), clueZ);
  const clueMast = new THREE.Mesh(track(new THREE.CylinderGeometry(0.06, 0.08, 1.35, 8)), metalMat);
  clueMast.position.y = 0.68;
  cluePost.add(clueMast);
  const clueHead = new THREE.Mesh(track(new THREE.BoxGeometry(0.32, 0.2, 0.24)), orangeMat);
  clueHead.position.y = 1.36;
  cluePost.add(clueHead);
  group.add(cluePost);

  const liveTrackCap = 240;
  const liveTracks = new THREE.InstancedMesh(trackGeo, trackMat, liveTrackCap);
  liveTracks.frustumCulled = false;
  for (let i = 0; i < liveTrackCap; i++) {
    _treadDummy.position.set(0, -100, 0);
    _treadDummy.scale.setScalar(0.001);
    _treadDummy.updateMatrix();
    liveTracks.setMatrixAt(i, _treadDummy.matrix);
  }
  liveTracks.instanceMatrix.needsUpdate = true;
  group.add(liveTracks);
  let liveTrackCursor = 0;
  let lastTrackPos = new THREE.Vector2(21.0, 1.5);

  // =========================================================================
  // 5. 5 LOST HERITAGE ROVERS IN REMOTE EXPLORATION ZONES
  // =========================================================================
  const roverSiteVisuals: Array<{
    id: LostRoverId;
    beaconMat: THREE.MeshStandardMaterial;
    ringMesh: THREE.Mesh;
  }> = [];

  LOST_ROVERS.forEach((lr) => {
    const rGroup = new THREE.Group();
    const ry = groundHeightAt(lr.x, lr.z);
    rGroup.position.set(lr.x, ry, lr.z);
    rGroup.rotation.y = (lr.x * 0.17) % (Math.PI * 2);

    const accentMat = track(
      new THREE.MeshStandardMaterial({ color: lr.accentHex, roughness: 0.4, metalness: 0.3 }),
    );
    const isSmall = lr.id === 'sojourner';
    const isBig = lr.id === 'curiosity' || lr.id === 'perseverance';
    const scale = isSmall ? 0.72 : isBig ? 1.25 : 0.95;

    const body = new THREE.Mesh(
      track(new THREE.BoxGeometry(1.1 * scale, 0.38 * scale, 1.45 * scale)),
      hullMat,
    );
    body.position.y = 0.44 * scale;
    body.castShadow = true;
    rGroup.add(body);

    if (!isBig) {
      const deck = new THREE.Mesh(
        track(new THREE.BoxGeometry(1.7 * scale, 0.06, 1.3 * scale)),
        solarMat,
      );
      deck.position.y = 0.66 * scale;
      rGroup.add(deck);
    } else {
      const rtg = new THREE.Mesh(track(new THREE.CylinderGeometry(0.18, 0.22, 0.72, 8)), goldMat);
      rtg.rotation.x = Math.PI / 3;
      rtg.position.set(0, 0.65 * scale, -0.68 * scale);
      rGroup.add(rtg);
    }

    const mast = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.05, 0.06, 0.85 * scale, 8)),
      metalMat,
    );
    mast.position.set(0, 0.92 * scale, 0.42 * scale);
    rGroup.add(mast);
    const camHead = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.42 * scale, 0.2 * scale, 0.24 * scale)),
      accentMat,
    );
    camHead.position.set(0, 1.35 * scale, 0.45 * scale);
    rGroup.add(camHead);

    for (const sx of [-0.62 * scale, 0.62 * scale]) {
      for (const sz of [-0.52 * scale, 0, 0.52 * scale]) {
        const wh = new THREE.Mesh(
          track(new THREE.CylinderGeometry(0.2 * scale, 0.2 * scale, 0.16 * scale, 10)),
          darkMat,
        );
        wh.rotation.z = Math.PI / 2;
        wh.position.set(sx, 0.2 * scale, sz);
        rGroup.add(wh);
      }
    }

    const bMat = track(
      new THREE.MeshStandardMaterial({
        color: '#f97316',
        emissive: '#f97316',
        emissiveIntensity: 1.4,
      }),
    );
    const bMesh = new THREE.Mesh(track(new THREE.SphereGeometry(0.14, 10, 8)), bMat);
    bMesh.position.set(0, 1.65 * scale, 0.45 * scale);
    rGroup.add(bMesh);

    const ringGeo = track(new THREE.RingGeometry(1.4, 1.7, 24));
    ringGeo.rotateX(-Math.PI / 2);
    const rMesh = new THREE.Mesh(
      ringGeo,
      track(
        new THREE.MeshBasicMaterial({
          color: lr.accentHex,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      ),
    );
    rMesh.position.y = 0.08;
    rGroup.add(rMesh);

    roverSiteVisuals.push({
      id: lr.id,
      beaconMat: bMat,
      ringMesh: rMesh,
    });
    group.add(rGroup);
  });

  // =========================================================================
  // 5B. MULTI-BAY VEHICLE CHARGING STATION (Bay A MEV & Bay B Utility, Open West Drive-In)
  // =========================================================================
  const stationCenter = { x: 22.1, z: 3.4 };
  const chargingStation = new THREE.Group();
  chargingStation.position.set(
    stationCenter.x,
    groundHeightAt(stationCenter.x, stationCenter.z),
    stationCenter.z,
  );

  // Sintered concrete charging slab apron
  const padSlab = new THREE.Mesh(track(new THREE.BoxGeometry(7.2, 0.14, 7.8)), darkMat);
  padSlab.position.set(0.3, 0.05, 0);
  padSlab.receiveShadow = true;
  chargingStation.add(padSlab);

  // Rear structural equipment wall & colony grid power cabinet (x: 24.9..25.9)
  const rearWall = new THREE.Mesh(track(new THREE.BoxGeometry(0.95, 3.15, 7.6)), hullMat);
  rearWall.position.set(3.3, 1.65, 0);
  rearWall.castShadow = true;
  rearWall.receiveShadow = true;
  chargingStation.add(rearWall);

  const rearAccent = new THREE.Mesh(track(new THREE.BoxGeometry(1.02, 0.24, 7.66)), orangeMat);
  rearAccent.position.set(3.3, 3.18, 0);
  chargingStation.add(rearAccent);

  // Animated sliding service bay doors on rear wall (Bay A & Bay B access)
  const bayDoorMat = track(
    new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.45, metalness: 0.6 }),
  );
  const bayDoorA = new THREE.Mesh(track(new THREE.BoxGeometry(0.14, 2.2, 2.3)), bayDoorMat);
  bayDoorA.position.set(2.76, 1.2, -1.8);
  const bayDoorB = new THREE.Mesh(track(new THREE.BoxGeometry(0.14, 2.2, 2.3)), bayDoorMat);
  bayDoorB.position.set(2.76, 1.2, 1.8);
  chargingStation.add(bayDoorA, bayDoorB);

  // Front steel gantry pillars (west side, leaving Bay A & B completely unobstructed)
  [-3.65, 3.7].forEach((pz) => {
    const pillar = new THREE.Mesh(track(new THREE.BoxGeometry(0.45, 3.25, 0.45)), darkMat);
    pillar.position.set(-2.7, 1.68, pz);
    pillar.castShadow = true;
    chargingStation.add(pillar);

    const guard = new THREE.Mesh(track(new THREE.BoxGeometry(0.5, 0.45, 0.5)), hazardMat);
    guard.position.set(-2.7, 0.35, pz);
    chargingStation.add(guard);
  });

  // Overhead floodlit gantry canopy & solar power roof
  const gantryRoof = new THREE.Mesh(track(new THREE.BoxGeometry(6.8, 0.28, 7.8)), hullMat);
  gantryRoof.position.set(0.4, 3.32, 0);
  gantryRoof.castShadow = true;
  chargingStation.add(gantryRoof);

  const gantryTrim = new THREE.Mesh(track(new THREE.BoxGeometry(6.9, 0.16, 7.9)), orangeMat);
  gantryTrim.position.set(0.4, 3.48, 0);
  chargingStation.add(gantryTrim);

  const stationSolar = new THREE.Mesh(track(new THREE.BoxGeometry(5.2, 0.08, 6.4)), solarMat);
  stationSolar.position.set(0.4, 3.59, 0);
  chargingStation.add(stationSolar);

  // "VEHICLE CHARGING STATION" Gantry Sign facing West toward colony plaza
  const chSignTex = textures.createSignTexture(
    'Vehicle Charging Station',
    'Bay A: 6x6 MEV · Bay B: Utility',
    '#06b6d4',
  );
  const chSignBoard = new THREE.Mesh(track(new THREE.BoxGeometry(0.12, 0.85, 3.6)), darkMat);
  chSignBoard.position.set(-2.96, 3.05, 0);
  const chSignFace = new THREE.Mesh(
    track(new THREE.PlaneGeometry(3.4, 0.72)),
    track(new THREE.MeshBasicMaterial({ map: chSignTex })),
  );
  chSignFace.position.x = -0.07;
  chSignFace.rotation.y = -Math.PI / 2;
  chSignBoard.add(chSignFace);
  chargingStation.add(chSignBoard);

  // Inductive Floor Charging Pads & Alignment Chevrons (Bay A local [-0.5, -1.8], Bay B local [-0.5, 1.8])
  const bayAPadMat = track(
    new THREE.MeshStandardMaterial({
      color: '#0f172a',
      emissive: '#06b6d4',
      emissiveIntensity: 0.35,
      roughness: 0.35,
    }),
  );
  const bayBPadMat = track(
    new THREE.MeshStandardMaterial({
      color: '#0f172a',
      emissive: '#38bdf8',
      emissiveIntensity: 0.25,
      roughness: 0.35,
    }),
  );
  const bayAPad = new THREE.Mesh(track(new THREE.BoxGeometry(2.8, 0.05, 2.2)), bayAPadMat);
  bayAPad.position.set(-0.5, 0.14, -1.8);
  const bayBPad = new THREE.Mesh(track(new THREE.BoxGeometry(2.8, 0.05, 2.2)), bayBPadMat);
  bayBPad.position.set(-0.5, 0.14, 1.8);
  chargingStation.add(bayAPad, bayBPad);

  // Floor alignment chevrons leading from West driveway into Bay A
  [-2.2, -1.3].forEach((cx) => {
    const chev = new THREE.Mesh(track(new THREE.BoxGeometry(0.28, 0.03, 1.8)), hazardMat);
    chev.position.set(cx, 0.135, -1.8);
    chargingStation.add(chev);
  });

  // Compact Utility Service Pod parked cleanly inside Bay B
  const bayBUtilPod = new THREE.Group();
  bayBUtilPod.position.set(-0.35, 0.16, 1.8);
  const uChassis = new THREE.Mesh(track(new THREE.BoxGeometry(1.5, 0.55, 1.15)), goldMat);
  uChassis.position.y = 0.42;
  uChassis.castShadow = true;
  bayBUtilPod.add(uChassis);
  const uDeck = new THREE.Mesh(track(new THREE.BoxGeometry(1.3, 0.06, 0.95)), solarMat);
  uDeck.position.y = 0.72;
  bayBUtilPod.add(uDeck);
  for (const ux of [-0.55, 0.55]) {
    for (const uz of [-0.58, 0.58]) {
      const uw = new THREE.Mesh(track(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 10)), darkMat);
      uw.rotation.x = Math.PI / 2;
      uw.position.set(ux, 0.2, uz);
      bayBUtilPod.add(uw);
    }
  }
  chargingStation.add(bayBUtilPod);

  // Central Charging Pedestal Console ([24.2, 3.4] -> local [2.1, 0]) with Dynamic LED Bar
  const chConsole = new THREE.Group();
  chConsole.position.set(CHARGING_CONSOLE_POS[0] - stationCenter.x, 0.12, CHARGING_CONSOLE_POS[1] - stationCenter.z);
  const cPedestal = new THREE.Mesh(track(new THREE.BoxGeometry(0.58, 1.55, 0.58)), darkMat);
  cPedestal.position.y = 0.78;
  cPedestal.castShadow = true;
  chConsole.add(cPedestal);

  const cScreen = new THREE.Mesh(track(new THREE.BoxGeometry(0.08, 0.44, 0.42)), nightWindowMat);
  cScreen.position.set(-0.28, 1.24, 0);
  chConsole.add(cScreen);

  const cLedMat = track(
    new THREE.MeshStandardMaterial({
      color: '#10b981',
      emissive: '#10b981',
      emissiveIntensity: 1.4,
      roughness: 0.2,
    }),
  );
  const cLedBar = new THREE.Mesh(track(new THREE.BoxGeometry(0.1, 0.92, 0.14)), cLedMat);
  cLedBar.position.set(-0.28, 0.6, 0.22);
  chConsole.add(cLedBar);
  chargingStation.add(chConsole);

  // Curved Power Umbilical Cable from Console -> Bay A charging coupling
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.05, 1.38, -0.18),
    new THREE.Vector3(1.4, 2.35, -0.85),
    new THREE.Vector3(0.55, 1.75, -1.55),
    new THREE.Vector3(-0.1, 1.15, -1.8),
  ]);
  const cableGeo = track(new THREE.TubeGeometry(cableCurve, 18, 0.05, 8, false));
  const umbilicalMat = track(
    new THREE.MeshStandardMaterial({
      color: '#0f172a',
      emissive: '#06b6d4',
      emissiveIntensity: 0.15,
      roughness: 0.4,
    }),
  );
  const umbilicalCable = new THREE.Mesh(cableGeo, umbilicalMat);
  chargingStation.add(umbilicalCable);

  // Overhead canopy floodlight (visible at night or during storms)
  let bayFloodLight: THREE.PointLight | null = null;
  if (!isSoftwareGl) {
    bayFloodLight = new THREE.PointLight('#bae6fd', 0.6, 15, 1.6);
    bayFloodLight.position.set(0, 3.05, 0);
    chargingStation.add(bayFloodLight);
  }
  group.add(chargingStation);

  // =========================================================================
  // 6. LARGE 6-WHEEL PRESSURIZED CREW EXPLORATION VEHICLE (MEV - Zero NASA Logos!)
  // =========================================================================
  const scoutRover = new THREE.Group();
  const roverStart = { x: CHARGING_BAY_A_POS[0] - 0.3, z: CHARGING_BAY_A_POS[1], yaw: -Math.PI * 0.5 };
  scoutRover.position.set(roverStart.x, groundHeightAt(roverStart.x, roverStart.z), roverStart.z);
  scoutRover.rotation.y = roverStart.yaw;

  // Suspended Chassis & Pressurized Cabin Group (pitch/roll/heave springs relative to roverRoot)
  const chassisBody = new THREE.Group();
  scoutRover.add(chassisBody);

  // Lower heavy armored chassis & suspension frame
  const mevChassis = new THREE.Mesh(track(new THREE.BoxGeometry(2.05, 0.48, 3.85)), darkMat);
  mevChassis.position.y = 0.72;
  mevChassis.castShadow = true;
  chassisBody.add(mevChassis);

  // Rocker-bogie suspension struts along left & right sides
  [-1.08, 1.08].forEach((sx) => {
    const bogieBar = new THREE.Mesh(track(new THREE.BoxGeometry(0.14, 0.14, 2.85)), metalMat);
    bogieBar.position.set(sx, 0.54, 0);
    chassisBody.add(bogieBar);
  });

  // Pressurized white habitat rear cabin (enclosed floor + back + side panels, leaving transparent cockpit front)
  const mevCabinFloor = new THREE.Mesh(track(new THREE.BoxGeometry(1.94, 0.14, 3.2)), hullMat);
  mevCabinFloor.position.set(0, 1.0, -0.1);
  chassisBody.add(mevCabinFloor);

  const mevRearCabin = new THREE.Mesh(track(new THREE.BoxGeometry(1.96, 1.24, 1.65)), hullMat);
  mevRearCabin.position.set(0, 1.62, -0.92);
  mevRearCabin.castShadow = true;
  chassisBody.add(mevRearCabin);

  const mevOrangeBand = new THREE.Mesh(track(new THREE.BoxGeometry(2.02, 0.24, 1.72)), orangeMat);
  mevOrangeBand.position.set(0, 2.18, -0.92);
  chassisBody.add(mevOrangeBand);

  // Driver port airlock hatch (hinged at rear edge so it swings cleanly outward)
  const hatchPivot = new THREE.Group();
  hatchPivot.position.set(-0.98, 1.55, -0.26);
  const sideHatch = new THREE.Mesh(track(new THREE.BoxGeometry(0.12, 1.08, 0.85)), orangeMat);
  sideHatch.position.set(0, 0, 0.42);
  hatchPivot.add(sideHatch);
  chassisBody.add(hatchPivot);

  // Co-pilot starboard airlock hatch (Commander Nova enters here!)
  const rightHatchPivot = new THREE.Group();
  rightHatchPivot.position.set(0.98, 1.55, -0.26);
  const rightSideHatch = new THREE.Mesh(track(new THREE.BoxGeometry(0.12, 1.08, 0.85)), orangeMat);
  rightSideHatch.position.set(0, 0, 0.42);
  rightHatchPivot.add(rightSideHatch);
  chassisBody.add(rightHatchPivot);

  // Cockpit Roof & Sloped Pillars
  const mevRoof = new THREE.Mesh(track(new THREE.BoxGeometry(1.88, 0.14, 1.65)), hullMat);
  mevRoof.position.set(0, 2.26, 0.58);
  mevRoof.castShadow = true;
  chassisBody.add(mevRoof);

  // Left & right cockpit window frames
  [-0.9, 0.9].forEach((px) => {
    const pillar = new THREE.Mesh(track(new THREE.BoxGeometry(0.12, 1.22, 0.16)), darkMat);
    pillar.position.set(px, 1.64, 1.36);
    pillar.rotation.x = 0.24;
    chassisBody.add(pillar);
  });

  // Sloped panoramic transparent front windshield & side windows
  const windshield = new THREE.Mesh(track(new THREE.BoxGeometry(1.74, 0.96, 0.08)), mevWindshieldMat);
  windshield.position.set(0, 1.68, 1.44);
  windshield.rotation.x = 0.24;
  windshield.renderOrder = 3;
  chassisBody.add(windshield);

  [-0.93, 0.93].forEach((wx) => {
    const sideGlass = new THREE.Mesh(track(new THREE.BoxGeometry(0.06, 0.82, 1.1)), mevWindshieldMat);
    sideGlass.position.set(wx, 1.7, 0.72);
    sideGlass.renderOrder = 3;
    chassisBody.add(sideGlass);
  });

  // Detailed Cockpit Interior (Driver Seat, Co-pilot Seat, Glowing Dashboard & Steering Yoke)
  const seatMat = track(new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.7 }));
  [-0.44, 0.44].forEach((sx) => {
    const base = new THREE.Mesh(track(new THREE.BoxGeometry(0.54, 0.18, 0.54)), seatMat);
    base.position.set(sx, 1.15, 0.35);
    const back = new THREE.Mesh(track(new THREE.BoxGeometry(0.54, 0.68, 0.16)), orangeMat);
    back.position.set(sx, 1.5, 0.1);
    chassisBody.add(base, back);
  });

  const dashboard = new THREE.Mesh(track(new THREE.BoxGeometry(1.66, 0.36, 0.46)), darkMat);
  dashboard.position.set(0, 1.25, 1.15);
  chassisBody.add(dashboard);

  const dashScreenMat = track(
    new THREE.MeshStandardMaterial({
      color: '#0f172a',
      emissive: '#38bdf8',
      emissiveIntensity: 1.1,
      roughness: 0.15,
    }),
  );
  const dashScreen = new THREE.Mesh(track(new THREE.BoxGeometry(1.36, 0.22, 0.06)), dashScreenMat);
  dashScreen.position.set(0, 1.38, 0.95);
  dashScreen.rotation.x = -0.35;
  chassisBody.add(dashScreen);

  const steeringYoke = new THREE.Group();
  steeringYoke.position.set(-0.44, 1.36, 0.86);
  const yokeRing = new THREE.Mesh(track(new THREE.TorusGeometry(0.14, 0.025, 8, 16)), metalMat);
  yokeRing.rotation.x = -0.3;
  steeringYoke.add(yokeRing);
  chassisBody.add(steeringYoke);

  // Rear solar deck & roof comms dish (NO NASA decals/logos)
  const mevSolarDeck = new THREE.Mesh(track(new THREE.BoxGeometry(1.75, 0.08, 1.35)), solarMat);
  mevSolarDeck.position.set(0, 2.34, -0.95);
  chassisBody.add(mevSolarDeck);

  const mevCommsDish = new THREE.Mesh(track(new THREE.ConeGeometry(0.32, 0.18, 12)), hullMat);
  mevCommsDish.position.set(0.55, 2.48, 0.35);
  mevCommsDish.rotation.x = -0.45;
  chassisBody.add(mevCommsDish);

  // 6 Independent Suspension Wheel Mounts (front pair with steering pivots!)
  interface WheelMountRec {
    mount: THREE.Group;
    wheel: THREE.Mesh;
    wx: number;
    wz: number;
    isFront: boolean;
  }
  const wheelMounts: WheelMountRec[] = [];
  const frontSteerPivots: THREE.Group[] = [];
  const wheelGeo = track(new THREE.CylinderGeometry(MEV_WHEEL_RADIUS, MEV_WHEEL_RADIUS, 0.34, 16));
  const hubGeo = track(new THREE.CylinderGeometry(0.18, 0.18, 0.37, 10));

  for (const wx of [-1.14, 1.14]) {
    for (const wz of [-1.32, 0, 1.32]) {
      const mount = new THREE.Group();
      mount.position.set(wx, MEV_WHEEL_RADIUS, wz);

      // Spring-damper strut connecting wheel hub vertically toward chassis
      const strut = new THREE.Mesh(track(new THREE.CylinderGeometry(0.055, 0.055, 0.42, 8)), metalMat);
      strut.position.set(wx > 0 ? -0.12 : 0.12, 0.24, 0);
      mount.add(strut);

      const wheel = new THREE.Mesh(wheelGeo, darkMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      const hub = new THREE.Mesh(hubGeo, goldMat);
      wheel.add(hub);

      const isFront = wz > 0.5;
      if (isFront) {
        const pivot = new THREE.Group();
        pivot.add(wheel);
        mount.add(pivot);
        frontSteerPivots.push(pivot);
      } else {
        mount.add(wheel);
      }
      scoutRover.add(mount);
      wheelMounts.push({ mount, wheel, wx, wz, isFront });
    }
  }

  // Dual Bright Headlights & Rear Tail Lights
  const roverHeadlightMat = track(
    new THREE.MeshStandardMaterial({ color: '#fef9c3', emissive: '#fde047', emissiveIntensity: 0.35 }),
  );
  const tailLightMat = track(
    new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 0.4 }),
  );
  [-0.72, 0.72].forEach((hx) => {
    const hl = new THREE.Mesh(track(new THREE.BoxGeometry(0.28, 0.16, 0.08)), roverHeadlightMat);
    hl.position.set(hx, 0.94, 1.92);
    chassisBody.add(hl);

    const tl = new THREE.Mesh(track(new THREE.BoxGeometry(0.26, 0.14, 0.08)), tailLightMat);
    tl.position.set(hx, 1.04, -1.93);
    chassisBody.add(tl);
  });

  const roverSpot = new THREE.SpotLight('#fef3c7', 0, 44, 0.62, 0.42, 1.15);
  roverSpot.position.set(0, 1.1, 1.88);
  const roverSpotTarget = new THREE.Object3D();
  roverSpotTarget.position.set(0, 0.2, 16);
  chassisBody.add(roverSpot, roverSpotTarget);
  roverSpot.target = roverSpotTarget;

  // Rover Dust Wake Particles
  const wakeCount = 36;
  const wakePos = new Float32Array(wakeCount * 3);
  const wakeGeo = track(new THREE.BufferGeometry());
  wakeGeo.setAttribute('position', new THREE.BufferAttribute(wakePos, 3));
  const wakeMat = track(
    new THREE.PointsMaterial({
      color: '#d98a5b',
      map: textures.softDustMote,
      size: 0.92,
      transparent: true,
      opacity: 0,
      alphaTest: 0.01,
      depthWrite: false,
    }),
  );
  const roverWake = new THREE.Points(wakeGeo, wakeMat);
  group.add(roverWake);

  // Invisible raycast tap/click proxy around the 6x6 Exploration Vehicle (Layer 1)
  const mevInteractProxy = new THREE.Mesh(
    track(new THREE.BoxGeometry(3.4, 2.8, 4.6)),
    track(new THREE.MeshBasicMaterial({ visible: false })),
  );
  mevInteractProxy.position.set(0, 1.4, 0);
  mevInteractProxy.layers.set(1);
  scoutRover.add(mevInteractProxy);

  // Floating Golden EV Beacon + Ground Highlight Ring (guides children to find the EV!)
  const evGuideGroup = new THREE.Group();
  const evGuideMat = track(
    new THREE.MeshBasicMaterial({
      color: '#fbbf24',
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const evGroundRing = new THREE.Mesh(track(new THREE.RingGeometry(2.35, 2.85, 36)), evGuideMat);
  evGroundRing.rotation.x = -Math.PI / 2;
  evGroundRing.position.y = 0.16;
  const evBeamMat = track(
    new THREE.MeshBasicMaterial({
      color: '#fde047',
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    }),
  );
  const evBeam = new THREE.Mesh(track(new THREE.CylinderGeometry(0.14, 0.34, 2.4, 10)), evBeamMat);
  evBeam.position.y = 2.6;
  const evDiamond = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.55, 0)), evGuideMat);
  evDiamond.position.y = 3.95;
  const evArrow = new THREE.Mesh(track(new THREE.ConeGeometry(0.42, 0.72, 4)), evGuideMat);
  evArrow.rotation.x = Math.PI;
  evArrow.position.y = 3.1;
  evGuideGroup.add(evGroundRing, evBeam, evDiamond, evArrow);
  evGuideGroup.visible = false;
  scoutRover.add(evGuideGroup);

  group.add(scoutRover);

  // Destination Arrival Parking Zone Ring (shown when approaching a distant EV destination)
  const arrivalZoneGroup = new THREE.Group();
  const arrivalOuterMat = track(
    new THREE.MeshBasicMaterial({
      color: '#f59e0b',
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const arrivalInnerMat = track(
    new THREE.MeshBasicMaterial({
      color: '#fde047',
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const arrivalOuterRing = new THREE.Mesh(track(new THREE.RingGeometry(4.6, 5.4, 44)), arrivalOuterMat);
  arrivalOuterRing.rotation.x = -Math.PI / 2;
  const arrivalInnerRing = new THREE.Mesh(track(new THREE.RingGeometry(3.3, 4.0, 44)), arrivalInnerMat);
  arrivalInnerRing.rotation.x = -Math.PI / 2;
  arrivalInnerRing.position.y = 0.02;
  arrivalZoneGroup.add(arrivalOuterRing, arrivalInnerRing);
  arrivalZoneGroup.visible = false;
  group.add(arrivalZoneGroup);

  // =========================================================================
  // 7. EXPLORATION SCOUT DRONE & GEOLOGY SCANNER PULSE RING
  // =========================================================================
  const drone = new THREE.Group();
  const dBody = new THREE.Mesh(track(new THREE.BoxGeometry(0.45, 0.16, 0.45)), goldMat);
  drone.add(dBody);
  const dCam = new THREE.Mesh(track(new THREE.SphereGeometry(0.11, 10, 8)), nightWindowMat);
  dCam.position.set(0, -0.1, 0.15);
  drone.add(dCam);
  const rotorBar = new THREE.Mesh(track(new THREE.BoxGeometry(1.1, 0.03, 0.09)), darkMat);
  rotorBar.position.y = 0.16;
  drone.add(rotorBar);
  drone.visible = false;
  group.add(drone);

  const scanRingGeo = track(new THREE.RingGeometry(0.5, 0.85, 36));
  scanRingGeo.rotateX(-Math.PI / 2);
  const scanRingMat = track(
    new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const scanRing = new THREE.Mesh(scanRingGeo, scanRingMat);
  scanRing.visible = false;
  group.add(scanRing);

  // Subtle Golden Martian Guiding Wind Motes drifting along active route ahead of player
  const windGuideCount = 44;
  const windGuidePos = new Float32Array(windGuideCount * 3);
  const windGuideGeo = track(new THREE.BufferGeometry());
  windGuideGeo.setAttribute('position', new THREE.BufferAttribute(windGuidePos, 3));
  const windGuideMat = track(
    new THREE.PointsMaterial({
      color: '#fde047',
      map: textures.softDustMote,
      size: 0.74,
      transparent: true,
      opacity: 0.52,
      alphaTest: 0.01,
      depthWrite: false,
    }),
  );
  const windGuidePoints = new THREE.Points(windGuideGeo, windGuideMat);
  windGuidePoints.frustumCulled = false;
  windGuidePoints.visible = false;
  group.add(windGuidePoints);

  // =========================================================================
  // 8. REMOTE COMMUNICATION RELAY SITE ([122, 48]), COLONY PARKING BAY & NEW FIELD STATIONS
  // =========================================================================
  const remoteSiteGroup = new THREE.Group();
  remoteSiteGroup.position.set(
    REMOTE_SITE_POS[0],
    groundHeightAt(REMOTE_SITE_POS[0], REMOTE_SITE_POS[1]),
    REMOTE_SITE_POS[1],
  );
  const sitePlatform = new THREE.Mesh(track(new THREE.CylinderGeometry(2.15, 2.45, 0.22, 16)), darkMat);
  sitePlatform.position.y = 0.11;
  sitePlatform.receiveShadow = true;
  remoteSiteGroup.add(sitePlatform);

  // Relay Cabinet with hinged access door & glowing fault/healthy electronics bay
  const relayCabinet = new THREE.Mesh(track(new THREE.BoxGeometry(1.15, 1.65, 0.85)), hullMat);
  relayCabinet.position.set(0, 1.04, 0);
  relayCabinet.castShadow = true;
  remoteSiteGroup.add(relayCabinet);

  const relayRecess = new THREE.Mesh(track(new THREE.BoxGeometry(0.84, 1.05, 0.12)), darkMat);
  relayRecess.position.set(0, 1.08, 0.41);
  remoteSiteGroup.add(relayRecess);

  const relayLedMat = track(
    new THREE.MeshStandardMaterial({
      color: '#ef4444',
      emissive: '#ef4444',
      emissiveIntensity: 1.5,
      roughness: 0.2,
    }),
  );
  const relayCircuitCore = new THREE.Mesh(track(new THREE.BoxGeometry(0.62, 0.72, 0.08)), relayLedMat);
  relayCircuitCore.position.set(0, 1.08, 0.45);
  remoteSiteGroup.add(relayCircuitCore);

  // Hinged cabinet access panel door (opens during Scene 2 repair)
  const relayDoorPivot = new THREE.Group();
  relayDoorPivot.position.set(-0.46, 1.08, 0.49);
  const relayDoorMesh = new THREE.Mesh(track(new THREE.BoxGeometry(0.92, 1.12, 0.07)), orangeMat);
  relayDoorMesh.position.set(0.46, 0, 0);
  relayDoorPivot.add(relayDoorMesh);
  remoteSiteGroup.add(relayDoorPivot);

  // Relay Tower Mast, Solar Wing & Dish on top of cabinet
  const siteBeaconMast = new THREE.Mesh(track(new THREE.CylinderGeometry(0.06, 0.09, 2.1, 8)), metalMat);
  siteBeaconMast.position.set(-0.28, 2.85, -0.15);
  remoteSiteGroup.add(siteBeaconMast);
  const relayBeaconMat = track(
    new THREE.MeshStandardMaterial({
      color: '#ef4444',
      emissive: '#ef4444',
      emissiveIntensity: 1.8,
      roughness: 0.2,
    }),
  );
  const siteBeaconTip = new THREE.Mesh(track(new THREE.SphereGeometry(0.15, 10, 8)), relayBeaconMat);
  siteBeaconTip.position.set(-0.28, 3.96, -0.15);
  remoteSiteGroup.add(siteBeaconTip);

  const relayDish = new THREE.Mesh(track(new THREE.ConeGeometry(0.65, 0.28, 14)), hullMat);
  relayDish.position.set(0.28, 2.38, 0.12);
  relayDish.rotation.x = Math.PI * 0.35;
  remoteSiteGroup.add(relayDish);

  const relaySolar = new THREE.Mesh(track(new THREE.BoxGeometry(1.7, 0.06, 0.9)), solarMat);
  relaySolar.position.set(1.25, 1.48, -0.1);
  relaySolar.rotation.z = -0.35;
  remoteSiteGroup.add(relaySolar);
  group.add(remoteSiteGroup);

  // Research Camp Return Parking Bay ([17.5, -10.5]) + Briefing Kiosk ([15.8, -14.2])
  const parkBayGroup = new THREE.Group();
  parkBayGroup.position.set(
    RESEARCH_CAMP_PARKING_POS[0],
    groundHeightAt(RESEARCH_CAMP_PARKING_POS[0], RESEARCH_CAMP_PARKING_POS[1]),
    RESEARCH_CAMP_PARKING_POS[1],
  );
  const parkRingMat = track(
    new THREE.MeshStandardMaterial({
      color: '#f97316',
      emissive: '#f97316',
      emissiveIntensity: 0.75,
      roughness: 0.35,
      transparent: true,
      opacity: 0.85,
    }),
  );
  const parkRing = new THREE.Mesh(track(new THREE.RingGeometry(2.6, 3.05, 36)), parkRingMat);
  parkRing.rotation.x = -Math.PI / 2;
  parkRing.position.y = 0.05;
  parkBayGroup.add(parkRing);
  const parkPad = new THREE.Mesh(track(new THREE.CylinderGeometry(2.6, 2.7, 0.08, 24)), darkMat);
  parkPad.position.y = 0.03;
  parkPad.receiveShadow = true;
  parkBayGroup.add(parkPad);
  group.add(parkBayGroup);

  const dropPodGroup = new THREE.Group();
  dropPodGroup.position.set(
    RESEARCH_DROP_PAD_POS[0],
    groundHeightAt(RESEARCH_DROP_PAD_POS[0], RESEARCH_DROP_PAD_POS[1]),
    RESEARCH_DROP_PAD_POS[1],
  );
  const dropPedestal = new THREE.Mesh(track(new THREE.CylinderGeometry(0.55, 0.72, 1.05, 16)), hullMat);
  dropPedestal.position.y = 0.52;
  dropPedestal.castShadow = true;
  dropPodGroup.add(dropPedestal);
  const dropScreen = new THREE.Mesh(track(new THREE.BoxGeometry(0.68, 0.42, 0.08)), nightWindowMat);
  dropScreen.position.set(0, 1.32, 0);
  dropPodGroup.add(dropScreen);
  group.add(dropPodGroup);

  // Mission 11: Lost Exploration Beacon ([64, -98])
  const lostBeaconGroup = new THREE.Group();
  lostBeaconGroup.position.set(64, groundHeightAt(64, -98), -98);
  const lbPad = new THREE.Mesh(track(new THREE.CylinderGeometry(1.2, 1.4, 0.2, 12)), darkMat);
  lbPad.position.y = 0.1;
  const lbMast = new THREE.Mesh(track(new THREE.CylinderGeometry(0.1, 0.14, 2.8, 8)), metalMat);
  lbMast.position.y = 1.5;
  const lbOrbMat = track(
    new THREE.MeshStandardMaterial({
      color: '#f97316',
      emissive: '#f97316',
      emissiveIntensity: 1.5,
      roughness: 0.2,
    }),
  );
  const lbOrb = new THREE.Mesh(track(new THREE.SphereGeometry(0.28, 12, 10)), lbOrbMat);
  lbOrb.position.y = 3.0;
  const lbPanel = new THREE.Mesh(track(new THREE.BoxGeometry(1.2, 0.06, 0.8)), solarMat);
  lbPanel.position.set(0.4, 1.8, 0);
  lbPanel.rotation.z = -0.35;
  lostBeaconGroup.add(lbPad, lbMast, lbOrb, lbPanel);
  group.add(lostBeaconGroup);

  // Mission 14: Mountain Research Station ([-118, -96])
  const mtnGroup = new THREE.Group();
  mtnGroup.position.set(-118, groundHeightAt(-118, -96), -96);
  const mtnPad = new THREE.Mesh(track(new THREE.CylinderGeometry(3.2, 3.6, 0.3, 8)), darkMat);
  mtnPad.position.y = 0.15;
  const mtnPod = new THREE.Mesh(track(new THREE.CylinderGeometry(2.15, 2.35, 2.2, 6)), hullMat);
  mtnPod.position.y = 1.35;
  mtnPod.castShadow = true;
  const mtnBand = new THREE.Mesh(track(new THREE.CylinderGeometry(2.22, 2.22, 0.28, 6)), orangeMat);
  mtnBand.position.y = 2.35;
  const mtnWin = new THREE.Mesh(track(new THREE.BoxGeometry(1.5, 0.72, 0.1)), nightWindowMat);
  mtnWin.position.set(0, 1.45, 2.08);
  const mtnMast = new THREE.Mesh(track(new THREE.CylinderGeometry(0.08, 0.1, 2.0, 8)), metalMat);
  mtnMast.position.set(-0.9, 3.2, -0.6);
  const mtnSolar = new THREE.Mesh(track(new THREE.BoxGeometry(2.4, 0.06, 1.2)), solarMat);
  mtnSolar.position.set(2.3, 1.6, 0);
  mtnSolar.rotation.z = -0.35;
  mtnGroup.add(mtnPad, mtnPod, mtnBand, mtnWin, mtnMast, mtnSolar);
  group.add(mtnGroup);

  // Mission 17: Power Satellite Uplink Pad ([-29.5, -14])
  const satPadGroup = new THREE.Group();
  satPadGroup.position.set(-29.5, groundHeightAt(-29.5, -14), -14);
  const satBase = new THREE.Mesh(track(new THREE.CylinderGeometry(1.35, 1.55, 0.25, 12)), darkMat);
  satBase.position.y = 0.12;
  const satPed = new THREE.Mesh(track(new THREE.CylinderGeometry(0.32, 0.42, 1.2, 10)), hullMat);
  satPed.position.y = 0.85;
  const satDish = new THREE.Mesh(track(new THREE.ConeGeometry(1.05, 0.42, 16)), hullMat);
  satDish.position.set(0, 1.75, 0);
  satDish.rotation.x = Math.PI * 0.25;
  satPadGroup.add(satBase, satPed, satDish);
  group.add(satPadGroup);

  // Mission 18: Remote Weather Station ([-124, 34])
  const remWeatherGroup = new THREE.Group();
  remWeatherGroup.position.set(-124, groundHeightAt(-124, 34), 34);
  const rwBase = new THREE.Mesh(track(new THREE.CylinderGeometry(1.4, 1.6, 0.22, 12)), darkMat);
  rwBase.position.y = 0.11;
  const rwPod = new THREE.Mesh(track(new THREE.BoxGeometry(1.4, 1.2, 1.2)), hullMat);
  rwPod.position.y = 0.8;
  rwPod.castShadow = true;
  const rwMast = new THREE.Mesh(track(new THREE.CylinderGeometry(0.08, 0.1, 2.4, 8)), metalMat);
  rwMast.position.y = 2.6;
  const rwSpinner = new THREE.Group();
  rwSpinner.position.y = 3.75;
  const rwBar = new THREE.Mesh(track(new THREE.BoxGeometry(1.4, 0.08, 0.1)), orangeMat);
  rwSpinner.add(rwBar);
  weatherSpinners.push(rwSpinner);
  remWeatherGroup.add(rwBase, rwPod, rwMast, rwSpinner);
  group.add(remWeatherGroup);

  // Physics & Energy State for 6x6 MEV
  let vx = 0;
  let vz = 0;
  let vFwd = 0;
  let roverYaw = roverStart.yaw;
  let angVel = 0;
  let chassisHeave = 0;
  let chassisHeaveVel = 0;
  let chassisPitch = 0;
  let chassisPitchVel = 0;
  let chassisRoll = 0;
  let chassisRollVel = 0;

  let roverBatteryKwh = MEV_BATTERY_CAPACITY_KWH;
  let avgWhPerM = MEV_BASELINE_WH_PER_M;
  let instantKw = 0;
  let tractionPct = 98;
  let chargingActive = false;
  let inChargingBay = true;
  let chargingBayId: 'BAY_A' | 'BAY_B' | null = 'BAY_A';
  let chargeRatePctPerSec = 0;
  let timeToFullSec = 0;
  let stormSpeedLimited = false;
  let nearChargingConsole = false;
  let bayDoorOpenAmt = 0;

  let nearSupplyTerminal = false;
  let scanTimer = 0;
  let hatchOpenTimer = 0;
  let wasDriving = false;
  let autopilotTarget: { x: number; z: number; yaw: number } | null = null;
  const dronePos = new THREE.Vector3(0, 7, 0);

  const getRoverInteriorCamPose: ColonyExpansionHandles['getRoverInteriorCamPose'] = (
    eyeOut,
    lookOut,
    lookYawOffset = 0,
    lookPitchOffset = 0,
  ) => {
    scoutRover.updateMatrixWorld();
    chassisBody.updateMatrixWorld();
    _camLocal.set(-0.44, 1.72, 0.34);
    eyeOut.copy(_camLocal).applyMatrix4(chassisBody.matrixWorld);
    _lookLocal.set(
      -0.44 + Math.sin(lookYawOffset) * 10.0,
      1.58 - Math.sin(lookPitchOffset) * 4.5,
      0.34 + Math.cos(lookYawOffset) * 10.0,
    );
    lookOut.copy(_lookLocal).applyMatrix4(chassisBody.matrixWorld);
  };

  const setRoverSnapshot = (x: number, z: number, yaw: number, batteryPct: number) => {
    const safe = resolveVehicleCollisions(x, z, 1.45);
    roverYaw = yaw;
    vx = 0;
    vz = 0;
    vFwd = 0;
    angVel = 0;
    autopilotTarget = null;
    roverBatteryKwh = (THREE.MathUtils.clamp(batteryPct, 0, 100) / 100) * MEV_BATTERY_CAPACITY_KWH;
    scoutRover.position.set(safe.x, groundHeightAt(safe.x, safe.z), safe.z);
    scoutRover.rotation.set(0, roverYaw, 0);
    lastTrackPos.set(safe.x, safe.z);
  };

  const setRoverAutopilotTarget = (target: { x: number; z: number; yaw: number } | null) => {
    autopilotTarget = target ? { ...target } : null;
  };

  const addRoverBattery = (amount: number) => {
    const addKwh = (amount / 100) * MEV_BATTERY_CAPACITY_KWH;
    roverBatteryKwh = THREE.MathUtils.clamp(roverBatteryKwh + addKwh, 0, MEV_BATTERY_CAPACITY_KWH);
  };

  const triggerScanPulse = (x: number, z: number) => {
    scanTimer = 1.0;
    scanRing.position.set(x, groundHeightAt(x, z) + 0.16, z);
    scanRing.scale.setScalar(1);
    scanRing.visible = true;
  };

  const resetRoverAndDrone = () => {
    vx = 0;
    vz = 0;
    vFwd = 0;
    angVel = 0;
    autopilotTarget = null;
    chassisHeave = 0;
    chassisHeaveVel = 0;
    chassisPitch = 0;
    chassisPitchVel = 0;
    chassisRoll = 0;
    chassisRollVel = 0;
    roverYaw = roverStart.yaw;
    roverBatteryKwh = MEV_BATTERY_CAPACITY_KWH;
    avgWhPerM = MEV_BASELINE_WH_PER_M;
    instantKw = 0;
    scoutRover.position.set(roverStart.x, groundHeightAt(roverStart.x, roverStart.z), roverStart.z);
    scoutRover.rotation.set(0, roverYaw, 0);
    chassisBody.position.set(0, 0, 0);
    chassisBody.rotation.set(0, 0, 0);
    lastTrackPos.set(roverStart.x, roverStart.z);
    drone.visible = false;
  };

  const update: ColonyExpansionHandles['update'] = (
    elapsed,
    dt,
    state,
    nightFactor,
    playerPos,
    playerYaw,
    driveInput,
  ) => {
    // 1. Night lamps, beacons & window illumination
    const lampGlow = nightFactor > 0.25 && !state.powerBlackout ? 1.4 : 0.08;
    lampHeadMat.emissiveIntensity = THREE.MathUtils.damp(lampHeadMat.emissiveIntensity, lampGlow, 4, dt);
    nightWindowMat.emissiveIntensity = THREE.MathUtils.damp(
      nightWindowMat.emissiveIntensity,
      state.powerBlackout ? 0.1 : 0.45 + nightFactor * 0.7,
      4,
      dt,
    );
    colonyLampLights.forEach((lt) => {
      lt.intensity = THREE.MathUtils.damp(
        lt.intensity,
        nightFactor > 0.28 && !state.powerBlackout ? 3.2 * nightFactor : 0,
        3,
        dt,
      );
    });

    const cargoActive =
      state.cargoDelivery.phase === 'IN_TRANSIT' ||
      state.cargoDelivery.phase === 'DESCENDING' ||
      state.cargoDelivery.phase === 'UNLOADING' ||
      state.cargoDelivery.phase === 'TRANSPORTING';
    cargoStrobeMat.emissiveIntensity = cargoActive
      ? 0.5 + Math.abs(Math.sin(elapsed * 7)) * 1.6
      : 0.25;

    if (observatoryDome) observatoryDome.rotation.y += dt * 0.12;
    weatherSpinners.forEach((sp, i) => {
      sp.rotation.y += dt * (2.5 + i * 0.6);
    });

    // Proximity to Cargo Supply Terminal & Charging Station Console
    const distTerm = Math.hypot(playerPos.x - supplyTermPos.x, playerPos.z - supplyTermPos.z);
    nearSupplyTerminal = distTerm < 3.8 || state.insideBuildingId === 'command_centre';
    stBeacon.position.y = 1.5 + Math.sin(elapsed * 3.5) * 0.08;

    const distChConsole = Math.hypot(
      playerPos.x - CHARGING_CONSOLE_POS[0],
      playerPos.z - CHARGING_CONSOLE_POS[1],
    );
    nearChargingConsole = distChConsole < 4.2;

    // 1B. Autonomous Robotic Cargo Transporter along Service Road (z = -23)
    const cPhase = state.cargoDelivery.phase;
    const cProg = state.cargoDelivery.phaseProgress;
    if (cPhase === 'UNLOADING') {
      transporter.position.set(transPadStop.x, groundHeightAt(transPadStop.x, transPadStop.z), transPadStop.z);
      transporter.rotation.y = 0;
      transporterCrate.visible = cProg > 0.55;
    } else if (cPhase === 'TRANSPORTING') {
      const tx = THREE.MathUtils.lerp(transPadStop.x, transStart.x, cProg);
      transporter.position.set(tx, groundHeightAt(tx, transStart.z), transStart.z);
      transporter.rotation.y = 0;
      transporterCrate.visible = true;
    } else {
      transporter.position.set(transStart.x, groundHeightAt(transStart.x, transStart.z), transStart.z);
      transporter.rotation.y = 0;
      transporterCrate.visible = false;
    }

    // 2. Lost Rover Beacons
    roverSiteVisuals.forEach((rv, i) => {
      const resolved = state.resolvedRoverIds.includes(rv.id);
      rv.beaconMat.color.set(resolved ? '#10b981' : '#f97316');
      rv.beaconMat.emissive.set(resolved ? '#10b981' : '#f97316');
      rv.beaconMat.emissiveIntensity = resolved ? 1.1 : 0.6 + Math.abs(Math.sin(elapsed * 4 + i)) * 1.4;
      const pulse = 1 + ((elapsed * 0.85 + i * 0.2) % 1) * 0.65;
      rv.ringMesh.scale.setScalar(resolved ? 1.0 : pulse);
    });

    // 2B. Remote Relay Status + Hinged Panel + Parking Bay Markers
    const relayFixed = Boolean(state.relayRepaired);
    relayLedMat.color.set(relayFixed ? '#10b981' : '#ef4444');
    relayLedMat.emissive.set(relayFixed ? '#10b981' : '#ef4444');
    relayLedMat.emissiveIntensity = relayFixed ? 1.4 : 0.65 + Math.abs(Math.sin(elapsed * 6)) * 1.4;
    relayBeaconMat.color.set(relayFixed ? '#10b981' : '#ef4444');
    relayBeaconMat.emissive.set(relayFixed ? '#10b981' : '#ef4444');
    relayBeaconMat.emissiveIntensity = relayFixed ? 1.2 : 0.6 + Math.abs(Math.sin(elapsed * 5.5)) * 1.5;
    relayDoorPivot.rotation.y = THREE.MathUtils.damp(
      relayDoorPivot.rotation.y,
      state.relayPanelOpen ? -1.48 : 0,
      8,
      dt,
    );
    lbOrbMat.emissiveIntensity = state.missionId > 11 ? 1.6 : 0.55 + Math.abs(Math.sin(elapsed * 4.5)) * 1.2;

    const isDrivingIntro = state.introPhase === 'drive_to_camp';
    const isArrived = state.introPhase === 'camp_arrival';
    parkRingMat.color.set(isArrived ? '#10b981' : '#f97316');
    parkRingMat.emissive.set(isArrived ? '#10b981' : '#f97316');
    parkRingMat.emissiveIntensity = isDrivingIntro
      ? 0.9 + Math.abs(Math.sin(elapsed * 4.5)) * 1.1
      : isArrived
        ? 0.85
        : 0.22;
    parkRing.scale.setScalar(isDrivingIntro ? 1 + Math.sin(elapsed * 3) * 0.06 : 1);

    // 3. Large 6-Wheel Pressurized Exploration Vehicle Physics (3.71 m/s² Mars gravity & 6-wheel suspension)
    if (state.drivingRover !== wasDriving) {
      hatchOpenTimer = 0.85;
      wasDriving = state.drivingRover;
    }
    if (hatchOpenTimer > 0) hatchOpenTimer = Math.max(0, hatchOpenTimer - dt);
    const hatchOpen = Boolean(state.hatchForcedOpen) || hatchOpenTimer > 0;
    hatchPivot.rotation.y = THREE.MathUtils.damp(
      hatchPivot.rotation.y,
      hatchOpen ? -1.05 : 0,
      9,
      dt,
    );
    const rightHatchOpen = Boolean(state.rightHatchForcedOpen);
    rightHatchPivot.rotation.y = THREE.MathUtils.damp(
      rightHatchPivot.rotation.y,
      rightHatchOpen ? 1.05 : 0,
      9,
      dt,
    );

    const dashLit = state.vehicleDashLit !== false;
    dashScreenMat.emissiveIntensity = THREE.MathUtils.damp(
      dashScreenMat.emissiveIntensity,
      dashLit ? 1.25 : 0.03,
      7,
      dt,
    );

    const steerInput = state.drivingRover && !autopilotTarget ? driveInput.right : 0;
    const steerAngleVis = -steerInput * 0.36;
    for (let i = 0; i < frontSteerPivots.length; i++) {
      frontSteerPivots[i].rotation.y = THREE.MathUtils.damp(
        frontSteerPivots[i].rotation.y,
        steerAngleVis,
        10,
        dt,
      );
    }
    steeringYoke.rotation.z = THREE.MathUtils.damp(steeringYoke.rotation.z, -steerAngleVis * 1.8, 10, dt);

    const rx = scoutRover.position.x;
    const rz = scoutRover.position.z;
    const surf = surfaceTypeAt(rx, rz);
    const trac = SURFACE_TRACTION[surf];
    const stormPenalty = state.stormStage >= 4 ? 0.78 : state.stormStage === 3 ? 0.91 : 1.0;
    const effGrip = trac.grip * stormPenalty;
    tractionPct = Math.round(THREE.MathUtils.clamp(effGrip * 100, 28, 100));

    const fwdX = Math.sin(roverYaw);
    const fwdZ = Math.cos(roverYaw);
    const rightX = -Math.cos(roverYaw);
    const rightZ = Math.sin(roverYaw);

    // Terrain heights fore/aft & port/starboard
    const hFront = groundHeightAt(rx + fwdX * 1.32, rz + fwdZ * 1.32);
    const hBack = groundHeightAt(rx - fwdX * 1.32, rz - fwdZ * 1.32);
    const hLeft = groundHeightAt(rx - rightX * 1.1, rz - rightZ * 1.1);
    const hRight = groundHeightAt(rx + rightX * 1.1, rz + rightZ * 1.1);
    const dh = hFront - hBack;
    const slopeSin = dh / Math.sqrt(2.64 * 2.64 + dh * dh);

    const batteryPct = (roverBatteryKwh / MEV_BATTERY_CAPACITY_KWH) * 100;
    const headOn =
      (state.drivingRover || state.vehicleDashLit) &&
      (state.vehicleHeadlights || nightFactor > 0.25 || state.flashlightOn || state.stormStage >= 4 || Boolean(state.vehicleDashLit));

    let accelCmd = 0;
    stormSpeedLimited = false;

    if (autopilotTarget) {
      const dx = autopilotTarget.x - rx;
      const dz = autopilotTarget.z - rz;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.22) {
        const targetYaw = Math.atan2(dx, dz);
        let diff = targetYaw - roverYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        roverYaw += diff * Math.min(1, dt * 4.5);
        const speed = Math.min(4.6, dist * 1.8);
        vx = (dx / dist) * speed;
        vz = (dz / dist) * speed;
        vFwd = speed;
      } else {
        let diff = autopilotTarget.yaw - roverYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        roverYaw += diff * Math.min(1, dt * 5.0);
        vx = 0;
        vz = 0;
        vFwd = 0;
      }
    } else if (state.drivingRover && state.screen === 'playing') {
      vFwd = vx * fwdX + vz * fwdZ;
      let vLat = vx * rightX + vz * rightZ;

      const limpFactor = batteryPct > 1.2 ? 1.0 : 0.25;
      const stormCapMult = state.stormStage >= 4 ? 0.58 : state.stormStage === 3 ? 0.85 : 1.0;
      const maxAllowedFwd = ROVER_MAX_SPEED * stormCapMult * limpFactor;

      if (driveInput.forward > 0.05) {
        if (vFwd < -0.4) {
          accelCmd = 14.0; // Service braking from reverse
        } else {
          const speedRatio = THREE.MathUtils.clamp(vFwd / Math.max(1, maxAllowedFwd), 0, 1);
          accelCmd = driveInput.forward * 7.6 * effGrip * limpFactor * (1 - speedRatio * 0.72);
          if (state.stormStage >= 4 && vFwd >= maxAllowedFwd * 0.92) {
            stormSpeedLimited = true;
          }
        }
      } else if (driveInput.forward < -0.05) {
        if (vFwd > 0.4) {
          accelCmd = -15.0; // Service braking from forward
        } else {
          const revRatio = THREE.MathUtils.clamp(-vFwd / (ROVER_REVERSE_SPEED * limpFactor), 0, 1);
          accelCmd = driveInput.forward * 5.8 * effGrip * limpFactor * (1 - revRatio * 0.75);
        }
      }

      // Mars gravity downhill/uphill slope pull (3.71 m/s²) + rolling resistance + quadratic dust drag
      const slopeGravity = -MARS_GRAVITY * slopeSin;
      const rollDrag = Math.abs(vFwd) > 0.06 ? -Math.sign(vFwd) * MARS_GRAVITY * trac.rollRes * 2.2 : 0;
      const aeroDrag = -0.015 * vFwd * Math.abs(vFwd);

      vFwd += (accelCmd + slopeGravity + rollDrag + aeroDrag) * dt;
      if (vFwd > maxAllowedFwd && state.stormStage >= 4) {
        vFwd = THREE.MathUtils.damp(vFwd, maxAllowedFwd, 4.5, dt);
        stormSpeedLimited = true;
      }

      // Clean standstill settle when parked on mild grades
      if (Math.abs(driveInput.forward) < 0.05 && Math.abs(vFwd) < 0.14 && Math.abs(slopeSin) < 0.18) {
        vFwd = 0;
      }

      // Lateral tire grip (high grip on colony pad, drift/slip on loose sand or ice)
      vLat = THREE.MathUtils.damp(vLat, 0, 6.0 + effGrip * 11.5, dt);

      vx = fwdX * vFwd + rightX * vLat;
      vz = fwdZ * vFwd + rightZ * vLat;

      // Realistic Ackermann turning radius (no toy spinning in place)
      const speedTurnFactor = THREE.MathUtils.clamp(Math.abs(vFwd) / 1.8, 0, 1);
      const targetYawRate =
        speedTurnFactor > 0.03
          ? -driveInput.right * Math.tan(0.36) * (vFwd / MEV_WHEELBASE_M) * 2.15 * effGrip * speedTurnFactor
          : 0;
      angVel = THREE.MathUtils.damp(angVel, targetYawRate, 8.5, dt);
      roverYaw += angVel * dt;
    } else {
      // Parked: brakes hold vehicle cleanly on terrain with zero phantom drift
      vx = THREE.MathUtils.damp(vx, 0, 8.5, dt);
      vz = THREE.MathUtils.damp(vz, 0, 8.5, dt);
      vFwd = vx * fwdX + vz * fwdZ;
      angVel = THREE.MathUtils.damp(angVel, 0, 10, dt);
      if (Math.hypot(vx, vz) < 0.04) {
        vx = 0;
        vz = 0;
        vFwd = 0;
      }
    }

    // Integrate position + solid wall/pod/boulder collision deflection impulse
    const rawNextX = rx + vx * dt;
    const rawNextZ = rz + vz * dt;
    const col = resolveVehicleCollisions(rawNextX, rawNextZ, 1.45);
    if (col.hitForce > 0.02) {
      const nx = col.x - rawNextX;
      const nz = col.z - rawNextZ;
      const nLen = Math.hypot(nx, nz);
      if (nLen > 0.0001) {
        const unx = nx / nLen;
        const unz = nz / nLen;
        const vn = vx * unx + vz * unz;
        if (vn < 0) {
          vx -= vn * unx * 1.15;
          vz -= vn * unz * 1.15;
        }
      }
      vx *= 0.65;
      vz *= 0.65;
      chassisPitchVel -= Math.sign(vFwd || 1) * col.hitForce * 0.85;
    }

    const distMoved = Math.hypot(col.x - rx, col.z - rz);
    const groundY = groundHeightAt(col.x, col.z);
    scoutRover.position.set(col.x, groundY, col.z);
    scoutRover.rotation.set(0, roverYaw, 0);

    // 6-Wheel Independent Vertical Ground-Contact + Spring-Damper Chassis Suspension
    let avgWheelDelta = 0;
    const cYaw = Math.cos(roverYaw);
    const sYaw = Math.sin(roverYaw);
    for (let i = 0; i < wheelMounts.length; i++) {
      const wm = wheelMounts[i];
      const worldWx = col.x + wm.wx * cYaw + wm.wz * sYaw;
      const worldWz = col.z - wm.wx * sYaw + wm.wz * cYaw;
      const wgY = groundHeightAt(worldWx, worldWz) + rockBumpAt(worldWx, worldWz);
      const localTargetY = THREE.MathUtils.clamp(wgY - groundY + MEV_WHEEL_RADIUS, 0.16, 0.72);
      wm.mount.position.y = THREE.MathUtils.damp(wm.mount.position.y, localTargetY, 20, dt);
      avgWheelDelta += wm.mount.position.y - MEV_WHEEL_RADIUS;
      // Wheel spin locked to real ground travel distance
      wm.wheel.rotation.x += (vFwd * dt) / MEV_WHEEL_RADIUS;
    }
    avgWheelDelta /= wheelMounts.length;

    // Terrain pitch & roll + longitudinal accel dive/squat + cornering roll via spring-damper
    const terrainPitch = Math.atan2(hBack - hFront, 2.64) * 0.85;
    const terrainRoll = Math.atan2(hRight - hLeft, 2.2) * 0.65;
    const dynamicDive = -THREE.MathUtils.clamp(accelCmd * 0.0085, -0.065, 0.065);
    const cornerRoll = THREE.MathUtils.clamp(angVel * Math.abs(vFwd) * 0.009, -0.075, 0.075);

    const targetHeave = avgWheelDelta * 0.75;
    const targetPitch = terrainPitch + dynamicDive;
    const targetRoll = terrainRoll + cornerRoll;

    const kSpring = 46;
    const cDamp = 9.2;
    chassisHeaveVel += ((targetHeave - chassisHeave) * kSpring - chassisHeaveVel * cDamp) * dt;
    chassisHeave += chassisHeaveVel * dt;

    chassisPitchVel += ((targetPitch - chassisPitch) * kSpring - chassisPitchVel * cDamp) * dt;
    chassisPitch += chassisPitchVel * dt;

    chassisRollVel += ((targetRoll - chassisRoll) * kSpring - chassisRollVel * cDamp) * dt;
    chassisRoll += chassisRollVel * dt;

    chassisBody.position.y = THREE.MathUtils.clamp(chassisHeave, -0.18, 0.24);
    chassisBody.rotation.x = THREE.MathUtils.clamp(chassisPitch, -0.35, 0.35);
    chassisBody.rotation.z = THREE.MathUtils.clamp(chassisRoll, -0.32, 0.32);

    // Dynamic tire tracks stamped onto regolith
    if (Math.hypot(col.x - lastTrackPos.x, col.z - lastTrackPos.y) >= 1.45) {
      lastTrackPos.set(col.x, col.z);
      placeTrackPair(liveTracks, liveTrackCursor % liveTrackCap, col.x, col.z, roverYaw, 1.12);
      liveTrackCursor += 2;
      liveTracks.instanceMatrix.needsUpdate = true;
    }

    // Dynamic Energy Consumption (0 drain when parked!)
    if (state.drivingRover && Math.abs(vFwd) > 0.22) {
      const mechForceN =
        MEV_MASS_KG *
        (MARS_GRAVITY * trac.rollRes +
          MARS_GRAVITY * slopeSin +
          Math.max(0, accelCmd * 0.55) +
          (1 - effGrip) * 1.4);
      let mechKw = (mechForceN * Math.abs(vFwd)) / 1000;
      if (mechKw < 0) mechKw *= 0.25; // Downhill regenerative braking recovery
      const auxKw = (headOn ? 0.35 : 0) + (state.stormStage >= 3 ? 0.85 : 0.45);
      instantKw = Math.max(-3.5, mechKw + auxKw);

      const dKwh = (instantKw * dt) / 3600;
      roverBatteryKwh = THREE.MathUtils.clamp(roverBatteryKwh - dKwh, 0, MEV_BATTERY_CAPACITY_KWH);

      if (distMoved > 0.008 && instantKw > 0.1) {
        const instWhPerM = (instantKw * 1000 * dt) / 3600 / distMoved;
        avgWhPerM = THREE.MathUtils.lerp(avgWhPerM, THREE.MathUtils.clamp(instWhPerM, 85, 520), 0.05);
      }
    } else {
      instantKw = 0;
    }

    // Functional Multi-Bay Vehicle Charging Station Logic (works even while Alex walks elsewhere!)
    const distBayA = Math.hypot(col.x - CHARGING_BAY_A_POS[0], col.z - CHARGING_BAY_A_POS[1]);
    const distBayB = Math.hypot(col.x - CHARGING_BAY_B_POS[0], col.z - CHARGING_BAY_B_POS[1]);
    const isStopped = Math.abs(vFwd) < 0.75;
    if (distBayA < 2.35 && isStopped) {
      inChargingBay = true;
      chargingBayId = 'BAY_A';
    } else if (distBayB < 2.25 && isStopped) {
      inChargingBay = true;
      chargingBayId = 'BAY_B';
    } else {
      inChargingBay = false;
      chargingBayId = null;
    }

    const colPower = state.colonyPowerPct ?? 100;
    const shouldCharge = inChargingBay && Boolean(state.vehicleChargingRequested) && roverBatteryKwh < MEV_BATTERY_CAPACITY_KWH - 0.05;
    if (shouldCharge && colPower >= 20) {
      chargingActive = true;
      chargeRatePctPerSec = colPower >= 55 ? 3.2 : 1.7;
      const addKwh = (chargeRatePctPerSec / 100) * MEV_BATTERY_CAPACITY_KWH * dt;
      roverBatteryKwh = Math.min(MEV_BATTERY_CAPACITY_KWH, roverBatteryKwh + addKwh);
      const pctRemaining = Math.max(0, 100 - (roverBatteryKwh / MEV_BATTERY_CAPACITY_KWH) * 100);
      timeToFullSec = Math.ceil(pctRemaining / chargeRatePctPerSec);
    } else {
      chargingActive = false;
      chargeRatePctPerSec = 0;
      timeToFullSec = 0;
    }

    // Animate Charging Station Doors, Pads, Umbilical Cable & LED Bar
    bayDoorOpenAmt = THREE.MathUtils.damp(bayDoorOpenAmt, inChargingBay ? 1 : 0, 4.5, dt);
    bayDoorA.position.z = -1.8 - bayDoorOpenAmt * 1.45;
    bayAPadMat.emissiveIntensity = chargingActive
      ? 1.1 + Math.sin(elapsed * 4.5) * 0.45
      : inChargingBay
        ? 0.55
        : 0.25;
    umbilicalMat.emissiveIntensity = chargingActive ? 1.2 + Math.sin(elapsed * 6) * 0.45 : 0.12;

    const pct01 = THREE.MathUtils.clamp(roverBatteryKwh / MEV_BATTERY_CAPACITY_KWH, 0.05, 1);
    cLedBar.scale.y = pct01;
    cLedBar.position.y = 0.14 + 0.46 * pct01;
    if (pct01 < 0.22) {
      cLedMat.color.set('#ef4444');
      cLedMat.emissive.set('#ef4444');
    } else if (pct01 < 0.6) {
      cLedMat.color.set('#f59e0b');
      cLedMat.emissive.set('#f59e0b');
    } else {
      cLedMat.color.set('#10b981');
      cLedMat.emissive.set('#10b981');
    }
    if (bayFloodLight) {
      bayFloodLight.intensity = THREE.MathUtils.damp(
        bayFloodLight.intensity,
        !state.powerBlackout && (nightFactor > 0.25 || chargingActive || state.stormStage >= 3)
          ? 1.45
          : 0.2,
        3,
        dt,
      );
    }

    // Wake dust trail while driving fast on Mars regolith
    const wakeTarget = state.drivingRover && Math.abs(vFwd) > 2.2 ? 0.52 : 0;
    wakeMat.opacity = THREE.MathUtils.damp(wakeMat.opacity, wakeTarget, 6, dt);
    if (wakeMat.opacity > 0.03) {
      const attr = wakeGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < wakeCount; i++) {
        const backDist = 1.6 + ((elapsed * 7 + i * 0.4) % 3.2);
        const side = (i % 2 === 0 ? -1 : 1) * (0.95 + (i % 5) * 0.08);
        const wpx = scoutRover.position.x - Math.sin(roverYaw) * backDist + Math.cos(roverYaw) * side;
        const wpz = scoutRover.position.z - Math.cos(roverYaw) * backDist - Math.sin(roverYaw) * side;
        attr.setXYZ(i, wpx, groundHeightAt(wpx, wpz) + 0.15 + (backDist - 1.6) * 0.25, wpz);
      }
      attr.needsUpdate = true;
    }

    roverSpot.intensity = THREE.MathUtils.damp(roverSpot.intensity, headOn ? 9.2 : 0, 5, dt);
    roverHeadlightMat.emissiveIntensity = headOn ? 2.1 : 0.25;
    tailLightMat.emissiveIntensity = state.drivingRover ? 1.4 : 0.3;

    // 4. Exploration Scout Drone
    drone.visible = state.droneActive;
    if (state.droneActive) {
      const targetDx = playerPos.x + Math.sin(playerYaw + 0.5) * 4.5;
      const targetDz = playerPos.z + Math.cos(playerYaw + 0.5) * 4.5;
      const targetDy =
        Math.max(playerPos.y, groundHeightAt(targetDx, targetDz)) + 7.5 + Math.sin(elapsed * 2.2) * 0.35;
      dronePos.x = THREE.MathUtils.damp(dronePos.x, targetDx, 3.2, dt);
      dronePos.y = THREE.MathUtils.damp(dronePos.y, targetDy, 3.2, dt);
      dronePos.z = THREE.MathUtils.damp(dronePos.z, targetDz, 3.2, dt);
      drone.position.copy(dronePos);
      drone.rotation.y = playerYaw;
      rotorBar.rotation.y += dt * 36;
    } else {
      dronePos.set(playerPos.x, playerPos.y + 7, playerPos.z);
    }

    // 5. Geology Scanner Pulse Ring
    if (scanTimer > 0) {
      scanTimer = Math.max(0, scanTimer - dt * 0.95);
      const prog = 1 - scanTimer;
      scanRing.scale.setScalar(1 + prog * 18);
      scanRingMat.opacity = (1 - prog) * 0.85;
      if (scanTimer <= 0) scanRing.visible = false;
    }

    // 6. Subtle In-World Golden Guiding Wind Motes along active route
    const rWps = state.activeRouteWaypoints;
    if (state.screen === 'playing' && rWps && rWps.length >= 2) {
      windGuidePoints.visible = true;
      const wAttr = windGuideGeo.attributes.position as THREE.BufferAttribute;
      // Compute cumulative 2D route distances (capped to first ~38m ahead for natural sightline)
      const segLens: number[] = [];
      let totalLen = 0;
      for (let i = 0; i < rWps.length - 1; i++) {
        const l = Math.hypot(rWps[i + 1][0] - rWps[i][0], rWps[i + 1][1] - rWps[i][1]);
        segLens.push(l);
        totalLen += l;
      }
      const spanM = Math.min(Math.max(4, totalLen), state.drivingRover ? 42 : 24);
      for (let i = 0; i < windGuideCount; i++) {
        const lane = (i % 3) - 1;
        const distAlong = ((elapsed * (state.drivingRover ? 7.2 : 4.2) + (i / windGuideCount) * spanM) % spanM);
        let acc = 0;
        let gx = rWps[0][0];
        let gz = rWps[0][1];
        for (let sIdx = 0; sIdx < segLens.length; sIdx++) {
          const sl = Math.max(0.01, segLens[sIdx]);
          if (acc + sl >= distAlong || sIdx === segLens.length - 1) {
            const frac = THREE.MathUtils.clamp((distAlong - acc) / sl, 0, 1);
            const ax = rWps[sIdx][0];
            const az = rWps[sIdx][1];
            const bx = rWps[sIdx + 1][0];
            const bz = rWps[sIdx + 1][1];
            const nx = -(bz - az) / sl;
            const nz = (bx - ax) / sl;
            const sway = lane * 0.45 + Math.sin(elapsed * 2.3 + i * 0.8) * 0.25;
            gx = ax + (bx - ax) * frac + nx * sway;
            gz = az + (bz - az) * frac + nz * sway;
            break;
          }
          acc += sl;
        }
        const gy = groundHeightAt(gx, gz) + 0.45 + Math.sin(elapsed * 3.1 + i) * 0.16;
        wAttr.setXYZ(i, gx, gy, gz);
      }
      wAttr.needsUpdate = true;
    } else {
      windGuidePoints.visible = false;
    }

    // 7. Floating EV Locator Beacon & Destination Parking Zone Ring
    const showEvGuide = Boolean(state.evGuideActive && !state.drivingRover && state.screen === 'playing');
    evGuideGroup.visible = showEvGuide;
    if (showEvGuide) {
      evDiamond.position.y = 3.95 + Math.sin(elapsed * 3.1) * 0.28;
      evDiamond.rotation.y = elapsed * 1.9;
      evArrow.position.y = 3.05 + Math.sin(elapsed * 3.1) * 0.18;
      evGroundRing.scale.setScalar(1 + Math.sin(elapsed * 4.0) * 0.06);
      evGuideMat.opacity = 0.78 + Math.sin(elapsed * 4.0) * 0.16;
    }

    const arrivalPos = state.evArrivalRingPos;
    const showArrivalZone = Boolean(arrivalPos && state.drivingRover && state.screen === 'playing');
    arrivalZoneGroup.visible = showArrivalZone;
    if (showArrivalZone && arrivalPos) {
      const ay = groundHeightAt(arrivalPos[0], arrivalPos[1]) + 0.18;
      arrivalZoneGroup.position.set(arrivalPos[0], ay, arrivalPos[1]);
      const arrived = Boolean(state.evArrivedAtZone);
      arrivalOuterMat.color.set(arrived ? '#10b981' : '#f59e0b');
      arrivalInnerMat.color.set(arrived ? '#34d399' : '#fde047');
      const pulse = 1 + Math.sin(elapsed * 3.6) * (arrived ? 0.04 : 0.06);
      arrivalOuterRing.scale.setScalar(pulse);
      arrivalInnerMat.opacity = arrived ? 0.36 + Math.sin(elapsed * 4.2) * 0.1 : 0.22;
    }
  };

  return {
    group,
    get roverPos() {
      return scoutRover.position;
    },
    vehicleProxy: mevInteractProxy,
    get roverYaw() {
      return roverYaw;
    },
    get vehicleSpeedKmh() {
      return Math.round(Math.abs(vFwd) * 3.6);
    },
    get vehicleBatteryPct() {
      return Math.round((roverBatteryKwh / MEV_BATTERY_CAPACITY_KWH) * 100);
    },
    get vehicleBatteryKwh() {
      return Math.round(roverBatteryKwh * 10) / 10;
    },
    get vehicleInstantKw() {
      return Math.round(instantKw * 10) / 10;
    },
    get vehicleConsumptionWhPerM() {
      return Math.round(avgWhPerM);
    },
    get vehicleTractionPct() {
      return tractionPct;
    },
    get vehicleChargingActive() {
      return chargingActive;
    },
    get vehicleInChargingBay() {
      return inChargingBay;
    },
    get vehicleChargingBayId() {
      return chargingBayId;
    },
    get vehicleChargeRatePctPerSec() {
      return chargeRatePctPerSec;
    },
    get vehicleTimeToFullSec() {
      return timeToFullSec;
    },
    get vehicleStormSpeedLimited() {
      return stormSpeedLimited;
    },
    get nearChargingConsole() {
      return nearChargingConsole;
    },
    get nearSupplyTerminal() {
      return nearSupplyTerminal;
    },
    dronePos,
    getRoverInteriorCamPose,
    setRoverSnapshot,
    setRoverAutopilotTarget,
    addRoverBattery,
    triggerScanPulse,
    resetRoverAndDrone,
    update,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
