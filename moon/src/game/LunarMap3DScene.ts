import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LiveHudSnapshot, SaveProgress } from '../types/game';
import { buildLunarTerrainMesh, groundHeightAt, WORLD_PLAYABLE_RADIUS } from './lunarTerrain';
import { buildLunarColony } from './colonyBuilder';
import {
  buildMissionWorldProps,
  createDepartureSpacecraft,
  createEarthRig,
  createStarfield,
  EarthRig,
} from './spaceObjects';
import { AstronautRig, createAstronautRig } from './characters';
import {
  createLunarRover,
  LunarRoverRig,
  updateRoverBatteryVisuals,
  updateRoverSuspensionAndTransform,
} from './rover';
import { GoldenTrailMesh } from './navigation';
import {
  BASE_FACILITIES,
  CameraPresetId,
  CAMERA_PRESETS,
  cameraDistanceToZoom,
  EXPEDITION_ROUTES,
  getRevealedLocationIds,
  getVisibleMapMarkers,
  LUNAR_REGIONS,
  MapLayerMode,
  MapMarkerItem,
  shouldShow3DLabel,
} from './mapData';
import { WORLD_LOCATIONS } from './missions';

const _vTmp = new THREE.Vector3();
const _projVec = new THREE.Vector3();
const _rayMouse = new THREE.Vector2();

export interface ProjectedMapLabel {
  id: string;
  marker: MapMarkerItem;
  screenX: number;
  screenY: number;
  camDist: number;
  showText: boolean;
  isRegion?: boolean;
  regionSubtitle?: string;
}

export interface LunarMapSceneCallbacks {
  onSelectMarker: (marker: MapMarkerItem) => void;
  onCameraMetrics: (camDist: number, projectedLabels: ProjectedMapLabel[]) => void;
  onHoverMarker: (markerId: string | null) => void;
}

interface HitTargetMeta {
  marker?: MapMarkerItem;
  directBuildingId?: string;
  directLocId?: string;
  directCrewId?: string;
  directIsRover?: boolean;
}

