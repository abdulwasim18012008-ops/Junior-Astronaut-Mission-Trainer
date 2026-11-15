import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { INTERACTIVE_NODES } from './adventureStory';
import { BaseWorldHandles, createBaseWorld } from './baseWorld';
import { CelestialMoonsHandles, createCelestialMoonsAndDustDevils } from './celestialMoons';
import { CharactersHandles, createCharacters } from './characters';
import { ColonyExpansionHandles, createColonyExpansion } from './colonyExpansion';
import {
  CARGO_LANDING_PAD_POS,
  CHARGING_CONSOLE_POS,
  computeSolVisualSample,
  MEV_BATTERY_CAPACITY_KWH,
  MEV_BATTERY_RESERVE_PCT,
  STORM_STAGE_SPECS,
  WEATHER_SPECS,
  weatherToStormStage,
} from './marsConfig';
import { createMarsEnvironment, groundHeightAt, MarsEnvironmentHandles, surfaceTypeAt } from './marsTerrain';
import { createProceduralTextures, ProceduralTextureSet } from './proceduralTextures';
import { EXPANSION_PODS, LOST_ROVERS, MARS_ANOMALIES, MARS_LANDMARKS } from './roversData';
import { soundEngine } from './soundEngine';
import { createSpaceAndLander, SpaceAndLanderHandles } from './spaceIntro';
import {
  AstronautActionAnim,
  BuildingId,
  EnvironmentTelemetry,
  InteractiveNodeId,
  LostRoverId,
  WorldVisualState,
} from './types';

// Zero-GC scratch helpers
const _raycaster = new THREE.Raycaster();
const _pointer = new THREE.Vector2();
const _desiredCamPos = new THREE.Vector3();
const _desiredLook = new THREE.Vector3();
const _currentLook = new THREE.Vector3(0, 1.5, 0);
const _sunDir = new THREE.Vector3(0.4, 0.7, 0.4);
const _tmpSkyCol = new THREE.Color();

function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export interface MarsColonyEngineCallbacks {
  onInteractNode: (nodeId: InteractiveNodeId) => void;
  onInteractVehicle?: () => void;
  onNearbyNodeChange: (nodeId: InteractiveNodeId | null) => void;
  onInsideBuildingChange: (buildingId: BuildingId | null) => void;
  onTelemetryUpdate?: (telemetry: EnvironmentTelemetry) => void;
  onWebGLContextLost: (lost: boolean) => void;
}

export class MarsColonyEngine {
  private container: HTMLElement;
  private callbacks: MarsColonyEngineCallbacks;
  private isSoftwareGl: boolean;

  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();

  private textures: ProceduralTextureSet;
  private marsEnv: MarsEnvironmentHandles;
  private celestialMoons: CelestialMoonsHandles;
  private baseWorld: BaseWorldHandles;
  private colonyExpansion: ColonyExpansionHandles;
  private spaceAndLander: SpaceAndLanderHandles;
  private characters: CharactersHandles;

  private hemiLight: THREE.HemisphereLight;
  private sunLight: THREE.DirectionalLight;
  private alertLight: THREE.PointLight;

  private visualState: WorldVisualState;
  private lastNearbyNode: InteractiveNodeId | null = null;
  private lastInsideBuilding: BuildingId | null = null;
  private lastScanPulseCounter = 0;
  private lastActionAnimCounter = 0;
  private telemetryTimer = 0;

  // Third-person orbit camera state & cockpit look offsets
  private orbitYaw = 0.25;
  private orbitPitch = 0.38;
  private orbitDist = 9.0;
  private roverOrbitDist = 17.2;
  private interiorZoomFactor = 0;
  private cockpitLookYaw = 0;
  private cockpitLookPitch = 0;
  private cameraSpeedMultiplier = 1.0;

  // Frame-accurate smooth cutscene walk tracks (avoids 60Hz React re-renders & foot sliding)
  private scriptedWalks: Partial<
    Record<
      'alex' | 'nova',
      {
        from: [number, number];
        to: [number, number];
        elapsed: number;
        duration: number;
        yaw: number;
        endYaw?: number;
        done: boolean;
        onDone?: () => void;
      }
    >
  > = {};

  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private dragLast = { x: 0, y: 0 };
  private keys: Record<string, boolean> = {};
  private touchMove = { right: 0, forward: 0 };
  private touchSprint = false;
  private jumpQueued = false;
  private frameId = 0;
  private disposed = false;

  private readonly spaceBgColor = new THREE.Color('#050814');
  private readonly marsDayBgColor = new THREE.Color('#cc794d');
  private readonly marsSunsetBgColor = new THREE.Color('#8a4b5a');
  private readonly marsNightBgColor = new THREE.Color('#0d1221');
  private readonly stormBgColor = new THREE.Color('#9f5234');

