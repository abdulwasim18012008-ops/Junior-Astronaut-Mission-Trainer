import * as THREE from 'three';
import { BASE_BUILDINGS, INTERACTIVE_NODES, LANDING_PAD_POS } from './adventureStory';
import { BUILDING_ZONES, BuildingZoneSpec } from './colonyLayout';
import { OPTIONAL_TASKS } from './learningRecaps';
import { groundHeightAt } from './marsTerrain';
import { ProceduralTextureSet } from './proceduralTextures';
import { BuildingId, InteractiveNodeId, WorldVisualState } from './types';

export interface BaseWorldHandles {
  group: THREE.Group;
  nodeProxies: THREE.Mesh[];
  update: (
    elapsed: number,
    dt: number,
    state: WorldVisualState,
    playerPos: THREE.Vector3,
    npcPositions?: THREE.Vector3[],
    onDoorToggle?: (id: BuildingId, isOpen: boolean) => void,
  ) => void;
  dispose: () => void;
}

interface DoorRecord {
  id: BuildingId;
  doorX: number;
  doorZ: number;
  leftLeaf: THREE.Mesh;
  rightLeaf: THREE.Mesh;
  axis: 'x' | 'z';
  openAmount: number;
  wasOpen: boolean;
}

interface RoofRecord {
  id: BuildingId;
  roofGroup: THREE.Group;
  baseY: number;
}