function buildTerrainRoadMesh(routes: Array<Array<[number, number]>>): THREE.Mesh {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  let vertOffset = 0;

  for (const trail of routes) {
    if (trail.length < 2) continue;
    const dense: Array<[number, number]> = [];
    for (let i = 0; i < trail.length - 1; i++) {
      const [ax, az] = trail[i];
      const [bx, bz] = trail[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      const steps = Math.max(1, Math.ceil(len / 7));
      for (let s = 0; s < steps; s++) {
        const u = s / steps;
        dense.push([ax + (bx - ax) * u, az + (bz - az) * u]);
      }
    }
    dense.push(trail[trail.length - 1]);

    const halfW = 1.65;
    let accum = 0;
    for (let i = 0; i < dense.length; i++) {
      const [px, pz] = dense[i];
      const prev = dense[Math.max(0, i - 1)];
      const next = dense[Math.min(dense.length - 1, i + 1)];
      if (i > 0) accum += Math.hypot(px - prev[0], pz - prev[1]);

      let tx = next[0] - prev[0];
      let tz = next[1] - prev[1];
      const tl = Math.hypot(tx, tz) || 1;
      tx /= tl;
      tz /= tl;

      const perpX = -tz;
      const perpZ = tx;
      const lx = px - perpX * halfW;
      const lz = pz - perpZ * halfW;
      const rx = px + perpX * halfW;
      const rz = pz + perpZ * halfW;

      const cy = groundHeightAt(px, pz);
      const ly = Math.max(cy, groundHeightAt(lx, lz)) + 0.14;
      const ry = Math.max(cy, groundHeightAt(rx, rz)) + 0.14;

      positions.push(lx, ly, lz, rx, ry, rz);
      uvs.push(0, accum * 0.1, 1, accum * 0.1);
    }

    for (let i = 0; i < dense.length - 1; i++) {
      const a = vertOffset + i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, c, b, b, c, d);
    }
    vertOffset += dense.length * 2;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 64, 128);
  const grad = ctx.createLinearGradient(0, 0, 64, 0);
  grad.addColorStop(0, 'rgba(148, 163, 184, 0)');
  grad.addColorStop(0.22, 'rgba(148, 163, 184, 0.35)');
  grad.addColorStop(0.32, 'rgba(56, 189, 248, 0.25)');
  grad.addColorStop(0.5, 'rgba(100, 116, 139, 0.22)');
  grad.addColorStop(0.68, 'rgba(56, 189, 248, 0.25)');
  grad.addColorStop(0.78, 'rgba(148, 163, 184, 0.35)');
  grad.addColorStop(1, 'rgba(148, 163, 184, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 2;
  return mesh;
}

export class LunarMap3DScene {
  private container: HTMLElement;
  private callbacks: LunarMapSceneCallbacks;
  private isSoftwareGl = false;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private envRT: THREE.WebGLRenderTarget | null = null;

  private terrainMesh!: THREE.Mesh;
  private skyEarth!: EarthRig;
  private observatoryDomePivot?: THREE.Object3D;
  private rotatingDishes: THREE.Object3D[] = [];
  private relayDishPivot?: THREE.Object3D;
  private apolloDiscoveryRing!: THREE.Mesh;
  private goldenTrail!: GoldenTrailMesh;
  private destBeaconGroup!: THREE.Group;
  private destBeaconRing!: THREE.Mesh;
  private destBeaconBeam!: THREE.Mesh;
  private selectionHalo!: THREE.Mesh;

  private playerRig!: AstronautRig;
  private playerBeaconRing!: THREE.Mesh;
  private playerBeaconBeam!: THREE.Mesh;
  private roverRig!: LunarRoverRig;
  private lastRoverHeading = Math.PI;
  private crewRigs = new Map<string, AstronautRig>();

  // Raycast interactive proxies (layer 1)
  private raycaster = new THREE.Raycaster();
  private hitTargets: THREE.Mesh[] = [];
  private hitMeta = new WeakMap<THREE.Object3D, HitTargetMeta>();
  private worldHitTargets: THREE.Object3D[] = [];
  private roverHitProxy?: THREE.Mesh;
  private crewHitProxies = new Map<string, THREE.Mesh>();

  // Smooth camera flight state
  private flying = false;
  private flyTarget = new THREE.Vector3();
  private flyCamPos = new THREE.Vector3();

  // Live synced state
  private hud: LiveHudSnapshot;
  private progress: SaveProgress;
  private layerMode: MapLayerMode = 'exploration';
  private routeKey = '';

  // Loop & lifecycle
  private frameId = 0;
  private disposed = false;
  private lastTime = performance.now();
  private elapsed = 0;
  private labelAccum = 0;
  private pointerDownPos = { x: 0, y: 0 };

  constructor(
    container: HTMLElement,
    initialHud: LiveHudSnapshot,
    initialProgress: SaveProgress,
    callbacks: LunarMapSceneCallbacks,
  ) {
    this.container = container;
    this.hud = initialHud;
    this.progress = initialProgress;
    this.callbacks = callbacks;

    this.initRenderer();
    this.buildRealWorld();
    this.bindEvents();
    this.syncState(initialHud, initialProgress, 'exploration');
    this.emitProjectedLabels();

    this.lastTime = performance.now();
    this.tick();
  }

  private detectSoftwareWebGL(): boolean {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  }

  private initRenderer() {
    this.isSoftwareGl = this.detectSoftwareWebGL();
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.14;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const w = this.container.clientWidth || 960;
    const h = this.container.clientHeight || 600;
    this.renderer.setSize(w, h);
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x02040a);
    this.scene.fog = new THREE.FogExp2(0x040710, 0.00055);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(44, w / h, 0.5, 3600);
    // Start in the high-angle open-world overview showing Base, Craters, Earth & Frontiers
    this.camera.position.set(0, 315, 365);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.075;
    this.controls.rotateSpeed = 0.78;
    this.controls.zoomSpeed = 1.05;
    this.controls.panSpeed = 0.85;
    this.controls.screenSpacePanning = false; // Pan smoothly parallel to lunar surface
    this.controls.minDistance = 20;
    this.controls.maxDistance = 680;
    this.controls.maxPolarAngle = Math.PI * 0.44;
    this.controls.target.set(0, 0, 0);

    // Interrupt scripted flights if the user grabs camera controls
    this.controls.addEventListener('start', () => {
      this.flying = false;
    });

    // Studio Lunar Lighting: cool hemisphere + warm crisp Sun + subtle Earth bounce
    const hemi = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.62);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff7e6, 2.35);
    sun.position.set(210, 260, 140);
    sun.castShadow = !this.isSoftwareGl;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    const sd = 260;
    sun.shadow.camera.left = -sd;
    sun.shadow.camera.right = sd;
    sun.shadow.camera.top = sd;
    sun.shadow.camera.bottom = -sd;
    sun.shadow.camera.near = 20;
    sun.shadow.camera.far = 780;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.03;
    this.scene.add(sun);

    const earthFill = new THREE.DirectionalLight(0x60a5fa, 0.42);
    earthFill.position.set(-220, 180, -320);
    this.scene.add(earthFill);
  }

  private buildRealWorld() {
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    // 1. Starfield & Approved Earth in the lunar sky
    this.scene.add(createStarfield(2000, 1450));
    this.skyEarth = createEarthRig(88, maxAniso);
    this.skyEarth.group.position.set(-340, 275, -620);
    this.skyEarth.group.rotation.z = 0.35;
    this.scene.add(this.skyEarth.group);

    // 2. Actual 1200x1200 Lunar Terrain + 1000 Instanced Boulders/Basalt Outcrops
    const { terrainMesh, rockInstanced, slabInstanced } = buildLunarTerrainMesh(maxAniso);
    this.terrainMesh = terrainMesh;
    this.scene.add(terrainMesh);
    this.scene.add(rockInstanced);
    this.scene.add(slabInstanced);
    this.worldHitTargets.push(terrainMesh);

    // Subtle Rover Exploration Corridor Roads across the plains
    this.scene.add(buildTerrainRoadMesh(EXPEDITION_ROUTES));

    // 3. Actual Multi-Part 3D Lunar Colony (all 17 facilities, tunnels, solar arrays, charging bays)
    const colony = buildLunarColony();
    this.scene.add(colony.group);
    this.observatoryDomePivot = colony.observatoryDomePivot;
    colony.buildings.forEach((b) => {
      if (b.rotatingDish) this.rotatingDishes.push(b.rotatingDish);
    });

    // Departure spacecraft at Launch Pad (-52, -2)
    const ship = createDepartureSpacecraft();
    ship.group.position.set(-52, groundHeightAt(-52, -2), -2);
    if (this.progress.completedMissions.includes(7)) {
      ship.group.visible = false;
    }
    this.scene.add(ship.group);

    // 4. Actual 3D World Props across all Geographical Regions
    const props = buildMissionWorldProps();
    this.scene.add(props.root);
    this.relayDishPivot = props.rig.relayDishPivot;
    this.apolloDiscoveryRing = props.rig.apolloDiscoveryRing;
    (this.apolloDiscoveryRing.material as THREE.MeshBasicMaterial).opacity = this.progress.apolloDiscovered
      ? 0.55
      : 0.0;

    // 5. Real 3D Astronauts (Player + Teenage Crew) & Real 3D Lunar Rover
    this.playerRig = createAstronautRig(0xf59e0b, false, true);
    this.scene.add(this.playerRig.root);

    this.playerBeaconRing = new THREE.Mesh(
      new THREE.RingGeometry(2.2, 3.1, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }),
    );
    this.playerBeaconRing.rotation.x = -Math.PI / 2;
    this.scene.add(this.playerBeaconRing);

    this.playerBeaconBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 1.0, 40, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.scene.add(this.playerBeaconBeam);

    const crewColors: Record<string, number> = {
      maya: 0x06b6d4,
      leo: 0x22c55e,
      zara: 0xec4899,
      ryan: 0x8b5cf6,
    };
    this.hud.crewPositions.forEach((c) => {
      const rig = createAstronautRig(crewColors[c.id] ?? 0x34d399, false, false);
      rig.root.position.set(c.x, groundHeightAt(c.x, c.z), c.z);
      this.scene.add(rig.root);
      this.crewRigs.set(c.id, rig);
    });

    this.roverRig = createLunarRover();
    this.scene.add(this.roverRig.root);

    // 6. Real Terrain-Following Golden Navigation Trail + Destination Light Spire
    this.goldenTrail = new GoldenTrailMesh(maxAniso);
    this.scene.add(this.goldenTrail.mesh);

    this.destBeaconGroup = new THREE.Group();
    this.destBeaconRing = new THREE.Mesh(
      new THREE.RingGeometry(4.2, 5.4, 36),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }),
    );
    this.destBeaconRing.rotation.x = -Math.PI / 2;
    this.destBeaconGroup.add(this.destBeaconRing);

    this.destBeaconBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 1.85, 68, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    this.destBeaconBeam.position.y = 34;
    this.destBeaconGroup.add(this.destBeaconBeam);
    this.destBeaconGroup.visible = false;
    this.scene.add(this.destBeaconGroup);

    // 7. Ground Selection Halo Ring
    this.selectionHalo = new THREE.Mesh(
      new THREE.RingGeometry(5.8, 7.2, 40),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }),
    );
    this.selectionHalo.rotation.x = -Math.PI / 2;
    this.selectionHalo.visible = false;
    this.scene.add(this.selectionHalo);

    // 8. Invisible 3D Raycast Hit Spheres aligned to real Base Buildings, Outposts & Regions
    this.buildRaycastProxies();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private buildRaycastProxies() {
    const invisibleMat = new THREE.MeshBasicMaterial({ visible: false });
    const sphereGeo = new THREE.SphereGeometry(1, 10, 8);

    // Base buildings clickable directly in 3D space
    BASE_FACILITIES.forEach((f) => {
      const m = new THREE.Mesh(sphereGeo, invisibleMat);
      const y = groundHeightAt(f.x, f.z);
      m.position.set(f.x, y + 3.5, f.z);
      m.scale.setScalar(7.5);
      m.layers.set(1);
      this.scene.add(m);
      this.hitTargets.push(m);
      this.hitMeta.set(m, { directBuildingId: f.id });
    });

    // Outer craters, outposts, and landmarks clickable directly in 3D space
    const revealedIds = getRevealedLocationIds(this.progress);
    WORLD_LOCATIONS.forEach((loc) => {
      if (loc.category === 'colony') return;
      if (loc.id !== 'apollo_11_site' && !revealedIds.has(loc.id)) return;
      const m = new THREE.Mesh(sphereGeo, invisibleMat);
      m.position.set(loc.x, groundHeightAt(loc.x, loc.z) + 5.0, loc.z);
      m.scale.setScalar(loc.category === 'crater' ? 16 : 11);
      m.layers.set(1);
      this.scene.add(m);
      this.hitTargets.push(m);
      this.hitMeta.set(m, { directLocId: loc.id });
    });

    // Crew clickable hit spheres
    this.hud.crewPositions.forEach((c) => {
      const m = new THREE.Mesh(sphereGeo, invisibleMat);
      m.position.set(c.x, groundHeightAt(c.x, c.z) + 2, c.z);
      m.scale.setScalar(4.5);
      m.layers.set(1);
      this.scene.add(m);
      this.hitTargets.push(m);
      this.hitMeta.set(m, { directCrewId: c.id });
      this.crewHitProxies.set(c.id, m);
    });

    // Rover clickable hit sphere
    const roverHit = new THREE.Mesh(sphereGeo, invisibleMat);
    roverHit.position.set(this.hud.evX, groundHeightAt(this.hud.evX, this.hud.evZ) + 2, this.hud.evZ);
    roverHit.scale.setScalar(6.5);
    roverHit.layers.set(1);
    roverHit.name = 'rover_hit_proxy';
    this.scene.add(roverHit);
    this.hitTargets.push(roverHit);
    this.hitMeta.set(roverHit, { directIsRover: true });
    this.roverHitProxy = roverHit;
  }

  private bindEvents() {
    const dom = this.renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const moveDist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
      if (moveDist > 5) return; // Was a drag rotation, not a click

      const rect = dom.getBoundingClientRect();
      _rayMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _rayMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(_rayMouse, this.camera);
      this.raycaster.layers.set(1);
      const hits = this.raycaster.intersectObjects(this.hitTargets, false);
      if (hits.length > 0) {
        const meta = this.hitMeta.get(hits[0].object);
        if (meta) {
          this.handleHitMeta(meta);
        }
      }
    };

    const onDoubleClick = (e: MouseEvent) => {
      const rect = dom.getBoundingClientRect();
      _rayMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _rayMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(_rayMouse, this.camera);

      // Priority: building/actor first, then terrain
      this.raycaster.layers.set(1);
      const objHits = this.raycaster.intersectObjects(this.hitTargets, false);
      if (objHits.length > 0) {
        const meta = this.hitMeta.get(objHits[0].object);
        if (meta) {
          this.handleHitMeta(meta, true);
          return;
        }
      }

      this.raycaster.layers.set(0);
      const terrainHits = this.raycaster.intersectObjects(this.worldHitTargets, false);
      if (terrainHits.length > 0) {
        const pt = terrainHits[0].point;
        this.flyTo(pt.x, pt.z, 78);
      }
    };

    let lastHoverCheck = 0;
    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < 50) return;
      lastHoverCheck = now;

      const rect = dom.getBoundingClientRect();
      _rayMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _rayMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(_rayMouse, this.camera);
      this.raycaster.layers.set(1);
      const hits = this.raycaster.intersectObjects(this.hitTargets, false);
      if (hits.length > 0) {
        const meta = this.hitMeta.get(hits[0].object);
        if (meta?.directBuildingId) {
          dom.style.cursor = 'pointer';
          this.callbacks.onHoverMarker(`building:${meta.directBuildingId}`);
          return;
        }
        if (meta?.directLocId) {
          dom.style.cursor = 'pointer';
          this.callbacks.onHoverMarker(
            meta.directLocId === 'apollo_11_site'
              ? this.progress.apolloDiscovered
                ? 'apollo:site'
                : 'apollo:quiet_plain'
              : `loc:${meta.directLocId}`,
          );
          return;
        }
        if (meta?.directCrewId) {
          dom.style.cursor = 'pointer';
          this.callbacks.onHoverMarker(`crew:${meta.directCrewId}`);
          return;
        }
        if (meta?.directIsRover) {
          dom.style.cursor = 'pointer';
          this.callbacks.onHoverMarker('rover:ev');
          return;
        }
      }
      dom.style.cursor = 'grab';
      this.callbacks.onHoverMarker(null);
    };

    const onResize = () => {
      if (this.disposed) return;
      const w = this.container.clientWidth || 960;
      const h = this.container.clientHeight || 600;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };

    dom.addEventListener('pointerdown', onPointerDown);
    dom.addEventListener('pointerup', onPointerUp);
    dom.addEventListener('dblclick', onDoubleClick);
    dom.addEventListener('pointermove', onPointerMove);
    window.addEventListener('resize', onResize);

    // Store cleanup on instance
    this.cleanupDomListeners = () => {
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('dblclick', onDoubleClick);
      dom.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', onResize);
    };
  }

  private cleanupDomListeners: () => void = () => {};

  private handleHitMeta(meta: HitTargetMeta, closeZoom = false) {
    const camDist = this.camera.position.distanceTo(this.controls.target);
    const markers = getVisibleMapMarkers(this.hud, this.progress, this.layerMode, cameraDistanceToZoom(camDist));

    if (meta.directBuildingId) {
      const f = BASE_FACILITIES.find((b) => b.id === meta.directBuildingId);
      if (f) {
        this.flyTo(f.x, f.z, closeZoom ? 38 : 60);
        this.highlightLocation(f.x, f.z, 7.2, f.accentHex);
        const found = markers.find((m) => m.facilityId === f.id) ?? {
          id: `building:${f.id}`,
          entityKind: 'building' as const,
          markerKind: 'building' as const,
          name: f.shortName,
          subtitle: f.name,
          x: f.x,
          z: f.z,
          iconKind: f.iconKind,
          accentHex: f.accentHex,
          priority: 80,
          facilityId: f.id,
          locId: f.id,
        };
        this.callbacks.onSelectMarker(found);
      }
      return;
    }

    if (meta.directCrewId) {
      const c = this.hud.crewPositions.find((x) => x.id === meta.directCrewId);
      if (c) {
        this.flyTo(c.x, c.z, 42);
        this.highlightLocation(c.x, c.z, 4.0, '#34d399');
        const found = markers.find((m) => m.crewId === c.id) ?? {
          id: `crew:${c.id}`,
          entityKind: 'crew' as const,
          markerKind: 'crew' as const,
          name: c.name,
          subtitle: `${c.role} · ${c.activity}`,
          x: c.x,
          z: c.z,
          accentHex: '#34d399',
          priority: 85,
          crewId: c.id,
        };
        this.callbacks.onSelectMarker(found);
      }
      return;
    }

    if (meta.directLocId) {
      const loc = WORLD_LOCATIONS.find((l) => l.id === meta.directLocId);
      if (loc) {
        const isApollo = loc.id === 'apollo_11_site';
        const apolloDisc = isApollo && (this.progress.apolloDiscovered || this.hud.apolloDiscovered);
        this.flyTo(loc.x, loc.z, closeZoom ? 64 : 108);
        this.highlightLocation(
          loc.x,
          loc.z,
          isApollo ? 7.5 : 11,
          apolloDisc ? '#fbbf24' : isApollo ? '#94a3b8' : '#38bdf8',
        );
        const found = markers.find((m) => m.locId === loc.id) ?? {
          id: isApollo ? (apolloDisc ? 'apollo:site' : 'apollo:quiet_plain') : `loc:${loc.id}`,
          entityKind: (isApollo ? 'apollo' : 'location') as MapMarkerItem['entityKind'],
          markerKind: (isApollo
            ? apolloDisc
              ? 'apollo_discovered'
              : 'apollo_hidden'
            : 'discovery_site') as MapMarkerItem['markerKind'],
          name: loc.name,
          subtitle: isApollo && !apolloDisc ? 'An unexplored historical location.' : loc.description,
          x: loc.x,
          z: loc.z,
          accentHex: apolloDisc ? '#fbbf24' : isApollo ? '#94a3b8' : '#38bdf8',
          priority: isApollo && !apolloDisc ? 35 : 72,
          locId: loc.id,
        };
        this.callbacks.onSelectMarker(found);
      }
      return;
    }

    if (meta.directIsRover) {
      this.flyTo(this.hud.evX, this.hud.evZ, 48);
      this.highlightLocation(this.hud.evX, this.hud.evZ, 5.5, '#fb923c');
      const found = markers.find((m) => m.entityKind === 'rover');
      if (found) this.callbacks.onSelectMarker(found);
    }
  }

  public highlightLocation(wx: number, wz: number, radius = 7.0, colorHex = '#38bdf8') {
    const y = groundHeightAt(wx, wz) + 0.35;
    this.selectionHalo.position.set(wx, y, wz);
    const scale = radius / 6.5;
    this.selectionHalo.scale.set(scale, scale, 1);
    (this.selectionHalo.material as THREE.MeshBasicMaterial).color.set(colorHex);
    this.selectionHalo.visible = true;
  }

  public syncState(hud: LiveHudSnapshot, progress: SaveProgress, layerMode: MapLayerMode) {
    this.hud = hud;
    this.progress = progress;
    this.layerMode = layerMode;

    // Update live Player 3D Astronaut & beacon ring
    const py = groundHeightAt(hud.playerX, hud.playerZ);
    this.playerRig.root.position.set(hud.playerX, py, hud.playerZ);
    this.playerRig.root.rotation.set(0, hud.playerHeading, 0);
    this.playerBeaconRing.position.set(hud.playerX, py + 0.3, hud.playerZ);
    this.playerBeaconBeam.position.set(hud.playerX, py + 20, hud.playerZ);

    // Update live Crew Astronauts & hit spheres
    hud.crewPositions.forEach((c) => {
      const cy = groundHeightAt(c.x, c.z);
      const rig = this.crewRigs.get(c.id);
      if (rig) {
        rig.root.position.set(c.x, cy, c.z);
      }
      const proxy = this.crewHitProxies.get(c.id);
      if (proxy) {
        proxy.position.set(c.x, cy + 2, c.z);
      }
    });

    // Update live 3D Lunar Rover & hit sphere
    if (hud.inVehicle) {
      this.lastRoverHeading = hud.playerHeading;
    }
    updateRoverSuspensionAndTransform(
      this.roverRig,
      hud.evX,
      hud.evZ,
      this.lastRoverHeading,
      0,
      0,
      0,
      0.016,
      false,
      true,
    );
    updateRoverBatteryVisuals(this.roverRig, hud.roverBattery, hud.roverCharging);
    if (this.roverHitProxy) {
      this.roverHitProxy.position.set(hud.evX, groundHeightAt(hud.evX, hud.evZ) + 2, hud.evZ);
    }

    // Update Apollo 11 ring subtly only if discovered
    if (this.apolloDiscoveryRing) {
      (this.apolloDiscoveryRing.material as THREE.MeshBasicMaterial).opacity = progress.apolloDiscovered
        ? 0.65
        : 0.0;
    }

    // Update Synchronized Terrain-Following Golden Route
    if (hud.showGoldenTrail !== false && hud.targetX !== null && hud.targetZ !== null) {
      const key = `${Math.round(hud.playerX)}:${Math.round(hud.playerZ)}->${Math.round(hud.targetX)}:${Math.round(hud.targetZ)}:${hud.routeWaypoints.length}`;
      if (key !== this.routeKey) {
        this.routeKey = key;
        const route: Array<[number, number]> =
          hud.routeWaypoints.length >= 2
            ? hud.routeWaypoints
            : [
                [hud.playerX, hud.playerZ],
                [hud.targetX, hud.targetZ],
              ];
        this.goldenTrail.updateRoute(route, 1.45);
      }
      const ty = groundHeightAt(hud.targetX, hud.targetZ);
      this.destBeaconGroup.position.set(hud.targetX, ty + 0.2, hud.targetZ);
      this.destBeaconGroup.visible = true;
    } else {
      this.routeKey = '';
      this.goldenTrail.updateRoute([]);
      this.destBeaconGroup.visible = false;
    }
  }

  public flyTo(wx: number, wz: number, distance = 85) {
    const cx = THREE.MathUtils.clamp(wx, -WORLD_PLAYABLE_RADIUS, WORLD_PLAYABLE_RADIUS);
    const cz = THREE.MathUtils.clamp(wz, -WORLD_PLAYABLE_RADIUS, WORLD_PLAYABLE_RADIUS);
    const ty = groundHeightAt(cx, cz) + 2;

    // Preserve current azimuth angle smoothly so camera never snaps abruptly
    _vTmp.copy(this.camera.position).sub(this.controls.target);
    const horizLen = Math.hypot(_vTmp.x, _vTmp.z) || 1;
    const dirX = _vTmp.x / horizLen;
    const dirZ = _vTmp.z / horizLen;

    const d = THREE.MathUtils.clamp(distance, 24, 620);
    const pitchElev = d * 0.56;
    const groundPull = d * 0.82;

    this.flyTarget.set(cx, ty, cz);
    this.flyCamPos.set(
      cx + dirX * groundPull,
      Math.max(ty + pitchElev, groundHeightAt(cx + dirX * groundPull, cz + dirZ * groundPull) + 12),
      cz + dirZ * groundPull,
    );
    this.flying = true;
  }

  public applyPreset(presetId: CameraPresetId) {
    const p = CAMERA_PRESETS.find((x) => x.id === presetId) ?? CAMERA_PRESETS[0];
    this.flyTarget.set(p.target[0], p.target[1], p.target[2]);
    this.flyCamPos.set(
      p.target[0] + p.offset[0],
      p.target[1] + p.offset[1],
      p.target[2] + p.offset[2],
    );
    this.flying = true;
  }

  public zoomBy(factor: number) {
    this.flying = false;
    _vTmp.copy(this.camera.position).sub(this.controls.target);
    const nextLen = THREE.MathUtils.clamp(_vTmp.length() * factor, this.controls.minDistance, this.controls.maxDistance);
    _vTmp.setLength(nextLen);
    this.camera.position.copy(this.controls.target).add(_vTmp);
    this.controls.update();
  }

  public resizeNow() {
    if (this.disposed) return;
    const w = this.container.clientWidth || 960;
    const h = this.container.clientHeight || 600;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private emitProjectedLabels() {
    const w = this.container.clientWidth || 960;
    const h = this.container.clientHeight || 600;
    this.camera.updateMatrixWorld();

    const camToTargetDist = this.camera.position.distanceTo(this.controls.target);
    const zoomFactor = cameraDistanceToZoom(camToTargetDist);
    const markers = getVisibleMapMarkers(this.hud, this.progress, this.layerMode, zoomFactor);

    const projected: ProjectedMapLabel[] = [];
    const placedBoxes: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

    const checkOverlap = (x: number, y: number, bw = 112, bh = 28): boolean => {
      const x1 = x - bw / 2;
      const x2 = x + bw / 2;
      const y1 = y - bh / 2;
      const y2 = y + bh / 2;
      for (let i = 0; i < placedBoxes.length; i++) {
        const b = placedBoxes[i];
        if (x1 < b.x2 && x2 > b.x1 && y1 < b.y2 && y2 > b.y1) return true;
      }
      placedBoxes.push({ x1, y1, x2, y2 });
      return false;
    };

    // Always project Player Explorer pin cleanly
    {
      _projVec.set(this.hud.playerX, groundHeightAt(this.hud.playerX, this.hud.playerZ) + 6.5, this.hud.playerZ);
      const pCamDist = this.camera.position.distanceTo(_projVec);
      _projVec.project(this.camera);
      if (_projVec.z >= -1 && _projVec.z <= 1) {
        const sx = (_projVec.x * 0.5 + 0.5) * w;
        const sy = (-_projVec.y * 0.5 + 0.5) * h;
        if (sx >= 24 && sx <= w - 24 && sy >= 24 && sy <= h - 24) {
          placedBoxes.push({ x1: sx - 42, y1: sy - 14, x2: sx + 42, y2: sy + 14 });
          projected.push({
            id: 'player:mc',
            marker: {
              id: 'player:mc',
              entityKind: 'crew',
              markerKind: 'crew',
              name: 'You',
              subtitle: this.hud.inVehicle ? 'Driving Lunar EV' : 'Exploring Surface',
              x: this.hud.playerX,
              z: this.hud.playerZ,
              accentHex: '#ffffff',
              priority: 100,
            },
            screenX: sx,
            screenY: sy,
            camDist: pCamDist,
            showText: true,
          });
        }
      }
    }

    // High-altitude Geographical Region Labels (Spider-Man / Witcher 3 overview readability)
    if (camToTargetDist > 175 && this.layerMode !== 'base') {
      for (const reg of LUNAR_REGIONS) {
        if (reg.id === 'quiet_mare_plain' && !this.progress.apolloDiscovered && this.layerMode !== 'discoveries') {
          continue;
        }
        const ry = groundHeightAt(reg.x, reg.z) + 12;
        _projVec.set(reg.x, ry, reg.z);
        const camDist = this.camera.position.distanceTo(_projVec);
        _projVec.project(this.camera);
        if (_projVec.z > 1 || _projVec.z < -1) continue;
        const sx = (_projVec.x * 0.5 + 0.5) * w;
        const sy = (-_projVec.y * 0.5 + 0.5) * h;
        if (sx < 40 || sx > w - 40 || sy < 40 || sy > h - 40) continue;
        if (checkOverlap(sx, sy, 145, 32)) continue;

        projected.push({
          id: `region:${reg.id}`,
          marker: {
            id: `region:${reg.id}`,
            entityKind: 'location',
            markerKind: 'discovery_site',
            name: reg.name,
            subtitle: reg.subtitle,
            x: reg.x,
            z: reg.z,
            accentHex: '#cbd5e1',
            priority: 40,
            locId: reg.id,
          },
          screenX: sx,
          screenY: sy,
          camDist,
          showText: true,
          isRegion: true,
          regionSubtitle: reg.subtitle,
        });
      }
    }

    // Priority-sorted interactive world markers (Active Mission, Rover, Base Hub/Buildings, Crew, Landmarks)
    const sorted = [...markers].sort((a, b) => b.priority - a.priority);
    for (const m of sorted) {
      const yOff =
        m.markerKind === 'active_mission'
          ? 16
          : m.markerKind === 'base_hub'
          ? 14
          : m.entityKind === 'building'
          ? 7.5
          : m.entityKind === 'crew'
          ? 3.8
          : 5.5;
      _projVec.set(m.x, groundHeightAt(m.x, m.z) + yOff, m.z);
      const camDist = this.camera.position.distanceTo(_projVec);
      _projVec.project(this.camera);
      if (_projVec.z > 1 || _projVec.z < -1) continue;

      const sx = (_projVec.x * 0.5 + 0.5) * w;
      const sy = (-_projVec.y * 0.5 + 0.5) * h;
      if (sx < 24 || sx > w - 24 || sy < 24 || sy > h - 24) continue;

      const wantText = shouldShow3DLabel(m, camDist, this.layerMode);
      const forceKeep =
        m.markerKind === 'active_mission' ||
        m.markerKind === 'base_hub' ||
        m.markerKind === 'rover' ||
        m.entityKind === 'apollo';

      const overlapped = checkOverlap(sx, sy, wantText ? 118 : 34, 26);
      if (overlapped && !forceKeep) {
        // Still allow crisp pin dot without overlapping text if nearby
        if (m.entityKind !== 'building' && m.entityKind !== 'optional') continue;
        projected.push({
          id: m.id,
          marker: m,
          screenX: sx,
          screenY: sy,
          camDist,
          showText: false,
        });
        continue;
      }

      projected.push({
        id: m.id,
        marker: m,
        screenX: sx,
        screenY: sy,
        camDist,
        showText: wantText,
      });
    }

    this.callbacks.onCameraMetrics(camToTargetDist, projected);
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
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.elapsed += dt;

    // Gentle living lunar motion
    this.skyEarth.surfaceMesh.rotation.y += dt * 0.015;
    this.skyEarth.cloudMesh.rotation.y += dt * 0.02;
    this.goldenTrail.animate(dt);

    for (const d of this.rotatingDishes) {
      d.rotation.y = Math.sin(this.elapsed * 0.35) * 0.45;
    }
    if (this.observatoryDomePivot) {
      this.observatoryDomePivot.rotation.y = Math.atan2(-340 - -48, -620 - 32) + Math.sin(this.elapsed * 0.15) * 0.12;
    }
    if (this.relayDishPivot) {
      this.relayDishPivot.rotation.y = Math.sin(this.elapsed * 0.25) * 0.35;
    }
    if (this.destBeaconGroup.visible) {
      const pulse = 1 + Math.sin(this.elapsed * 3.4) * 0.12;
      this.destBeaconRing.scale.set(pulse, pulse, 1);
    }
    if (this.selectionHalo.visible) {
      this.selectionHalo.rotation.z += dt * 0.7;
    }

    // Smooth camera flight interpolation
    if (this.flying) {
      const lambda = 6.2;
      this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, this.flyTarget.x, lambda, dt);
      this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, this.flyTarget.y, lambda, dt);
      this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, this.flyTarget.z, lambda, dt);
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.flyCamPos.x, lambda, dt);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.flyCamPos.y, lambda, dt);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.flyCamPos.z, lambda, dt);

      if (
        this.controls.target.distanceTo(this.flyTarget) < 0.35 &&
        this.camera.position.distanceTo(this.flyCamPos) < 0.55
      ) {
        this.flying = false;
      }
    }

    this.controls.update();

    // Clamp target inside lunar frontier & keep camera safely above terrain craters/mountains
    this.controls.target.x = THREE.MathUtils.clamp(this.controls.target.x, -455, 455);
    this.controls.target.z = THREE.MathUtils.clamp(this.controls.target.z, -455, 455);
    const minGroundY = groundHeightAt(this.camera.position.x, this.camera.position.z) + 5.5;
    if (this.camera.position.y < minGroundY) {
      this.camera.position.y = minGroundY;
    }

    this.renderer.render(this.scene, this.camera);

    // Project 3D world markers onto screen cleanly (~20Hz smooth sync)
    this.labelAccum += dt;
    if (this.labelAccum >= 0.045) {
      this.labelAccum = 0;
      this.emitProjectedLabels();
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
    this.cleanupDomListeners();
    this.goldenTrail?.dispose();
    this.controls?.dispose();
    this.envRT?.dispose();

    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          if (!m) return;
          const std = m as THREE.MeshStandardMaterial;
          std.map?.dispose();
          std.normalMap?.dispose();
          std.roughnessMap?.dispose();
          std.aoMap?.dispose();
          std.emissiveMap?.dispose();
          std.metalnessMap?.dispose();
          std.bumpMap?.dispose();
          std.alphaMap?.dispose();
          m.dispose();
        });
      }
    });

    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
