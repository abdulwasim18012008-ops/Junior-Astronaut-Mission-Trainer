import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { generateMarsTextures, generateMoonTextures } from './planetTextures';
import type { WorldId } from './saveReader';

interface PlanetSceneProps {
  hoveredWorld: WorldId | null;
  launchingWorld: WorldId | null;
  onHoverWorld: (world: WorldId | null) => void;
  onSelectWorld: (world: WorldId) => void;
}

const _raycaster = new THREE.Raycaster();
const _pointer = new THREE.Vector2();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3();

function createStarSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.78)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Seamless soft outer atmospheric halo (BackSide fades smoothly to 0 at outer edge)
function createAtmosphereMaterial(colorHex: number, power: number, intensity: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(colorHex) },
      uPower: { value: power },
      uIntensity: { value: intensity },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPos.xyz);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float uPower;
      uniform float uIntensity;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float backDot = max(dot(-vNormal, vViewDir), 0.0);
        float halo = pow(clamp(backDot * 1.15, 0.0, 1.0), uPower) * uIntensity;
        gl_FragColor = vec4(glowColor, halo);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
  });
}

function createOrbitRing(radius: number, color: number, opacity: number): THREE.LineLoop {
  const segments = 96;
  const positions = new Float32Array(segments * 3);
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = Math.sin(angle) * radius;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  return new THREE.LineLoop(geo, mat);
}

