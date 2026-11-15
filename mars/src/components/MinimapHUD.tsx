import React, { useEffect, useRef } from 'react';
import { Compass, Maximize2, Minimize2, Mountain, Navigation, X } from 'lucide-react';
import {
  createMars3DMinimapController,
  Mars3DMinimapController,
} from '../game/marsMap3D';
import { groundHeightAt } from '../game/marsTerrain';
import { CrewNpcId, EnvironmentTelemetry, LostRoverId, NavigationRoute } from '../game/types';

interface CompassBarProps {
  telemetry: EnvironmentTelemetry;
  activeTargetPos?: [number, number] | null;
  activeTargetLabel?: string;
}

function degToCardinal(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return dirs[idx];
}

export const DirectionalCompassBar: React.FC<CompassBarProps> = ({
  telemetry,
  activeTargetPos,
  activeTargetLabel,
}) => {
  const targetInfo = React.useMemo(() => {
    if (!activeTargetPos) return null;
    const dx = activeTargetPos[0] - telemetry.playerX;
    const dz = activeTargetPos[1] - telemetry.playerZ;
    const dist = Math.round(Math.hypot(dx, dz));
    const bearingDeg = Math.round(((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360);
    return {
      dist,
      bearingDeg,
      cardinal: degToCardinal(bearingDeg),
      shortLabel: activeTargetLabel ? activeTargetLabel.split('(')[0].trim() : 'Objective',
    };
  }, [activeTargetPos, activeTargetLabel, telemetry.playerX, telemetry.playerZ]);

  if (!targetInfo) return null;

  return (
    <div className="pointer-events-none flex justify-center w-full">
      <div className="bg-[#0b1222]/90 border border-white/15 rounded-xl px-3.5 py-1.5 shadow-lg flex items-center gap-3 text-[11px]">
        <span className="flex items-center gap-1 font-bold text-amber-300 font-mono-num">
          <Compass className="w-3.5 h-3.5 text-sky-400" />
          {targetInfo.bearingDeg}° {targetInfo.cardinal}
        </span>
        <span className="h-3 w-px bg-white/15" />
        <span className="text-slate-100 font-semibold truncate max-w-[180px] sm:max-w-[240px]">
          {targetInfo.shortLabel}
        </span>
        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 font-mono-num font-bold text-amber-200">
          {targetInfo.dist}m
        </span>
      </div>
    </div>
  );
};

interface MinimapHUDProps {
  telemetry: EnvironmentTelemetry;
  missionId: number;
  drivingRover: boolean;
  resolvedRovers: LostRoverId[];
  discoveredLandmarks?: string[];
  unlockedCrewIds?: CrewNpcId[];
  activeOptionalIds?: string[];
  activeTargetPos?: [number, number] | null;
  activeTargetLabel?: string;
  activeRoute?: NavigationRoute | null;
  onClearRoute?: () => void;
  evGuideActive?: boolean;
  expanded: boolean;
  paused?: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
  onOpenFullMap: () => void;
}

export const MinimapHUD: React.FC<MinimapHUDProps> = ({
  telemetry,
  missionId,
  drivingRover,
  resolvedRovers,
  discoveredLandmarks = [],
  unlockedCrewIds,
  activeOptionalIds,
  activeTargetPos = null,
  activeTargetLabel,
  activeRoute = null,
  onClearRoute,
  evGuideActive = false,
  expanded,
  paused = false,
  onToggleExpand,
  onClose,
  onOpenFullMap,
}) => {
  const isVehicleMode = drivingRover;
  const size = expanded ? 192 : isVehicleMode ? 158 : 136;
  const viewRadiusM = isVehicleMode || expanded ? 96 : 68;

  const mountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<Mars3DMinimapController | null>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const ctrl = createMars3DMinimapController(el, size);
    controllerRef.current = ctrl;
    return () => {
      ctrl.dispose();
      controllerRef.current = null;
    };
    // Mount once; size changes are handled via controller.resize(size)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    controllerRef.current?.resize(size);
  }, [size]);

  useEffect(() => {
    controllerRef.current?.updateState({
      telemetry,
      missionId,
      drivingRover,
      resolvedRovers,
      discoveredLandmarks,
      unlockedCrewIds,
      activeOptionalIds,
      activeTargetPos,
      activeRoute,
      viewRadiusM,
      paused,
      evGuideActive,
    });
  }, [
    telemetry,
    missionId,
    drivingRover,
    evGuideActive,
    resolvedRovers,
    discoveredLandmarks,
    unlockedCrewIds,
    activeOptionalIds,
    activeTargetPos,
    activeRoute,
    viewRadiusM,
    paused,
  ]);

  const targetDistM = activeTargetPos
    ? Math.round(Math.hypot(activeTargetPos[0] - telemetry.playerX, activeTargetPos[1] - telemetry.playerZ))
    : null;
  const routeDistM = activeRoute
    ? Math.round(Math.hypot(activeRoute.targetX - telemetry.playerX, activeRoute.targetZ - telemetry.playerZ))
    : null;
  const elevM = Math.round(groundHeightAt(telemetry.playerX, telemetry.playerZ) * 10) / 10;

  return (
    <div className="pointer-events-auto bg-[#0b1222]/94 border border-white/20 rounded-2xl p-2 shadow-2xl flex flex-col items-center gap-1.5">
      <div className="w-full flex items-center justify-between gap-1 px-1 text-[9px] font-bold text-sky-300">
        <span className="flex items-center gap-1 truncate">
          <Mountain className="w-3 h-3 shrink-0 text-orange-400" />
          {isVehicleMode ? 'MEV 3D MAP' : activeRoute ? '3D ROUTE' : '3D MARS'}
        </span>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={onToggleExpand}
            title={expanded ? 'Compact 3D Minimap' : 'Expand 3D Minimap'}
            className="p-1 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
          >
            {expanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
          <button
            onClick={onClose}
            title="Hide Minimap (M)"
            className="p-1 rounded hover:bg-slate-800 text-slate-300 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      <button
        onClick={onOpenFullMap}
        title="Tap to Open Interactive 3D Mars Terrain Map"
        style={{ width: size, height: size }}
        className="cursor-pointer rounded-2xl overflow-hidden border border-orange-500/45 hover:border-sky-400/80 transition-colors relative bg-[#1c0e0a]"
      >
        <div ref={mountRef} className="w-full h-full pointer-events-none" />
        <span className="pointer-events-none absolute top-1 left-1.5 px-1 py-0.2 rounded bg-slate-950/75 border border-white/15 text-[8px] font-bold text-slate-200 font-mono-num">
          N↑
        </span>
        <span className="pointer-events-none absolute bottom-1 right-1.5 px-1 py-0.2 rounded bg-slate-950/75 border border-white/15 text-[8px] font-mono-num text-amber-300">
          {elevM >= 0 ? `+${elevM}m` : `${elevM}m`}
        </span>
      </button>

      {activeRoute ? (
        <div className="w-full flex items-center justify-between gap-1 text-[9px] font-mono-num text-sky-200 px-0.5">
          <span className="flex items-center gap-1 truncate max-w-[125px]">
            <Navigation className="w-2.5 h-2.5 text-sky-400 shrink-0" />
            {activeRoute.destinationName} · {routeDistM}m
          </span>
          {onClearRoute && (
            <button
              onClick={onClearRoute}
              title="Clear Route"
              className="text-slate-400 hover:text-white cursor-pointer shrink-0 font-bold"
            >
              ×
            </button>
          )}
        </div>
      ) : (
        <div className="text-[9px] font-mono-num text-slate-200 leading-tight text-center max-w-[164px] truncate">
          {targetDistM !== null && activeTargetLabel
            ? `${activeTargetLabel.split('(')[0].trim()} · ${targetDistM}m`
            : isVehicleMode
              ? `${telemetry.vehicleSpeedKmh} km/h · Safe ${telemetry.vehicleSafeRangeM}m`
              : 'Tap for 3D Mars Map'}
        </div>
      )}
    </div>
  );
};
