import * as THREE from 'three';
import { groundHeightAt, groundNormalAt } from './lunarTerrain';

export interface LunarRoverRig {
  root: THREE.Group;
  chassis: THREE.Group;
  wheels: Array<{
    pivot: THREE.Group;
    spinMesh: THREE.Group;
    localX: number;
    localZ: number;
    isFront: boolean;
    restY: number;
  }>;
  steeringYoke: THREE.Group;
  headLights: THREE.SpotLight[];
  tailLightMats: THREE.MeshStandardMaterial[];
  tutorialHighlight: THREE.Mesh;
  beaconLight: THREE.Mesh;
  batteryBarMesh: THREE.Mesh;
  batteryBarMat: THREE.MeshStandardMaterial;
}

function createDashboardTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 96;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#091426';
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, 248, 88);
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('EV NAV · 1.62g', 18, 34);
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(18, 54, 150, 14);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('BAT 98%', 178, 66);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createLunarRover(): LunarRoverRig {
  const root = new THREE.Group();
  const chassis = new THREE.Group();
  root.add(chassis);

  const frameMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.34, metalness: 0.45 });
  const goldFoil = new THREE.MeshStandardMaterial({ color: 0xe6ad14, roughness: 0.24, metalness: 0.88 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.52, metalness: 0.68 });
  const accentBlue = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.34, metalness: 0.32 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x3f4754, roughness: 0.82, metalness: 0.35 });
  const seatMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.78, metalness: 0.12 });
  const dashMat = new THREE.MeshBasicMaterial({ map: createDashboardTexture() });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xa5e4ff,
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    metalness: 0.3,
    depthWrite: false,
  });

  // Main Chassis Deck + Side Rails
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 3.45), frameMat);
  deck.position.y = 0.85;
  deck.castShadow = true;
  deck.receiveShadow = true;
  chassis.add(deck);

  for (const sx of [-1.05, 1.05]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.3, 8), darkMetal);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(sx, 1.08, 0);
    chassis.add(rail);
  }

  // Gold Thermal Battery Pack & Science Cargo Rack (rear)
  const battery = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.62, 1.15), goldFoil);
  battery.position.set(0, 1.28, -0.95);
  battery.castShadow = true;
  chassis.add(battery);

  // Live 3D Battery Indicator Bar on rear battery pack
  const batteryBarMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x16a34a,
    emissiveIntensity: 0.9,
    roughness: 0.25,
  });
  const batteryBarBg = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.14, 0.08), darkMetal);
  batteryBarBg.position.set(0, 1.32, -1.55);
  chassis.add(batteryBarBg);
  const batteryBarMesh = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.09, 0.09), batteryBarMat);
  batteryBarMesh.position.set(0, 1.32, -1.56);
  chassis.add(batteryBarMesh);

  const cargoRack = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.35, 0.65), darkMetal);
  cargoRack.position.set(0, 1.72, -1.05);
  chassis.add(cargoRack);

  // Twin Cockpit Bucket Seats & Illuminated Dashboard
  for (const cx of [-0.46, 0.46]) {
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.16, 0.56), seatMat);
    cushion.position.set(cx, 1.08, 0.05);
    chassis.add(cushion);
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.68, 0.14), seatMat);
    backrest.position.set(cx, 1.44, -0.2);
    backrest.rotation.x = -0.15;
    chassis.add(backrest);
  }

  const dashConsole = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.45, 0.4), darkMetal);
  dashConsole.position.set(0, 1.26, 0.85);
  chassis.add(dashConsole);

  const dashScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.32), dashMat);
  dashScreen.position.set(0, 1.32, 0.64);
  dashScreen.rotation.y = Math.PI;
  chassis.add(dashScreen);

  // Steering Yoke
  const steeringYoke = new THREE.Group();
  steeringYoke.position.set(-0.38, 1.35, 0.58);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8), darkMetal);
  col.rotation.x = 0.7;
  steeringYoke.add(col);
  const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 8, 16), darkMetal);
  wheelRing.position.set(0, 0.08, -0.14);
  wheelRing.rotation.x = -0.45;
  steeringYoke.add(wheelRing);
  chassis.add(steeringYoke);

  // Front Hood & Windshield + Roll-Cage
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.46, 0.95), accentBlue);
  nose.position.set(0, 1.1, 1.25);
  nose.castShadow = true;
  chassis.add(nose);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.68, 0.08), glassMat);
  windshield.position.set(0, 1.62, 0.96);
  windshield.rotation.x = -0.35;
  chassis.add(windshield);

  for (const rx of [-0.84, 0.84]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.15, 8), darkMetal);
    post.position.set(rx, 1.54, 0.05);
    chassis.add(post);
  }
  const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.75, 8), darkMetal);
  topBar.rotation.z = Math.PI / 2;
  topBar.position.set(0, 2.1, 0.05);
  chassis.add(topBar);

  // Stereo Camera Mast & Comm Antenna
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.25, 8), frameMat);
  mast.position.set(-0.72, 2.3, -1.1);
  chassis.add(mast);

  const beaconLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.95 }),
  );
  beaconLight.position.set(-0.72, 2.95, -1.1);
  chassis.add(beaconLight);

  // Twin Headlights & Rear Tail Lamps
  const headLights: THREE.SpotLight[] = [];
  const tailLightMats: THREE.MeshStandardMaterial[] = [];
  for (const hx of [-0.64, 0.64]) {
    const lamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.14, 12),
      new THREE.MeshStandardMaterial({ color: 0xfef9c3, emissive: 0xfef08a, emissiveIntensity: 0.95 }),
    );
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(hx, 1.16, 1.74);
    chassis.add(lamp);

    const tailMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.45 });
    tailLightMats.push(tailMat);
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.1, 0.08),
      tailMat,
    );
    tail.position.set(hx, 1.05, -1.73);
    chassis.add(tail);

    const spot = new THREE.SpotLight(0xfffbeb, 0, 52, Math.PI / 4.2, 0.45, 1.1);
    spot.position.set(hx, 1.18, 1.76);
    const target = new THREE.Object3D();
    target.position.set(hx * 0.8, -0.8, 13);
    chassis.add(target);
    spot.target = target;
    chassis.add(spot);
    headLights.push(spot);
  }

  // 4 Articulated Lunar Mesh-Tire Wheels + Double-Wishbone Coil Suspension
  const wheels: LunarRoverRig['wheels'] = [];
  const wheelCoords: Array<[number, number, boolean]> = [
    [-1.28, 1.2, true],
    [1.28, 1.2, true],
    [-1.28, -1.2, false],
    [1.28, -1.2, false],
  ];

  for (const [wx, wz, isFront] of wheelCoords) {
    const pivot = new THREE.Group();
    pivot.position.set(wx, 0.56, wz);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.09, 0.14), darkMetal);
    arm.position.set(wx > 0 ? -0.24 : 0.24, 0.2, 0);
    pivot.add(arm);

    const shock = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.42, 8), goldFoil);
    shock.position.set(wx > 0 ? -0.18 : 0.18, 0.34, 0);
    shock.rotation.z = wx > 0 ? 0.35 : -0.35;
    pivot.add(shock);

    const spinMesh = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.42, 20), tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    spinMesh.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.44, 14), goldFoil);
    rim.rotation.z = Math.PI / 2;
    spinMesh.add(rim);

    for (let t = 0; t < 8; t++) {
      const tread = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.055, 1.14), darkMetal);
      tread.rotation.x = (t / 8) * Math.PI;
      spinMesh.add(tread);
    }

    pivot.add(spinMesh);
    root.add(pivot);
    wheels.push({ pivot, spinMesh, localX: wx, localZ: wz, isFront, restY: 0.56 });
  }

  const tutorialHighlight = new THREE.Mesh(
    new THREE.RingGeometry(2.45, 2.88, 32),
    new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    }),
  );
  tutorialHighlight.rotation.x = -Math.PI / 2;
  tutorialHighlight.position.y = 0.08;
  tutorialHighlight.visible = false;
  root.add(tutorialHighlight);

  return {
    root,
    chassis,
    wheels,
    steeringYoke,
    headLights,
    tailLightMats,
    tutorialHighlight,
    beaconLight,
    batteryBarMesh,
    batteryBarMat,
  };
}

