import * as THREE from 'three';
import { groundHeightAt } from './lunarTerrain';

export interface ColonyBuildingInfo {
  id: string;
  name: string;
  x: number;
  z: number;
  purpose: string;
  interiorSummary: string;
  beaconLight?: THREE.PointLight;
  rotatingDish?: THREE.Object3D;
}

export interface AnimatedAirlockDoor {
  doorGroup: THREE.Group;
  worldX: number;
  worldZ: number;
  baseLocalX: number;
  openProgress: number;
}

export interface ChargingStationInfo {
  id: string;
  name: string;
  x: number;
  z: number;
  radius: number;
  padRingMat: THREE.MeshBasicMaterial;
  beaconMat: THREE.MeshStandardMaterial;
}

export interface ColonyBuildResult {
  group: THREE.Group;
  buildings: ColonyBuildingInfo[];
  colliders: Array<{ x: number; z: number; radius: number }>;
  exteriorLights: THREE.PointLight[];
  airlockDoors: AnimatedAirlockDoor[];
  solarPanels: THREE.Mesh[];
  greenhouseGrowLights: THREE.PointLight[];
  outpostBeaconMat: THREE.MeshStandardMaterial;
  chargingStations: ChargingStationInfo[];
  observatoryDomePivot: THREE.Object3D;
}

