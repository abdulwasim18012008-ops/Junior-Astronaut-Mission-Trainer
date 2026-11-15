import * as THREE from 'three';
import { CrewMemberDef } from '../types/game';
import { groundHeightAt } from './lunarTerrain';

export interface AstronautRig {
  root: THREE.Group;
  pelvis: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  commBeacon: THREE.Mesh;
  scannerBeam: THREE.Mesh;
  helmetLight?: THREE.SpotLight;
}

export interface LocomotionState {
  stridePhase: number;
  walkWeight: number;
  boundWeight: number;
  airWeight: number;
  landRecovery: number;
  turnBank: number;
  lastStepHalf: number;
}

export function createLocomotionState(): LocomotionState {
  return {
    stridePhase: 0,
    walkWeight: 0,
    boundWeight: 0,
    airWeight: 0,
    landRecovery: 0,
    turnBank: 0,
    lastStepHalf: 0,
  };
}

export function createAstronautRig(accentHex: number, isCommander = false, withHelmetLight = false): AstronautRig {
  const root = new THREE.Group();

  const suitWhite = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.52, metalness: 0.14 });
  const suitRib = new THREE.MeshStandardMaterial({ color: 0xdbe3ec, roughness: 0.68, metalness: 0.1 });
  const accentMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.38, metalness: 0.25 });
  const jointMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.62, metalness: 0.28 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.82, metalness: 0.22 });
  const visorMat = new THREE.MeshStandardMaterial({
    color: isCommander ? 0xf59e0b : 0x38bdf8,
    emissive: isCommander ? 0x451a03 : 0x0c4a6e,
    emissiveIntensity: 0.32,
    roughness: 0.1,
    metalness: 0.9,
  });

  // Grounded contact shadow
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  });
  const contactShadow = new THREE.Mesh(new THREE.CircleGeometry(0.54, 18), shadowMat);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.03;
  root.add(contactShadow);

  // Pelvis root (allows vertical squat on landing & natural low-g bob)
  const pelvis = new THREE.Group();
  pelvis.position.set(0, 0.88, 0);
  root.add(pelvis);

  const hipBlock = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.2, 12), suitRib);
  hipBlock.position.y = -0.02;
  pelvis.add(hipBlock);

  // Articulated Hip + Knee Legs
  const makeLeg = (xOff: number) => {
    const hip = new THREE.Group();
    hip.position.set(xOff, -0.04, 0);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.125, 0.42, 10), suitWhite);
    thigh.position.y = -0.21;
    thigh.castShadow = true;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.set(0, -0.42, 0);
    hip.add(knee);

    const kneePad = new THREE.Mesh(new THREE.SphereGeometry(0.125, 10, 8), accentMat);
    knee.add(kneePad);

    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.115, 0.34, 10), suitWhite);
    shin.position.y = -0.18;
    shin.castShadow = true;
    knee.add(shin);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.37), bootMat);
    boot.position.set(0, -0.35, 0.06);
    boot.castShadow = true;
    knee.add(boot);

    return { hip, knee };
  };

  const leftL = makeLeg(-0.17);
  const rightL = makeLeg(0.17);
  pelvis.add(leftL.hip, rightL.hip);

  // Upper Torso pivoted at waist
  const torso = new THREE.Group();
  torso.position.set(0, 0.08, 0);
  pelvis.add(torso);

  const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.26, 0.66, 14), suitWhite);
  chest.position.y = 0.33;
  chest.castShadow = true;
  torso.add(chest);

  const chestBelt = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.275, 0.12, 14), accentMat);
  chestBelt.position.y = 0.06;
  torso.add(chestBelt);

  const chestPanel = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.09), jointMat);
  chestPanel.position.set(0, 0.4, 0.28);
  torso.add(chestPanel);

  const commBeacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.45 }),
  );
  commBeacon.position.set(0.18, 0.52, 0.29);
  torso.add(commBeacon);

  // Dual-Tank PLSS Life Support Backpack
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.58, 0.27), suitWhite);
  backpack.position.set(0, 0.35, -0.29);
  backpack.castShadow = true;
  torso.add(backpack);
  for (const tx of [-0.12, 0.12]) {
    const o2Bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.46, 10), suitRib);
    o2Bottle.position.set(tx, 0.34, -0.43);
    torso.add(o2Bottle);
  }
  const packStripe = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.11, 0.29), accentMat);
  packStripe.position.set(0, 0.49, -0.29);
  torso.add(packStripe);

  // Articulated Shoulder + Elbow Arms
  const makeArm = (xOff: number, isRight: boolean) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(xOff, 0.58, 0);

    const shoulderBall = new THREE.Mesh(new THREE.SphereGeometry(0.125, 10, 8), accentMat);
    shoulder.add(shoulderBall);

    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.28, 10), suitWhite);
    upperArm.position.y = -0.14;
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.28, 0);
    shoulder.add(elbow);

    const elbowRing = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), suitRib);
    elbow.add(elbowRing);

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.08, 0.24, 10), suitWhite);
    forearm.position.y = -0.12;
    forearm.castShadow = true;
    elbow.add(forearm);

    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.095, 10, 8), jointMat);
    glove.position.y = -0.25;
    elbow.add(glove);

    let scannerBeam: THREE.Mesh | null = null;
    if (isRight) {
      // Handheld geological scanner device attached to right glove
      const toolBody = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.22), jointMat);
      toolBody.position.set(0, -0.26, 0.11);
      elbow.add(toolBody);

      scannerBeam = new THREE.Mesh(
        new THREE.ConeGeometry(0.32, 2.2, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }),
      );
      scannerBeam.rotation.x = -Math.PI / 2;
      scannerBeam.position.set(0, -0.26, 1.32);
      scannerBeam.visible = false;
      elbow.add(scannerBeam);
    }

    return { shoulder, elbow, scannerBeam };
  };

  const leftA = makeArm(-0.38, false);
  const rightA = makeArm(0.38, true);
  torso.add(leftA.shoulder, rightA.shoulder);

  // Helmet & Visor
  const head = new THREE.Group();
  head.position.set(0, 0.69, 0);
  torso.add(head);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.1, 12), accentMat);
  collar.position.y = 0.02;
  head.add(collar);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 14), suitWhite);
  helmet.position.y = 0.24;
  helmet.castShadow = true;
  head.add(helmet);

  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.245, 16, 12, -Math.PI * 0.4, Math.PI * 0.8, Math.PI * 0.2, Math.PI * 0.55),
    visorMat,
  );
  visor.position.set(0, 0.25, 0.075);
  head.add(visor);

  let helmetLight: THREE.SpotLight | undefined;
  if (withHelmetLight) {
    helmetLight = new THREE.SpotLight(0xe0f2fe, 0, 34, Math.PI / 5, 0.45, 1.2);
    helmetLight.position.set(0, 0.42, 0.26);
    const target = new THREE.Object3D();
    target.position.set(0, -1.2, 8);
    head.add(target);
    helmetLight.target = target;
    head.add(helmetLight);
  }

  return {
    root,
    pelvis,
    torso,
    head,
    leftShoulder: leftA.shoulder,
    leftElbow: leftA.elbow,
    rightShoulder: rightA.shoulder,
    rightElbow: rightA.elbow,
    leftHip: leftL.hip,
    leftKnee: leftL.knee,
    rightHip: rightL.hip,
    rightKnee: rightL.knee,
    commBeacon,
    scannerBeam: rightA.scannerBeam!,
    helmetLight,
  };
}