export function updateRoverBatteryVisuals(rig: LunarRoverRig, batteryPct: number, isCharging: boolean) {
  const frac = THREE.MathUtils.clamp(batteryPct / 100, 0.04, 1);
  rig.batteryBarMesh.scale.x = frac;
  rig.batteryBarMesh.position.x = -(1 - frac) * 0.64;

  if (isCharging) {
    rig.batteryBarMat.color.setHex(0x22d3ee);
    rig.batteryBarMat.emissive.setHex(0x06b6d4);
    rig.batteryBarMat.emissiveIntensity = 1.2;
  } else if (batteryPct <= 0.1) {
    rig.batteryBarMat.color.setHex(0xef4444);
    rig.batteryBarMat.emissive.setHex(0xdc2626);
    rig.batteryBarMat.emissiveIntensity = 0.9;
  } else if (batteryPct <= 20) {
    rig.batteryBarMat.color.setHex(0xf59e0b);
    rig.batteryBarMat.emissive.setHex(0xd97706);
    rig.batteryBarMat.emissiveIntensity = 0.9;
  } else {
    rig.batteryBarMat.color.setHex(0x22c55e);
    rig.batteryBarMat.emissive.setHex(0x16a34a);
    rig.batteryBarMat.emissiveIntensity = 0.85;
  }
}