export function createBaseWorld(
  textures: ProceduralTextureSet,
  isSoftwareGl: boolean,
): BaseWorldHandles {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const nodeProxies: THREE.Mesh[] = [];
  const doors: DoorRecord[] = [];
  const roofs: RoofRecord[] = [];

  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // Shared Materials
  const hullMat = track(
    new THREE.MeshStandardMaterial({
      color: '#f1f5f9',
      map: textures.hullPanel,
      roughness: 0.56,
      metalness: 0.14,
    }),
  );
  const interiorWallMat = track(
    new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.65, metalness: 0.1 }),
  );
  const deckFloorMat = track(
    new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.72, metalness: 0.22 }),
  );
  const baseDarkMat = track(
    new THREE.MeshStandardMaterial({ color: '#293245', roughness: 0.72, metalness: 0.3 }),
  );
  const metalMat = track(
    new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.28, metalness: 0.85 }),
  );
  const orangeMat = track(
    new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.44, metalness: 0.2 }),
  );
  const skyBlueMat = track(
    new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.38, metalness: 0.25 }),
  );
  const deepBlueMat = track(
    new THREE.MeshStandardMaterial({ color: '#2563eb', roughness: 0.4, metalness: 0.28 }),
  );
  const emeraldMat = track(
    new THREE.MeshStandardMaterial({ color: '#10b981', roughness: 0.5, metalness: 0.12 }),
  );
  const goldFoilMat = track(
    new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.22, metalness: 0.92 }),
  );
  const medRedMat = track(
    new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.42, metalness: 0.18 }),
  );
  const regolithBlockMat = track(
    new THREE.MeshStandardMaterial({ color: '#9a3412', roughness: 0.92, metalness: 0.06 }),
  );
  const solarMat = track(
    new THREE.MeshStandardMaterial({ map: textures.solarCell, roughness: 0.2, metalness: 0.78 }),
  );
  const dustCoatMat = track(
    new THREE.MeshStandardMaterial({
      color: '#b4532a',
      roughness: 0.96,
      metalness: 0.02,
      transparent: true,
      opacity: 0.9,
    }),
  );
  const hazardMat = track(
    new THREE.MeshStandardMaterial({ map: textures.hazardStripe, roughness: 0.6 }),
  );
  const doorLeafMat = track(
    new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.35,
      metalness: 0.65,
    }),
  );
  const domeGlassMat = track(
    new THREE.MeshPhysicalMaterial({
      color: '#bae6fd',
      roughness: 0.12,
      metalness: 0.04,
      transmission: isSoftwareGl ? 0 : 0.72,
      transparent: true,
      opacity: isSoftwareGl ? 0.36 : 0.84,
      ior: 1.48,
      depthWrite: false,
      clearcoat: 1.0,
    }),
  );
  const ghGlassMat = track(
    new THREE.MeshPhysicalMaterial({
      color: '#d1fae5',
      roughness: 0.14,
      metalness: 0.04,
      transmission: isSoftwareGl ? 0 : 0.68,
      transparent: true,
      opacity: isSoftwareGl ? 0.34 : 0.82,
      ior: 1.46,
      depthWrite: false,
    }),
  );
  const windowGlowMat = track(
    new THREE.MeshStandardMaterial({
      color: '#0f172a',
      emissive: '#38bdf8',
      emissiveIntensity: 0.65,
      roughness: 0.15,
      metalness: 0.8,
    }),
  );
  const homeLampMat = track(
    new THREE.MeshStandardMaterial({
      color: '#fef08a',
      emissive: '#fbbf24',
      emissiveIntensity: 1.05,
    }),
  );
  const o2AlarmLampMat = track(
    new THREE.MeshStandardMaterial({
      color: '#475569',
      emissive: '#ef4444',
      emissiveIntensity: 0,
      roughness: 0.3,
    }),
  );
  const growLightMat = track(
    new THREE.MeshStandardMaterial({
      color: '#f472b6',
      emissive: '#ec4899',
      emissiveIntensity: 1.3,
      roughness: 0.3,
    }),
  );
  const tomatoMat = track(
    new THREE.MeshStandardMaterial({
      color: '#ef4444',
      emissive: '#991b1b',
      emissiveIntensity: 0.2,
      roughness: 0.42,
    }),
  );
  const foliageMat = track(
    new THREE.MeshStandardMaterial({ color: '#22c55e', roughness: 0.75, metalness: 0.02 }),
  );
  const soilMat = track(
    new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.95, metalness: 0.02 }),
  );
  const walkwayMat = track(
    new THREE.MeshStandardMaterial({
      color: '#475569',
      roughness: 0.88,
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  const contactShadowMat = track(
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      opacity: 0.46,
      depthWrite: false,
    }),
  );

  const attachWallPlaque = (
    parent: THREE.Group,
    id: BuildingId,
    pos: [number, number, number],
    rotY = 0,
  ) => {
    const info = BASE_BUILDINGS[id];
    const tex = textures.createSignTexture(info.name, info.shortDesc, info.accentHex);
    const mat = track(new THREE.MeshBasicMaterial({ map: tex }));
    const frame = new THREE.Mesh(track(new THREE.BoxGeometry(2.0, 0.68, 0.08)), baseDarkMat);
    frame.position.set(pos[0], pos[1], pos[2]);
    frame.rotation.y = rotY;
    const face = new THREE.Mesh(track(new THREE.PlaneGeometry(1.88, 0.58)), mat);
    face.position.z = 0.045;
    frame.add(face);
    parent.add(frame);
  };

  // Reusable Walkable Room Shell Builder (floor + walls with openable airlock door + cutaway roof)
  const buildWalkableRoom = (
    zone: BuildingZoneSpec,
    wallHeight: number,
    accentMat: THREE.Material,
    wallMat: THREE.Material = hullMat,
    viewports?: { southViewport?: boolean; westViewport?: boolean },
  ) => {
    const bGroup = new THREE.Group();
    bGroup.position.set(zone.x, groundHeightAt(zone.x, zone.z), zone.z);
    bGroup.name = zone.id;

    const shadow = new THREE.Mesh(
      track(new THREE.PlaneGeometry(zone.hx * 2.5, zone.hz * 2.5)),
      contactShadowMat,
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.015;
    bGroup.add(shadow);

    // Flush walkable floor pad
    const floorMesh = new THREE.Mesh(
      track(new THREE.BoxGeometry(zone.hx * 2 + 0.35, 0.16, zone.hz * 2 + 0.35)),
      deckFloorMat,
    );
    floorMesh.position.y = 0.0; // top surface at y = 0.08
    floorMesh.receiveShadow = true;
    bGroup.add(floorMesh);

    const hw = zone.doorWidth * 0.5;
    const wt = zone.wallThick;

    const addWallSegment = (
      cx: number,
      cz: number,
      sx: number,
      sz: number,
      yOffset = 0,
      segHeight = wallHeight,
      withTrim = true,
    ) => {
      if (sx <= 0.05 || sz <= 0.05 || segHeight <= 0.05) return;
      const wall = new THREE.Mesh(track(new THREE.BoxGeometry(sx, segHeight, sz)), wallMat);
      wall.position.set(cx, 0.08 + yOffset + segHeight * 0.5, cz);
      wall.castShadow = true;
      wall.receiveShadow = true;
      bGroup.add(wall);

      if (withTrim) {
        const trim = new THREE.Mesh(
          track(new THREE.BoxGeometry(sx + 0.04, 0.18, sz + 0.04)),
          accentMat,
        );
        trim.position.set(cx, 0.08 + wallHeight - 0.1, cz);
        bGroup.add(trim);
      }
    };

    const addViewportWall = (axis: 'x' | 'z', fixedCoord: number, halfSpan: number) => {
      const sillH = 0.82;
      const winH = Math.max(0.6, wallHeight - 1.28);
      const lintelH = Math.max(0.25, wallHeight - sillH - winH);
      const pierSpan = 1.05;
      const openSpan = Math.max(1.2, halfSpan * 2 - pierSpan * 2);

      if (axis === 'x') {
        // Wall spans along X at Z = fixedCoord
        addWallSegment(0, fixedCoord, halfSpan * 2, wt, 0, sillH, false);
        addWallSegment(0, fixedCoord, halfSpan * 2, wt, sillH + winH, lintelH, true);
        addWallSegment(-halfSpan + pierSpan * 0.5, fixedCoord, pierSpan, wt, sillH, winH, false);
        addWallSegment(halfSpan - pierSpan * 0.5, fixedCoord, pierSpan, wt, sillH, winH, false);

        const glass = new THREE.Mesh(track(new THREE.BoxGeometry(openSpan, winH, 0.06)), domeGlassMat);
        glass.position.set(0, 0.08 + sillH + winH * 0.5, fixedCoord);
        glass.renderOrder = 3;
        bGroup.add(glass);

        const mullion = new THREE.Mesh(track(new THREE.BoxGeometry(0.08, winH, wt + 0.04)), baseDarkMat);
        mullion.position.set(0, 0.08 + sillH + winH * 0.5, fixedCoord);
        bGroup.add(mullion);
      } else {
        // Wall spans along Z at X = fixedCoord
        addWallSegment(fixedCoord, 0, wt, halfSpan * 2, 0, sillH, false);
        addWallSegment(fixedCoord, 0, wt, halfSpan * 2, sillH + winH, lintelH, true);
        addWallSegment(fixedCoord, -halfSpan + pierSpan * 0.5, wt, pierSpan, sillH, winH, false);
        addWallSegment(fixedCoord, halfSpan - pierSpan * 0.5, wt, pierSpan, sillH, winH, false);

        const glass = new THREE.Mesh(track(new THREE.BoxGeometry(0.06, winH, openSpan)), domeGlassMat);
        glass.position.set(fixedCoord, 0.08 + sillH + winH * 0.5, 0);
        glass.renderOrder = 3;
        bGroup.add(glass);

        const mullion = new THREE.Mesh(track(new THREE.BoxGeometry(wt + 0.04, winH, 0.08)), baseDarkMat);
        mullion.position.set(fixedCoord, 0.08 + sillH + winH * 0.5, 0);
        bGroup.add(mullion);
      }
    };

    const localDoorX = zone.doorX - zone.x;
    const localDoorZ = zone.doorZ - zone.z;

    // North wall
    if (zone.doorFacing === 'north') {
      const leftW = localDoorX - hw - -zone.hx;
      addWallSegment(-zone.hx + leftW * 0.5, -zone.hz, leftW, wt);
      const rightW = zone.hx - (localDoorX + hw);
      addWallSegment(zone.hx - rightW * 0.5, -zone.hz, rightW, wt);
    } else {
      addWallSegment(0, -zone.hz, zone.hx * 2, wt);
    }

    // South wall
    if (zone.doorFacing === 'south') {
      const leftW = localDoorX - hw - -zone.hx;
      addWallSegment(-zone.hx + leftW * 0.5, zone.hz, leftW, wt);
      const rightW = zone.hx - (localDoorX + hw);
      addWallSegment(zone.hx - rightW * 0.5, zone.hz, rightW, wt);
    } else if (viewports?.southViewport) {
      addViewportWall('x', zone.hz, zone.hx);
    } else {
      addWallSegment(0, zone.hz, zone.hx * 2, wt);
    }

    // West wall
    if (zone.doorFacing === 'west') {
      const topD = localDoorZ - hw - -zone.hz;
      addWallSegment(-zone.hx, -zone.hz + topD * 0.5, wt, topD);
      const botD = zone.hz - (localDoorZ + hw);
      addWallSegment(-zone.hx, zone.hz - botD * 0.5, wt, botD);
    } else if (viewports?.westViewport) {
      addViewportWall('z', -zone.hx, zone.hz);
    } else {
      addWallSegment(-zone.hx, 0, wt, zone.hz * 2);
    }

    // East wall
    if (zone.doorFacing === 'east') {
      const topD = localDoorZ - hw - -zone.hz;
      addWallSegment(zone.hx, -zone.hz + topD * 0.5, wt, topD);
      const botD = zone.hz - (localDoorZ + hw);
      addWallSegment(zone.hx, zone.hz - botD * 0.5, wt, botD);
    } else {
      addWallSegment(zone.hx, 0, wt, zone.hz * 2);
    }

    // Airlock Frame + Sliding Double Doors
    const doorH = Math.min(wallHeight - 0.15, 2.05);
    const axis: 'x' | 'z' = zone.doorFacing === 'north' || zone.doorFacing === 'south' ? 'x' : 'z';

    const header = new THREE.Mesh(
      track(
        new THREE.BoxGeometry(
          axis === 'x' ? zone.doorWidth + 0.3 : wt + 0.14,
          0.3,
          axis === 'z' ? zone.doorWidth + 0.3 : wt + 0.14,
        ),
      ),
      accentMat,
    );
    header.position.set(localDoorX, 0.08 + doorH + 0.15, localDoorZ);
    bGroup.add(header);

    const leafW = zone.doorWidth * 0.49;
    const leafGeo = track(
      new THREE.BoxGeometry(
        axis === 'x' ? leafW : 0.12,
        doorH,
        axis === 'z' ? leafW : 0.12,
      ),
    );
    const leftLeaf = new THREE.Mesh(leafGeo, doorLeafMat);
    const rightLeaf = new THREE.Mesh(leafGeo, doorLeafMat);

    if (axis === 'x') {
      leftLeaf.position.set(localDoorX - leafW * 0.5, 0.08 + doorH * 0.5, localDoorZ);
      rightLeaf.position.set(localDoorX + leafW * 0.5, 0.08 + doorH * 0.5, localDoorZ);
    } else {
      leftLeaf.position.set(localDoorX, 0.08 + doorH * 0.5, localDoorZ - leafW * 0.5);
      rightLeaf.position.set(localDoorX, 0.08 + doorH * 0.5, localDoorZ + leafW * 0.5);
    }
    leftLeaf.userData.baseOffset = axis === 'x' ? leftLeaf.position.x : leftLeaf.position.z;
    rightLeaf.userData.baseOffset = axis === 'x' ? rightLeaf.position.x : rightLeaf.position.z;
    bGroup.add(leftLeaf, rightLeaf);

    doors.push({
      id: zone.id,
      doorX: zone.doorX,
      doorZ: zone.doorZ,
      leftLeaf,
      rightLeaf,
      axis,
      openAmount: 0,
      wasOpen: false,
    });

    const roofGroup = new THREE.Group();
    roofGroup.position.y = 0.08 + wallHeight;
    bGroup.add(roofGroup);
    roofs.push({ id: zone.id, roofGroup, baseY: 0.08 + wallHeight });

    group.add(bGroup);
    return { bGroup, roofGroup };
  };

  // =========================================================================
  // 1. CREW HOME (Walk-in Living Dome + Interior Bunks, Table & O2 Monitor)
  // =========================================================================
  const homeZone = BUILDING_ZONES.crew_home;
  const { bGroup: home, roofGroup: homeRoof } = buildWalkableRoom(homeZone, 1.5, orangeMat);

  // Cozy central briefing table + glowing lamp
  const homeTable = new THREE.Mesh(track(new THREE.BoxGeometry(1.7, 0.68, 1.3)), interiorWallMat);
  homeTable.position.set(0, 0.42, 0);
  homeTable.castShadow = true;
  home.add(homeTable);

  const homeLamp = new THREE.Mesh(track(new THREE.SphereGeometry(0.32, 12, 10)), homeLampMat);
  homeLamp.position.set(0, 1.0, 0);
  home.add(homeLamp);

  // 4 bunk beds matching colliders
  [
    [-2.8, -2.85, 0],
    [2.8, -2.85, 0],
    [-2.8, 2.65, Math.PI],
    [2.8, 2.65, Math.PI],
  ].forEach(([bx, bz, ry]) => {
    const bunk = new THREE.Mesh(track(new THREE.BoxGeometry(1.3, 0.62, 0.95)), hullMat);
    bunk.position.set(bx, 0.39, bz);
    bunk.rotation.y = ry;
    bunk.castShadow = true;
    home.add(bunk);

    const pillow = new THREE.Mesh(track(new THREE.BoxGeometry(0.38, 0.14, 0.55)), orangeMat);
    pillow.position.set(bx - 0.35, 0.74, bz);
    home.add(pillow);
  });

  // Interior Crew Home Air Monitor Terminal (Mission 1 Step 1!)
  const monitorStand = new THREE.Mesh(track(new THREE.BoxGeometry(0.75, 1.45, 0.45)), baseDarkMat);
  monitorStand.position.set(2.3, 0.8, 0.6);
  monitorStand.rotation.y = -0.65;
  monitorStand.castShadow = true;
  home.add(monitorStand);

  const monitorScreen = new THREE.Mesh(track(new THREE.BoxGeometry(0.56, 0.4, 0.06)), windowGlowMat);
  monitorScreen.position.set(2.15, 1.2, 0.75);
  monitorScreen.rotation.y = -0.65;
  home.add(monitorScreen);

  const o2Beacon = new THREE.Mesh(track(new THREE.SphereGeometry(0.15, 10, 10)), o2AlarmLampMat);
  o2Beacon.position.set(2.3, 1.64, 0.6);
  home.add(o2Beacon);

  // Mission 9 & 10 Interior Props: Food Pantry Shelf & Wall Thermostat Console
  const pantryUnit = new THREE.Mesh(track(new THREE.BoxGeometry(1.1, 1.35, 0.42)), hullMat);
  pantryUnit.position.set(-1.35, 0.75, -3.95);
  home.add(pantryUnit);
  const pantryAccent = new THREE.Mesh(track(new THREE.BoxGeometry(0.95, 0.25, 0.44)), emeraldMat);
  pantryAccent.position.set(-1.35, 1.05, -3.95);
  home.add(pantryAccent);

  const thermoUnit = new THREE.Mesh(track(new THREE.BoxGeometry(0.68, 1.25, 0.34)), baseDarkMat);
  thermoUnit.position.set(0.65, 0.72, -3.95);
  home.add(thermoUnit);
  const thermoScreen = new THREE.Mesh(track(new THREE.BoxGeometry(0.46, 0.34, 0.06)), windowGlowMat);
  thermoScreen.position.set(0.65, 1.1, -3.76);
  home.add(thermoScreen);

  // Glass dome roof (cutaway when inside!)
  const homeDome = new THREE.Mesh(
    track(new THREE.SphereGeometry(4.45, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2)),
    domeGlassMat,
  );
  homeDome.renderOrder = 2;
  homeRoof.add(homeDome);
  for (let i = 0; i < 4; i++) {
    const rib = new THREE.Mesh(track(new THREE.TorusGeometry(4.48, 0.07, 8, 24, Math.PI)), metalMat);
    rib.rotation.y = (i * Math.PI) / 4;
    homeRoof.add(rib);
  }
  attachWallPlaque(home, 'crew_home', [2.4, 1.15, 4.46], 0);

  // =========================================================================
  // 2. OXYGEN CENTRE (Walk-in Scrubber Bay + Spinning Fan + Filter Crate)
  // =========================================================================
  const o2Zone = BUILDING_ZONES.oxygen_centre;
  const { bGroup: o2, roofGroup: o2Roof } = buildWalkableRoom(o2Zone, 2.35, skyBlueMat);

  // Interior O2 Tanks & Filter Bay Cabinet on west wall
  for (let i = 0; i < 2; i++) {
    const tank = new THREE.Mesh(track(new THREE.CapsuleGeometry(0.42, 1.2, 6, 12)), skyBlueMat);
    tank.position.set(-1.6, 1.15, -0.7 + i * 1.4);
    tank.castShadow = true;
    o2.add(tank);
  }
  const o2Hatch = new THREE.Mesh(track(new THREE.BoxGeometry(0.32, 1.35, 1.15)), hazardMat);
  o2Hatch.position.set(-1.05, 0.9, 0);
  o2.add(o2Hatch);

  // Cutaway Roof + Fan
  const o2RoofSlab = new THREE.Mesh(track(new THREE.BoxGeometry(5.0, 0.22, 4.4)), hullMat);
  o2Roof.add(o2RoofSlab);
  const fanHousing = new THREE.Mesh(track(new THREE.CylinderGeometry(0.9, 0.9, 0.35, 16)), metalMat);
  fanHousing.position.y = 0.26;
  o2Roof.add(fanHousing);

  const o2FanBlades = new THREE.Group();
  o2FanBlades.position.y = 0.48;
  for (let i = 0; i < 3; i++) {
    const blade = new THREE.Mesh(track(new THREE.BoxGeometry(1.4, 0.06, 0.25)), orangeMat);
    blade.rotation.y = (i * Math.PI) / 3;
    o2FanBlades.add(blade);
  }
  o2Roof.add(o2FanBlades);
  attachWallPlaque(o2, 'oxygen_centre', [0, 1.55, 2.26], 0);

  // Exterior Spare Filter Crate
  const filterCrate = new THREE.Group();
  const fcPos = INTERACTIVE_NODES.m1_filter_crate.position;
  filterCrate.position.set(fcPos[0], groundHeightAt(fcPos[0], fcPos[2]), fcPos[2]);
  const fcBox = new THREE.Mesh(track(new THREE.BoxGeometry(1.0, 0.72, 1.0)), skyBlueMat);
  fcBox.position.y = 0.36;
  fcBox.castShadow = true;
  filterCrate.add(fcBox);
  const fcLid = new THREE.Mesh(track(new THREE.BoxGeometry(1.08, 0.14, 1.08)), hullMat);
  fcLid.position.y = 0.78;
  filterCrate.add(fcLid);
  group.add(filterCrate);

  // =========================================================================
  // 3. WATER STATION (Walk-in Filtration Room + Interior Leak, Valve & Puddle!)
  // =========================================================================
  const wZone = BUILDING_ZONES.water_station;
  const { bGroup: water, roofGroup: wRoof } = buildWalkableRoom(wZone, 2.4, deepBlueMat);

  for (let i = 0; i < 2; i++) {
    const silo = new THREE.Mesh(track(new THREE.CylinderGeometry(0.68, 0.68, 2.0, 16)), deepBlueMat);
    silo.position.set(-1.7, 1.08, -0.9 + i * 1.8);
    silo.castShadow = true;
    water.add(silo);
  }

  // Interior Red Shutoff Valve Wheel
  const vp = INTERACTIVE_NODES.m2_shutoff_valve.position;
  const valveGroup = new THREE.Group();
  valveGroup.position.set(vp[0] - wZone.x, 0.08, vp[2] - wZone.z);
  const valvePipe = new THREE.Mesh(track(new THREE.CylinderGeometry(0.14, 0.14, 0.9, 10)), metalMat);
  valvePipe.rotation.z = Math.PI / 2;
  valvePipe.position.y = 0.75;
  valveGroup.add(valvePipe);
  const valveWheel = new THREE.Mesh(track(new THREE.TorusGeometry(0.28, 0.06, 8, 16)), medRedMat);
  valveWheel.position.set(0, 1.15, 0.14);
  valveGroup.add(valveWheel);
  water.add(valveGroup);

  // Interior Leaking Pipe + Spray Particles + Puddle
  const leakPos = INTERACTIVE_NODES.m2_leaking_pipe.position;
  const leakAnchor = new THREE.Group();
  leakAnchor.position.set(leakPos[0] - wZone.x, 0.08, leakPos[2] - wZone.z);
  const exposedPipe = new THREE.Mesh(track(new THREE.CylinderGeometry(0.16, 0.16, 1.6, 12)), metalMat);
  exposedPipe.rotation.z = Math.PI / 2;
  exposedPipe.position.y = 0.75;
  leakAnchor.add(exposedPipe);
  const pipeJoint = new THREE.Mesh(track(new THREE.CylinderGeometry(0.23, 0.23, 0.36, 12)), orangeMat);
  pipeJoint.rotation.z = Math.PI / 2;
  pipeJoint.position.y = 0.75;
  leakAnchor.add(pipeJoint);

  const sprayCount = 95;
  const sprayPos = new Float32Array(sprayCount * 3);
  const sprayGeo = track(new THREE.BufferGeometry());
  sprayGeo.setAttribute('position', new THREE.BufferAttribute(sprayPos, 3));
  const sprayMat = track(
    new THREE.PointsMaterial({
      color: '#bae6fd',
      map: textures.softDustMote,
      size: 0.34,
      transparent: true,
      opacity: 0.9,
      alphaTest: 0.01,
      depthWrite: false,
    }),
  );
  const waterSpray = new THREE.Points(sprayGeo, sprayMat);
  waterSpray.position.set(0, 0.85, 0);
  leakAnchor.add(waterSpray);

  const puddleMat = track(
    new THREE.MeshStandardMaterial({
      color: '#0ea5e9',
      emissive: '#0284c7',
      emissiveIntensity: 0.25,
      roughness: 0.08,
      metalness: 0.4,
      transparent: true,
      opacity: 0.82,
    }),
  );
  const waterPuddle = new THREE.Mesh(track(new THREE.CircleGeometry(1.45, 22)), puddleMat);
  waterPuddle.rotation.x = -Math.PI / 2;
  waterPuddle.position.set(0, 0.03, 0.2);
  waterPuddle.scale.setScalar(0.01);
  leakAnchor.add(waterPuddle);
  water.add(leakAnchor);

  const wRoofSlab = new THREE.Mesh(track(new THREE.BoxGeometry(5.6, 0.22, 5.0)), hullMat);
  wRoof.add(wRoofSlab);

  // Mission 7: Water Filtration Recycler Chamber inside Water Station
  const recyclerBody = new THREE.Mesh(track(new THREE.CylinderGeometry(0.42, 0.46, 1.35, 14)), skyBlueMat);
  recyclerBody.position.set(1.25, 0.76, -1.55);
  recyclerBody.castShadow = true;
  water.add(recyclerBody);
  const recyclerCap = new THREE.Mesh(track(new THREE.CylinderGeometry(0.48, 0.48, 0.16, 14)), metalMat);
  recyclerCap.position.set(1.25, 1.48, -1.55);
  water.add(recyclerCap);

  attachWallPlaque(water, 'water_station', [0, 1.55, 2.56], 0);

  // Exterior Repair Kit Crate
  const repairCrate = new THREE.Group();
  const rkp = INTERACTIVE_NODES.m2_repair_kit.position;
  repairCrate.position.set(rkp[0], groundHeightAt(rkp[0], rkp[2]), rkp[2]);
  const rkBox = new THREE.Mesh(track(new THREE.BoxGeometry(0.95, 0.62, 0.72)), deepBlueMat);
  rkBox.position.y = 0.31;
  rkBox.castShadow = true;
  repairCrate.add(rkBox);
  const rkStripe = new THREE.Mesh(track(new THREE.BoxGeometry(0.98, 0.14, 0.75)), orangeMat);
  rkStripe.position.y = 0.54;
  repairCrate.add(rkStripe);
  group.add(repairCrate);

  // =========================================================================
  // 4. POWER STATION (Walk-in Control Hut + Exterior Dusty Solar Arrays)
  // =========================================================================
  const pZone = BUILDING_ZONES.power_station;
  const { bGroup: powerHut, roofGroup: pRoof } = buildWalkableRoom(pZone, 2.15, goldFoilMat);

  const batBank = new THREE.Mesh(track(new THREE.BoxGeometry(0.9, 1.35, 1.5)), goldFoilMat);
  batBank.position.set(-1.15, 0.76, 0);
  batBank.castShadow = true;
  powerHut.add(batBank);

  const pRoofSlab = new THREE.Mesh(track(new THREE.BoxGeometry(4.0, 0.2, 3.6)), hullMat);
  pRoof.add(pRoofSlab);
  attachWallPlaque(powerHut, 'power_station', [0, 1.45, 1.86], 0);

  // Exterior Solar Wings matching colliders
  const dustOverlayMeshes: THREE.Mesh[] = [];
  const solarCoords: Array<[number, number]> = [
    [-19.1, 9.5],
    [-19.1, 13.5],
    [-15.3, 15.1],
  ];
  solarCoords.forEach(([sx, sz]) => {
    const wing = new THREE.Group();
    wing.position.set(sx, groundHeightAt(sx, sz), sz);
    const mast = new THREE.Mesh(track(new THREE.CylinderGeometry(0.15, 0.22, 1.4, 10)), metalMat);
    mast.position.y = 0.7;
    mast.castShadow = true;
    wing.add(mast);

    const panel = new THREE.Group();
    panel.position.y = 1.45;
    panel.rotation.x = 0.35;
    const frame = new THREE.Mesh(track(new THREE.BoxGeometry(2.8, 0.08, 1.65)), metalMat);
    frame.castShadow = true;
    panel.add(frame);

    const cells = new THREE.Mesh(track(new THREE.BoxGeometry(2.65, 0.04, 1.5)), solarMat);
    cells.position.y = 0.05;
    panel.add(cells);

    const dustSheet = new THREE.Mesh(track(new THREE.BoxGeometry(2.68, 0.05, 1.54)), dustCoatMat);
    dustSheet.position.y = 0.075;
    dustSheet.visible = false;
    panel.add(dustSheet);
    dustOverlayMeshes.push(dustSheet);

    wing.add(panel);
    group.add(wing);
  });

  // Sparking Cable Particles
  const sparkPos = INTERACTIVE_NODES.m3_loose_cable.position;
  const jBox = new THREE.Mesh(track(new THREE.BoxGeometry(0.65, 0.9, 0.55)), hazardMat);
  jBox.position.set(sparkPos[0], groundHeightAt(sparkPos[0], sparkPos[2]) + 0.45, sparkPos[2]);
  group.add(jBox);

  const sparkCount = 40;
  const sparkArr = new Float32Array(sparkCount * 3);
  const sparkGeo = track(new THREE.BufferGeometry());
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkArr, 3));
  const sparkMat = track(
    new THREE.PointsMaterial({
      color: '#fde047',
      map: textures.softDustMote,
      size: 0.42,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      alphaTest: 0.01,
      depthWrite: false,
    }),
  );
  const cableSparks = new THREE.Points(sparkGeo, sparkMat);
  cableSparks.position.set(sparkPos[0], groundHeightAt(sparkPos[0], sparkPos[2]) + 0.9, sparkPos[2]);
  group.add(cableSparks);

  // =========================================================================
  // 5. GREENHOUSE (Walk-in Bio-Pod + Seed->Sprout->Tomato Beds + Storm Shutters)
  // =========================================================================
  const ghZone = BUILDING_ZONES.greenhouse;
  const { bGroup: gh, roofGroup: ghRoof } = buildWalkableRoom(ghZone, 1.15, emeraldMat);

  const sproutMeshes: THREE.Mesh[] = [];
  const leafMeshes: THREE.Mesh[] = [];
  const tomatoMeshes: THREE.Mesh[] = [];
  const seedMeshes: THREE.Mesh[] = [];

  [-1.3, 1.3].forEach((tzOffset) => {
    const tray = new THREE.Mesh(track(new THREE.BoxGeometry(2.2, 0.38, 1.15)), metalMat);
    tray.position.set(0.25, 0.27, tzOffset);
    tray.castShadow = true;
    gh.add(tray);

    const soil = new THREE.Mesh(track(new THREE.BoxGeometry(2.05, 0.08, 1.0)), soilMat);
    soil.position.set(0.25, 0.48, tzOffset);
    gh.add(soil);

    for (let p = 0; p < 3; p++) {
      const px = -0.45 + p * 0.7;

      const seed = new THREE.Mesh(track(new THREE.SphereGeometry(0.08, 8, 6)), goldFoilMat);
      seed.position.set(px, 0.54, tzOffset);
      gh.add(seed);
      seedMeshes.push(seed);

      const sprout = new THREE.Mesh(track(new THREE.ConeGeometry(0.11, 0.26, 6)), foliageMat);
      sprout.position.set(px, 0.64, tzOffset);
      gh.add(sprout);
      sproutMeshes.push(sprout);

      const leaf = new THREE.Mesh(track(new THREE.DodecahedronGeometry(0.28, 0)), foliageMat);
      leaf.position.set(px, 0.75, tzOffset);
      gh.add(leaf);
      leafMeshes.push(leaf);

      const tom = new THREE.Mesh(track(new THREE.SphereGeometry(0.11, 8, 8)), tomatoMat);
      tom.position.set(px, 0.96, tzOffset + 0.14);
      gh.add(tom);
      tomatoMeshes.push(tom);
    }
  });

  // Curved glass roof + pink grow lights + storm shutters
  const ghCanopyGeo = track(new THREE.CylinderGeometry(2.35, 2.35, 6.2, 16, 1, false, 0, Math.PI));
  ghCanopyGeo.rotateZ(Math.PI / 2);
  ghCanopyGeo.rotateX(-Math.PI / 2);
  const ghCanopy = new THREE.Mesh(ghCanopyGeo, ghGlassMat);
  ghCanopy.renderOrder = 2;
  ghRoof.add(ghCanopy);

  for (let i = -2; i <= 2; i++) {
    const arch = new THREE.Mesh(track(new THREE.TorusGeometry(2.37, 0.08, 8, 20, Math.PI)), hullMat);
    arch.position.set(i * 1.45, 0, 0);
    arch.rotation.y = Math.PI / 2;
    ghRoof.add(arch);
  }

  const growStrip = new THREE.Mesh(track(new THREE.BoxGeometry(5.2, 0.1, 0.36)), growLightMat);
  growStrip.position.set(0, 1.85, 0);
  ghRoof.add(growStrip);

  const stormShutterMesh = new THREE.Mesh(
    track(new THREE.CylinderGeometry(2.42, 2.42, 6.3, 12, 1, false, 0, Math.PI)),
    track(new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.5, metalness: 0.7 })),
  );
  stormShutterMesh.rotation.z = Math.PI / 2;
  stormShutterMesh.rotation.x = -Math.PI / 2;
  stormShutterMesh.visible = false;
  ghRoof.add(stormShutterMesh);

  attachWallPlaque(gh, 'greenhouse', [0, 1.15, 2.55], 0);

  // =========================================================================
  // 6. COMMUNICATION TOWER (Walk-in Radio Booth + Rotating Parabolic Dish)
  // =========================================================================
  const cZone = BUILDING_ZONES.comms_tower;
  const { bGroup: comms, roofGroup: cRoof } = buildWalkableRoom(
    cZone,
    2.2,
    track(new THREE.MeshStandardMaterial({ color: '#a855f7', roughness: 0.4 })),
  );

  const radioRack = new THREE.Mesh(track(new THREE.BoxGeometry(0.75, 1.55, 1.7)), baseDarkMat);
  radioRack.position.set(1.3, 0.85, 0);
  comms.add(radioRack);

  const cRoofSlab = new THREE.Mesh(track(new THREE.BoxGeometry(4.2, 0.22, 3.8)), hullMat);
  cRoof.add(cRoofSlab);

  const dishGimbal = new THREE.Group();
  dishGimbal.position.y = 0.75;
  const dishPts: THREE.Vector2[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    dishPts.push(new THREE.Vector2(t * 1.85, t * t * 0.65));
  }
  const dishMesh = new THREE.Mesh(
    track(new THREE.LatheGeometry(dishPts, 24)),
    track(
      new THREE.MeshStandardMaterial({
        color: '#f8fafc',
        roughness: 0.3,
        metalness: 0.45,
        side: THREE.DoubleSide,
      }),
    ),
  );
  dishMesh.rotation.x = Math.PI * 0.28;
  dishGimbal.add(dishMesh);

  const feedHorn = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.06, 0.1, 1.25, 8)),
    track(new THREE.MeshStandardMaterial({ color: '#a855f7', roughness: 0.35 })),
  );
  feedHorn.position.set(0, 0.7, 0.8);
  feedHorn.rotation.x = Math.PI * 0.28;
  dishGimbal.add(feedHorn);
  cRoof.add(dishGimbal);
  attachWallPlaque(comms, 'comms_tower', [0, 1.5, 1.95], 0);

  // Exterior Antenna Cable Box
  const acp = INTERACTIVE_NODES.m5_antenna_cable.position;
  const antBox = new THREE.Mesh(track(new THREE.BoxGeometry(0.75, 0.95, 0.6)), baseDarkMat);
  antBox.position.set(acp[0], groundHeightAt(acp[0], acp[2]) + 0.48, acp[2]);
  group.add(antBox);

  // =========================================================================
  // 7. MEDICAL ROOM (Walk-in Health Pod + Scanner Bed + Red Cross Roof)
  // =========================================================================
  const mZone = BUILDING_ZONES.medical_room;
  const { bGroup: med, roofGroup: mRoof } = buildWalkableRoom(mZone, 2.2, medRedMat);

  const medBed = new THREE.Mesh(track(new THREE.BoxGeometry(1.0, 0.65, 1.9)), hullMat);
  medBed.position.set(1.3, 0.4, 0);
  med.add(medBed);

  // Mission 8: Medical Vitals Scanner Console inside Medical Room
  const medConsole = new THREE.Mesh(track(new THREE.BoxGeometry(0.75, 1.28, 0.46)), baseDarkMat);
  medConsole.position.set(-0.95, 0.72, 1.25);
  med.add(medConsole);
  const medScreen = new THREE.Mesh(track(new THREE.BoxGeometry(0.52, 0.36, 0.06)), windowGlowMat);
  medScreen.position.set(-0.95, 1.12, 1.0);
  med.add(medScreen);

  const mRoofSlab = new THREE.Mesh(track(new THREE.BoxGeometry(4.6, 0.24, 4.4)), hullMat);
  mRoof.add(mRoofSlab);
  const crossH = new THREE.Mesh(track(new THREE.BoxGeometry(1.3, 0.16, 0.38)), medRedMat);
  crossH.position.y = 0.2;
  mRoof.add(crossH);
  const crossV = new THREE.Mesh(track(new THREE.BoxGeometry(0.38, 0.16, 1.3)), medRedMat);
  crossV.position.y = 0.2;
  mRoof.add(crossV);
  attachWallPlaque(med, 'medical_room', [0, 1.45, 2.26], 0);

  // =========================================================================
  // 8. RADIATION SHELTER (NEW! Walk-in Regolith Bunker + Shielding Layers!)
  // =========================================================================
  const rZone = BUILDING_ZONES.radiation_shelter;
  const { bGroup: rad, roofGroup: rRoof } = buildWalkableRoom(
    rZone,
    2.2,
    medRedMat,
    regolithBlockMat,
    { southViewport: true, westViewport: true },
  );

  // Interior Radiation Console
  const radConsole = new THREE.Mesh(track(new THREE.BoxGeometry(0.95, 1.25, 0.8)), baseDarkMat);
  radConsole.position.set(1.9, 0.7, 1.35);
  rad.add(radConsole);

  const radScreen = new THREE.Mesh(track(new THREE.BoxGeometry(0.65, 0.45, 0.08)), windowGlowMat);
  radScreen.position.set(1.9, 1.15, 0.92);
  rad.add(radScreen);

  // Progressive Regolith Shielding Layers inside/around shelter (0 -> 3; keeps west storm viewport clear)
  const shieldLayers: THREE.Mesh[] = [];
  const layer1 = new THREE.Mesh(track(new THREE.BoxGeometry(0.35, 0.74, 3.6)), regolithBlockMat);
  layer1.position.set(-2.25, 0.45, 0);
  rad.add(layer1);
  shieldLayers.push(layer1);

  const layer2 = new THREE.Mesh(track(new THREE.BoxGeometry(0.35, 1.6, 3.6)), regolithBlockMat);
  layer2.position.set(2.25, 0.9, 0);
  rad.add(layer2);
  shieldLayers.push(layer2);

  const layer3 = new THREE.Mesh(track(new THREE.BoxGeometry(5.2, 0.42, 4.4)), regolithBlockMat);
  layer3.position.y = 0.34;
  rRoof.add(layer3);
  shieldLayers.push(layer3);

  const rRoofSlab = new THREE.Mesh(track(new THREE.BoxGeometry(5.6, 0.24, 4.8)), baseDarkMat);
  rRoof.add(rRoofSlab);
  attachWallPlaque(rad, 'radiation_shelter', [1.7, 1.4, -2.45], Math.PI);

  // Exterior Regolith Shielding Block Supply Crate
  const rbp = INTERACTIVE_NODES.m8_rad_blocks.position;
  const regCrate = new THREE.Group();
  regCrate.position.set(rbp[0], groundHeightAt(rbp[0], rbp[2]), rbp[2]);
  for (let i = 0; i < 3; i++) {
    const blk = new THREE.Mesh(track(new THREE.BoxGeometry(0.55, 0.35, 0.55)), regolithBlockMat);
    blk.position.set((i - 1) * 0.28, 0.18 + (i === 1 ? 0.34 : 0), 0);
    blk.castShadow = true;
    regCrate.add(blk);
  }
  group.add(regCrate);

  // =========================================================================
  // 9. COMMAND CENTRE (Walk-in Command Hall + Upper Deck + Sky Beacon)
  // =========================================================================
  const cmdZone = BUILDING_ZONES.command_centre;
  const { bGroup: cmd, roofGroup: cmdRoof } = buildWalkableRoom(cmdZone, 2.35, goldFoilMat);

  const holoTable = new THREE.Mesh(track(new THREE.BoxGeometry(1.9, 0.95, 0.9)), baseDarkMat);
  holoTable.position.set(0, 0.55, -1.35);
  cmd.add(holoTable);
  const holoGlow = new THREE.Mesh(track(new THREE.BoxGeometry(1.4, 0.08, 0.55)), windowGlowMat);
  holoGlow.position.set(0, 1.06, -1.35);
  cmd.add(holoGlow);

  const cmdRoofBase = new THREE.Mesh(track(new THREE.CylinderGeometry(2.6, 2.8, 0.3, 6)), hullMat);
  cmdRoof.add(cmdRoofBase);
  const cmdDeck = new THREE.Mesh(track(new THREE.CylinderGeometry(2.2, 1.8, 1.25, 6)), windowGlowMat);
  cmdDeck.position.y = 0.78;
  cmdRoof.add(cmdDeck);
  const cmdCap = new THREE.Mesh(track(new THREE.CylinderGeometry(1.8, 2.3, 0.4, 6)), hullMat);
  cmdCap.position.y = 1.6;
  cmdRoof.add(cmdCap);
  const cmdRadar = new THREE.Mesh(track(new THREE.BoxGeometry(1.8, 0.18, 0.25)), orangeMat);
  cmdRadar.position.y = 2.15;
  cmdRoof.add(cmdRadar);
  attachWallPlaque(cmd, 'command_centre', [1.75, 1.5, 2.35], 0);

  const beaconBeam = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.45, 1.3, 24, 16, 1, true)),
    track(
      new THREE.MeshBasicMaterial({
        color: '#fbbf24',
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    ),
  );
  beaconBeam.position.y = 14.5;
  cmd.add(beaconBeam);

  // =========================================================================
  // 10. LANDING PAD + MARS ROVER + ANIMATED MAINTENANCE ROBOTS
  // =========================================================================
  const padGroup = new THREE.Group();
  padGroup.position.set(
    LANDING_PAD_POS[0],
    groundHeightAt(LANDING_PAD_POS[0], LANDING_PAD_POS[1]),
    LANDING_PAD_POS[1],
  );
  const padBase = new THREE.Mesh(track(new THREE.CylinderGeometry(5.3, 5.8, 0.26, 24)), baseDarkMat);
  padBase.position.y = 0.13;
  padBase.receiveShadow = true;
  padGroup.add(padBase);

  const padTop = new THREE.Mesh(
    track(new THREE.CircleGeometry(5.1, 32)),
    track(new THREE.MeshStandardMaterial({ map: textures.landingPad, roughness: 0.78 })),
  );
  padTop.rotation.x = -Math.PI / 2;
  padTop.position.y = 0.27;
  padTop.receiveShadow = true;
  padGroup.add(padTop);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const post = new THREE.Mesh(track(new THREE.CylinderGeometry(0.1, 0.12, 0.45, 8)), goldFoilMat);
    post.position.set(Math.cos(a) * 5.2, 0.35, Math.sin(a) * 5.2);
    padGroup.add(post);
  }
  group.add(padGroup);

  // 6-Wheeled Mars Rover parked near [13.1, 4.0]
  const rover = new THREE.Group();
  rover.position.set(13.1, groundHeightAt(13.1, 4.0), 4.0);
  rover.rotation.y = -0.6;
  const rChassis = new THREE.Mesh(track(new THREE.BoxGeometry(1.15, 0.42, 1.55)), hullMat);
  rChassis.position.y = 0.45;
  rChassis.castShadow = true;
  rover.add(rChassis);
  const rMast = new THREE.Mesh(track(new THREE.CylinderGeometry(0.06, 0.06, 0.75, 8)), metalMat);
  rMast.position.set(0, 0.95, 0.45);
  rover.add(rMast);
  const rHead = new THREE.Mesh(track(new THREE.BoxGeometry(0.36, 0.18, 0.22)), windowGlowMat);
  rHead.position.set(0, 1.32, 0.48);
  rover.add(rHead);
  for (let side of [-0.62, 0.62]) {
    for (let wz of [-0.55, 0, 0.55]) {
      const wheel = new THREE.Mesh(track(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 10)), baseDarkMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side, 0.2, wz);
      rover.add(wheel);
    }
  }
  group.add(rover);

  // 2 Animated Maintenance Robots patrolling the base paths!
  const makeRobot = (accent: THREE.Material) => {
    const bot = new THREE.Group();
    const chassis = new THREE.Mesh(track(new THREE.BoxGeometry(0.55, 0.38, 0.62)), hullMat);
    chassis.position.y = 0.28;
    chassis.castShadow = true;
    bot.add(chassis);
    const dome = new THREE.Mesh(track(new THREE.SphereGeometry(0.22, 12, 10)), accent);
    dome.position.y = 0.54;
    bot.add(dome);
    const eye = new THREE.Mesh(track(new THREE.BoxGeometry(0.28, 0.08, 0.06)), windowGlowMat);
    eye.position.set(0, 0.54, 0.2);
    bot.add(eye);
    const ant = new THREE.Mesh(track(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 6)), metalMat);
    ant.position.set(0.14, 0.78, -0.08);
    bot.add(ant);
    group.add(bot);
    return bot;
  };
  const patrolBot1 = makeRobot(skyBlueMat);
  const patrolBot2 = makeRobot(orangeMat);

  // =========================================================================
  // 11. GROUND WALKWAYS & UTILITY PIPELINES
  // =========================================================================
  const addGroundPath = (a: [number, number], b: [number, number], width = 1.25) => {
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const mesh = new THREE.Mesh(track(new THREE.PlaneGeometry(width, len)), walkwayMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = -Math.atan2(dx, dz);
    mesh.position.set((a[0] + b[0]) * 0.5, 0.028, (a[1] + b[1]) * 0.5);
    mesh.receiveShadow = true;
    group.add(mesh);
  };

  // Connected walkways & Pressurized Glass Corridors across the colony
  addGroundPath([0, 5.2], [-9.1, 4.5]); // Oxygen Centre
  addGroundPath([0, 5.2], [-2.5, 11.2]); // Radiation Shelter
  addGroundPath([0, 5.2], [6.3, 8.8]); // Medical Room
  addGroundPath([0, 5.2], [13.5, 11.5]); // Crew Landing Pad
  addGroundPath([0, -5.0], [0, -9.3]); // Command Centre
  addGroundPath([0, -5.0], [-8.3, -7.5]); // Water Station
  addGroundPath([0, -5.0], [7.8, -1.5]); // Greenhouse
  addGroundPath([0, -5.0], [8.0, -11.5]); // Comms Tower
  addGroundPath([-9.1, 4.5], [-13.6, 11.5]); // Power Station
  // Service Roads linking Vehicle Hangar, Logistics Hub & Dedicated Cargo Landing Pad
  addGroundPath([14.0, -1.5], [21.5, -3.5], 2.1); // Greenhouse -> Vehicle Hangar
  addGroundPath([-11.0, -10.0], [-15.5, -20.5], 1.9); // Water Station -> Cargo Warehouse
  addGroundPath([-15.5, -23.0], [-28.0, -23.0], 2.5); // Cargo Service Road (Warehouse <-> Cargo Pad)
  addGroundPath([-15.5, -23.0], [-6.5, -24.5], 1.5); // Cargo Warehouse -> Ice Station

  // Transparent Pressurized Connector Tubes between Crew Home, Command Centre & Greenhouse
  const addPressurizedTunnel = (a: [number, number], b: [number, number]) => {
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const tGroup = new THREE.Group();
    tGroup.position.set((a[0] + b[0]) * 0.5, groundHeightAt((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5), (a[1] + b[1]) * 0.5);
    tGroup.rotation.y = Math.atan2(dx, dz);
    const shell = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.95, 0.95, len, 12, 1, false, 0, Math.PI)),
      domeGlassMat,
    );
    shell.rotation.z = Math.PI / 2;
    shell.rotation.x = Math.PI / 2;
    shell.position.y = 1.95;
    tGroup.add(shell);
    for (let s = -len * 0.35; s <= len * 0.35; s += 1.45) {
      const rib = new THREE.Mesh(track(new THREE.TorusGeometry(0.98, 0.05, 6, 14, Math.PI)), metalMat);
      rib.position.set(0, 1.95, s);
      tGroup.add(rib);
    }
    group.add(tGroup);
  };
  addPressurizedTunnel([0, -4.4], [0, -9.2]); // Crew Home <-> Command Centre overhead sky-bridge ribs
  addPressurizedTunnel([4.4, -0.8], [7.7, -1.4]); // Crew Home <-> Greenhouse canopy

  // Cafeteria & Recreation Annex beside Crew Home ([6.2, 2.8])
  const cafeGroup = new THREE.Group();
  cafeGroup.position.set(6.2, groundHeightAt(6.2, 2.8), 2.8);
  const cafePad = new THREE.Mesh(track(new THREE.BoxGeometry(2.6, 0.16, 2.2)), deckFloorMat);
  cafePad.position.y = 0.08;
  cafePad.receiveShadow = true;
  cafeGroup.add(cafePad);
  const cafeBody = new THREE.Mesh(track(new THREE.BoxGeometry(2.35, 1.75, 1.95)), hullMat);
  cafeBody.position.y = 1.02;
  cafeBody.castShadow = true;
  cafeGroup.add(cafeBody);
  const cafeGlass = new THREE.Mesh(track(new THREE.BoxGeometry(1.9, 0.95, 0.12)), windowGlowMat);
  cafeGlass.position.set(0, 1.15, 0.98);
  cafeGroup.add(cafeGlass);
  const cafeRoof = new THREE.Mesh(track(new THREE.BoxGeometry(2.5, 0.22, 2.1)), orangeMat);
  cafeRoof.position.y = 1.98;
  cafeGroup.add(cafeRoof);
  const cafeSignTex = textures.createSignTexture('Cafeteria Annex', 'Dining & Crew Lounge', '#f97316');
  const cafeSign = new THREE.Mesh(
    track(new THREE.PlaneGeometry(1.7, 0.48)),
    track(new THREE.MeshBasicMaterial({ map: cafeSignTex })),
  );
  cafeSign.position.set(0, 1.8, 1.08);
  cafeGroup.add(cafeSign);
  group.add(cafeGroup);

  // Fuel & Energy Cryo Storage Tanks ([-22.8, 11.5])
  const fuelGroup = new THREE.Group();
  fuelGroup.position.set(-22.8, groundHeightAt(-22.8, 11.5), 11.5);
  const fuelPad = new THREE.Mesh(track(new THREE.BoxGeometry(2.8, 0.18, 3.2)), baseDarkMat);
  fuelPad.position.y = 0.09;
  fuelPad.receiveShadow = true;
  fuelGroup.add(fuelPad);
  [-0.8, 0.8].forEach((fz, idx) => {
    const tank = new THREE.Mesh(
      track(new THREE.CapsuleGeometry(0.55, 1.65, 8, 14)),
      idx === 0 ? orangeMat : skyBlueMat,
    );
    tank.position.set(0, 1.38, fz);
    tank.castShadow = true;
    fuelGroup.add(tank);
    const band = new THREE.Mesh(track(new THREE.CylinderGeometry(0.58, 0.58, 0.26, 14)), goldFoilMat);
    band.position.set(0, 1.4, fz);
    fuelGroup.add(band);
  });
  const fuelSignTex = textures.createSignTexture('Fuel & Cryo Tanks', 'Methane & O₂ Storage', '#eab308');
  const fuelSign = new THREE.Mesh(
    track(new THREE.PlaneGeometry(1.75, 0.48)),
    track(new THREE.MeshBasicMaterial({ map: fuelSignTex })),
  );
  fuelSign.position.set(1.44, 1.35, 0);
  fuelSign.rotation.y = Math.PI / 2;
  fuelGroup.add(fuelSign);
  group.add(fuelGroup);

  const addPipe = (a: [number, number], b: [number, number], radius: number, mat: THREE.Material) => {
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    const tGroup = new THREE.Group();
    tGroup.position.set((a[0] + b[0]) * 0.5, 0.22, (a[1] + b[1]) * 0.5);
    tGroup.rotation.y = Math.atan2(dx, dz);
    const tube = new THREE.Mesh(track(new THREE.CylinderGeometry(radius, radius, len, 8)), mat);
    tube.rotation.x = Math.PI / 2;
    tGroup.add(tube);
    group.add(tGroup);
  };
  addPipe([-11.5, 6.6], [-4.3, 2.2], 0.18, skyBlueMat);
  addPipe([-11.0, -5.2], [7.8, -3.5], 0.16, deepBlueMat);
  addPipe([-21.4, 11.5], [-17.4, 11.5], 0.16, orangeMat);

  // =========================================================================
  // 12. INTERACTIVE EQUIPMENT MARKERS & CLICK PROXIES
  // =========================================================================
  const nodeMarkers = {} as Record<InteractiveNodeId, { ring: THREE.Mesh; arrow: THREE.Mesh }>;
  (Object.keys(INTERACTIVE_NODES) as InteractiveNodeId[]).forEach((nid) => {
    const spec = INTERACTIVE_NODES[nid];
    const [nx, , nz] = spec.position;
    const ny = Math.max(groundHeightAt(nx, nz), 0.08);

    const nGroup = new THREE.Group();
    nGroup.position.set(nx, ny, nz);

    const ringGeo = track(new THREE.RingGeometry(0.75, 0.98, 24));
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = track(
      new THREE.MeshBasicMaterial({
        color: '#fbbf24',
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.05;
    nGroup.add(ring);

    const arrow = new THREE.Mesh(
      track(new THREE.ConeGeometry(0.28, 0.55, 4)),
      track(
        new THREE.MeshStandardMaterial({
          color: '#fbbf24',
          emissive: '#f59e0b',
          emissiveIntensity: 1.5,
          roughness: 0.25,
        }),
      ),
    );
    arrow.rotation.x = Math.PI;
    arrow.position.y = 2.1;
    nGroup.add(arrow);

    const proxy = new THREE.Mesh(
      track(new THREE.CylinderGeometry(1.1, 1.1, 2.2, 10)),
      track(new THREE.MeshBasicMaterial({ visible: false })),
    );
    proxy.position.y = 1.1;
    proxy.layers.enable(1);
    proxy.userData.nodeId = nid;
    nGroup.add(proxy);
    nodeProxies.push(proxy);

    nGroup.visible = false;
    group.add(nGroup);
    nodeMarkers[nid] = { ring, arrow };
  });

  // 12B. Optional Exploration & Discovery Beacons (Distinct Cyan Diamonds — Never Clutter Main Gold Beacons)
  const optionalMarkers: Record<string, { ring: THREE.Mesh; diamond: THREE.Mesh }> = {};
  OPTIONAL_TASKS.forEach((opt) => {
    const oy = Math.max(groundHeightAt(opt.x, opt.z), 0.08);
    const oGroup = new THREE.Group();
    oGroup.position.set(opt.x, oy, opt.z);

    const oRingGeo = track(new THREE.RingGeometry(0.62, 0.84, 20));
    oRingGeo.rotateX(-Math.PI / 2);
    const oRing = new THREE.Mesh(
      oRingGeo,
      track(
        new THREE.MeshBasicMaterial({
          color: '#22d3ee',
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      ),
    );
    oRing.position.y = 0.06;
    oGroup.add(oRing);

    const diamond = new THREE.Mesh(
      track(new THREE.OctahedronGeometry(0.28, 0)),
      track(
        new THREE.MeshStandardMaterial({
          color: '#22d3ee',
          emissive: '#06b6d4',
          emissiveIntensity: 1.5,
          roughness: 0.2,
        }),
      ),
    );
    diamond.position.y = 1.75;
    oGroup.add(diamond);

    oGroup.visible = false;
    group.add(oGroup);
    optionalMarkers[opt.id] = { ring: oRing, diamond };
  });

  // =========================================================================
  // UPDATE LOOP
  // =========================================================================
  const update: BaseWorldHandles['update'] = (
    elapsed,
    dt,
    state,
    playerPos,
    npcPositions = [],
    onDoorToggle,
  ) => {
    const powerFactor = state.powerBlackout ? 0.16 : 1.0;
    homeLampMat.emissiveIntensity = THREE.MathUtils.damp(
      homeLampMat.emissiveIntensity,
      state.powerBlackout ? 0.18 : 1.1,
      4,
      dt,
    );
    windowGlowMat.emissiveIntensity = THREE.MathUtils.damp(
      windowGlowMat.emissiveIntensity,
      0.68 * powerFactor,
      4,
      dt,
    );
    growLightMat.emissiveIntensity = THREE.MathUtils.damp(
      growLightMat.emissiveIntensity,
      state.powerBlackout ? 0.12 : 1.35,
      4,
      dt,
    );

    // 1. Openable Airlock Doors (slide open for Alex OR autonomous crew NPCs within 3.6m)
    for (let i = 0; i < doors.length; i++) {
      const d = doors[i];
      const playerDist = Math.hypot(playerPos.x - d.doorX, playerPos.z - d.doorZ);
      let npcNear = false;
      for (let n = 0; n < npcPositions.length; n++) {
        if (Math.hypot(npcPositions[n].x - d.doorX, npcPositions[n].z - d.doorZ) < 3.4) {
          npcNear = true;
          break;
        }
      }
      const lockedShelterDoor = d.id === 'radiation_shelter' && state.shelterDoorsClosed;
      const shouldOpen = !lockedShelterDoor && (playerDist < 3.6 || npcNear || state.insideBuildingId === d.id);
      if (shouldOpen !== d.wasOpen) {
        d.wasOpen = shouldOpen;
        if (playerDist < 5.0) {
          onDoorToggle?.(d.id, shouldOpen);
        }
      }
      d.openAmount = THREE.MathUtils.damp(d.openAmount, shouldOpen ? 0.92 : 0, 9, dt);

      const lBase = d.leftLeaf.userData.baseOffset as number;
      const rBase = d.rightLeaf.userData.baseOffset as number;
      if (d.axis === 'x') {
        d.leftLeaf.position.x = lBase - d.openAmount;
        d.rightLeaf.position.x = rBase + d.openAmount;
      } else {
        d.leftLeaf.position.z = lBase - d.openAmount;
        d.rightLeaf.position.z = rBase + d.openAmount;
      }
    }

    // 2. Cutaway Building Roofs when astronaut walks inside!
    for (let i = 0; i < roofs.length; i++) {
      const r = roofs[i];
      const isInside = state.insideBuildingId === r.id;
      const targetScaleY = isInside ? 0.02 : 1.0;
      const nextScale = THREE.MathUtils.damp(r.roofGroup.scale.y, targetScaleY, 10, dt);
      r.roofGroup.scale.y = nextScale;
      r.roofGroup.visible = nextScale > 0.05;
    }

    // 3. O2 Alarm & Roof Fan
    o2FanBlades.rotation.y += dt * (state.o2FanSpinning ? 6.2 : 0.15);
    o2AlarmLampMat.emissiveIntensity = state.o2AlarmActive ? 1.2 + Math.sin(elapsed * 8) * 1.1 : 0;

    // 4. Water Leak Spray + Puddle + Shutoff Valve
    valveWheel.rotation.z = THREE.MathUtils.damp(
      valveWheel.rotation.z,
      state.waterValveClosed ? Math.PI : 0,
      8,
      dt,
    );
    waterSpray.visible = state.waterLeakActive;
    if (state.waterLeakActive) {
      const attr = sprayGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < sprayCount; i++) {
        const life = (elapsed * 2.4 + i * 0.037) % 1;
        const angle = (i % 13) * 0.48 + elapsed * 3.0;
        const spread = life * 1.1;
        const y = life * 1.5 - life * life * 1.8;
        attr.setXYZ(i, Math.cos(angle) * spread, y, Math.sin(angle) * spread);
      }
      attr.needsUpdate = true;
    }
    const puddleTarget = state.waterPuddleVisible ? (state.waterLeakActive ? 1.15 : 0.85) : 0.01;
    const curPuddleScale = THREE.MathUtils.damp(waterPuddle.scale.x, puddleTarget, 2.5, dt);
    waterPuddle.scale.setScalar(curPuddleScale);
    waterPuddle.visible = curPuddleScale > 0.04;

    // 5. Solar Dust & Sparks
    const showSolarDust = state.solarDusty || state.stormStage >= 4;
    dustCoatMat.opacity = THREE.MathUtils.damp(
      dustCoatMat.opacity,
      state.solarDusty ? 0.9 : state.stormStage >= 4 ? 0.62 : 0,
      2.5,
      dt,
    );
    dustOverlayMeshes.forEach((m) => {
      m.visible = showSolarDust;
    });
    cableSparks.visible = state.cableSparking;
    if (state.cableSparking) {
      const attr = sparkGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < sparkCount; i++) {
        const t = (elapsed * 4.5 + i * 0.11) % 1;
        const a = i * 2.1 + elapsed * 8;
        attr.setXYZ(i, Math.cos(a) * t * 0.85, Math.sin(t * Math.PI) * 0.75, Math.sin(a) * t * 0.85);
      }
      attr.needsUpdate = true;
    }

    // 6. Greenhouse Dynamic Growth Stages & Storm Shutters
    stormShutterMesh.visible = state.stormShuttersClosed;
    const stage = state.gardenStage;
    foliageMat.color.set(state.plantsWilting ? '#84cc16' : '#22c55e');
    seedMeshes.forEach((s) => {
      s.visible = stage >= 1 && stage < 3;
    });
    sproutMeshes.forEach((sp) => {
      sp.visible = stage === 2;
    });
    leafMeshes.forEach((leaf) => {
      leaf.visible = stage === 0 || stage === 3;
      leaf.scale.y = THREE.MathUtils.damp(leaf.scale.y, state.plantsWilting ? 0.55 : 1.0, 4, dt);
      leaf.rotation.z = THREE.MathUtils.damp(leaf.rotation.z, state.plantsWilting ? 0.35 : 0, 4, dt);
    });
    tomatoMeshes.forEach((tom) => {
      tom.visible = !state.plantsWilting && (stage === 3 || state.tomatoesRipe);
      tom.scale.setScalar(state.tomatoesRipe ? 1.15 : 0.75);
    });
    tomatoMat.color.set(state.tomatoesRipe ? '#ef4444' : '#a3e635');

    // 7. Radiation Shelter Shielding Layers
    shieldLayers.forEach((layer, idx) => {
      layer.visible = state.shelterShieldLevel > idx;
    });

    // 8. Comms Dish, Radar & Sky Beacon
    cmdRadar.rotation.y += dt * (state.powerBlackout ? 0.2 : 1.6);
    dishGimbal.rotation.y = Math.sin(elapsed * 0.45) * 0.45;
    const beaconMat = beaconBeam.material as THREE.MeshBasicMaterial;
    beaconMat.opacity = THREE.MathUtils.damp(beaconMat.opacity, state.beaconBeamActive ? 0.42 : 0, 3, dt);

    // 9. Animated Patrol Maintenance Bots
    const b1Angle = elapsed * 0.32;
    const b1x = Math.cos(b1Angle) * 6.4;
    const b1z = Math.sin(b1Angle) * 6.4;
    patrolBot1.position.set(b1x, groundHeightAt(b1x, b1z), b1z);
    patrolBot1.rotation.y = -b1Angle;

    const b2t = Math.sin(elapsed * 0.5) * 3.5;
    const b2x = -6.2 + b2t;
    const b2z = 7.8;
    patrolBot2.position.set(b2x, groundHeightAt(b2x, b2z) + Math.sin(elapsed * 4) * 0.04, b2z);
    patrolBot2.rotation.y = Math.cos(elapsed * 0.5) >= 0 ? Math.PI / 2 : -Math.PI / 2;

    // 10. Interactive Node Markers (Main Mission Gold Beacons + Optional Cyan Diamonds)
    (Object.keys(nodeMarkers) as InteractiveNodeId[]).forEach((nid) => {
      const m = nodeMarkers[nid];
      const root = m.ring.parent!;
      const isActive = state.activeNodeIds.includes(nid);
      root.visible = isActive;
      if (isActive) {
        const pulse = 1 + Math.sin(elapsed * 4.2) * 0.12;
        m.ring.scale.setScalar(pulse);
        m.arrow.position.y = 2.0 + Math.sin(elapsed * 4.5) * 0.2;
        m.arrow.rotation.y += dt * 2.6;
      }
    });

    const activeOpts = state.activeOptionalIds ?? [];
    const doneOpts = state.completedOptionalIds ?? [];
    OPTIONAL_TASKS.forEach((opt) => {
      const om = optionalMarkers[opt.id];
      if (!om) return;
      const showOpt = activeOpts.includes(opt.id) && !doneOpts.includes(opt.id);
      om.ring.parent!.visible = showOpt;
      if (showOpt) {
        const pulse = 1 + Math.sin(elapsed * 3.6 + 1.1) * 0.12;
        om.ring.scale.setScalar(pulse);
        om.diamond.position.y = 1.65 + Math.sin(elapsed * 3.8) * 0.18;
        om.diamond.rotation.y += dt * 2.1;
      }
    });
  };

  return {
    group,
    nodeProxies,
    update,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
