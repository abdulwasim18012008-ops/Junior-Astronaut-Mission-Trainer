import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Compass, Maximize2, Minimize2, Volume2, VolumeX } from 'lucide-react';
import { PlanetScene } from './launcher/PlanetScene';
import { readWorldProgress, type WorldId, type WorldProgressSummary } from './launcher/saveReader';
import { spaceAudio } from './launcher/spaceAudio';

const WORLD_CONFIG: Record<
  WorldId,
  {
    name: string;
    subtitle: string;
    facts: string[];
    description: string;
    cta: string;
    entryUrl: string;
    accentBorder: string;
    accentHoverBorder: string;
    accentText: string;
    buttonClass: string;
  }
> = {
  mars: {
    name: 'MARS',
    subtitle: 'The Red Planet',
    facts: ['0.38 g Gravity', '225M km Avg. Distance'],
    description: 'Explore the Red Planet and manage your Mars base.',
    cta: 'ENTER MARS',
    entryUrl: '/mars/index.html',
    accentBorder: 'border-amber-500/25',
    accentHoverBorder: 'border-amber-400/70',
    accentText: 'text-amber-300',
    buttonClass:
      'bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold focus-visible:ring-amber-400',
  },
  moon: {
    name: 'MOON',
    subtitle: 'The Lunar World',
    facts: ['0.16 g Gravity', '384K km Distance'],
    description: 'Explore the lunar surface and build your Moon base.',
    cta: 'ENTER MOON',
    entryUrl: '/moon/index.html',
    accentBorder: 'border-sky-300/20',
    accentHoverBorder: 'border-sky-300/65',
    accentText: 'text-sky-200',
    buttonClass:
      'bg-slate-100 hover:bg-white text-slate-950 font-semibold focus-visible:ring-sky-300',
  },
};

