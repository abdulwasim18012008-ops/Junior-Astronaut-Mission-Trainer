import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BatteryCharging,
  Compass,
  Crosshair,
  Eye,
  EyeOff,
  Focus,
  Hand,
  Layers,
  Lock,
  MapPin,
  Minus,
  Moon,
  Navigation,
  Orbit,
  PlugZap,
  Plus,
  RotateCcw,
  RotateCw,
  Sun,
  Truck,
  X,
} from 'lucide-react';
import { CHARACTERS_INFO } from '../game/adventureStory';
import { getStructureDisplayName } from '../game/crewAI';
import { STORM_STAGE_SPECS } from '../game/marsConfig';
import {
  createMars3DMapController,
  DEFAULT_MAP_LAYERS,
  MapLayerVisibility,
  MapPickTarget,
  Mars3DMapController,
  ProjectedMapLabel,
} from '../game/marsMap3D';
import { groundHeightAt } from '../game/marsTerrain';
import { OPTIONAL_TASKS } from '../game/learningRecaps';
import {
  ALL_MAP_LOCATIONS,
  COLONY_MAP_LOCATIONS,
  EXPLORATION_MAP_LOCATIONS,
  MapLocationSpec,
} from '../game/navigation';
import { LOST_ROVERS } from '../game/roversData';
import {
  CrewNpcId,
  EnvironmentTelemetry,
  LostRoverId,
  NavigationRoute,
  OptionalTaskSpec,
  StormStage,
  WorldVisualState,
} from '../game/types';

export interface BaseMapModalProps {
  telemetry: EnvironmentTelemetry | null;
  visualState?: WorldVisualState;
  missionId: number;
  activeTargetPos?: [number, number] | null;
  discoveredLandmarks: string[];
  discoveredAnomalies: string[];
  resolvedRovers: LostRoverId[];
  exploredSectors: string[];
  unlockedCrewIds?: CrewNpcId[];
  activeOptionalIds?: string[];
  drivingRover?: boolean;
  evGuideActive?: boolean;
  activeRoute?: NavigationRoute | null;
  onSetRoute?: (dest: {
    id: string;
    name: string;
    category: NavigationRoute['destinationCategory'];
    x: number;
    z: number;
  }) => void;
  onClearRoute?: () => void;
  onOpenChargingStation?: () => void;
  onSetSolTime?: (progress01: number) => void;
  onCycleWeather?: () => void;
  onSetStormStage?: (stage: StormStage) => void;
  onClose: () => void;
}

type InspectorTarget =
  | { kind: 'location'; loc: MapLocationSpec; discovered: boolean }
  | { kind: 'optional'; task: OptionalTaskSpec }
  | {
      kind: 'crew';
      id: 'alex' | CrewNpcId;
      name: string;
      role: string;
      locationName: string;
      activity: string;
      x: number;
      z: number;
      color: string;
    }
  | { kind: 'mev' }
  | { kind: 'remote_rover'; roverId: LostRoverId };

function getBuildingLiveStatus(
  id: string,
  visualState?: WorldVisualState,
  telemetry?: EnvironmentTelemetry | null,
): { label: string; tone: 'nominal' | 'warning' | 'alert' } {
  if (!visualState) return { label: 'Systems Nominal', tone: 'nominal' };
  switch (id) {
    case 'oxygen_centre':
      if (visualState.o2AlarmActive) return { label: 'O₂ Scrubber Alarm Active', tone: 'alert' };
      return visualState.o2FanSpinning
        ? { label: 'Scrubbers Active · Nominal', tone: 'nominal' }
        : { label: 'Fan Standby', tone: 'warning' };
    case 'water_station':
      if (visualState.waterLeakActive) return { label: 'Pipe Leak Detected', tone: 'alert' };
      if (visualState.waterValveClosed) return { label: 'Isolation Valve Closed', tone: 'warning' };
      return { label: 'Hydro-Recycling Nominal', tone: 'nominal' };
    case 'power_station':
      if (visualState.powerBlackout) return { label: 'Microgrid Blackout!', tone: 'alert' };
      if (visualState.cableSparking) return { label: 'Loose Grid Conduit', tone: 'warning' };
      return { label: 'Battery Microgrid Nominal', tone: 'nominal' };
    case 'solar_expansion':
      if (visualState.solarDusty) return { label: 'Dust Coating Arrays', tone: 'warning' };
      return {
        label: `Solar Output ${telemetry ? `${telemetry.solarEfficiencyPct}%` : 'Nominal'}`,
        tone: telemetry && telemetry.solarEfficiencyPct < 35 ? 'warning' : 'nominal',
      };
    case 'greenhouse':
      if (visualState.plantsWilting) return { label: 'Crops Wilting — Needs Care', tone: 'alert' };
      if (visualState.stormShuttersClosed) return { label: 'Storm Shutters Sealed', tone: 'warning' };
      return visualState.tomatoesRipe
        ? { label: 'Tomatoes Ready to Harvest', tone: 'nominal' }
        : { label: 'Hydroponics Healthy', tone: 'nominal' };
    case 'radiation_shelter':
      if (visualState.radiationDrillActive) return { label: 'Radiation Storm Drill Active', tone: 'alert' };
      if (visualState.shelterDoorsClosed) return { label: 'Blast Doors Sealed', tone: 'warning' };
      return {
        label: `Shielding ${Math.round(visualState.shelterShieldLevel)}% · Ready`,
        tone: 'nominal',
      };
    case 'charging_station':
      if (telemetry?.vehicleChargingActive) return { label: 'Charging 6x6 MEV Active', tone: 'nominal' };
      if (telemetry?.vehicleInChargingBay) return { label: 'MEV Docked in Bay', tone: 'nominal' };
      return { label: 'Charging Bays Open', tone: 'nominal' };
    case 'weather_station':
      if (visualState.dustStormActive) return { label: 'Regional Storm Telemetry', tone: 'alert' };
      if (visualState.stormWarningActive) return { label: 'Incoming Storm Warning', tone: 'warning' };
      return { label: `Tracking · ${telemetry?.weather ?? 'Clear'}`, tone: 'nominal' };
    case 'comms_tower':
      if (visualState.radioTransmitted) return { label: 'Orbital Link Synchronized', tone: 'nominal' };
      return { label: 'Deep-Space Array Online', tone: 'nominal' };
    default:
      return { label: 'Pressurized · Nominal', tone: 'nominal' };
  }
}

