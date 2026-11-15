import React, { useState } from 'react';
import {
  AlertTriangle,
  BatteryCharging,
  CheckCircle2,
  Compass,
  DoorClosed,
  Eye,
  ShieldCheck,
  Thermometer,
  Wind,
  X,
} from 'lucide-react';
import { MARTIAN_WIND_DIR, STORM_STAGE_SPECS } from '../game/marsConfig';
import { soundEngine } from '../game/soundEngine';
import { EnvironmentTelemetry, StormStage } from '../game/types';

interface WeatherStationModalProps {
  telemetry: EnvironmentTelemetry;
  stormStage: StormStage;
  stormWarningActive: boolean;
  stormWarningCountdown: number;
  shelterDoorsClosed: boolean;
  stormShuttersClosed: boolean;
  solarDusty: boolean;
  insideShelter: boolean;
  outdoorGearSecured?: boolean;
  powerPct: number;
  onClose: () => void;
  onTriggerStormDrill: () => void;
  onToggleShelterDoors: (closed: boolean) => void;
  onSecureOutdoorGear?: () => void;
  onAdvanceToClearing: () => void;
}

export const WeatherStationModal: React.FC<WeatherStationModalProps> = ({
  telemetry,
  stormStage,
  stormWarningActive,
  stormWarningCountdown,
  shelterDoorsClosed,
  stormShuttersClosed,
  solarDusty,
  insideShelter,
  outdoorGearSecured = false,
  powerPct,
  onClose,
  onTriggerStormDrill,
  onToggleShelterDoors,
  onSecureOutdoorGear,
  onAdvanceToClearing,
}) => {
  const [mastViewActive, setMastViewActive] = useState(stormStage >= 3 || shelterDoorsClosed);
  const sSpec = STORM_STAGE_SPECS[stormStage];

  const crewInsideShelter = telemetry.npcStatuses.filter(
    (n) => n.buildingId === 'radiation_shelter',
  ).length;

  const warningHeadline =
    stormStage >= 4
      ? 'STORM ALERT: Regional Dust Storm Active — Stay Inside Shelter'
      : stormWarningActive || stormStage === 3
        ? `WARNING: Regional Dust Storm Approaching (${Math.max(0, Math.ceil(stormWarningCountdown))}s)`
        : stormStage === 2
          ? 'ADVISORY: Atmospheric Dust Increasing (WNW → ESE)'
          : stormStage === 5
            ? 'ALL-CLEAR WATCH: Storm Gradually Clearing — Inspect Solar Panels'
            : 'NOMINAL: Crisp Martian Atmosphere — Clear Horizon';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/88 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-3xl bg-slate-900 border border-white/15 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-950/70 via-slate-900 to-sky-950/70 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <Wind className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
                  Mars Weather Monitoring Station
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/35 text-[10px] font-bold text-amber-200 uppercase">
                  Game Simulation
                </span>
              </div>
              <h2 className="font-display text-lg sm:text-xl font-extrabold text-white">
                {sSpec.label} ({sSpec.shortTag})
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            aria-label="Close Weather Station"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Early Warning Banner */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
              stormStage >= 4
                ? 'bg-red-950/60 border-red-400/50 text-red-100'
                : stormWarningActive || stormStage === 3
                  ? 'bg-amber-950/60 border-amber-400/50 text-amber-100'
                  : 'bg-sky-950/50 border-sky-400/35 text-sky-100'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{warningHeadline}</span>
            </div>
            {stormStage <= 2 && (
              <button
                onClick={() => {
                  soundEngine.playRadioChirp();
                  onTriggerStormDrill();
                  setMastViewActive(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shrink-0 cursor-pointer"
              >
                Simulate Approaching Storm
              </button>
            )}
            {stormStage >= 4 && (
              <button
                onClick={() => {
                  soundEngine.playToolSuccess();
                  onAdvanceToClearing();
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold shrink-0 cursor-pointer"
              >
                Watch Storm Clear (Stage 5)
              </button>
            )}
          </div>

          {/* 5-Stage Progression Strip */}
          <div className="grid grid-cols-5 gap-1.5">
            {([1, 2, 3, 4, 5] as StormStage[]).map((st) => {
              const active = st === stormStage;
              const label =
                st === 1
                  ? '1 Calm'
                  : st === 2
                    ? '2 Light Dust'
                    : st === 3
                      ? '3 Rising'
                      : st === 4
                        ? '4 Storm'
                        : '5 Clearing';
              return (
                <div
                  key={st}
                  className={`py-2 px-1.5 rounded-xl text-center text-[11px] font-bold border ${
                    active
                      ? 'bg-amber-500 text-slate-950 border-amber-300 shadow'
                      : 'bg-slate-950/70 text-slate-400 border-white/10'
                  }`}
                >
                  {label}
                </div>
              );
            })}
          </div>

          {/* Telemetry Readout Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                <Compass className="w-3.5 h-3.5 text-sky-400" />
                Wind Vector
              </div>
              <div className="font-mono-num text-sm font-extrabold text-white mt-1">
                {MARTIAN_WIND_DIR.label}
              </div>
              <div className="text-[11px] text-sky-300 font-semibold">
                {telemetry.windSpeedMs} m/s surface breeze
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                Dust &amp; Visibility
              </div>
              <div className="font-mono-num text-sm font-extrabold text-white mt-1">
                {sSpec.visibilityPct}% Visible
              </div>
              <div className="text-[11px] text-amber-300 font-semibold">
                Dust Depth τ = {sSpec.dustTau.toFixed(2)}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                <Thermometer className="w-3.5 h-3.5 text-rose-400" />
                Temp (Out / In)
              </div>
              <div className="font-mono-num text-sm font-extrabold text-white mt-1">
                {telemetry.outsideTempC}°C / {telemetry.insideTempC}°C
              </div>
              <div className="text-[11px] text-emerald-300 font-semibold">
                Suit Heater Active
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold">
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                Solar Efficiency
              </div>
              <div className="font-mono-num text-sm font-extrabold text-white mt-1">
                {telemetry.solarEfficiencyPct}% Output
              </div>
              <div className="text-[11px] text-slate-300 font-semibold">
                Colony Battery {Math.round(powerPct)}%
              </div>
            </div>
          </div>

          {/* Shelter Prep Checklist + Mast Viewport Window */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Prep & Safety Controls */}
            <div className="p-4 rounded-2xl bg-slate-950/75 border border-white/10 space-y-2.5">
              <div className="text-xs font-extrabold uppercase tracking-wider text-sky-300">
                Dust Storm Shelter Preparation
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-200">
                  <span>1. Greenhouse Storm Shutters</span>
                  <span className={stormShuttersClosed ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold'}>
                    {stormShuttersClosed ? 'Secured' : 'Open (Check Greenhouse)'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-200">
                  <span>2. Crew Indoors ({crewInsideShelter}/4 in Shelter)</span>
                  <span className={crewInsideShelter === 4 ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold'}>
                    {crewInsideShelter === 4 ? 'All Safe Inside' : 'Preparing / Walking'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-200">
                  <span>3. Solar Wing Dust Status</span>
                  <span className={solarDusty ? 'text-amber-300 font-bold' : 'text-emerald-300 font-bold'}>
                    {solarDusty ? 'Dust Coating (Clean After)' : 'Clean'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-200">
                  <span>4. Outdoor Equipment &amp; Gear</span>
                  {outdoorGearSecured ? (
                    <span className="text-emerald-300 font-bold">Secured</span>
                  ) : onSecureOutdoorGear && stormStage >= 2 ? (
                    <button
                      onClick={() => {
                        soundEngine.playToolSuccess();
                        onSecureOutdoorGear();
                      }}
                      className="px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[11px] cursor-pointer"
                    >
                      Secure Gear Now
                    </button>
                  ) : (
                    <span className="text-sky-300 font-bold">Ready</span>
                  )}
                </div>
              </div>

              <div className="pt-1 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    soundEngine.playDoorAirlock(!shelterDoorsClosed);
                    onToggleShelterDoors(!shelterDoorsClosed);
                  }}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px] ${
                    shelterDoorsClosed
                      ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                      : 'bg-sky-600 text-white hover:bg-sky-500'
                  }`}
                >
                  {shelterDoorsClosed ? (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Shelter Blast Doors Sealed (Tap to Unseal)</span>
                    </>
                  ) : (
                    <>
                      <DoorClosed className="w-4 h-4" />
                      <span>{insideShelter ? 'Seal Shelter Blast Doors' : 'Seal Shelter Blast Doors'}</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setMastViewActive((v) => !v);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                >
                  {mastViewActive ? 'Hide Mast View' : 'Shelter Mast View'}
                </button>
              </div>
            </div>

            {/* Shelter External Mast Camera / Viewport Window */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
                  Shelter Viewport · External Mast Cam
                </span>
                <span className="text-[11px] font-mono-num text-slate-400">
                  SOL {telemetry.solNumber} · {telemetry.solTimeLabel}
                </span>
              </div>

              {mastViewActive ? (
                <div
                  className="relative h-28 rounded-xl overflow-hidden border border-white/15 flex items-end p-3"
                  style={{
                    background:
                      stormStage >= 4
                        ? 'linear-gradient(180deg, #7c381f 0%, #b4532a 55%, #6d2e18 100%)'
                        : stormStage === 3
                          ? 'linear-gradient(180deg, #9a4a2b 0%, #c86d42 58%, #7a341c 100%)'
                          : 'linear-gradient(180deg, #4b3d54 0%, #c7764b 56%, #8d3c20 100%)',
                  }}
                >
                  {/* Horizon Mesa Silhouette */}
                  <svg viewBox="0 0 320 70" className="absolute inset-x-0 bottom-0 w-full h-16 opacity-75">
                    <path
                      d="M0,70 L0,48 L35,34 L72,34 L98,46 L148,26 L186,26 L216,44 L268,36 L320,46 L320,70 Z"
                      fill={stormStage >= 4 ? '#522212' : '#4a1d10'}
                    />
                  </svg>
                  {/* Dust Haze Gradient */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: `linear-gradient(90deg, rgba(234,160,110,${sSpec.hazeOpacity * 0.6}) 0%, rgba(190,95,52,${sSpec.hazeOpacity * 0.45}) 100%)`,
                    }}
                  />
                  <div className="relative z-10 flex items-center justify-between w-full text-[11px] font-bold text-white drop-shadow">
                    <span>
                      {shelterDoorsClosed
                        ? 'Viewing safely behind sealed airlock viewport'
                        : 'Live exterior mast view'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-950/65 text-amber-200">
                      {sSpec.visibilityPct}% Clear
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-28 rounded-xl bg-slate-900/90 border border-dashed border-white/15 flex items-center justify-center text-xs text-slate-400">
                  Tap “Shelter Mast View” to inspect outdoor Martian dust conditions safely.
                </div>
              )}

              <p className="text-[11px] text-slate-300 mt-2 leading-snug">
                {sSpec.kidNote}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Note: Dust storms are Mars weather (distinct from Mission 8 radiation shielding).</span>
            </div>
            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer shrink-0"
            >
              Back to Colony
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