/**
 * Blended Low-Gravity Astronaut Locomotion Controller.
 * Smoothly blends idle, weighted low-g walk, lunar bounding lope, airborne float, and landing knee absorption.
 * Returns true if a footstep landed on this frame (to stamp boot prints & dust).
 */
export function applyAstronautLocomotion(
  rig: AstronautRig,
  state: LocomotionState,
  horizSpeed: number,
  isBounding: boolean,
  isGrounded: boolean,
  velY: number,
  turnDelta: number,
  dt: number,
  elapsed: number,
): boolean {
  const dampRate = 1 - Math.exp(-10 * dt);

  const targetWalk = isGrounded && horizSpeed > 0.45 && !isBounding ? Math.min(1, horizSpeed / 6.5) : 0;
  const targetBound = isGrounded && horizSpeed > 0.45 && isBounding ? 1 : 0;
  const targetAir = !isGrounded ? 1 : 0;

  state.walkWeight = THREE.MathUtils.lerp(state.walkWeight, targetWalk, dampRate);
  state.boundWeight = THREE.MathUtils.lerp(state.boundWeight, targetBound, dampRate);
  state.airWeight = THREE.MathUtils.lerp(state.airWeight, targetAir, dampRate);
  state.turnBank = THREE.MathUtils.lerp(state.turnBank, THREE.MathUtils.clamp(turnDelta * 0.22, -0.14, 0.14), dampRate);

  if (state.landRecovery > 0) {
    state.landRecovery = Math.max(0, state.landRecovery - dt * 2.8);
  }

  // Advance gait stride naturally — low-g bounding has a longer, rhythmic loping cadence
  const strideFreq = 5.4 * state.walkWeight + 4.2 * state.boundWeight;
  state.stridePhase += dt * strideFreq;

  let stepped = false;
  if (isGrounded && horizSpeed > 0.6) {
    const halfStep = Math.floor(state.stridePhase / Math.PI);
    if (halfStep !== state.lastStepHalf) {
      state.lastStepHalf = halfStep;
      stepped = true;
    }
  }

  const p = state.stridePhase;
  const moveBlend = Math.min(1, state.walkWeight + state.boundWeight);
  const idleWeight = Math.max(0, 1 - moveBlend - state.airWeight);

  // Subtle idle breathing & weight shift
  const idleSway = Math.sin(elapsed * 1.4) * 0.025 * idleWeight;
  const idleKnee = 0.14 * idleWeight;

  // Walk & Low-G Bound Leg Angles (with natural knee bend during swing phase!)
  const hipAmp = 0.42 * state.walkWeight + 0.62 * state.boundWeight;
  const swingL = Math.sin(p);
  const swingR = Math.sin(p + Math.PI);

  const walkHipL = swingL * hipAmp - 0.06 * moveBlend;
  const walkHipR = swingR * hipAmp - 0.06 * moveBlend;
  const walkKneeL = (0.16 + Math.max(0, Math.cos(p)) * 0.52) * moveBlend;
  const walkKneeR = (0.16 + Math.max(0, Math.cos(p + Math.PI)) * 0.52) * moveBlend;

  // Airborne low-g float & Landing absorption crouch
  const airHipL = -0.32 * state.airWeight;
  const airHipR = 0.22 * state.airWeight;
  const airKneeL = 0.55 * state.airWeight;
  const airKneeR = 0.35 * state.airWeight;

  const crouchAmt = Math.sin(state.landRecovery * Math.PI) * 0.45;

  rig.leftHip.rotation.x = walkHipL + airHipL - crouchAmt * 0.55;
  rig.rightHip.rotation.x = walkHipR + airHipR - crouchAmt * 0.55;
  rig.leftKnee.rotation.x = idleKnee + walkKneeL + airKneeL + crouchAmt;
  rig.rightKnee.rotation.x = idleKnee + walkKneeR + airKneeR + crouchAmt;

  // Wider spacesuit stance
  rig.leftHip.rotation.z = -0.05;
  rig.rightHip.rotation.z = 0.05;

  // Pelvis vertical bounce: subtle double-freq heel rise + bounded lope lift + landing dip
  const lopeLift = Math.abs(Math.sin(p)) * 0.18 * state.boundWeight;
  const walkBob = Math.abs(Math.sin(p)) * 0.045 * state.walkWeight;
  rig.pelvis.position.y = 0.88 + walkBob + lopeLift - crouchAmt * 0.22;
  rig.pelvis.rotation.y = Math.sin(p) * 0.06 * moveBlend;

  // Torso forward lean & turn bank (restricted suit posture)
  const forwardLean = 0.08 * state.walkWeight + 0.16 * state.boundWeight + crouchAmt * 0.22 + (velY < -1 ? 0.08 : 0);
  rig.torso.rotation.x = forwardLean;
  rig.torso.rotation.z = state.turnBank + idleSway;
  rig.torso.rotation.y = -Math.sin(p) * 0.08 * moveBlend;

  // Arm counterbalance with bent elbows (spacesuit arm posture)
  const armAmp = 0.36 * state.walkWeight + 0.54 * state.boundWeight;
  const airArmLift = (-0.55 - THREE.MathUtils.clamp(velY * 0.08, -0.25, 0.25)) * state.airWeight;
  rig.leftShoulder.rotation.x = -swingL * armAmp + airArmLift - 0.14;
  rig.rightShoulder.rotation.x = -swingR * armAmp + airArmLift - 0.14;
  rig.leftShoulder.rotation.z = 0.14 + 0.12 * state.airWeight;
  rig.rightShoulder.rotation.z = -0.14 - 0.12 * state.airWeight;

  rig.leftElbow.rotation.x = -0.42 - Math.max(0, -swingL) * 0.25 * moveBlend;
  rig.rightElbow.rotation.x = -0.42 - Math.max(0, -swingR) * 0.25 * moveBlend;

  return stepped;
}

