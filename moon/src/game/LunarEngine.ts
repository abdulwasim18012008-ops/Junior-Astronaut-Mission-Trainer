import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  LiveHudSnapshot,
  MiniGameType,
  OptionalActivityDef,
  SaveProgress,
  SubtitleLine,
  VehicleState,
} from '../types/game';
import {
  APOLLO_SITE_X,
  APOLLO_SITE_Z,
  buildLunarTerrainMesh,
  createFootprintTexture,
  createRoverTrackTexture,
  groundHeightAt,
  groundNormalAt,
  TerrainObstacle,
  WORLD_PLAYABLE_RADIUS,
} from './lunarTerrain';
import {
  APOLLO_FLAG_OFFSET_X,
  APOLLO_FLAG_OFFSET_Z,
  APOLLO_FOOTPRINT_OFFSET_X,
  APOLLO_FOOTPRINT_OFFSET_Z,
  buildMissionWorldProps,
  createDepartureSpacecraft,
  createEarthRig,
  createStarfield,
  EarthRig,
  SpacecraftRig,
  WorldPropsRig,
} from './spaceObjects';
import {
  AnimatedAirlockDoor,
  buildLunarColony,
  ChargingStationInfo,
  ColonyBuildingInfo,
} from './colonyBuilder';
import {
  applyAstronautAdmiringPose,
  applyAstronautBoardingPose,
  applyAstronautLocomotion,
  applyAstronautSeatedOnRockPose,
  applyAstronautSeatedPose,
  AutonomousCrewActor,
  AstronautRig,
  createAstronautRig,
  createCrewActors,
  createLocomotionState,
  getCrewDialogueLine,
  LocomotionState,
  updateCrewActors,
} from './characters';
import {
  createLunarRover,
  LunarRoverRig,
  updateRoverBatteryVisuals,
  updateRoverSuspensionAndTransform,
} from './rover';
import { CAMPAIGN_MISSIONS, OPTIONAL_ACTIVITIES, WORLD_LOCATIONS } from './missions';
import { distanceToRouteXZ, GoldenTrailMesh, LunarNavGrid } from './navigation';
import { lunarAudio } from './sound';

const LUNAR_GRAVITY = 1.62; // Authentic Moon gravity in m/s²
const EXPLORER_JUMP_VELOCITY = 3.25; // ~3.26m jump height, ~4.0s airtime in 1.62 m/s²

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _normal = new THREE.Vector3();
const _camDesiredPos = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _camRayStep = new THREE.Vector3();
const _projVec = new THREE.Vector3();
const _dummyObj = new THREE.Object3D();
const _alignQuat = new THREE.Quaternion();
const _yawQuat = new THREE.Quaternion();
const _dummyMatrix = new THREE.Matrix4();

export interface EngineCallbacks {
  onHudUpdate: (snapshot: LiveHudSnapshot) => void;
  onSubtitle: (subtitle: SubtitleLine | null) => void;
  onTransmission: (payload: { sender: string; text: string } | null) => void;
  onOpenMiniGame: (type: MiniGameType, contextLabel: string, optionalActivity?: OptionalActivityDef) => void;
  onMissionComplete: (missionIndex: number) => void;
  onOptionalComplete: (activity: OptionalActivityDef) => void;
  onLocationDiscovered: (locName: string) => void;
  onApolloDiscovered: () => void;
  onApolloCaption: (caption: string | null) => void;
  onBatteryPersist: (pct: number) => void;
  onCinematicsStateChange: (phase: LiveHudSnapshot['phase']) => void;
  onRequestToggleMap: () => void;
  onRequestTogglePause: () => void;
  onBuildingInspect: (building: ColonyBuildingInfo) => void;
}

interface DustParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
}

interface PhysicsProbe {
  mesh: THREE.Mesh;
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
}

