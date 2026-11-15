import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BatteryCharging,
  Building2,
  Car,
  ChevronDown,
  ChevronUp,
  Compass,
  Crosshair,
  Eye,
  Home,
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Mountain,
  Navigation,
  RotateCcw,
  Search,
  Sparkles,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { LiveHudSnapshot, SaveProgress } from '../types/game';
import { NAMED_CRATERS, WORLD_PLAYABLE_RADIUS } from '../game/lunarTerrain';
import {
  CAMPAIGN_MISSIONS,
  OPTIONAL_ACTIVITIES,
  WORLD_LOCATIONS,
} from '../game/missions';
import {
  BASE_FACILITIES,
  CAMERA_PRESETS,
  CameraPresetId,
  COLONY_TUNNELS,
  formatRegionForCoords,
  getFacilityStatus,
  getMissionById,
  getRevealedLocationIds,
  MAP_LAYER_MODES,
  MapLayerMode,
  MapMarkerItem,
  searchMapEntities,
} from '../game/mapData';
import { LunarMap3DScene, ProjectedMapLabel } from '../game/LunarMap3DScene';

interface MinimapProps {
  hud: LiveHudSnapshot;
  progress: SaveProgress;
  onOpenFullMap: () => void;
}

const FACILITY_SHORT_CODE: Record<string, string> = {
  mission_control: 'MC',
  research_habitat: 'Hab',
  lunar_research_lab: 'Lab',
  geological_lab: 'Geo',
  oxygen_facility: 'O₂',
  water_station: 'H₂O',
  solar_station: 'Sun',
  solar_charging_bay: '⚡',
  greenhouse: 'Bio',
  medical_module: 'Med',
  rover_garage: 'EV',
  comm_tower: 'Com',
  radiation_shelter: 'Shd',
  sample_storage: 'Box',
  observatory: 'Obs',
  crew_quarters: 'Bed',
  launch_pad: 'Pad',
};

const MINIMAP_RADIUS_M = 88; // Local tactical zoom around astronaut
const MINIMAP_PX_R = 76;
const MINIMAP_CENTER = 90;