/**
 * Astronaut seated driver pose inside the open-cockpit Lunar EV.
 */
export function applyAstronautSeatedPose(
  rig: AstronautRig,
  steerAngle: number,
  elapsed: number,
) {
  rig.scannerBeam.visible = false;
  rig.pelvis.position.y = 0.54;
  rig.pelvis.rotation.set(0, 0, 0);

  rig.torso.rotation.x = -0.1;
  rig.torso.rotation.z = -steerAngle * 0.08 + Math.sin(elapsed * 1.4) * 0.015;
  rig.torso.rotation.y = steerAngle * 0.06;
  rig.head.rotation.y = steerAngle * 0.22;

  // Legs bent forward on floorboards
  rig.leftHip.rotation.x = -1.32;
  rig.rightHip.rotation.x = -1.32;
  rig.leftHip.rotation.z = -0.08;
  rig.rightHip.rotation.z = 0.08;
  rig.leftKnee.rotation.x = 1.38;
  rig.rightKnee.rotation.x = 1.38;

  // Arms reaching forward to grip steering yoke
  rig.leftShoulder.rotation.x = -0.92 + steerAngle * 0.14;
  rig.rightShoulder.rotation.x = -0.92 - steerAngle * 0.14;
  rig.leftShoulder.rotation.z = 0.08;
  rig.rightShoulder.rotation.z = -0.08;
  rig.leftElbow.rotation.x = -0.52;
  rig.rightElbow.rotation.x = -0.52;
}

