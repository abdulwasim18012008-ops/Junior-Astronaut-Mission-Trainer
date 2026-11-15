import React from 'react';
import {
  AlertTriangle,
  BatteryCharging,
  CheckCircle2,
  Compass,
  PlugZap,
  ShieldAlert,
  X,
  Zap,
} from 'lucide-react';
import { MEV_BATTERY_RESERVE_PCT } from '../game/marsConfig';
import { soundEngine } from '../game/soundEngine';
import { EnvironmentTelemetry } from '../game/types';

interface ChargingStationModalProps {
  telemetry: EnvironmentTelemetry;
  colonyPowerPct: number;
  chargingRequested: boolean;
  onToggleCharging: () => void;
  onNavigateToBay?: () => void;
  onClose: () => void;
}

export const ChargingStationModal: React.FC<ChargingStationModalProps> = ({
  telemetry,
  colonyPowerPct,
  chargingRequested,
  onToggleCharging,
  onNavigateToBay,
  onClose,
}) => {
  const inBay = telemetry.vehicleInChargingBay;
  const charging = telemetry.vehicleChargingActive;
  const full = telemetry.vehicleBatteryPct >= 99;
  const lowGrid = colonyPowerPct < 20;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/88 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-900 border border-white/15 shadow-2xl overflow-hidden my-auto">
        <div className="px-5 py-4 bg-gradient-to-r from-cyan-950/75 via-slate-900 to-slate-900 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
              <PlugZap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-300">
                  Colony Power Grid &amp; Mobility
                </span>
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/35 text-[10px] font-bold text-cyan-200 uppercase">
                  Bay A &amp; Bay B
                </span>
              </div>
              <h2 className="font-display text-lg sm:text-xl font-extrabold text-white">
                Vehicle Charging Station
              </h2>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            aria-label="Close Charging Station"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Status Banner */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
              lowGrid
                ? 'bg-red-950/60 border-red-400/50 text-red-100'
                : charging
                  ? 'bg-cyan-950/60 border-cyan-400/50 text-cyan-100'
                  : inBay
                    ? 'bg-emerald-950/45 border-emerald-400/40 text-emerald-100'
                    : 'bg-amber-950/50 border-amber-400/40 text-amber-100'
            }`}
          >
            <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
              {lowGrid ? (
                <ShieldAlert className="w-5 h-5 shrink-0 text-red-300" />
              ) : charging ? (
                <BatteryCharging className="w-5 h-5 shrink-0 text-cyan-300" />
              ) : inBay ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-300" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-300" />
              )}
              <span>
                {lowGrid
                  ? 'Colony Power Reserve < 20% — Charging paused to protect habitat life support!'
                  : charging
                    ? `Charging ${telemetry.vehicleChargingBayId === 'BAY_B' ? 'Bay B' : 'Bay A'} (+${telemetry.vehicleChargeRatePctPerSec.toFixed(1)}%/s · ${telemetry.vehicleTimeToFullSec}s to full)`
                    : full && inBay
                      ? '6x6 Exploration Vehicle fully charged (100%) and ready for expedition!'
                      : inBay
                        ? `MEV parked in ${telemetry.vehicleChargingBayId === 'BAY_B' ? 'Bay B' : 'Bay A'}. Tap Start Charging to transfer colony grid energy.`
                        : `MEV is ${telemetry.vehicleDistToChargerM}m away. Drive into Bay A (open west gantry) to charge.`}
              </span>
            </div>

            {!inBay && onNavigateToBay && (
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onNavigateToBay();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shrink-0 cursor-pointer flex items-center gap-1"
              >
                <Compass className="w-3.5 h-3.5" /> Set Route
              </button>
            )}
          </div>

          {/* Bay Occupancy Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              className={`p-3.5 rounded-2xl border ${
                telemetry.vehicleChargingBayId === 'BAY_A'
                  ? 'bg-cyan-950/35 border-cyan-400/55'
                  : 'bg-slate-950/80 border-white/10'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="text-cyan-300">Bay A · Pressurized MEV Bay</span>
                <span className={telemetry.vehicleChargingBayId === 'BAY_A' ? 'text-emerald-300' : 'text-slate-400'}>
                  {telemetry.vehicleChargingBayId === 'BAY_A' ? 'MEV Docked' : 'Open'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                High-output umbilical &amp; inductive pad for the 2,400 kg 6-wheel Exploration Vehicle.
              </p>
            </div>

            <div
              className={`p-3.5 rounded-2xl border ${
                telemetry.vehicleChargingBayId === 'BAY_B'
                  ? 'bg-cyan-950/35 border-cyan-400/55'
                  : 'bg-slate-950/80 border-white/10'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className="text-sky-300">Bay B · Utility Service Bay</span>
                <span className="text-sky-200">
                  {telemetry.vehicleChargingBayId === 'BAY_B' ? 'MEV Docked' : 'Utility Standby'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Auxiliary colony utility pod dock with backup inductive pad &amp; winter thermal trickle.
              </p>
            </div>
          </div>

          {/* Battery & Grid Telemetry */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-2xl bg-slate-950 border border-white/10">
              <div className="text-[11px] text-slate-400 font-semibold">MEV Battery</div>
              <div className="font-mono-num text-base font-extrabold text-white mt-0.5">
                {telemetry.vehicleBatteryPct}%
              </div>
              <div className="text-[11px] font-mono-num text-cyan-300">
                {telemetry.vehicleBatteryKwh.toFixed(1)} / {telemetry.vehicleCapacityKwh.toFixed(0)} kWh
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-white/10">
              <div className="text-[11px] text-slate-400 font-semibold">Safe Usable Range</div>
              <div className="font-mono-num text-base font-extrabold text-emerald-300 mt-0.5">
                {telemetry.vehicleSafeRangeM} m
              </div>
              <div className="text-[11px] text-slate-400">
                Keeps {MEV_BATTERY_RESERVE_PCT}% emergency reserve
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-white/10">
              <div className="text-[11px] text-slate-400 font-semibold">Avg Consumption</div>
              <div className="font-mono-num text-base font-extrabold text-amber-300 mt-0.5">
                {telemetry.vehicleConsumptionWhPerM} Wh/m
              </div>
              <div className="text-[11px] text-slate-400">
                Mars gravity 3.71 m/s² load
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950 border border-white/10">
              <div className="text-[11px] text-slate-400 font-semibold">Colony Grid Power</div>
              <div
                className={`font-mono-num text-base font-extrabold mt-0.5 ${
                  lowGrid ? 'text-red-400' : colonyPowerPct < 55 ? 'text-amber-300' : 'text-emerald-300'
                }`}
              >
                {Math.round(colonyPowerPct)}%
              </div>
              <div className="text-[11px] text-slate-400">
                {colonyPowerPct >= 55 ? 'Fast Charge (3.2%/s)' : lowGrid ? 'Paused (<20%)' : 'Eco Charge (1.7%/s)'}
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-200">Charge Level</span>
              <span className="font-mono-num text-cyan-300">
                {telemetry.vehicleBatteryPct}% · Max {telemetry.vehicleEstimatedRangeM} m
              </span>
            </div>
            <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  telemetry.vehicleBatteryPct < 25
                    ? 'bg-red-500'
                    : telemetry.vehicleBatteryPct < 60
                      ? 'bg-amber-400'
                      : 'bg-cyan-400'
                }`}
                style={{ width: `${telemetry.vehicleBatteryPct}%` }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              onClick={() => {
                soundEngine.playClick();
                onToggleCharging();
              }}
              disabled={!inBay || full || lowGrid}
              className={`flex-1 py-3 px-4 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors ${
                !inBay || full || lowGrid
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : chargingRequested
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 cursor-pointer'
              }`}
            >
              <Zap className="w-4 h-4" />
              {full
                ? 'Battery Full (100%)'
                : !inBay
                  ? 'Park Vehicle in Bay A First'
                  : lowGrid
                    ? 'Grid Power Too Low (<20%)'
                    : chargingRequested
                      ? 'Stop Charging'
                      : 'Start Real-Time Charging'}
            </button>

            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