export const LunarMinimap: React.FC<MinimapProps> = ({ hud, progress, onOpenFullMap }) => {
  const revealedIds = getRevealedLocationIds(progress);

  const toLocal = (wx: number, wz: number) => ({
    sx: MINIMAP_CENTER + ((wx - hud.playerX) / MINIMAP_RADIUS_M) * MINIMAP_PX_R,
    sy: MINIMAP_CENTER + ((wz - hud.playerZ) / MINIMAP_RADIUS_M) * MINIMAP_PX_R,
  });

  const baseCenter = toLocal(0, 0);
  const evPos = toLocal(hud.evX, hud.evZ);
  const chargeGarage = toLocal(0, 26);
  const chargeSolar = toLocal(40, -6);

  // Target marker + perimeter clamping if target is beyond local radar radius
  let tgtDraw: { sx: number; sy: number; clamped: boolean; angleDeg: number } | null = null;
  if (hud.targetX !== null && hud.targetZ !== null) {
    const dx = hud.targetX - hud.playerX;
    const dz = hud.targetZ - hud.playerZ;
    const d = Math.hypot(dx, dz);
    const angleDeg = (Math.atan2(dx, -dz) * 180) / Math.PI;
    if (d <= MINIMAP_RADIUS_M - 4) {
      const p = toLocal(hud.targetX, hud.targetZ);
      tgtDraw = { sx: p.sx, sy: p.sy, clamped: false, angleDeg };
    } else if (d > 0.1) {
      const rEdge = MINIMAP_PX_R - 4;
      tgtDraw = {
        sx: MINIMAP_CENTER + (dx / d) * rEdge,
        sy: MINIMAP_CENTER + (dz / d) * rEdge,
        clamped: true,
        angleDeg,
      };
    }
  }

  const routeSvgPoints =
    hud.showGoldenTrail && hud.targetX !== null && hud.targetZ !== null
      ? hud.routeWaypoints.length >= 2
        ? hud.routeWaypoints
            .map(([wx, wz]) => {
              const p = toLocal(wx, wz);
              return `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`;
            })
            .join(' ')
        : `${MINIMAP_CENTER},${MINIMAP_CENTER} ${toLocal(hud.targetX, hud.targetZ).sx.toFixed(1)},${toLocal(hud.targetX, hud.targetZ).sy.toFixed(1)}`
      : '';

  const arrowDeg = ((Math.PI - hud.playerHeading) * 180) / Math.PI;
  const distToBase = Math.hypot(hud.playerX, hud.playerZ);

  return (
    <button
      onClick={onOpenFullMap}
      title="Open Full 3D World Map (M)"
      className="pointer-events-auto group relative flex flex-col items-center rounded-2xl border border-slate-700 bg-slate-950/95 p-2.5 shadow-2xl transition-colors hover:border-amber-400"
    >
      <div className="relative">
        <svg viewBox="0 0 180 180" className="h-40 w-40 rounded-full bg-slate-900">
          <defs>
            <clipPath id="lunarMinimapClip">
              <circle cx="90" cy="90" r={MINIMAP_PX_R} />
            </clipPath>
            <radialGradient id="lunarMinimapBg" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#162238" />
              <stop offset="100%" stopColor="#09101f" />
            </radialGradient>
          </defs>

          {/* Background radar disc */}
          <circle cx="90" cy="90" r={MINIMAP_PX_R} fill="url(#lunarMinimapBg)" stroke="#334155" strokeWidth="1.4" />
          <circle cx="90" cy="90" r={MINIMAP_PX_R * 0.55} fill="none" stroke="#1e293b" strokeWidth="0.9" strokeDasharray="3 3" />

          <g clipPath="url(#lunarMinimapClip)">
            {/* Base Colony Perimeter */}
            {distToBase < 165 && (
              <circle
                cx={baseCenter.sx}
                cy={baseCenter.sy}
                r={(56 / MINIMAP_RADIUS_M) * MINIMAP_PX_R}
                fill="rgba(30, 58, 138, 0.16)"
                stroke="rgba(56, 189, 248, 0.35)"
                strokeWidth="1"
                strokeDasharray="4 3"
              />
            )}

            {/* Colony Tunnels */}
            {distToBase < 165 &&
              COLONY_TUNNELS.map(([x1, z1, x2, z2], idx) => {
                const a = toLocal(x1, z1);
                const b = toLocal(x2, z2);
                return (
                  <line
                    key={idx}
                    x1={a.sx}
                    y1={a.sy}
                    x2={b.sx}
                    y2={b.sy}
                    stroke="#334155"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                );
              })}

            {/* Nearby Lunar Craters */}
            {NAMED_CRATERS.map((c) => {
              const p = toLocal(c.x, c.z);
              const r = (c.radius / MINIMAP_RADIUS_M) * MINIMAP_PX_R;
              if (Math.hypot(p.sx - 90, p.sy - 90) - r > MINIMAP_PX_R + 6) return null;
              return (
                <circle
                  key={c.id}
                  cx={p.sx}
                  cy={p.sy}
                  r={Math.max(4, r)}
                  fill="rgba(15, 23, 42, 0.52)"
                  stroke="rgba(148, 163, 184, 0.28)"
                  strokeWidth="1"
                />
              );
            })}

            {/* Colony Buildings with clear icons & readable short labels */}
            {BASE_FACILITIES.map((f) => {
              const p = toLocal(f.x, f.z);
              if (Math.hypot(p.sx - 90, p.sy - 90) > MINIMAP_PX_R + 12) return null;
              const isCharging = f.iconKind === 'charging' || f.id === 'rover_garage';
              const shortCode = FACILITY_SHORT_CODE[f.id] ?? '';
              return (
                <g key={f.id} transform={`translate(${p.sx}, ${p.sy})`}>
                  <rect
                    x="-6.5"
                    y="-6.5"
                    width="13"
                    height="13"
                    rx="3.2"
                    fill="#0f172a"
                    stroke={isCharging ? '#22d3ee' : f.accentHex}
                    strokeWidth="1.2"
                  />
                  <text
                    x="0"
                    y="2.5"
                    textAnchor="middle"
                    fill={isCharging ? '#67e8f9' : '#f8fafc'}
                    fontSize="5.6"
                    fontWeight="800"
                  >
                    {shortCode}
                  </text>
                </g>
              );
            })}

            {/* Revealed Outer Landmarks & Historic Site */}
            {WORLD_LOCATIONS.filter((l) => l.category !== 'colony' && revealedIds.has(l.id)).map((l) => {
              const p = toLocal(l.x, l.z);
              if (Math.hypot(p.sx - 90, p.sy - 90) > MINIMAP_PX_R + 8) return null;
              if (l.id === 'apollo_11_site') {
                return (
                  <g key={l.id} transform={`translate(${p.sx}, ${p.sy})`}>
                    <circle r="5.5" fill="#fbbf24" stroke="#ffffff" strokeWidth="1.2" />
                    <text y="12" textAnchor="middle" fill="#fde68a" fontSize="6.5" fontWeight="800">
                      Historic
                    </text>
                  </g>
                );
              }
              return (
                <circle
                  key={l.id}
                  cx={p.sx}
                  cy={p.sy}
                  r="4.2"
                  fill="#0284c7"
                  stroke="#bae6fd"
                  strokeWidth="1.1"
                />
              );
            })}

            {/* Cyan Charging Pad Rings */}
            <circle cx={chargeGarage.sx} cy={chargeGarage.sy} r="8" fill="none" stroke="#22d3ee" strokeWidth="1" strokeDasharray="2 2" opacity="0.8" />
            <circle cx={chargeSolar.sx} cy={chargeSolar.sy} r="8" fill="none" stroke="#22d3ee" strokeWidth="1" strokeDasharray="2 2" opacity="0.8" />

            {/* Golden Navigation Trail */}
            {routeSvgPoints && (
              <polyline
                points={routeSvgPoints}
                fill="none"
                stroke="#facc15"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="4.5 3"
              />
            )}

            {/* Crew NPCs with initials */}
            {hud.crewPositions.map((c) => {
              const cp = toLocal(c.x, c.z);
              if (Math.hypot(cp.sx - 90, cp.sy - 90) > MINIMAP_PX_R + 8) return null;
              return (
                <g key={c.id} transform={`translate(${cp.sx}, ${cp.sy})`}>
                  <circle r="5.2" fill="#059669" stroke="#a7f3d0" strokeWidth="1.1" />
                  <text y="2.2" textAnchor="middle" fill="#ffffff" fontSize="6.2" fontWeight="800">
                    {c.name.charAt(0)}
                  </text>
                </g>
              );
            })}

            {/* Lunar EV Rover */}
            {Math.hypot(evPos.sx - 90, evPos.sy - 90) <= MINIMAP_PX_R + 8 && (
              <g transform={`translate(${evPos.sx}, ${evPos.sy})`}>
                <rect x="-6.5" y="-5" width="13" height="10" rx="2.5" fill="#f97316" stroke="#fff7ed" strokeWidth="1.2" />
                <text y="2.2" textAnchor="middle" fill="#ffffff" fontSize="5.4" fontWeight="900">
                  EV
                </text>
              </g>
            )}

            {/* Player Facing FOV Cone & Arrow at Center */}
            <g transform={`translate(${MINIMAP_CENTER}, ${MINIMAP_CENTER}) rotate(${arrowDeg})`}>
              <path d="M0,0 L-13,-26 A28,28 0 0,1 13,-26 Z" fill="rgba(56, 189, 248, 0.24)" />
              <polygon points="0,-8 5.8,5.5 0,2.5 -5.8,5.5" fill="#ffffff" stroke="#f59e0b" strokeWidth="1.5" />
            </g>
          </g>

          {/* Active Objective Diamond (clamped smoothly to perimeter if far away) */}
          {tgtDraw && (
            <g transform={`translate(${tgtDraw.sx}, ${tgtDraw.sy})`}>
              {tgtDraw.clamped ? (
                <g transform={`rotate(${tgtDraw.angleDeg})`}>
                  <polygon points="0,-7 5.5,4.5 -5.5,4.5" fill="#facc15" stroke="#0f172a" strokeWidth="1.2" />
                </g>
              ) : (
                <>
                  <circle r="7.5" fill="rgba(250, 204, 21, 0.2)" stroke="#fde047" strokeWidth="1.1" />
                  <polygon points="0,-5 5,0 0,5 -5,0" fill="#facc15" stroke="#0f172a" strokeWidth="1" />
                </>
              )}
            </g>
          )}

          {/* Compass Cardinals */}
          <text x="90" y="10" textAnchor="middle" fill="#f8fafc" fontSize="9.5" fontWeight="900">N</text>
          <text x="171" y="93" textAnchor="middle" fill="#94a3b8" fontSize="8.5" fontWeight="800">E</text>
          <text x="90" y="176" textAnchor="middle" fill="#94a3b8" fontSize="8.5" fontWeight="800">S</text>
          <text x="9" y="93" textAnchor="middle" fill="#94a3b8" fontSize="8.5" fontWeight="800">W</text>
        </svg>
      </div>

      {/* Compact Mini-Legend & Quick Distance */}
      <div className="mt-1.5 flex w-full items-center justify-between gap-2 px-1 text-[11px] font-bold text-slate-200">
        <span>3D Map (M)</span>
        {hud.targetX !== null && (
          <span className="text-amber-400 tabular-nums">{hud.distanceToTarget}m</span>
        )}
      </div>
      <div className="mt-1 flex items-center justify-center gap-2 text-[9px] font-bold text-slate-400">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" />Goal</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-sm bg-sky-400" />Base</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-sm bg-orange-500" />EV</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />Crew</span>
      </div>
    </button>
  );
};