export function PlanetScene({
  hoveredWorld,
  launchingWorld,
  onHoverWorld,
  onSelectWorld,
}: PlanetSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const hoveredRef = useRef<WorldId | null>(hoveredWorld);
  const launchingRef = useRef<WorldId | null>(launchingWorld);
  const onHoverRef = useRef(onHoverWorld);
  const onSelectRef = useRef(onSelectWorld);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    hoveredRef.current = hoveredWorld;
  }, [hoveredWorld]);

  useEffect(() => {
    launchingRef.current = launchingWorld;
  }, [launchingWorld]);

  useEffect(() => {
    onHoverRef.current = onHoverWorld;
    onSelectRef.current = onSelectWorld;
  }, [onHoverWorld, onSelectWorld]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    renderer.setClearColor(0x05070e, 1);

    const canvas = renderer.domElement;
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070e);
    scene.fog = new THREE.FogExp2(0x05070e, 0.01);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.22;
    pmremGenerator.dispose();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 150);

    // Three-point solar & space lighting
    const sunLight = new THREE.DirectionalLight(0xfff2de, 2.55);
    sunLight.position.set(6, 3.5, 5.5);
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x4b6399, 0x090b12, 0.42);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x7ca2ff, 0.55);
    rimLight.position.set(-5, -2.5, -5);
    scene.add(rimLight);

    // Deep space starfield
    const starCount = 1400;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starPalette = [
      new THREE.Color(0xe8f0ff),
      new THREE.Color(0xfff5e4),
      new THREE.Color(0xc2d8ff),
      new THREE.Color(0xffdcb8),
    ];
    for (let i = 0; i < starCount; i++) {
      const r = 24 + Math.random() * 64;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const c = starPalette[i % starPalette.length];
      const brightness = 0.55 + Math.random() * 0.45;
      starColors[i * 3] = c.r * brightness;
      starColors[i * 3 + 1] = c.g * brightness;
      starColors[i * 3 + 2] = c.b * brightness;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starSprite = createStarSpriteTexture();
    const starMat = new THREE.PointsMaterial({
      size: 0.28,
      map: starSprite,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const marsTextures = generateMarsTextures(maxAnisotropy);
    const moonTextures = generateMoonTextures(maxAnisotropy);

    // Compact, elegant planetary spheres floating cleanly above their selection cards
    const planetRadius = 0.58;
    const planetGeo = new THREE.SphereGeometry(planetRadius, 64, 48);

    // --- MARS COMPOSITE GROUP ---
    const marsGroup = new THREE.Group();
    const marsTilt = new THREE.Group();
    marsTilt.rotation.z = THREE.MathUtils.degToRad(25.19);
    marsTilt.rotation.x = THREE.MathUtils.degToRad(8);

    const marsMat = new THREE.MeshStandardMaterial({
      map: marsTextures.colorMap,
      bumpMap: marsTextures.bumpMap,
      bumpScale: 0.042,
      roughnessMap: marsTextures.roughnessMap,
      roughness: 0.9,
      metalness: 0.04,
    });
    const marsMesh = new THREE.Mesh(planetGeo, marsMat);
    marsMesh.layers.enable(1);
    marsMesh.userData.world = 'mars';
    marsTilt.add(marsMesh);

    const marsAtmoGeo = new THREE.SphereGeometry(planetRadius * 1.14, 48, 36);
    const marsAtmoMat = createAtmosphereMaterial(0xe87b48, 4.2, 0.55);
    const marsAtmo = new THREE.Mesh(marsAtmoGeo, marsAtmoMat);
    marsTilt.add(marsAtmo);

    const marsOrbit = createOrbitRing(planetRadius * 1.38, 0xe07448, 0.16);
    marsOrbit.rotation.x = THREE.MathUtils.degToRad(14);
    marsTilt.add(marsOrbit);

    const phobosGeo = new THREE.IcosahedronGeometry(0.034, 1);
    const phobosMat = new THREE.MeshStandardMaterial({
      color: 0x8d7970,
      roughness: 0.95,
      metalness: 0.05,
    });
    const phobos = new THREE.Mesh(phobosGeo, phobosMat);
    marsOrbit.add(phobos);

    marsGroup.add(marsTilt);
    scene.add(marsGroup);

    // --- MOON COMPOSITE GROUP ---
    const moonGroup = new THREE.Group();
    const moonTilt = new THREE.Group();
    moonTilt.rotation.z = THREE.MathUtils.degToRad(-6.68);
    moonTilt.rotation.x = THREE.MathUtils.degToRad(10);

    const moonMat = new THREE.MeshStandardMaterial({
      map: moonTextures.colorMap,
      bumpMap: moonTextures.bumpMap,
      bumpScale: 0.062,
      roughnessMap: moonTextures.roughnessMap,
      roughness: 0.95,
      metalness: 0.02,
    });
    const moonMesh = new THREE.Mesh(planetGeo, moonMat);
    moonMesh.layers.enable(1);
    moonMesh.userData.world = 'moon';
    moonTilt.add(moonMesh);

    const moonRimGeo = new THREE.SphereGeometry(planetRadius * 1.12, 48, 36);
    const moonRimMat = createAtmosphereMaterial(0x9ab8e8, 4.8, 0.34);
    const moonRim = new THREE.Mesh(moonRimGeo, moonRimMat);
    moonTilt.add(moonRim);

    const moonOrbit = createOrbitRing(planetRadius * 1.38, 0x94a3b8, 0.14);
    moonOrbit.rotation.x = THREE.MathUtils.degToRad(-12);
    moonTilt.add(moonOrbit);

    const probeGroup = new THREE.Group();
    const probeBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.028, 0.024, 0.028),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.85 }),
    );
    const probePanels = new THREE.Mesh(
      new THREE.BoxGeometry(0.095, 0.006, 0.022),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.25, metalness: 0.6 }),
    );
    probeGroup.add(probeBody, probePanels);
    moonOrbit.add(probeGroup);

    moonGroup.add(moonTilt);
    scene.add(moonGroup);

    const updateWorldLayout = (w: number, h: number) => {
      const aspect = w / Math.max(1, h);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();

      if (aspect < 0.95) {
        marsGroup.position.set(-0.88, 0.34, 0);
        moonGroup.position.set(0.88, 0.34, 0);
        camera.position.set(0, 0.1, 7.2);
      } else {
        // Center each planet cleanly above its corresponding left/right card
        const spread = THREE.MathUtils.clamp(aspect * 0.92, 1.3, 1.48);
        marsGroup.position.set(-spread, 0.28, 0);
        moonGroup.position.set(spread, 0.28, 0);
        camera.position.set(0, 0.08, 6.2);
      }
    };
    updateWorldLayout(width, height);
    _currentLookAt.set(0, 0.06, 0);
    camera.lookAt(_currentLookAt);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let raycastHovered: WorldId | null = null;
    let lastRaycastTime = 0;

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastRaycastTime < 40) return;
      lastRaycastTime = now;

      const rect = canvas.getBoundingClientRect();
      _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.layers.set(1);
      _raycaster.setFromCamera(_pointer, camera);
      const hits = _raycaster.intersectObjects([marsMesh, moonMesh], false);
      const hitWorld = (hits[0]?.object?.userData?.world as WorldId | undefined) ?? null;

      if (hitWorld !== raycastHovered) {
        raycastHovered = hitWorld;
        canvas.style.cursor = hitWorld ? 'pointer' : 'default';
        onHoverRef.current(hitWorld);
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (launchingRef.current) return;
      const rect = canvas.getBoundingClientRect();
      _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      _raycaster.layers.set(1);
      _raycaster.setFromCamera(_pointer, camera);
      const hits = _raycaster.intersectObjects([marsMesh, moonMesh], false);
      const hitWorld = hits[0]?.object?.userData?.world as WorldId | undefined;
      if (hitWorld) {
        onSelectRef.current(hitWorld);
      }
    };

    const handleResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h);
      updateWorldLayout(w, h);
    };

    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('webglcontextlost', handleContextLost);
    window.addEventListener('resize', handleResize);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = new THREE.Timer();
    let frameId = 0;
    let disposed = false;
    let marsScale = 1;
    let moonScale = 1;
    let orbitAngle = 0.6;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      timer.update();
      const delta = Math.min(timer.getDelta(), 0.1);
      const activeHover = hoveredRef.current;
      const activeLaunch = launchingRef.current;

      const motionScale = prefersReducedMotion ? 0.15 : 1.0;

      const marsSpeed = activeHover === 'mars' ? 0.19 : 0.09;
      const moonSpeed = activeHover === 'moon' ? 0.17 : 0.08;
      marsMesh.rotation.y += delta * marsSpeed * motionScale;
      moonMesh.rotation.y += delta * moonSpeed * motionScale;

      orbitAngle += delta * 0.42 * motionScale;
      const orbitR = planetRadius * 1.38;
      phobos.position.set(Math.cos(orbitAngle) * orbitR, 0, Math.sin(orbitAngle) * orbitR);
      phobos.rotation.y = -orbitAngle;

      const probeAngle = -orbitAngle * 1.2 + 1.8;
      probeGroup.position.set(Math.cos(probeAngle) * orbitR, 0, Math.sin(probeAngle) * orbitR);
      probeGroup.rotation.y = probeAngle;

      stars.rotation.y += delta * 0.005 * motionScale;

      const targetMarsScale =
        activeLaunch === 'mars' ? 1.24 : activeHover === 'mars' ? 1.09 : activeHover === 'moon' ? 0.95 : 1.0;
      const targetMoonScale =
        activeLaunch === 'moon' ? 1.24 : activeHover === 'moon' ? 1.09 : activeHover === 'mars' ? 0.95 : 1.0;

      marsScale = THREE.MathUtils.damp(marsScale, targetMarsScale, 7, delta);
      moonScale = THREE.MathUtils.damp(moonScale, targetMoonScale, 7, delta);
      marsGroup.scale.setScalar(marsScale);
      moonGroup.scale.setScalar(moonScale);

      const targetMarsAtmo = activeHover === 'mars' || activeLaunch === 'mars' ? 1.25 : 0.85;
      const targetMoonRim = activeHover === 'moon' || activeLaunch === 'moon' ? 0.78 : 0.45;
      marsAtmoMat.uniforms.uIntensity.value = THREE.MathUtils.damp(
        marsAtmoMat.uniforms.uIntensity.value,
        targetMarsAtmo,
        6,
        delta,
      );
      moonRimMat.uniforms.uIntensity.value = THREE.MathUtils.damp(
        moonRimMat.uniforms.uIntensity.value,
        targetMoonRim,
        6,
        delta,
      );

      const baseZ = camera.aspect < 0.95 ? 7.2 : 6.1;
      if (activeLaunch) {
        const targetGroup = activeLaunch === 'mars' ? marsGroup : moonGroup;
        _targetCamPos.set(targetGroup.position.x * 0.9, targetGroup.position.y, 2.0);
        _targetLookAt.set(targetGroup.position.x, targetGroup.position.y, 0);
        camera.position.lerp(_targetCamPos, 1 - Math.exp(-5.5 * delta));
        _currentLookAt.lerp(_targetLookAt, 1 - Math.exp(-5.5 * delta));
      } else {
        const focusOffsetX = activeHover === 'mars' ? -0.18 : activeHover === 'moon' ? 0.18 : 0;
        const focusZ = activeHover ? baseZ - 0.18 : baseZ;
        _targetCamPos.set(focusOffsetX, 0.08, focusZ);
        _targetLookAt.set(focusOffsetX * 0.65, 0.06, 0);
        camera.position.lerp(_targetCamPos, 1 - Math.exp(-4.5 * delta));
        _currentLookAt.lerp(_targetLookAt, 1 - Math.exp(-4.5 * delta));
      }
      camera.lookAt(_currentLookAt);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      timer.dispose();
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      window.removeEventListener('resize', handleResize);

      marsTextures.dispose();
      moonTextures.dispose();
      starSprite.dispose();
      starGeo.dispose();
      starMat.dispose();
      planetGeo.dispose();
      marsMat.dispose();
      marsAtmoGeo.dispose();
      marsAtmoMat.dispose();
      marsOrbit.geometry.dispose();
      (marsOrbit.material as THREE.Material).dispose();
      phobosGeo.dispose();
      phobosMat.dispose();
      moonMat.dispose();
      moonRimGeo.dispose();
      moonRimMat.dispose();
      moonOrbit.geometry.dispose();
      (moonOrbit.material as THREE.Material).dispose();
      probeBody.geometry.dispose();
      (probeBody.material as THREE.Material).dispose();
      probePanels.geometry.dispose();
      (probePanels.material as THREE.Material).dispose();
      envTex.dispose();
      renderer.dispose();
      if (canvas.parentNode === container) {
        container.removeChild(canvas);
      }
    };
  }, []);

  if (webglFailed) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_45%,rgba(217,119,6,0.16),transparent_40%),radial-gradient(circle_at_70%_45%,rgba(148,163,184,0.16),transparent_40%),#05070e]"
      />
    );
  }

  return <div ref={mountRef} className="absolute inset-0 h-full w-full" />;
}