/**
 * Astronaut mount/dismount transition animation (u = 0 standing -> u = 1 seated).
 */
export function applyAstronautBoardingPose(
  rig: AstronautRig,
  seatFactor: number,
) {
  rig.scannerBeam.visible = false;
  const f = THREE.MathUtils.clamp(seatFactor, 0, 1);
  const stepLift = Math.sin(f * Math.PI);

  rig.pelvis.position.y = THREE.MathUtils.lerp(0.88, 0.54, f) + stepLift * 0.08;
  rig.pelvis.rotation.set(0, 0, 0);

  rig.torso.rotation.x = THREE.MathUtils.lerp(0.18 * stepLift, -0.1, f);
  rig.torso.rotation.z = 0;
  rig.torso.rotation.y = 0;

  rig.leftHip.rotation.x = THREE.MathUtils.lerp(-0.35 * stepLift, -1.32, f);
  rig.rightHip.rotation.x = THREE.MathUtils.lerp(0.1 * stepLift, -1.32, f);
  rig.leftHip.rotation.z = -0.08;
  rig.rightHip.rotation.z = 0.08;
  rig.leftKnee.rotation.x = THREE.MathUtils.lerp(0.55 * stepLift, 1.38, f);
  rig.rightKnee.rotation.x = THREE.MathUtils.lerp(0.25 * stepLift, 1.38, f);

  rig.leftShoulder.rotation.x = THREE.MathUtils.lerp(-0.35 * stepLift, -0.92, f);
  rig.rightShoulder.rotation.x = THREE.MathUtils.lerp(-0.45 * stepLift, -0.92, f);
  rig.leftShoulder.rotation.z = 0.12;
  rig.rightShoulder.rotation.z = -0.12;
  rig.leftElbow.rotation.x = -0.5;
  rig.rightElbow.rotation.x = -0.5;
}

/**
 * Relaxed standing posture admiring Earth in the lunar sky.
 */