const _tmpNormal = new THREE.Vector3();
const _upVec = new THREE.Vector3(0, 1, 0);
const _alignQuat = new THREE.Quaternion();
const _yawQuat = new THREE.Quaternion();

export function updateRoverSuspensionAndTransform(
  rig: LunarRoverRig,
  x: number,
  z: number,
  heading: number,
  speed: number,
  steerAngle: number,
  airborneOffset: number,
  dt: number,
  isBraking = false,
  snapImmediate = false,
) {
  const groundY = groundHeightAt(x, z);
  rig.root.position.set(x, groundY + airborneOffset, z);

  const normal = groundNormalAt(x, z, _tmpNormal);
  _alignQuat.setFromUnitVectors(_upVec, normal);
  _yawQuat.setFromAxisAngle(_upVec, heading);
  _alignQuat.multiply(_yawQuat);
  if (snapImmediate) {
    rig.root.quaternion.copy(_alignQuat);
  } else {
    rig.root.quaternion.slerp(_alignQuat, Math.min(1, dt * 10));
  }

  const sinH = Math.sin(heading);
  const cosH = Math.cos(heading);

  for (const w of rig.wheels) {
    const worldWX = x + w.localX * cosH + w.localZ * sinH;
    const worldWZ = z - w.localX * sinH + w.localZ * cosH;
    const wGround = groundHeightAt(worldWX, worldWZ);
    const deltaH = THREE.MathUtils.clamp(wGround - groundY, -0.28, 0.28);
    const targetWheelY = w.restY + deltaH * 0.48;
    w.pivot.position.y = snapImmediate
      ? targetWheelY
      : THREE.MathUtils.lerp(w.pivot.position.y, targetWheelY, Math.min(1, dt * 14));

    if (w.isFront) {
      w.pivot.rotation.y = snapImmediate
        ? steerAngle * 0.55
        : THREE.MathUtils.lerp(w.pivot.rotation.y, steerAngle * 0.55, Math.min(1, dt * 12));
    }
    if (Math.abs(speed) > 0.001) {
      w.spinMesh.rotation.x += (speed * dt) / 0.56;
    }
  }

  // Turn steering yoke counterclockwise when steering left (+steerAngle)
  const targetYokeRot = -steerAngle * 0.85;
  rig.steeringYoke.rotation.z = snapImmediate
    ? targetYokeRot
    : THREE.MathUtils.lerp(rig.steeringYoke.rotation.z, targetYokeRot, Math.min(1, dt * 12));

  const targetPitch = Math.abs(speed) > 0.01 ? THREE.MathUtils.clamp(-speed * 0.0045, -0.055, 0.055) : 0;
  rig.chassis.rotation.x = snapImmediate
    ? targetPitch
    : THREE.MathUtils.lerp(rig.chassis.rotation.x, targetPitch, Math.min(1, dt * 8));

  const targetBrakeGlow = isBraking ? 1.85 : 0.45;
  for (const tm of rig.tailLightMats) {
    tm.emissiveIntensity = targetBrakeGlow;
  }
}