function createTelemetryScreenTexture(title: string, accent: string, mode: 'radar' | 'bars' | 'ecg' | 'spectrum'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#061121';
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 248, 120);

  ctx.fillStyle = accent;
  ctx.font = 'bold 16px monospace';
  ctx.fillText(title, 14, 26);

  if (mode === 'radar') {
    ctx.strokeStyle = 'rgba(56,189,248,0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(195, 72, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(195, 72, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(14, 46, 110, 10);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(14, 68, 86, 10);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(14, 90, 98, 10);
  } else if (mode === 'bars') {
    const heights = [48, 72, 60, 84, 52, 76];
    heights.forEach((h, i) => {
      ctx.fillStyle = i % 2 === 0 ? accent : '#38bdf8';
      ctx.fillRect(20 + i * 36, 112 - h, 22, h);
    });
  } else if (mode === 'ecg') {
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(12, 82);
    ctx.lineTo(68, 82);
    ctx.lineTo(84, 42);
    ctx.lineTo(98, 104);
    ctx.lineTo(116, 62);
    ctx.lineTo(132, 82);
    ctx.lineTo(240, 82);
    ctx.stroke();
  } else {
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = `hsl(${190 + i * 12}, 85%, 58%)`;
      ctx.fillRect(16 + i * 19, 44, 14, 66);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSolarGridTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0c2459';
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildLunarColony(): ColonyBuildResult {
  const group = new THREE.Group();
  const buildings: ColonyBuildingInfo[] = [];
  const colliders: Array<{ x: number; z: number; radius: number }> = [];
  const exteriorLights: THREE.PointLight[] = [];
  const airlockDoors: AnimatedAirlockDoor[] = [];
  const solarPanels: THREE.Mesh[] = [];
  const greenhouseGrowLights: THREE.PointLight[] = [];
  const chargingStations: ChargingStationInfo[] = [];

  const titaniumWhite = new THREE.MeshStandardMaterial({ color: 0xeaf0f6, roughness: 0.38, metalness: 0.28 });
  const hullSilver = new THREE.MeshStandardMaterial({ color: 0xbac4d1, roughness: 0.42, metalness: 0.62 });
  const regolithShield = new THREE.MeshStandardMaterial({ color: 0x717780, roughness: 0.92, metalness: 0.08 });
  const darkTrim = new THREE.MeshStandardMaterial({ color: 0x222934, roughness: 0.48, metalness: 0.74 });
  const accentBlue = new THREE.MeshStandardMaterial({ color: 0x1d6fe8, roughness: 0.34, metalness: 0.32 });
  const accentAmber = new THREE.MeshStandardMaterial({ color: 0xe69f24, roughness: 0.28, metalness: 0.68 });
  const goldFoil = new THREE.MeshStandardMaterial({ color: 0xd99b26, roughness: 0.24, metalness: 0.88 });
  const interiorFloorMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.72, metalness: 0.15 });

  const solarTex = createSolarGridTexture();
  const solarCellMat = new THREE.MeshStandardMaterial({
    map: solarTex,
    roughness: 0.18,
    metalness: 0.78,
  });

  // Transparent viewport glass so detailed interiors are visible!
  const clearViewportMat = new THREE.MeshStandardMaterial({
    color: 0xbbe8ff,
    transparent: true,
    opacity: 0.32,
    roughness: 0.08,
    metalness: 0.25,
    depthWrite: false,
  });

  const greenGlassMat = new THREE.MeshStandardMaterial({
    color: 0xa7f3d0,
    transparent: true,
    opacity: 0.42,
    roughness: 0.12,
    depthWrite: false,
  });

  const redCrossMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 0.45, roughness: 0.38 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.72, metalness: 0.05 });

  const mcScreenMat = new THREE.MeshBasicMaterial({ map: createTelemetryScreenTexture('LUNAR OPS', '#38bdf8', 'radar') });
  const labScreenMat = new THREE.MeshBasicMaterial({ map: createTelemetryScreenTexture('SPECTROMETER', '#f59e0b', 'spectrum') });
  const medScreenMat = new THREE.MeshBasicMaterial({ map: createTelemetryScreenTexture('CREW VITALS', '#22c55e', 'ecg') });
  const utilScreenMat = new THREE.MeshBasicMaterial({ map: createTelemetryScreenTexture('SYSTEMS OK', '#60a5fa', 'bars') });

  function addInteractiveAirlock(parent: THREE.Group, bX: number, bZ: number, lx: number, lz: number, rotY = 0) {
    const airlock = new THREE.Group();
    airlock.position.set(lx, 0, lz);
    airlock.rotation.y = rotY;

    // Outer pressurized vestibule arch
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.75, 1.8), hullSilver);
    frame.position.y = 1.375;
    frame.castShadow = true;
    airlock.add(frame);

    const interiorChamber = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.2, 1.5), darkTrim);
    interiorChamber.position.set(0, 1.15, 0.2);
    airlock.add(interiorChamber);

    // Sliding hatch door panel
    const doorGroup = new THREE.Group();
    doorGroup.position.set(0, 1.15, 0.92);
    const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.45, 2.1, 0.14), titaniumWhite);
    doorGroup.add(doorPanel);
    const doorStripe = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.22, 0.16), accentAmber);
    doorStripe.position.y = -0.35;
    doorGroup.add(doorStripe);
    const porthole = new THREE.Mesh(new THREE.CircleGeometry(0.24, 16), clearViewportMat);
    porthole.position.set(0, 0.42, 0.08);
    doorGroup.add(porthole);
    airlock.add(doorGroup);

    // Exterior status light above airlock
    const badge = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.16, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x10b981, emissiveIntensity: 0.9 }),
    );
    badge.position.set(0, 2.48, 0.94);
    airlock.add(badge);

    parent.add(airlock);

    const worldX = bX + lx + Math.sin(rotY) * 1.4;
    const worldZ = bZ + lz + Math.cos(rotY) * 1.4;
    airlockDoors.push({
      doorGroup,
      worldX,
      worldZ,
      baseLocalX: 0,
      openProgress: 0,
    });
  }

  function addTunnel(x1: number, z1: number, x2: number, z2: number) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);
    const tunnel = new THREE.Group();
    tunnel.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2);
    tunnel.rotation.y = angle;

    const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, len, 14), hullSilver);
    tube.rotation.x = Math.PI / 2;
    tube.position.y = 1.4;
    tube.castShadow = true;
    tube.receiveShadow = true;
    tunnel.add(tube);

    // Support piers touching ground + bellows rib rings
    const ribs = Math.max(3, Math.floor(len / 3.8));
    for (let i = 1; i < ribs; i++) {
      const zOff = -len / 2 + (i / ribs) * len;
      const rib = new THREE.Mesh(new THREE.TorusGeometry(1.18, 0.11, 8, 18), darkTrim);
      rib.position.set(0, 1.4, zOff);
      tunnel.add(rib);

      if (i % 2 === 1) {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.75, 0.3), darkTrim);
        strut.position.set(0, 0.37, zOff);
        tunnel.add(strut);
      }
    }
    group.add(tunnel);
  }

  // 1. Mission Control Centre (0, -18) — Visible command deck interior with glowing ops screens
  {
    const b = new THREE.Group();
    b.position.set(0, groundHeightAt(0, -18), -18);

    const foundation = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.9, 0.65, 12), darkTrim);
    foundation.position.y = 0.325;
    foundation.receiveShadow = true;
    b.add(foundation);

    const lowerWall = new THREE.Mesh(new THREE.CylinderGeometry(6.8, 7.1, 2.5, 12), titaniumWhite);
    lowerWall.position.y = 1.9;
    lowerWall.castShadow = true;
    b.add(lowerWall);

    // Upper panoramic glass operations deck with visible desks & telemetry monitors inside!
    const opsFloor = new THREE.Mesh(new THREE.CylinderGeometry(5.3, 5.3, 0.25, 12), interiorFloorMat);
    opsFloor.position.y = 3.2;
    b.add(opsFloor);

    for (let m = 0; m < 4; m++) {
      const a = (m / 4) * Math.PI * 2 + 0.4;
      const desk = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.75, 0.9), hullSilver);
      desk.position.set(Math.cos(a) * 2.5, 3.7, Math.sin(a) * 2.5);
      desk.rotation.y = -a + Math.PI / 2;
      b.add(desk);

      const monitor = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.68, 0.08), mcScreenMat);
      monitor.position.set(Math.cos(a) * 2.35, 4.38, Math.sin(a) * 2.35);
      monitor.rotation.y = -a + Math.PI / 2;
      b.add(monitor);
    }

    // Structural window mullions
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.85, 0.32), darkTrim);
      pillar.position.set(Math.cos(a) * 5.05, 4.15, Math.sin(a) * 5.05);
      b.add(pillar);
    }

    const glassBand = new THREE.Mesh(new THREE.CylinderGeometry(5.1, 5.1, 1.75, 16, 1, true), clearViewportMat);
    glassBand.position.y = 4.15;
    glassBand.renderOrder = 2;
    b.add(glassBand);

    const roofCap = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.4, 1.1, 12), hullSilver);
    roofCap.position.y = 5.55;
    roofCap.castShadow = true;
    b.add(roofCap);

    const commsMast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 3.8, 8), darkTrim);
    commsMast.position.y = 7.9;
    b.add(commsMast);

    addInteractiveAirlock(b, 0, -18, 0, 7.1, 0);
    const pl = new THREE.PointLight(0x7dd3fc, 1.4, 24);
    pl.position.set(0, 4.4, 0);
    b.add(pl);
    exteriorLights.push(pl);

    group.add(b);
    buildings.push({
      id: 'mission_control',
      name: 'Mission Control Centre',
      x: 0,
      z: -18,
      purpose: 'Base Command, Navigation & Earth Communications',
      interiorSummary: '4 panoramic telemetry consoles tracking Lunar EV routes, base power, and Earth radio links.',
    });
    colliders.push({ x: 0, z: -18, radius: 7.9 });
  }

  // 2. Lunar Research Habitat (-22, -12)
  {
    const b = new THREE.Group();
    b.position.set(-22, groundHeightAt(-22, -12), -12);

    const corePod = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.8, 9.6, 18), titaniumWhite);
    corePod.rotation.x = Math.PI / 2;
    corePod.position.y = 2.1;
    corePod.castShadow = true;
    b.add(corePod);

    // Regolith micrometeoroid shield arch over the habitat
    const shieldArch = new THREE.Mesh(new THREE.CylinderGeometry(4.65, 4.65, 8.2, 16, 1, false, -Math.PI * 0.42, Math.PI * 0.84), regolithShield);
    shieldArch.rotation.z = Math.PI / 2;
    shieldArch.rotation.y = Math.PI / 2;
    shieldArch.position.y = 2.0;
    shieldArch.castShadow = true;
    b.add(shieldArch);

    // Side window bay looking into habitat workstations
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.4, 3.2), darkTrim);
    winFrame.position.set(3.7, 2.3, 0);
    b.add(winFrame);
    const winPane = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.0), clearViewportMat);
    winPane.rotation.y = Math.PI / 2;
    winPane.position.set(3.92, 2.3, 0);
    b.add(winPane);
    const interiorScreen = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75, 1.4), utilScreenMat);
    interiorScreen.position.set(2.8, 2.3, 0);
    b.add(interiorScreen);

    const thermalRadiator = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.4, 4.2), goldFoil);
    thermalRadiator.position.set(-3.9, 2.4, 0);
    b.add(thermalRadiator);

    addInteractiveAirlock(b, -22, -12, 0, 5.2, 0);
    group.add(b);
    buildings.push({
      id: 'research_habitat',
      name: 'Lunar Research Habitat',
      x: -22,
      z: -12,
      purpose: 'Primary Pressurized Research & Thermal Control Hub',
      interiorSummary: 'Regolith-shielded habitat housing life-support monitors, thermal regulators, and science desks.',
    });
    colliders.push({ x: -22, z: -12, radius: 5.6 });
  }

  // 3. Geological Laboratory (-24, 12) — Interior rock bench & laser spectrometer
  {
    const b = new THREE.Group();
    b.position.set(-24, groundHeightAt(-24, 12), 12);

    const ringBase = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.9, 1.3, 24), hullSilver);
    ringBase.position.y = 0.65;
    ringBase.receiveShadow = true;
    b.add(ringBase);

    const labFloor = new THREE.Mesh(new THREE.CylinderGeometry(5.1, 5.1, 0.15, 24), interiorFloorMat);
    labFloor.position.y = 1.25;
    b.add(labFloor);

    // Interior geology bench + specimen tray + spectrometer screen
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.2), titaniumWhite);
    bench.position.set(-0.8, 1.7, 0);
    b.add(bench);
    const labMon = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.85, 0.1), labScreenMat);
    labMon.position.set(-1.2, 2.65, -0.4);
    labMon.rotation.y = 0.4;
    b.add(labMon);

    const domeUpper = new THREE.Mesh(new THREE.SphereGeometry(5.2, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.36), titaniumWhite);
    domeUpper.position.y = 1.1;
    domeUpper.castShadow = true;
    b.add(domeUpper);

    const labGlassBand = new THREE.Mesh(new THREE.CylinderGeometry(5.15, 5.3, 1.4, 24, 1, true), clearViewportMat);
    labGlassBand.position.y = 2.0;
    labGlassBand.renderOrder = 2;
    b.add(labGlassBand);

    const turret = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.25, 1.6, 12), goldFoil);
    turret.position.set(2.0, 4.6, 0);
    b.add(turret);

    addInteractiveAirlock(b, -24, 12, 5.3, 0, Math.PI / 2);
    const pl = new THREE.PointLight(0xfef08a, 1.2, 18);
    pl.position.set(0, 3.2, 0);
    b.add(pl);
    exteriorLights.push(pl);

    group.add(b);
    buildings.push({
      id: 'geological_lab',
      name: 'Geological Laboratory',
      x: -24,
      z: 12,
      purpose: 'Meteorite & Lunar Core Spectroscopy Analysis',
      interiorSummary: 'Equipped with a laser mineral spectrometer, clean-glove rock bench, and isotope display.',
    });
    colliders.push({ x: -24, z: 12, radius: 5.9 });
  }

  // 4. Oxygen & Life Support Facility (24, -14)
  {
    const b = new THREE.Group();
    b.position.set(24, groundHeightAt(24, -14), -14);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.75, 8.0), darkTrim);
    deck.position.y = 0.375;
    deck.receiveShadow = true;
    b.add(deck);

    for (const tx of [-2.4, 2.4]) {
      const cradle = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 1.0, 12), hullSilver);
      cradle.position.set(tx, 1.0, -0.6);
      b.add(cradle);
      const tank = new THREE.Mesh(new THREE.SphereGeometry(2.1, 22, 18), titaniumWhite);
      tank.position.set(tx, 2.85, -0.6);
      tank.castShadow = true;
      b.add(tank);
      const collar = new THREE.Mesh(new THREE.TorusGeometry(2.12, 0.14, 10, 24), accentBlue);
      collar.rotation.x = Math.PI / 2;
      collar.position.set(tx, 2.85, -0.6);
      b.add(collar);
    }

    const manifold = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 4.8, 10), hullSilver);
    manifold.rotation.z = Math.PI / 2;
    manifold.position.set(0, 2.85, -0.6);
    b.add(manifold);

    const kiosk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.3, 2.1), hullSilver);
    kiosk.position.set(0, 1.5, 2.1);
    kiosk.castShadow = true;
    b.add(kiosk);
    const kioskScreen = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.08), utilScreenMat);
    kioskScreen.position.set(0, 1.75, 3.18);
    b.add(kioskScreen);

    group.add(b);
    buildings.push({
      id: 'oxygen_facility',
      name: 'Oxygen & Life Support Facility',
      x: 24,
      z: -14,
      purpose: 'Cryogenic O₂ Storage & Scrubber Regulation',
      interiorSummary: 'Twin spherical liquid-oxygen reservoirs linked by color-coded pressure regulator manifolds.',
    });
    colliders.push({ x: 24, z: -14, radius: 5.4 });
  }

  // 5. Water Recycling Station (26, 8)
  {
    const b = new THREE.Group();
    b.position.set(26, groundHeightAt(26, 8), 8);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.65, 7.2), darkTrim);
    pad.position.y = 0.325;
    b.add(pad);

    for (const cx of [-2.4, 0, 2.4]) {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.15, 4.6, 16), titaniumWhite);
      tower.position.set(cx, 2.6, 0);
      tower.castShadow = true;
      b.add(tower);
      const sightGlass = new THREE.Mesh(new THREE.CylinderGeometry(1.13, 1.13, 0.7, 16), clearViewportMat);
      sightGlass.position.set(cx, 3.2, 0);
      b.add(sightGlass);
      const waterCore = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.65, 14), accentBlue);
      waterCore.position.set(cx, 3.2, 0);
      b.add(waterCore);
    }

    const headerPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 6.2, 12), accentBlue);
    headerPipe.rotation.z = Math.PI / 2;
    headerPipe.position.set(0, 5.1, 0);
    b.add(headerPipe);

    group.add(b);
    buildings.push({
      id: 'water_station',
      name: 'Water Recycling Station',
      x: 26,
      z: 8,
      purpose: 'Closed-Loop Colony Water Filtration',
      interiorSummary: 'Three vertical multi-stage filtration columns reclaiming 94% of colony water.',
    });
    colliders.push({ x: 26, z: 8, radius: 4.9 });
  }

  // 6. Solar Energy Station (46, -24) — Dual-axis tracking PV wings with silicon grid texture
  {
    const b = new THREE.Group();
    b.position.set(46, groundHeightAt(46, -24), -24);
    const inverter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.4, 3.0), hullSilver);
    inverter.position.set(0, 1.2, 0);
    inverter.castShadow = true;
    b.add(inverter);
    const invFoil = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.5, 3.1), goldFoil);
    invFoil.position.set(0, 2.1, 0);
    b.add(invFoil);

    for (let row = -1; row <= 1; row++) {
      for (const col of [-5.4, 5.4]) {
        const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 1.9, 10), darkTrim);
        stand.position.set(col, 0.95, row * 4.8);
        b.add(stand);

        const panelFrame = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.14, 2.8), hullSilver);
        panelFrame.position.set(col, 2.05, row * 4.8);
        panelFrame.rotation.x = 0.36;
        panelFrame.castShadow = true;
        b.add(panelFrame);

        const pvSurface = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.16, 2.6), solarCellMat);
        pvSurface.position.set(col, 2.07, row * 4.8);
        pvSurface.rotation.x = 0.36;
        b.add(pvSurface);
        solarPanels.push(pvSurface);
      }
    }
    group.add(b);
    buildings.push({
      id: 'solar_station',
      name: 'Solar Energy Station',
      x: 46,
      z: -24,
      purpose: 'Photovoltaic Power Generation & Battery Inverters',
      interiorSummary: 'Six sun-tracking silicon solar wings feeding lithium-sulfur colony power banks.',
    });
    colliders.push({ x: 46, z: -24, radius: 6.6 });
  }

  // 7. Medical Module (-18, -32) — Visible diagnostic bed & vitals ECG screen inside
  {
    const b = new THREE.Group();
    b.position.set(-18, groundHeightAt(-18, -32), -32);
    const pod = new THREE.Mesh(new THREE.BoxGeometry(7.6, 3.6, 5.8), titaniumWhite);
    pod.position.y = 1.8;
    pod.castShadow = true;
    b.add(pod);

    // Side diagnostic window
    const medWin = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.3), clearViewportMat);
    medWin.position.set(0, 2.0, 2.92);
    b.add(medWin);
    const medBed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.65, 1.1), hullSilver);
    medBed.position.set(-1.1, 1.1, 1.2);
    b.add(medBed);
    const medMonitor = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.75, 0.1), medScreenMat);
    medMonitor.position.set(1.2, 2.0, 1.2);
    b.add(medMonitor);

    const crossH = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 0.15), redCrossMat);
    crossH.position.set(-2.4, 2.6, 2.94);
    b.add(crossH);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.5, 0.15), redCrossMat);
    crossV.position.set(-2.4, 2.6, 2.94);
    b.add(crossV);

    addInteractiveAirlock(b, -18, -32, 0, 3.6, 0);
    group.add(b);
    buildings.push({
      id: 'medical_module',
      name: 'Medical Module',
      x: -18,
      z: -32,
      purpose: 'Astronaut Health Check-Ups & Bio-Telemetry',
      interiorSummary: 'Contains a low-gravity diagnostic bed, heart/bone density scanner, and medical kits.',
    });
    colliders.push({ x: -18, z: -32, radius: 4.8 });
  }

  // 8. Greenhouse (16, 26) — Crystal-clear biodome with hydroponic tiers & grow-light bars
  {
    const b = new THREE.Group();
    b.position.set(16, groundHeightAt(16, 26), 26);
    const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(5.7, 6.0, 0.95, 24), hullSilver);
    baseRing.position.y = 0.475;
    b.add(baseRing);

    for (const pz of [-2.1, 0, 2.1]) {
      const tray = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.6, 1.3), darkTrim);
      tray.position.set(0, 0.95, pz);
      b.add(tray);
      for (let px = -2.4; px <= 2.4; px += 1.2) {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.45, 6), leafMat);
        stem.position.set(px, 1.35, pz);
        b.add(stem);
        const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.52, 10, 8), leafMat);
        canopy.position.set(px, 1.68, pz);
        b.add(canopy);
      }
      // Overhead LED grow-light bar
      const lampBar = new THREE.Mesh(
        new THREE.BoxGeometry(6.6, 0.12, 0.25),
        new THREE.MeshStandardMaterial({ color: 0xf0abfc, emissive: 0xd946ef, emissiveIntensity: 0.7 }),
      );
      lampBar.position.set(0, 2.85, pz);
      b.add(lampBar);
    }

    const domeGlass = new THREE.Mesh(
      new THREE.SphereGeometry(5.45, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      greenGlassMat,
    );
    domeGlass.position.y = 0.9;
    domeGlass.renderOrder = 3;
    b.add(domeGlass);

    const growLight = new THREE.PointLight(0x86efac, 1.35, 22);
    growLight.position.set(0, 3.8, 0);
    b.add(growLight);
    exteriorLights.push(growLight);
    greenhouseGrowLights.push(growLight);

    addInteractiveAirlock(b, 16, 26, -5.5, 0, -Math.PI / 2);
    group.add(b);
    buildings.push({
      id: 'greenhouse',
      name: 'Lunar Greenhouse',
      x: 16,
      z: 26,
      purpose: 'Hydroponic Crops & Natural Oxygen Production',
      interiorSummary: 'Three hydroponic rows of leafy greens nourished by purple-spectrum LED grow lamps.',
    });
    colliders.push({ x: 16, z: 26, radius: 5.9 });
  }

  // 9. Rover Garage (0, 26) — Open drive-through gantry with charging pad & tool rack
  {
    const b = new THREE.Group();
    b.position.set(0, groundHeightAt(0, 26), 26);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.35, 10.6), darkTrim);
    pad.position.y = 0.175;
    pad.receiveShadow = true;
    b.add(pad);

    for (const ax of [-4.4, 4.4]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(1.1, 4.4, 9.8), regolithShield);
      wall.position.set(ax, 2.2, 0);
      wall.castShadow = true;
      b.add(wall);
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.75, 10.0), titaniumWhite);
    roof.position.set(0, 4.5, 0);
    roof.castShadow = true;
    b.add(roof);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(10.1, 0.32, 0.45), accentAmber);
    stripe.position.set(0, 4.5, -4.9);
    b.add(stripe);

    const toolCabinet = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, 2.8), accentBlue);
    toolCabinet.position.set(-3.3, 1.2, 0);
    b.add(toolCabinet);

    const garageLight = new THREE.PointLight(0xfde68a, 1.3, 24);
    garageLight.position.set(0, 3.9, 0);
    b.add(garageLight);
    exteriorLights.push(garageLight);

    group.add(b);
    buildings.push({
      id: 'rover_garage',
      name: 'Rover Garage',
      x: 0,
      z: 26,
      purpose: 'Lunar EV Charging, Maintenance & Tool Storage',
      interiorSummary: 'Drive-through service hangar with inductive charging floor pad and spare wheel racks.',
    });
    colliders.push({ x: -4.4, z: 26, radius: 1.55 });
    colliders.push({ x: 4.4, z: 26, radius: 1.55 });
  }

  // 10. Communication Tower (34, -36) — 4-Leg Lattice Mast + Rotating Deep-Space Dish
  {
    const b = new THREE.Group();
    b.position.set(34, groundHeightAt(34, -36), -36);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.9, 3.6, 1.6, 8), hullSilver);
    plinth.position.y = 0.8;
    b.add(plinth);

    // 4 angled lattice struts
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 11.4, 8), darkTrim);
      strut.position.set(Math.cos(a) * 0.9, 6.8, Math.sin(a) * 0.9);
      strut.castShadow = true;
      b.add(strut);
    }

    const dishPivot = new THREE.Group();
    dishPivot.position.set(0, 12.6, 0);
    const dish = new THREE.Mesh(
      new THREE.ConeGeometry(2.8, 1.15, 22, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.35, side: THREE.DoubleSide }),
    );
    dish.rotation.x = Math.PI * 0.65;
    dishPivot.add(dish);
    b.add(dishPivot);

    group.add(b);
    buildings.push({
      id: 'comm_tower',
      name: 'Communication Tower',
      x: 34,
      z: -36,
      purpose: 'High-Gain Deep-Space Telemetry Relay',
      interiorSummary: 'Lattice antenna array continuously locking radio beams onto Earth Mission Control.',
      rotatingDish: dishPivot,
    });
    colliders.push({ x: 34, z: -36, radius: 3.5 });
  }

  // 11. Radiation Shelter (-38, -24)
  {
    const b = new THREE.Group();
    b.position.set(-38, groundHeightAt(-38, -24), -24);
    const berm = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 6.5, 3.8, 12), regolithShield);
    berm.position.y = 1.9;
    berm.castShadow = true;
    b.add(berm);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4.0, 0.75, 12), darkTrim);
    cap.position.y = 4.0;
    b.add(cap);
    addInteractiveAirlock(b, -38, -24, 4.7, 0, Math.PI / 2);
    group.add(b);
    buildings.push({
      id: 'radiation_shelter',
      name: 'Radiation Shelter',
      x: -38,
      z: -24,
      purpose: 'Solar Storm Regolith-Shielded Bunker',
      interiorSummary: 'Thick compacted lunar soil armor protects the crew during intense solar flares.',
    });
    colliders.push({ x: -38, z: -24, radius: 5.9 });
  }

  // 12. Sample Storage Laboratory (-38, 6)
  {
    const b = new THREE.Group();
    b.position.set(-38, groundHeightAt(-38, 6), 6);
    const vault = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.8, 4.3, 16), hullSilver);
    vault.position.y = 2.15;
    vault.castShadow = true;
    b.add(vault);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.3, 1.15), accentBlue);
      fin.position.set(Math.cos(a) * 3.8, 2.2, Math.sin(a) * 3.8);
      fin.rotation.y = -a;
      b.add(fin);
    }
    group.add(b);
    buildings.push({
      id: 'sample_storage',
      name: 'Sample Storage Lab',
      x: -38,
      z: 6,
      purpose: 'Vacuum-Sealed Lunar Rock & Ice Archive',
      interiorSummary: 'Cryogenic specimen vaults preserving pristine meteorite and lunar ice cores.',
    });
    colliders.push({ x: -38, z: 6, radius: 4.3 });
  }

  // 13. Crew Living Quarters (-12, 34) — Visible bunk & lounge interior
  {
    const b = new THREE.Group();
    b.position.set(-12, groundHeightAt(-12, 34), 34);
    const podA = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 6.8, 16), titaniumWhite);
    podA.rotation.z = Math.PI / 2;
    podA.position.set(0, 2.25, -1.7);
    podA.castShadow = true;
    b.add(podA);
    const podB = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 6.8, 16), titaniumWhite);
    podB.rotation.z = Math.PI / 2;
    podB.position.set(0, 2.25, 2.3);
    podB.castShadow = true;
    b.add(podB);
    const porthole = new THREE.Mesh(new THREE.CircleGeometry(0.65, 16), clearViewportMat);
    porthole.position.set(3.42, 2.25, 2.3);
    porthole.rotation.y = Math.PI / 2;
    b.add(porthole);
    addInteractiveAirlock(b, -12, 34, 0, -5.0, Math.PI);
    group.add(b);
    buildings.push({
      id: 'crew_quarters',
      name: 'Crew Living Quarters',
      x: -12,
      z: 34,
      purpose: 'Teenage Astronaut Sleep Pods & Crew Lounge',
      interiorSummary: 'Cozy twin pressurized pods with sleeping berths, dining table, and Earth-view portholes.',
    });
    colliders.push({ x: -12, z: 34, radius: 5.1 });
  }

  // 14. Remote Research Outpost (225, 25)
  const outpostBeaconMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.2,
  });
  {
    const b = new THREE.Group();
    b.position.set(225, groundHeightAt(225, 25), 25);
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(3.9, 4.3, 3.6, 8), titaniumWhite);
    pod.position.y = 1.8;
    pod.castShadow = true;
    b.add(pod);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3.6, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), hullSilver);
    dome.position.y = 3.55;
    b.add(dome);
    const solarWing = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.14, 2.6), solarCellMat);
    solarWing.position.set(0, 2.9, -5.4);
    solarWing.rotation.x = 0.35;
    b.add(solarWing);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), outpostBeaconMat);
    beacon.position.y = 7.35;
    b.add(beacon);
    addInteractiveAirlock(b, 225, 25, -4.1, 0, -Math.PI / 2);
    group.add(b);
    buildings.push({
      id: 'remote_outpost',
      name: 'Remote Research Outpost',
      x: 225,
      z: 25,
      purpose: 'Far-Side Autonomous Deep-Space Science Station',
      interiorSummary: 'Automated weather, radiation, and seismic station powered by fold-out solar wings.',
    });
    colliders.push({ x: 225, z: 25, radius: 4.9 });
  }

  // 15. Lunar Research Laboratory (10, -40) — Low-gravity physics & lunar dust testing lab
  {
    const b = new THREE.Group();
    b.position.set(10, groundHeightAt(10, -40), -40);
    const baseHex = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 5.2, 1.1, 6), hullSilver);
    baseHex.position.y = 0.55;
    baseHex.receiveShadow = true;
    b.add(baseHex);

    const labBody = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.6, 2.7, 6), titaniumWhite);
    labBody.position.y = 2.4;
    labBody.castShadow = true;
    b.add(labBody);

    const glassStrip = new THREE.Mesh(new THREE.CylinderGeometry(4.48, 4.48, 1.1, 6, 1, true), clearViewportMat);
    glassStrip.position.y = 2.55;
    b.add(glassStrip);

    const interiorDesk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 1.4), darkTrim);
    interiorDesk.position.set(0, 1.5, 0);
    b.add(interiorDesk);
    const labMon = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.78, 0.1), mcScreenMat);
    labMon.position.set(0, 2.35, -0.4);
    b.add(labMon);

    const roofCap = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 4.5, 0.85, 6), accentBlue);
    roofCap.position.y = 4.15;
    roofCap.castShadow = true;
    b.add(roofCap);

    // Roof radiator cooling fins
    for (const fx of [-1.2, 1.2]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.85, 3.2), goldFoil);
      fin.position.set(fx, 4.85, 0);
      b.add(fin);
    }

    addInteractiveAirlock(b, 10, -40, 0, 4.7, 0);
    group.add(b);
    buildings.push({
      id: 'lunar_research_lab',
      name: 'Lunar Research Laboratory',
      x: 10,
      z: -40,
      purpose: 'Low-Gravity Science, Dust Studies & Materials Testing',
      interiorSummary: 'Equipped with vacuum dust test chambers, centrifuge benches, and telemetry monitors.',
    });
    colliders.push({ x: 10, z: -40, radius: 5.4 });
  }

  // 16. Lunar Observatory (-48, 32) — 15th Settlement Building: Rotating Geodesic Dome & Optical Telescope
  let observatoryDomePivot: THREE.Object3D = new THREE.Group();
  {
    const b = new THREE.Group();
    b.position.set(-48, groundHeightAt(-48, 32), 32);

    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.8, 1.2, 12), darkTrim);
    plinth.position.y = 0.6;
    plinth.receiveShadow = true;
    b.add(plinth);

    const drum = new THREE.Mesh(new THREE.CylinderGeometry(4.7, 4.9, 2.5, 16), titaniumWhite);
    drum.position.y = 2.45;
    drum.castShadow = true;
    b.add(drum);

    const band = new THREE.Mesh(new THREE.CylinderGeometry(4.78, 4.78, 0.35, 16), accentBlue);
    band.position.y = 3.2;
    b.add(band);

    // Rotating dome + viewing shutter slit + brass/titanium telescope pointed skyward toward Earth
    const domePivot = new THREE.Group();
    domePivot.position.set(0, 3.7, 0);
    domePivot.rotation.y = Math.atan2(-340 - -48, -620 - 32);

    const domeShell = new THREE.Mesh(
      new THREE.SphereGeometry(4.55, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
      hullSilver,
    );
    domeShell.castShadow = true;
    domePivot.add(domeShell);

    const slitOpening = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 2.9, 2.2),
      darkTrim,
    );
    slitOpening.position.set(0, 2.2, 2.8);
    slitOpening.rotation.x = 0.52;
    domePivot.add(slitOpening);

    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.54, 4.6, 14), titaniumWhite);
    scopeTube.position.set(0, 2.35, 2.85);
    scopeTube.rotation.x = Math.PI * 0.32;
    scopeTube.castShadow = true;
    domePivot.add(scopeTube);

    const scopeLensRing = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.25, 14), goldFoil);
    scopeLensRing.position.set(0, 3.45, 4.6);
    scopeLensRing.rotation.x = Math.PI * 0.32;
    domePivot.add(scopeLensRing);

    b.add(domePivot);
    observatoryDomePivot = domePivot;

    // Exterior telescope sun-power panel & telemetry display
    const obsSolar = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.14, 1.8), solarCellMat);
    obsSolar.position.set(-5.8, 2.2, 0);
    obsSolar.rotation.x = 0.4;
    b.add(obsSolar);
    const obsPost = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 2.1, 8), darkTrim);
    obsPost.position.set(-5.8, 1.05, 0);
    b.add(obsPost);

    addInteractiveAirlock(b, -48, 32, 4.9, 0, Math.PI / 2);
    const obsLight = new THREE.PointLight(0x93c5fd, 1.25, 22);
    obsLight.position.set(0, 4.5, 0);
    b.add(obsLight);
    exteriorLights.push(obsLight);

    group.add(b);
    buildings.push({
      id: 'observatory',
      name: 'Lunar Observatory',
      x: -48,
      z: 32,
      purpose: 'Astronomical Telescope Studying Earth, the Sun & Deep Space',
      interiorSummary: 'Houses a precision optical telescope beneath a rotating dome slit with zero lunar cloud cover.',
    });
    colliders.push({ x: -48, z: 32, radius: 5.8 });
  }

  // Functional Rover Charging Station #1: Inside Rover Garage (0, 26)
  {
    const gPad = new THREE.Group();
    gPad.position.set(0, groundHeightAt(0, 26) + 0.38, 26);

    const padRingMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.78,
    });
    const padRing = new THREE.Mesh(new THREE.RingGeometry(2.05, 2.55, 32), padRingMat);
    padRing.rotation.x = -Math.PI / 2;
    gPad.add(padRing);

    const chargerPylon = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.1, 0.75), hullSilver);
    chargerPylon.position.set(3.2, 0.9, -2.5);
    gPad.add(chargerPylon);

    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.0,
    });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), beaconMat);
    led.position.set(3.2, 2.15, -2.5);
    gPad.add(led);
    group.add(gPad);

    chargingStations.push({
      id: 'charge_garage',
      name: 'Rover Garage Charger',
      x: 0,
      z: 26,
      radius: 6.2,
      padRingMat,
      beaconMat,
    });
  }

  // Functional Rover Charging Station #2: Outdoor Solar Charging Bay (40, -6)
  {
    const bay = new THREE.Group();
    bay.position.set(40, groundHeightAt(40, -6), -6);

    const bayPad = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.28, 7.6), darkTrim);
    bayPad.position.y = 0.14;
    bayPad.receiveShadow = true;
    bay.add(bayPad);

    const padRingMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.82,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.65, 32), padRingMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.31;
    bay.add(ring);

    // Charging Gantry Pylon & Solar Canopy Wing on East Edge
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.2, 1.1), titaniumWhite);
    pylon.position.set(3.6, 1.6, 0);
    pylon.castShadow = true;
    bay.add(pylon);

    const pylonScreen = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.72, 0.85), utilScreenMat);
    pylonScreen.position.set(3.12, 1.85, 0);
    bay.add(pylonScreen);

    const beaconMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.0,
    });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), beaconMat);
    beacon.position.set(3.6, 3.45, 0);
    bay.add(beacon);

    const solarRoof = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.14, 5.2), solarCellMat);
    solarRoof.position.set(3.6, 3.35, 0);
    solarRoof.rotation.z = 0.24;
    bay.add(solarRoof);
    solarPanels.push(solarRoof);

    const bayLight = new THREE.PointLight(0x38bdf8, 1.15, 18);
    bayLight.position.set(2.5, 3.2, 0);
    bay.add(bayLight);
    exteriorLights.push(bayLight);

    group.add(bay);
    colliders.push({ x: 43.6, z: -6, radius: 1.35 });
    chargingStations.push({
      id: 'charge_solar_bay',
      name: 'Solar Rover Charging Bay',
      x: 40,
      z: -6,
      radius: 6.2,
      padRingMat,
      beaconMat,
    });
  }

  // Organized Connecting Surface Pathways & Rover Parking Lanes (non-blocking flush slabs)
  const addWalkway = (x1: number, z1: number, x2: number, z2: number, width = 2.2) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    if (len < 1) return;
    const road = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.08, len),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.88, metalness: 0.12 }),
    );
    road.position.set((x1 + x2) / 2, 0.04, (z1 + z2) / 2);
    road.rotation.y = Math.atan2(dx, dz);
    road.receiveShadow = true;
    group.add(road);
  };

  addWalkway(0, -10, 0, 20, 3.0); // Central spine: Mission Control <-> Rover Garage
  addWalkway(0, 20, -12, 30, 2.2); // Garage <-> Crew Quarters
  addWalkway(0, 20, 12, 24, 2.2); // Garage <-> Greenhouse
  addWalkway(0, 10, 36, -6, 2.8); // Rover lane <-> Solar Charging Bay
  addWalkway(-24, 18, -42, 30, 2.2); // Geo Lab <-> Observatory
  addWalkway(-24, 6, -45, -2, 2.2); // Geo Lab <-> Launch Pad
  addWalkway(0, -24, 10, -35, 2.2); // Mission Control <-> Lunar Research Lab
  addWalkway(14, -36, 31, -34, 2.0); // Research Lab <-> Comm Tower

  // Base Perimeter Path Bollard Lights
  const bollardCoords: Array<[number, number]> = [
    [-4, 4], [4, 4], [-4, 15], [4, 15],
    [16, 4], [30, -3], [-32, 20], [-14, -22], [18, -28],
  ];
  const bollardCapMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.9,
  });
  for (const [bx, bz] of bollardCoords) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.95, 8), darkTrim);
    post.position.set(bx, groundHeightAt(bx, bz) + 0.47, bz);
    group.add(post);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), bollardCapMat);
    cap.position.set(bx, groundHeightAt(bx, bz) + 1.0, bz);
    group.add(cap);
  }

  // Exterior Science Equipment Mast near Lunar Research Lab (20, -44)
  {
    const equip = new THREE.Group();
    equip.position.set(20, groundHeightAt(20, -44), -44);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 1.4), hullSilver);
    base.position.y = 0.275;
    equip.add(base);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.8, 8), darkTrim);
    mast.position.y = 1.65;
    equip.add(mast);
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), goldFoil);
    dish.position.set(0, 3.05, 0);
    equip.add(dish);
    group.add(equip);
    colliders.push({ x: 20, z: -44, radius: 1.25 });
  }

  // Pressurized Connecting Tunnels
  addTunnel(0, -18, -22, -12);
  addTunnel(-22, -12, -24, 12);
  addTunnel(0, -18, 24, -14);
  addTunnel(24, -14, 26, 8);
  addTunnel(-24, 12, -38, 6);
  addTunnel(-22, -12, -18, -32);
  addTunnel(-22, -12, -38, -24);
  addTunnel(0, -18, 10, -40);

  // Departure Launch Pad (-52, -2)
  const padGroup = new THREE.Group();
  padGroup.position.set(-52, groundHeightAt(-52, -2), -2);
  const padSlab = new THREE.Mesh(new THREE.CylinderGeometry(7.4, 8.2, 0.48, 16), darkTrim);
  padSlab.position.y = 0.24;
  padSlab.receiveShadow = true;
  padGroup.add(padSlab);
  const padRing = new THREE.Mesh(
    new THREE.RingGeometry(5.2, 6.0, 24),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide }),
  );
  padRing.rotation.x = -Math.PI / 2;
  padRing.position.y = 0.5;
  padGroup.add(padRing);
  group.add(padGroup);

  return {
    group,
    buildings,
    colliders,
    exteriorLights,
    airlockDoors,
    solarPanels,
    greenhouseGrowLights,
    outpostBeaconMat,
    chargingStations,
    observatoryDomePivot,
  };
}