export function applyAstronautAdmiringPose(rig: AstronautRig, elapsed: number) {
  rig.scannerBeam.visible = false;
  const breath = Math.sin(elapsed * 1.35);
  const sway = Math.sin(elapsed * 0.68);

  rig.pelvis.position.y = 0.88 + breath * 0.01;
  rig.pelvis.rotation.set(0, sway * 0.025, 0);

  rig.leftHip.rotation.set(-0.04, 0, -0.06);
  rig.rightHip.rotation.set(0.03, 0, 0.07);
  rig.leftKnee.rotation.x = 0.12;
  rig.rightKnee.rotation.x = 0.1;

  rig.torso.rotation.x = -0.03 + breath * 0.015;
  rig.torso.rotation.z = sway * 0.025;
  rig.torso.rotation.y = sway * 0.03;

  // Head gently tilted upward toward Earth
  rig.head.rotation.x = -0.22 + Math.sin(elapsed * 0.85) * 0.022;
  rig.head.rotation.y = Math.sin(elapsed * 0.5) * 0.045;

  // Relaxed spacesuit arms
  rig.leftShoulder.rotation.x = -0.14 + breath * 0.03;
  rig.rightShoulder.rotation.x = -0.16 - breath * 0.025;
  rig.leftShoulder.rotation.z = 0.15;
  rig.rightShoulder.rotation.z = -0.15;
  rig.leftElbow.rotation.x = -0.38;
  rig.rightElbow.rotation.x = -0.36;
}

/**
 * Relaxed seated-on-boulder posture admiring Earth with optional gentle wonder gesture.
 */
export function applyAstronautSeatedOnRockPose(
  rig: AstronautRig,
  elapsed: number,
  gestureAmount = 0,
  glanceAmount = 0,
) {
  rig.scannerBeam.visible = false;
  const breath = Math.sin(elapsed * 1.2 + 0.8);
  const sway = Math.sin(elapsed * 0.58 + 0.4);

  rig.pelvis.position.y = 0.54 + breath * 0.008;
  rig.pelvis.rotation.set(0, 0, 0);

  rig.torso.rotation.x = -0.07 + breath * 0.016;
  rig.torso.rotation.z = sway * 0.02;
  rig.torso.rotation.y = glanceAmount * 0.09 + sway * 0.025;

  // Head looking up at Earth, with subtle warm glance toward companion when speaking
  rig.head.rotation.x = -0.23 + Math.sin(elapsed * 0.78) * 0.024;
  rig.head.rotation.y = -glanceAmount * 0.24 + Math.sin(elapsed * 0.45) * 0.04;

  // Comfortable asymmetric seated legs resting against the boulder
  rig.leftHip.rotation.set(-1.05, 0, -0.11);
  rig.rightHip.rotation.set(-0.92, 0, 0.13);
  rig.leftKnee.rotation.x = 1.15;
  rig.rightKnee.rotation.x = 1.02;

  // Left hand resting casually on thigh/knee; right arm rests or gestures gently toward Earth
  rig.leftShoulder.rotation.set(-0.56 + breath * 0.02, 0, 0.12);
  rig.leftElbow.rotation.x = -0.72;

  rig.rightShoulder.rotation.set(-0.52 - gestureAmount * 0.42 + breath * 0.02, 0, -0.12 - gestureAmount * 0.08);
  rig.rightElbow.rotation.x = -0.68 + gestureAmount * 0.24;
}

