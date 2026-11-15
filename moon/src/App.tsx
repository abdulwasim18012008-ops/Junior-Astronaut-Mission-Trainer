/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  LiveHudSnapshot,
  MiniGameType,
  OptionalActivityDef,
  SaveProgress,
  SubtitleLine,
} from './types/game';
import { LunarEngine } from './game/LunarEngine';
import { ColonyBuildingInfo } from './game/colonyBuilder';
import { CAMPAIGN_MISSIONS, WORLD_LOCATIONS } from './game/missions';
import { lunarAudio } from './game/sound';
import { GameHUD } from './components/GameHUD';
import { MiniGameModal } from './components/MiniGames';
import { LearningRecapModal } from './components/LearningRecapModal';
import { LunarMapModal } from './components/LunarMapModal';
import { CrewLogModal } from './components/CrewLogModal';
import { LunarPioneerEmblem } from './components/LunarPioneerBadge';

const STORAGE_KEY = 'junior_astronaut_moon_campaign_v1';

function createInitialProgress(): SaveProgress {
  return {
    currentMissionIndex: 0,
    currentObjectiveIndex: 0,
    completedMissions: [],
    starsByMission: {},
    points: 0,
    badges: [],
    discoveredLocations: ['observation_point', 'mission_control'],
    completedOptionals: [],
    unlockedChapters: [1],
    storyCompleted: false,
    lunarTime: 0.18, // Bright crisp lunar morning sunlight
    roverBattery: 100,
    apolloDiscovered: false,
    inspectedBuildings: [],
    cameraSensitivity: 1.0,
    showGoldenTrail: true,
    seenOnFootTutorial: false,
    seenRoverTutorial: false,
  };
}

function loadSavedProgress(): SaveProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialProgress();
    const parsed = JSON.parse(raw) as Partial<SaveProgress>;
    const merged: SaveProgress = {
      ...createInitialProgress(),
      ...parsed,
    };
    if (parsed.seenOnFootTutorial === undefined && (parsed.completedMissions?.length ?? 0) > 1) {
      merged.seenOnFootTutorial = true;
    }
    return merged;
  } catch {
    return createInitialProgress();
  }
}

