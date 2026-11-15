import React from 'react';
import { BatteryCharging, CheckCircle2, Package, Rocket, Truck, X } from 'lucide-react';
import { SUPPLY_BUNDLES } from '../game/marsConfig';
import { CargoDeliveryState, SupplyBundleId, SurvivalResources } from '../game/types';

interface SupplyLogisticsModalProps {
  resources: SurvivalResources;
  vehicleBatteryPct: number;
  cargoDelivery: CargoDeliveryState;
  onRequestSupply: (bundleId: SupplyBundleId) => void;
  onClose: () => void;
}

const PHASE_LABEL: Record<CargoDeliveryState['phase'], string> = {
  IDLE: 'Cargo Landing Pad Clear — Ready for Order',
  CONFIRMED: 'Supply Request Confirmed by Orbital Logistics',
  IN_TRANSIT: 'Heavy Cargo Lander Descending From Mars Orbit…',
  DESCENDING: 'Retro-Thrusters Firing Over Cargo Pad…',
  UNLOADING: 'Cargo Ramp Lowered — Loading Robotic Transporter…',
  TRANSPORTING: 'Robotic Transporter Driving Crates to Warehouse…',
  DELIVERED: 'Resupply Stowed in Colony Warehouse!',
};

export const SupplyLogisticsModal: React.FC<SupplyLogisticsModalProps> = ({
  resources,
  vehicleBatteryPct,
  cargoDelivery,
  onRequestSupply,
  onClose,
}) => {
  const busy = cargoDelivery.phase !== 'IDLE' && cargoDelivery.phase !== 'DELIVERED';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/75">
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col bg-[#0e1526] border-2 border-amber-400/35 rounded-3xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Rocket className="w-5 h-5 text-amber-400" />
            <h2 className="font-display text-xl font-bold text-white">
              Colony Supply &amp; Cargo Resupply Terminal
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto astro-scroll space-y-5">
          {/* Live Colony Stock Overview */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { label: 'Air', val: `${Math.round(resources.air)}%`, low: resources.air < 55 },
              { label: 'Water', val: `${Math.round(resources.water)}%`, low: resources.water < 55 },
              { label: 'Power', val: `${Math.round(resources.power)}%`, low: resources.power < 55 },
              { label: 'Food', val: `${Math.round(resources.food)}%`, low: resources.food < 55 },
              { label: 'Parts', val: `${resources.spareParts}`, low: resources.spareParts <= 2 },
              { label: 'MEV Batt', val: `${vehicleBatteryPct}%`, low: vehicleBatteryPct < 35 },
            ].map((item) => (
              <div
                key={item.label}
                className={`p-2.5 rounded-xl border text-center ${
                  item.low ? 'bg-red-950/40 border-red-400/45' : 'bg-slate-900 border-white/10'
                }`}
              >
                <div className="text-[10px] font-semibold text-slate-400">{item.label}</div>
                <div className={`font-mono-num text-base font-bold ${item.low ? 'text-red-300' : 'text-white'}`}>
                  {item.val}
                </div>
              </div>
            ))}
          </div>

          {/* Active Cargo Resupply Status Tracker */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-amber-400/30 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                {cargoDelivery.phase === 'TRANSPORTING' ? (
                  <Truck className="w-4 h-4 text-amber-400" />
                ) : cargoDelivery.phase === 'DELIVERED' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Package className="w-4 h-4 text-sky-400" />
                )}
                <span>{PHASE_LABEL[cargoDelivery.phase]}</span>
              </div>
              <span className="font-mono-num text-xs font-bold text-amber-300">
                {busy
                  ? `ETA ~${Math.max(1, Math.ceil(cargoDelivery.etaSec))}s`
                  : `Deliveries Completed: ${cargoDelivery.deliveredCount}`}
              </span>
            </div>

            {busy && (
              <div className="space-y-1">
                <div className="text-xs text-sky-300">Shipment: {cargoDelivery.bundleName}</div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${Math.round(cargoDelivery.phaseProgress * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Orderable Resupply Bundles */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Request Orbital Cargo Lander Delivery (Lands at Northwest Cargo Pad)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SUPPLY_BUNDLES.map((bundle) => (
                <div
                  key={bundle.id}
                  className="p-4 rounded-2xl bg-slate-900 border border-white/12 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-base font-bold text-white">{bundle.name}</h3>
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-950 shrink-0"
                        style={{ backgroundColor: bundle.accentHex }}
                      >
                        ~{bundle.etaSec}s ETA
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{bundle.desc}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] font-bold">
                      {bundle.rewards.air && (
                        <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-200">+{bundle.rewards.air}% Air</span>
                      )}
                      {bundle.rewards.water && (
                        <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-200">
                          +{bundle.rewards.water}% Water
                        </span>
                      )}
                      {bundle.rewards.food && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200">
                          +{bundle.rewards.food}% Food
                        </span>
                      )}
                      {bundle.rewards.power && (
                        <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-200">
                          +{bundle.rewards.power}% Power
                        </span>
                      )}
                      {bundle.rewards.spareParts && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200">
                          +{bundle.rewards.spareParts} Spare Parts
                        </span>
                      )}
                      {bundle.rewards.roverBattery && (
                        <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-200 flex items-center gap-0.5">
                          <BatteryCharging className="w-3 h-3" /> +{bundle.rewards.roverBattery}% MEV
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    disabled={busy}
                    onClick={() => {
                      onRequestSupply(bundle.id);
                      onClose();
                    }}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors ${
                      busy
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-orange-500 hover:bg-orange-400 text-slate-950 cursor-pointer'
                    }`}
                  >
                    {busy ? 'Cargo Lander Already En Route' : 'Launch Cargo Resupply Lander'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