interface FullMapProps {
  hud: LiveHudSnapshot;
  progress: SaveProgress;
  onClose: () => void;
}

type SelectionState =
  | { kind: 'building'; facilityId: string }
  | { kind: 'location'; locId: string; titleOverride?: string; descOverride?: string }
  | { kind: 'crew'; crewId: string }
  | { kind: 'rover' }
  | { kind: 'optional'; optionalId: string }
  | { kind: 'apollo'; discovered: boolean }
  | null;

const DOCK_LAYERS = MAP_LAYER_MODES;

export const LunarMapModal: React.FC<FullMapProps> = ({ hud, progress, onClose }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<LunarMap3DScene | null>(null);

  const [layerMode, setLayerMode] = useState<MapLayerMode>('exploration');
  const [activePreset, setActivePreset] = useState<CameraPresetId>('overview');
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [camDist, setCamDist] = useState(480);
  const [projectedLabels, setProjectedLabels] = useState<ProjectedMapLabel[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selection, setSelection] = useState<SelectionState>(null);

  const revealedIds = useMemo(() => getRevealedLocationIds(progress), [progress]);
  const currentMission = CAMPAIGN_MISSIONS[progress.currentMissionIndex] ?? null;
  const currentObjective = currentMission?.objectives[progress.currentObjectiveIndex] ?? null;
  const searchResults = useMemo(
    () => searchMapEntities(searchQuery, hud, progress),
    [searchQuery, hud, progress],
  );

  // Keep latest handlers in refs so Three.js scene mounts ONCE per modal session
  const handleSelectMarkerRef = useRef<(m: MapMarkerItem) => void>(() => {});

  const selectMarker = useCallback((m: MapMarkerItem) => {
    const scene = sceneRef.current;
    if (m.entityKind === 'base_hub') {
      setActivePreset('base');
      scene?.applyPreset('base');
      setSelection({ kind: 'building', facilityId: 'mission_control' });
      scene?.highlightLocation(0, -18, 8.5, '#38bdf8');
      return;
    }
    if (m.id === 'player:mc') {
      scene?.flyTo(hud.playerX, hud.playerZ, 52);
      scene?.highlightLocation(hud.playerX, hud.playerZ, 4.5, '#ffffff');
      setSelection(null);
      return;
    }
    if (m.entityKind === 'building' && m.facilityId) {
      setSelection({ kind: 'building', facilityId: m.facilityId });
      scene?.flyTo(m.x, m.z, 52);
      scene?.highlightLocation(m.x, m.z, 7.5, m.accentHex);
    } else if (m.entityKind === 'crew' && m.crewId) {
      setSelection({ kind: 'crew', crewId: m.crewId });
      scene?.flyTo(m.x, m.z, 42);
      scene?.highlightLocation(m.x, m.z, 4.5, '#34d399');
    } else if (m.entityKind === 'rover') {
      setSelection({ kind: 'rover' });
      scene?.flyTo(m.x, m.z, 48);
      scene?.highlightLocation(m.x, m.z, 5.5, '#fb923c');
    } else if (m.entityKind === 'optional' && m.optionalId) {
      setSelection({ kind: 'optional', optionalId: m.optionalId });
      scene?.flyTo(m.x, m.z, 64);
      scene?.highlightLocation(m.x, m.z, 6.0, '#c084fc');
    } else if (m.entityKind === 'apollo') {
      setSelection({ kind: 'apollo', discovered: m.markerKind === 'apollo_discovered' });
      scene?.flyTo(m.x, m.z, 68);
      scene?.highlightLocation(m.x, m.z, 7.5, m.markerKind === 'apollo_discovered' ? '#fbbf24' : '#94a3b8');
    } else if (m.locId) {
      setSelection({
        kind: 'location',
        locId: m.locId,
        titleOverride: m.name,
        descOverride: m.subtitle,
      });
      scene?.flyTo(m.x, m.z, 115);
      scene?.highlightLocation(m.x, m.z, 11, m.accentHex);
    }
  }, [hud.playerX, hud.playerZ]);

  handleSelectMarkerRef.current = selectMarker;

  // Mount real Three.js 3D Open-World Map ONCE
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const mapScene = new LunarMap3DScene(container, hud, progress, {
      onSelectMarker: (m) => handleSelectMarkerRef.current(m),
      onCameraMetrics: (dist, labels) => {
        setCamDist(Math.round(dist));
        setProjectedLabels(labels);
      },
      onHoverMarker: (id) => setHoveredId(id),
    });
    sceneRef.current = mapScene;

    return () => {
      mapScene.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize Three.js viewport when fullscreen toggles
  useEffect(() => {
    const t = window.setTimeout(() => {
      sceneRef.current?.resizeNow();
    }, 60);
    return () => clearTimeout(t);
  }, [isFullscreen]);

  // Sync live game HUD, mission progress, and layer mode into the 3D scene
  useEffect(() => {
    sceneRef.current?.syncState(hud, progress, layerMode);
  }, [hud, progress, layerMode]);

  // Keyboard Escape closes the map safely
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        if (e.key === 'Escape') {
          (target as HTMLInputElement).blur();
          setSearchFocused(false);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handlePresetClick = (presetId: CameraPresetId) => {
    setActivePreset(presetId);
    sceneRef.current?.applyPreset(presetId);
  };

  const handleLayerSelect = (mode: MapLayerMode) => {
    setLayerMode(mode);
    if (mode === 'base') {
      setActivePreset('base');
      sceneRef.current?.applyPreset('base');
    } else if (mode === 'npcs') {
      sceneRef.current?.flyTo(0, 0, 105);
    } else if (mode === 'rover') {
      sceneRef.current?.flyTo(hud.evX, hud.evZ, 90);
    }
  };

  const handleLocatePlayer = () => {
    sceneRef.current?.flyTo(hud.playerX, hud.playerZ, 68);
    sceneRef.current?.highlightLocation(hud.playerX, hud.playerZ, 4.5, '#ffffff');
  };

  const handleFlyToMission = () => {
    if (hud.targetX === null || hud.targetZ === null) return;
    sceneRef.current?.flyTo(hud.targetX, hud.targetZ, 88);
    sceneRef.current?.highlightLocation(hud.targetX, hud.targetZ, 9.5, '#facc15');
    if (currentObjective?.targetLocationId) {
      const fac = BASE_FACILITIES.find((f) => f.id === currentObjective.targetLocationId);
      if (fac) setSelection({ kind: 'building', facilityId: fac.id });
      else setSelection({ kind: 'location', locId: currentObjective.targetLocationId });
    }
  };

  const handleResetView = () => {
    setActivePreset('overview');
    sceneRef.current?.applyPreset('overview');
    setSelection(null);
  };

  // Context Inspector Card (compact floating card top-right, only shown when user selects an object)
  const renderInspectorCard = () => {
    if (!selection) return null;

    if (selection.kind === 'building') {
      const f = BASE_FACILITIES.find((b) => b.id === selection.facilityId);
      if (!f) return null;
      const st = getFacilityStatus(f.id, progress, hud);
      const dist = Math.round(Math.hypot(hud.playerX - f.x, hud.playerZ - f.z));
      const linkedMissions = f.relatedMissionIds
        .map((id) => getMissionById(id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m));

      return (
        <div className="pointer-events-auto w-80 rounded-2xl border border-slate-700 bg-slate-950/94 p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[11px] font-bold tracking-wider text-sky-400 uppercase">
                Lunar Base Facility
              </div>
              <h3 className="text-base font-extrabold text-white">{f.name}</h3>
            </div>
            <button
              onClick={() => setSelection(null)}
              aria-label="Dismiss info"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{f.purpose}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold">
            <span
              className={
                st.statusTone === 'amber'
                  ? 'text-amber-400'
                  : st.statusTone === 'emerald'
                  ? 'text-emerald-400'
                  : st.statusTone === 'cyan'
                  ? 'text-cyan-400'
                  : 'text-slate-300'
              }
            >
              {st.statusText}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-sky-300 tabular-nums">{dist} m away</span>
          </div>

          <div className="mt-3 border-t border-slate-800 pt-2.5">
            <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Available Interactions
            </div>
            <ul className="mt-1 space-y-1 text-xs text-slate-300">
              {f.interactions.map((act) => (
                <li key={act} className="flex items-start gap-1.5">
                  <span className="text-sky-400">•</span>
                  <span>{act}</span>
                </li>
              ))}
            </ul>
          </div>

          {linkedMissions.length > 0 && (
            <div className="mt-3 border-t border-slate-800 pt-2.5">
              <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                Mission Link
              </div>
              <div className="mt-1 space-y-1 text-xs">
                {linkedMissions.map((m) => {
                  const done = progress.completedMissions.includes(m.id);
                  const isCurr = currentMission?.id === m.id;
                  return (
                    <div
                      key={m.id}
                      className={`flex items-center justify-between font-semibold ${
                        isCurr ? 'text-amber-300' : done ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      <span className="truncate">{m.title}</span>
                      <span className="shrink-0 pl-2">{done ? '✓' : isCurr ? 'Active' : 'Later'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-3 flex justify-end">
            <button
              onClick={() => sceneRef.current?.flyTo(f.x, f.z, 34)}
              className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-sky-400"
            >
              Inspect Building Close-Up
            </button>
          </div>
        </div>
      );
    }

    if (selection.kind === 'crew') {
      const crew = hud.crewPositions.find((c) => c.id === selection.crewId);
      if (!crew) return null;
      const dist = Math.round(Math.hypot(hud.playerX - crew.x, hud.playerZ - crew.z));
      return (
        <div className="pointer-events-auto w-80 rounded-2xl border border-emerald-500/40 bg-slate-950/94 p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase">
                Crew Member · Live Tracking
              </div>
              <h3 className="text-base font-extrabold text-white">{crew.name}</h3>
            </div>
            <button onClick={() => setSelection(null)} className="rounded-lg p-1 text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-1 text-xs font-semibold text-emerald-300">{crew.role}</div>
          <p className="mt-1.5 text-xs text-slate-300">Activity: {crew.activity}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400 tabular-nums">
            <span>{formatRegionForCoords(crew.x, crew.z)}</span>
            <span>·</span>
            <span className="text-sky-300">{dist} m away</span>
          </div>
        </div>
      );
    }

    if (selection.kind === 'rover') {
      const dist = Math.round(Math.hypot(hud.playerX - hud.evX, hud.playerZ - hud.evZ));
      const dGarage = Math.round(Math.hypot(hud.evX - 0, hud.evZ - 26));
      const dSolar = Math.round(Math.hypot(hud.evX - 40, hud.evZ - -6));
      const nearestCharge = dGarage <= dSolar ? `Rover Garage (${dGarage} m)` : `Solar Charging Bay (${dSolar} m)`;
      return (
        <div className="pointer-events-auto w-80 rounded-2xl border border-orange-500/40 bg-slate-950/94 p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[11px] font-bold tracking-wider text-orange-400 uppercase">
                Lunar Electric Vehicle
              </div>
              <h3 className="text-base font-extrabold text-white">Exploration Rover</h3>
            </div>
            <button onClick={() => setSelection(null)} className="rounded-lg p-1 text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2.5 space-y-1.5 text-xs">
            <div className="flex items-center justify-between font-bold">
              <span className="text-slate-300">Battery Charge</span>
              <span className="text-orange-300 tabular-nums">{Math.round(hud.roverBattery)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full ${
                  hud.roverBattery <= 20 ? 'bg-rose-500' : hud.roverCharging ? 'bg-cyan-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, hud.roverBattery))}%` }}
              />
            </div>
            <div className="pt-1 text-slate-300">
              {hud.inVehicle ? 'Actively Driving' : hud.roverCharging ? 'Charging on Inductive Pad' : 'Parked Safely'}
            </div>
            <div className="text-slate-400 tabular-nums">
              {dist} m away · Nearest charger: {nearestCharge}
            </div>
          </div>
        </div>
      );
    }

    if (selection.kind === 'optional') {
      const opt = OPTIONAL_ACTIVITIES.find((o) => o.id === selection.optionalId);
      if (!opt) return null;
      const done = progress.completedOptionals.includes(opt.id);
      const dist = Math.round(Math.hypot(hud.playerX - opt.x, hud.playerZ - opt.z));
      return (
        <div className="pointer-events-auto w-80 rounded-2xl border border-purple-500/40 bg-slate-950/94 p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[11px] font-bold tracking-wider text-purple-300 uppercase">
                Optional Discovery · +{opt.points} pts
              </div>
              <h3 className="text-base font-extrabold text-white">{opt.title}</h3>
            </div>
            <button onClick={() => setSelection(null)} className="rounded-lg p-1 text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 text-xs text-slate-300">{opt.description}</p>
          <div className="mt-2 flex items-center gap-2 text-xs font-semibold">
            <span className={done ? 'text-emerald-400' : 'text-purple-300'}>
              {done ? 'Completed ✓' : 'Available to Explore'}
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-sky-300 tabular-nums">{dist} m away</span>
          </div>
        </div>
      );
    }

    if (selection.kind === 'apollo') {
      const loc = WORLD_LOCATIONS.find((l) => l.id === 'apollo_11_site')!;
      const dist = Math.round(Math.hypot(hud.playerX - loc.x, hud.playerZ - loc.z));
      return (
        <div className="pointer-events-auto w-80 rounded-2xl border border-amber-400/40 bg-slate-950/94 p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[11px] font-bold tracking-wider text-amber-400 uppercase">
                {selection.discovered ? 'Explored · Apollo 11 — Tranquility Base' : 'Unexplored Location'}
              </div>
              <h3 className="text-base font-extrabold text-white">{loc.name}</h3>
            </div>
            <button onClick={() => setSelection(null)} className="rounded-lg p-1 text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
            {selection.discovered ? loc.description : 'An unexplored historical location.'}
          </p>
          <div className="mt-2 text-xs font-semibold text-sky-300 tabular-nums">
            {selection.discovered
              ? 'Explored · Lunar Pioneer Badge Unlocked ✓ · +500 pts · '
              : 'Status: Unexplored · '}
            {dist} m away
          </div>
        </div>
      );
    }

    const loc = WORLD_LOCATIONS.find((l) => l.id === selection.locId);
    const title = loc?.name ?? selection.titleOverride ?? 'Lunar Region';
    const desc = loc?.description ?? selection.descOverride ?? 'Explorable lunar geological region.';
    const dist = loc ? Math.round(Math.hypot(hud.playerX - loc.x, hud.playerZ - loc.z)) : null;

    return (
      <div className="pointer-events-auto w-80 rounded-2xl border border-sky-500/40 bg-slate-950/94 p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[11px] font-bold tracking-wider text-sky-400 uppercase">
              {loc ? `${loc.category} · ${formatRegionForCoords(loc.x, loc.z)}` : 'Geographical Region'}
            </div>
            <h3 className="text-base font-extrabold text-white">{title}</h3>
          </div>
          <button onClick={() => setSelection(null)} className="rounded-lg p-1 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{desc}</p>
        {dist !== null && (
          <div className="mt-2 text-xs font-semibold text-sky-300 tabular-nums">{dist} m from your position</div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-0 sm:p-2">
      <div
        className={`relative overflow-hidden border border-slate-700 bg-slate-950 shadow-2xl transition-all ${
          isFullscreen ? 'h-full w-full rounded-none sm:rounded-2xl' : 'h-[90vh] w-[94vw] max-w-[1440px] rounded-2xl'
        }`}
      >
        {/* 100% Full-Bleed Real 3D World Map Viewport */}
        <div ref={mountRef} className="absolute inset-0 h-full w-full" />

        {/* Projected Distance-Aware 3D World Markers & Region Labels */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {projectedLabels.map((lbl) => {
            const { marker, screenX, screenY, showText, isRegion } = lbl;
            const isHovered = hoveredId === marker.id;

            if (isRegion) {
              return (
                <button
                  key={lbl.id}
                  onClick={() => {
                    sceneRef.current?.flyTo(marker.x, marker.z, 130);
                    sceneRef.current?.highlightLocation(marker.x, marker.z, 18, '#38bdf8');
                    setSelection({
                      kind: 'location',
                      locId: marker.locId ?? '',
                      titleOverride: marker.name,
                      descOverride: lbl.regionSubtitle,
                    });
                  }}
                  style={{ left: `${screenX}px`, top: `${screenY}px` }}
                  className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-700/70 bg-slate-950/75 px-2.5 py-1 text-center transition-colors hover:border-sky-400"
                >
                  <div className="text-[10px] font-black tracking-wider text-slate-200 uppercase whitespace-nowrap">
                    {marker.name}
                  </div>
                </button>
              );
            }

            const isMission = marker.markerKind === 'active_mission';
            const isBaseHub = marker.markerKind === 'base_hub';
            const isRover = marker.markerKind === 'rover';
            const isPlayer = marker.id === 'player:mc';
            const isDone = marker.markerKind === 'completed_mission';
            const isOpt = marker.markerKind === 'optional';
            const isApolloHidden = marker.markerKind === 'apollo_hidden';
            const isApolloDisc = marker.markerKind === 'apollo_discovered';

            return (
              <button
                key={lbl.id}
                onClick={() => selectMarker(marker)}
                style={{ left: `${screenX}px`, top: `${screenY}px` }}
                className="pointer-events-auto group absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5"
              >
                {/* Marker Emblem */}
                <span
                  className={`flex items-center justify-center rounded-full border shadow-md transition-transform group-hover:scale-110 ${
                    isHovered ? 'scale-110' : ''
                  } ${
                    isMission
                      ? 'h-7 w-7 border-slate-950 bg-amber-400 text-slate-950'
                      : isBaseHub
                      ? 'h-7 w-7 border-sky-300 bg-slate-950/92 text-sky-300'
                      : isPlayer
                      ? 'h-5 w-5 border-amber-400 bg-white text-slate-950'
                      : isRover
                      ? 'h-6 w-6 border-orange-200 bg-orange-500 text-white'
                      : isDone
                      ? 'h-5 w-5 border-emerald-200 bg-emerald-600 text-white'
                      : isApolloDisc
                      ? 'h-6 w-6 border-amber-100 bg-amber-500 text-slate-950'
                      : isApolloHidden
                      ? 'h-4 w-4 border-slate-500 bg-slate-900/80 text-slate-400'
                      : isOpt
                      ? 'h-4 w-4 rotate-45 border-purple-300 bg-slate-950/90 text-purple-300'
                      : marker.entityKind === 'crew'
                      ? 'h-5 w-5 border-emerald-200 bg-emerald-600 text-white'
                      : 'h-5 w-5 border-sky-300/70 bg-slate-950/90 text-sky-300'
                  }`}
                >
                  {isMission ? (
                    <Navigation className="h-3.5 w-3.5" />
                  ) : isBaseHub ? (
                    <Home className="h-3.5 w-3.5" />
                  ) : isPlayer ? (
                    <Crosshair className="h-3 w-3" />
                  ) : isRover ? (
                    <Car className="h-3.5 w-3.5" />
                  ) : isApolloDisc ? (
                    <Sparkles className="h-3.5 w-3.5" />
                  ) : isApolloHidden ? (
                    <span className="text-[9px]">◇</span>
                  ) : isOpt ? (
                    <span className="-rotate-45 text-[9px]">✦</span>
                  ) : marker.entityKind === 'crew' ? (
                    <Users className="h-3 w-3" />
                  ) : marker.entityKind === 'building' ? (
                    <Building2 className="h-3 w-3" />
                  ) : (
                    <MapPin className="h-3 w-3" />
                  )}
                </span>

                {/* Camera-Distance Scaled Text Label */}
                {(showText || isHovered) && (
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[11px] font-bold whitespace-nowrap shadow ${
                      isMission
                        ? 'border-amber-300 bg-slate-950/92 text-amber-300'
                        : isBaseHub
                        ? 'border-sky-400/60 bg-slate-950/92 text-sky-200'
                        : isPlayer
                        ? 'border-white/50 bg-slate-950/92 text-white'
                        : isRover
                        ? 'border-orange-400/60 bg-slate-950/92 text-orange-200'
                        : isApolloHidden
                        ? 'border-slate-700 bg-slate-950/80 text-slate-400'
                        : 'border-slate-700 bg-slate-950/90 text-slate-100'
                    }`}
                  >
                    {marker.name}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Top Bar: Title, Search with Fly-To Dropdown, Active Mission Tracker, Close */}
        <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap items-start justify-between gap-2">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/92 px-3.5 py-2 shadow-xl">
            <Compass className="h-5 w-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-black text-white sm:text-base">3D Lunar World Map</h2>
              <div className="text-[11px] font-medium text-slate-400 tabular-nums">
                Cam altitude {camDist} m · {revealedIds.size}/{WORLD_LOCATIONS.length} sites · {BASE_FACILITIES.length} base buildings
              </div>
            </div>

            {/* Search Input & Instant Fly-To Results */}
            <div className="relative ml-1 w-56 sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setSearchFocused(false), 160)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Fly to building, crater, crew..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900 py-1.5 pr-7 pl-8 text-xs font-semibold text-white placeholder-slate-400 focus:border-sky-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}

              {(searchFocused || searchQuery.trim().length > 0) && (
                <div className="absolute top-full left-0 z-30 mt-1.5 max-h-64 w-full overflow-y-auto rounded-xl border border-slate-700 bg-slate-950 p-1.5 shadow-2xl">
                  {searchResults.slice(0, 14).map((item) => {
                    const dist = Math.round(Math.hypot(hud.playerX - item.x, hud.playerZ - item.z));
                    return (
                      <button
                        key={item.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSearchFocused(false);
                          sceneRef.current?.flyTo(item.x, item.z, item.entityKind === 'building' ? 46 : 95);
                          sceneRef.current?.highlightLocation(item.x, item.z, item.entityKind === 'building' ? 7.5 : 10);
                          if (item.facilityId) setSelection({ kind: 'building', facilityId: item.facilityId });
                          else if (item.crewId) setSelection({ kind: 'crew', crewId: item.crewId });
                          else if (item.entityKind === 'rover') setSelection({ kind: 'rover' });
                          else if (item.entityKind === 'apollo')
                            setSelection({ kind: 'apollo', discovered: Boolean(progress.apolloDiscovered) });
                          else if (item.locId) setSelection({ kind: 'location', locId: item.locId });
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-slate-800"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="truncate font-bold text-white">{item.label}</div>
                          <div className="text-[10px] text-slate-400">{item.categoryLabel}</div>
                        </div>
                        <span className="shrink-0 text-[11px] font-semibold text-sky-300 tabular-nums">
                          {dist} m
                        </span>
                      </button>
                    );
                  })}
                  {searchResults.length === 0 && (
                    <div className="px-2 py-2 text-center text-xs text-slate-400">No matches found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Top Controls: Active Mission Banner + Fullscreen + Close */}
          <div className="pointer-events-auto flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/92 p-1.5 shadow-xl">
              {hud.targetX !== null && hud.targetZ !== null && (
                <button
                  onClick={handleFlyToMission}
                  title="Fly to Active Mission Objective"
                  className="flex items-center gap-2 rounded-xl border border-amber-400/50 bg-amber-400/15 px-3 py-1.5 text-left hover:bg-amber-400/25"
                >
                  <Navigation className="h-4 w-4 text-amber-400" />
                  <div className="max-w-[180px] truncate text-xs font-extrabold text-amber-200">
                    {currentMission?.title ?? hud.targetLabel}
                  </div>
                  <span className="text-xs font-black text-amber-400 tabular-nums">{hud.distanceToTarget}m</span>
                </button>
              )}

              <button
                onClick={() => setIsFullscreen((f) => !f)}
                title={isFullscreen ? 'Windowed Map' : 'Fullscreen Map'}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-200 hover:border-sky-400"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>

              <button
                onClick={onClose}
                className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700"
              >
                <X className="h-4 w-4" /> Close (M)
              </button>
            </div>

            {/* Selected Entity Card (top-right, dismissible) */}
            {renderInspectorCard()}
          </div>
        </div>

        {/* Collapsible Legend Card (Bottom-Left) */}
        {showLegend && (
          <div className="pointer-events-auto absolute bottom-24 left-4 w-72 rounded-2xl border border-slate-700 bg-slate-950/94 p-3.5 text-xs shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-extrabold tracking-wider text-slate-400 uppercase">3D Map Guide</span>
              <button onClick={() => setShowLegend(false)} className="text-slate-400 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] font-semibold">
              <span className="flex items-center gap-1.5 text-white">
                <Crosshair className="h-3.5 w-3.5 text-amber-400" /> You (Astronaut)
              </span>
              <span className="flex items-center gap-1.5 text-amber-300">
                <Navigation className="h-3.5 w-3.5" /> Active Mission
              </span>
              <span className="flex items-center gap-1.5 text-orange-300">
                <Car className="h-3.5 w-3.5" /> Lunar EV ({Math.round(hud.roverBattery)}%)
              </span>
              <span className="flex items-center gap-1.5 text-emerald-300">
                <Users className="h-3.5 w-3.5" /> Crew / Done
              </span>
              <span className="flex items-center gap-1.5 text-sky-300">
                <Building2 className="h-3.5 w-3.5" /> Base & Sites
              </span>
              <span className="flex items-center gap-1.5 text-cyan-300">
                <BatteryCharging className="h-3.5 w-3.5" /> Charging Pad
              </span>
              <span className="flex items-center gap-1.5 text-purple-300">
                <Eye className="h-3.5 w-3.5" /> Optional Discovery
              </span>
              <span className="flex items-center gap-1.5 text-amber-200">
                <Sparkles className="h-3.5 w-3.5" /> Historic Landing Site
              </span>
            </div>
            <div className="mt-2.5 border-t border-slate-800 pt-2 text-[10px] text-slate-400">
              Drag: Rotate · Right-Drag: Pan · Scroll: Zoom · Double-Click: Fly There
            </div>
          </div>
        )}

        {/* Unified Bottom Control Dock (Zero Viewport Occlusion) */}
        <div className="pointer-events-none absolute bottom-3 left-1/2 flex w-full max-w-[960px] -translate-x-1/2 flex-col items-center px-3">
          <button
            onClick={() => setDockCollapsed((c) => !c)}
            className="pointer-events-auto mb-1.5 flex items-center gap-1 rounded-t-xl rounded-b-lg border border-slate-700 bg-slate-950/92 px-3 py-1 text-[11px] font-bold text-slate-300 hover:border-sky-400 hover:text-white"
          >
            {dockCollapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {dockCollapsed ? 'Show Controls' : 'Hide Controls'}
          </button>

          {!dockCollapsed && (
            <div className="pointer-events-auto flex w-full flex-col gap-2 rounded-2xl border border-slate-700 bg-slate-950/94 px-3.5 py-2.5 shadow-2xl">
              {/* Row 1: Camera Views + Zoom / Locate / Reset */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="mr-1 flex items-center gap-1 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                    <Mountain className="h-3.5 w-3.5" /> Camera
                  </span>
                  {CAMERA_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handlePresetClick(p.id)}
                      title={p.description}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-bold whitespace-nowrap transition-colors ${
                        activePreset === p.id
                          ? 'border-sky-400 bg-sky-500 text-slate-950'
                          : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => sceneRef.current?.zoomBy(0.75)}
                    title="Zoom In"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-white hover:border-amber-400"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => sceneRef.current?.zoomBy(1.32)}
                    title="Zoom Out"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-white hover:border-amber-400"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleLocatePlayer}
                    className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-sky-300 whitespace-nowrap hover:border-sky-400"
                  >
                    <Crosshair className="h-3.5 w-3.5" /> Locate Me
                  </button>
                  <button
                    onClick={handleResetView}
                    className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-bold text-amber-300 whitespace-nowrap hover:border-amber-400"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                  </button>
                  <button
                    onClick={() => setShowLegend((s) => !s)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold whitespace-nowrap ${
                      showLegend
                        ? 'border-amber-400 bg-amber-400 text-slate-950'
                        : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500'
                    }`}
                  >
                    Legend
                  </button>
                </div>
              </div>

              {/* Row 2: Map Focus Layers */}
              <div className="flex flex-wrap items-center gap-1 border-t border-slate-800 pt-2">
                <span className="mr-1 flex items-center gap-1 text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                  <Layers className="h-3.5 w-3.5" /> Filter
                </span>
                {DOCK_LAYERS.map((layer) => (
                  <button
                    key={layer.id}
                    onClick={() => handleLayerSelect(layer.id)}
                    title={layer.description}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold whitespace-nowrap transition-colors ${
                      layerMode === layer.id
                        ? 'border-amber-400 bg-amber-400 text-slate-950'
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {layer.shortLabel}
                  </button>
                ))}
                <span className="ml-auto hidden text-[11px] text-slate-400 md:inline">
                  Drag: Rotate · Right-Drag: Pan · Double-Click: Fly To
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