const LAYER_META: Array<{ key: keyof MapLayerVisibility; label: string }> = [
  { key: 'terrain', label: '3D Terrain' },
  { key: 'contours', label: 'Elevation & Contours' },
  { key: 'geology', label: 'Geology' },
  { key: 'infrastructure', label: 'Colony' },
  { key: 'discoveries', label: 'Discoveries' },
  { key: 'crewVehicles', label: 'Crew & Vehicles' },
  { key: 'objectives', label: 'Objectives' },
];

export const Mars3DMapModal: React.FC<BaseMapModalProps> = ({
  telemetry,
  visualState,
  missionId,
  activeTargetPos = null,
  discoveredLandmarks,
  discoveredAnomalies,
  resolvedRovers,
  exploredSectors,
  unlockedCrewIds,
  activeOptionalIds,
  drivingRover = false,
  evGuideActive = false,
  activeRoute = null,
  onSetRoute,
  onClearRoute,
  onOpenChargingStation,
  onSetSolTime,
  onCycleWeather,
  onSetStormStage,
  onClose,
}) => {
  const [filter, setFilter] = useState<'all' | 'colony' | 'exploration' | 'optional' | 'crew'>('all');
  const [layers, setLayers] = useState<MapLayerVisibility>(DEFAULT_MAP_LAYERS);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [touchMode, setTouchMode] = useState<'rotate' | 'pan'>('rotate');
  const [pickTarget, setPickTarget] = useState<MapPickTarget>({ kind: 'location', id: 'crew_home' });
  const [labels, setLabels] = useState<ProjectedMapLabel[]>([]);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<Mars3DMapController | null>(null);

  const isExplorationDiscovered = (loc: MapLocationSpec): boolean => {
    if (loc.category === 'colony') return true;
    const sgx = Math.floor((loc.x + 220) / 55) - 4;
    const sgz = Math.floor((loc.z + 220) / 55) - 4;
    if (exploredSectors.includes(`${sgx},${sgz}`)) return true;
    if (loc.linkedDiscoveryKind === 'landmark' && loc.linkedDiscoveryId) {
      return discoveredLandmarks.includes(loc.linkedDiscoveryId);
    }
    if (loc.linkedDiscoveryKind === 'anomaly' && loc.linkedDiscoveryId) {
      return discoveredAnomalies.includes(loc.linkedDiscoveryId);
    }
    if (loc.linkedDiscoveryKind === 'rover' && loc.linkedDiscoveryId) {
      return resolvedRovers.includes(loc.linkedDiscoveryId as LostRoverId);
    }
    return false;
  };

  const visibleOptionalTasks = useMemo(() => {
    if (!activeOptionalIds) return OPTIONAL_TASKS;
    return OPTIONAL_TASKS.filter((t) => activeOptionalIds.includes(t.id));
  }, [activeOptionalIds]);

  const crewMembers = useMemo(() => {
    const list: Array<{
      id: 'alex' | CrewNpcId;
      name: string;
      role: string;
      locationName: string;
      activity: string;
      x: number;
      z: number;
      color: string;
    }> = [
      {
        id: 'alex',
        name: 'Alex (You)',
        role: 'Junior Astronaut',
        locationName: telemetry?.surfaceType === 'colony' ? 'Ares Outpost Colony' : 'Mars Field Surface',
        activity: drivingRover ? 'Driving 6x6 Exploration Vehicle' : 'On EVA Exploration',
        x: telemetry?.playerX ?? 0,
        z: telemetry?.playerZ ?? 6,
        color: '#ffffff',
      },
    ];
    telemetry?.npcStatuses
      .filter((npc) => !unlockedCrewIds || unlockedCrewIds.includes(npc.id))
      .forEach((npc) => {
        list.push({
          id: npc.id,
          name: npc.name,
          role: npc.role,
          locationName: getStructureDisplayName(npc.buildingId),
          activity: npc.taskLabel,
          x: npc.x,
          z: npc.z,
          color: CHARACTERS_INFO[npc.id].suitColor,
        });
      });
    return list;
  }, [telemetry, drivingRover, unlockedCrewIds]);

  const visibleRemoteRovers = useMemo(
    () =>
      LOST_ROVERS.filter(
        (lr) =>
          resolvedRovers.includes(lr.id) ||
          (missionId === 12 && lr.id === 'sojourner') ||
          (missionId === 13 && lr.id === 'spirit'),
      ),
    [resolvedRovers, missionId],
  );

  const selected: InspectorTarget = useMemo(() => {
    if (pickTarget.kind === 'crew') {
      const cm = crewMembers.find((c) => c.id === pickTarget.id) ?? crewMembers[0];
      return { kind: 'crew', ...cm };
    }
    if (pickTarget.kind === 'mev') {
      return { kind: 'mev' };
    }
    if (pickTarget.kind === 'remote_rover') {
      return { kind: 'remote_rover', roverId: pickTarget.id };
    }
    if (pickTarget.kind === 'optional') {
      const task = OPTIONAL_TASKS.find((t) => t.id === pickTarget.id) ?? OPTIONAL_TASKS[0];
      return { kind: 'optional', task };
    }
    const loc =
      ALL_MAP_LOCATIONS.find((l) => l.id === pickTarget.id) ?? COLONY_MAP_LOCATIONS[0];
    return {
      kind: 'location',
      loc,
      discovered: isExplorationDiscovered(loc),
    };
  }, [pickTarget, crewMembers]);

  const selectedCoords = useMemo(() => {
    if (selected.kind === 'location') {
      return { x: selected.loc.x, z: selected.loc.z };
    }
    if (selected.kind === 'optional') {
      return { x: selected.task.x, z: selected.task.z };
    }
    if (selected.kind === 'crew') {
      return { x: selected.x, z: selected.z };
    }
    if (selected.kind === 'mev') {
      return { x: telemetry?.roverX ?? 21.3, z: telemetry?.roverZ ?? 1.6 };
    }
    const lr = LOST_ROVERS.find((r) => r.id === selected.roverId) ?? LOST_ROVERS[0];
    return { x: lr.x, z: lr.z };
  }, [selected, telemetry]);

  const selectedElevationM = useMemo(
    () => Math.round(groundHeightAt(selectedCoords.x, selectedCoords.z) * 10) / 10,
    [selectedCoords],
  );

  const selectedDistM = useMemo(() => {
    if (!telemetry) return 0;
    return Math.round(Math.hypot(selectedCoords.x - telemetry.playerX, selectedCoords.z - telemetry.playerZ));
  }, [selectedCoords, telemetry]);

  const routeLowRangeWarning = Boolean(
    telemetry &&
      drivingRover &&
      selected.kind !== 'mev' &&
      selectedDistM > telemetry.vehicleSafeRangeM,
  );

  const discoveredExplorationCount = EXPLORATION_MAP_LOCATIONS.filter(isExplorationDiscovered).length;

  // Mount / Dispose 3D Map Engine
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const ctrl = createMars3DMapController(el, {
      onSelect: (t) => setPickTarget(t),
      onLabelsUpdate: (next) => setLabels(next),
    });
    controllerRef.current = ctrl;
    return () => {
      ctrl.dispose();
      controllerRef.current = null;
    };
  }, []);

  // Synchronize live world state with 3D map scene
  useEffect(() => {
    controllerRef.current?.setSyncState({
      telemetry,
      missionId,
      drivingRover,
      resolvedRovers,
      discoveredLandmarks,
      discoveredAnomalies,
      exploredSectors,
      unlockedCrewIds,
      activeOptionalIds,
      activeRoute,
      activeTargetPos,
      selectedTarget: pickTarget,
      layers,
      filter,
      evGuideActive,
    });
  }, [
    telemetry,
    missionId,
    drivingRover,
    evGuideActive,
    resolvedRovers,
    discoveredLandmarks,
    discoveredAnomalies,
    exploredSectors,
    unlockedCrewIds,
    activeOptionalIds,
    activeRoute,
    activeTargetPos,
    pickTarget,
    layers,
    filter,
  ]);

  useEffect(() => {
    controllerRef.current?.setTouchMode(touchMode);
  }, [touchMode]);

  const handleSelectAndFocus = (target: MapPickTarget, x: number, z: number, dist = 54) => {
    setPickTarget(target);
    controllerRef.current?.focusPoint(x, z, dist);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4 bg-black/80">
      <div className="w-full max-w-6xl max-h-[92vh] flex flex-col bg-[#0e1526] border-2 border-white/15 rounded-3xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Compass className="w-5 h-5 text-orange-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-xl font-bold text-white truncate">
                3D Mars Terrain &amp; Colony Navigation Map
              </h2>
              <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                True 1:1 elevation model · Drag to orbit, pinch/scroll to zoom, tap markers to inspect or route
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Map"
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Grid */}
        <div className="p-3 sm:p-5 overflow-y-auto astro-scroll">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* LEFT: Interactive 3D Map Viewport + Layer Controls + Sol Controls */}
            <div className="lg:col-span-7 space-y-3">
              {/* Top Toolbar: Category Filter + Touch Mode + Layers Button */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="grid grid-cols-5 gap-1 bg-slate-950 p-1 rounded-xl border border-white/10 flex-1 min-w-[280px]">
                  {(
                    [
                      { id: 'all', label: `All (${ALL_MAP_LOCATIONS.length})` },
                      { id: 'colony', label: `Colony (${COLONY_MAP_LOCATIONS.length})` },
                      { id: 'exploration', label: `Explore (${discoveredExplorationCount}/${EXPLORATION_MAP_LOCATIONS.length})` },
                      { id: 'optional', label: `Tasks (${visibleOptionalTasks.length})` },
                      { id: 'crew', label: `Crew (${crewMembers.length})` },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setFilter(t.id)}
                      className={`py-1.5 px-1 rounded-lg text-[10px] sm:text-[11px] font-bold cursor-pointer whitespace-nowrap transition-colors ${
                        filter === t.id
                          ? 'bg-orange-500 text-slate-950'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-white/10">
                    <button
                      onClick={() => setTouchMode('rotate')}
                      title="1-Finger Drag: Rotate 3D Terrain"
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                        touchMode === 'rotate' ? 'bg-sky-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Orbit className="w-3.5 h-3.5" /> Orbit
                    </button>
                    <button
                      onClick={() => setTouchMode('pan')}
                      title="1-Finger Drag: Pan Terrain"
                      className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                        touchMode === 'pan' ? 'bg-sky-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Hand className="w-3.5 h-3.5" /> Pan
                    </button>
                  </div>

                  <button
                    onClick={() => setShowLayerMenu((v) => !v)}
                    className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      showLayerMenu
                        ? 'bg-amber-500 text-slate-950 border-amber-300'
                        : 'bg-slate-950 border-white/15 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" /> Layers
                  </button>
                </div>
              </div>

              {/* Independent Map Layer Toggles */}
              {showLayerMenu && (
                <div className="p-2.5 rounded-2xl bg-slate-950 border border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {LAYER_META.map((item) => {
                    const active = layers[item.key];
                    return (
                      <button
                        key={item.key}
                        onClick={() => setLayers((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                        className={`px-2 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                          active
                            ? 'bg-sky-500/20 border-sky-400/50 text-sky-100'
                            : 'bg-slate-900 border-white/10 text-slate-500'
                        }`}
                      >
                        {active ? (
                          <Eye className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        )}
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* 3D Terrain Map Viewport */}
              <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-[#1a0e0b] h-[330px] sm:h-[420px] select-none">
                <div ref={mountRef} className="w-full h-full" />

                {/* Screen-Projected Non-Overlapping Labels */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {labels.map((lbl) => (
                    <button
                      key={lbl.key}
                      onClick={(e) => {
                        e.stopPropagation();
                        setPickTarget(lbl.target);
                      }}
                      style={{
                        left: `${lbl.x}px`,
                        top: `${lbl.y}px`,
                        transform: 'translate(-50%, -100%)',
                        borderColor: lbl.selected ? '#38bdf8' : `${lbl.accentHex}88`,
                      }}
                      className={`pointer-events-auto absolute px-1.5 py-0.5 rounded-md border text-[10px] font-bold leading-tight shadow-md cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                        lbl.selected
                          ? 'bg-sky-950 text-white z-20'
                          : 'bg-[#0b1222]/92 text-slate-100 hover:bg-slate-800 z-10'
                      }`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: lbl.accentHex }}
                      />
                      <span>{lbl.text}</span>
                      {lbl.subText && (
                        <span className="text-[9px] text-amber-300 font-mono-num">{lbl.subText}</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Top-Left North & Telemetry Chip */}
                <div className="pointer-events-none absolute top-2.5 left-2.5 flex items-center gap-2">
                  <div className="px-2 py-1 rounded-lg bg-[#0b1222]/92 border border-white/15 text-[10px] font-bold text-slate-200 flex items-center gap-1.5">
                    <span className="text-orange-400 font-extrabold">N↑</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-mono-num text-sky-300">
                      Alex {Math.round(telemetry?.altitudeM ?? 0)}m elev
                    </span>
                  </div>
                </div>

                {/* Top-Right Quick Focus Camera Buttons */}
                <div className="absolute top-2.5 right-2.5 flex flex-wrap justify-end gap-1">
                  <button
                    onClick={() => {
                      const px = telemetry?.playerX ?? 0;
                      const pz = telemetry?.playerZ ?? 6;
                      controllerRef.current?.focusPoint(px, pz, 46);
                    }}
                    title="Center on Alex"
                    className="px-2 py-1 rounded-lg bg-[#0b1222]/92 hover:bg-slate-800 border border-white/15 text-[10px] font-bold text-sky-200 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Crosshair className="w-3 h-3 text-sky-400" /> Center Alex
                  </button>
                  <button
                    onClick={() => controllerRef.current?.setColonyView()}
                    title="Zoom to Colony"
                    className="px-2 py-1 rounded-lg bg-[#0b1222]/92 hover:bg-slate-800 border border-white/15 text-[10px] font-bold text-orange-200 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Focus className="w-3 h-3 text-orange-400" /> Colony
                  </button>
                  <button
                    onClick={() => controllerRef.current?.resetView()}
                    title="Reset Default 3D View"
                    className="px-2 py-1 rounded-lg bg-[#0b1222]/92 hover:bg-slate-800 border border-white/15 text-[10px] font-bold text-slate-200 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                </div>

                {/* Bottom-Right On-Screen Rotation / Tilt / Zoom Controls */}
                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 bg-[#0b1222]/92 border border-white/15 rounded-xl p-1">
                  <button
                    onClick={() => controllerRef.current?.rotateBy(-0.45)}
                    title="Rotate Left"
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-200 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => controllerRef.current?.rotateBy(0.45)}
                    title="Rotate Right"
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-200 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-px h-4 bg-white/15" />
                  <button
                    onClick={() => controllerRef.current?.tiltBy(-0.18)}
                    title="Tilt Top-Down"
                    className="px-1.5 py-1 rounded-lg hover:bg-slate-800 text-[10px] font-bold text-slate-200 cursor-pointer"
                  >
                    Top
                  </button>
                  <button
                    onClick={() => controllerRef.current?.tiltBy(0.18)}
                    title="Tilt Horizon Relief"
                    className="px-1.5 py-1 rounded-lg hover:bg-slate-800 text-[10px] font-bold text-slate-200 cursor-pointer"
                  >
                    3D
                  </button>
                  <span className="w-px h-4 bg-white/15" />
                  <button
                    onClick={() => controllerRef.current?.zoomBy(0.76)}
                    title="Zoom In"
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-200 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => controllerRef.current?.zoomBy(1.28)}
                    title="Zoom Out"
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-200 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Compact 3D Legend Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#0b1222] text-[10px] text-slate-300 border border-white/10">
                <span className="text-sky-300">Cyan Path: EVA Walk Route</span>
                <span className="text-amber-300">Amber Track: 6x6 MEV Drive Route</span>
                <span className="text-yellow-300">Yellow Contours: 3m Elevation</span>
                <span className="text-pink-300">Colored Beacons: Live Crew</span>
              </div>

              {/* Preserved Sol Time & 5-Stage Weather Controls */}
              <div className="p-3 rounded-2xl bg-slate-900 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Sun className="w-4 h-4 text-amber-300" /> Martian Sol &amp; Storm Preview
                  </span>
                  {telemetry && (
                    <span className="font-mono-num text-sky-300">
                      {telemetry.solTimeLabel} · {telemetry.solPhase}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {onSetSolTime && (
                    <>
                      <button
                        onClick={() => onSetSolTime(0.26)}
                        className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-amber-200 cursor-pointer"
                      >
                        Sunrise
                      </button>
                      <button
                        onClick={() => onSetSolTime(0.5)}
                        className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-orange-200 cursor-pointer"
                      >
                        Midday
                      </button>
                      <button
                        onClick={() => onSetSolTime(0.75)}
                        className="py-1.5 px-2 rounded-lg bg-sky-900/70 hover:bg-sky-800 text-[11px] font-bold text-sky-200 cursor-pointer"
                      >
                        Blue Sunset
                      </button>
                      <button
                        onClick={() => onSetSolTime(0.95)}
                        className="py-1.5 px-2 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-[11px] font-bold text-indigo-200 cursor-pointer"
                      >
                        Night + Moons
                      </button>
                    </>
                  )}
                  {onCycleWeather && (
                    <button
                      onClick={onCycleWeather}
                      className="py-1.5 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-[11px] font-bold text-amber-200 cursor-pointer"
                    >
                      Next Weather
                    </button>
                  )}
                </div>

                {onSetStormStage && (
                  <div className="grid grid-cols-5 gap-1 pt-1 border-t border-white/10">
                    {([1, 2, 3, 4, 5] as StormStage[]).map((st) => (
                      <button
                        key={st}
                        onClick={() => onSetStormStage(st)}
                        className={`py-1 px-1.5 rounded-lg text-[10px] font-bold cursor-pointer border ${
                          telemetry?.stormStage === st
                            ? 'bg-orange-500 text-slate-950 border-orange-300'
                            : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-white/10'
                        }`}
                      >
                        Stage {st}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: Selected Inspector + Active 3D Route + Scrollable Directory */}
            <div className="lg:col-span-5 space-y-3">
              <div className="p-4 rounded-2xl bg-slate-900 border border-sky-400/30 space-y-2.5">
                {selected.kind === 'location' && (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-sky-300">
                          {selected.loc.category === 'colony' ? 'Colony Building' : 'Exploration Zone'} ·{' '}
                          {selected.loc.subCategory}
                        </div>
                        <h3 className="font-display text-base font-extrabold text-white mt-0.5">
                          {selected.loc.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-white/10 font-mono-num text-[11px] font-bold text-sky-300">
                          {selectedElevationM >= 0 ? `+${selectedElevationM}` : selectedElevationM}m elev
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-white/10 font-mono-num text-[11px] font-bold text-amber-300">
                          {selectedDistM}m
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed">{selected.loc.description}</p>

                    {(() => {
                      const status =
                        selected.loc.category === 'colony'
                          ? getBuildingLiveStatus(selected.loc.id, visualState, telemetry)
                          : {
                              label: selected.discovered ? 'Charted Site · Active' : 'Uncharted',
                              tone: 'nominal' as const,
                            };
                      const here =
                        telemetry?.npcStatuses.filter(
                          (n) => Math.hypot(n.x - selected.loc.x, n.z - selected.loc.z) < 7.5,
                        ) ?? [];
                      return (
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 rounded-xl bg-slate-950 border border-white/10">
                            <div className="text-slate-400">Current Status</div>
                            <div
                              className={`font-bold ${
                                status.tone === 'alert'
                                  ? 'text-red-300'
                                  : status.tone === 'warning'
                                    ? 'text-amber-300'
                                    : 'text-emerald-300'
                              }`}
                            >
                              {status.label}
                            </div>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-950 border border-white/10">
                            <div className="text-slate-400">Crew Present</div>
                            <div className="font-bold text-sky-200 truncate">
                              {here.length > 0 ? here.map((h) => h.name).join(', ') : 'Unoccupied'}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {routeLowRangeWarning && telemetry && (
                      <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-400/50 text-[11px] text-red-100 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold">Battery Range Warning!</div>
                          <div>
                            Destination is {selectedDistM}m away, exceeding safe usable range (
                            {telemetry.vehicleSafeRangeM}m at {telemetry.vehicleBatteryPct}% battery).
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => controllerRef.current?.focusPoint(selected.loc.x, selected.loc.z, 42)}
                        className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-100 font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Focus className="w-3.5 h-3.5" /> Zoom
                      </button>
                      {onSetRoute && (
                        <button
                          onClick={() =>
                            onSetRoute({
                              id: selected.loc.id,
                              name: selected.loc.name,
                              category: selected.loc.category,
                              x: drivingRover ? selected.loc.approachX : selected.loc.x,
                              z: drivingRover ? selected.loc.approachZ : selected.loc.z,
                            })
                          }
                          className="flex-1 py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          {drivingRover ? '3D Driving Route' : '3D Walking Route'}
                        </button>
                      )}
                      {selected.loc.id === 'charging_station' && onOpenChargingStation && (
                        <button
                          onClick={() => {
                            onClose();
                            onOpenChargingStation();
                          }}
                          className="py-2.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/45 text-cyan-200 font-bold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <PlugZap className="w-3.5 h-3.5" /> Charging Bay
                        </button>
                      )}
                    </div>
                  </>
                )}

                {selected.kind === 'optional' && (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-300">
                          Optional Exploration · {selected.task.categoryLabel}
                        </div>
                        <h3 className="font-display text-base font-extrabold text-white mt-0.5">
                          {selected.task.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 font-mono-num text-[11px] font-bold text-cyan-200">
                          +{selected.task.rewardPoints} pts
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-white/10 font-mono-num text-[11px] font-bold text-amber-300">
                          {selectedDistM}m
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">{selected.task.description}</p>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-white/10 text-[11px] text-sky-200">
                      Action nearby: <strong className="text-white">{selected.task.promptAction}</strong>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => controllerRef.current?.focusPoint(selected.task.x, selected.task.z, 46)}
                        className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-100 font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Focus className="w-3.5 h-3.5" /> Zoom
                      </button>
                      {onSetRoute && (
                        <button
                          onClick={() =>
                            onSetRoute({
                              id: selected.task.id,
                              name: selected.task.title,
                              category: 'optional',
                              x: selected.task.x,
                              z: selected.task.z,
                            })
                          }
                          className="flex-1 py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          {drivingRover ? '3D Driving Route' : '3D Walking Route'}
                        </button>
                      )}
                    </div>
                  </>
                )}

                {selected.kind === 'crew' && (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-pink-300">
                          Crew Telemetry · {selected.role}
                        </div>
                        <h3 className="font-display text-base font-extrabold text-white mt-0.5">
                          {selected.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-white/10 font-mono-num text-[11px] font-bold text-sky-300">
                          {selectedElevationM >= 0 ? `+${selectedElevationM}` : selectedElevationM}m
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-white/10 font-mono-num text-[11px] font-bold text-amber-300">
                          {selectedDistM}m
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-200 space-y-1">
                      <div>
                        <span className="text-slate-400">Location:</span> <strong>{selected.locationName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400">Current Activity:</span>{' '}
                        <span className="text-sky-300 font-semibold">{selected.activity}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => controllerRef.current?.focusPoint(selected.x, selected.z, 38)}
                        className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-100 font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Focus className="w-3.5 h-3.5" /> Zoom
                      </button>
                      {selected.id !== 'alex' && onSetRoute && (
                        <button
                          onClick={() =>
                            onSetRoute({
                              id: `crew_${selected.id}`,
                              name: selected.name,
                              category: 'crew',
                              x: selected.x,
                              z: selected.z,
                            })
                          }
                          className="flex-1 py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          Route to {selected.name}
                        </button>
                      )}
                    </div>
                  </>
                )}

                {selected.kind === 'mev' && (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                          Colony Vehicle · 6x6 Pressurized MEV
                        </div>
                        <h3 className="font-display text-base font-extrabold text-white mt-0.5">
                          Exploration Rover (MEV)
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-white/10 font-mono-num text-[11px] font-bold text-amber-300">
                        {selectedDistM}m
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="p-2 rounded-xl bg-slate-950 border border-white/10">
                        <div className="text-slate-400">Battery &amp; Range</div>
                        <div className="font-bold text-cyan-300 font-mono-num">
                          {telemetry ? `${telemetry.vehicleBatteryPct}% · ${telemetry.vehicleSafeRangeM}m` : '100%'}
                        </div>
                      </div>
                      <div className="p-2 rounded-xl bg-slate-950 border border-white/10">
                        <div className="text-slate-400">Status</div>
                        <div className="font-bold text-emerald-300">
                          {telemetry?.vehicleChargingActive
                            ? 'Charging in Bay'
                            : drivingRover
                              ? 'Under Alex Control'
                              : 'Parked Ready'}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          controllerRef.current?.focusPoint(selectedCoords.x, selectedCoords.z, 40)
                        }
                        className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-100 font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Focus className="w-3.5 h-3.5" /> Zoom
                      </button>
                      {!drivingRover && onSetRoute && (
                        <button
                          onClick={() =>
                            onSetRoute({
                              id: 'mev_vehicle',
                              name: '6x6 MEV',
                              category: 'colony',
                              x: selectedCoords.x,
                              z: selectedCoords.z,
                            })
                          }
                          className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Navigation className="w-3.5 h-3.5" /> Walk to MEV
                        </button>
                      )}
                    </div>
                  </>
                )}

                {selected.kind === 'remote_rover' &&
                  (() => {
                    const lr = LOST_ROVERS.find((r) => r.id === selected.roverId) ?? LOST_ROVERS[0];
                    const resolved = resolvedRovers.includes(lr.id);
                    return (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-[10px] font-extrabold uppercase tracking-wider text-orange-300">
                              Remote Rover Signal · {lr.signalFreqMHz}
                            </div>
                            <h3 className="font-display text-base font-extrabold text-white mt-0.5">
                              {lr.name}
                            </h3>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-white/10 font-mono-num text-[11px] font-bold text-amber-300">
                            {selectedDistM}m
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed">
                          {resolved ? lr.realHistoricalFact : lr.transmissionClue}
                        </p>
                        <div className="text-[11px] text-sky-300 font-semibold">
                          Status: {resolved ? 'Recovered & Synced' : `Last Known Beacon · ${lr.diagnosticIssue}`}
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => controllerRef.current?.focusPoint(lr.x, lr.z, 54)}
                            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-100 font-bold text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <Focus className="w-3.5 h-3.5" /> Zoom
                          </button>
                          {onSetRoute && (
                            <button
                              onClick={() =>
                                onSetRoute({
                                  id: `rover_${lr.id}`,
                                  name: lr.name,
                                  category: 'exploration',
                                  x: lr.x,
                                  z: lr.z,
                                })
                              }
                              className="flex-1 py-2.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              Route to Last Known Position
                            </button>
                          )}
                        </div>
                      </>
                    );
                  })()}

                {activeRoute && onClearRoute && (
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-sky-300 font-semibold truncate">
                      Active {activeRoute.mode === 'vehicle' ? 'Drive' : 'Walk'} Route:{' '}
                      {activeRoute.destinationName} ({activeRoute.totalDistanceM}m
                      {activeRoute.mode === 'vehicle' ? ` · ~${activeRoute.estimatedEnergyPct}% batt` : ''})
                    </span>
                    <button
                      onClick={onClearRoute}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold cursor-pointer shrink-0"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Vehicle Battery & Simulated Environment Summary */}
              {telemetry && (
                <div className="p-3 rounded-2xl bg-slate-900 border border-white/10 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-slate-950">
                    <div className="text-slate-400 flex items-center gap-1">
                      <BatteryCharging className="w-3 h-3 text-cyan-300" /> MEV Safe Range
                    </div>
                    <div className="font-mono-num font-bold text-white">
                      {telemetry.vehicleSafeRangeM}m ({telemetry.vehicleBatteryPct}% ·{' '}
                      {telemetry.vehicleBatteryKwh.toFixed(1)} kWh)
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950">
                    <div className="text-slate-400 flex items-center gap-1">
                      <Moon className="w-3 h-3 text-slate-300" /> Phobos / Deimos
                    </div>
                    <div className="font-mono-num font-bold text-sky-200">
                      {telemetry.phobosVisible ? `Up ${telemetry.phobosElevationDeg}°` : 'Below'} ·{' '}
                      {telemetry.deimosVisible ? `Up ${telemetry.deimosElevationDeg}°` : 'Below'}
                    </div>
                  </div>
                  <div className="col-span-2 text-[11px] text-slate-300">
                    <strong>
                      Stage {telemetry.stormStage}: {telemetry.stormStageLabel}
                    </strong>{' '}
                    (GAME SIMULATION) — {STORM_STAGE_SPECS[telemetry.stormStage].kidNote}
                  </div>
                </div>
              )}

              {/* Directory List Matching Filter */}
              <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>
                  {filter === 'crew'
                    ? `Crew & Vehicles (${crewMembers.length + 1 + visibleRemoteRovers.length})`
                    : filter === 'optional'
                      ? `Optional Exploration Tasks (${visibleOptionalTasks.length} Active)`
                      : filter === 'exploration'
                        ? `Exploration Zones (${discoveredExplorationCount}/${EXPLORATION_MAP_LOCATIONS.length} Discovered)`
                        : `3D Mars Directory (${COLONY_MAP_LOCATIONS.length} Buildings + ${discoveredExplorationCount}/${EXPLORATION_MAP_LOCATIONS.length} Zones)`}
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto astro-scroll space-y-1.5 pr-1">
                {filter === 'optional' ? (
                  visibleOptionalTasks.length === 0 ? (
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10 text-xs text-slate-300">
                      All unlocked optional exploration tasks are complete! Continue main missions to reveal more sites.
                    </div>
                  ) : (
                    visibleOptionalTasks.map((task) => {
                      const isSel = pickTarget.kind === 'optional' && pickTarget.id === task.id;
                      const dist = telemetry
                        ? Math.round(Math.hypot(task.x - telemetry.playerX, task.z - telemetry.playerZ))
                        : 0;
                      return (
                        <button
                          key={task.id}
                          onClick={() =>
                            handleSelectAndFocus({ kind: 'optional', id: task.id }, task.x, task.z, 46)
                          }
                          className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer ${
                            isSel
                              ? 'bg-cyan-950/60 border-cyan-400/60'
                              : 'bg-slate-900 border-white/10 hover:bg-slate-800'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 shrink-0 text-cyan-400" />
                              <span className="truncate">{task.title}</span>
                            </div>
                            <div className="text-[11px] text-cyan-300 truncate">
                              {task.categoryLabel} · +{task.rewardPoints} pts
                            </div>
                          </div>
                          <span className="font-mono-num text-[11px] text-amber-300 font-bold shrink-0">
                            {dist}m
                          </span>
                        </button>
                      );
                    })
                  )
                ) : filter === 'crew' ? (
                  <>
                    {crewMembers.map((cm) => {
                      const isSel = pickTarget.kind === 'crew' && pickTarget.id === cm.id;
                      return (
                        <button
                          key={cm.id}
                          onClick={() =>
                            handleSelectAndFocus({ kind: 'crew', id: cm.id }, cm.x, cm.z, 38)
                          }
                          className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer ${
                            isSel
                              ? 'bg-sky-950/60 border-sky-400/60'
                              : 'bg-slate-900 border-white/10 hover:bg-slate-800'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-white">
                              {cm.name} <span className="text-slate-400 font-normal">· {cm.role}</span>
                            </div>
                            <div className="text-[11px] text-sky-300">
                              {cm.locationName} — {cm.activity}
                            </div>
                          </div>
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: cm.color }}
                          />
                        </button>
                      );
                    })}
                    <button
                      onClick={() =>
                        handleSelectAndFocus(
                          { kind: 'mev' },
                          telemetry?.roverX ?? 21.3,
                          telemetry?.roverZ ?? 1.6,
                          42,
                        )
                      }
                      className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer ${
                        pickTarget.kind === 'mev'
                          ? 'bg-sky-950/60 border-sky-400/60'
                          : 'bg-slate-900 border-white/10 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <div className="font-bold text-white">6x6 Exploration Vehicle (MEV)</div>
                          <div className="text-[11px] text-amber-300">
                            Battery {telemetry?.vehicleBatteryPct ?? 100}% · Safe {telemetry?.vehicleSafeRangeM ?? 0}m
                          </div>
                        </div>
                      </div>
                    </button>
                    {visibleRemoteRovers.map((lr) => (
                      <button
                        key={lr.id}
                        onClick={() =>
                          handleSelectAndFocus({ kind: 'remote_rover', id: lr.id }, lr.x, lr.z, 54)
                        }
                        className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer ${
                          pickTarget.kind === 'remote_rover' && pickTarget.id === lr.id
                            ? 'bg-sky-950/60 border-sky-400/60'
                            : 'bg-slate-900 border-white/10 hover:bg-slate-800'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-white">{lr.name}</div>
                          <div className="text-[11px] text-orange-300">
                            {resolvedRovers.includes(lr.id) ? 'Synced' : `Last Signal · ${lr.signalFreqMHz}`}
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                ) : (
                  ALL_MAP_LOCATIONS.filter((loc) =>
                    filter === 'all' ? true : loc.category === filter,
                  ).map((loc) => {
                    const discovered = isExplorationDiscovered(loc);
                    const isSel = pickTarget.kind === 'location' && pickTarget.id === loc.id;
                    const dist = telemetry
                      ? Math.round(Math.hypot(loc.x - telemetry.playerX, loc.z - telemetry.playerZ))
                      : 0;
                    if (!discovered) {
                      return (
                        <div
                          key={loc.id}
                          className="p-2.5 rounded-xl bg-slate-900/45 border border-white/8 flex items-center justify-between text-xs text-slate-500"
                        >
                          <div className="flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            <span>Uncharted Sector Site (Explore or Scan Mars to Reveal)</span>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={loc.id}
                        onClick={() =>
                          handleSelectAndFocus(
                            { kind: 'location', id: loc.id },
                            loc.x,
                            loc.z,
                            loc.category === 'colony' ? 42 : 58,
                          )
                        }
                        className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer ${
                          isSel
                            ? 'bg-sky-950/60 border-sky-400/60'
                            : 'bg-slate-900 border-white/10 hover:bg-slate-800'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 shrink-0" style={{ color: loc.accentHex }} />
                            <span className="truncate">{loc.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">{loc.subCategory}</div>
                        </div>
                        <span className="font-mono-num text-[11px] text-amber-300 font-bold shrink-0">
                          {dist}m
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
