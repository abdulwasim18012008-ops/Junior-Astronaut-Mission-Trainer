import * as THREE from 'three';
import { CHARACTERS_INFO, CREW_NPC_ORDER } from './adventureStory';
import {
  BUILDING_ZONES,
  detectInsideBuilding,
  resolveCharacterCollisions,
} from './colonyLayout';
import {
  createInitialNpcAgents,
  NpcAgentMemory,
  stepNpcAgent,
} from './crewAI';
import {
  MARS_CROUCH_SPEED,
  MARS_GRAVITY,
  MARS_JOG_SPEED,
  MARS_JUMP_IMPULSE,
  MARS_JUMP_PREP_TIME,
  MARS_SPRINT_SPEED,
  MARS_WALK_SPEED,
  STORM_STAGE_SPECS,
  SUIT_ACCEL_DAMP,
  SUIT_DECEL_DAMP,
  SURFACE_SPEED_MULT,
} from './marsConfig';
import { groundHeightAt, surfaceTypeAt } from './marsTerrain';
import { ProceduralTextureSet } from './proceduralTextures';
import {
  AstronautActionAnim,
  BuildingId,
  CharacterId,
  CrewNpcId,
  ExplorationToolId,
  NpcRuntimeStatus,
  WorldVisualState,
} from './types';

interface AstronautRig {
  id: CharacterId;
  root: THREE.Group;
  bodyPivot: THREE.Group;
  pelvisGroup: THREE.Group;
  torsoGroup: THREE.Group;
  plssGroup: THREE.Group;
  headGroup: THREE.Group;
  leftUpperArm: THREE.Group;
  leftForearm: THREE.Group;
  rightUpperArm: THREE.Group;
  rightForearm: THREE.Group;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  leftAnkle: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  rightAnkle: THREE.Group;
  carryItemMesh: THREE.Mesh;
  handTools: Record<ExplorationToolId, THREE.Object3D>;
}

export interface CharactersHandles {
  group: THREE.Group;
  playerPosition: THREE.Vector3;
  playerRotationY: number;
  insideBuildingId: BuildingId | null;
  npcStatuses: NpcRuntimeStatus[];
  npcPositions: THREE.Vector3[];
  getNearbyCrew: () => { id: CrewNpcId | 'nova' | null; distance: number };
  update: (
    elapsed: number,
    dt: number,
    input: { forward: number; right: number; sprint: boolean; jump: boolean },
    cameraYaw: number,
    state: WorldVisualState,
    roverPos?: THREE.Vector3,
    onFootstep?: (sprint: boolean, indoor: boolean) => void,
    roverYaw?: number,
  ) => void;
  triggerActionAnim: (anim: AstronautActionAnim, duration?: number) => void;
  resetPositions: () => void;
  setPlayerLocation: (x: number, z: number, rotY?: number) => void;
  dispose: () => void;
}

const THIGH_LEN = 0.34;
const SHIN_LEN = 0.30;
const ANKLE_DROP = 0.08;
const STANDING_HIP_HEIGHT = THIGH_LEN + SHIN_LEN + ANKLE_DROP; // 0.72m exact

const _dummy = new THREE.Object3D();