export default function App() {
  const [activeWorld, setActiveWorld] = useState<WorldId | null>(null);
  const [launchingWorld, setLaunchingWorld] = useState<WorldId | null>(null);
  const [hoveredWorld, setHoveredWorld] = useState<WorldId | null>(null);
  const [muted, setMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progressMap, setProgressMap] = useState<Record<WorldId, WorldProgressSummary>>(() =>
    readWorldProgress(),
  );

  const launchTimerRef = useRef<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const w = params.get('world');
      if (w === 'mars' || w === 'moon') {
        setActiveWorld(w);
      } else {
        setActiveWorld(null);
        setLaunchingWorld(null);
        setProgressMap(readWorldProgress());
      }
    };
    onPopState();
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    return () => {
      if (launchTimerRef.current !== null) {
        window.clearTimeout(launchTimerRef.current);
      }
      spaceAudio.stopAmbience();
    };
  }, []);

  const handleToggleSound = useCallback(() => {
    const nowMuted = spaceAudio.toggleMute();
    setMuted(nowMuted);
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Fullscreen may be restricted inside some preview iframes
    }
  }, []);

  const handleHoverWorld = useCallback((world: WorldId | null) => {
    setHoveredWorld((prev) => {
      if (world && world !== prev) {
        spaceAudio.playHover(world);
      }
      return world;
    });
  }, []);

  const handleSelectWorld = useCallback(
    (world: WorldId) => {
      if (launchingWorld || activeWorld) return;
      setLaunchingWorld(world);
      spaceAudio.playLaunch(world);

      launchTimerRef.current = window.setTimeout(() => {
        spaceAudio.stopAmbience();
        setActiveWorld(world);
        setLaunchingWorld(null);
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('world', world);
          window.history.pushState({ world }, '', url.toString());
        } catch {
          // Ignore history pushState errors
        }
      }, 620);
    },
    [activeWorld, launchingWorld],
  );

  const handleReturnToLauncher = useCallback(() => {
    if (launchTimerRef.current !== null) {
      window.clearTimeout(launchTimerRef.current);
      launchTimerRef.current = null;
    }
    setActiveWorld(null);
    setLaunchingWorld(null);
    setHoveredWorld(null);
    setProgressMap(readWorldProgress());
    if (!muted) {
      spaceAudio.startAmbience();
    }
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('world');
      window.history.pushState({}, '', url.toString());
    } catch {
      // Ignore history pushState errors
    }
  }, [muted]);

  // Fullscreen Original Game View
  if (activeWorld) {
    const worldMeta = WORLD_CONFIG[activeWorld];
    return (
      <main className="relative h-screen w-screen overflow-hidden bg-[#05070e]">
        <iframe
          ref={iframeRef}
          src={worldMeta.entryUrl}
          title={`${worldMeta.name} — Original Exploration Game`}
          className="fixed inset-0 z-10 h-full w-full border-0 bg-[#05070e]"
          allow="fullscreen; autoplay"
          onLoad={() => {
            try {
              iframeRef.current?.focus();
            } catch {
              // Ignore focus errors
            }
          }}
        />
        <button
          type="button"
          onClick={handleReturnToLauncher}
          aria-label="Return to Space Explorer world selection"
          className="fixed top-2.5 left-1/2 z-50 flex -translate-x-1/2 cursor-pointer items-center gap-1.5 rounded-lg border border-white/15 bg-[#070a14]/80 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-slate-200 opacity-75 transition-all duration-150 hover:border-white/35 hover:bg-[#0b1020] hover:text-white hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
          <span>World Select</span>
        </button>
      </main>
    );
  }

  const isLaunching = launchingWorld !== null;

  return (
    <div className="relative flex min-h-screen w-full flex-col justify-between overflow-hidden bg-[#05070e] text-slate-100 select-none">
      {/* Live 3D Three.js Planetary Stage */}
      <PlanetScene
        hoveredWorld={hoveredWorld}
        launchingWorld={launchingWorld}
        onHoverWorld={handleHoverWorld}
        onSelectWorld={handleSelectWorld}
      />

      {/* Subtle vignette scrim for readable typography without obscuring the planets */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_36%,rgba(5,7,14,0.72)_100%)]"
      />

      {/* Launch Fade Transition */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 z-40 bg-[#05070e] transition-opacity duration-500 ${
          isLaunching ? 'opacity-95' : 'opacity-0'
        }`}
      />

      {/* Minimal Top Bar */}
      <header
        className={`relative z-20 flex items-center justify-between gap-8 px-6 py-4 transition-opacity duration-300 sm:px-10 ${
          isLaunching ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <Compass className="h-4 w-4 text-amber-400" aria-hidden="true" />
          <span className="font-display text-sm font-semibold tracking-[0.22em] text-slate-100">
            SPACE EXPLORER
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleToggleSound}
            aria-label={muted ? 'Enable ambient space audio' : 'Mute ambient space audio'}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-white/12 bg-[#090d1a]/85 px-3.5 text-xs font-medium whitespace-nowrap text-slate-200 transition-colors hover:border-white/25 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
          >
            {muted ? <VolumeX className="h-3.5 w-3.5 text-slate-400" /> : <Volume2 className="h-3.5 w-3.5 text-amber-300" />}
            <span>{muted ? 'Sound Off' : 'Sound On'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-white/12 bg-[#090d1a]/85 px-3.5 text-xs font-medium whitespace-nowrap text-slate-200 transition-colors hover:border-white/25 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:outline-none"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
          </button>
        </div>
      </header>

      {/* Main Title & Prompt Header */}
      <section
        className={`pointer-events-none relative z-20 mx-auto max-w-3xl px-6 pt-1 text-center transition-all duration-300 ${
          isLaunching ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <h1 className="font-display text-4xl font-bold tracking-[0.14em] text-white sm:text-5xl lg:text-[3.5rem] [text-wrap:balance]">
          SPACE EXPLORER
        </h1>
        <p className="mt-2 text-sm font-normal tracking-wide text-slate-300 sm:text-base">
          Two worlds. Two adventures. One journey.
        </p>
        <p className="mt-5 font-display text-xs font-semibold tracking-[0.24em] text-amber-200/90 uppercase sm:text-sm">
          WHICH WORLD WOULD YOU LIKE TO EXPLORE?
        </p>
      </section>

      {/* Center Spacer so the two 3D planets have unobstructed breathing room */}
      <div className="pointer-events-none relative z-10 min-h-[210px] flex-1 sm:min-h-[270px]" />

      {/* Two Balanced World Selection Anchors */}
      <section
        aria-label="World selection"
        className={`relative z-20 mx-auto w-full max-w-5xl px-6 pb-8 transition-all duration-300 sm:px-10 sm:pb-10 ${
          isLaunching ? 'translate-y-3 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-10">
          {(['mars', 'moon'] as WorldId[]).map((worldId) => {
            const cfg = WORLD_CONFIG[worldId];
            const isHovered = hoveredWorld === worldId;
            const saveInfo = progressMap[worldId];

            return (
              <div
                key={worldId}
                onMouseEnter={() => handleHoverWorld(worldId)}
                onMouseLeave={() => handleHoverWorld(null)}
                className={`flex flex-col justify-between rounded-xl border bg-[#080c17]/88 p-5 transition-all duration-200 sm:p-6 ${
                  isHovered ? cfg.accentHoverBorder : cfg.accentBorder
                }`}
              >
                <div>
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 className="font-display text-2xl font-bold tracking-[0.12em] text-white sm:text-[1.75rem]">
                      {cfg.name}
                    </h2>
                    <span className={`text-xs font-medium tracking-wider uppercase ${cfg.accentText}`}>
                      {cfg.subtitle}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-slate-400 tabular-nums">
                    <span>{cfg.facts[0]}</span>
                    <span aria-hidden="true">·</span>
                    <span>{cfg.facts[1]}</span>
                    <span aria-hidden="true">·</span>
                    <span className={saveInfo.hasSave ? 'text-slate-200' : 'text-slate-400'}>
                      {saveInfo.label}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-slate-200 sm:text-[15px]">
                    {cfg.description}
                  </p>
                </div>

                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => handleSelectWorld(worldId)}
                    className={`flex h-11 w-full cursor-pointer items-center justify-center rounded-lg px-5 font-display text-sm tracking-[0.14em] whitespace-nowrap transition-transform duration-150 active:scale-[0.99] focus-visible:ring-2 focus-visible:outline-none ${cfg.buttonClass}`}
                  >
                    {cfg.cta}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