const DEFAULT_HUD: LiveHudSnapshot = {
  phase: 'cinematic_opening',
  cinematicScene: 1,
  vehicleState: 'PARKED',
  inVehicle: false,
  playerX: -75,
  playerZ: -48,
  playerY: 0,
  playerHeading: 0,
  evX: 0,
  evZ: 26,
  evSpeed: 0,
  roverBattery: 100,
  roverCharging: false,
  roverChargeProgress: 100,
  batteryStatus: 'healthy',
  nearChargingStation: false,
  chargingStationName: '',
  emergencyBoostProgress: 0,
  apolloDiscovered: false,
  showGoldenTrail: true,
  activeCameraMode: 'walk',
  targetX: null,
  targetZ: null,
  targetLabel: '',
  distanceToTarget: 0,
  targetBearingDeg: 0,
  cameraHeadingDeg: 0,
  sunElevation: 0.8,
  surfaceTempC: 65,
  isShadowed: false,
  nearbyPrompt: null,
  crewPositions: [],
  collectProgress: 0,
  collectTarget: 0,
  vehicleTutorialStep: 0,
  routeWaypoints: [],
  targetScreenPos: null,
  guidanceMode: 'none',
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<LunarEngine | null>(null);

  const [progress, setProgress] = useState<SaveProgress>(() => loadSavedProgress());
  const progressRef = useRef<SaveProgress>(progress);

  const [hud, setHud] = useState<LiveHudSnapshot>(DEFAULT_HUD);
  const [subtitle, setSubtitle] = useState<SubtitleLine | null>(null);
  const [transmission, setTransmission] = useState<{ sender: string; text: string } | null>(null);
  const [toastText, setToastText] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);

  const [activeMiniGame, setActiveMiniGame] = useState<{
    type: MiniGameType;
    label: string;
    optionalActivity?: OptionalActivityDef;
  } | null>(null);
  const [recapMissionIdx, setRecapMissionIdx] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [logModalTab, setLogModalTab] = useState<'crew' | 'badges' | 'optional' | 'discoveries' | 'pause' | null>(null);
  const [inspectedBuilding, setInspectedBuilding] = useState<ColonyBuildingInfo | null>(null);
  const [apolloCaption, setApolloCaption] = useState<string | null>(null);
  const [showPioneerUnlock, setShowPioneerUnlock] = useState(false);

  const saveProgress = useCallback((updater: (prev: SaveProgress) => SaveProgress) => {
    setProgress((prev) => {
      const next = updater(prev);
      progressRef.current = next;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage quota errors
      }
      engineRef.current?.syncProgress(next);
      return next;
    });
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastText(msg);
    window.setTimeout(() => {
      setToastText((curr) => (curr === msg ? null : curr));
    }, 3500);
  }, []);

  // Mount Three.js LunarEngine ONCE
  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    const engine = new LunarEngine(container, progressRef.current, {
      onHudUpdate: (snapshot) => setHud(snapshot),
      onSubtitle: (sub) => setSubtitle(sub),
      onTransmission: (payload) => setTransmission(payload),
      onOpenMiniGame: (type, label, optionalActivity) => {
        setActiveMiniGame({ type, label, optionalActivity });
      },
      onMissionComplete: (missionIndex) => {
        const m = CAMPAIGN_MISSIONS[missionIndex];
        if (!m) return;
        saveProgress((prev) => {
          const alreadyDone = prev.completedMissions.includes(m.id);
          const completedMissions = alreadyDone ? prev.completedMissions : [...prev.completedMissions, m.id];
          const starsByMission = { ...prev.starsByMission, [m.id]: 3 };
          const badges =
            m.badgeReward && !prev.badges.includes(m.badgeReward.id)
              ? [...prev.badges, m.badgeReward.id]
              : prev.badges;
          const nextIdx = Math.min(CAMPAIGN_MISSIONS.length, missionIndex + 1);
          const nextMission = CAMPAIGN_MISSIONS[nextIdx];
          const unlockedChapters =
            nextMission && !prev.unlockedChapters.includes(nextMission.chapter)
              ? [...prev.unlockedChapters, nextMission.chapter]
              : prev.unlockedChapters;
          return {
            ...prev,
            currentMissionIndex: nextIdx,
            currentObjectiveIndex: 0,
            completedMissions,
            starsByMission,
            points: alreadyDone ? prev.points : prev.points + 100,
            badges,
            unlockedChapters,
            storyCompleted: prev.storyCompleted || m.id === 20,
          };
        });
        setRecapMissionIdx(missionIndex);
      },
      onOptionalComplete: (activity) => {
        saveProgress((prev) => {
          if (prev.completedOptionals.includes(activity.id)) return prev;
          const badges = [...prev.badges];
          if (activity.id === 'opt_observatory_view' && !badges.includes('stargazer')) {
            badges.push('stargazer');
          }
          if (activity.category === 'crew_help' && !badges.includes('crew_helper')) {
            badges.push('crew_helper');
          }
          return {
            ...prev,
            completedOptionals: [...prev.completedOptionals, activity.id],
            badges,
            points: prev.points + activity.points,
          };
        });
        showToast(`+${activity.points} pts — ${activity.title}! (${activity.funFact})`);
      },
      onLocationDiscovered: (locId) => {
        const loc = WORLD_LOCATIONS.find((l) => l.id === locId);
        if (!loc) return;
        saveProgress((prev) => {
          if (prev.discoveredLocations.includes(locId)) return prev;
          const nextDiscovered = [...prev.discoveredLocations, locId];
          const outerCount = nextDiscovered.filter((id) => {
            const w = WORLD_LOCATIONS.find((x) => x.id === id);
            return w && !w.alwaysVisible && w.id !== 'apollo_11_site';
          }).length;
          const badges =
            outerCount >= 3 && !prev.badges.includes('crater_explorer')
              ? [...prev.badges, 'crater_explorer']
              : prev.badges;
          return {
            ...prev,
            discoveredLocations: nextDiscovered,
            badges,
            points: prev.points + 25,
          };
        });
        showToast(`New Location Discovered: ${loc.name} (+25 pts)`);
      },
      onApolloDiscovered: () => {
        const wasAlreadyDiscovered = progressRef.current.apolloDiscovered;
        saveProgress((prev) => {
          if (prev.apolloDiscovered) return prev;
          const discoveredLocations = prev.discoveredLocations.includes('apollo_11_site')
            ? prev.discoveredLocations
            : [...prev.discoveredLocations, 'apollo_11_site'];
          const badges = prev.badges.includes('lunar_pioneer')
            ? prev.badges
            : [...prev.badges, 'lunar_pioneer'];
          return {
            ...prev,
            apolloDiscovered: true,
            discoveredLocations,
            badges,
            points: prev.points + 500,
          };
        });
        if (!wasAlreadyDiscovered) {
          window.setTimeout(() => {
            setShowPioneerUnlock(true);
            window.setTimeout(() => setShowPioneerUnlock(false), 6200);
          }, 2900);
        }
      },
      onApolloCaption: (caption) => {
        setApolloCaption(caption);
      },
      onBatteryPersist: (pct) => {
        saveProgress((prev) => ({
          ...prev,
          roverBattery: Math.max(0, Math.min(100, Math.round(pct))),
        }));
      },
      onCinematicsStateChange: () => {},
      onRequestToggleMap: () => {
        setShowMap((m) => !m);
      },
      onRequestTogglePause: () => {
        setLogModalTab((curr) => (curr ? null : 'pause'));
      },
      onBuildingInspect: (building) => {
        setInspectedBuilding(building);
        saveProgress((prev) => {
          if (prev.inspectedBuildings.includes(building.id)) return prev;
          return {
            ...prev,
            inspectedBuildings: [...prev.inspectedBuildings, building.id],
            points: prev.points + 15,
          };
        });
      },
    });

    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [saveProgress, showToast]);

  // Pause simulation cleanly whenever any modal is open
  useEffect(() => {
    const anyModal = Boolean(
      activeMiniGame || recapMissionIdx !== null || showMap || logModalTab || inspectedBuilding,
    );
    engineRef.current?.setModalOpen(anyModal);
  }, [activeMiniGame, recapMissionIdx, showMap, logModalTab, inspectedBuilding]);

  const handleContinueAfterRecap = () => {
    const finishedIdx = recapMissionIdx;
    setRecapMissionIdx(null);
    if (finishedIdx !== null) {
      const nextMission = CAMPAIGN_MISSIONS[finishedIdx + 1];
      if (nextMission) {
        setTransmission({
          sender: nextMission.briefingSpeaker,
          text: nextMission.briefingText,
        });
        lunarAudio.playRadioBeep();
      }
    }
  };

  const handleRestartCampaign = () => {
    const fresh = createInitialProgress();
    progressRef.current = fresh;
    setProgress(fresh);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // Ignore
    }
    window.location.reload();
  };

  const handleToggleMute = () => {
    const next = !muted;
    setMuted(next);
    lunarAudio.setMuted(next);
  };

  const handleCycleTimeOfDay = () => {
    const next = hud.isShadowed ? 0.22 : 0.75;
    engineRef.current?.setLunarTime(next);
    saveProgress((prev) => ({ ...prev, lunarTime: next }));
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none">
      {/* Isolated WebGL Canvas Container */}
      <div ref={canvasMountRef} className="h-full w-full" />

      {/* Low-Occlusion Game HUD */}
      <GameHUD
        hud={hud}
        progress={progress}
        subtitle={subtitle}
        transmission={transmission}
        toastText={toastText}
        muted={muted}
        onDismissTransmission={() => setTransmission(null)}
        onSkipCinematic={() => engineRef.current?.skipCinematic()}
        onAction={() => engineRef.current?.triggerPrimaryAction()}
        onChargeRover={() => engineRef.current?.startChargingRover()}
        onEmergencyBoost={() => engineRef.current?.triggerEmergencySolarBoost()}
        onOpenMap={() => setShowMap(true)}
        onOpenLog={(tab) => setLogModalTab(tab)}
        onToggleMute={handleToggleMute}
        onCycleTimeOfDay={handleCycleTimeOfDay}
        onToggleGoldenTrail={() =>
          saveProgress((prev) => ({
            ...prev,
            showGoldenTrail: prev.showGoldenTrail === false,
          }))
        }
        onDismissOnFootTutorial={() =>
          saveProgress((prev) => ({ ...prev, seenOnFootTutorial: true }))
        }
        onDismissRoverTutorial={() =>
          saveProgress((prev) => ({ ...prev, seenRoverTutorial: true }))
        }
      />

      {/* Apollo 11 Tranquility Base Text-Only Inspection Captions */}
      <AnimatePresence>
        {apolloCaption && (
          <motion.div
            key={apolloCaption}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.45 }}
            className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center px-6"
          >
            <div className="rounded-2xl border border-amber-300/40 bg-slate-950/90 px-6 py-3 text-center shadow-2xl">
              <p className="text-base font-bold tracking-wide text-amber-100 sm:text-xl">
                {apolloCaption}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lunar Pioneer Badge Unlocked Celebration Animation */}
      <AnimatePresence>
        {showPioneerUnlock && (
          <motion.div
            initial={{ opacity: 0, y: -28, scale: 0.86 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="pointer-events-auto fixed top-16 left-1/2 z-40 -translate-x-1/2"
          >
            <div className="flex items-center gap-4 rounded-3xl border-2 border-amber-400/80 bg-slate-950/96 px-5 py-3.5 shadow-2xl">
              <motion.div
                initial={{ rotate: -18, scale: 0.7 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 240, damping: 14, delay: 0.1 }}
                className="shrink-0"
              >
                <LunarPioneerEmblem size={66} unlocked />
              </motion.div>
              <div className="min-w-0">
                <div className="text-[10px] font-black tracking-widest text-amber-400 uppercase">
                  Badge Unlocked · +500 Exploration Points
                </div>
                <div className="mt-0.5 text-lg font-black tracking-wide text-white">
                  LUNAR PIONEER
                </div>
                <p className="mt-0.5 text-xs text-slate-300">
                  Discovered the historic Apollo 11 first footprint on the Moon.
                </p>
              </div>
              <button
                onClick={() => setShowPioneerUnlock(false)}
                className="ml-2 self-start rounded-lg px-2 py-1 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Mini-Game Modal */}
      {activeMiniGame && (
        <MiniGameModal
          type={activeMiniGame.type}
          contextLabel={activeMiniGame.label}
          optionalActivity={activeMiniGame.optionalActivity}
          onSuccess={() => {
            const opt = activeMiniGame.optionalActivity;
            setActiveMiniGame(null);
            engineRef.current?.completeMiniGameSuccess(opt);
          }}
          onClose={() => setActiveMiniGame(null)}
        />
      )}

      {/* Learning Recap Modal (No Quizzes!) */}
      {recapMissionIdx !== null && CAMPAIGN_MISSIONS[recapMissionIdx] && (
        <LearningRecapModal
          mission={CAMPAIGN_MISSIONS[recapMissionIdx]}
          starsEarned={3}
          pointsEarned={100}
          onContinue={handleContinueAfterRecap}
        />
      )}

      {/* Interactive 3D Lunar Map Modal */}
      {showMap && (
        <LunarMapModal
          hud={hud}
          progress={progress}
          onClose={() => setShowMap(false)}
        />
      )}

      {/* Crew, Badges, Optional Exploration & Pause Logbook */}
      {logModalTab && (
        <CrewLogModal
          progress={progress}
          initialTab={logModalTab}
          onClose={() => setLogModalTab(null)}
          onResetBase={() => engineRef.current?.resetToBase()}
          onRestartCampaign={handleRestartCampaign}
          onUpdateSettings={(patch) => saveProgress((prev) => ({ ...prev, ...patch }))}
          onReplayTutorial={() =>
            saveProgress((prev) => ({
              ...prev,
              seenOnFootTutorial: false,
              seenRoverTutorial: false,
            }))
          }
        />
      )}

      {/* Facility Interior & Equipment Inspection Modal */}
      {inspectedBuilding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/88 p-4">
          <div className="w-full max-w-lg rounded-3xl border-2 border-sky-400/50 bg-slate-900 p-6 text-slate-100 shadow-2xl">
            <div className="text-xs font-extrabold tracking-widest text-sky-400 uppercase">
              Lunar Base Facility Inspection
            </div>
            <h2 className="mt-1 text-2xl font-black text-white">{inspectedBuilding.name}</h2>
            <p className="mt-2 text-sm font-semibold text-amber-300">{inspectedBuilding.purpose}</p>

            <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-950 p-4">
              <div className="text-xs font-bold tracking-wider text-emerald-400 uppercase">
                Interior Equipment & Consoles
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                {inspectedBuilding.interiorSummary}
              </p>
            </div>

            <button
              onClick={() => setInspectedBuilding(null)}
              className="mt-5 w-full rounded-xl bg-sky-500 py-3 text-sm font-extrabold text-slate-950 hover:bg-sky-400"
            >
              Return to Moon Surface
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