export function createCharacters(textures: ProceduralTextureSet): CharactersHandles {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // PBR Materials
  const suitWhiteMat = track(
    new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.54, metalness: 0.12 }),
  );
  const suitRibMat = track(
    new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.62, metalness: 0.2 }),
  );
  const jointDarkMat = track(
    new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.78, metalness: 0.24 }),
  );
  const bootSoleMat = track(
    new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.9, metalness: 0.12 }),
  );
  const visorGoldMat = track(
    new THREE.MeshPhysicalMaterial({
      color: '#f59e0b',
      roughness: 0.1,
      metalness: 0.92,
      clearcoat: 1.0,
    }),
  );
  const metalTrimMat = track(
    new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.28, metalness: 0.85 }),
  );
  const lampMat = track(
    new THREE.MeshStandardMaterial({
      color: '#fef08a',
      emissive: '#fde047',
      emissiveIntensity: 1.35,
    }),
  );
  const toolGlowMat = track(
    new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#0ea5e9',
      emissiveIntensity: 1.1,
      roughness: 0.25,
    }),
  );
  const carryMat = track(
    new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      emissive: '#0284c7',
      emissiveIntensity: 0.6,
      roughness: 0.32,
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

  // Shared Multi-Joint Geometries
  const pelvisGeo = track(new THREE.BoxGeometry(0.45, 0.18, 0.29));
  const torsoGeo = track(new THREE.BoxGeometry(0.54, 0.52, 0.34));
  const chestPackGeo = track(new THREE.BoxGeometry(0.32, 0.24, 0.1));
  const plssGeo = track(new THREE.BoxGeometry(0.45, 0.56, 0.23));
  const o2TankGeo = track(new THREE.CylinderGeometry(0.08, 0.08, 0.48, 10));
  const helmetGeo = track(new THREE.SphereGeometry(0.265, 22, 16));
  const visorGeo = track(
    new THREE.SphereGeometry(
      0.24,
      16,
      12,
      -Math.PI * 0.38,
      Math.PI * 0.76,
      Math.PI * 0.2,
      Math.PI * 0.58,
    ),
  );
  const upperArmGeo = track(new THREE.CapsuleGeometry(0.08, 0.19, 4, 8));
  const forearmGeo = track(new THREE.CapsuleGeometry(0.072, 0.19, 4, 8));
  const thighGeo = track(new THREE.CapsuleGeometry(0.098, 0.20, 4, 8));
  const shinGeo = track(new THREE.CapsuleGeometry(0.086, 0.18, 4, 8));
  const bootGeo = track(new THREE.BoxGeometry(0.20, 0.10, 0.30));
  const bootSoleGeo = track(new THREE.BoxGeometry(0.215, 0.032, 0.32));
  const jointBallGeo = track(new THREE.SphereGeometry(0.092, 10, 8));

  const buildAstronaut = (id: CharacterId, scale = 1.0): AstronautRig => {
    const info = CHARACTERS_INFO[id];
    const [x, , z] = info.homePos;
    const accentMat = track(
      new THREE.MeshStandardMaterial({
        color: info.suitColor,
        roughness: 0.44,
        metalness: 0.22,
      }),
    );

    const root = new THREE.Group();
    root.name = `astronaut_${id}`;
    root.position.set(x, groundHeightAt(x, z), z);
    root.rotation.y = info.rotY;
    root.scale.setScalar(scale);

    // Soft radial ground shadow directly at foot plane (scales down slightly while airborne)
    const shadow = new THREE.Mesh(track(new THREE.PlaneGeometry(1.35, 1.35)), contactShadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.025;
    shadow.name = 'contact_shadow';
    root.add(shadow);

    const bodyPivot = new THREE.Group();
    root.add(bodyPivot);

    // Pelvis / Hip Core (rotates slightly for weight shift & turn bank)
    const pelvisGroup = new THREE.Group();
    pelvisGroup.position.set(0, 0.76, 0);
    bodyPivot.add(pelvisGroup);

    const pelvis = new THREE.Mesh(pelvisGeo, suitRibMat);
    pelvis.castShadow = true;
    pelvisGroup.add(pelvis);

    const belt = new THREE.Mesh(track(new THREE.BoxGeometry(0.49, 0.075, 0.32)), accentMat);
    belt.position.y = 0.07;
    pelvisGroup.add(belt);

    // Upper Torso Pivot
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.10, 0);
    pelvisGroup.add(torsoGroup);

    const torso = new THREE.Mesh(torsoGeo, suitWhiteMat);
    torso.position.y = 0.28;
    torso.castShadow = true;
    torsoGroup.add(torso);

    const chest = new THREE.Mesh(chestPackGeo, accentMat);
    chest.position.set(0, 0.30, 0.19);
    torsoGroup.add(chest);

    const chestBtn = new THREE.Mesh(track(new THREE.BoxGeometry(0.08, 0.06, 0.03)), lampMat);
    chestBtn.position.set(0.07, 0.33, 0.24);
    torsoGroup.add(chestBtn);

    // Articulated PLSS Backpack (adds subtle inertia lag during Mars strides & landings)
    const plssGroup = new THREE.Group();
    plssGroup.position.set(0, 0.30, -0.24);
    torsoGroup.add(plssGroup);

    const plss = new THREE.Mesh(plssGeo, suitWhiteMat);
    plss.castShadow = true;
    plssGroup.add(plss);

    [-0.12, 0.12].forEach((tx) => {
      const bottle = new THREE.Mesh(o2TankGeo, accentMat);
      bottle.position.set(tx, 0, -0.12);
      plssGroup.add(bottle);

      const hose = new THREE.Mesh(
        track(new THREE.TorusGeometry(0.14, 0.025, 6, 12, Math.PI)),
        jointDarkMat,
      );
      hose.position.set(tx * 1.4, 0.18, 0.14);
      hose.rotation.y = Math.PI / 2;
      plssGroup.add(hose);
    });

    const ant = new THREE.Mesh(track(new THREE.CylinderGeometry(0.015, 0.02, 0.34, 6)), metalTrimMat);
    ant.position.set(0.18, 0.42, -0.02);
    plssGroup.add(ant);

    // Helmet & Gold Visor
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.72, 0);

    const neckRing = new THREE.Mesh(track(new THREE.TorusGeometry(0.17, 0.04, 8, 16)), accentMat);
    neckRing.rotation.x = Math.PI / 2;
    neckRing.position.y = -0.15;
    headGroup.add(neckRing);

    const helmet = new THREE.Mesh(helmetGeo, suitWhiteMat);
    helmet.castShadow = true;
    headGroup.add(helmet);

    const visor = new THREE.Mesh(visorGeo, visorGoldMat);
    visor.position.set(0, 0.01, 0.06);
    visor.rotation.y = Math.PI / 2;
    headGroup.add(visor);

    const headlamp = new THREE.Mesh(track(new THREE.BoxGeometry(0.12, 0.07, 0.08)), lampMat);
    headlamp.position.set(0, 0.23, 0.2);
    headGroup.add(headlamp);
    torsoGroup.add(headGroup);

    // Multi-Joint Arms (Shoulder -> Upper Arm -> Elbow -> Forearm -> Glove + Handheld Tool)
    const createArm = (side: -1 | 1) => {
      const upperArm = new THREE.Group();
      upperArm.position.set(side * 0.35, 0.46, 0);

      const shoulder = new THREE.Mesh(jointBallGeo, accentMat);
      upperArm.add(shoulder);

      const bicep = new THREE.Mesh(upperArmGeo, suitWhiteMat);
      bicep.position.y = -0.14;
      bicep.castShadow = true;
      upperArm.add(bicep);

      const forearm = new THREE.Group();
      forearm.position.set(0, -0.27, 0);

      const elbow = new THREE.Mesh(jointBallGeo, jointDarkMat);
      elbow.scale.setScalar(0.8);
      forearm.add(elbow);

      const lower = new THREE.Mesh(forearmGeo, suitWhiteMat);
      lower.position.y = -0.12;
      lower.castShadow = true;
      forearm.add(lower);

      const cuff = new THREE.Mesh(track(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 8)), accentMat);
      cuff.position.y = -0.22;
      forearm.add(cuff);

      const glove = new THREE.Mesh(track(new THREE.SphereGeometry(0.086, 10, 8)), jointDarkMat);
      glove.position.y = -0.28;
      forearm.add(glove);

      upperArm.add(forearm);
      torsoGroup.add(upperArm);
      return { upperArm, forearm };
    };

    const leftArm = createArm(-1);
    const rightArm = createArm(1);

    // Right-hand attachable exploration tools
    const handTools: Record<ExplorationToolId, THREE.Object3D> = {
      scanner: (() => {
        const g = new THREE.Group();
        const wand = new THREE.Mesh(track(new THREE.BoxGeometry(0.08, 0.07, 0.26)), metalTrimMat);
        wand.position.set(0, -0.28, 0.14);
        const tip = new THREE.Mesh(track(new THREE.SphereGeometry(0.045, 8, 6)), toolGlowMat);
        tip.position.set(0, -0.28, 0.28);
        g.add(wand, tip);
        return g;
      })(),
      sample_collector: (() => {
        const g = new THREE.Group();
        const handle = new THREE.Mesh(track(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 6)), metalTrimMat);
        handle.rotation.x = Math.PI / 2;
        handle.position.set(0, -0.28, 0.15);
        const scoop = new THREE.Mesh(track(new THREE.BoxGeometry(0.11, 0.05, 0.12)), accentMat);
        scoop.position.set(0, -0.28, 0.32);
        g.add(handle, scoop);
        return g;
      })(),
      camera: (() => {
        const g = new THREE.Group();
        const cam = new THREE.Mesh(track(new THREE.BoxGeometry(0.14, 0.10, 0.10)), jointDarkMat);
        cam.position.set(0, -0.28, 0.12);
        const lens = new THREE.Mesh(track(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 8)), toolGlowMat);
        lens.rotation.x = Math.PI / 2;
        lens.position.set(0, -0.28, 0.19);
        g.add(cam, lens);
        return g;
      })(),
      signal_detector: (() => {
        const g = new THREE.Group();
        const pod = new THREE.Mesh(track(new THREE.BoxGeometry(0.09, 0.11, 0.12)), accentMat);
        pod.position.set(0, -0.28, 0.11);
        const dish = new THREE.Mesh(track(new THREE.ConeGeometry(0.09, 0.08, 10)), metalTrimMat);
        dish.rotation.x = -Math.PI / 2;
        dish.position.set(0, -0.28, 0.20);
        g.add(pod, dish);
        return g;
      })(),
      drone: new THREE.Group(),
      flashlight: (() => {
        const g = new THREE.Group();
        const body = new THREE.Mesh(track(new THREE.CylinderGeometry(0.032, 0.032, 0.22, 8)), jointDarkMat);
        body.rotation.x = Math.PI / 2;
        body.position.set(0, -0.28, 0.11);
        const lens = new THREE.Mesh(track(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 8)), lampMat);
        lens.rotation.x = Math.PI / 2;
        lens.position.set(0, -0.28, 0.22);
        g.add(body, lens);
        return g;
      })(),
    };
    (Object.values(handTools) as THREE.Object3D[]).forEach((t) => {
      t.visible = false;
      rightArm.forearm.add(t);
    });

    // Multi-Joint Legs (Hip -> Thigh [0.34] -> Knee -> Shin [0.30] -> Ankle -> Boot [0.08 drop])
    const createLeg = (side: -1 | 1) => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.145, STANDING_HIP_HEIGHT, 0);

      const hipBall = new THREE.Mesh(jointBallGeo, jointDarkMat);
      hipBall.scale.setScalar(0.84);
      hip.add(hipBall);

      const thigh = new THREE.Mesh(thighGeo, suitWhiteMat);
      thigh.position.y = -THIGH_LEN * 0.5;
      thigh.castShadow = true;
      hip.add(thigh);

      const knee = new THREE.Group();
      knee.position.set(0, -THIGH_LEN, 0);

      const kneeCap = new THREE.Mesh(jointBallGeo, accentMat);
      kneeCap.scale.setScalar(0.86);
      kneeCap.position.set(0, 0, 0.025);
      knee.add(kneeCap);

      const shin = new THREE.Mesh(shinGeo, suitWhiteMat);
      shin.position.y = -SHIN_LEN * 0.5;
      shin.castShadow = true;
      knee.add(shin);

      const ankle = new THREE.Group();
      ankle.position.set(0, -SHIN_LEN, 0);

      const boot = new THREE.Mesh(bootGeo, jointDarkMat);
      boot.position.set(0, -0.025, 0.045);
      boot.castShadow = true;
      ankle.add(boot);

      const sole = new THREE.Mesh(bootSoleGeo, bootSoleMat);
      sole.position.set(0, -0.064, 0.045); // Bottom face sits strictly at -0.080m from ankle
      sole.castShadow = true;
      ankle.add(sole);

      knee.add(ankle);
      hip.add(knee);
      bodyPivot.add(hip);
      return { hip, knee, ankle };
    };

    const leftLeg = createLeg(-1);
    const rightLeg = createLeg(1);

    // Carried supply crate in front of torso
    const carryItemMesh = new THREE.Mesh(track(new THREE.BoxGeometry(0.42, 0.30, 0.32)), carryMat);
    carryItemMesh.position.set(0, 0.14, 0.44);
    carryItemMesh.visible = false;
    torsoGroup.add(carryItemMesh);

    group.add(root);
    return {
      id,
      root,
      bodyPivot,
      pelvisGroup,
      torsoGroup,
      plssGroup,
      headGroup,
      leftUpperArm: leftArm.upperArm,
      leftForearm: leftArm.forearm,
      rightUpperArm: rightArm.upperArm,
      rightForearm: rightArm.forearm,
      leftHip: leftLeg.hip,
      leftKnee: leftLeg.knee,
      leftAnkle: leftLeg.ankle,
      rightHip: rightLeg.hip,
      rightKnee: rightLeg.knee,
      rightAnkle: rightLeg.ankle,
      carryItemMesh,
      handTools,
    };
  };

  const rigs: Record<CharacterId, AstronautRig> = {
    alex: buildAstronaut('alex', 1.0),
    leo: buildAstronaut('leo', 1.0),
    maya: buildAstronaut('maya', 0.98),
    zara: buildAstronaut('zara', 0.98),
    ryan: buildAstronaut('ryan', 1.0),
    nova: buildAstronaut('nova', 1.12),
  };

  // Active Astronaut Helmet Headlamp
  const suitSpot = new THREE.SpotLight('#fef3c7', 0, 26, 0.56, 0.45, 1.3);
  const suitSpotTarget = new THREE.Object3D();
  group.add(suitSpot, suitSpotTarget);
  suitSpot.target = suitSpotTarget;

  // Pooled Footstep Dust Puffs
  const puffCount = 42;
  const puffCoords = new Float32Array(puffCount * 3);
  const puffLife = new Float32Array(puffCount);
  let puffCursor = 0;
  const puffGeo = track(new THREE.BufferGeometry());
  puffGeo.setAttribute('position', new THREE.BufferAttribute(puffCoords, 3));
  const puffMat = track(
    new THREE.PointsMaterial({
      color: '#e59568',
      map: textures.softDustMote,
      size: 0.58,
      transparent: true,
      opacity: 0.5,
      alphaTest: 0.01,
      depthWrite: false,
    }),
  );
  const puffPoints = new THREE.Points(puffGeo, puffMat);
  puffPoints.frustumCulled = false;
  group.add(puffPoints);

  const spawnDustPuff = (x: number, y: number, z: number, amount = 3) => {
    for (let k = 0; k < amount; k++) {
      const idx = puffCursor % puffCount;
      puffCursor++;
      puffCoords[idx * 3] = x + (Math.random() - 0.5) * 0.32;
      puffCoords[idx * 3 + 1] = y + 0.06 + Math.random() * 0.08;
      puffCoords[idx * 3 + 2] = z + (Math.random() - 0.5) * 0.32;
      puffLife[idx] = 1.0;
    }
  };

  // Persistent Martian Boot Footprints (180 pooled InstancedMesh decals)
  const footprintCount = 180;
  const footprintGeo = track(new THREE.PlaneGeometry(0.22, 0.34));
  footprintGeo.rotateX(-Math.PI / 2);
  const footprintMat = track(
    new THREE.MeshBasicMaterial({
      color: '#6b2d18',
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  const footprintMesh = new THREE.InstancedMesh(footprintGeo, footprintMat, footprintCount);
  footprintMesh.frustumCulled = false;
  let footprintCursor = 0;
  for (let i = 0; i < footprintCount; i++) {
    _dummy.position.set(0, -100, 0);
    _dummy.scale.setScalar(0.001);
    _dummy.updateMatrix();
    footprintMesh.setMatrixAt(i, _dummy.matrix);
  }
  footprintMesh.instanceMatrix.needsUpdate = true;
  group.add(footprintMesh);

  const stampFootprint = (x: number, y: number, z: number, yaw: number, side: -1 | 1) => {
    const idx = footprintCursor % footprintCount;
    footprintCursor++;
    const latX = Math.cos(yaw) * side * 0.15;
    const latZ = -Math.sin(yaw) * side * 0.15;
    const fx = x + latX;
    const fz = z + latZ;
    const fy = groundHeightAt(fx, fz) + 0.025;
    _dummy.position.set(fx, Math.max(y + 0.02, fy), fz);
    _dummy.rotation.set(0, yaw, 0);
    _dummy.scale.set(1, 1, 1);
    _dummy.updateMatrix();
    footprintMesh.setMatrixAt(idx, _dummy.matrix);
    footprintMesh.instanceMatrix.needsUpdate = true;
  };

  // Animation & Kinematics State
  const playerVel = new THREE.Vector3();
  const moveVec = new THREE.Vector3();
  let walkCycle = 0;
  let lastStepHalfCycle = 0;
  let jumpHeight = 0;
  let jumpVelY = 0;
  let jumpPrepTimer = 0;
  let jumpPhase: 'grounded' | 'prep' | 'airborne' = 'grounded';
  let landingCompression = 0;
  let stepClimbBoost = 0;
  let prevFloorY = groundHeightAt(CHARACTERS_INFO.alex.homePos[0], CHARACTERS_INFO.alex.homePos[2]);
  let yawRate = 0;
  let prevYaw = CHARACTERS_INFO.alex.rotY;
  let stopSettle = 0;
  let wasMoving = false;
  let currentInsideBuilding: BuildingId | null = null;
  let prevInsideBuilding: BuildingId | null = null;

  // One-shot contextual action animation state
  let activeActionAnim: AstronautActionAnim = 'none';
  let actionAnimTimer = 0;
  let lastStateActionCounter = 0;

  const triggerActionAnim = (anim: AstronautActionAnim, duration = 0.85) => {
    activeActionAnim = anim;
    actionAnimTimer = duration;
  };

  let npcAgents: Record<CrewNpcId, NpcAgentMemory> = createInitialNpcAgents();
  const npcStatuses: NpcRuntimeStatus[] = CREW_NPC_ORDER.map((id) => ({
    id,
    name: CHARACTERS_INFO[id].name,
    role: CHARACTERS_INFO[id].role,
    state: 'idle',
    taskLabel: 'On Standby',
    buildingId: 'crew_home',
    x: rigs[id].root.position.x,
    z: rigs[id].root.position.z,
  }));

  const getGroundY = (x: number, z: number): number => {
    const base = groundHeightAt(x, z);
    const inside = detectInsideBuilding(x, z);
    if (inside) {
      return Math.max(base, BUILDING_ZONES[inside].interiorFloorY);
    }
    return base;
  };

  let novaWalkCycle = 0;
  let prevAlexCutsceneX: number | null = null;
  let prevAlexCutsceneZ: number | null = null;
  let alexCutsceneSpeed = 0;
  let prevNovaCutsceneX: number | null = null;
  let prevNovaCutsceneZ: number | null = null;
  let novaCutsceneSpeed = 0;

  const update: CharactersHandles['update'] = (
    elapsed,
    dt,
    input,
    cameraYaw,
    state,
    roverPos,
    onFootstep,
    roverYaw = 0,
  ) => {
    rigs.nova.root.visible = state.novaPresent || Boolean(state.novaSeatedInRover);

    if (state.actionAnimCounter !== lastStateActionCounter) {
      lastStateActionCounter = state.actionAnimCounter;
      if (state.actionAnim !== 'none') {
        triggerActionAnim(
          state.actionAnim,
          state.actionAnim === 'collect_sample'
            ? 1.05
            : state.actionAnim === 'repair'
              ? 1.15
              : state.actionAnim === 'use_scanner'
                ? 1.2
                : 0.75,
        );
      }
    }
    if (actionAnimTimer > 0) {
      actionAnimTimer = Math.max(0, actionAnimTimer - dt);
      if (actionAnimTimer <= 0) activeActionAnim = 'none';
    }

    // ONLY ONE playable hero: Alex
    const activeRig = rigs.alex;
    rigs.alex.root.visible = !state.drivingRover || Boolean(state.alexSeatedInRover);
    const unlockedSet = state.unlockedCrewIds;
    CREW_NPC_ORDER.forEach((npcId) => {
      rigs[npcId].root.visible = !unlockedSet || unlockedSet.includes(npcId);
    });

    if (state.alexSeatedInRover && roverPos) {
      // Alex visibly sits in driver seat inside the MEV cockpit during Scene 2 entry & boot
      const sinR = Math.sin(roverYaw);
      const cosR = Math.cos(roverYaw);
      const seatLocalX = -0.44;
      const seatLocalZ = 0.34;
      activeRig.root.position.set(
        roverPos.x + seatLocalX * cosR + seatLocalZ * sinR,
        roverPos.y + 0.56,
        roverPos.z - seatLocalX * sinR + seatLocalZ * cosR,
      );
      activeRig.root.rotation.set(0, roverYaw, 0);
      activeRig.leftHip.rotation.x = THREE.MathUtils.damp(activeRig.leftHip.rotation.x, -1.38, 12, dt);
      activeRig.rightHip.rotation.x = THREE.MathUtils.damp(activeRig.rightHip.rotation.x, -1.38, 12, dt);
      activeRig.leftKnee.rotation.x = THREE.MathUtils.damp(activeRig.leftKnee.rotation.x, 1.48, 12, dt);
      activeRig.rightKnee.rotation.x = THREE.MathUtils.damp(activeRig.rightKnee.rotation.x, 1.48, 12, dt);
      activeRig.leftAnkle.rotation.x = THREE.MathUtils.damp(activeRig.leftAnkle.rotation.x, -0.1, 12, dt);
      activeRig.rightAnkle.rotation.x = THREE.MathUtils.damp(activeRig.rightAnkle.rotation.x, -0.1, 12, dt);
      activeRig.leftUpperArm.rotation.x = THREE.MathUtils.damp(activeRig.leftUpperArm.rotation.x, -0.82, 10, dt);
      activeRig.rightUpperArm.rotation.x = THREE.MathUtils.damp(activeRig.rightUpperArm.rotation.x, -0.82, 10, dt);
      activeRig.leftForearm.rotation.x = THREE.MathUtils.damp(activeRig.leftForearm.rotation.x, -0.45, 10, dt);
      activeRig.rightForearm.rotation.x = THREE.MathUtils.damp(activeRig.rightForearm.rotation.x, -0.45, 10, dt);
      activeRig.torsoGroup.rotation.x = THREE.MathUtils.damp(activeRig.torsoGroup.rotation.x, -0.06, 10, dt);
      activeRig.headGroup.rotation.y = Math.sin(elapsed * 1.4) * 0.12;
      activeRig.bodyPivot.position.y = 0;
      (Object.keys(activeRig.handTools) as ExplorationToolId[]).forEach((tid) => {
        activeRig.handTools[tid].visible = false;
      });
    } else if (state.drivingRover && roverPos) {
      activeRig.root.position.copy(roverPos);
      currentInsideBuilding = null;
      playerVel.set(0, 0, 0);
      jumpHeight = 0;
      jumpVelY = 0;
      jumpPhase = 'grounded';
    } else if (state.alexPosOverride) {
      // Cutscene scripted choreography override with ZERO foot-sliding displacement sync
      const [ox, oz] = state.alexPosOverride;
      const oy = getGroundY(ox, oz);

      let frameSpeed = state.alexWalkSpeed ?? 0;
      if (prevAlexCutsceneX !== null && prevAlexCutsceneZ !== null && dt > 0.001) {
        const disp = Math.hypot(ox - prevAlexCutsceneX, oz - prevAlexCutsceneZ);
        if (disp < 4.5) {
          frameSpeed = disp / dt;
        }
      }
      prevAlexCutsceneX = ox;
      prevAlexCutsceneZ = oz;
      alexCutsceneSpeed = THREE.MathUtils.damp(alexCutsceneSpeed, frameSpeed, 14, dt);

      activeRig.root.position.set(ox, oy, oz);
      if (state.alexYawOverride !== undefined && state.alexYawOverride !== null) {
        let diff = state.alexYawOverride - activeRig.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        activeRig.root.rotation.y += diff * Math.min(1, dt * 8.5);
      }

      const wSpeed = alexCutsceneSpeed;
      const cAction = state.alexActionOverride ?? activeActionAnim;
      const breath = Math.sin(elapsed * 2.0);
      let tLH = 0;
      let tRH = 0;
      let tLK = 0.08;
      let tRK = 0.08;
      let tLA = 0;
      let tRA = 0;
      let tLArm = 0.03 * breath;
      let tRArm = -0.03 * breath;
      let tLFore = -0.28;
      let tRFore = -0.28;
      let tTorsoX = 0.04 + breath * 0.02;
      let tTorsoZ = 0;
      let tPelvisY = 0;
      let tPelvisZ = 0;
      let tHeadX = 0;
      let tHeadY = Math.sin(elapsed * 0.7) * 0.08;

      if (wSpeed > 0.14) {
        const amp = Math.min(0.52, 0.24 + wSpeed * 0.11);
        const stride = Math.max(0.7, 3.65 * Math.sin(amp) * (THIGH_LEN + SHIN_LEN));
        walkCycle += (wSpeed / stride) * Math.PI * 2 * dt;
        const stepIdx = Math.floor(walkCycle / Math.PI);
        if (stepIdx !== lastStepHalfCycle) {
          lastStepHalfCycle = stepIdx;
          const stepSide: -1 | 1 = stepIdx % 2 === 0 ? -1 : 1;
          stampFootprint(ox, oy, oz, activeRig.root.rotation.y, stepSide);
          onFootstep?.(false, false);
        }
        const rawS = Math.sin(walkCycle);
        const s = rawS * (1 + 0.16 * (1 - rawS * rawS));
        const c = Math.cos(walkCycle);
        tLH = s * amp;
        tRH = -s * amp;
        tLK = 0.12 + Math.max(0, -c) * 0.78 + Math.max(0, s) * 0.16;
        tRK = 0.12 + Math.max(0, c) * 0.78 + Math.max(0, -s) * 0.16;
        tLA = -tLH * 0.36 - tLK * 0.36 + Math.max(0, -s) * 0.2;
        tRA = -tRH * 0.36 - tRK * 0.36 + Math.max(0, s) * 0.2;
        tLArm = -s * 0.46;
        tRArm = s * 0.46;
        tLFore = -0.44 - Math.max(0, -s) * 0.28;
        tRFore = -0.44 - Math.max(0, s) * 0.28;
        tTorsoX = 0.07 + Math.min(0.08, wSpeed * 0.025);
        tTorsoZ = rawS * 0.025;
        tPelvisY = -s * 0.085;
        tPelvisZ = c * 0.038;
        tHeadY = 0;
      } else if (cAction === 'collect_sample') {
        // Grounded kneel and inspect lower panel / sample
        tLH = -0.82;
        tLK = 1.42;
        tLA = -0.45;
        tRH = -0.42;
        tRK = 0.92;
        tRA = -0.35;
        tTorsoX = 0.34;
        tLArm = -0.52;
        tLFore = -0.68;
        tRArm = -1.06 + Math.sin(elapsed * 4.5) * 0.08;
        tRFore = -0.34;
        tHeadX = 0.32;
        tHeadY = 0;
      } else if (cAction === 'inspect') {
        tTorsoX = 0.2;
        tHeadX = 0.18;
        tHeadY = Math.sin(elapsed * 2.1) * 0.12;
        tLArm = -0.45;
        tLFore = -0.6;
        tRArm = -0.78;
        tRFore = -0.55;
      } else if (cAction === 'use_scanner') {
        const sweep = Math.sin(elapsed * 4.8) * 0.28;
        tTorsoX = 0.1;
        tRArm = -0.86;
        tRFore = -0.45 + sweep * 0.25;
        tHeadY = sweep * 0.55;
        tHeadX = 0.1;
      } else if (cAction === 'point_malfunction') {
        tTorsoX = 0.08;
        tRArm = -1.28 + Math.sin(elapsed * 3.5) * 0.06;
        tRFore = -0.14;
        tLArm = -0.18;
        tHeadX = 0.06;
      } else if (cAction === 'open_panel' || cAction === 'interact_panel' || cAction === 'repair') {
        const work = cAction === 'repair' ? Math.sin(elapsed * 8.5) * 0.18 : Math.sin(elapsed * 3.5) * 0.06;
        tTorsoX = 0.14;
        tLArm = -0.86;
        tLFore = -0.46;
        tRArm = -0.94 + work;
        tRFore = -0.48 - work * 0.4;
        tHeadX = 0.12;
      } else if (cAction === 'boarding_left' || cAction === 'boarding_right' || cAction === 'exiting_vehicle') {
        // Natural step-up onto cab sill + hand grasping grab-handle
        const stepPhase = 0.5 + 0.5 * Math.sin(elapsed * 5.2);
        tLH = -0.62 - stepPhase * 0.25;
        tLK = 1.05 + stepPhase * 0.2;
        tLA = -0.22;
        tRH = -0.35 + stepPhase * 0.18;
        tRK = 0.65;
        tTorsoX = 0.2;
        tLArm = -1.08;
        tLFore = -0.52;
        tRArm = -0.92;
        tRFore = -0.45;
      } else if (cAction === 'communicate') {
        tRArm = -1.05 + Math.sin(elapsed * 4.2) * 0.1;
        tRFore = -0.98;
      }

      if (state.carryingItem) {
        // Two-hand cradle carry synchronized naturally with walk sway
        const carryBob = wSpeed > 0.14 ? Math.sin(walkCycle * 2) * 0.04 : 0;
        tLArm = -0.88 + carryBob;
        tRArm = -0.88 + carryBob;
        tLFore = -0.72;
        tRFore = -0.72;
        tTorsoX -= 0.04;
      }

      activeRig.leftHip.rotation.x = THREE.MathUtils.damp(activeRig.leftHip.rotation.x, tLH, 11, dt);
      activeRig.rightHip.rotation.x = THREE.MathUtils.damp(activeRig.rightHip.rotation.x, tRH, 11, dt);
      activeRig.leftKnee.rotation.x = THREE.MathUtils.damp(activeRig.leftKnee.rotation.x, tLK, 11, dt);
      activeRig.rightKnee.rotation.x = THREE.MathUtils.damp(activeRig.rightKnee.rotation.x, tRK, 11, dt);
      activeRig.leftAnkle.rotation.x = THREE.MathUtils.damp(activeRig.leftAnkle.rotation.x, tLA, 11, dt);
      activeRig.rightAnkle.rotation.x = THREE.MathUtils.damp(activeRig.rightAnkle.rotation.x, tRA, 11, dt);
      activeRig.leftUpperArm.rotation.x = THREE.MathUtils.damp(activeRig.leftUpperArm.rotation.x, tLArm, 10, dt);
      activeRig.rightUpperArm.rotation.x = THREE.MathUtils.damp(activeRig.rightUpperArm.rotation.x, tRArm, 10, dt);
      activeRig.leftForearm.rotation.x = THREE.MathUtils.damp(activeRig.leftForearm.rotation.x, tLFore, 10, dt);
      activeRig.rightForearm.rotation.x = THREE.MathUtils.damp(activeRig.rightForearm.rotation.x, tRFore, 10, dt);
      activeRig.torsoGroup.rotation.x = THREE.MathUtils.damp(activeRig.torsoGroup.rotation.x, tTorsoX, 9, dt);
      activeRig.torsoGroup.rotation.z = THREE.MathUtils.damp(activeRig.torsoGroup.rotation.z, tTorsoZ, 9, dt);
      activeRig.pelvisGroup.rotation.y = THREE.MathUtils.damp(activeRig.pelvisGroup.rotation.y, tPelvisY, 9, dt);
      activeRig.pelvisGroup.rotation.z = THREE.MathUtils.damp(activeRig.pelvisGroup.rotation.z, tPelvisZ, 9, dt);
      activeRig.headGroup.rotation.x = THREE.MathUtils.damp(activeRig.headGroup.rotation.x, tHeadX, 8, dt);
      activeRig.headGroup.rotation.y = THREE.MathUtils.damp(activeRig.headGroup.rotation.y, tHeadY, 8, dt);
      const lDrop = THIGH_LEN * Math.cos(activeRig.leftHip.rotation.x) + SHIN_LEN * Math.cos(activeRig.leftHip.rotation.x + activeRig.leftKnee.rotation.x) + ANKLE_DROP;
      const rDrop = THIGH_LEN * Math.cos(activeRig.rightHip.rotation.x) + SHIN_LEN * Math.cos(activeRig.rightHip.rotation.x + activeRig.rightKnee.rotation.x) + ANKLE_DROP;
      activeRig.bodyPivot.position.y = Math.max(lDrop, rDrop) - STANDING_HIP_HEIGHT;
      (Object.keys(activeRig.handTools) as ExplorationToolId[]).forEach((tid) => {
        activeRig.handTools[tid].visible = cAction === 'use_scanner' && tid === 'scanner';
      });
    } else {
      prevAlexCutsceneX = null;
      prevAlexCutsceneZ = null;
      alexCutsceneSpeed = 0;
      // 1. Movement & Mars 3.71 m/s² Physics
      const sinY = Math.sin(cameraYaw);
      const cosY = Math.cos(cameraYaw);
      moveVec.set(
        input.forward * -sinY + input.right * cosY,
        0,
        input.forward * -cosY + input.right * -sinY,
      );

      const inputMag = Math.min(1, moveVec.length());
      const curSurf = surfaceTypeAt(activeRig.root.position.x, activeRig.root.position.z);
      const surfMult = currentInsideBuilding ? 1.0 : SURFACE_SPEED_MULT[curSurf];
      const stormMult = currentInsideBuilding ? 1.0 : STORM_STAGE_SPECS[state.stormStage].outdoorSpeedMult;
      const baseSpeed = state.crouched
        ? MARS_CROUCH_SPEED
        : input.sprint
          ? MARS_SPRINT_SPEED
          : inputMag > 0.78
            ? MARS_WALK_SPEED
            : MARS_WALK_SPEED * 0.78;

      const moveSpeed = baseSpeed * surfMult * stormMult * (inputMag > 0.05 ? Math.max(0.35, inputMag) : 0);
      if (moveVec.lengthSq() > 0.002) {
        moveVec.normalize().multiplyScalar(moveSpeed);
      } else {
        moveVec.set(0, 0, 0);
      }

      const dampRate = moveVec.lengthSq() > 0.01 ? SUIT_ACCEL_DAMP : SUIT_DECEL_DAMP;
      playerVel.x = THREE.MathUtils.damp(playerVel.x, moveVec.x, dampRate, dt);
      playerVel.z = THREE.MathUtils.damp(playerVel.z, moveVec.z, dampRate, dt);

      const rawX = activeRig.root.position.x + playerVel.x * dt;
      const rawZ = activeRig.root.position.z + playerVel.z * dt;
      const resolved = resolveCharacterCollisions(rawX, rawZ, 0.42);
      const nx = resolved.x;
      const nz = resolved.z;

      currentInsideBuilding = detectInsideBuilding(nx, nz);
      if (currentInsideBuilding !== prevInsideBuilding) {
        prevInsideBuilding = currentInsideBuilding;
        if (activeActionAnim === 'none') {
          triggerActionAnim('enter_exit', 0.65);
        }
      }

      // 2. Jump State Machine (Prep Knee Compression -> Push-off -> 3.71 m/s² Arc -> Landing Absorb)
      if (input.jump && jumpPhase === 'grounded' && jumpHeight <= 0.01 && !state.crouched) {
        jumpPhase = 'prep';
        jumpPrepTimer = MARS_JUMP_PREP_TIME;
      }

      if (jumpPhase === 'prep') {
        jumpPrepTimer -= dt;
        if (jumpPrepTimer <= 0) {
          jumpPhase = 'airborne';
          jumpVelY = MARS_JUMP_IMPULSE;
          if (!currentInsideBuilding) {
            spawnDustPuff(nx, getGroundY(nx, nz), nz, 4);
          }
        }
      } else if (jumpPhase === 'airborne') {
        jumpVelY -= MARS_GRAVITY * dt;
        jumpHeight += jumpVelY * dt;
        if (jumpHeight <= 0) {
          jumpHeight = 0;
          if (jumpVelY < -0.9) {
            landingCompression = Math.min(1.0, Math.abs(jumpVelY) / 3.2);
            if (!currentInsideBuilding) {
              spawnDustPuff(nx, getGroundY(nx, nz), nz, 5);
              stampFootprint(nx, getGroundY(nx, nz), nz, activeRig.root.rotation.y, -1);
              stampFootprint(nx, getGroundY(nx, nz), nz, activeRig.root.rotation.y, 1);
            }
            onFootstep?.(true, Boolean(currentInsideBuilding));
          }
          jumpVelY = 0;
          jumpPhase = 'grounded';
        }
      }
      landingCompression = THREE.MathUtils.damp(landingCompression, 0, 7.5, dt);

      const floorY = getGroundY(nx, nz);
      const floorStepDelta = floorY - prevFloorY;
      prevFloorY = floorY;
      if (floorStepDelta > 0.035 && jumpPhase === 'grounded') {
        stepClimbBoost = Math.min(1, stepClimbBoost + floorStepDelta * 6.5);
      }
      stepClimbBoost = THREE.MathUtils.damp(stepClimbBoost, 0, 8.0, dt);

      activeRig.root.position.set(nx, floorY + jumpHeight, nz);

      // Compute terrain slope along facing direction for uphill/downhill posture & ankle match
      const lookYaw = activeRig.root.rotation.y;
      const fwdX = Math.sin(lookYaw);
      const fwdZ = Math.cos(lookYaw);
      const hAhead = groundHeightAt(nx + fwdX * 0.55, nz + fwdZ * 0.55);
      const hBehind = groundHeightAt(nx - fwdX * 0.55, nz - fwdZ * 0.55);
      const slopeAngle = currentInsideBuilding
        ? 0
        : THREE.MathUtils.clamp(Math.atan2(hAhead - hBehind, 1.1), -0.45, 0.45);

      const speed = Math.hypot(playerVel.x, playerVel.z);
      const isMoving = speed > 0.28;
      if (wasMoving && !isMoving && jumpPhase === 'grounded') {
        stopSettle = 1.0;
      }
      wasMoving = isMoving;
      stopSettle = THREE.MathUtils.damp(stopSettle, 0, 7.0, dt);

      // Smooth yaw turning + angular velocity banking
      if (isMoving) {
        const targetAngle = Math.atan2(playerVel.x, playerVel.z);
        let diff = targetAngle - activeRig.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        activeRig.root.rotation.y += diff * Math.min(1, dt * 8.5);
      }
      let dyaw = activeRig.root.rotation.y - prevYaw;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      prevYaw = activeRig.root.rotation.y;
      yawRate = THREE.MathUtils.damp(yawRate, THREE.MathUtils.clamp(dyaw / Math.max(0.008, dt), -4, 4), 10, dt);

      // 3. Target Joint Pose Computation (25 Blended Animations!)
      const isSand = curSurf === 'sand' && !currentInsideBuilding;
      const isIce = curSurf === 'ice' && !currentInsideBuilding;
      const isRun = speed > MARS_JOG_SPEED * 0.92;
      const isJog = speed > MARS_WALK_SPEED * 0.95 && !isRun;

      let tLeftHipX = 0;
      let tRightHipX = 0;
      let tLeftKneeX = 0.08;
      let tRightKneeX = 0.08;
      let tLeftAnkleX = -slopeAngle * 0.5;
      let tRightAnkleX = -slopeAngle * 0.5;
      let tLeftArmX = 0;
      let tRightArmX = 0;
      let tLeftForeX = -0.26;
      let tRightForeX = -0.26;
      let tTorsoX = 0.04;
      let tTorsoZ = 0;
      let tPelvisY = 0;
      let tPelvisZ = 0;
      let tHeadX = 0;
      let tHeadY = 0;
      let tPlssLagX = 0;

      if (jumpPhase === 'prep') {
        // Pre-jump compression crouch
        tLeftHipX = -0.68;
        tRightHipX = -0.68;
        tLeftKneeX = 1.25;
        tRightKneeX = 1.25;
        tLeftAnkleX = -0.52;
        tRightAnkleX = -0.52;
        tTorsoX = 0.26;
        tLeftArmX = 0.42;
        tRightArmX = 0.42;
        tLeftForeX = -0.55;
        tRightForeX = -0.55;
        tPlssLagX = -0.06;
      } else if (jumpPhase === 'airborne') {
        // Distinct lower-gravity Martian airborne phase (ascent -> apex -> descent landing prep)
        const ascending = jumpVelY > 0.38;
        const nearApex = Math.abs(jumpVelY) <= 0.38;
        if (ascending) {
          tLeftHipX = -0.62;
          tRightHipX = 0.16;
          tLeftKneeX = 0.98;
          tRightKneeX = 0.26;
          tLeftAnkleX = 0.26;
          tRightAnkleX = 0.34;
          tLeftArmX = -1.18;
          tRightArmX = -0.76;
          tTorsoX = -0.05;
        } else if (nearApex) {
          // Graceful low-gravity 3.71 m/s^2 Martian apex float & arm balance
          tLeftHipX = -0.4;
          tRightHipX = -0.2;
          tLeftKneeX = 0.68;
          tRightKneeX = 0.54;
          tLeftAnkleX = 0.2;
          tRightAnkleX = 0.2;
          tLeftArmX = -0.78;
          tRightArmX = -0.78;
          tTorsoX = 0.05;
        } else {
          // Preparing boots & knees for weighted shock-absorbing touchdown
          tLeftHipX = -0.46;
          tRightHipX = -0.28;
          tLeftKneeX = 0.58;
          tRightKneeX = 0.44;
          tLeftAnkleX = -0.18;
          tRightAnkleX = -0.18;
          tLeftArmX = -0.48;
          tRightArmX = -0.48;
          tTorsoX = 0.17;
        }
        tLeftForeX = -0.64;
        tRightForeX = -0.64;
        tPlssLagX = THREE.MathUtils.clamp(-jumpVelY * 0.036, -0.14, 0.14);
      } else if (isMoving) {
        // ZERO FOOT-SLIDING STRIDE ADVANCE: angular cycle locked strictly to distance traveled + Martian weight-transfer dwell
        const baseAmp = state.crouched
          ? 0.36
          : isRun
            ? 0.68
            : isJog
              ? 0.58
              : 0.48;
        const slopeKneeLift = Math.max(0, slopeAngle) * 0.58 + stepClimbBoost * 0.4 + (isSand ? 0.16 : 0);
        const strideCircumference = Math.max(0.7, 3.65 * Math.sin(baseAmp) * (THIGH_LEN + SHIN_LEN));
        walkCycle += (speed / strideCircumference) * Math.PI * 2 * dt;

        const stepIdx = Math.floor(walkCycle / Math.PI);
        if (stepIdx !== lastStepHalfCycle) {
          lastStepHalfCycle = stepIdx;
          const stepSide: -1 | 1 = stepIdx % 2 === 0 ? -1 : 1;
          onFootstep?.(isRun, Boolean(currentInsideBuilding));
          if (!currentInsideBuilding) {
            spawnDustPuff(nx, floorY, nz, isSand ? 4 : 2);
            stampFootprint(nx, floorY, nz, activeRig.root.rotation.y, stepSide);
          }
        }

        // Smooth stance-dwell wave so the planted boot pushes solidly off regolith without skating
        const rawS = Math.sin(walkCycle);
        const s = rawS * (1 + 0.16 * (1 - rawS * rawS));
        const c = Math.cos(walkCycle);
        const crouchBias = state.crouched ? 0.42 : 0;

        tLeftHipX = s * baseAmp - crouchBias - slopeAngle * 0.16;
        tRightHipX = -s * baseAmp - crouchBias - slopeAngle * 0.16;

        const swingLiftL = Math.max(0, -c) * (0.8 + slopeKneeLift);
        const swingLiftR = Math.max(0, c) * (0.8 + slopeKneeLift);
        const stanceBendL = Math.max(0, s) * 0.2;
        const stanceBendR = Math.max(0, -s) * 0.2;
        tLeftKneeX = (state.crouched ? 0.85 : 0.12) + swingLiftL + stanceBendL;
        tRightKneeX = (state.crouched ? 0.85 : 0.12) + swingLiftR + stanceBendR;

        // Heel-strike -> flat boot plant -> toe push-off ankle articulation
        tLeftAnkleX = -tLeftHipX * 0.36 - tLeftKneeX * 0.36 - slopeAngle * 0.58 + Math.max(0, -s) * 0.24;
        tRightAnkleX = -tRightHipX * 0.36 - tRightKneeX * 0.36 - slopeAngle * 0.58 + Math.max(0, s) * 0.24;

        // Spacesuit arm coordination (natural counterbalance against PLSS life-support pack)
        const armAmp = isRun ? 0.84 : isJog ? 0.66 : 0.48;
        tLeftArmX = -s * armAmp;
        tRightArmX = s * armAmp;
        tLeftForeX = -0.46 - Math.max(0, -s) * 0.34;
        tRightForeX = -0.46 - Math.max(0, s) * 0.34;

        // Weight shift, subtle pelvic sway & PLSS mass inertia
        tTorsoX =
          (state.crouched ? 0.28 : isRun ? 0.19 : isJog ? 0.13 : 0.08) +
          slopeAngle * 0.34 +
          (isIce ? -0.05 : 0);
        tTorsoZ = -yawRate * 0.048 + Math.sin(walkCycle) * 0.025;
        tPelvisY = -s * 0.092;
        tPelvisZ = Math.cos(walkCycle) * 0.042 - yawRate * 0.03;
        tHeadY = THREE.MathUtils.clamp(yawRate * 0.12, -0.35, 0.35);
        tHeadX = -slopeAngle * 0.25;
        tPlssLagX = Math.abs(c) * 0.055;
      } else {
        // Standing / Idle Breathing / Looking Around / Stop Settle / Landing Knee Recovery / Crouch
        const breath = Math.sin(elapsed * 1.9);
        const lookWave = Math.sin(elapsed * 0.55) * 0.26 + Math.sin(elapsed * 0.23) * 0.14;
        const compress = state.crouched ? 0.88 : landingCompression * 0.92 + stopSettle * 0.16;

        tLeftHipX = -compress * 0.58 - (isSand ? 0.05 : 0);
        tRightHipX = -compress * 0.58 - (isSand ? 0.05 : 0);
        tLeftKneeX = 0.08 + compress * 1.1;
        tRightKneeX = 0.08 + compress * 1.1;
        tLeftAnkleX = -tLeftHipX - tLeftKneeX * 0.5 - slopeAngle * 0.5;
        tRightAnkleX = -tRightHipX - tRightKneeX * 0.5 - slopeAngle * 0.5;

        tTorsoX = (state.crouched ? 0.24 : 0.03) + landingCompression * 0.2 + breath * 0.025;
        tLeftArmX = 0.04 * breath + landingCompression * 0.28;
        tRightArmX = -0.04 * breath + landingCompression * 0.28;
        tLeftForeX = -0.28 - compress * 0.26;
        tRightForeX = -0.28 - compress * 0.26;
        tHeadY = lookWave;
        tHeadX = breath * 0.03;
        tPlssLagX = breath * 0.02 + landingCompression * 0.095;
      }

      // 4. Contextual & Upper-Body Action Animations (Carrying, Tools, Repair, Sample, Door, Comms, Sky, Emergency)
      const emergencyActive =
        state.o2AlarmActive || state.waterLeakActive || state.powerBlackout || state.dustStormActive;

      if (state.carryingItem) {
        tLeftArmX = -0.84;
        tRightArmX = -0.84;
        tLeftForeX = -0.68;
        tRightForeX = -0.68;
        tTorsoX -= 0.06; // Counter-lean for heavy cargo
      } else if (activeActionAnim === 'collect_sample') {
        // Kneel and scoop sample from ground
        tLeftHipX = -0.85;
        tLeftKneeX = 1.45;
        tRightHipX = -0.45;
        tRightKneeX = 0.95;
        tTorsoX = 0.42;
        tRightArmX = -0.95 + Math.sin(elapsed * 8) * 0.18;
        tRightForeX = -0.35;
        tHeadX = 0.35;
      } else if (activeActionAnim === 'use_scanner' || state.activeTool === 'scanner') {
        const sweep = activeActionAnim === 'use_scanner' ? Math.sin(elapsed * 6.5) * 0.35 : Math.sin(elapsed * 1.8) * 0.08;
        tRightArmX = -0.78;
        tRightForeX = -0.48 + sweep * 0.3;
        tHeadY += sweep * 0.45;
      } else if (activeActionAnim === 'repair' || activeActionAnim === 'interact_panel') {
        const work = Math.sin(elapsed * 11) * 0.22;
        tRightArmX = -0.92 + work;
        tRightForeX = -0.58 - work * 0.5;
        tLeftArmX = -0.68;
        tLeftForeX = -0.72;
        tTorsoX = 0.14;
      } else if (activeActionAnim === 'open_door') {
        tRightArmX = -1.05;
        tRightForeX = -0.35;
      } else if (activeActionAnim === 'inspect') {
        tTorsoX = 0.22;
        tHeadX = 0.24;
        tRightArmX = -0.55;
        tRightForeX = -0.65;
      } else if (activeActionAnim === 'enter_exit') {
        tHeadX = Math.sin(elapsed * 7) * 0.1;
      } else if (activeActionAnim === 'communicate' || state.dialogueActive) {
        // Hand near helmet comms / expressive briefing gesture
        tRightArmX = -1.18 + Math.sin(elapsed * 4.5) * 0.12;
        tRightForeX = -1.12;
        tHeadY = Math.sin(elapsed * 2.2) * 0.16;
      } else if (activeActionAnim === 'look_sky' || (!isMoving && !currentInsideBuilding && (state.solProgress > 0.72 || state.solProgress < 0.24))) {
        // Look up at Phobos, Deimos, or Martian Blue Sunset!
        tHeadX = -0.36;
        tHeadY = Math.sin(elapsed * 0.45) * 0.28;
      } else if (emergencyActive && !isMoving) {
        // Alert wind-braced / visor-shielding emergency posture
        tLeftArmX = -0.62;
        tLeftForeX = -0.92;
        tTorsoX = 0.16;
        tHeadY = Math.sin(elapsed * 2.4) * 0.32;
      } else if (state.activeTool !== 'drone') {
        // Holding equipped exploration tool naturally
        tRightArmX = tRightArmX * 0.45 - 0.38;
        tRightForeX = -0.55;
      }

      // 5. Smooth Damped Pose Application + Exact Pelvic Ground-Pinning (ZERO floating/sinking!)
      const blendRate = jumpPhase === 'prep' ? 22 : jumpPhase === 'airborne' ? 9 : 11;
      activeRig.leftHip.rotation.x = THREE.MathUtils.damp(activeRig.leftHip.rotation.x, tLeftHipX, blendRate, dt);
      activeRig.rightHip.rotation.x = THREE.MathUtils.damp(activeRig.rightHip.rotation.x, tRightHipX, blendRate, dt);
      activeRig.leftKnee.rotation.x = THREE.MathUtils.damp(activeRig.leftKnee.rotation.x, tLeftKneeX, blendRate, dt);
      activeRig.rightKnee.rotation.x = THREE.MathUtils.damp(activeRig.rightKnee.rotation.x, tRightKneeX, blendRate, dt);
      activeRig.leftAnkle.rotation.x = THREE.MathUtils.damp(activeRig.leftAnkle.rotation.x, tLeftAnkleX, blendRate, dt);
      activeRig.rightAnkle.rotation.x = THREE.MathUtils.damp(activeRig.rightAnkle.rotation.x, tRightAnkleX, blendRate, dt);

      activeRig.leftUpperArm.rotation.x = THREE.MathUtils.damp(activeRig.leftUpperArm.rotation.x, tLeftArmX, blendRate, dt);
      activeRig.rightUpperArm.rotation.x = THREE.MathUtils.damp(activeRig.rightUpperArm.rotation.x, tRightArmX, blendRate, dt);
      activeRig.leftForearm.rotation.x = THREE.MathUtils.damp(activeRig.leftForearm.rotation.x, tLeftForeX, blendRate, dt);
      activeRig.rightForearm.rotation.x = THREE.MathUtils.damp(activeRig.rightForearm.rotation.x, tRightForeX, blendRate, dt);

      activeRig.torsoGroup.rotation.x = THREE.MathUtils.damp(activeRig.torsoGroup.rotation.x, tTorsoX, 10, dt);
      activeRig.torsoGroup.rotation.z = THREE.MathUtils.damp(activeRig.torsoGroup.rotation.z, tTorsoZ, 10, dt);
      activeRig.pelvisGroup.rotation.y = THREE.MathUtils.damp(activeRig.pelvisGroup.rotation.y, tPelvisY, 10, dt);
      activeRig.pelvisGroup.rotation.z = THREE.MathUtils.damp(activeRig.pelvisGroup.rotation.z, tPelvisZ, 10, dt);
      activeRig.headGroup.rotation.x = THREE.MathUtils.damp(activeRig.headGroup.rotation.x, tHeadX, 8, dt);
      activeRig.headGroup.rotation.y = THREE.MathUtils.damp(activeRig.headGroup.rotation.y, tHeadY, 8, dt);
      activeRig.plssGroup.rotation.x = THREE.MathUtils.damp(activeRig.plssGroup.rotation.x, tPlssLagX, 10, dt);

      // Compute exact downward reach of both articulated legs so the stance boot NEVER floats or sinks!
      const lDrop =
        THIGH_LEN * Math.cos(activeRig.leftHip.rotation.x) +
        SHIN_LEN * Math.cos(activeRig.leftHip.rotation.x + activeRig.leftKnee.rotation.x) +
        ANKLE_DROP;
      const rDrop =
        THIGH_LEN * Math.cos(activeRig.rightHip.rotation.x) +
        SHIN_LEN * Math.cos(activeRig.rightHip.rotation.x + activeRig.rightKnee.rotation.x) +
        ANKLE_DROP;
      const maxReach = Math.max(lDrop, rDrop);
      activeRig.bodyPivot.position.y = maxReach - STANDING_HIP_HEIGHT;

      // Shrink & soften contact shadow subtly during Martian jump arc
      const shadowObj = activeRig.root.getObjectByName('contact_shadow');
      if (shadowObj) {
        const sScale = Math.max(0.55, 1 - jumpHeight * 0.24);
        shadowObj.scale.setScalar(sScale);
        shadowObj.position.y = -jumpHeight + 0.025;
      }

      // Show only Alex's currently equipped right-hand tool (when not carrying a crate)
      (Object.keys(activeRig.handTools) as ExplorationToolId[]).forEach((tid) => {
        activeRig.handTools[tid].visible = !state.carryingItem && state.activeTool === tid;
      });
    }

    // Update Suit Headlamp SpotLight
    const headLightActive = state.flashlightOn && !state.drivingRover && state.screen === 'playing';
    suitSpot.intensity = THREE.MathUtils.damp(suitSpot.intensity, headLightActive ? 6.2 : 0, 8, dt);
    if (headLightActive) {
      const p = activeRig.root.position;
      const ry = activeRig.root.rotation.y;
      suitSpot.position.set(p.x + Math.sin(ry) * 0.25, p.y + 1.66, p.z + Math.cos(ry) * 0.25);
      suitSpotTarget.position.set(p.x + Math.sin(ry) * 10, p.y + 0.55, p.z + Math.cos(ry) * 10);
    }

    // Animate Dust Puffs settling gently under 3.71 m/s² Mars gravity
    const pAttr = puffGeo.attributes.position as THREE.BufferAttribute;
    let anyPuff = false;
    for (let i = 0; i < puffCount; i++) {
      if (puffLife[i] > 0) {
        anyPuff = true;
        puffLife[i] = Math.max(0, puffLife[i] - dt * 1.15);
        puffCoords[i * 3 + 1] += dt * (0.42 * puffLife[i] - 0.24);
        pAttr.setXYZ(i, puffCoords[i * 3], puffCoords[i * 3 + 1], puffCoords[i * 3 + 2]);
      }
    }
    if (anyPuff) pAttr.needsUpdate = true;

    // Carrying supply crate visibility for Alex
    const seatedOrDriving = Boolean(state.alexSeatedInRover || state.drivingRover);
    activeRig.carryItemMesh.visible = !seatedOrDriving && Boolean(state.carryingItem);

    // 6. 4 Independent Crew NPCs (Leo, Maya, Zara, Ryan — visible only as unlocked!)
    CREW_NPC_ORDER.forEach((pid, idx) => {
      const npc = rigs[pid];
      if (!npc.root.visible) return;
      const agent = npcAgents[pid];
      const stepRes = stepNpcAgent(
        agent,
        npc.root.position.x,
        npc.root.position.z,
        dt,
        state,
        activeRig.root.position.x,
        activeRig.root.position.z,
      );

      npc.root.position.x = stepRes.nextX;
      npc.root.position.z = stepRes.nextZ;
      npc.root.position.y = getGroundY(stepRes.nextX, stepRes.nextZ);

      if (stepRes.targetYaw !== null) {
        let diff = stepRes.targetYaw - npc.root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        npc.root.rotation.y += diff * Math.min(1, dt * 6.5);
      }

      if (stepRes.moving) {
        const npcAmp = agent.state === 'emergency' ? 0.58 : 0.45;
        const npcStride = Math.max(0.7, 3.65 * Math.sin(npcAmp) * (THIGH_LEN + SHIN_LEN));
        agent.walkCycle += (stepRes.speed / npcStride) * Math.PI * 2 * dt;

        const s = Math.sin(agent.walkCycle);
        const c = Math.cos(agent.walkCycle);
        npc.leftHip.rotation.x = THREE.MathUtils.damp(npc.leftHip.rotation.x, s * npcAmp, 12, dt);
        npc.rightHip.rotation.x = THREE.MathUtils.damp(npc.rightHip.rotation.x, -s * npcAmp, 12, dt);
        npc.leftKnee.rotation.x = THREE.MathUtils.damp(npc.leftKnee.rotation.x, 0.1 + Math.max(0, -c) * 0.72, 12, dt);
        npc.rightKnee.rotation.x = THREE.MathUtils.damp(npc.rightKnee.rotation.x, 0.1 + Math.max(0, c) * 0.72, 12, dt);
        npc.leftAnkle.rotation.x = THREE.MathUtils.damp(npc.leftAnkle.rotation.x, -s * 0.25, 12, dt);
        npc.rightAnkle.rotation.x = THREE.MathUtils.damp(npc.rightAnkle.rotation.x, s * 0.25, 12, dt);
        npc.leftUpperArm.rotation.x = THREE.MathUtils.damp(npc.leftUpperArm.rotation.x, -s * 0.52, 10, dt);
        npc.rightUpperArm.rotation.x = THREE.MathUtils.damp(npc.rightUpperArm.rotation.x, s * 0.52, 10, dt);
        npc.leftForearm.rotation.x = THREE.MathUtils.damp(npc.leftForearm.rotation.x, -0.38, 10, dt);
        npc.rightForearm.rotation.x = THREE.MathUtils.damp(npc.rightForearm.rotation.x, -0.38, 10, dt);
        npc.torsoGroup.rotation.x = THREE.MathUtils.damp(npc.torsoGroup.rotation.x, 0.08, 8, dt);
        npc.headGroup.rotation.y = THREE.MathUtils.damp(npc.headGroup.rotation.y, 0, 6, dt);
      } else {
        npc.leftHip.rotation.x = THREE.MathUtils.damp(npc.leftHip.rotation.x, 0, 8, dt);
        npc.rightHip.rotation.x = THREE.MathUtils.damp(npc.rightHip.rotation.x, 0, 8, dt);
        npc.leftKnee.rotation.x = THREE.MathUtils.damp(npc.leftKnee.rotation.x, 0.06, 8, dt);
        npc.rightKnee.rotation.x = THREE.MathUtils.damp(npc.rightKnee.rotation.x, 0.06, 8, dt);
        npc.leftAnkle.rotation.x = THREE.MathUtils.damp(npc.leftAnkle.rotation.x, -0.03, 8, dt);
        npc.rightAnkle.rotation.x = THREE.MathUtils.damp(npc.rightAnkle.rotation.x, -0.03, 8, dt);

        const phase = elapsed * 2.4 + idx * 1.7;
        if (agent.state === 'talking') {
          npc.torsoGroup.rotation.x = 0.03;
          npc.headGroup.rotation.y = Math.sin(elapsed * 2.5) * 0.14;
          npc.rightUpperArm.rotation.x = THREE.MathUtils.damp(npc.rightUpperArm.rotation.x, -0.88 + Math.sin(elapsed * 4.5) * 0.18, 8, dt);
          npc.rightForearm.rotation.x = -0.68;
          npc.leftUpperArm.rotation.x = THREE.MathUtils.damp(npc.leftUpperArm.rotation.x, -0.25, 8, dt);
        } else if (agent.state === 'working' || agent.state === 'inspecting' || agent.state === 'interacting') {
          npc.torsoGroup.rotation.x = 0.12 + Math.sin(phase) * 0.03;
          npc.headGroup.rotation.y = Math.sin(elapsed * 1.1 + idx) * 0.22;
          npc.rightUpperArm.rotation.x = THREE.MathUtils.damp(npc.rightUpperArm.rotation.x, -0.82 + Math.sin(elapsed * 6.5 + idx) * 0.18, 9, dt);
          npc.rightForearm.rotation.x = -0.58;
          npc.leftUpperArm.rotation.x = THREE.MathUtils.damp(npc.leftUpperArm.rotation.x, -0.45, 8, dt);
          npc.leftForearm.rotation.x = -0.62;
        } else if (agent.state === 'resting') {
          npc.torsoGroup.rotation.x = 0.02 * Math.sin(phase * 0.6);
          npc.headGroup.rotation.y = Math.sin(elapsed * 0.4 + idx) * 0.12;
          npc.rightUpperArm.rotation.x = THREE.MathUtils.damp(npc.rightUpperArm.rotation.x, -0.08, 6, dt);
          npc.leftUpperArm.rotation.x = THREE.MathUtils.damp(npc.leftUpperArm.rotation.x, 0.08, 6, dt);
          npc.rightForearm.rotation.x = -0.25;
        } else if (state.crewMood === 'celebrating') {
          npc.rightUpperArm.rotation.x = -2.0 + Math.sin(phase * 2.2) * 0.3;
          npc.rightForearm.rotation.x = -0.35;
        } else {
          npc.torsoGroup.rotation.x = 0.03 * Math.sin(phase);
          npc.headGroup.rotation.y = Math.sin(elapsed * 0.8 + idx) * 0.24;
          npc.rightUpperArm.rotation.x = THREE.MathUtils.damp(npc.rightUpperArm.rotation.x, -0.18 + Math.sin(phase) * 0.08, 6, dt);
          npc.leftUpperArm.rotation.x = THREE.MathUtils.damp(npc.leftUpperArm.rotation.x, 0.08, 6, dt);
          npc.rightForearm.rotation.x = -0.38;
        }
      }

      const nl = THIGH_LEN * Math.cos(npc.leftHip.rotation.x) + SHIN_LEN * Math.cos(npc.leftHip.rotation.x + npc.leftKnee.rotation.x) + ANKLE_DROP;
      const nr = THIGH_LEN * Math.cos(npc.rightHip.rotation.x) + SHIN_LEN * Math.cos(npc.rightHip.rotation.x + npc.rightKnee.rotation.x) + ANKLE_DROP;
      npc.bodyPivot.position.y = Math.max(nl, nr) - STANDING_HIP_HEIGHT;

      // Update exported runtime status snapshot
      npcStatuses[idx].state = agent.state;
      npcStatuses[idx].taskLabel = agent.taskLabel;
      npcStatuses[idx].buildingId = agent.buildingId;
      npcStatuses[idx].x = npc.root.position.x;
      npcStatuses[idx].z = npc.root.position.z;
    });

    // 7. Commander Nova Mentor (supports seated co-pilot mode, handheld scanner & remote site choreography)
    if (rigs.nova.root.visible) {
      if (state.novaSeatedInRover && roverPos) {
        const sinR = Math.sin(roverYaw);
        const cosR = Math.cos(roverYaw);
        const seatLocalX = 0.44;
        const seatLocalZ = 0.34;
        rigs.nova.root.position.set(
          roverPos.x + seatLocalX * cosR + seatLocalZ * sinR,
          roverPos.y + 0.56,
          roverPos.z - seatLocalX * sinR + seatLocalZ * cosR,
        );
        rigs.nova.root.rotation.set(0, roverYaw, 0);
        rigs.nova.leftHip.rotation.x = THREE.MathUtils.damp(rigs.nova.leftHip.rotation.x, -1.38, 12, dt);
        rigs.nova.rightHip.rotation.x = THREE.MathUtils.damp(rigs.nova.rightHip.rotation.x, -1.38, 12, dt);
        rigs.nova.leftKnee.rotation.x = THREE.MathUtils.damp(rigs.nova.leftKnee.rotation.x, 1.48, 12, dt);
        rigs.nova.rightKnee.rotation.x = THREE.MathUtils.damp(rigs.nova.rightKnee.rotation.x, 1.48, 12, dt);
        rigs.nova.leftAnkle.rotation.x = THREE.MathUtils.damp(rigs.nova.leftAnkle.rotation.x, -0.1, 12, dt);
        rigs.nova.rightAnkle.rotation.x = THREE.MathUtils.damp(rigs.nova.rightAnkle.rotation.x, -0.1, 12, dt);
        rigs.nova.leftUpperArm.rotation.x = THREE.MathUtils.damp(rigs.nova.leftUpperArm.rotation.x, -0.58, 10, dt);
        rigs.nova.rightUpperArm.rotation.x = THREE.MathUtils.damp(rigs.nova.rightUpperArm.rotation.x, -0.62, 10, dt);
        rigs.nova.leftForearm.rotation.x = THREE.MathUtils.damp(rigs.nova.leftForearm.rotation.x, -0.52, 10, dt);
        rigs.nova.rightForearm.rotation.x = THREE.MathUtils.damp(rigs.nova.rightForearm.rotation.x, -0.48, 10, dt);
        rigs.nova.torsoGroup.rotation.x = THREE.MathUtils.damp(rigs.nova.torsoGroup.rotation.x, -0.05, 10, dt);
        rigs.nova.headGroup.rotation.y = Math.sin(elapsed * 1.1) * 0.15 - 0.12;
        rigs.nova.bodyPivot.position.y = 0;
        rigs.nova.handTools.scanner.visible = false;
      } else {
        const npX = state.novaPosOverride ? state.novaPosOverride[0] : CHARACTERS_INFO.nova.homePos[0];
        const npZ = state.novaPosOverride ? state.novaPosOverride[1] : CHARACTERS_INFO.nova.homePos[2];

        let novaFrameSpeed = state.novaWalkSpeed ?? 0;
        if (state.novaPosOverride && prevNovaCutsceneX !== null && prevNovaCutsceneZ !== null && dt > 0.001) {
          const disp = Math.hypot(npX - prevNovaCutsceneX, npZ - prevNovaCutsceneZ);
          if (disp < 4.5) {
            novaFrameSpeed = disp / dt;
          }
        }
        prevNovaCutsceneX = state.novaPosOverride ? npX : null;
        prevNovaCutsceneZ = state.novaPosOverride ? npZ : null;
        novaCutsceneSpeed = THREE.MathUtils.damp(novaCutsceneSpeed, novaFrameSpeed, 14, dt);

        rigs.nova.root.position.set(npX, groundHeightAt(npX, npZ), npZ);
        if (state.novaYawOverride !== undefined && state.novaYawOverride !== null) {
          let diff = state.novaYawOverride - rigs.nova.root.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          rigs.nova.root.rotation.y += diff * Math.min(1, dt * 7.5);
        } else {
          rigs.nova.root.rotation.y = CHARACTERS_INFO.nova.rotY;
        }

        const nWalk = novaCutsceneSpeed;
        const nAct = state.novaActionOverride ?? 'none';
        let nLH = 0;
        let nRH = 0;
        let nLK = 0.06;
        let nRK = 0.06;
        let nLA = 0;
        let nRA = 0;
        let nLArm = 0.04;
        let nRArm = -0.22 + Math.sin(elapsed * 2.1) * 0.08;
        let nLFore = -0.28;
        let nRFore = -0.38;
        let nTorsoX = Math.sin(elapsed * 1.9) * 0.03;
        let nHeadX = 0;
        let nHeadY = Math.sin(elapsed * 0.7) * 0.14;

        if (nWalk > 0.14) {
          const amp = Math.min(0.5, 0.22 + nWalk * 0.1);
          const stride = Math.max(0.7, 3.65 * Math.sin(amp) * (THIGH_LEN + SHIN_LEN));
          novaWalkCycle += (nWalk / stride) * Math.PI * 2 * dt;
          const rawS = Math.sin(novaWalkCycle);
          const s = rawS * (1 + 0.16 * (1 - rawS * rawS));
          const c = Math.cos(novaWalkCycle);
          nLH = s * amp;
          nRH = -s * amp;
          nLK = 0.1 + Math.max(0, -c) * 0.72;
          nRK = 0.1 + Math.max(0, c) * 0.72;
          nLA = -s * 0.26;
          nRA = s * 0.26;
          nLArm = -s * 0.44;
          nRArm = s * 0.44;
          nLFore = -0.36;
          nRFore = -0.36;
          nTorsoX = 0.07;
          nHeadY = 0;
          rigs.nova.pelvisGroup.rotation.y = THREE.MathUtils.damp(rigs.nova.pelvisGroup.rotation.y, -s * 0.075, 9, dt);
          rigs.nova.pelvisGroup.rotation.z = THREE.MathUtils.damp(rigs.nova.pelvisGroup.rotation.z, c * 0.032, 9, dt);
        } else {
          rigs.nova.pelvisGroup.rotation.y = THREE.MathUtils.damp(rigs.nova.pelvisGroup.rotation.y, 0, 8, dt);
          rigs.nova.pelvisGroup.rotation.z = THREE.MathUtils.damp(rigs.nova.pelvisGroup.rotation.z, 0, 8, dt);
          if (nAct === 'point_malfunction') {
            nRArm = -1.32 + Math.sin(elapsed * 3.4) * 0.06;
            nRFore = -0.12;
            nLArm = -0.22;
            nTorsoX = 0.1;
            nHeadX = 0.08;
            nHeadY = Math.sin(elapsed * 1.4) * 0.14;
          } else if (nAct === 'use_scanner') {
            const sweep = Math.sin(elapsed * 4.6) * 0.28;
            nRArm = -0.88;
            nRFore = -0.44 + sweep * 0.22;
            nTorsoX = 0.12;
            nHeadX = 0.12;
            nHeadY = sweep * 0.5;
          } else if (nAct === 'open_panel' || nAct === 'interact_panel' || nAct === 'repair') {
            nLArm = -0.96;
            nLFore = -0.48;
            nRArm = -0.92 + Math.sin(elapsed * 5.2) * 0.12;
            nRFore = -0.45;
            nTorsoX = 0.16;
            nHeadX = 0.14;
          } else if (nAct === 'inspect') {
            nTorsoX = 0.22;
            nHeadX = 0.18;
            nRArm = -0.62;
            nRFore = -0.68;
          } else if (nAct === 'boarding_left' || nAct === 'boarding_right') {
            const stepPhase = 0.5 + 0.5 * Math.sin(elapsed * 5.0);
            nLH = -0.58 - stepPhase * 0.22;
            nLK = 1.0 + stepPhase * 0.22;
            nRH = -0.3 + stepPhase * 0.16;
            nRK = 0.62;
            nLArm = -0.98;
            nRArm = -1.04;
            nLFore = -0.48;
            nRFore = -0.48;
            nTorsoX = 0.18;
          } else if (nAct === 'communicate') {
            nRArm = -1.1 + Math.sin(elapsed * 4.0) * 0.12;
            nRFore = -0.85;
          }
        }

        rigs.nova.leftHip.rotation.x = THREE.MathUtils.damp(rigs.nova.leftHip.rotation.x, nLH, 11, dt);
        rigs.nova.rightHip.rotation.x = THREE.MathUtils.damp(rigs.nova.rightHip.rotation.x, nRH, 11, dt);
        rigs.nova.leftKnee.rotation.x = THREE.MathUtils.damp(rigs.nova.leftKnee.rotation.x, nLK, 11, dt);
        rigs.nova.rightKnee.rotation.x = THREE.MathUtils.damp(rigs.nova.rightKnee.rotation.x, nRK, 11, dt);
        rigs.nova.leftAnkle.rotation.x = THREE.MathUtils.damp(rigs.nova.leftAnkle.rotation.x, nLA, 11, dt);
        rigs.nova.rightAnkle.rotation.x = THREE.MathUtils.damp(rigs.nova.rightAnkle.rotation.x, nRA, 11, dt);
        rigs.nova.leftUpperArm.rotation.x = THREE.MathUtils.damp(rigs.nova.leftUpperArm.rotation.x, nLArm, 9, dt);
        rigs.nova.rightUpperArm.rotation.x = THREE.MathUtils.damp(rigs.nova.rightUpperArm.rotation.x, nRArm, 9, dt);
        rigs.nova.leftForearm.rotation.x = THREE.MathUtils.damp(rigs.nova.leftForearm.rotation.x, nLFore, 9, dt);
        rigs.nova.rightForearm.rotation.x = THREE.MathUtils.damp(rigs.nova.rightForearm.rotation.x, nRFore, 9, dt);
        rigs.nova.torsoGroup.rotation.x = THREE.MathUtils.damp(rigs.nova.torsoGroup.rotation.x, nTorsoX, 8, dt);
        rigs.nova.headGroup.rotation.x = THREE.MathUtils.damp(rigs.nova.headGroup.rotation.x, nHeadX, 8, dt);
        rigs.nova.headGroup.rotation.y = THREE.MathUtils.damp(rigs.nova.headGroup.rotation.y, nHeadY, 8, dt);
        rigs.nova.handTools.scanner.visible = nWalk <= 0.14 && nAct === 'use_scanner';

        const nl = THIGH_LEN * Math.cos(rigs.nova.leftHip.rotation.x) + SHIN_LEN * Math.cos(rigs.nova.leftHip.rotation.x + rigs.nova.leftKnee.rotation.x) + ANKLE_DROP;
        const nr = THIGH_LEN * Math.cos(rigs.nova.rightHip.rotation.x) + SHIN_LEN * Math.cos(rigs.nova.rightHip.rotation.x + rigs.nova.rightKnee.rotation.x) + ANKLE_DROP;
        rigs.nova.bodyPivot.position.y = Math.max(nl, nr) - STANDING_HIP_HEIGHT;
      }
    }
  };

  const resetPositions = () => {
    (['alex', 'leo', 'maya', 'zara', 'ryan', 'nova'] as CharacterId[]).forEach((id) => {
      const info = CHARACTERS_INFO[id];
      const [x, , z] = info.homePos;
      rigs[id].root.position.set(x, getGroundY(x, z), z);
      rigs[id].root.rotation.y = info.rotY;
    });
    npcAgents = createInitialNpcAgents();
    playerVel.set(0, 0, 0);
    jumpHeight = 0;
    jumpVelY = 0;
    jumpPhase = 'grounded';
    jumpPrepTimer = 0;
    landingCompression = 0;
    stepClimbBoost = 0;
    currentInsideBuilding = null;
    prevInsideBuilding = null;
    activeActionAnim = 'none';
    actionAnimTimer = 0;
  };

  const setPlayerLocation = (x: number, z: number, rotY = 0) => {
    const activeRig = rigs.alex;
    activeRig.root.position.set(x, getGroundY(x, z), z);
    activeRig.root.rotation.y = rotY;
    playerVel.set(0, 0, 0);
  };

  const getNearbyCrew = (): { id: CrewNpcId | 'nova' | null; distance: number } => {
    const px = rigs.alex.root.position.x;
    const pz = rigs.alex.root.position.z;
    let bestId: CrewNpcId | 'nova' | null = null;
    let bestDist = 3.35;
    CREW_NPC_ORDER.forEach((cid) => {
      if (!rigs[cid].root.visible) return;
      const d = Math.hypot(rigs[cid].root.position.x - px, rigs[cid].root.position.z - pz);
      if (d < bestDist) {
        bestDist = d;
        bestId = cid;
      }
    });
    if (rigs.nova.root.visible) {
      const d = Math.hypot(rigs.nova.root.position.x - px, rigs.nova.root.position.z - pz);
      if (d < bestDist) {
        bestDist = d;
        bestId = 'nova';
      }
    }
    return { id: bestId, distance: Math.round(bestDist * 10) / 10 };
  };

  return {
    group,
    get playerPosition() {
      return rigs.alex.root.position;
    },
    get playerRotationY() {
      return rigs.alex.root.rotation.y;
    },
    get insideBuildingId() {
      return currentInsideBuilding;
    },
    npcStatuses,
    get npcPositions() {
      return CREW_NPC_ORDER.map((id) => rigs[id].root.position);
    },
    getNearbyCrew,
    update,
    triggerActionAnim,
    resetPositions,
    setPlayerLocation,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