export const CREW_ROSTER: CrewMemberDef[] = [
  {
    id: 'leo',
    name: 'Leo',
    role: 'Engineering & Equipment Repair',
    suitColor: '#f97316',
    accentHex: 0xf97316,
    personality: 'Energetic tinkerer who loves fixing lunar machinery.',
    homeBuildingId: 'oxygen_facility',
    waypoints: [
      [19, -12],
      [6, 20],
      [34, -6],
      [38, -20],
      [4, -8], // Hub meetup spot
    ],
    statusLine: 'Inspecting cryogenic O₂ manifolds and solar rover chargers',
  },
  {
    id: 'maya',
    name: 'Maya',
    role: 'Science & Geological Research',
    suitColor: '#06b6d4',
    accentHex: 0x06b6d4,
    personality: 'Curious scientist fascinated by ancient moon rocks.',
    homeBuildingId: 'geological_lab',
    waypoints: [
      [-17, 12],
      [-32, 6],
      [8, -32],
      [-15, 2],
      [2, -8], // Hub meetup spot
    ],
    statusLine: 'Running spectroscopy across the Geological & Lunar Research Labs',
  },
  {
    id: 'zara',
    name: 'Zara',
    role: 'Greenhouse & Biological Research',
    suitColor: '#22c55e',
    accentHex: 0x22c55e,
    personality: 'Calm botanist keeping the colony crops thriving.',
    homeBuildingId: 'greenhouse',
    waypoints: [
      [10, 22],
      [-8, 28],
      [18, 18],
      [-14, -26],
      [-6, -6], // Hub meetup spot
    ],
    statusLine: 'Checking hydroponic grow-lights and habitat humidity',
  },
  {
    id: 'ryan',
    name: 'Ryan',
    role: 'Communications & Observatory',
    suitColor: '#8b5cf6',
    accentHex: 0x8b5cf6,
    personality: 'Sharp navigator tracking signals and stars across the Moon.',
    homeBuildingId: 'comm_tower',
    waypoints: [
      [28, -30],
      [-40, 28],
      [14, -28],
      [-8, -6], // Hub meetup spot
    ],
    statusLine: 'Aligning Observatory telescope and deep-space Earth telemetry',
  },
];

// Mission-reactive dynamic schedules so NPCs respond to story events!
function getDynamicWaypointsForMission(def: CrewMemberDef, currentMissionNumber: number): [number, number][] {
  if (currentMissionNumber === 8 && def.id === 'leo') {
    return [[20, -10], [24, -8], [18, -14]];
  }
  if (currentMissionNumber === 9 && def.id === 'zara') {
    return [[22, 8], [24, 12], [18, 6]];
  }
  if (currentMissionNumber === 10 && def.id === 'leo') {
    return [[39, -22], [41, -18], [35, -24]];
  }
  if (currentMissionNumber === 11 && def.id === 'zara') {
    return [[10, 24], [12, 20], [8, 28]];
  }
  if (currentMissionNumber === 12 && def.id === 'leo') {
    return [[-17, -10], [-19, -6], [-14, -14]];
  }
  if (currentMissionNumber === 13 && def.id === 'maya') {
    return [[-16, -26], [-14, -24], [-20, -28]];
  }
  return def.waypoints;
}

export interface AutonomousCrewActor {
  def: CrewMemberDef;
  rig: AstronautRig;
  loco: LocomotionState;
  x: number;
  z: number;
  heading: number;
  wpIndex: number;
  waitTimer: number;
  phaseOffset: number;
  activity: string;
}

export function createCrewActors(scene: THREE.Scene): AutonomousCrewActor[] {
  return CREW_ROSTER.map((def, idx) => {
    const rig = createAstronautRig(def.accentHex, false, false);
    const [sx, sz] = def.waypoints[0];
    rig.root.position.set(sx, groundHeightAt(sx, sz), sz);
    scene.add(rig.root);
    return {
      def,
      rig,
      loco: createLocomotionState(),
      x: sx,
      z: sz,
      heading: idx * 1.1,
      wpIndex: 1 % def.waypoints.length,
      waitTimer: 1.5 + idx * 0.8,
      phaseOffset: idx * 1.7,
      activity: def.statusLine,
    };
  });
}