  constructor(
    container: HTMLElement,
    initialState: WorldVisualState,
    callbacks: MarsColonyEngineCallbacks,
  ) {
    this.container = container;
    this.visualState = initialState;
    this.callbacks = callbacks;
    this.isSoftwareGl = detectSoftwareWebGL();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = this.spaceBgColor.clone();
    this.scene.fog = new THREE.FogExp2('#cc794d', 0);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    this.camera = new THREE.PerspectiveCamera(46, width / height, 0.3, 650);
    this.camera.position.set(0, 184, 34);
    _currentLook.set(0, 180, 0);
    this.camera.lookAt(_currentLook);

    this.hemiLight = new THREE.HemisphereLight('#f2b694', '#4d2316', 0.92);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight('#ffe4cc', 2.05);
    this.sunLight.position.set(28, 36, 22);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 4;
    this.sunLight.shadow.camera.far = 115;
    this.sunLight.shadow.camera.left = -36;
    this.sunLight.shadow.camera.right = 36;
    this.sunLight.shadow.camera.top = 36;
    this.sunLight.shadow.camera.bottom = -36;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    const rimLight = new THREE.DirectionalLight('#7dd3fc', 0.42);
    rimLight.position.set(-24, 16, -24);
    this.scene.add(rimLight);

    this.alertLight = new THREE.PointLight('#ef4444', 0, 22, 1.4);
    this.alertLight.position.set(3, 4, 3);
    this.scene.add(this.alertLight);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);

    this.marsEnv = createMarsEnvironment(this.textures);
    this.scene.add(this.marsEnv.group);

    this.celestialMoons = createCelestialMoonsAndDustDevils();
    this.scene.add(this.celestialMoons.group);

    this.baseWorld = createBaseWorld(this.textures, this.isSoftwareGl);
    this.scene.add(this.baseWorld.group);

    this.colonyExpansion = createColonyExpansion(this.textures, this.isSoftwareGl);
    this.scene.add(this.colonyExpansion.group);

    this.spaceAndLander = createSpaceAndLander([15.5, 13.5]);
    this.scene.add(this.spaceAndLander.spaceGroup);
    this.scene.add(this.spaceAndLander.landerGroup);
    this.scene.add(this.spaceAndLander.landingDust);
    this.scene.add(this.spaceAndLander.cargoLanderGroup);
    this.scene.add(this.spaceAndLander.cargoDust);

    this.characters = createCharacters(this.textures);
    this.scene.add(this.characters.group);

