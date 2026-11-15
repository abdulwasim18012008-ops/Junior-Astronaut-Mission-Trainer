# SPACE EXPLORER — Mars & Moon World Selector

**Two worlds. Two adventures. One journey.**

SPACE EXPLORER combines the original **Mars** and **Moon** 3D exploration games into one unified application with a 3D planetary world-selection launcher, while keeping both original games completely independent and untouched.

## Project Structure

```text
.
├── index.html                  # SPACE EXPLORER launcher entry point
├── vite.config.ts              # Multi-page Vite config (main, mars, moon)
├── package.json                # Shared dependencies
├── src/
│   ├── App.tsx                 # World-selection UI & full-screen game launcher
│   ├── main.tsx                # Launcher React entry
│   ├── index.css               # Launcher Tailwind CSS v4 tokens
│   └── launcher/
│       ├── PlanetScene.tsx     # Three.js 3D rotating Mars & Moon scene
│       ├── planetTextures.ts   # Procedural spherical Mars & Moon PBR textures
│       ├── spaceAudio.ts       # Optional Web Audio space ambience & cues
│       └── saveReader.ts       # Read-only localStorage save progress summary
├── mars/                       # Original Mars exploration game (preserved intact)
│   ├── index.html              # Mars entry point (/mars/index.html)
│   ├── src/                    # Original Mars source files (unmodified)
│   └── ...
└── moon/                       # Original Moon exploration game (preserved intact)
    ├── index.html              # Moon entry point (/moon/index.html)
    ├── src/                    # Original Moon source files (unmodified)
    └── ...
```

## How It Works

1. Opening the application loads the **SPACE EXPLORER** start page (`/`), displaying two slowly rotating 3D planets (**MARS** and **MOON**) with realistic procedural terrain textures, solar lighting, and atmospheric rim glow.
2. Selecting **ENTER MARS** smoothly transitions to `/mars/index.html` in full screen, running the original Mars game and preserving its save key (`junior_astronaut_adventure_save_v5`).
3. Selecting **ENTER MOON** smoothly transitions to `/moon/index.html` in full screen, running the original Moon game and preserving its save key (`junior_astronaut_moon_campaign_v1`).
4. Use the top-center **World Select** button (or browser Back) at any time to return to the world-selection screen.

## Running Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Building for Production

```bash
npm run lint
npm run build
```

This builds three independent entry points into `dist/`:
- `dist/index.html` (SPACE EXPLORER Launcher)
- `dist/mars/index.html` (Original Mars Game)
- `dist/moon/index.html` (Original Moon Game)
