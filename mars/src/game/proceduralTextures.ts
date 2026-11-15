import * as THREE from 'three';

export interface ProceduralTextureSet {
  marsAlbedo: THREE.CanvasTexture;
  marsBump: THREE.CanvasTexture;
  solarCell: THREE.CanvasTexture;
  landingPad: THREE.CanvasTexture;
  hazardStripe: THREE.CanvasTexture;
  hullPanel: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dustWisp: THREE.CanvasTexture;
  softDustMote: THREE.CanvasTexture;
  dustStreak: THREE.CanvasTexture;
  dustCloudSoft: THREE.CanvasTexture;
  dustSaltationBand: THREE.CanvasTexture;
  createSignTexture: (title: string, subtitle: string, accentHex: string) => THREE.CanvasTexture;
  dispose: () => void;
}

/** Creates a circular radial-feathered alpha sprite so PointsMaterial never renders square blocks. */
export function createSoftParticleTexture(
  kind: 'dust' | 'star' | 'spark' = 'dust',
): THREE.CanvasTexture {
  const size = kind === 'dust' ? 128 : 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half - 1);
  if (kind === 'star') {
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.28, 'rgba(226, 232, 240, 0.78)');
    grad.addColorStop(0.65, 'rgba(186, 230, 253, 0.2)');
    grad.addColorStop(1, 'rgba(186, 230, 253, 0)');
  } else if (kind === 'spark') {
    grad.addColorStop(0, 'rgba(255, 250, 220, 1)');
    grad.addColorStop(0.35, 'rgba(251, 191, 36, 0.75)');
    grad.addColorStop(0.75, 'rgba(249, 115, 22, 0.22)');
    grad.addColorStop(1, 'rgba(249, 115, 22, 0)');
  } else {
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
    grad.addColorStop(0.38, 'rgba(255, 245, 235, 0.58)');
    grad.addColorStop(0.74, 'rgba(255, 232, 210, 0.16)');
    grad.addColorStop(1, 'rgba(255, 220, 190, 0)');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function configureTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  // 1. Mars Regolith Albedo (rich warm rust, basalt flecks, dune ripples)
  const marsCanvas = document.createElement('canvas');
  marsCanvas.width = 512;
  marsCanvas.height = 512;
  const mctx = marsCanvas.getContext('2d')!;
  mctx.fillStyle = '#b95c39';
  mctx.fillRect(0, 0, 512, 512);

  // Wind-blown dune striations
  for (let y = 0; y < 512; y += 4) {
    const wave = Math.sin(y * 0.08) * 14 + Math.cos(y * 0.03) * 8;
    mctx.fillStyle = wave > 0 ? 'rgba(218, 125, 78, 0.14)' : 'rgba(110, 44, 24, 0.14)';
    mctx.fillRect(0, y, 512, 3);
  }
  // Basalt & ochre regolith speckles
  for (let i = 0; i < 4200; i++) {
    const x = (i * 73) % 512;
    const y = ((i * 197) + Math.floor(i / 512) * 31) % 512;
    const r = (i % 3) + 1;
    mctx.fillStyle =
      i % 5 === 0
        ? 'rgba(72, 34, 24, 0.35)'
        : i % 3 === 0
          ? 'rgba(229, 148, 95, 0.25)'
          : 'rgba(155, 68, 38, 0.28)';
    mctx.fillRect(x, y, r, r);
  }
  const marsAlbedo = configureTexture(marsCanvas, true, maxAnisotropy, 16, 16);

  // 2. Mars Regolith Bump Map (linear)
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const bctx = bumpCanvas.getContext('2d')!;
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 3) {
    const shade = 128 + Math.round(Math.sin(y * 0.14) * 28);
    bctx.fillStyle = `rgb(${shade},${shade},${shade})`;
    bctx.fillRect(0, y, 256, 2);
  }
  for (let i = 0; i < 1800; i++) {
    const x = (i * 59) % 256;
    const y = (i * 113) % 256;
    const v = i % 2 === 0 ? 185 : 75;
    bctx.fillStyle = `rgb(${v},${v},${v})`;
    bctx.fillRect(x, y, 2, 2);
  }
  const marsBump = configureTexture(bumpCanvas, false, maxAnisotropy, 16, 16);

  // 3. Solar Photovoltaic Silicon Grid Texture
  const solarCanvas = document.createElement('canvas');
  solarCanvas.width = 512;
  solarCanvas.height = 512;
  const sctx = solarCanvas.getContext('2d')!;
  const grad = sctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#0f2854');
  grad.addColorStop(0.5, '#173d7a');
  grad.addColorStop(1, '#0d2248');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 512, 512);

  sctx.strokeStyle = 'rgba(186, 230, 253, 0.55)';
  sctx.lineWidth = 4;
  for (let x = 0; x <= 512; x += 64) {
    sctx.beginPath();
    sctx.moveTo(x, 0);
    sctx.lineTo(x, 512);
    sctx.stroke();
  }
  for (let y = 0; y <= 512; y += 64) {
    sctx.beginPath();
    sctx.moveTo(0, y);
    sctx.lineTo(512, y);
    sctx.stroke();
  }
  sctx.strokeStyle = 'rgba(147, 197, 253, 0.25)';
  sctx.lineWidth = 1.5;
  for (let x = 16; x < 512; x += 16) {
    sctx.beginPath();
    sctx.moveTo(x, 0);
    sctx.lineTo(x, 512);
    sctx.stroke();
  }
  const solarCell = configureTexture(solarCanvas, true, maxAnisotropy, 1, 1);

  // 4. Sintered Landing Pad Markings Texture
  const padCanvas = document.createElement('canvas');
  padCanvas.width = 512;
  padCanvas.height = 512;
  const pctx = padCanvas.getContext('2d')!;
  pctx.fillStyle = '#3f4552';
  pctx.fillRect(0, 0, 512, 512);
  // Scorched center ring
  const scorch = pctx.createRadialGradient(256, 256, 20, 256, 256, 210);
  scorch.addColorStop(0, 'rgba(20, 22, 28, 0.65)');
  scorch.addColorStop(0.65, 'rgba(35, 39, 48, 0.25)');
  scorch.addColorStop(1, 'rgba(63, 69, 82, 0)');
  pctx.fillStyle = scorch;
  pctx.fillRect(0, 0, 512, 512);

  // Safety yellow target ring & "M" Mars emblem
  pctx.strokeStyle = '#f59e0b';
  pctx.lineWidth = 14;
  pctx.beginPath();
  pctx.arc(256, 256, 188, 0, Math.PI * 2);
  pctx.stroke();

  pctx.setLineDash([28, 18]);
  pctx.strokeStyle = '#e2e8f0';
  pctx.lineWidth = 8;
  pctx.beginPath();
  pctx.arc(256, 256, 145, 0, Math.PI * 2);
  pctx.stroke();
  pctx.setLineDash([]);

  pctx.fillStyle = '#f8fafc';
  pctx.font = 'bold 130px sans-serif';
  pctx.textAlign = 'center';
  pctx.textBaseline = 'middle';
  pctx.fillText('H', 256, 262);
  const landingPad = configureTexture(padCanvas, true, maxAnisotropy, 1, 1);
  landingPad.wrapS = THREE.ClampToEdgeWrapping;
  landingPad.wrapT = THREE.ClampToEdgeWrapping;

  // 5. Hazard Stripe Trim Texture
  const hazCanvas = document.createElement('canvas');
  hazCanvas.width = 256;
  hazCanvas.height = 256;
  const hctx = hazCanvas.getContext('2d')!;
  hctx.fillStyle = '#f59e0b';
  hctx.fillRect(0, 0, 256, 256);
  hctx.fillStyle = '#1e293b';
  for (let i = -256; i < 512; i += 48) {
    hctx.beginPath();
    hctx.moveTo(i, 0);
    hctx.lineTo(i + 24, 0);
    hctx.lineTo(i + 152, 256);
    hctx.lineTo(i + 128, 256);
    hctx.closePath();
    hctx.fill();
  }
  const hazardStripe = configureTexture(hazCanvas, true, maxAnisotropy, 3, 1);

  // 6. Aerospace Ceramic Hull Panel Seams
  const hullCanvas = document.createElement('canvas');
  hullCanvas.width = 256;
  hullCanvas.height = 256;
  const uctx = hullCanvas.getContext('2d')!;
  uctx.fillStyle = '#e8edf5';
  uctx.fillRect(0, 0, 256, 256);
  uctx.strokeStyle = '#cbd5e1';
  uctx.lineWidth = 3;
  uctx.strokeRect(4, 4, 248, 248);
  uctx.beginPath();
  uctx.moveTo(128, 0);
  uctx.lineTo(128, 256);
  uctx.moveTo(0, 128);
  uctx.lineTo(256, 128);
  uctx.stroke();
  // Rivets
  uctx.fillStyle = '#94a3b8';
  [16, 112, 144, 240].forEach((rx) => {
    [16, 112, 144, 240].forEach((ry) => {
      uctx.beginPath();
      uctx.arc(rx, ry, 2.2, 0, Math.PI * 2);
      uctx.fill();
    });
  });
  const hullPanel = configureTexture(hullCanvas, true, maxAnisotropy, 2, 2);

  // 7. Radial Contact Shadow Texture
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const shctx = shadowCanvas.getContext('2d')!;
  const sg = shctx.createRadialGradient(64, 64, 6, 64, 64, 62);
  sg.addColorStop(0, 'rgba(15, 8, 5, 0.72)');
  sg.addColorStop(0.55, 'rgba(20, 10, 6, 0.32)');
  sg.addColorStop(1, 'rgba(20, 10, 6, 0)');
  shctx.fillStyle = sg;
  shctx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.CanvasTexture(shadowCanvas);
  contactShadow.colorSpace = THREE.SRGBColorSpace;
  contactShadow.needsUpdate = true;

  // 8. Soft Layered Mars Dust Wisp Texture (feathered atmospheric haze/saltation veil)
  const wispCanvas = document.createElement('canvas');
  wispCanvas.width = 256;
  wispCanvas.height = 128;
  const wctx = wispCanvas.getContext('2d')!;
  wctx.clearRect(0, 0, 256, 128);
  const blobs: Array<[number, number, number, number, string]> = [
    [128, 64, 118, 52, 'rgba(214, 118, 72, 0.34)'],
    [76, 68, 72, 38, 'rgba(229, 144, 92, 0.24)'],
    [182, 58, 74, 40, 'rgba(184, 88, 48, 0.24)'],
  ];
  blobs.forEach(([bx, by, rx, ry, col]) => {
    wctx.save();
    wctx.translate(bx, by);
    wctx.scale(1, ry / rx);
    const wg = wctx.createRadialGradient(0, 0, 4, 0, 0, rx);
    wg.addColorStop(0, col);
    wg.addColorStop(0.55, col.replace(/0\.\d+\)/, '0.12)'));
    wg.addColorStop(1, 'rgba(214, 118, 72, 0)');
    wctx.fillStyle = wg;
    wctx.beginPath();
    wctx.arc(0, 0, rx, 0, Math.PI * 2);
    wctx.fill();
    wctx.restore();
  });
  const dustWisp = new THREE.CanvasTexture(wispCanvas);
  dustWisp.colorSpace = THREE.SRGBColorSpace;
  dustWisp.needsUpdate = true;

  // 9. Circular Radial Soft Dust Mote (prevents square PointsMaterial artifacts)
  const softDustMote = createSoftParticleTexture('dust');

  // 10. Wind-Sheared Diagonal Dust Streak (long soft saltation sheet for realistic Martian wind)
  const streakCanvas = document.createElement('canvas');
  streakCanvas.width = 256;
  streakCanvas.height = 128;
  const stctx = streakCanvas.getContext('2d')!;
  stctx.clearRect(0, 0, 256, 128);
  const sBlobs: Array<[number, number, number, number, string]> = [
    [128, 64, 122, 34, 'rgba(218, 126, 78, 0.30)'],
    [70, 58, 76, 22, 'rgba(232, 150, 102, 0.22)'],
    [186, 70, 76, 22, 'rgba(182, 92, 52, 0.20)'],
    [130, 82, 95, 18, 'rgba(202, 108, 64, 0.16)'],
  ];
  sBlobs.forEach(([bx, by, rx, ry, col]) => {
    stctx.save();
    stctx.translate(bx, by);
    stctx.rotate(-0.08);
    stctx.scale(1, ry / rx);
    const sg2 = stctx.createRadialGradient(0, 0, 3, 0, 0, rx);
    sg2.addColorStop(0, col);
    sg2.addColorStop(0.55, col.replace(/0\.\d+\)/, '0.09)'));
    sg2.addColorStop(1, 'rgba(218, 126, 78, 0)');
    stctx.fillStyle = sg2;
    stctx.beginPath();
    stctx.arc(0, 0, rx, 0, Math.PI * 2);
    stctx.fill();
    stctx.restore();
  });
  const dustStreak = new THREE.CanvasTexture(streakCanvas);
  dustStreak.colorSpace = THREE.SRGBColorSpace;
  dustStreak.needsUpdate = true;

  // 11. Volumetric-Style Multi-Octave Soft Atmospheric Dust Cloud (muted ochre-taupe, smooth radial falloff)
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = 256;
  cloudCanvas.height = 256;
  const cctx = cloudCanvas.getContext('2d')!;
  cctx.clearRect(0, 0, 256, 256);
  const cloudPuffs: Array<[number, number, number, number, number]> = [
    [128, 134, 112, 74, 0.28],
    [82, 140, 68, 48, 0.22],
    [176, 132, 72, 50, 0.22],
    [126, 98, 84, 52, 0.18],
    [110, 166, 90, 44, 0.16],
  ];
  cloudPuffs.forEach(([cx, cy, rx, ry, alpha]) => {
    cctx.save();
    cctx.translate(cx, cy);
    cctx.scale(1, ry / rx);
    const cg = cctx.createRadialGradient(0, 0, 4, 0, 0, rx);
    cg.addColorStop(0, `rgba(196, 126, 88, ${alpha})`);
    cg.addColorStop(0.5, `rgba(176, 102, 68, ${alpha * 0.48})`);
    cg.addColorStop(1, 'rgba(155, 84, 54, 0)');
    cctx.fillStyle = cg;
    cctx.beginPath();
    cctx.arc(0, 0, rx, 0, Math.PI * 2);
    cctx.fill();
    cctx.restore();
  });
  const dustCloudSoft = new THREE.CanvasTexture(cloudCanvas);
  dustCloudSoft.colorSpace = THREE.SRGBColorSpace;
  dustCloudSoft.needsUpdate = true;

  // 12. Low Ground Saltation Dust Sheet (subtle terrain-hugging drifting mist, zero hard edges)
  const saltCanvas = document.createElement('canvas');
  saltCanvas.width = 256;
  saltCanvas.height = 128;
  const slctx = saltCanvas.getContext('2d')!;
  slctx.clearRect(0, 0, 256, 128);
  const saltPuffs: Array<[number, number, number, number, number]> = [
    [128, 72, 118, 40, 0.30],
    [68, 78, 66, 26, 0.22],
    [188, 70, 68, 28, 0.22],
    [128, 52, 92, 24, 0.14],
  ];
  saltPuffs.forEach(([sx, sy, rx, ry, alpha]) => {
    slctx.save();
    slctx.translate(sx, sy);
    slctx.scale(1, ry / rx);
    const slg = slctx.createRadialGradient(0, 0, 4, 0, 0, rx);
    slg.addColorStop(0, `rgba(188, 114, 76, ${alpha})`);
    slg.addColorStop(0.55, `rgba(164, 92, 58, ${alpha * 0.42})`);
    slg.addColorStop(1, 'rgba(150, 82, 52, 0)');
    slctx.fillStyle = slg;
    slctx.beginPath();
    slctx.arc(0, 0, rx, 0, Math.PI * 2);
    slctx.fill();
    slctx.restore();
  });
  const dustSaltationBand = new THREE.CanvasTexture(saltCanvas);
  dustSaltationBand.colorSpace = THREE.SRGBColorSpace;
  dustSaltationBand.needsUpdate = true;

  const signTextures: THREE.CanvasTexture[] = [];

  const createSignTexture = (
    title: string,
    subtitle: string,
    accentHex: string,
  ): THREE.CanvasTexture => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 160;
    const ctx = c.getContext('2d')!;

    // Deep slate rounded placard
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 144, 24);
    ctx.fill();

    // Accent border & top strip
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(8, 8, 496, 144, 24);
    ctx.stroke();

    ctx.fillStyle = accentHex;
    ctx.fillRect(32, 26, 16, 108);

    // Building Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 66, 60);

    // Short friendly subtitle
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '500 22px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(subtitle, 66, 112);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    tex.needsUpdate = true;
    signTextures.push(tex);
    return tex;
  };

  return {
    marsAlbedo,
    marsBump,
    solarCell,
    landingPad,
    hazardStripe,
    hullPanel,
    contactShadow,
    dustWisp,
    softDustMote,
    dustStreak,
    dustCloudSoft,
    dustSaltationBand,
    createSignTexture,
    dispose: () => {
      marsAlbedo.dispose();
      marsBump.dispose();
      solarCell.dispose();
      landingPad.dispose();
      hazardStripe.dispose();
      hullPanel.dispose();
      contactShadow.dispose();
      dustWisp.dispose();
      softDustMote.dispose();
      dustStreak.dispose();
      dustCloudSoft.dispose();
      dustSaltationBand.dispose();
      signTextures.forEach((t) => t.dispose());
    },
  };
}