    _raycaster.layers.set(1);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.tick();
  }

  public setVisualState(next: WorldVisualState): void {
    const prevMode = this.visualState.cameraMode;
    this.visualState = next;

    if (next.scanPulseCounter !== this.lastScanPulseCounter) {
      this.lastScanPulseCounter = next.scanPulseCounter;
      const p = this.characters.playerPosition;
      this.colonyExpansion.triggerScanPulse(p.x, p.z);
    }

    if (next.actionAnimCounter !== this.lastActionAnimCounter) {
      this.lastActionAnimCounter = next.actionAnimCounter;
      if (next.actionAnim && next.actionAnim !== 'none') {
        this.characters.triggerActionAnim(next.actionAnim, 0.95);
      }
    }

    if (!next.drivingRover || next.vehicleCamMode !== 'interior') {
      this.cockpitLookYaw = 0;
      this.cockpitLookPitch = 0;
    }

    const wasSpace = prevMode === 'space_orbit' || prevMode === 'space_approach';
    const isSpace = next.cameraMode === 'space_orbit' || next.cameraMode === 'space_approach';
    if (wasSpace && !isSpace) {
      if (next.introPhase === 'site_inspection') {
        this.camera.position.set(130.5, 5.6, 56.4);
        _currentLook.set(121.0, 1.4, 48.2);
      } else {
        this.camera.position.set(22, 18, 28);
        _currentLook.set(15.5, 12, 13.5);
      }
    } else if (!wasSpace && isSpace) {
      this.camera.position.set(0, 184, 34);
      _currentLook.set(0, 180, 0);
    }
  }

  public triggerActionAnim(anim: AstronautActionAnim, duration = 0.95): void {
    this.characters.triggerActionAnim(anim, duration);
  }

  public setCameraSpeed(speed: number): void {
    this.cameraSpeedMultiplier = speed;
  }

  public setTouchMove(right: number, forward: number): void {
    this.touchMove.right = right;
    this.touchMove.forward = forward;
  }

  public setTouchSprint(active: boolean): void {
    this.touchSprint = active;
  }

  public triggerJump(): void {
    if (this.visualState.screen === 'playing') {
      this.jumpQueued = true;
    }
  }

  public resetPlayer(): void {
    this.characters.resetPositions();
    this.colonyExpansion.resetRoverAndDrone();
    this.orbitYaw = 0.25;
    this.lastInsideBuilding = null;
    this.callbacks.onInsideBuildingChange(null);
  }

  public setPlayerLocation(x: number, z: number, rotY = 0): void {
    this.characters.setPlayerLocation(x, z, rotY);
  }

  public setRoverSnapshot(x: number, z: number, yaw: number, batteryPct: number): void {
    this.colonyExpansion.setRoverSnapshot(x, z, yaw, batteryPct);
  }

  public setRoverAutopilotTarget(target: { x: number; z: number; yaw: number } | null): void {
    this.colonyExpansion.setRoverAutopilotTarget(target);
  }

  public startScriptedWalk(
    who: 'alex' | 'nova',
    from: [number, number],
    to: [number, number],
    durationSec: number,
    endYaw?: number,
    onDone?: () => void,
  ): void {
    const dx = to[0] - from[0];
    const dz = to[1] - from[1];
    const yaw = Math.hypot(dx, dz) > 0.05 ? Math.atan2(dx, dz) : (endYaw ?? 0);
    this.scriptedWalks[who] = {
      from: [from[0], from[1]],
      to: [to[0], to[1]],
      elapsed: 0,
      duration: Math.max(0.25, durationSec),
      yaw,
      endYaw,
      done: false,
      onDone,
    };
  }

  public cancelScriptedWalks(): void {
    this.scriptedWalks = {};
  }

  public addRoverBattery(amount: number): void {
    this.colonyExpansion.addRoverBattery(amount);
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    dom.addEventListener('wheel', this.handleWheel, { passive: true });
    dom.addEventListener('webglcontextlost', this.handleContextLost);
    dom.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  private handleResize = (): void => {
    if (this.disposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keys[e.code] = true;
    if (e.code === 'Space' && this.visualState.screen === 'playing') {
      this.jumpQueued = true;
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.code] = false;
  };

  private handleBlur = (): void => {
    this.keys = {};
    this.isDragging = false;
    this.touchMove = { right: 0, forward: 0 };
  };

  private handlePointerDown = (e: PointerEvent): void => {
    this.isDragging = true;
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.dragLast = { x: e.clientX, y: e.clientY };
  };

  private handlePointerMove = (e: PointerEvent): void => {
    const camMode = this.visualState.cameraMode;
    if (!this.isDragging || (camMode !== 'third_person' && camMode !== 'drone_aerial')) return;
    const dx = e.clientX - this.dragLast.x;
    const dy = e.clientY - this.dragLast.y;
    this.dragLast = { x: e.clientX, y: e.clientY };

    if (this.visualState.drivingRover && this.visualState.vehicleCamMode === 'interior') {
      this.cockpitLookYaw = THREE.MathUtils.clamp(
        this.cockpitLookYaw - dx * 0.004 * this.cameraSpeedMultiplier,
        -0.85,
        0.85,
      );
      this.cockpitLookPitch = THREE.MathUtils.clamp(
        this.cockpitLookPitch + dy * 0.003 * this.cameraSpeedMultiplier,
        -0.35,
        0.35,
      );
      return;
    }

    this.orbitYaw -= dx * 0.0055 * this.cameraSpeedMultiplier;
    this.orbitPitch = THREE.MathUtils.clamp(
      this.orbitPitch + dy * 0.004 * this.cameraSpeedMultiplier,
      0.16,
      1.05,
    );
  };

  private handlePointerUp = (e: PointerEvent): void => {
    const wasDragging = this.isDragging;
    this.isDragging = false;
    if (!wasDragging || this.visualState.screen !== 'playing') return;

    const moved = Math.hypot(e.clientX - this.dragStart.x, e.clientY - this.dragStart.y);
    if (moved > 8) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    _raycaster.setFromCamera(_pointer, this.camera);

    const hits = _raycaster.intersectObjects(this.baseWorld.nodeProxies, false);
    const activeHit = hits.find((h) =>
      this.visualState.activeNodeIds.includes(h.object.userData.nodeId as InteractiveNodeId),
    );
    if (activeHit) {
      const nid = activeHit.object.userData.nodeId as InteractiveNodeId;
      const spec = INTERACTIVE_NODES[nid];
      const dist = Math.hypot(
        this.characters.playerPosition.x - spec.position[0],
        this.characters.playerPosition.z - spec.position[2],
      );
      if (dist <= 6.2) {
        this.callbacks.onInteractNode(nid);
        return;
      }
    }

    const vehHits = _raycaster.intersectObject(this.colonyExpansion.vehicleProxy, false);
    if (vehHits.length > 0 && this.callbacks.onInteractVehicle) {
      const distToEv = Math.hypot(
        this.characters.playerPosition.x - this.colonyExpansion.roverPos.x,
        this.characters.playerPosition.z - this.colonyExpansion.roverPos.z,
      );
      if (this.visualState.drivingRover || distToEv <= 6.8) {
        this.callbacks.onInteractVehicle();
      }
    }
  };

  private handleWheel = (e: WheelEvent): void => {
    if (this.visualState.cameraMode !== 'third_person') return;
    if (this.visualState.drivingRover) {
      this.roverOrbitDist = THREE.MathUtils.clamp(this.roverOrbitDist + e.deltaY * 0.01, 13.5, 22.5);
    } else {
      this.orbitDist = THREE.MathUtils.clamp(this.orbitDist + e.deltaY * 0.008, 5.5, 18.0);
    }
  };

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.callbacks.onWebGLContextLost(true);
  };

  private handleContextRestored = (): void => {
    this.callbacks.onWebGLContextLost(false);
  };

  private afterDraw(cb: () => void): void {
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

  private tick = (): void => {
    if (this.disposed) return;
    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    const elapsed = this.clock.getElapsedTime();

    const s = this.visualState;
    const isSpaceScene = s.cameraMode === 'space_orbit' || s.cameraMode === 'space_approach';

    this.spaceAndLander.spaceGroup.visible = isSpaceScene;
    this.marsEnv.group.visible = !isSpaceScene;
    this.celestialMoons.group.visible = !isSpaceScene;
    this.baseWorld.group.visible = !isSpaceScene;
    this.colonyExpansion.group.visible = !isSpaceScene;
    this.characters.group.visible = !isSpaceScene;
    this.spaceAndLander.cargoLanderGroup.visible =
      !isSpaceScene && this.spaceAndLander.cargoLanderGroup.visible;
    this.spaceAndLander.cargoDust.visible = !isSpaceScene;

    // 1. Martian Sol Cycle & Sun Vector
    const sol = computeSolVisualSample(s.solProgress);
    const cosEl = Math.cos(sol.sunElevationRad);
    _sunDir
      .set(
        Math.cos(sol.sunAzimuthRad) * cosEl,
        Math.sin(sol.sunElevationRad),
        Math.sin(sol.sunAzimuthRad) * cosEl,
      )
      .normalize();

    const wSpec = WEATHER_SPECS[s.weather];
    const stormStage = s.stormStage ?? weatherToStormStage(s.weather, s.dustStormActive);
    const stageSpec = STORM_STAGE_SPECS[stormStage];

    const fog = this.scene.fog as THREE.FogExp2;
    if (isSpaceScene) {
      (this.scene.background as THREE.Color).copy(this.spaceBgColor);
      fog.density = 0;
    } else {
      _tmpSkyCol
        .copy(this.marsDayBgColor)
        .lerp(this.marsSunsetBgColor, sol.sunsetFactor * 0.5)
        .lerp(this.marsNightBgColor, sol.nightFactor);
      if (stageSpec.skyWarmthTint > 0.02) {
        _tmpSkyCol.lerp(this.stormBgColor, stageSpec.skyWarmthTint * 0.65);
      }
      (this.scene.background as THREE.Color).copy(_tmpSkyCol);
      fog.color.copy(_tmpSkyCol);
      fog.density = THREE.MathUtils.damp(fog.density, stageSpec.fogDensity, 1.8, dt);
    }

    // 2. Player, Rover & Drone Updates
    const allowControl =
      s.screen === 'playing' &&
      !s.alexPosOverride &&
      (s.cameraMode === 'third_person' || s.cameraMode === 'drone_aerial');
    const keyForward =
      (this.keys['KeyW'] || this.keys['ArrowUp'] ? 1 : 0) -
      (this.keys['KeyS'] || this.keys['ArrowDown'] ? 1 : 0);
    const keyRight =
      (this.keys['KeyD'] || this.keys['ArrowRight'] ? 1 : 0) -
      (this.keys['KeyA'] || this.keys['ArrowLeft'] ? 1 : 0);
    const forward = THREE.MathUtils.clamp(keyForward + this.touchMove.forward, -1, 1);
    const right = THREE.MathUtils.clamp(keyRight + this.touchMove.right, -1, 1);
    const sprint = Boolean(this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.touchSprint);
    const jump = this.jumpQueued;
    this.jumpQueued = false;

    // Step any active smooth frame-locked cutscene walks
    let runtimeState = s;
    const stepCutsceneWalk = (who: 'alex' | 'nova') => {
      const tr = this.scriptedWalks[who];
      if (!tr) return null;
      if (!tr.done) {
        tr.elapsed = Math.min(tr.duration, tr.elapsed + dt);
        const u = tr.elapsed / tr.duration;
        // Quintic S-curve ease-in/out for natural acceleration & deceleration
        const ease = u * u * u * (u * (u * 6 - 15) + 10);
        const x = tr.from[0] + (tr.to[0] - tr.from[0]) * ease;
        const z = tr.from[1] + (tr.to[1] - tr.from[1]) * ease;
        const speedScalar =
          tr.duration > 0.01
            ? (Math.hypot(tr.to[0] - tr.from[0], tr.to[1] - tr.from[1]) / tr.duration) *
              (30 * u * u * (1 - u) * (1 - u))
            : 0;
        const finishedNow = u >= 1;
        if (finishedNow) {
          tr.done = true;
          const cb = tr.onDone;
          tr.onDone = undefined;
          if (cb) queueMicrotask(cb);
        }
        return {
          pos: [x, z] as [number, number],
          yaw: finishedNow && tr.endYaw !== undefined ? tr.endYaw : tr.yaw,
          speed: finishedNow ? 0 : speedScalar,
        };
      }
      return {
        pos: tr.to,
        yaw: tr.endYaw ?? tr.yaw,
        speed: 0,
      };
    };

    const alexWalkFrame = s.alexPosOverride ? stepCutsceneWalk('alex') : null;
    const novaWalkFrame = s.novaPosOverride ? stepCutsceneWalk('nova') : null;
    if (!s.alexPosOverride && this.scriptedWalks.alex) delete this.scriptedWalks.alex;
    if (!s.novaPosOverride && this.scriptedWalks.nova) delete this.scriptedWalks.nova;

    if (alexWalkFrame || novaWalkFrame) {
      runtimeState = {
        ...s,
        ...(alexWalkFrame
          ? {
              alexPosOverride: alexWalkFrame.pos,
              alexYawOverride: alexWalkFrame.yaw,
              alexWalkSpeed: alexWalkFrame.speed,
            }
          : {}),
        ...(novaWalkFrame
          ? {
              novaPosOverride: novaWalkFrame.pos,
              novaYawOverride: novaWalkFrame.yaw,
              novaWalkSpeed: novaWalkFrame.speed,
            }
          : {}),
      };
    }

    this.colonyExpansion.update(
      elapsed,
      dt,
      runtimeState,
      sol.nightFactor,
      this.characters.playerPosition,
      this.characters.playerRotationY,
      allowControl && s.drivingRover ? { forward, right } : { forward: 0, right: 0 },
    );

    this.characters.update(
      elapsed,
      dt,
      allowControl && !s.drivingRover
        ? { forward, right, sprint, jump }
        : { forward: 0, right: 0, sprint: false, jump: false },
      this.orbitYaw,
      runtimeState,
      this.colonyExpansion.roverPos,
      (isSprint, isIndoor) => {
        if (allowControl && !s.drivingRover) soundEngine.playFootstep(isSprint, isIndoor);
      },
      this.colonyExpansion.roverYaw,
    );

    const insideId = s.screen === 'playing' && !s.drivingRover ? this.characters.insideBuildingId : null;
    if (insideId !== this.lastInsideBuilding) {
      this.lastInsideBuilding = insideId;
      soundEngine.setIndoors(Boolean(insideId));
      this.callbacks.onInsideBuildingChange(insideId);
    }

    const enrichedState: WorldVisualState = {
      ...s,
      insideBuildingId: insideId ?? s.insideBuildingId,
    };

    // 3. World Environment, Moons & Base Systems
    this.spaceAndLander.update(elapsed, dt, enrichedState);
    this.marsEnv.update(elapsed, dt, sol, s.weather, _sunDir, s.dustStormActive, stormStage);
    this.celestialMoons.update(elapsed, dt, s.solProgress, s.weather);
    this.baseWorld.update(
      elapsed,
      dt,
      enrichedState,
      this.characters.playerPosition,
      this.characters.npcPositions,
      (_id, isOpen) => {
        if (s.screen === 'playing') {
          soundEngine.playDoorAirlock(isOpen);
          if (isOpen) {
            this.characters.triggerActionAnim('open_door', 0.65);
          }
        }
      },
    );

    soundEngine.setWindIntensity(THREE.MathUtils.clamp(stageSpec.windMs / 32, 0, 1));

    // 4. Proximity detection to active mission nodes
    if (s.screen === 'playing') {
      const px = this.characters.playerPosition.x;
      const pz = this.characters.playerPosition.z;
      let nearest: InteractiveNodeId | null = null;
      let bestDist = 3.4;

      for (let i = 0; i < s.activeNodeIds.length; i++) {
        const nid = s.activeNodeIds[i];
        const spec = INTERACTIVE_NODES[nid];
        const d = Math.hypot(px - spec.position[0], pz - spec.position[2]);
        if (d < bestDist) {
          bestDist = d;
          nearest = nid;
        }
      }

      if (nearest !== this.lastNearbyNode) {
        this.lastNearbyNode = nearest;
        this.callbacks.onNearbyNodeChange(nearest);
      }
    } else if (this.lastNearbyNode !== null) {
      this.lastNearbyNode = null;
      this.callbacks.onNearbyNodeChange(null);
    }

    // 5. Dynamic Sol Sun Light & Shadows Tracking Player
    const px = this.characters.playerPosition.x;
    const pz = this.characters.playerPosition.z;
    this.sunLight.position.set(px + _sunDir.x * 48, Math.max(8, _sunDir.y * 55), pz + _sunDir.z * 48);
    this.sunLight.target.position.set(px, 0, pz);
    this.sunLight.target.updateMatrixWorld();

    const weatherSunScale = Math.max(0.28, 1 - stageSpec.skyWarmthTint * 0.64) * (0.55 + wSpec.solarEfficiency * 0.45);
    const blackoutScale = s.powerBlackout ? 0.68 : 1.0;
    const targetSunIntensity = sol.sunIntensity * weatherSunScale * blackoutScale;
    this.sunLight.intensity = THREE.MathUtils.damp(this.sunLight.intensity, targetSunIntensity, 3, dt);
    this.hemiLight.intensity = THREE.MathUtils.damp(
      this.hemiLight.intensity,
      (0.24 + sol.daylightFactor * 0.72) * (1 - stageSpec.skyWarmthTint * 0.22),
      3,
      dt,
    );
    this.renderer.toneMappingExposure = THREE.MathUtils.damp(
      this.renderer.toneMappingExposure,
      1.08 - stageSpec.skyWarmthTint * 0.14,
      2,
      dt,
    );

    if (s.o2AlarmActive) {
      this.alertLight.position.set(2.3, 2.6, 0.6);
      this.alertLight.intensity = 2.4 + Math.sin(elapsed * 7) * 1.8;
    } else {
      this.alertLight.intensity = 0;
    }

    // 6. Emit Throttled Telemetry (~4 Hz) for UI Map, Temp, Sol Clock & Signal Detector
    this.telemetryTimer += dt;
    if (this.telemetryTimer >= 0.25 && this.callbacks.onTelemetryUpdate) {
      this.telemetryTimer = 0;
      const rx = this.colonyExpansion.roverPos.x;
      const rz = this.colonyExpansion.roverPos.z;
      const roverDist = Math.hypot(px - rx, pz - rz);

      let nearestRover: { id: LostRoverId; distance: number; bearingDeg: number } | null = null;
      let minRoverDist = Infinity;
      for (let i = 0; i < LOST_ROVERS.length; i++) {
        const lr = LOST_ROVERS[i];
        const d = Math.hypot(lr.x - px, lr.z - pz);
        if (d < minRoverDist) {
          minRoverDist = d;
          const bearingDeg = Math.round(((Math.atan2(lr.x - px, -(lr.z - pz)) * 180) / Math.PI + 360) % 360);
          nearestRover = { id: lr.id, distance: Math.round(d), bearingDeg };
        }
      }

      let nearestLandmark: { id: string; name: string; distance: number } | null = null;
      let minLmDist = Infinity;
      for (let i = 0; i < MARS_LANDMARKS.length; i++) {
        const lm = MARS_LANDMARKS[i];
        const d = Math.hypot(lm.x - px, lm.z - pz);
        if (d < minLmDist) {
          minLmDist = d;
          nearestLandmark = { id: lm.id, name: lm.name, distance: Math.round(d) };
        }
      }

      let nearestAnomaly: { id: string; name: string; distance: number } | null = null;
      let minAnomDist = Infinity;
      for (let i = 0; i < MARS_ANOMALIES.length; i++) {
        const an = MARS_ANOMALIES[i];
        const d = Math.hypot(an.x - px, an.z - pz);
        if (d < minAnomDist) {
          minAnomDist = d;
          nearestAnomaly = { id: an.id, name: an.name, distance: Math.round(d) };
        }
      }

      let nearestPod: { id: (typeof EXPANSION_PODS)[0]['id']; name: string; distance: number } | null = null;
      let minPodDist = Infinity;
      for (let i = 0; i < EXPANSION_PODS.length; i++) {
        const pod = EXPANSION_PODS[i];
        const d = Math.hypot(pod.x - px, pod.z - pz);
        if (d < minPodDist) {
          minPodDist = d;
          nearestPod = { id: pod.id, name: pod.name, distance: Math.round(d) };
        }
      }

      // Central-difference terrain slope in degrees
      const hx = (groundHeightAt(px + 0.6, pz) - groundHeightAt(px - 0.6, pz)) / 1.2;
      const hz = (groundHeightAt(px, pz + 0.6) - groundHeightAt(px, pz - 0.6)) / 1.2;
      const slopeDeg = insideId
        ? 0
        : Math.round((Math.atan(Math.hypot(hx, hz)) * 180) / Math.PI);

      const insideTempC = s.powerBlackout ? 14 : 20;
      const suitTempC = insideId ? insideTempC : 21;

      const nearbyCrew = this.characters.getNearbyCrew();

      const batKwh = this.colonyExpansion.vehicleBatteryKwh;
      const whPerM = Math.max(85, this.colonyExpansion.vehicleConsumptionWhPerM);
      const reserveKwh = (MEV_BATTERY_CAPACITY_KWH * MEV_BATTERY_RESERVE_PCT) / 100;
      const usableKwh = Math.max(0, batKwh - reserveKwh);
      const vehicleEstimatedRangeM = Math.round((batKwh * 1000) / whPerM);
      const vehicleSafeRangeM = Math.round(((usableKwh * 1000) / whPerM) * 0.85);
      const vehicleDistToColonyM = Math.round(Math.hypot(rx, rz));
      const vehicleDistToChargerM = Math.round(
        Math.hypot(rx - CHARGING_CONSOLE_POS[0], rz - CHARGING_CONSOLE_POS[1]),
      );

      this.callbacks.onTelemetryUpdate({
        solNumber: 1,
        solProgress: s.solProgress,
        solTimeLabel: sol.timeLabel,
        solPhase: sol.phase,
        weather: s.weather,
        stormStage,
        stormStageLabel: stageSpec.label,
        outsideTempC: sol.outsideTempC,
        suitTempC,
        insideTempC,
        solarEfficiencyPct: Math.round(stageSpec.solarEfficiency * sol.daylightFactor * 100),
        roverCamVisibilityPct: stageSpec.roverCamVisibilityPct,
        windSpeedMs: stageSpec.windMs,
        phobosVisible: this.celestialMoons.phobosElevationDeg > 0,
        phobosElevationDeg: this.celestialMoons.phobosElevationDeg,
        deimosVisible: this.celestialMoons.deimosElevationDeg > 0,
        deimosElevationDeg: this.celestialMoons.deimosElevationDeg,
        surfaceType: insideId ? 'colony' : surfaceTypeAt(px, pz),
        altitudeM: Math.round(groundHeightAt(px, pz) * 10) / 10,
        slopeDeg,
        playerX: px,
        playerZ: pz,
        playerYaw: this.characters.playerRotationY,
        roverX: rx,
        roverZ: rz,
        roverYaw: this.colonyExpansion.roverYaw,
        vehicleSpeedKmh: this.colonyExpansion.vehicleSpeedKmh,
        vehicleBatteryPct: this.colonyExpansion.vehicleBatteryPct,
        vehicleBatteryKwh: batKwh,
        vehicleCapacityKwh: MEV_BATTERY_CAPACITY_KWH,
        vehicleInstantKw: this.colonyExpansion.vehicleInstantKw,
        vehicleConsumptionWhPerM: whPerM,
        vehicleEstimatedRangeM,
        vehicleSafeRangeM,
        vehicleDistToColonyM,
        vehicleDistToChargerM,
        vehicleChargingActive: this.colonyExpansion.vehicleChargingActive,
        vehicleInChargingBay: this.colonyExpansion.vehicleInChargingBay,
        vehicleChargingBayId: this.colonyExpansion.vehicleChargingBayId,
        vehicleChargeRatePctPerSec: this.colonyExpansion.vehicleChargeRatePctPerSec,
        vehicleTimeToFullSec: this.colonyExpansion.vehicleTimeToFullSec,
        vehicleTractionPct: this.colonyExpansion.vehicleTractionPct,
        vehicleStormSpeedLimited: this.colonyExpansion.vehicleStormSpeedLimited,
        nearChargingConsole: this.colonyExpansion.nearChargingConsole,
        nearRoverToBoard: !s.drivingRover && roverDist < 4.4,
        nearSupplyTerminal: this.colonyExpansion.nearSupplyTerminal,
        nearbyCrewId: nearbyCrew?.id ?? null,
        nearbyCrewDistance: nearbyCrew ? Math.round(nearbyCrew.distance * 10) / 10 : 999,
        npcStatuses: this.characters.npcStatuses,
        cargoPadPos: CARGO_LANDING_PAD_POS,
        nearestLostRover: nearestRover,
        nearestLandmark,
        nearestAnomaly,
        nearestPod,
      });
    }

    // 7. Camera Director
    let camDamp = 5.5;
    if (s.cameraMode === 'space_orbit') {
      const a = elapsed * 0.14;
      _desiredCamPos.set(Math.sin(a) * 35, 185 + Math.sin(elapsed * 0.3) * 2, Math.cos(a) * 35);
      _desiredLook.set(0, 180, 0);
      camDamp = 3.5;
    } else if (s.cameraMode === 'space_approach') {
      _desiredCamPos.set(8, 182.5, 22);
      _desiredLook.set(0, 180, 0);
      camDamp = 1.6;
    } else if (s.cameraMode === 'lander_descent') {
      const lp = this.spaceAndLander.landerWorldPos;
      _desiredLook.set(lp.x, Math.max(2, lp.y + 1.8), lp.z);
      _desiredCamPos.set(lp.x + 12, Math.max(4.5, lp.y + 5.5), lp.z + 15);
      camDamp = 3.0;
    } else if (s.cameraMode === 'lander_depart') {
      const lp = this.spaceAndLander.landerWorldPos;
      _desiredLook.set(lp.x, lp.y + 2.2, lp.z);
      _desiredCamPos.set(7.5, 5.5, 19);
      camDamp = 3.2;
    } else if (s.cameraMode === 'cutscene_focus' && s.cutsceneTarget) {
      const [tx, ty, tz] = s.cutsceneTarget;
      const [ox, oy, oz] = s.cutsceneEyeOffset ?? [5.8, 3.6, 7.8];
      const cx = tx + ox;
      const cz = tz + oz;
      const safeGroundY = groundHeightAt(cx, cz) + 1.45;
      _desiredLook.set(tx, ty, tz);
      _desiredCamPos.set(cx, Math.max(safeGroundY, ty + oy), cz);
      camDamp = 2.6;
    } else if (s.cameraMode === 'drone_aerial' && s.droneActive) {
      const dp = this.colonyExpansion.dronePos;
      _desiredLook.set(px, this.characters.playerPosition.y + 1.0, pz);
      _desiredCamPos.set(
        dp.x + Math.sin(this.orbitYaw) * 14,
        dp.y + 13,
        dp.z + Math.cos(this.orbitYaw) * 14,
      );
      camDamp = 4.5;
    } else if (s.drivingRover && s.vehicleCamMode === 'interior') {
      this.colonyExpansion.getRoverInteriorCamPose(
        _desiredCamPos,
        _desiredLook,
        this.cockpitLookYaw,
        this.cockpitLookPitch,
      );
      camDamp = 22;
    } else if (s.drivingRover) {
      const ry = this.colonyExpansion.roverYaw;
      const chaseYaw = ry + Math.PI;
      const rPos = this.colonyExpansion.roverPos;
      const chaseDist = this.roverOrbitDist;
      const camX = rPos.x + Math.sin(chaseYaw) * chaseDist;
      const camZ = rPos.z + Math.cos(chaseYaw) * chaseDist;
      const minFloorY = Math.max(
        groundHeightAt(camX, camZ) + 2.6,
        groundHeightAt(rPos.x, rPos.z) + 3.2,
      );
      // Aim smoothly ahead of the 6x6 Exploration Vehicle so path, turns & full vehicle stay well-framed
      _desiredLook.set(
        rPos.x + Math.sin(ry) * 4.2,
        rPos.y + 1.85,
        rPos.z + Math.cos(ry) * 4.2,
      );
      _desiredCamPos.set(camX, Math.max(minFloorY, rPos.y + 7.2), camZ);
      camDamp = 4.6;
    } else {
      this.interiorZoomFactor = THREE.MathUtils.damp(
        this.interiorZoomFactor,
        insideId ? 1 : 0,
        4.5,
        dt,
      );
      const effDist = THREE.MathUtils.lerp(this.orbitDist, 6.2, this.interiorZoomFactor);
      const effPitch = THREE.MathUtils.lerp(
        this.orbitPitch,
        Math.max(this.orbitPitch, 0.62),
        this.interiorZoomFactor,
      );

      const ay = this.characters.playerPosition.y;
      const horiz = Math.cos(effPitch) * effDist;
      const vert = Math.sin(effPitch) * effDist;

      _desiredLook.set(px, ay + 1.35, pz);
      _desiredCamPos.set(
        px + Math.sin(this.orbitYaw) * horiz,
        Math.max(groundHeightAt(px, pz) + 1.4, ay + 1.35 + vert),
        pz + Math.cos(this.orbitYaw) * horiz,
      );
      camDamp = 7.5;
    }

    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _desiredCamPos.x, camDamp, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _desiredCamPos.y, camDamp, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _desiredCamPos.z, camDamp, dt);
    _currentLook.x = THREE.MathUtils.damp(_currentLook.x, _desiredLook.x, camDamp + 1.5, dt);
    _currentLook.y = THREE.MathUtils.damp(_currentLook.y, _desiredLook.y, camDamp + 1.5, dt);
    _currentLook.z = THREE.MathUtils.damp(_currentLook.z, _desiredLook.z, camDamp + 1.5, dt);
    this.camera.lookAt(_currentLook);

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.handlePointerDown);
    dom.removeEventListener('wheel', this.handleWheel);
    dom.removeEventListener('webglcontextlost', this.handleContextLost);
    dom.removeEventListener('webglcontextrestored', this.handleContextRestored);

    this.characters.dispose();
    this.colonyExpansion.dispose();
    this.baseWorld.dispose();
    this.celestialMoons.dispose();
    this.spaceAndLander.dispose();
    this.marsEnv.dispose();
    this.textures.dispose();
    this.renderer.dispose();

    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