export class LunarEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private progress: SaveProgress;

  private isSoftwareGl = false;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private earthBounceLight!: THREE.DirectionalLight;

  private frameId = 0;
  private disposed = false;
  private lastTime = performance.now();
  private elapsed = 0;

  // World entities (Earth kept 100% unchanged!)
  private skyEarth!: EarthRig;
  private closeEarth!: EarthRig;
  private closeMoonSphere!: THREE.Mesh;
  private starfield!: THREE.Points;
  private colonyBuildings: ColonyBuildingInfo[] = [];
  private chargingStations: ChargingStationInfo[] = [];
  private observatoryDomePivot?: THREE.Object3D;
  private colliders: Array<{ x: number; z: number; radius: number }> = [];
  private rockColliders: TerrainObstacle[] = [];
  private exteriorLights: THREE.PointLight[] = [];
  private airlockDoors: AnimatedAirlockDoor[] = [];
  private solarPanels: THREE.Mesh[] = [];
  private greenhouseGrowLights: THREE.PointLight[] = [];
  private outpostBeaconMat!: THREE.MeshStandardMaterial;
  private worldProps!: WorldPropsRig;
  private departureShip!: SpacecraftRig;

  // Characters & Vehicle
  private explorerRig!: AstronautRig;
  private explorerLoco: LocomotionState = createLocomotionState();
  private commanderRig!: AstronautRig;
  private commanderLoco: LocomotionState = createLocomotionState();
  private commanderAtOverlook = false;
  private crewActors: AutonomousCrewActor[] = [];
  private roverRig!: LunarRoverRig;

  // Rover Battery & Charging State
  private roverBattery = 100;
  private roverCharging = false;
  private emergencyBoostActive = false;
  private emergencyBoostProgress = 0;
  private lowBatteryWarned = false;
  private batterySyncAccum = 0;

  // Mars-Style Terrain-Following Golden Navigation Trail + Destination Ring
  private navGrid!: LunarNavGrid;
  private goldenTrail!: GoldenTrailMesh;
  private destRingGroup!: THREE.Group;
  private currentRoute: Array<[number, number]> = [];
  private routeTargetKey = '';
  private routeCalcX = 0;
  private routeCalcZ = 0;
  private lastTrailMeshX = 0;
  private lastTrailMeshZ = 0;
  private routeRecalcCooldown = 0;
  private destMarkerX = 0;
  private destMarkerZ = 0;
  private destMarkerInitialized = false;

  // Footprints & Rover Tire Tracks Ring Buffers
  private footprintInstanced!: THREE.InstancedMesh;
  private footprintIdx = 0;
  private footprintStepSide = 1;
  private trackInstanced!: THREE.InstancedMesh;
  private trackIdx = 0;
  private lastTrackX = 0;
  private lastTrackZ = 26;

  // Pooled dust particles & throwable 1.62 m/s² physics probe
  private dustInstanced!: THREE.InstancedMesh;
  private dustPool: DustParticle[] = [];
  private probe!: PhysicsProbe;

  // Player & Vehicle Physics State
  private phase: LiveHudSnapshot['phase'] = 'cinematic_opening';
  private cinematicTimer = 0;
  private cinematicScene = 1;
  private lastSubtitleKey = '';

  private playerX = -75;
  private playerZ = -48;
  private playerY = 0;
  private playerVX = 0;
  private playerVZ = 0;
  private playerVelY = 0;
  private playerGrounded = true;
  private playerHeading = 0.6;
  private scannerAnimTimer = 0;

  // Apollo 11 Tranquility Base discovery & close-up inspection state
  private apolloInspectTimer = 0;
  private apolloCaptionStep = 0;
  private apolloEnteredAreaNotified = false;
  private readonly apolloFootprintWorldX = APOLLO_SITE_X + APOLLO_FOOTPRINT_OFFSET_X;
  private readonly apolloFootprintWorldZ = APOLLO_SITE_Z + APOLLO_FOOTPRINT_OFFSET_Z;

  private vehicleState: VehicleState = 'PARKED';
  private get inVehicle(): boolean {
    return this.vehicleState === 'PLAYER_DRIVING';
  }
  private evX = 0;
  private evZ = 26;
  private evHeading = Math.PI;
  private evSpeed = 0;
  private evThrottle = 0;
  private evBrake = 0;
  private evSteer = 0;
  private evAirY = 0;
  private evVelY = 0;
  private pendingExitAfterStop = false;
  private vehicleAnimTimer = 0;
  private vehicleAnimStartPos = new THREE.Vector3();
  private vehicleAnimEndPos = new THREE.Vector3();
  private vehicleAnimStartHeading = 0;
  private vehicleAnimEndHeading = 0;

  // Dynamic Camera orbit/follow state
  private camYaw = 0.4;
  private camPitch = 0.32;
  private camDist = 9.0;
  private camManualCooldown = 0;
  private dynamicCamDist = 9.0;
  private dynamicCamPitch = 0.28;
  private dynamicCamFov = 54;
  private dynamicLookHeight = 1.75;
  private landCameraDip = 0;
  private activeCameraMode: LiveHudSnapshot['activeCameraMode'] = 'walk';
  private pointerDown = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private currentLookAt = new THREE.Vector3(-75, 4, -48);

  // Input state
  private heldKeys = new Set<string>();
  private virtualInput = { forward: 0, turn: 0, jump: false };
  private listenersBound = false;
  private paused = false;
  private activeModalOpen = false;

  // Mission tracking
  private collectCount = 0;
  private collectedFragIndices = new Set<number>();
  private hudSyncAccum = 0;
  private rockfallDetourActive = false;

  constructor(container: HTMLElement, initialProgress: SaveProgress, callbacks: EngineCallbacks) {
    this.container = container;
    this.progress = initialProgress;
    this.callbacks = callbacks;
    this.roverBattery = Math.max(0, Math.min(100, initialProgress.roverBattery ?? 100));
    this.lowBatteryWarned = this.roverBattery <= 20;
    this.rockfallDetourActive =
      initialProgress.completedMissions.includes(17) || initialProgress.currentMissionIndex >= 17;

    this.initRendererAndScene();
    this.initWorld();
    this.initActorsAndRover();
    this.initNavigationTracksAndDust();
    this.bindEvents();

    if (initialProgress.currentMissionIndex > 0 || initialProgress.completedMissions.length > 0) {
      this.enterPlayingFromSave();
    } else {
      this.startOpeningCinematic();
    }

    this.lastTime = performance.now();
    this.tick();
  }

  private detectSoftwareWebGL(): boolean {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  }

  private initRendererAndScene() {
    this.isSoftwareGl = this.detectSoftwareWebGL();
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020307);
    this.scene.fog = new THREE.FogExp2(0x05070e, 0.0011);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(54, w / h, 0.25, 4200);

    this.hemiLight = new THREE.HemisphereLight(0x8bb8e8, 0x20242c, 0.42);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff8eb, 2.35);
    this.sunLight.position.set(160, 145, 95);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    const d = 115;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 420;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.earthBounceLight = new THREE.DirectionalLight(0x4ea8ff, 0.35);
    this.earthBounceLight.position.set(-140, 120, -240);
    this.scene.add(this.earthBounceLight);
  }

  private initWorld() {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    this.starfield = createStarfield(2400, 1400);
    this.scene.add(this.starfield);

    const { terrainMesh, rockInstanced, slabInstanced, rockObstacles } = buildLunarTerrainMesh(maxAniso);
    this.scene.add(terrainMesh);
    this.scene.add(rockInstanced);
    this.scene.add(slabInstanced);

    // Approved Earth (UNCHANGED!)
    this.skyEarth = createEarthRig(88, maxAniso);
    this.skyEarth.group.position.set(-340, 275, -620);
    this.skyEarth.group.rotation.z = 0.35;
    this.scene.add(this.skyEarth.group);

    this.closeEarth = createEarthRig(48, maxAniso);
    this.closeEarth.group.position.set(0, 1850, -180);
    this.closeEarth.group.rotation.z = 0.28;
    this.closeEarth.group.visible = false;
    this.scene.add(this.closeEarth.group);

    this.closeMoonSphere = new THREE.Mesh(
      new THREE.SphereGeometry(18, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.92, metalness: 0.05 }),
    );
    this.closeMoonSphere.position.set(0, 1825, -450);
    this.closeMoonSphere.visible = false;
    this.scene.add(this.closeMoonSphere);

    // Upgraded 15+ building colony + Rover Charging Stations
    const colony = buildLunarColony();
    this.scene.add(colony.group);
    this.colonyBuildings = colony.buildings;
    this.chargingStations = colony.chargingStations;
    this.observatoryDomePivot = colony.observatoryDomePivot;
    this.colliders = colony.colliders;
    this.exteriorLights = colony.exteriorLights;
    this.airlockDoors = colony.airlockDoors;
    this.solarPanels = colony.solarPanels;
    this.greenhouseGrowLights = colony.greenhouseGrowLights;
    this.outpostBeaconMat = colony.outpostBeaconMat;

    // Scenic lunar rock seat at Earthrise Overlook for opening sequence
    const earthYaw = Math.atan2(-340 - -73.8, -620 - -47.5);
    const leftX = -Math.cos(earthYaw);
    const leftZ = Math.sin(earthYaw);
    const fwdX = Math.sin(earthYaw);
    const fwdZ = Math.cos(earthYaw);
    const cmdSeatX = -73.8 + leftX * 2.0 + fwdX * 0.25;
    const cmdSeatZ = -47.5 + leftZ * 2.0 + fwdZ * 0.25;
    const rockCenterX = cmdSeatX - fwdX * 0.24;
    const rockCenterZ = cmdSeatZ - fwdZ * 0.24;
    const rockGeo = new THREE.DodecahedronGeometry(0.72, 1);
    const rPos = rockGeo.attributes.position;
    for (let i = 0; i < rPos.count; i++) {
      let py = rPos.getY(i);
      if (py > 0.22) py = 0.22 + (py - 0.22) * 0.25; // Natural flat-topped rock perch
      rPos.setY(i, py * 0.78);
      rPos.setX(i, rPos.getX(i) * 1.15);
      rPos.setZ(i, rPos.getZ(i) * 1.05);
    }
    rockGeo.computeVertexNormals();
    const overlookRock = new THREE.Mesh(
      rockGeo,
      new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.94, metalness: 0.04 }),
    );
    overlookRock.position.set(rockCenterX, groundHeightAt(rockCenterX, rockCenterZ) + 0.24, rockCenterZ);
    overlookRock.rotation.y = earthYaw + 0.35;
    overlookRock.castShadow = true;
    overlookRock.receiveShadow = true;
    this.scene.add(overlookRock);
    this.colliders.push({ x: rockCenterX, z: rockCenterZ, radius: 0.92 });

    // Filter larger boulders as physical colliders (kept clear of mission interaction spots)
    this.rockColliders = rockObstacles.filter((r) => r.radius >= 1.25);
    this.navGrid = new LunarNavGrid(this.colliders, rockObstacles);

    const props = buildMissionWorldProps();
    this.scene.add(props.root);
    this.worldProps = props.rig;
    // Keep only the vertical flagpole solid so player and rover never clip through it while keeping the plain open
    this.colliders.push({
      x: APOLLO_SITE_X + APOLLO_FLAG_OFFSET_X,
      z: APOLLO_SITE_Z + APOLLO_FLAG_OFFSET_Z,
      radius: 0.35,
    });

    this.departureShip = createDepartureSpacecraft();
    this.departureShip.group.position.set(-52, groundHeightAt(-52, -2), -2);
    if (this.progress.completedMissions.includes(7)) {
      this.departureShip.group.visible = false;
    }
    this.scene.add(this.departureShip.group);
  }

  private initActorsAndRover() {
    this.explorerRig = createAstronautRig(0xf59e0b, false, true);
    this.scene.add(this.explorerRig.root);

    this.commanderRig = createAstronautRig(0x2563eb, true, false);
    if (this.progress.completedMissions.includes(7)) {
      this.commanderRig.root.visible = false;
    }
    this.scene.add(this.commanderRig.root);

    this.crewActors = createCrewActors(this.scene);

    this.roverRig = createLunarRover();
    this.scene.add(this.roverRig.root);
    updateRoverSuspensionAndTransform(this.roverRig, this.evX, this.evZ, this.evHeading, 0, 0, 0, 0.016, false, true);
    updateRoverBatteryVisuals(this.roverRig, this.roverBattery, false);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private initNavigationTracksAndDust() {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    // 1. Mars-Style Golden Terrain-Following Navigation Trail
    this.goldenTrail = new GoldenTrailMesh(maxAniso);
    this.goldenTrail.mesh.visible = false;
    this.scene.add(this.goldenTrail.mesh);

    // Subtle golden waypoint ring at destination (clean, low-occlusion)
    this.destRingGroup = new THREE.Group();
    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(1.45, 1.8, 32),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide, transparent: true, opacity: 0.78, depthWrite: false }),
    );
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = 0.14;
    this.destRingGroup.add(outerRing);
    const innerRing = new THREE.Mesh(
      new THREE.RingGeometry(0.65, 0.85, 24),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide, transparent: true, opacity: 0.6, depthWrite: false }),
    );
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.16;
    this.destRingGroup.add(innerRing);
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.16, 6.0, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }),
    );
    spire.position.y = 3.0;
    this.destRingGroup.add(spire);
    this.destRingGroup.visible = false;
    this.scene.add(this.destRingGroup);

    // 2. Astronaut Footprints Ring Buffer (280 decals)
    const footGeo = new THREE.PlaneGeometry(0.28, 0.46);
    footGeo.rotateX(-Math.PI / 2);
    const footMat = new THREE.MeshBasicMaterial({
      map: createFootprintTexture(),
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.footprintInstanced = new THREE.InstancedMesh(footGeo, footMat, 280);
    this.footprintInstanced.frustumCulled = false;
    _dummyMatrix.makeScale(0, 0, 0);
    for (let i = 0; i < 280; i++) this.footprintInstanced.setMatrixAt(i, _dummyMatrix);
    this.footprintInstanced.instanceMatrix.needsUpdate = true;
    this.scene.add(this.footprintInstanced);

    // 3. Lunar Rover Wire-Mesh Tire Tracks Ring Buffer (320 decals)
    const trackGeo = new THREE.PlaneGeometry(0.42, 1.25);
    trackGeo.rotateX(-Math.PI / 2);
    const trackMat = new THREE.MeshBasicMaterial({
      map: createRoverTrackTexture(),
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.trackInstanced = new THREE.InstancedMesh(trackGeo, trackMat, 320);
    this.trackInstanced.frustumCulled = false;
    for (let i = 0; i < 320; i++) this.trackInstanced.setMatrixAt(i, _dummyMatrix);
    this.trackInstanced.instanceMatrix.needsUpdate = true;
    this.scene.add(this.trackInstanced);

    // 4. Pooled Lunar Dust Particle System (96 particles)
    const dustGeo = new THREE.DodecahedronGeometry(0.22, 0);
    const dustMat = new THREE.MeshBasicMaterial({
      color: 0xcbd5e1,
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
    });
    this.dustInstanced = new THREE.InstancedMesh(dustGeo, dustMat, 96);
    this.dustInstanced.frustumCulled = false;
    for (let i = 0; i < 96; i++) {
      this.dustPool.push({ active: false, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, life: 0, maxLife: 1, scale: 1 });
      this.dustInstanced.setMatrixAt(i, _dummyMatrix);
    }
    this.dustInstanced.instanceMatrix.needsUpdate = true;
    this.scene.add(this.dustInstanced);

    // 5. Throwable 1.62 m/s² Physics Science Probe
    const probeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xd97706, emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.3 }),
    );
    probeMesh.castShadow = true;
    probeMesh.visible = false;
    this.scene.add(probeMesh);
    this.probe = { mesh: probeMesh, active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0 };
  }

  private stampFootprint(x: number, z: number, heading: number) {
    this.footprintStepSide *= -1;
    const perpX = Math.cos(heading) * 0.18 * this.footprintStepSide;
    const perpZ = -Math.sin(heading) * 0.18 * this.footprintStepSide;
    const fx = x + perpX;
    const fz = z + perpZ;
    const fy = groundHeightAt(fx, fz) + 0.04;

    const normal = groundNormalAt(fx, fz, _normal);
    _alignQuat.setFromUnitVectors(_up, normal);
    _yawQuat.setFromAxisAngle(_up, heading);
    _alignQuat.multiply(_yawQuat);

    _dummyObj.position.set(fx, fy, fz);
    _dummyObj.quaternion.copy(_alignQuat);
    _dummyObj.scale.set(1, 1, 1);
    _dummyObj.updateMatrix();

    this.footprintInstanced.setMatrixAt(this.footprintIdx, _dummyObj.matrix);
    this.footprintInstanced.instanceMatrix.needsUpdate = true;
    this.footprintIdx = (this.footprintIdx + 1) % 280;
  }

  private stampRoverTracks(x: number, z: number, heading: number) {
    const cosH = Math.cos(heading);
    const sinH = Math.sin(heading);
    for (const side of [-1.28, 1.28]) {
      const tx = x + side * cosH - 1.15 * sinH;
      const tz = z - side * sinH - 1.15 * cosH;
      const ty = groundHeightAt(tx, tz) + 0.045;
      const normal = groundNormalAt(tx, tz, _normal);
      _alignQuat.setFromUnitVectors(_up, normal);
      _yawQuat.setFromAxisAngle(_up, heading);
      _alignQuat.multiply(_yawQuat);

      _dummyObj.position.set(tx, ty, tz);
      _dummyObj.quaternion.copy(_alignQuat);
      _dummyObj.scale.set(1, 1, 1);
      _dummyObj.updateMatrix();
      this.trackInstanced.setMatrixAt(this.trackIdx, _dummyObj.matrix);
      this.trackIdx = (this.trackIdx + 1) % 320;
    }
    this.trackInstanced.instanceMatrix.needsUpdate = true;
  }

  private spawnDust(x: number, y: number, z: number, count = 4, speedScale = 1) {
    let spawned = 0;
    for (const p of this.dustPool) {
      if (!p.active) {
        p.active = true;
        p.x = x + (Math.random() - 0.5) * 0.6;
        p.y = y + 0.14;
        p.z = z + (Math.random() - 0.5) * 0.6;
        const a = Math.random() * Math.PI * 2;
        const spd = (0.55 + Math.random() * 1.3) * speedScale;
        p.vx = Math.cos(a) * spd;
        p.vy = (0.65 + Math.random() * 1.0) * speedScale;
        p.vz = Math.sin(a) * spd;
        p.life = 0;
        p.maxLife = 0.7 + Math.random() * 0.5;
        p.scale = 0.55 + Math.random() * 0.85;
        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  public tossLunarProbe() {
    if (this.phase !== 'playing' || this.paused || this.activeModalOpen || this.vehicleState !== 'PARKED') return;
    const spd = 6.2;
    this.probe.active = true;
    this.probe.x = this.playerX + Math.sin(this.playerHeading) * 0.7;
    this.probe.y = this.playerY + 1.45;
    this.probe.z = this.playerZ + Math.cos(this.playerHeading) * 0.7;
    this.probe.vx = Math.sin(this.playerHeading) * spd + this.playerVX * 0.4;
    this.probe.vy = 2.8;
    this.probe.vz = Math.cos(this.playerHeading) * spd + this.playerVZ * 0.4;
    this.probe.life = 0;
    this.probe.mesh.visible = true;
    lunarAudio.playJump();
  }

  private updatePhysicsProbe(dt: number) {
    if (!this.probe.active) return;
    this.probe.life += dt;
    this.probe.vy -= LUNAR_GRAVITY * dt;
    this.probe.x += this.probe.vx * dt;
    this.probe.y += this.probe.vy * dt;
    this.probe.z += this.probe.vz * dt;

    const gy = groundHeightAt(this.probe.x, this.probe.z) + 0.22;
    if (this.probe.y <= gy) {
      this.probe.y = gy;
      if (Math.abs(this.probe.vy) > 0.7) {
        this.probe.vy = -this.probe.vy * 0.48;
        this.probe.vx *= 0.72;
        this.probe.vz *= 0.72;
        this.spawnDust(this.probe.x, gy - 0.18, this.probe.z, 5, 0.8);
        lunarAudio.playLand();
      } else {
        this.probe.vy = 0;
        this.probe.vx *= 0.86;
        this.probe.vz *= 0.86;
      }
    }
    this.probe.mesh.position.set(this.probe.x, this.probe.y, this.probe.z);
    if (this.probe.life > 14) {
      this.probe.active = false;
      this.probe.mesh.visible = false;
    }
  }

  private getOverlookEarthYaw(): number {
    return Math.atan2(-340 - -73.8, -620 - -47.5);
  }

  private positionOverlookOpeningActors() {
    const earthYaw = this.getOverlookEarthYaw();
    const leftX = -Math.cos(earthYaw);
    const leftZ = Math.sin(earthYaw);
    const fwdX = Math.sin(earthYaw);
    const fwdZ = Math.cos(earthYaw);

    this.playerX = -73.8;
    this.playerZ = -47.5;
    this.playerY = groundHeightAt(this.playerX, this.playerZ);
    this.playerHeading = earthYaw;
    this.explorerRig.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.explorerRig.root.rotation.set(0, this.playerHeading, 0);

    const cmdX = -73.8 + leftX * 2.0 + fwdX * 0.25;
    const cmdZ = -47.5 + leftZ * 2.0 + fwdZ * 0.25;
    this.commanderRig.root.position.set(cmdX, groundHeightAt(cmdX, cmdZ), cmdZ);
    this.commanderRig.root.rotation.set(0, earthYaw - 0.14, 0);
    this.commanderRig.root.visible = true;
    this.commanderAtOverlook = true;
  }

  private startOpeningCinematic() {
    this.phase = 'cinematic_opening';
    this.cinematicTimer = 0;
    this.cinematicScene = 1;
    this.lastSubtitleKey = '';
    this.callbacks.onCinematicsStateChange('cinematic_opening');
    this.callbacks.onSubtitle(null);
    this.callbacks.onTransmission(null);

    this.closeEarth.group.visible = false;
    this.closeMoonSphere.visible = false;
    this.positionOverlookOpeningActors();

    applyAstronautAdmiringPose(this.explorerRig, 0);
    applyAstronautSeatedOnRockPose(this.commanderRig, 0, 0, 0);

    // Initialize camera on Shot 1 eye-level frame immediately (no cut on frame 0)
    this.updateOpeningShotPose(0);
  }

  public skipCinematic() {
    if (this.phase === 'cinematic_opening') this.finishOpeningCinematic();
    else if (this.phase === 'cinematic_departure') this.finishDepartureCinematic();
    else if (this.phase === 'cinematic_ending') this.finishEndingCinematic();
  }

  private finishOpeningCinematic() {
    this.closeEarth.group.visible = false;
    this.closeMoonSphere.visible = false;
    this.callbacks.onSubtitle(null);
    this.phase = 'playing';
    this.callbacks.onCinematicsStateChange('playing');

    const earthYaw = this.getOverlookEarthYaw();
    this.playerX = -73.8;
    this.playerZ = -47.5;
    this.playerY = groundHeightAt(this.playerX, this.playerZ);
    this.playerHeading = earthYaw;
    this.camYaw = earthYaw + Math.PI - 0.16;
    this.camPitch = 0.25;
    this.camDist = 8.0;
    this.currentLookAt.set(this.playerX, this.playerY + 1.75, this.playerZ);

    const horizDist = Math.cos(this.camPitch) * this.camDist;
    const endCamX = this.currentLookAt.x + Math.sin(this.camYaw) * horizDist;
    const endCamZ = this.currentLookAt.z + Math.cos(this.camYaw) * horizDist;
    const endCamY = Math.max(
      groundHeightAt(endCamX, endCamZ) + 1.4,
      this.currentLookAt.y + Math.sin(this.camPitch) * this.camDist,
    );
    this.camera.position.set(endCamX, endCamY, endCamZ);
    this.camera.lookAt(this.currentLookAt);

    // Keep Commander Vance seated naturally at Overlook (relocates silently to base once player leaves Overlook)
    this.commanderAtOverlook = true;

    this.callbacks.onTransmission({
      sender: 'Earth Mission Control',
      text: 'Lunar Research Team, we have detected an unusual meteorite impact near a remote lunar location. We need your team to investigate the site and report your findings.',
    });
    lunarAudio.playRadioBeep();
  }

  private clearAllMovementInputs() {
    this.heldKeys.clear();
    this.virtualInput.forward = 0;
    this.virtualInput.turn = 0;
    this.virtualInput.jump = false;
    this.evThrottle = 0;
    this.evBrake = 0;
  }

  private detachExplorerToScene() {
    if (this.explorerRig.root.parent !== this.scene) {
      this.roverRig.chassis.updateWorldMatrix(true, false);
      const wp = _v1;
      this.explorerRig.root.getWorldPosition(wp);
      this.scene.add(this.explorerRig.root);
      this.explorerRig.root.position.copy(wp);
      this.explorerRig.root.rotation.set(0, this.evHeading, 0);
    }
  }

  private forceParkRoverImmediate() {
    this.detachExplorerToScene();
    this.vehicleState = 'PARKED';
    this.evSpeed = 0;
    this.evThrottle = 0;
    this.evBrake = 0;
    this.evSteer = 0;
    this.evAirY = 0;
    this.evVelY = 0;
    this.pendingExitAfterStop = false;
    this.vehicleAnimTimer = 0;
    this.explorerRig.root.visible = true;
    this.clearAllMovementInputs();
    lunarAudio.updateRoverHum(false, 0);
  }

  private enterPlayingFromSave() {
    this.closeEarth.group.visible = false;
    this.closeMoonSphere.visible = false;
    this.forceParkRoverImmediate();
    this.evX = 0;
    this.evZ = 26;
    this.evHeading = Math.PI;
    updateRoverSuspensionAndTransform(this.roverRig, this.evX, this.evZ, this.evHeading, 0, 0, 0, 0.016, false, true);

    this.phase = 'playing';
    this.callbacks.onCinematicsStateChange('playing');
    this.playerX = 2;
    this.playerZ = 10;
    this.playerY = groundHeightAt(this.playerX, this.playerZ);
    this.playerVX = 0;
    this.playerVZ = 0;
    this.playerVelY = 0;
    this.playerGrounded = true;
    this.playerHeading = Math.PI;
    this.camYaw = 0.2;
    this.camPitch = 0.26;
    this.camDist = 8.2;
    this.currentLookAt.set(this.playerX, this.playerY + 1.75, this.playerZ);

    if (!this.progress.completedMissions.includes(7)) {
      this.commanderRig.root.position.set(-4, groundHeightAt(-4, -10), -10);
      this.commanderRig.root.visible = true;
    } else {
      this.commanderRig.root.visible = false;
      this.departureShip.group.visible = false;
    }
  }

  public startDepartureCinematic() {
    this.forceParkRoverImmediate();
    this.phase = 'cinematic_departure';
    this.cinematicTimer = 0;
    this.lastSubtitleKey = '';
    this.callbacks.onCinematicsStateChange('cinematic_departure');
    this.callbacks.onTransmission(null);
    lunarAudio.playRadioBeep();

    this.playerX = -42;
    this.playerZ = -2;
    this.playerY = groundHeightAt(this.playerX, this.playerZ);
    this.playerHeading = -Math.PI / 2;
    this.explorerRig.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.explorerRig.root.rotation.y = this.playerHeading;

    this.commanderRig.root.visible = true;
    this.commanderRig.root.position.set(-45.5, groundHeightAt(-45.5, -2), -2);
    this.commanderRig.root.rotation.y = Math.PI / 2;

    this.departureShip.group.visible = true;
    this.departureShip.group.position.set(-52, groundHeightAt(-52, -2), -2);
    this.departureShip.thrusterGlow.visible = false;
    this.departureShip.thrusterLight.intensity = 0;
  }

  private finishDepartureCinematic() {
    this.callbacks.onSubtitle(null);
    this.commanderRig.root.visible = false;
    this.departureShip.group.visible = false;
    this.departureShip.thrusterGlow.visible = false;
    this.departureShip.thrusterLight.intensity = 0;
    this.phase = 'playing';
    this.callbacks.onCinematicsStateChange('playing');
    this.completeCurrentMission();
  }

  public startEndingCinematic() {
    this.forceParkRoverImmediate();
    this.phase = 'cinematic_ending';
    this.cinematicTimer = 0;
    this.lastSubtitleKey = '';
    this.callbacks.onCinematicsStateChange('cinematic_ending');
    this.callbacks.onTransmission(null);

    const earthDir = Math.atan2(-340 - 0, -620 - 2);
    const lineup: Array<[number, number]> = [
      [0, 2],
      [-2.4, 2.5],
      [2.4, 2.5],
      [-4.8, 3.2],
      [4.8, 3.2],
    ];
    this.playerX = lineup[0][0];
    this.playerZ = lineup[0][1];
    this.playerY = groundHeightAt(this.playerX, this.playerZ);
    this.explorerRig.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.explorerRig.root.rotation.y = earthDir;

    this.crewActors.forEach((actor, i) => {
      const [cx, cz] = lineup[i + 1];
      actor.x = cx;
      actor.z = cz;
      actor.heading = earthDir;
      actor.rig.root.position.set(cx, groundHeightAt(cx, cz), cz);
      actor.rig.root.rotation.y = earthDir;
    });
  }

  private finishEndingCinematic() {
    this.callbacks.onSubtitle(null);
    this.phase = 'playing';
    this.callbacks.onCinematicsStateChange('playing');
    this.completeCurrentMission();
  }

  public syncProgress(nextProgress: SaveProgress) {
    const prevTrail = this.progress.showGoldenTrail !== false;
    const nextTrail = nextProgress.showGoldenTrail !== false;
    this.progress = nextProgress;
    if (prevTrail !== nextTrail) {
      this.routeTargetKey = '';
      if (!nextTrail) {
        this.goldenTrail.mesh.visible = false;
        this.destRingGroup.visible = false;
        this.currentRoute = [];
      }
    }
    this.rockfallDetourActive =
      nextProgress.completedMissions.includes(17) || nextProgress.currentMissionIndex >= 17;
    if (nextProgress.completedMissions.includes(7)) {
      this.commanderRig.root.visible = false;
      this.departureShip.group.visible = false;
    }
  }

  public setPaused(paused: boolean) {
    this.paused = paused;
    if (paused) {
      this.evSpeed = 0;
      this.evSteer = 0;
      this.clearAllMovementInputs();
      lunarAudio.updateRoverHum(false, 0);
    }
  }

  public setModalOpen(open: boolean) {
    this.activeModalOpen = open;
    if (open) {
      this.evSpeed = 0;
      this.evSteer = 0;
      if (this.apolloInspectTimer > 0) {
        this.apolloInspectTimer = 0;
        this.apolloCaptionStep = 0;
        this.callbacks.onApolloCaption(null);
      }
      this.clearAllMovementInputs();
      lunarAudio.updateRoverHum(false, 0);
    }
  }

  public setLunarTime(time01: number) {
    this.progress.lunarTime = ((time01 % 1) + 1) % 1;
  }

  public resetToBase() {
    this.forceParkRoverImmediate();
    if (this.apolloInspectTimer > 0) {
      this.apolloInspectTimer = 0;
      this.apolloCaptionStep = 0;
      this.callbacks.onApolloCaption(null);
    }
    this.roverCharging = false;
    this.emergencyBoostActive = false;
    this.emergencyBoostProgress = 0;
    this.roverBattery = 100;
    this.lowBatteryWarned = false;
    updateRoverBatteryVisuals(this.roverRig, this.roverBattery, false);
    this.callbacks.onBatteryPersist(100);

    this.playerX = 0;
    this.playerZ = 6;
    this.playerY = groundHeightAt(0, 6);
    this.playerVX = 0;
    this.playerVZ = 0;
    this.playerVelY = 0;
    this.playerGrounded = true;
    this.evX = 0;
    this.evZ = 26;
    this.evHeading = Math.PI;
    updateRoverSuspensionAndTransform(this.roverRig, this.evX, this.evZ, this.evHeading, 0, 0, 0, 0.016, false, true);
  }

  private getRoverChargingStation(): ChargingStationInfo | null {
    for (const st of this.chargingStations) {
      if (Math.hypot(this.evX - st.x, this.evZ - st.z) <= st.radius + 1.0) {
        return st;
      }
    }
    return null;
  }

  public startChargingRover() {
    if (this.phase !== 'playing' || this.paused || this.activeModalOpen) return;
    const station = this.getRoverChargingStation();
    if (!station) return;
    if (this.roverBattery >= 99.5) return;
    if (Math.abs(this.evSpeed) > 0.7) {
      this.evThrottle = 0;
      this.evSpeed = 0;
    }
    lunarAudio.unlock();
    this.roverCharging = true;
    this.emergencyBoostActive = false;
    this.emergencyBoostProgress = 0;
    lunarAudio.playChime();
  }

  public triggerEmergencySolarBoost() {
    if (this.phase !== 'playing' || this.paused || this.activeModalOpen) return;
    if (this.roverBattery > 0.5 || this.emergencyBoostActive || this.roverCharging) return;
    const nearRover = this.vehicleState === 'PLAYER_DRIVING' || Math.hypot(this.playerX - this.evX, this.playerZ - this.evZ) < 6.5;
    if (!nearRover) return;
    lunarAudio.unlock();
    this.emergencyBoostActive = true;
    this.emergencyBoostProgress = 0;
    lunarAudio.playScanPulse();
    this.callbacks.onTransmission({
      sender: 'Rover Power System',
      text: 'Unfolding emergency backup solar wing! Hold steady for 2.5 seconds to recharge 30% drive power.',
    });
  }

  public triggerPrimaryAction() {
    if (this.phase !== 'playing' || this.paused || this.activeModalOpen) return;
    if (this.vehicleState === 'PLAYER_ENTERING' || this.vehicleState === 'PLAYER_EXITING') return;
    lunarAudio.unlock();

    const mission = CAMPAIGN_MISSIONS[this.progress.currentMissionIndex];
    const obj = mission?.objectives[this.progress.currentObjectiveIndex];
    const chargingStation = this.getRoverChargingStation();

    if (this.vehicleState === 'PLAYER_DRIVING') {
      if (chargingStation && this.roverBattery <= 0.5 && !this.roverCharging) {
        this.startChargingRover();
        return;
      }
      this.requestExitVehicle();
      return;
    }

    // 1. Primary mission objective interactions
    if (mission && obj) {
      if (obj.type === 'collect' && obj.targetPosition) {
        for (let i = 0; i < this.worldProps.meteoriteFragments.length; i++) {
          if (this.collectedFragIndices.has(i)) continue;
          const fg = this.worldProps.meteoriteFragments[i];
          if (Math.hypot(this.playerX - fg.position.x, this.playerZ - fg.position.z) < 5.5) {
            this.collectedFragIndices.add(i);
            fg.visible = false;
            this.collectCount++;
            this.scannerAnimTimer = 0.85;
            lunarAudio.playChime();
            this.spawnDust(fg.position.x, fg.position.y, fg.position.z, 8, 1.1);
            if (this.collectCount >= (obj.requiredCount ?? 3)) {
              this.advanceObjective();
            }
            return;
          }
        }
      }

      if (
        (obj.type === 'interact' || obj.type === 'minigame' || obj.type === 'transmit') &&
        obj.targetPosition
      ) {
        const dist = Math.hypot(this.playerX - obj.targetPosition[0], this.playerZ - obj.targetPosition[1]);
        if (dist <= (obj.radius ?? 8) + 2.5) {
          this.scannerAnimTimer = 0.9;
          if (obj.type === 'minigame' && obj.miniGame) {
            lunarAudio.playScanPulse();
            this.callbacks.onOpenMiniGame(obj.miniGame, obj.label);
            return;
          }
          if (obj.type === 'interact') {
            lunarAudio.playChime();
            if (mission.id === 1) {
              this.callbacks.onTransmission({
                sender: 'Commander Vance',
                text: 'Confirmed! The meteorite impact site is mapped. Head to the Rover Garage to prepare our Lunar EV!',
              });
            } else if (mission.id === 6) {
              this.callbacks.onTransmission({
                sender: 'Maya (Geological Lab)',
                text: 'Lab spectrometers active! The meteorite crystals formed in deep space long before reaching the Moon!',
              });
            }
            this.advanceObjective();
            return;
          }
          if (obj.type === 'transmit') {
            lunarAudio.playRadioBeep();
            this.callbacks.onTransmission({
              sender: 'Earth Mission Control',
              text: 'Transmission received: "The meteorite contains material that formed in space long before it reached the Moon." Outstanding work, Lunar Team!',
            });
            this.advanceObjective();
            return;
          }
        }
      }
    }

    // 2. Inspect Historic Apollo 11 Footprint nearby (on foot)
    if (
      Math.hypot(this.playerX - this.apolloFootprintWorldX, this.playerZ - this.apolloFootprintWorldZ) < 5.0
    ) {
      this.startApolloInspection();
      return;
    }

    // 3. Charge or Enter Lunar EV if nearby
    if (Math.hypot(this.playerX - this.evX, this.playerZ - this.evZ) < 5.5) {
      if (chargingStation && this.roverBattery <= 0.5 && !this.roverCharging) {
        this.startChargingRover();
        return;
      }
      this.enterVehicle();
      return;
    }

    // 4. Optional activity nearby
    const nearOptional = this.findNearbyOptional();
    if (nearOptional) {
      this.scannerAnimTimer = 0.85;
      if (nearOptional.miniGame) {
        lunarAudio.playScanPulse();
        this.callbacks.onOpenMiniGame(nearOptional.miniGame, nearOptional.title, nearOptional);
      } else {
        lunarAudio.playSuccessFanfare();
        this.callbacks.onOptionalComplete(nearOptional);
      }
      return;
    }

    // 4. Talk to nearby Teenage Crew NPC
    const nearCrew = this.findNearbyCrew();
    if (nearCrew) {
      // Face player and wave
      nearCrew.heading = Math.atan2(this.playerX - nearCrew.x, this.playerZ - nearCrew.z);
      nearCrew.waitTimer = 4.0;
      lunarAudio.playChime();
      const missionNum = this.progress.currentMissionIndex + 1;
      this.callbacks.onTransmission({
        sender: `${nearCrew.def.name} (${nearCrew.def.role})`,
        text: getCrewDialogueLine(nearCrew.def.id, missionNum),
      });
      return;
    }

    // 6. Inspect nearby Base Building
    const nearBuilding = this.findNearbyBuilding();
    if (nearBuilding) {
      lunarAudio.playChime();
      this.callbacks.onBuildingInspect(nearBuilding);
    }
  }

  private startApolloInspection() {
    this.playerVX = 0;
    this.playerVZ = 0;
    this.playerHeading = Math.atan2(
      this.apolloFootprintWorldX - this.playerX,
      this.apolloFootprintWorldZ - this.playerZ,
    );
    this.explorerRig.root.rotation.y = this.playerHeading;

    lunarAudio.playApolloDiscoveryChime();
    this.apolloInspectTimer = 0.001;
    this.apolloCaptionStep = 1;
    this.callbacks.onApolloCaption('A small step in history.');

    // Persist first-time discovery immediately (+500 exploration points + Lunar Pioneer badge)
    if (!this.progress.apolloDiscovered) {
      this.callbacks.onApolloDiscovered();
    }
  }

  public completeMiniGameSuccess(optionalActivity?: OptionalActivityDef) {
    if (optionalActivity) {
      lunarAudio.playSuccessFanfare();
      this.callbacks.onOptionalComplete(optionalActivity);
      return;
    }
    lunarAudio.playSuccessFanfare();
    if (this.progress.currentMissionIndex === 19) {
      this.startEndingCinematic();
      return;
    }
    this.advanceObjective();
  }

  private getDriverSeatWorldPosition(out: THREE.Vector3): THREE.Vector3 {
    this.roverRig.chassis.updateWorldMatrix(true, false);
    out.set(-0.46, 0.34, 0.0);
    return this.roverRig.chassis.localToWorld(out);
  }

  private findSafeExitSpot(): [number, number] {
    const cosH = Math.cos(this.evHeading);
    const sinH = Math.sin(this.evHeading);
    const candidates: Array<[number, number]> = [
      [-2.45, 0],
      [2.45, 0],
      [0, -3.1],
      [0, 3.1],
    ];
    for (const [lx, lz] of candidates) {
      const wx = this.evX + lx * cosH + lz * sinH;
      const wz = this.evZ - lx * sinH + lz * cosH;
      if (Math.hypot(wx, wz) > WORLD_PLAYABLE_RADIUS - 1) continue;
      let blocked = false;
      for (const c of this.colliders) {
        if (Math.hypot(wx - c.x, wz - c.z) < c.radius + 0.75) {
          blocked = true;
          break;
        }
      }
      if (!blocked && Math.hypot(wx - this.evX, wz - this.evZ) >= 2.2) {
        return [wx, wz];
      }
    }
    return [this.evX - cosH * 2.45, this.evZ + sinH * 2.45];
  }

  private enterVehicle() {
    if (this.vehicleState !== 'PARKED') return;
    this.vehicleState = 'PLAYER_ENTERING';
    this.vehicleAnimTimer = 0;
    this.pendingExitAfterStop = false;

    this.evSpeed = 0;
    this.evThrottle = 0;
    this.evBrake = 0;
    this.evSteer = 0;
    this.playerVX = 0;
    this.playerVZ = 0;
    this.playerVelY = 0;
    this.playerGrounded = true;
    this.scannerAnimTimer = 0;
    this.explorerRig.scannerBeam.visible = false;
    this.roverRig.tutorialHighlight.visible = false;

    this.detachExplorerToScene();
    this.explorerRig.root.visible = true;
    this.vehicleAnimStartPos.set(this.playerX, this.playerY, this.playerZ);
    this.getDriverSeatWorldPosition(this.vehicleAnimEndPos);
    this.vehicleAnimStartHeading = this.playerHeading;
    this.vehicleAnimEndHeading = this.evHeading;
    lunarAudio.playChime();
  }

  private completeEnterVehicle() {
    this.vehicleState = 'PLAYER_DRIVING';
    this.evSpeed = 0;
    this.evThrottle = 0;
    this.evBrake = 0;
    this.evSteer = 0;
    this.clearAllMovementInputs();

    this.roverRig.chassis.add(this.explorerRig.root);
    this.explorerRig.root.position.set(-0.46, 0.34, 0.0);
    this.explorerRig.root.rotation.set(0, 0, 0);
    this.explorerRig.root.visible = true;
    applyAstronautSeatedPose(this.explorerRig, 0, this.elapsed);

    this.playerX = this.evX;
    this.playerZ = this.evZ;
    this.playerY = groundHeightAt(this.evX, this.evZ);
    this.playerHeading = this.evHeading;

    const mission = CAMPAIGN_MISSIONS[this.progress.currentMissionIndex];
    const obj = mission?.objectives[this.progress.currentObjectiveIndex];
    if (obj?.type === 'enter_ev') {
      this.advanceObjective();
    }
  }

  private requestExitVehicle() {
    if (this.vehicleState !== 'PLAYER_DRIVING') return;
    this.evThrottle = 0;
    if (Math.abs(this.evSpeed) > 0.35) {
      // Stop the rover safely before beginning exit animation
      this.pendingExitAfterStop = true;
      return;
    }
    this.beginExitVehicleAnimation();
  }

  private beginExitVehicleAnimation() {
    this.vehicleState = 'PLAYER_EXITING';
    this.vehicleAnimTimer = 0;
    this.pendingExitAfterStop = false;
    this.evSpeed = 0;
    this.evThrottle = 0;
    this.evBrake = 0;
    this.evSteer = 0;
    this.clearAllMovementInputs();
    lunarAudio.updateRoverHum(false, 0);

    this.getDriverSeatWorldPosition(this.vehicleAnimStartPos);
    this.detachExplorerToScene();
    this.explorerRig.root.position.copy(this.vehicleAnimStartPos);
    this.explorerRig.root.visible = true;

    const [sx, sz] = this.findSafeExitSpot();
    this.vehicleAnimEndPos.set(sx, groundHeightAt(sx, sz), sz);
    this.vehicleAnimStartHeading = this.evHeading;
    this.vehicleAnimEndHeading = Math.atan2(sx - this.evX, sz - this.evZ);
    lunarAudio.playChime();
  }

  private completeExitVehicle() {
    this.vehicleState = 'PARKED';
    this.evSpeed = 0;
    this.evThrottle = 0;
    this.evBrake = 0;
    this.evSteer = 0;
    this.evAirY = 0;
    this.evVelY = 0;
    this.clearAllMovementInputs();

    this.playerX = this.vehicleAnimEndPos.x;
    this.playerZ = this.vehicleAnimEndPos.z;
    this.playerY = this.vehicleAnimEndPos.y;
    this.playerHeading = this.vehicleAnimEndHeading;
    this.playerVX = 0;
    this.playerVZ = 0;
    this.playerVelY = 0;
    this.playerGrounded = true;

    this.explorerRig.root.position.set(this.playerX, this.playerY, this.playerZ);
    this.explorerRig.root.rotation.set(0, this.playerHeading, 0);
    this.explorerRig.root.visible = true;
    applyAstronautLocomotion(this.explorerRig, this.explorerLoco, 0, false, true, 0, 0, 0.016, this.elapsed);

    const mission = CAMPAIGN_MISSIONS[this.progress.currentMissionIndex];
    const obj = mission?.objectives[this.progress.currentObjectiveIndex];
    if (obj?.type === 'exit_ev') {
      this.advanceObjective();
    }
  }

  private advanceObjective() {
    const mission = CAMPAIGN_MISSIONS[this.progress.currentMissionIndex];
    if (!mission) return;
    if (this.progress.currentObjectiveIndex + 1 < mission.objectives.length) {
      this.progress.currentObjectiveIndex++;
      this.collectCount = 0;
    } else {
      this.completeCurrentMission();
    }
  }

  private completeCurrentMission() {
    const idx = this.progress.currentMissionIndex;
    this.collectCount = 0;
    this.collectedFragIndices.clear();
    this.worldProps.meteoriteFragments.forEach((f) => (f.visible = true));
    lunarAudio.playSuccessFanfare();
    this.callbacks.onMissionComplete(idx);
  }

  private triggerJump() {
    if (this.phase !== 'playing' || this.paused || this.activeModalOpen) return;
    // Only jump on foot when parked (Space acts as Brake when PLAYER_DRIVING)
    if (this.vehicleState !== 'PARKED') return;
    if (this.playerGrounded) {
      this.playerVelY = EXPLORER_JUMP_VELOCITY;
      this.playerGrounded = false;
      this.spawnDust(this.playerX, this.playerY, this.playerZ, 7, 1.0);
      lunarAudio.playJump();
    }
  }

  private bindEvents() {
    if (this.listenersBound) return;
    this.listenersBound = true;

    const onKeyDown = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA')) return;
      if (e.repeat) return;
      this.heldKeys.add(e.code);
      if (e.code === 'Space') {
        if (this.phase === 'playing' && !this.activeModalOpen) {
          e.preventDefault();
          if (this.vehicleState === 'PARKED') {
            this.triggerJump();
          }
        }
      } else if (e.code === 'KeyE') {
        this.triggerPrimaryAction();
      } else if (e.code === 'KeyC') {
        this.startChargingRover();
      } else if (e.code === 'KeyB') {
        this.triggerEmergencySolarBoost();
      } else if (e.code === 'KeyG') {
        this.tossLunarProbe();
      } else if (e.code === 'KeyM') {
        if (this.phase === 'playing') this.callbacks.onRequestToggleMap();
      } else if (e.code === 'Escape') {
        if (this.phase === 'playing' && !this.activeModalOpen) this.callbacks.onRequestTogglePause();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      this.heldKeys.delete(e.code);
    };

    const onBlur = () => {
      this.clearAllMovementInputs();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        this.clearAllMovementInputs();
      }
    };

    const canvas = this.renderer.domElement;
    const onPointerDown = (e: PointerEvent) => {
      lunarAudio.unlock();
      this.pointerDown = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!this.pointerDown || this.phase !== 'playing' || this.activeModalOpen) return;
      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      const sens = THREE.MathUtils.clamp(this.progress.cameraSensitivity ?? 1.0, 0.4, 2.2);
      this.camYaw -= dx * 0.0065 * sens;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.005 * sens, 0.10, 0.98);
      this.camManualCooldown = 2.4;
    };
    const onPointerUp = () => {
      this.pointerDown = false;
    };
    const onWheel = (e: WheelEvent) => {
      if (this.phase !== 'playing' || this.activeModalOpen) return;
      this.camDist = THREE.MathUtils.clamp(this.camDist + e.deltaY * 0.01, 5.5, 22);
    };

    const onResize = () => {
      if (this.disposed) return;
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('resize', onResize);
    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: true });

    this.cleanupListeners = () => {
      this.listenersBound = false;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }

  private cleanupListeners: () => void = () => {};

  private setSubtitleOnce(key: string, sub: SubtitleLine | null) {
    if (this.lastSubtitleKey === key) return;
    this.lastSubtitleKey = key;
    this.callbacks.onSubtitle(sub);
  }

  private updateOpeningShotPose(t: number) {
    const earthYaw = this.getOverlookEarthYaw();
    const fwdX = Math.sin(earthYaw);
    const fwdZ = Math.cos(earthYaw);
    const rightX = Math.cos(earthYaw);
    const rightZ = -Math.sin(earthYaw);

    const expX = -73.8;
    const expZ = -47.5;
    const expY = groundHeightAt(expX, expZ);
    const midX = expX - rightX * 1.0 + fwdX * 0.12;
    const midZ = expZ - rightZ * 1.0 + fwdZ * 0.12;
    const midY = groundHeightAt(midX, midZ);

    const smoother = (x: number) => {
      const c = THREE.MathUtils.clamp(x, 0, 1);
      return c * c * c * (c * (c * 6 - 15) + 10);
    };

    // Shot 1 (0..3.6s): Standing astronaut eye-level perspective admiring Earth across horizon
    const s1X = expX + fwdX * 0.45;
    const s1Z = expZ + fwdZ * 0.45;
    const s1Y = expY + 1.66 + Math.sin(t * 1.35) * 0.012;
    const s1LookX = s1X + fwdX * 120;
    const s1LookY = s1Y + 23.0; // Frames Earth in upper lunar sky + horizon & craters below
    const s1LookZ = s1Z + fwdZ * 120;

    // Shot 2 end (10.8s): Pulled back smoothly behind-right to frame both astronauts & Earth
    const s2EndX = midX - fwdX * 6.5 + rightX * 0.95;
    const s2EndZ = midZ - fwdZ * 6.5 + rightZ * 0.95;
    const s2EndY = Math.max(groundHeightAt(s2EndX, s2EndZ) + 1.25, midY + 1.88);
    const s2EndLookX = midX + fwdX * 120 - rightX * 0.6;
    const s2EndLookY = s2EndY + 14.5;
    const s2EndLookZ = midZ + fwdZ * 120 - rightZ * 0.6;

    // Shot 3 end (17.8s): Gentle emotional drift tightening slightly on the pair & Earth
    const s3EndX = midX - fwdX * 5.8 - rightX * 0.35;
    const s3EndZ = midZ - fwdZ * 5.8 - rightZ * 0.35;
    const s3EndY = Math.max(groundHeightAt(s3EndX, s3EndZ) + 1.25, midY + 1.92);
    const s3EndLookX = midX + fwdX * 120;
    const s3EndLookY = s3EndY + 14.0;
    const s3EndLookZ = midZ + fwdZ * 120;

    // Gameplay handoff end (19.6s): Exact match for finishOpeningCinematic() third-person camera
    const gpYaw = earthYaw + Math.PI - 0.16;
    const gpPitch = 0.22;
    const gpDist = 8.4;
    const gpHoriz = Math.cos(gpPitch) * gpDist;
    const gpLookX = expX;
    const gpLookY = expY + 1.75;
    const gpLookZ = expZ;
    const gpCamX = gpLookX + Math.sin(gpYaw) * gpHoriz;
    const gpCamZ = gpLookZ + Math.cos(gpYaw) * gpHoriz;
    const gpCamY = Math.max(groundHeightAt(gpCamX, gpCamZ) + 1.4, gpLookY + Math.sin(gpPitch) * gpDist);

    let cx = s1X;
    let cy = s1Y;
    let cz = s1Z;
    let lx = s1LookX;
    let ly = s1LookY;
    let lz = s1LookZ;

    if (t < 3.6) {
      this.cinematicScene = 1;
      const microDrift = Math.sin(t * 0.55) * 0.04;
      cx = s1X + rightX * microDrift;
      cz = s1Z + rightZ * microDrift;
    } else if (t < 10.8) {
      this.cinematicScene = 2;
      const p = smoother((t - 3.6) / 7.2);
      // Curved lateral arc around Explorer's right shoulder so helmet/PLSS/body reveal smoothly without clipping inside helmet
      const arcPush = Math.sin(p * Math.PI) * 0.85;
      cx = THREE.MathUtils.lerp(s1X, s2EndX, p) + rightX * arcPush;
      cy = Math.max(
        groundHeightAt(cx, THREE.MathUtils.lerp(s1Z, s2EndZ, p)) + 1.15,
        THREE.MathUtils.lerp(s1Y, s2EndY, p) + Math.sin(p * Math.PI) * 0.12,
      );
      cz = THREE.MathUtils.lerp(s1Z, s2EndZ, p) + rightZ * arcPush;
      const lookDip = Math.sin(p * Math.PI) * 14.5;
      lx = THREE.MathUtils.lerp(s1LookX, s2EndLookX, p) - rightX * Math.sin(p * Math.PI) * 3.5;
      ly = THREE.MathUtils.lerp(s1LookY, s2EndLookY, p) - lookDip;
      lz = THREE.MathUtils.lerp(s1LookZ, s2EndLookZ, p) - rightZ * Math.sin(p * Math.PI) * 3.5;
    } else if (t < 17.8) {
      this.cinematicScene = 3;
      const p = smoother((t - 10.8) / 7.0);
      cx = THREE.MathUtils.lerp(s2EndX, s3EndX, p);
      cy = Math.max(groundHeightAt(cx, THREE.MathUtils.lerp(s2EndZ, s3EndZ, p)) + 1.2, THREE.MathUtils.lerp(s2EndY, s3EndY, p));
      cz = THREE.MathUtils.lerp(s2EndZ, s3EndZ, p);
      lx = THREE.MathUtils.lerp(s2EndLookX, s3EndLookX, p);
      ly = THREE.MathUtils.lerp(s2EndLookY, s3EndLookY, p);
      lz = THREE.MathUtils.lerp(s2EndLookZ, s3EndLookZ, p);
    } else {
      this.cinematicScene = 3;
      const p = smoother((t - 17.8) / 1.8);
      cx = THREE.MathUtils.lerp(s3EndX, gpCamX, p);
      cy = Math.max(groundHeightAt(cx, THREE.MathUtils.lerp(s3EndZ, gpCamZ, p)) + 1.25, THREE.MathUtils.lerp(s3EndY, gpCamY, p));
      cz = THREE.MathUtils.lerp(s3EndZ, gpCamZ, p);
      lx = THREE.MathUtils.lerp(s3EndLookX, gpLookX, p);
      ly = THREE.MathUtils.lerp(s3EndLookY, gpLookY, p);
      lz = THREE.MathUtils.lerp(s3EndLookZ, gpLookZ, p);
    }

    this.camera.position.set(cx, cy, cz);
    _camLookTarget.set(lx, ly, lz);
    this.camera.lookAt(_camLookTarget);
  }

  private updateCinematics(dt: number) {
    this.cinematicTimer += dt;
    const t = this.cinematicTimer;

    if (this.phase === 'cinematic_opening') {
      if (t >= 19.6) {
        this.finishOpeningCinematic();
        return;
      }

      this.updateOpeningShotPose(t);

      // Natural relaxed wondering animation for both astronauts
      applyAstronautAdmiringPose(this.explorerRig, t);
      const gesture =
        t > 14.0 && t < 17.8 ? Math.sin(THREE.MathUtils.clamp((t - 14.0) / 3.8, 0, 1) * Math.PI) * 0.85 : 0;
      const glance =
        t > 10.6 && t < 14.1
          ? -Math.sin(THREE.MathUtils.clamp((t - 10.6) / 3.5, 0, 1) * Math.PI) * 0.35
          : t > 14.1 && t < 17.8
          ? Math.sin(THREE.MathUtils.clamp((t - 14.1) / 3.7, 0, 1) * Math.PI) * 0.45
          : 0;
      applyAstronautSeatedOnRockPose(this.commanderRig, t, gesture, glance);

      // Subtitles only (no voice narration)
      if (t < 10.6) {
        this.setSubtitleOnce('s_none', null);
      } else if (t < 14.1) {
        this.setSubtitleOnce('s3a', {
          speaker: 'Explorer',
          text: "Look at that... that's our home.",
          accentColor: '#fbbf24',
        });
      } else if (t < 17.9) {
        this.setSubtitleOnce('s3b', {
          speaker: 'Commander Vance',
          text: "There's so much waiting for us to discover out here.",
          accentColor: '#60a5fa',
        });
      } else {
        this.setSubtitleOnce('s_end', null);
      }
      return;
    }

    if (this.phase === 'cinematic_departure') {
      const padY = groundHeightAt(-52, -2);
      if (t < 3.5) {
        this.setSubtitleOnce('dep1', {
          speaker: 'Commander Vance',
          text: 'Your first expedition was a success. But there is still so much to discover.',
          accentColor: '#60a5fa',
        });
        this.camera.position.set(-40, padY + 3.2, 5.5);
        this.camera.lookAt(-47, padY + 2.0, -2);
      } else if (t < 7.0) {
        this.setSubtitleOnce('dep2', {
          speaker: 'Commander Vance',
          text: 'I need to return to Earth for an urgent assignment.',
          accentColor: '#60a5fa',
        });
        this.camera.position.set(-41, padY + 3.0, 4.5);
        this.camera.lookAt(-48, padY + 2.2, -2);
      } else if (t < 10.5) {
        this.setSubtitleOnce('dep3', {
          speaker: 'Commander Vance',
          text: 'Until I return, this research station is in your hands.',
          accentColor: '#60a5fa',
        });
      } else if (t < 14.0) {
        this.setSubtitleOnce('dep4', {
          speaker: 'Commander Vance',
          text: "Trust each other. Work together. You've got this.",
          accentColor: '#60a5fa',
        });
        const wp = (t - 10.5) / 3.5;
        const cx = THREE.MathUtils.lerp(-45.5, -50.2, wp);
        this.commanderRig.root.position.set(cx, groundHeightAt(cx, -2), -2);
        this.commanderRig.root.rotation.y = -Math.PI / 2;
        applyAstronautLocomotion(this.commanderRig, this.commanderLoco, 2.2, false, true, 0, 0, dt, t);
      } else if (t < 16.0) {
        this.setSubtitleOnce('dep5', {
          speaker: 'Launch Control',
          text: 'Airlock sealed. Main engines igniting...',
          accentColor: '#fbbf24',
        });
        this.commanderRig.root.visible = false;
        this.departureShip.doorMesh.position.x = 1.72;
        this.camera.position.set(-38, padY + 4.5, 11);
        this.camera.lookAt(-52, padY + 4.5, -2);
      } else if (t < 22.5) {
        const lp = (t - 16.0) / 6.5;
        if (this.lastSubtitleKey !== 'dep6') {
          lunarAudio.playRocketLaunch();
        }
        this.setSubtitleOnce('dep6', {
          speaker: 'Crew',
          text: 'Safe journey, Commander! The Moon Base is in our hands now!',
          accentColor: '#34d399',
        });
        this.departureShip.thrusterGlow.visible = true;
        this.departureShip.thrusterGlow.scale.setScalar(0.9 + Math.sin(t * 35) * 0.14);
        this.departureShip.thrusterLight.intensity = 6;
        const altitude = lp * lp * 115;
        this.departureShip.group.position.y = padY + altitude;
        if (lp < 0.25) {
          this.spawnDust(-52, padY, -2, 3, 2.8);
        }
        this.camera.position.set(-36, padY + 4.5 + altitude * 0.18, 14);
        this.camera.lookAt(-52, padY + 4.5 + altitude, -2);
      } else {
        this.finishDepartureCinematic();
      }
      return;
    }

    if (this.phase === 'cinematic_ending') {
      if (t < 4.0) {
        this.setSubtitleOnce('end1', {
          speaker: 'Lunar Crew',
          text: 'We came to the Moon to explore.',
          accentColor: '#fbbf24',
        });
      } else if (t < 8.5) {
        this.setSubtitleOnce('end2', {
          speaker: 'Lunar Crew',
          text: 'We discovered new things, faced challenges and learned to work together.',
          accentColor: '#38bdf8',
        });
      } else if (t < 13.5) {
        this.setSubtitleOnce('end3', {
          speaker: 'Lunar Crew',
          text: 'And this is only the beginning.',
          accentColor: '#34d399',
        });
      } else {
        this.finishEndingCinematic();
        return;
      }

      const p = THREE.MathUtils.smoothstep(t / 13.5, 0, 1);
      this.camera.position.set(
        THREE.MathUtils.lerp(4, 34, p),
        THREE.MathUtils.lerp(2.4, 38, p),
        THREE.MathUtils.lerp(10.5, 76, p),
      );
      this.camera.lookAt(
        THREE.MathUtils.lerp(-8, -45, p),
        THREE.MathUtils.lerp(3.5, 18, p),
        THREE.MathUtils.lerp(-20, -90, p),
      );
    }
  }

  private resolveCollisions(x: number, z: number, actorRadius: number): [number, number] {
    let nx = x;
    let nz = z;

    const distFromCenter = Math.hypot(nx, nz);
    if (distFromCenter > WORLD_PLAYABLE_RADIUS) {
      const scale = WORLD_PLAYABLE_RADIUS / distFromCenter;
      nx *= scale;
      nz *= scale;
    }

    for (const c of this.colliders) {
      const dx = nx - c.x;
      const dz = nz - c.z;
      const d = Math.hypot(dx, dz);
      const minD = c.radius + actorRadius;
      if (d < minD && d > 0.001) {
        nx = c.x + (dx / d) * minD;
        nz = c.z + (dz / d) * minD;
      }
    }

    for (const rc of this.rockColliders) {
      const dx = nx - rc.x;
      const dz = nz - rc.z;
      const dSq = dx * dx + dz * dz;
      const minD = rc.radius * 0.78 + actorRadius;
      if (dSq < minD * minD && dSq > 0.0001) {
        const d = Math.sqrt(dSq);
        nx = rc.x + (dx / d) * minD;
        nz = rc.z + (dz / d) * minD;
      }
    }

    const rdx = nx - 55;
    const rdz = nz - 195;
    const rd = Math.hypot(rdx, rdz);
    if (rd < 6.2 + actorRadius && rd > 0.001) {
      nx = 55 + (rdx / rd) * (6.2 + actorRadius);
      nz = 195 + (rdz / rd) * (6.2 + actorRadius);
    }

    return [nx, nz];
  }

  private updatePlayerAndVehicle(dt: number) {
    const forwardIn =
      (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp') ? 1 : 0) -
      (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown') ? 1 : 0) +
      this.virtualInput.forward;
    const turnIn =
      (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft') ? 1 : 0) -
      (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight') ? 1 : 0) +
      this.virtualInput.turn;
    const spaceBrake = this.heldKeys.has('Space');
    const isBounding = this.heldKeys.has('ShiftLeft') || this.heldKeys.has('ShiftRight');

    // Rover Charging Station & Emergency Solar Boost updates
    const activeChargingStation = this.getRoverChargingStation();
    if (this.roverCharging) {
      if (!activeChargingStation || Math.abs(this.evSpeed) > 0.65 || this.roverBattery >= 100) {
        this.roverCharging = false;
      } else {
        this.roverBattery = Math.min(100, this.roverBattery + dt * 28);
        if (this.roverBattery > 20) this.lowBatteryWarned = false;
        if (this.roverBattery >= 100) {
          this.roverCharging = false;
          lunarAudio.playSuccessFanfare();
          this.callbacks.onBatteryPersist(100);
        }
      }
    }

    if (this.emergencyBoostActive) {
      if (this.roverBattery > 0.5 || Math.abs(this.evSpeed) > 0.65) {
        this.emergencyBoostActive = false;
        this.emergencyBoostProgress = 0;
      } else {
        this.emergencyBoostProgress += dt / 2.5;
        if (this.emergencyBoostProgress >= 1) {
          this.emergencyBoostProgress = 0;
          this.emergencyBoostActive = false;
          this.roverBattery = 30;
          this.lowBatteryWarned = false;
          lunarAudio.playSuccessFanfare();
          this.callbacks.onBatteryPersist(30);
        }
      }
    }

    let playerHorizSpeed = 0;

    if (this.vehicleState === 'PLAYER_ENTERING') {
      // Rover remains strictly stationary while astronaut boards seat
      this.evSpeed = 0;
      this.evThrottle = 0;
      this.evBrake = 0;
      this.evSteer = 0;
      lunarAudio.updateRoverHum(false, 0);

      this.vehicleAnimTimer += dt / 0.62;
      const u = THREE.MathUtils.clamp(this.vehicleAnimTimer, 0, 1);
      const s = THREE.MathUtils.smoothstep(u, 0, 1);
      const arcY = Math.sin(s * Math.PI) * 0.72;

      this.playerX = THREE.MathUtils.lerp(this.vehicleAnimStartPos.x, this.vehicleAnimEndPos.x, s);
      this.playerZ = THREE.MathUtils.lerp(this.vehicleAnimStartPos.z, this.vehicleAnimEndPos.z, s);
      this.playerY = THREE.MathUtils.lerp(this.vehicleAnimStartPos.y, this.vehicleAnimEndPos.y, s) + arcY;

      let hDiff = this.vehicleAnimEndHeading - this.vehicleAnimStartHeading;
      while (hDiff > Math.PI) hDiff -= Math.PI * 2;
      while (hDiff < -Math.PI) hDiff += Math.PI * 2;
      this.playerHeading = this.vehicleAnimStartHeading + hDiff * s;

      this.explorerRig.root.position.set(this.playerX, this.playerY, this.playerZ);
      this.explorerRig.root.rotation.set(0, this.playerHeading, 0);
      applyAstronautBoardingPose(this.explorerRig, s);

      if (u >= 1) {
        this.completeEnterVehicle();
      }
    } else if (this.vehicleState === 'PLAYER_EXITING') {
      // Rover remains strictly stationary while astronaut exits seat
      this.evSpeed = 0;
      this.evThrottle = 0;
      this.evBrake = 0;
      this.evSteer = 0;
      lunarAudio.updateRoverHum(false, 0);

      this.vehicleAnimTimer += dt / 0.56;
      const u = THREE.MathUtils.clamp(this.vehicleAnimTimer, 0, 1);
      const s = THREE.MathUtils.smoothstep(u, 0, 1);
      const arcY = Math.sin(s * Math.PI) * 0.65;

      this.playerX = THREE.MathUtils.lerp(this.vehicleAnimStartPos.x, this.vehicleAnimEndPos.x, s);
      this.playerZ = THREE.MathUtils.lerp(this.vehicleAnimStartPos.z, this.vehicleAnimEndPos.z, s);
      this.playerY = THREE.MathUtils.lerp(this.vehicleAnimStartPos.y, this.vehicleAnimEndPos.y, s) + arcY;

      let hDiff = this.vehicleAnimEndHeading - this.vehicleAnimStartHeading;
      while (hDiff > Math.PI) hDiff -= Math.PI * 2;
      while (hDiff < -Math.PI) hDiff += Math.PI * 2;
      this.playerHeading = this.vehicleAnimStartHeading + hDiff * s;

      this.explorerRig.root.position.set(this.playerX, this.playerY, this.playerZ);
      this.explorerRig.root.rotation.set(0, this.playerHeading, 0);
      applyAstronautBoardingPose(this.explorerRig, 1 - s);

      if (u >= 1) {
        this.completeExitVehicle();
      }
    } else if (this.vehicleState === 'PLAYER_DRIVING') {
      const maxSpeed = 19.5;
      const accel = 17.5;
      const reverseAccel = 12.0;
      const drag = 3.2;
      const brakeForce = 30.0;
      const hasBattery = this.roverBattery > 0.01 && !this.roverCharging && !this.emergencyBoostActive;

      if (this.pendingExitAfterStop) {
        this.evThrottle = 0;
        this.evBrake = 1;
        const drop = 36.0 * dt;
        if (Math.abs(this.evSpeed) <= drop || Math.abs(this.evSpeed) <= 0.18) {
          this.beginExitVehicleAnimation();
        } else {
          this.evSpeed -= Math.sign(this.evSpeed) * drop;
        }
      } else if (!hasBattery) {
        // Out of battery or charging: cannot drive, coast cleanly to a stop
        this.evThrottle = 0;
        this.evBrake = Math.abs(this.evSpeed) > 0.1 ? 0.8 : 0;
        const drop = 16.0 * dt;
        if (Math.abs(this.evSpeed) <= drop) {
          this.evSpeed = 0;
        } else {
          this.evSpeed -= Math.sign(this.evSpeed) * drop;
        }
      } else if (spaceBrake) {
        this.evThrottle = 0;
        this.evBrake = 1;
        const drop = brakeForce * dt;
        if (Math.abs(this.evSpeed) <= drop) {
          this.evSpeed = 0;
        } else {
          this.evSpeed -= Math.sign(this.evSpeed) * drop;
        }
      } else if (Math.abs(forwardIn) > 0.05) {
        const clampedForward = THREE.MathUtils.clamp(forwardIn, -1, 1);
        const opposing = clampedForward * this.evSpeed < -0.25;
        if (opposing) {
          this.evThrottle = 0;
          this.evBrake = 1;
          const drop = brakeForce * dt;
          if (Math.abs(this.evSpeed) <= drop) {
            this.evSpeed = 0;
          } else {
            this.evSpeed -= Math.sign(this.evSpeed) * drop;
          }
        } else {
          this.evThrottle = clampedForward;
          this.evBrake = 0;
          const rate = clampedForward > 0 ? accel : reverseAccel;
          this.evSpeed += clampedForward * rate * dt;
        }
      } else {
        this.evThrottle = 0;
        this.evBrake = 0;
        this.evSpeed -= this.evSpeed * Math.min(1, drag * dt);
        if (Math.abs(this.evSpeed) < 0.08) {
          this.evSpeed = 0;
        }
      }
      this.evSpeed = THREE.MathUtils.clamp(this.evSpeed, -8.5, maxSpeed);

      this.evSteer = THREE.MathUtils.lerp(this.evSteer, THREE.MathUtils.clamp(turnIn, -1, 1), Math.min(1, dt * 8));
      // Only turn chassis heading when rover actually has translational speed
      const moveTurnFactor = Math.min(1, Math.abs(this.evSpeed) / 1.4);
      const turnRate = 1.65 * moveTurnFactor;
      const dirSign = this.evSpeed >= -0.05 ? 1 : -1;
      if (moveTurnFactor > 0.01) {
        this.evHeading += this.evSteer * turnRate * dirSign * dt;
      }

      if (Math.abs(this.evSpeed) > 0.0001) {
        const vx = Math.sin(this.evHeading) * this.evSpeed;
        const vz = Math.cos(this.evHeading) * this.evSpeed;
        const [rx, rz] = this.resolveCollisions(this.evX + vx * dt, this.evZ + vz * dt, 1.8);
        this.evX = rx;
        this.evZ = rz;

        if (Math.hypot(this.evX - this.lastTrackX, this.evZ - this.lastTrackZ) >= 1.15) {
          this.stampRoverTracks(this.evX, this.evZ, this.evHeading);
          this.lastTrackX = this.evX;
          this.lastTrackZ = this.evZ;
        }

        if (Math.abs(this.evSpeed) > 3.5 && Math.random() < dt * 14) {
          const rearX = this.evX - Math.sin(this.evHeading) * 1.5;
          const rearZ = this.evZ - Math.cos(this.evHeading) * 1.5;
          this.spawnDust(rearX, groundHeightAt(rearX, rearZ), rearZ, 2, 0.9);
        }
      }

      // Rover Battery Drain: drains ONLY while driving & moving/throttling (0% when stationary/parked!)
      const roverMoving = Math.abs(this.evSpeed) > 0.15 || Math.abs(this.evThrottle) > 0.05;
      if (!this.roverCharging && !this.emergencyBoostActive && roverMoving && this.roverBattery > 0) {
        const aheadX = this.evX + Math.sin(this.evHeading) * 1.6;
        const aheadZ = this.evZ + Math.cos(this.evHeading) * 1.6;
        const slopeDelta = groundHeightAt(aheadX, aheadZ) - groundHeightAt(this.evX, this.evZ);
        const drainRate = (0.36 + Math.abs(this.evSpeed) * 0.042 + Math.max(0, slopeDelta) * 0.32) * dt;
        const prevBat = this.roverBattery;
        this.roverBattery = Math.max(0, this.roverBattery - drainRate);

        if (this.roverBattery <= 20 && !this.lowBatteryWarned) {
          this.lowBatteryWarned = true;
          lunarAudio.playRadioBeep();
          this.callbacks.onTransmission({
            sender: 'Rover Power Monitor',
            text: 'Rover battery is getting low! Drive back to a glowing blue Charging Pad at Base when you can.',
          });
        }
        if (prevBat > 0 && this.roverBattery <= 0) {
          this.roverBattery = 0;
          this.evThrottle = 0;
          lunarAudio.playTone(220, 0.25, 'sine', 0.1);
          this.callbacks.onBatteryPersist(0);
          this.callbacks.onTransmission({
            sender: 'Rover Power Monitor',
            text: 'Battery empty! Press B (or tap Solar Boost) to recharge 30% backup power, or hop out with E.',
          });
        }
      }

      applyAstronautSeatedPose(this.explorerRig, this.evSteer, this.elapsed);

      this.playerX = this.evX;
      this.playerZ = this.evZ;
      this.playerY = groundHeightAt(this.evX, this.evZ);
      this.playerHeading = this.evHeading;
      lunarAudio.updateRoverHum(Math.abs(this.evSpeed) > 0.1, this.evSpeed);
    } else {
      // vehicleState === 'PARKED': Rover is strictly stationary! Zero velocity, throttle, steer, zero battery drain.
      this.evSpeed = 0;
      this.evThrottle = 0;
      this.evBrake = 0;
      this.evAirY = 0;
      this.evVelY = 0;
      this.pendingExitAfterStop = false;
      this.evSteer = THREE.MathUtils.lerp(this.evSteer, 0, Math.min(1, dt * 10));
      lunarAudio.updateRoverHum(false, 0);

      // Camera-relative target velocity with smooth lunar inertia acceleration/deceleration
      let dirX = 0;
      let dirZ = 0;
      if (Math.abs(forwardIn) > 0.05 || Math.abs(turnIn) > 0.05) {
        const fwdX = -Math.sin(this.camYaw);
        const fwdZ = -Math.cos(this.camYaw);
        const rightX = Math.cos(this.camYaw);
        const rightZ = -Math.sin(this.camYaw);
        dirX = fwdX * forwardIn - rightX * turnIn;
        dirZ = fwdZ * forwardIn - rightZ * turnIn;
        const len = Math.hypot(dirX, dirZ);
        if (len > 0.01) {
          dirX /= len;
          dirZ /= len;
        }
      }

      const maxWalkSpeed = (isBounding ? 10.6 : 6.4) * (this.playerGrounded ? 1.0 : 0.88);
      const targetVX = dirX * maxWalkSpeed;
      const targetVZ = dirZ * maxWalkSpeed;
      const accelRate = Math.hypot(dirX, dirZ) > 0.1 ? 14 : 9; // Smooth lunar start/stop inertia
      const blend = 1 - Math.exp(-accelRate * dt);
      this.playerVX = THREE.MathUtils.lerp(this.playerVX, targetVX, blend);
      this.playerVZ = THREE.MathUtils.lerp(this.playerVZ, targetVZ, blend);

      const [rx, rz] = this.resolveCollisions(this.playerX + this.playerVX * dt, this.playerZ + this.playerVZ * dt, 0.55);
      this.playerX = rx;
      this.playerZ = rz;

      const horizSpeed = Math.hypot(this.playerVX, this.playerVZ);
      playerHorizSpeed = horizSpeed;
      let headingDiff = 0;
      if (horizSpeed > 0.35) {
        const targetHeading = Math.atan2(this.playerVX, this.playerVZ);
        headingDiff = targetHeading - this.playerHeading;
        while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
        while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;
        this.playerHeading += headingDiff * Math.min(1, dt * 10);
      }

      // Authentic 1.62 m/s² lunar gravity jump, falling & landing recovery
      const groundY = groundHeightAt(this.playerX, this.playerZ);
      if (!this.playerGrounded || this.playerY > groundY + 0.05) {
        this.playerVelY -= LUNAR_GRAVITY * dt;
        this.playerY += this.playerVelY * dt;
        if (this.playerY <= groundY) {
          this.playerY = groundY;
          if (!this.playerGrounded && this.playerVelY < -0.9) {
            this.explorerLoco.landRecovery = 1.0;
            this.landCameraDip = Math.min(0.45, Math.abs(this.playerVelY) * 0.11);
            this.spawnDust(this.playerX, groundY, this.playerZ, 8, 1.15);
            this.stampFootprint(this.playerX, this.playerZ, this.playerHeading);
            lunarAudio.playLand();
          }
          this.playerVelY = 0;
          this.playerGrounded = true;
        }
      } else {
        this.playerY = groundY;
      }

      const stepped = applyAstronautLocomotion(
        this.explorerRig,
        this.explorerLoco,
        horizSpeed,
        isBounding,
        this.playerGrounded,
        this.playerVelY,
        headingDiff,
        dt,
        this.elapsed,
      );

      if (stepped) {
        this.stampFootprint(this.playerX, this.playerZ, this.playerHeading);
        this.spawnDust(this.playerX, this.playerY, this.playerZ, 2, 0.55);
      }

      // Handheld Scanner Animation Overlay
      if (this.scannerAnimTimer > 0) {
        this.scannerAnimTimer = Math.max(0, this.scannerAnimTimer - dt);
        this.explorerRig.rightShoulder.rotation.x = -1.15;
        this.explorerRig.rightElbow.rotation.x = -0.35;
        this.explorerRig.scannerBeam.visible = true;
      } else {
        this.explorerRig.scannerBeam.visible = false;
      }

      this.explorerRig.root.position.set(this.playerX, this.playerY, this.playerZ);
      this.explorerRig.root.rotation.y = this.playerHeading;
    }

    // Periodically persist rover battery progress cleanly
    this.batterySyncAccum += dt;
    if (this.batterySyncAccum >= 3.5) {
      this.batterySyncAccum = 0;
      const roundedBat = Math.round(this.roverBattery);
      if (Math.abs(roundedBat - (this.progress.roverBattery ?? 100)) >= 2) {
        this.callbacks.onBatteryPersist(roundedBat);
      }
    }

    const activeRoverSpeed = this.vehicleState === 'PLAYER_DRIVING' ? this.evSpeed : 0;
    const activeRoverSteer = this.vehicleState === 'PLAYER_DRIVING' ? this.evSteer : 0;
    updateRoverSuspensionAndTransform(
      this.roverRig,
      this.evX,
      this.evZ,
      this.evHeading,
      activeRoverSpeed,
      activeRoverSteer,
      this.evAirY,
      dt,
      this.evBrake > 0.5,
    );
    updateRoverBatteryVisuals(
      this.roverRig,
      this.roverBattery,
      this.roverCharging || this.emergencyBoostActive,
    );

    // =========================================================================
    // DYNAMIC THIRD-PERSON CAMERA (walk / run / jump / land / turn / interact / drive + collision handling)
    // =========================================================================
    this.camManualCooldown = Math.max(0, this.camManualCooldown - dt);
    this.landCameraDip = THREE.MathUtils.damp(this.landCameraDip, 0, 7.5, dt);

    const isVehicleCam = this.vehicleState === 'PLAYER_DRIVING' || this.vehicleState === 'PLAYER_ENTERING';
    const isInteractingCam = this.scannerAnimTimer > 0 || this.roverCharging || this.emergencyBoostActive;

    if (isInteractingCam) {
      this.activeCameraMode = 'interact';
    } else if (isVehicleCam) {
      this.activeCameraMode = 'drive';
    } else if (!this.playerGrounded) {
      this.activeCameraMode = 'jump';
    } else if (isBounding && playerHorizSpeed > 1.2) {
      this.activeCameraMode = 'run';
    } else {
      this.activeCameraMode = 'walk';
    }

    // Ghost of Tsushima–style smooth behind-character camera follow (never spins on A/D or flips on S)
    if (!this.pointerDown && this.camManualCooldown <= 0) {
      if (isVehicleCam && Math.abs(this.evSpeed) > 0.65) {
        const steerAnticipation = this.evSpeed >= 0 ? this.evSteer * 0.14 : 0;
        const desiredCamYaw = this.evHeading + Math.PI + (this.evSpeed < 0 ? Math.PI : 0) + steerAnticipation;
        let diff = desiredCamYaw - this.camYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.camYaw += diff * (1 - Math.exp(-2.85 * dt));
      } else if (!isVehicleCam && forwardIn > 0.1 && playerHorizSpeed > 0.9) {
        const desiredCamYaw = this.playerHeading + Math.PI;
        let diff = desiredCamYaw - this.camYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        // Gently settle behind astronaut during forward/diagonal motion without snapping or spinning
        this.camYaw += diff * (1 - Math.exp(-1.55 * dt));
      }
    }

    // Adapt target camera distance, pitch, look height, and FOV seamlessly per state
    let targetDist = this.camDist;
    let targetPitch = this.camPitch;
    let targetLookH = 1.75;
    let targetFov = 54;

    if (this.activeCameraMode === 'interact') {
      targetDist = Math.min(this.camDist, isVehicleCam ? 7.6 : 5.4);
      targetPitch = Math.max(0.18, Math.min(this.camPitch, 0.28));
      targetLookH = isVehicleCam ? 1.85 : 1.55;
      targetFov = 50;
    } else if (this.activeCameraMode === 'drive') {
      const speedFrac = Math.min(1, Math.abs(this.evSpeed) / 19.5);
      const aheadY = groundHeightAt(
        this.evX + Math.sin(this.evHeading) * 4.5,
        this.evZ + Math.cos(this.evHeading) * 4.5,
      );
      const slopeBias = THREE.MathUtils.clamp((aheadY - this.playerY) * 0.04, -0.06, 0.08);
      targetDist = Math.max(this.camDist, 10.6) + speedFrac * 2.4;
      targetPitch = THREE.MathUtils.clamp(this.camPitch + 0.04 - slopeBias, 0.14, 0.95);
      targetLookH = 2.05;
      targetFov = 55 + speedFrac * 6.5;
    } else if (this.activeCameraMode === 'jump') {
      targetDist = this.camDist + 1.3;
      targetPitch = Math.max(0.16, this.camPitch - 0.03);
      targetLookH = 1.65;
      targetFov = 56;
    } else if (this.activeCameraMode === 'run') {
      const speedFrac = THREE.MathUtils.clamp(playerHorizSpeed / 10.6, 0, 1);
      targetDist = this.camDist + 1.45 * speedFrac;
      targetPitch = Math.max(0.15, this.camPitch - 0.02);
      targetLookH = 1.72;
      targetFov = 54 + speedFrac * 4.5;
    }

    const camBlend = 1 - Math.exp(-6.5 * dt);
    this.dynamicCamDist = THREE.MathUtils.lerp(this.dynamicCamDist, targetDist, camBlend);
    this.dynamicCamPitch = THREE.MathUtils.lerp(this.dynamicCamPitch, targetPitch, camBlend);
    this.dynamicLookHeight = THREE.MathUtils.lerp(this.dynamicLookHeight, targetLookH, camBlend);
    this.dynamicCamFov = THREE.MathUtils.lerp(this.dynamicCamFov, targetFov, camBlend);
    if (Math.abs(this.camera.fov - this.dynamicCamFov) > 0.08) {
      this.camera.fov = this.dynamicCamFov;
      this.camera.updateProjectionMatrix();
    }

    const subtleSpeedBob =
      this.activeCameraMode === 'run'
        ? Math.sin(this.elapsed * 9.5) * 0.045
        : this.activeCameraMode === 'drive' && Math.abs(this.evSpeed) > 3
        ? Math.sin(this.elapsed * 14) * 0.02 * Math.min(1, Math.abs(this.evSpeed) / 16)
        : 0;

    _v1.set(
      this.playerX,
      this.playerY + this.dynamicLookHeight - this.landCameraDip * 0.55 + subtleSpeedBob * 0.4,
      this.playerZ,
    );
    const lookFollowRate = this.activeCameraMode === 'jump' ? 8.0 : 10.5;
    this.currentLookAt.lerp(_v1, 1 - Math.exp(-lookFollowRate * dt));

    const horizDist = Math.cos(this.dynamicCamPitch) * this.dynamicCamDist;
    const rawCamX = this.currentLookAt.x + Math.sin(this.camYaw) * horizDist;
    const rawCamZ = this.currentLookAt.z + Math.cos(this.camYaw) * horizDist;
    const rawCamY = this.currentLookAt.y + Math.sin(this.dynamicCamPitch) * this.dynamicCamDist - this.landCameraDip;

    // Camera collision handling: pull inward along sightline if obstructed by buildings or terrain
    let safeT = 1.0;
    const steps = 6;
    for (let s = 1; s <= steps; s++) {
      const tFrac = s / steps;
      _camRayStep.set(
        THREE.MathUtils.lerp(this.currentLookAt.x, rawCamX, tFrac),
        THREE.MathUtils.lerp(this.currentLookAt.y, rawCamY, tFrac),
        THREE.MathUtils.lerp(this.currentLookAt.z, rawCamZ, tFrac),
      );
      let blocked = false;
      for (const c of this.colliders) {
        const dCol = Math.hypot(_camRayStep.x - c.x, _camRayStep.z - c.z);
        const colTop = groundHeightAt(c.x, c.z) + 6.4;
        if (dCol < c.radius + 0.65 && _camRayStep.y < colTop) {
          blocked = true;
          break;
        }
      }
      if (blocked) {
        safeT = Math.max(0.32, (s - 1) / steps);
        break;
      }
    }

    // Apollo 11 close-up framing: boot footprint crisp in foreground + American flag standing right beside it
    if (this.apolloInspectTimer > 0) {
      const fx = this.apolloFootprintWorldX;
      const fz = this.apolloFootprintWorldZ;
      const fy = groundHeightAt(fx, fz);
      const drift = Math.sin(this.apolloInspectTimer * 0.42) * 0.14;

      const camCloseBlend = 1 - Math.exp(-5.0 * dt);
      this.dynamicCamFov = THREE.MathUtils.lerp(this.dynamicCamFov, 42, camCloseBlend);
      if (Math.abs(this.camera.fov - this.dynamicCamFov) > 0.08) {
        this.camera.fov = this.dynamicCamFov;
        this.camera.updateProjectionMatrix();
      }

      // Low intimate angle behind/left of footprint aiming past it toward the flag beside it
      _v1.set(fx + 0.58, fy + 0.42, fz - 0.34);
      this.currentLookAt.lerp(_v1, camCloseBlend);
      _camDesiredPos.set(fx - 1.52 + drift, Math.max(fy + 0.98, groundHeightAt(fx - 1.52, fz + 0.86) + 0.92), fz + 0.86 - drift * 0.5);
      this.camera.position.lerp(_camDesiredPos, camCloseBlend);
      this.camera.lookAt(this.currentLookAt);
      return;
    }

    const safeX = THREE.MathUtils.lerp(this.currentLookAt.x, rawCamX, safeT);
    const safeZ = THREE.MathUtils.lerp(this.currentLookAt.z, rawCamZ, safeT);
    const minGroundCamY = groundHeightAt(safeX, safeZ) + 1.25;
    const safeY = Math.max(minGroundCamY, THREE.MathUtils.lerp(this.currentLookAt.y, rawCamY, safeT));

    _camDesiredPos.set(safeX, safeY, safeZ);
    this.camera.position.lerp(_camDesiredPos, 1 - Math.exp(-9.5 * dt));
    this.camera.lookAt(this.currentLookAt);
  }

  private updateAnimatedAirlocksAndWorldProps(dt: number) {
    // Animate colony airlock doors sliding smoothly open when explorer or crew approach
    for (const door of this.airlockDoors) {
      const distPlayer = Math.hypot(this.playerX - door.worldX, this.playerZ - door.worldZ);
      const shouldOpen = distPlayer < 6.2;
      const target = shouldOpen ? 1 : 0;
      door.openProgress = THREE.MathUtils.lerp(door.openProgress, target, Math.min(1, dt * 6));
      door.doorGroup.position.x = door.baseLocalX + door.openProgress * 1.25;
    }

    // World reactions to completed missions
    if (this.progress.completedMissions.includes(10)) {
      // Solar panels gently track sun elevation
      const tilt = 0.25 + Math.sin(this.elapsed * 0.2) * 0.12;
      for (const p of this.solarPanels) p.rotation.x = tilt;
    }
    if (this.progress.completedMissions.includes(11)) {
      for (const gl of this.greenhouseGrowLights) gl.intensity = 1.9;
    }
    if (this.progress.completedMissions.includes(16)) {
      // Forgotten rover reactivated!
      const bMat = this.worldProps.forgottenRoverBeacon.material as THREE.MeshStandardMaterial;
      bMat.color.setHex(0x34d399);
      bMat.emissive.setHex(0x10b981);
      bMat.emissiveIntensity = 0.8 + 0.4 * Math.sin(this.elapsed * 4);
    }
    if (this.progress.completedMissions.includes(18)) {
      // Relay dish aimed steadily toward Earth
      this.worldProps.relayDishPivot.rotation.y = Math.atan2(-340, -620);
    }
    if (this.progress.completedMissions.includes(19)) {
      this.outpostBeaconMat.color.setHex(0x38bdf8);
      this.outpostBeaconMat.emissive.setHex(0x0ea5e9);
      this.outpostBeaconMat.emissiveIntensity = 1.1;
    }

    // Gentle Observatory dome tracking sweep toward Earth
    if (this.observatoryDomePivot) {
      this.observatoryDomePivot.rotation.y = -0.55 + Math.sin(this.elapsed * 0.14) * 0.28;
    }

    // Charging station pad feedback glow
    for (const st of this.chargingStations) {
      const roverOnPad = Math.hypot(this.evX - st.x, this.evZ - st.z) <= st.radius + 1.0;
      const isActiveCharge = roverOnPad && this.roverCharging;
      st.padRingMat.opacity = isActiveCharge ? 0.65 + Math.sin(this.elapsed * 7) * 0.25 : roverOnPad ? 0.7 : 0.42;
      st.padRingMat.color.setHex(isActiveCharge ? 0x34d399 : 0x22d3ee);
      st.beaconMat.emissiveIntensity = isActiveCharge ? 1.4 : 0.8;
    }

    // Subtle highlight ring around historic Apollo 11 footprint when entering discovery area or after discovery
    if (this.worldProps.apolloDiscoveryRing) {
      const rMat = this.worldProps.apolloDiscoveryRing.material as THREE.MeshBasicMaterial;
      const dArea = Math.hypot(this.playerX - APOLLO_SITE_X, this.playerZ - APOLLO_SITE_Z);
      if (this.progress.apolloDiscovered) {
        rMat.opacity = dArea < 30 ? 0.34 + Math.sin(this.elapsed * 2) * 0.1 : 0.24;
      } else if (dArea < 22) {
        rMat.opacity = 0.44 + Math.sin(this.elapsed * 3.2) * 0.16;
      } else {
        rMat.opacity = 0.0;
      }
    }
  }

  private updateDayNightAndAtmosphere(dt: number) {
    if (this.phase === 'playing' && !this.paused) {
      this.progress.lunarTime = (this.progress.lunarTime + dt * 0.002) % 1;
    }
    const sunAngle = this.progress.lunarTime * Math.PI * 2;
    const sunElev = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle) * 190;
    const sunY = sunElev * 165;
    const sunZ = 75;

    this.sunLight.position.set(this.playerX + sunX, Math.max(-25, sunY), this.playerZ + sunZ);
    this.sunLight.target.position.set(this.playerX, 0, this.playerZ);
    this.sunLight.target.updateMatrixWorld();

    const dayFactor = THREE.MathUtils.clamp(sunElev * 2.2 + 0.35, 0, 1);
    this.sunLight.intensity = 0.08 + dayFactor * 2.4;
    this.hemiLight.intensity = 0.14 + dayFactor * 0.32;
    this.earthBounceLight.intensity = 0.48 - dayFactor * 0.15;

    const inIceCrater = Math.hypot(this.playerX - -170, this.playerZ - 145) < 40;
    const isDark = dayFactor < 0.35 || inIceCrater;

    const headIntensity = isDark ? 4.8 : 0;
    for (const hl of this.roverRig.headLights) {
      hl.intensity = THREE.MathUtils.lerp(hl.intensity, headIntensity, dt * 5);
    }
    if (this.explorerRig.helmetLight) {
      this.explorerRig.helmetLight.intensity = THREE.MathUtils.lerp(
        this.explorerRig.helmetLight.intensity,
        isDark && !this.inVehicle ? 3.6 : 0,
        dt * 5,
      );
    }
    for (const bl of this.exteriorLights) {
      bl.intensity = isDark ? 1.9 : 0.9;
    }

    // Approved Earth rotation (UNCHANGED!)
    this.skyEarth.surfaceMesh.rotation.y += dt * 0.02;
    this.skyEarth.cloudMesh.rotation.y += dt * 0.028;
    for (const b of this.colonyBuildings) {
      if (b.rotatingDish) {
        b.rotatingDish.rotation.y = Math.sin(this.elapsed * 0.3) * 0.4 - 0.6;
      }
    }
  }

  private getNavigationGoal(): {
    x: number;
    z: number;
    label: string;
    key: string;
    guidanceMode: LiveHudSnapshot['guidanceMode'];
  } | null {
    const mission = CAMPAIGN_MISSIONS[this.progress.currentMissionIndex];
    if (!mission) return null;
    const obj = mission.objectives[this.progress.currentObjectiveIndex];
    if (!obj) return null;

    if (obj.type === 'enter_ev') {
      return {
        x: this.evX,
        z: this.evZ,
        label: 'Board Lunar EV',
        key: `${obj.id}:ev_board`,
        guidanceMode: 'board_rover',
      };
    }

    if (obj.type === 'drive_to') {
      if (!this.inVehicle) {
        return {
          x: this.evX,
          z: this.evZ,
          label: 'Board Lunar EV',
          key: `${obj.id}:ev_board`,
          guidanceMode: 'board_rover',
        };
      }
      if (obj.targetPosition) {
        return {
          x: obj.targetPosition[0],
          z: obj.targetPosition[1],
          label: obj.label,
          key: obj.id,
          guidanceMode: 'drive_rover',
        };
      }
    }

    if (obj.type === 'exit_ev') {
      return {
        x: this.evX,
        z: this.evZ,
        label: 'Park & Exit EV (E)',
        key: `${obj.id}:ev_exit`,
        guidanceMode: 'exit_rover',
      };
    }

    if (obj.requiresExitVehicle && this.inVehicle) {
      if (obj.targetPosition) {
        const dist = Math.hypot(this.playerX - obj.targetPosition[0], this.playerZ - obj.targetPosition[1]);
        if (dist > (obj.radius ?? 12) + 4) {
          return {
            x: obj.targetPosition[0],
            z: obj.targetPosition[1],
            label: obj.label,
            key: `${obj.id}:drive`,
            guidanceMode: 'drive_rover',
          };
        }
      }
      return {
        x: obj.targetPosition ? obj.targetPosition[0] : this.evX,
        z: obj.targetPosition ? obj.targetPosition[1] : this.evZ,
        label: 'Park & Exit EV (E)',
        key: `${obj.id}:exit`,
        guidanceMode: 'exit_rover',
      };
    }

    if (obj.type === 'collect') {
      let bestIdx = -1;
      let bestDist = Infinity;
      for (let i = 0; i < this.worldProps.meteoriteFragments.length; i++) {
        if (this.collectedFragIndices.has(i)) continue;
        const fg = this.worldProps.meteoriteFragments[i];
        const d = Math.hypot(this.playerX - fg.position.x, this.playerZ - fg.position.z);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      if (bestIdx !== -1) {
        const fg = this.worldProps.meteoriteFragments[bestIdx];
        return {
          x: fg.position.x,
          z: fg.position.z,
          label: `Meteorite Fragment (${this.collectCount + 1}/${obj.requiredCount ?? 3})`,
          key: `${obj.id}:frag_${bestIdx}`,
          guidanceMode: 'walk',
        };
      }
    }

    if (obj.targetPosition) {
      return {
        x: obj.targetPosition[0],
        z: obj.targetPosition[1],
        label: obj.label,
        key: obj.id,
        guidanceMode: 'walk',
      };
    }
    return null;
  }

  private updateNavigationAndObjectives(dt: number) {
    const mission = CAMPAIGN_MISSIONS[this.progress.currentMissionIndex];
    const obj = mission?.objectives[this.progress.currentObjectiveIndex];

    // Keep Commander seated at Earthrise Overlook until player leaves the ridge or moves past Mission 1
    if (this.commanderAtOverlook) {
      const distFromOverlook = Math.hypot(this.playerX - -73.8, this.playerZ - -47.5);
      if (distFromOverlook > 38 || this.progress.currentMissionIndex > 0) {
        this.commanderAtOverlook = false;
        this.commanderRig.root.position.set(-4, groundHeightAt(-4, -10), -10);
        this.commanderRig.root.rotation.set(0, 0.4, 0);
        applyAstronautLocomotion(this.commanderRig, this.commanderLoco, 0, false, true, 0, 0, 0.016, this.elapsed);
      } else {
        applyAstronautSeatedOnRockPose(this.commanderRig, this.elapsed, 0, 0);
      }
    }

    this.roverRig.tutorialHighlight.visible = Boolean(mission && mission.id === 2 && !this.inVehicle);
    if (this.roverRig.tutorialHighlight.visible) {
      const s = 1 + Math.sin(this.elapsed * 4) * 0.08;
      this.roverRig.tutorialHighlight.scale.set(s, s, 1);
    }

    this.worldProps.optionalMarkers.forEach((og, id) => {
      const done = this.progress.completedOptionals.includes(id);
      og.visible = !done;
    });

    const target = this.getNavigationGoal();
    if (!target || this.phase !== 'playing') {
      this.goldenTrail.mesh.visible = false;
      this.destRingGroup.visible = false;
      this.currentRoute = [];
      this.destMarkerInitialized = false;
      return;
    }

    // Smooth destination marker glide when target changes
    if (!this.destMarkerInitialized) {
      this.destMarkerX = target.x;
      this.destMarkerZ = target.z;
      this.destMarkerInitialized = true;
    } else {
      this.destMarkerX = THREE.MathUtils.damp(this.destMarkerX, target.x, 7.5, dt);
      this.destMarkerZ = THREE.MathUtils.damp(this.destMarkerZ, target.z, 7.5, dt);
    }

    const totalDist = Math.hypot(target.x - this.playerX, target.z - this.playerZ);
    const trailEnabled = this.progress.showGoldenTrail !== false;
    this.destRingGroup.visible = trailEnabled && target.guidanceMode !== 'exit_rover';
    this.destRingGroup.position.set(this.destMarkerX, groundHeightAt(this.destMarkerX, this.destMarkerZ), this.destMarkerZ);
    this.destRingGroup.rotation.y += dt * 0.65;

    this.routeRecalcCooldown = Math.max(0, this.routeRecalcCooldown - dt);

    const showTrail = trailEnabled && target.guidanceMode !== 'exit_rover' && totalDist > 3.0;
    if (!showTrail) {
      this.goldenTrail.mesh.visible = false;
      this.currentRoute = [];
    } else {
      this.goldenTrail.mesh.visible = true;
      let needsRecalc = target.key !== this.routeTargetKey || this.currentRoute.length < 2;

      if (!needsRecalc && this.routeRecalcCooldown <= 0) {
        const { lateralDist } = distanceToRouteXZ(this.playerX, this.playerZ, this.currentRoute);
        const movedFromCalc = Math.hypot(this.playerX - this.routeCalcX, this.playerZ - this.routeCalcZ);
        if (lateralDist > 3.5 || movedFromCalc > 7.5) {
          needsRecalc = true;
        }
      }

      let rebuildMesh = needsRecalc;
      if (needsRecalc) {
        this.currentRoute = this.navGrid.findPath(this.playerX, this.playerZ, target.x, target.z);
        this.routeTargetKey = target.key;
        this.routeCalcX = this.playerX;
        this.routeCalcZ = this.playerZ;
        this.routeRecalcCooldown = 0.22;
      } else if (Math.hypot(this.playerX - this.lastTrailMeshX, this.playerZ - this.lastTrailMeshZ) > 0.22) {
        rebuildMesh = true;
      }

      if (rebuildMesh && this.currentRoute.length >= 2) {
        // Trim behind player so trail starts cleanly right in front of feet / rover
        const { closestSegIdx } = distanceToRouteXZ(this.playerX, this.playerZ, this.currentRoute);
        const trimmed: Array<[number, number]> = [[this.playerX, this.playerZ]];
        for (let i = Math.min(this.currentRoute.length - 1, closestSegIdx + 1); i < this.currentRoute.length; i++) {
          trimmed.push(this.currentRoute[i]);
        }
        if (trimmed.length < 2) {
          trimmed.push([target.x, target.z]);
        }
        this.currentRoute = trimmed;
        this.goldenTrail.updateRoute(trimmed, this.inVehicle ? 0.62 : 0.42);
        this.lastTrailMeshX = this.playerX;
        this.lastTrailMeshZ = this.playerZ;
      }

      this.goldenTrail.animate(dt);
    }

    // Auto-complete reach / drive_to
    if (mission && obj && obj.targetPosition && this.phase === 'playing') {
      const d = Math.hypot(this.playerX - obj.targetPosition[0], this.playerZ - obj.targetPosition[1]);
      if (obj.type === 'reach' && d <= (obj.radius ?? 6.5)) {
        if (obj.requiresExitVehicle && this.inVehicle) return;
        if (mission.id === 7) {
          this.startDepartureCinematic();
        } else {
          lunarAudio.playChime();
          this.advanceObjective();
        }
      } else if (obj.type === 'drive_to' && this.inVehicle && d <= (obj.radius ?? 13)) {
        lunarAudio.playChime();
        this.advanceObjective();
      }
    }

    // Apollo 11 Tranquility Base discovery area detection & sequential inspection close-up
    if (this.phase === 'playing') {
      const dApollo = Math.hypot(this.playerX - APOLLO_SITE_X, this.playerZ - APOLLO_SITE_Z);
      if (dApollo < 22 && !this.progress.apolloDiscovered && !this.apolloEnteredAreaNotified) {
        this.apolloEnteredAreaNotified = true;
        lunarAudio.playTone(523.25, 0.4, 'sine', 0.05, 0);
      } else if (dApollo > 34) {
        this.apolloEnteredAreaNotified = false;
      }

      if (this.apolloInspectTimer > 0) {
        const playerMoved =
          this.heldKeys.has('KeyW') ||
          this.heldKeys.has('KeyS') ||
          this.heldKeys.has('KeyA') ||
          this.heldKeys.has('KeyD') ||
          this.heldKeys.has('ArrowUp') ||
          this.heldKeys.has('ArrowDown') ||
          this.heldKeys.has('Space');
        if (this.apolloInspectTimer > 0.75 && playerMoved) {
          // Non-blocking: let player move freely whenever ready
          this.apolloInspectTimer = 0;
          this.apolloCaptionStep = 0;
          this.callbacks.onApolloCaption(null);
        } else {
          this.apolloInspectTimer += dt;
          if (this.apolloInspectTimer >= 3.3 && this.apolloCaptionStep === 1) {
            this.apolloCaptionStep = 2;
            this.callbacks.onApolloCaption('Here, humanity first set foot on the Moon.');
          } else if (this.apolloInspectTimer >= 7.2) {
            this.apolloInspectTimer = 0;
            this.apolloCaptionStep = 0;
            this.callbacks.onApolloCaption(null);
          }
        }
      }
    }

    for (const loc of WORLD_LOCATIONS) {
      if (loc.id === 'apollo_11_site') continue; // Handled exclusively by Apollo footprint inspection above
      if (!this.progress.discoveredLocations.includes(loc.id)) {
        const d = Math.hypot(this.playerX - loc.x, this.playerZ - loc.z);
        if (d < 22) {
          this.callbacks.onLocationDiscovered(loc.id);
        }
      }
    }
  }

  private findNearbyOptional(): OptionalActivityDef | null {
    const currentId = this.progress.currentMissionIndex + 1;
    for (const opt of OPTIONAL_ACTIVITIES) {
      if (this.progress.completedOptionals.includes(opt.id)) continue;
      if (currentId < opt.minMissionId) continue;
      if (opt.crewId) {
        const actor = this.crewActors.find((a) => a.def.id === opt.crewId);
        if (actor && Math.hypot(this.playerX - actor.x, this.playerZ - actor.z) < 5.2) {
          return opt;
        }
      }
      if (Math.hypot(this.playerX - opt.x, this.playerZ - opt.z) < 5.5) {
        return opt;
      }
    }
    return null;
  }

  private findNearbyCrew(): AutonomousCrewActor | null {
    for (const actor of this.crewActors) {
      if (Math.hypot(this.playerX - actor.x, this.playerZ - actor.z) < 4.5) {
        return actor;
      }
    }
    return null;
  }

  private findNearbyBuilding(): ColonyBuildingInfo | null {
    for (const b of this.colonyBuildings) {
      const d = Math.hypot(this.playerX - b.x, this.playerZ - b.z);
      if (d < 9.5) return b;
    }
    return null;
  }

  private updateDustParticles(dt: number) {
    let anyChanged = false;
    for (let i = 0; i < this.dustPool.length; i++) {
      const p = this.dustPool[i];
      if (!p.active) continue;
      anyChanged = true;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        _dummyMatrix.makeScale(0, 0, 0);
        this.dustInstanced.setMatrixAt(i, _dummyMatrix);
      } else {
        p.vy -= LUNAR_GRAVITY * 0.55 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        const lifeFrac = 1 - p.life / p.maxLife;
        const s = p.scale * lifeFrac;
        _dummyMatrix.makeTranslation(p.x, p.y, p.z);
        _dummyMatrix.scale(_v1.set(s, s, s));
        this.dustInstanced.setMatrixAt(i, _dummyMatrix);
      }
    }
    if (anyChanged) {
      this.dustInstanced.instanceMatrix.needsUpdate = true;
    }
  }

  private emitHudSnapshot() {
    const mission = CAMPAIGN_MISSIONS[this.progress.currentMissionIndex];
    const obj = mission?.objectives[this.progress.currentObjectiveIndex];
    const target = this.getNavigationGoal();
    const dist = target ? Math.hypot(this.playerX - target.x, this.playerZ - target.z) : 0;

    // Compass heading & relative bearing to active destination
    const camHeadingRad = Math.atan2(-Math.sin(this.camYaw), -Math.cos(this.camYaw));
    const cameraHeadingDeg = ((THREE.MathUtils.radToDeg(camHeadingRad) % 360) + 360) % 360;
    let targetBearingDeg = 0;
    if (target) {
      const targetRad = Math.atan2(target.x - this.playerX, target.z - this.playerZ);
      let rel = THREE.MathUtils.radToDeg(targetRad - camHeadingRad);
      while (rel > 180) rel -= 360;
      while (rel < -180) rel += 360;
      targetBearingDeg = rel;
    }

    const sunElev = Math.sin(this.progress.lunarTime * Math.PI * 2);
    const inIceCrater = Math.hypot(this.playerX - -170, this.playerZ - 145) < 40;
    const isShadowed = sunElev < 0.05 || inIceCrater;
    const surfaceTempC = inIceCrater
      ? -178
      : Math.round(-125 + THREE.MathUtils.clamp((sunElev + 1) * 0.5, 0, 1) * 240);

    let nearbyPrompt: LiveHudSnapshot['nearbyPrompt'] = null;
    if (this.phase === 'playing' && !this.activeModalOpen) {
      if (this.vehicleState === 'PLAYER_DRIVING') {
        const nearApolloDriving = Math.hypot(this.playerX - APOLLO_SITE_X, this.playerZ - APOLLO_SITE_Z) < 18;
        nearbyPrompt = {
          label: this.pendingExitAfterStop
            ? 'Braking rover to a safe stop...'
            : nearApolloDriving && !this.progress.apolloDiscovered
            ? 'exit the rover to explore the footprint.'
            : 'exit the rover.',
          actionType: 'exit_ev',
          keyHint: 'E',
        };
      } else if (this.vehicleState === 'PARKED') {
        let matched = false;
        if (
          this.apolloInspectTimer <= 0 &&
          Math.hypot(this.playerX - this.apolloFootprintWorldX, this.playerZ - this.apolloFootprintWorldZ) < 5.0
        ) {
          nearbyPrompt = { label: 'inspect the Historic Footprint.', actionType: 'apollo_inspect', keyHint: 'E' };
          matched = true;
        }
        if (!matched && mission && obj && obj.targetPosition) {
          const dTarget = Math.hypot(this.playerX - obj.targetPosition[0], this.playerZ - obj.targetPosition[1]);
          if (obj.type === 'collect') {
            for (let i = 0; i < this.worldProps.meteoriteFragments.length; i++) {
              if (this.collectedFragIndices.has(i)) continue;
              const fg = this.worldProps.meteoriteFragments[i];
              if (Math.hypot(this.playerX - fg.position.x, this.playerZ - fg.position.z) < 5.5) {
                nearbyPrompt = { label: 'collect the sample.', actionType: 'collect', keyHint: 'E' };
                matched = true;
                break;
              }
            }
          } else if (
            (obj.type === 'interact' || obj.type === 'minigame' || obj.type === 'transmit') &&
            dTarget <= (obj.radius ?? 8) + 2.5
          ) {
            nearbyPrompt = { label: `${obj.label.toLowerCase()}.`, actionType: obj.type, keyHint: 'E' };
            matched = true;
          }
        }
        if (!matched && Math.hypot(this.playerX - this.evX, this.playerZ - this.evZ) < 5.5) {
          nearbyPrompt = { label: 'enter the rover.', actionType: 'enter_ev', keyHint: 'E' };
          matched = true;
        }
        if (!matched) {
          const opt = this.findNearbyOptional();
          if (opt) {
            nearbyPrompt = { label: `explore ${opt.title.toLowerCase()}.`, actionType: 'optional', keyHint: 'E' };
            matched = true;
          }
        }
        if (!matched) {
          const crew = this.findNearbyCrew();
          if (crew) {
            nearbyPrompt = { label: `talk to ${crew.def.name}.`, actionType: 'crew_talk', keyHint: 'E' };
            matched = true;
          }
        }
        if (!matched) {
          const bld = this.findNearbyBuilding();
          if (bld) {
            nearbyPrompt = { label: `enter the ${bld.name}.`, actionType: 'building_inspect', keyHint: 'E' };
          }
        }
      }
    }

    let vehicleTutorialStep = 0;
    if (mission?.id === 2) {
      vehicleTutorialStep = this.progress.currentObjectiveIndex === 0 ? 1 : 2;
    } else if (mission?.id === 3) {
      vehicleTutorialStep = this.inVehicle ? 3 : 4;
    }

    // Downsample curved golden route waypoints for synchronized Minimap & 3D Map
    const routeWaypoints: Array<[number, number]> = [];
    if (this.currentRoute.length >= 2) {
      const step = Math.max(1, Math.floor((this.currentRoute.length - 1) / 46));
      for (let i = 0; i < this.currentRoute.length; i += step) {
        routeWaypoints.push(this.currentRoute[i]);
      }
      const lastPt = this.currentRoute[this.currentRoute.length - 1];
      const prevPt = routeWaypoints[routeWaypoints.length - 1];
      if (!prevPt || prevPt[0] !== lastPt[0] || prevPt[1] !== lastPt[1]) {
        routeWaypoints.push(lastPt);
      }
    }

    // Project destination marker into screen coordinates (subtle marker when visible in view)
    let targetScreenPos: LiveHudSnapshot['targetScreenPos'] = null;
    if (this.phase === 'playing' && target && target.guidanceMode !== 'exit_rover' && dist > 4.5) {
      _projVec.set(
        this.destMarkerX,
        groundHeightAt(this.destMarkerX, this.destMarkerZ) + 2.9,
        this.destMarkerZ,
      );
      _projVec.project(this.camera);
      if (_projVec.z < 1) {
        const xPct = (_projVec.x * 0.5 + 0.5) * 100;
        const yPct = (-_projVec.y * 0.5 + 0.5) * 100;
        if (xPct >= 4 && xPct <= 96 && yPct >= 8 && yPct <= 90) {
          targetScreenPos = { xPct, yPct };
        }
      }
    }

    const chargingStation = this.getRoverChargingStation();
    const batteryStatus: LiveHudSnapshot['batteryStatus'] = this.roverCharging
      ? 'charging'
      : this.roverBattery <= 0.1
      ? 'empty'
      : this.roverBattery <= 20
      ? 'low'
      : 'healthy';

    this.callbacks.onHudUpdate({
      phase: this.phase,
      cinematicScene: this.cinematicScene,
      vehicleState: this.vehicleState,
      inVehicle: this.inVehicle,
      playerX: this.playerX,
      playerZ: this.playerZ,
      playerY: this.playerY,
      playerHeading: this.playerHeading,
      evX: this.evX,
      evZ: this.evZ,
      evSpeed: this.evSpeed,
      roverBattery: Math.round(this.roverBattery),
      roverCharging: this.roverCharging,
      roverChargeProgress: Math.round(this.roverBattery),
      batteryStatus,
      nearChargingStation: Boolean(chargingStation),
      chargingStationName: chargingStation?.name ?? '',
      emergencyBoostProgress: this.emergencyBoostProgress,
      apolloDiscovered: this.progress.apolloDiscovered,
      showGoldenTrail: this.progress.showGoldenTrail !== false,
      activeCameraMode: this.activeCameraMode,
      targetX: target?.x ?? null,
      targetZ: target?.z ?? null,
      targetLabel: target?.label ?? '',
      distanceToTarget: Math.round(dist),
      targetBearingDeg,
      cameraHeadingDeg,
      sunElevation: sunElev,
      surfaceTempC,
      isShadowed,
      nearbyPrompt,
      crewPositions: this.crewActors.map((a) => ({
        id: a.def.id,
        name: a.def.name,
        role: a.def.role,
        x: a.x,
        z: a.z,
        activity: a.activity,
      })),
      collectProgress: this.collectCount,
      collectTarget: obj?.requiredCount ?? 0,
      vehicleTutorialStep,
      routeWaypoints,
      targetScreenPos,
      guidanceMode: target?.guidanceMode ?? 'none',
    });
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = () => {
    if (this.disposed) return;
    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(rawDt, 0.05);

    if (!this.paused) {
      this.elapsed += dt;
      updateCrewActors(this.crewActors, dt, this.elapsed, this.progress.currentMissionIndex + 1);

      if (this.phase === 'playing') {
        if (!this.activeModalOpen) {
          this.updatePlayerAndVehicle(dt);
        }
        this.updateNavigationAndObjectives(dt);
        this.updateAnimatedAirlocksAndWorldProps(dt);
        this.updatePhysicsProbe(dt);
      } else {
        this.updateCinematics(dt);
      }
      this.updateDayNightAndAtmosphere(dt);
      this.updateDustParticles(dt);
    }

    if (!this.activeModalOpen) {
      this.renderer.render(this.scene, this.camera);
    }

    this.hudSyncAccum += dt;
    if (this.hudSyncAccum >= 0.08) {
      this.hudSyncAccum = 0;
      this.emitHudSnapshot();
    }

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.cleanupListeners();
    this.goldenTrail?.dispose();
    lunarAudio.updateRoverHum(false, 0);
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