export function updateCrewActors(
  actors: AutonomousCrewActor[],
  dt: number,
  elapsed: number,
  currentMissionNumber: number,
) {
  for (let i = 0; i < actors.length; i++) {
    const actor = actors[i];
    const wps = getDynamicWaypointsForMission(actor.def, currentMissionNumber);
    const wpIdx = actor.wpIndex % wps.length;
    const [tx, tz] = wps[wpIdx];
    const dx = tx - actor.x;
    const dz = tz - actor.z;
    const dist = Math.hypot(dx, dz);

    let speed = 0;
    let turnDelta = 0;

    // Check if another crewmate is nearby and stationary for a friendly chat
    let chatPartner: AutonomousCrewActor | null = null;
    for (let j = 0; j < actors.length; j++) {
      if (i === j) continue;
      const other = actors[j];
      if (Math.hypot(other.x - actor.x, other.z - actor.z) < 4.5 && other.waitTimer > 0.2) {
        chatPartner = other;
        break;
      }
    }

    if (actor.waitTimer > 0) {
      actor.waitTimer -= dt;
      applyAstronautLocomotion(actor.rig, actor.loco, 0, false, true, 0, 0, dt, elapsed + actor.phaseOffset);

      if (chatPartner) {
        // Turn toward crewmate and animate natural conversation gestures
        const faceYaw = Math.atan2(chatPartner.x - actor.x, chatPartner.z - actor.z);
        let diff = faceYaw - actor.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        actor.heading += diff * Math.min(1, dt * 4.5);

        const g = Math.sin(elapsed * 2.8 + actor.phaseOffset);
        actor.rig.rightShoulder.rotation.x = -0.68 + g * 0.24;
        actor.rig.rightElbow.rotation.x = -0.78 + g * 0.16;
        actor.rig.leftShoulder.rotation.x = -0.32 - g * 0.1;
        actor.rig.head.rotation.y = Math.sin(elapsed * 1.3 + actor.phaseOffset) * 0.16;
        actor.activity = `Discussing mission updates with ${chatPartner.def.name}`;
      } else {
        // Natural working / console-operating / inspecting body language
        const t = elapsed * 2.0 + actor.phaseOffset;
        actor.rig.leftShoulder.rotation.x = -0.55 + Math.sin(t) * 0.14;
        actor.rig.rightShoulder.rotation.x = -0.62 + Math.cos(t * 1.2) * 0.16;
        actor.rig.leftElbow.rotation.x = -0.65;
        actor.rig.rightElbow.rotation.x = -0.68;
        actor.rig.head.rotation.y = Math.sin(elapsed * 0.85 + actor.phaseOffset) * 0.3;
        actor.activity = actor.def.statusLine;
      }
    } else if (dist < 1.2) {
      actor.wpIndex = (wpIdx + 1) % wps.length;
      actor.waitTimer = 3.8 + ((actor.wpIndex * 1.3) % 2.8);
      applyAstronautLocomotion(actor.rig, actor.loco, 0, false, true, 0, 0, dt, elapsed + actor.phaseOffset);
    } else {
      speed = 2.4;
      actor.x += (dx / dist) * speed * dt;
      actor.z += (dz / dist) * speed * dt;
      const targetHeading = Math.atan2(dx, dz);
      let diff = targetHeading - actor.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      turnDelta = diff;
      actor.heading += diff * Math.min(1, dt * 5.5);

      applyAstronautLocomotion(actor.rig, actor.loco, speed, false, true, 0, turnDelta, dt, elapsed + actor.phaseOffset);
      actor.rig.head.rotation.y *= 0.9;
      actor.activity = actor.def.statusLine;
    }

    actor.rig.root.position.set(actor.x, groundHeightAt(actor.x, actor.z), actor.z);
    actor.rig.root.rotation.y = actor.heading;
  }
}

export function getCrewDialogueLine(crewId: string, missionNumber: number): string {
  if (crewId === 'leo') {
    if (missionNumber <= 7) return "I'm tuning the Lunar EV's wire-mesh wheel suspension and checking our charging stations!";
    if (missionNumber <= 13) return 'Keeping the colony power, thermal valves, and oxygen scrubbers humming takes teamwork!';
    return 'Remember to recharge the Lunar EV at the Rover Garage or Solar Charging Bay before long drives!';
  }
  if (crewId === 'maya') {
    if (missionNumber <= 7) return 'Look at the dark metallic fusion crust on those meteorite samples—they formed long before Earth existed!';
    if (missionNumber === 15) return 'Permanently shadowed craters can trap ancient water ice for billions of years!';
    return 'Every rock tray we catalog across the Lunar Research Lab tells another chapter of Moon history.';
  }
  if (crewId === 'zara') {
    if (missionNumber === 11) return 'Our sprouts need the full red-and-blue LED spectrum inside the Greenhouse to stay vibrant.';
    return 'Our hydroponic greens give the whole crew fresh oxygen and crisp veggies right here on the Moon!';
  }
  if (missionNumber <= 7) return 'Earth Control signals take only 1.3 seconds to reach us—and our Observatory dome has crystal-clear skies!';
  if (missionNumber === 14) return 'Those underground pulse waves from the eastern crater are unlike ordinary basalt. Worth a drive!';
  return 'All deep-space relays and the Observatory are locked onto Earth. Let me know if you need bearings!';
}
