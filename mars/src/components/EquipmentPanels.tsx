import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Check,
  Circle,
  Compass,
  Droplets,
  Fan,
  Gauge,
  Lightbulb,
  Radio,
  RotateCw,
  Shield,
  Sparkles,
  Sprout,
  Square,
  Star,
  Sun,
  Thermometer,
  Triangle,
  Wind,
  Wrench,
  Zap,
} from 'lucide-react';
import { LostRoverSpec } from '../game/roversData';
import { soundEngine } from '../game/soundEngine';
import { CrewRoleId, EquipmentPanelType } from '../game/types';

interface EquipmentPanelProps {
  panel: EquipmentPanelType;
  activeRole?: CrewRoleId;
  shelterShieldLevel?: number;
  oxygenGeneratorRepaired?: boolean;
  radioTransmissionPct?: number;
  radioTransmitted?: boolean;
  activeRover?: LostRoverSpec | null;
  onShieldProgress?: (level: number) => void;
  onRadioProgress?: (pct: number) => void;
  onComplete: () => void;
  onCancel: () => void;
}

export const EquipmentPanelModal: React.FC<EquipmentPanelProps> = ({
  panel,
  activeRole,
  shelterShieldLevel = 0,
  oxygenGeneratorRepaired = false,
  radioTransmissionPct = 0,
  radioTransmitted = false,
  activeRover = null,
  onShieldProgress,
  onRadioProgress,
  onComplete,
  onCancel,
}) => {
  const [repairCommitted, setRepairCommitted] = useState(false);

  const handleBackClick = () => {
    if (repairCommitted) {
      console.info('[EquipmentPanel] Repair already validated — committing completion instead of canceling');
      onComplete();
      return;
    }
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-black/78">
      <div className="w-full max-w-xl bg-[#0d1527] border-2 border-sky-400/40 rounded-3xl shadow-2xl overflow-hidden">
        {panel === 'm1_circuit_repair' && (
          <CircuitMatchWorkbench
            alreadyRepaired={oxygenGeneratorRepaired}
            onCommitted={() => setRepairCommitted(true)}
            onComplete={onComplete}
          />
        )}
        {panel === 'm1_filter_repair' && (
          <FilterRepairWorkbench
            alreadyRepaired={oxygenGeneratorRepaired}
            onCommitted={() => setRepairCommitted(true)}
            onComplete={onComplete}
          />
        )}
        {panel === 'm2_valve_turn' && <ValveTurnWorkbench onComplete={onComplete} />}
        {panel === 'm2_pipe_repair' && <PipeClampWorkbench onComplete={onComplete} />}
        {panel === 'm3_solar_clean' && <SolarWipeWorkbench onComplete={onComplete} />}
        {panel === 'm3_cable_plug' && <PowerBoxWorkbench onComplete={onComplete} />}
        {panel === 'm4_water_tube' && <GreenhouseWaterWorkbench onComplete={onComplete} />}
        {panel === 'm4_light_tuner' && <GrowLightWorkbench onComplete={onComplete} />}
        {panel === 'm4_seed_garden' && (
          <SeedGardenWorkbench isBotanist={activeRole === 'botanist'} onComplete={onComplete} />
        )}
        {panel === 'm5_dish_align' && <DishRotateWorkbench onComplete={onComplete} />}
        {panel === 'm5_radio_test' && (
          <RadioHoldWorkbench
            initialProgress={radioTransmissionPct}
            alreadyTransmitted={radioTransmitted}
            onProgressChange={onRadioProgress}
            onCommitted={() => setRepairCommitted(true)}
            onComplete={onComplete}
          />
        )}
        {panel === 'm6_rad_shielding' && (
          <RadShieldingWorkbench onProgress={onShieldProgress} onComplete={onComplete} />
        )}
        {panel === 'm6_rad_storm_drill' && (
          <RadStormDrillWorkbench
            shieldLevel={Math.max(shelterShieldLevel, 3)}
            onComplete={onComplete}
          />
        )}
        {panel === 'm7_battery_lever' && <StormBatteryWorkbench onComplete={onComplete} />}
        {panel === 'm7_shutter_slide' && <StormShutterWorkbench onComplete={onComplete} />}
        {panel === 'm7_beacon_ignition' && <BeaconIgnitionWorkbench onComplete={onComplete} />}
        {panel === 'm1_relay_stabilize' && (
          <RelayStabilizeWorkbench
            onCommitted={() => setRepairCommitted(true)}
            onComplete={onComplete}
          />
        )}
        {panel === 'm7_recycler_clean' && <RecyclerCleanWorkbench onComplete={onComplete} />}
        {panel === 'm8_medical_scan' && <MedicalScanWorkbench onComplete={onComplete} />}
        {panel === 'm9_food_sort' && <FoodSortWorkbench onComplete={onComplete} />}
        {panel === 'm10_thermal_balance' && <ThermalBalanceWorkbench onComplete={onComplete} />}
        {panel === 'm11_beacon_tune' && <BeaconTuneWorkbench onComplete={onComplete} />}
        {panel === 'm14_mountain_cal' && <MountainCalWorkbench onComplete={onComplete} />}
        {panel === 'm17_satellite_align' && <SatelliteAlignWorkbench onComplete={onComplete} />}
        {panel === 'm18_weather_cal' && <WeatherCalWorkbench onComplete={onComplete} />}
        {panel === 'm19_emergency_panel' && <EmergencyOverrideWorkbench onComplete={onComplete} />}
        {panel === 'rover_diagnostic' && (
          <RoverDiagnosticWorkbench rover={activeRover} onComplete={onComplete} />
        )}

        <div className="px-6 py-3 bg-[#090f1d] border-t border-white/10 flex justify-end">
          <button
            onClick={handleBackClick}
            className="text-xs font-semibold text-slate-400 hover:text-white cursor-pointer py-1 px-2"
          >
            {repairCommitted ? 'Continue Mission' : 'Step Back'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Shared floating drag preview helper using Pointer Events (mouse + Android touch)
function usePointerDrag(onDropCheck: (clientX: number, clientY: number, itemKey: string) => void) {
  const [dragging, setDragging] = useState<{
    key: string;
    label: string;
    x: number;
    y: number;
  } | null>(null);

  const startDrag = (key: string, label: string, e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    soundEngine.playClick();
    setDragging({ key, label, x: e.clientX, y: e.clientY });
  };

  const moveDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null));
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    const key = dragging.key;
    setDragging(null);
    onDropCheck(e.clientX, e.clientY, key);
  };

  return { dragging, startDrag, moveDrag, endDrag };
}

function isInsideRect(x: number, y: number, el: HTMLElement | null, pad = 18): boolean {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
}

// =========================================================================
// MISSION 1: ELECTRICAL CIRCUIT FAILURE (4-Wire Colour & Shape Matching)
// Supports both drag-and-drop SVG cable drawing AND tap-to-connect!
// =========================================================================
type WireColorId = 'red' | 'blue' | 'yellow' | 'green';

interface WireSpec {
  id: WireColorId;
  label: string;
  hex: string;
  glow: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}

const CIRCUIT_WIRES: WireSpec[] = [
  {
    id: 'red',
    label: 'Red',
    hex: '#ef4444',
    glow: 'rgba(239,68,68,0.55)',
    bgClass: 'bg-red-500',
    borderClass: 'border-red-400',
    textClass: 'text-red-300',
  },
  {
    id: 'blue',
    label: 'Blue',
    hex: '#38bdf8',
    glow: 'rgba(56,189,248,0.55)',
    bgClass: 'bg-sky-400',
    borderClass: 'border-sky-300',
    textClass: 'text-sky-300',
  },
  {
    id: 'yellow',
    label: 'Yellow',
    hex: '#facc15',
    glow: 'rgba(250,204,21,0.55)',
    bgClass: 'bg-yellow-400',
    borderClass: 'border-yellow-300',
    textClass: 'text-yellow-300',
  },
  {
    id: 'green',
    label: 'Green',
    hex: '#10b981',
    glow: 'rgba(16,185,129,0.55)',
    bgClass: 'bg-emerald-400',
    borderClass: 'border-emerald-300',
    textClass: 'text-emerald-300',
  },
];

// Deterministic shuffled socket order on the right so kids actively match!
const RIGHT_SOCKET_ORDER: WireColorId[] = ['blue', 'green', 'red', 'yellow'];

const WireShapeIcon: React.FC<{ id: WireColorId; className?: string }> = ({ id, className = 'w-4 h-4' }) => {
  if (id === 'red') return <Circle className={className} />;
  if (id === 'blue') return <Triangle className={className} />;
  if (id === 'yellow') return <Star className={className} />;
  return <Square className={className} />;
};

const CircuitMatchWorkbench: React.FC<{
  alreadyRepaired?: boolean;
  onCommitted?: () => void;
  onComplete: () => void;
}> = ({ alreadyRepaired = false, onCommitted, onComplete }) => {
  const [matched, setMatched] = useState<Record<WireColorId, boolean>>({
    red: alreadyRepaired,
    blue: alreadyRepaired,
    yellow: alreadyRepaired,
    green: alreadyRepaired,
  });
  const [selectedLeft, setSelectedLeft] = useState<WireColorId | null>(null);
  const [dragWire, setDragWire] = useState<{
    id: WireColorId;
    startX: number;
    startY: number;
    curX: number;
    curY: number;
  } | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; tone: 'info' | 'retry' | 'success' }>({
    text: alreadyRepaired
      ? 'Great Job! Oxygen System Restored!'
      : 'Drag or tap each coloured wire on the left to its matching socket on the right!',
    tone: alreadyRepaired ? 'success' : 'info',
  });
  const [sparkSocket, setSparkSocket] = useState<WireColorId | null>(null);
  const [oxygenLevel, setOxygenLevel] = useState(alreadyRepaired ? 100 : 36);
  const [allDone, setAllDone] = useState(alreadyRepaired);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const leftRefs = useRef<Partial<Record<WireColorId, HTMLButtonElement | null>>>({});
  const rightRefs = useRef<Partial<Record<WireColorId, HTMLButtonElement | null>>>({});
  const committedRef = useRef(alreadyRepaired);
  const onCommittedRef = useRef(onCommitted);
  onCommittedRef.current = onCommitted;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const matchedCount = Object.values(matched).filter(Boolean).length;

  // Compute SVG center coordinates relative to boardRef for connected wires
  const [wireCoords, setWireCoords] = useState<
    Array<{ id: WireColorId; hex: string; x1: number; y1: number; x2: number; y2: number }>
  >([]);

  const recomputeCoords = () => {
    const board = boardRef.current;
    if (!board) return;
    const br = board.getBoundingClientRect();
    const list: Array<{ id: WireColorId; hex: string; x1: number; y1: number; x2: number; y2: number }> = [];
    CIRCUIT_WIRES.forEach((w) => {
      if (!matched[w.id]) return;
      const lEl = leftRefs.current[w.id];
      const rEl = rightRefs.current[w.id];
      if (!lEl || !rEl) return;
      const lr = lEl.getBoundingClientRect();
      const rr = rEl.getBoundingClientRect();
      list.push({
        id: w.id,
        hex: w.hex,
        x1: lr.right - br.left - 4,
        y1: lr.top + lr.height / 2 - br.top,
        x2: rr.left - br.left + 4,
        y2: rr.top + rr.height / 2 - br.top,
      });
    });
    setWireCoords(list);
  };

  useEffect(() => {
    recomputeCoords();
    window.addEventListener('resize', recomputeCoords);
    return () => window.removeEventListener('resize', recomputeCoords);
  }, [matched]);

  const tryConnect = (leftId: WireColorId, rightId: WireColorId) => {
    if (matched[leftId]) return;
    if (leftId === rightId) {
      soundEngine.playWireZap();
      const next = { ...matched, [leftId]: true };
      setMatched(next);
      setSelectedLeft(null);
      setSparkSocket(rightId);
      setTimeout(() => setSparkSocket(null), 500);

      const count = Object.values(next).filter(Boolean).length;
      const nextO2 = 36 + count * 16;
      setOxygenLevel(Math.min(100, nextO2));

      if (count >= CIRCUIT_WIRES.length) {
        setAllDone(true);
        setFeedback({ text: 'Great Job! Oxygen System Restored!', tone: 'success' });
        soundEngine.playMissionComplete();
        if (!committedRef.current) {
          committedRef.current = true;
          onCommittedRef.current?.();
        }
        const iv = window.setInterval(() => {
          setOxygenLevel((prev) => {
            if (prev >= 100) {
              clearInterval(iv);
              return 100;
            }
            return Math.min(100, prev + 3);
          });
        }, 40);
      } else {
        const spec = CIRCUIT_WIRES.find((w) => w.id === leftId);
        setFeedback({
          text: `${spec?.label ?? ''} wire connected! ${CIRCUIT_WIRES.length - count} more to go!`,
          tone: 'info',
        });
      }
    } else {
      soundEngine.playGentleRetry();
      setSelectedLeft(null);
      setFeedback({ text: 'Try another connection!', tone: 'retry' });
    }
  };

  const handleLeftPointerDown = (id: WireColorId, e: React.PointerEvent<HTMLButtonElement>) => {
    if (matched[id] || allDone) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore synthetic events
    }
    soundEngine.playClick();
    setSelectedLeft(id);
    const board = boardRef.current;
    const lEl = leftRefs.current[id];
    if (board && lEl) {
      const br = board.getBoundingClientRect();
      const lr = lEl.getBoundingClientRect();
      setDragWire({
        id,
        startX: lr.right - br.left - 4,
        startY: lr.top + lr.height / 2 - br.top,
        curX: e.clientX - br.left,
        curY: e.clientY - br.top,
      });
    }
  };

  const handleBoardPointerMove = (e: React.PointerEvent) => {
    if (!dragWire || !boardRef.current) return;
    const br = boardRef.current.getBoundingClientRect();
    setDragWire((prev) =>
      prev ? { ...prev, curX: e.clientX - br.left, curY: e.clientY - br.top } : null,
    );
  };

  const handleLeftPointerUp = (id: WireColorId, e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragWire) {
      let targetRight: WireColorId | null = null;
      RIGHT_SOCKET_ORDER.forEach((rid) => {
        const el = rightRefs.current[rid];
        if (el && isInsideRect(e.clientX, e.clientY, el, 20)) {
          targetRight = rid;
        }
      });
      setDragWire(null);
      if (targetRight) {
        tryConnect(id, targetRight);
      }
    }
  };

  const activeDragSpec = dragWire ? CIRCUIT_WIRES.find((w) => w.id === dragWire.id) : null;

  return (
    <div className="p-5 sm:p-6 space-y-4 select-none">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold text-sky-400">Oxygen Centre · Electrical Panel</div>
          <h3 className="font-display text-lg sm:text-xl font-bold text-white">
            Match the Coloured Wires
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <Fan
            className={`w-7 h-7 ${
              allDone ? 'text-emerald-400 animate-spin' : 'text-slate-500'
            }`}
          />
          <div className="text-right">
            <div className="text-[11px] text-slate-400">Oxygen Level</div>
            <div
              className={`font-mono-num text-lg font-extrabold ${
                oxygenLevel >= 90 ? 'text-emerald-400' : oxygenLevel >= 60 ? 'text-amber-300' : 'text-red-400'
              }`}
            >
              {oxygenLevel}%
            </div>
          </div>
        </div>
      </div>

      {/* Live Oxygen Power Bar */}
      <div className="h-3 rounded-full bg-slate-900 overflow-hidden border border-white/10">
        <div
          className={`h-full transition-all duration-200 ${
            allDone ? 'bg-emerald-400' : oxygenLevel >= 60 ? 'bg-amber-400' : 'bg-red-500'
          }`}
          style={{ width: `${oxygenLevel}%` }}
        />
      </div>

      {/* Gentle Kid-Friendly Instruction / Feedback Banner */}
      <div
        className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold text-center transition-colors ${
          feedback.tone === 'success'
            ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
            : feedback.tone === 'retry'
              ? 'bg-amber-950/85 border-amber-400 text-amber-200'
              : 'bg-sky-950/75 border-sky-400/35 text-sky-100'
        }`}
      >
        {feedback.text}
      </div>

      {/* Interactive Wire Matching Board */}
      <div
        ref={boardRef}
        onPointerMove={handleBoardPointerMove}
        onPointerCancel={() => setDragWire(null)}
        className={`relative p-4 sm:p-5 rounded-2xl border-2 transition-colors touch-none ${
          allDone ? 'bg-emerald-950/35 border-emerald-400/70' : 'bg-slate-900 border-white/12'
        }`}
      >
        {/* SVG Cable Layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
          {wireCoords.map((wc) => {
            const mx = (wc.x1 + wc.x2) / 2;
            const d = `M ${wc.x1} ${wc.y1} C ${mx} ${wc.y1}, ${mx} ${wc.y2}, ${wc.x2} ${wc.y2}`;
            return (
              <g key={wc.id}>
                <path d={d} fill="none" stroke={wc.hex} strokeWidth={10} strokeOpacity={0.28} strokeLinecap="round" />
                <path d={d} fill="none" stroke={wc.hex} strokeWidth={5} strokeLinecap="round" />
              </g>
            );
          })}

          {dragWire && activeDragSpec && (
            <path
              d={`M ${dragWire.startX} ${dragWire.startY} C ${(dragWire.startX + dragWire.curX) / 2} ${dragWire.startY}, ${(dragWire.startX + dragWire.curX) / 2} ${dragWire.curY}, ${dragWire.curX} ${dragWire.curY}`}
              fill="none"
              stroke={activeDragSpec.hex}
              strokeWidth={6}
              strokeDasharray="8 6"
              strokeLinecap="round"
            />
          )}
        </svg>

        <div className="relative z-20 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Left Terminals (Wires) */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-slate-400 text-center">Wires</div>
            {CIRCUIT_WIRES.map((wire) => {
              const isConnected = matched[wire.id];
              const isSelected = selectedLeft === wire.id;
              return (
                <button
                  key={wire.id}
                  ref={(el) => {
                    leftRefs.current[wire.id] = el;
                  }}
                  type="button"
                  onPointerDown={(e) => handleLeftPointerDown(wire.id, e)}
                  onPointerUp={(e) => handleLeftPointerUp(wire.id, e)}
                  onClick={() => {
                    if (!isConnected && !allDone) {
                      soundEngine.playClick();
                      setSelectedLeft(wire.id);
                      setFeedback({
                        text: `Now tap the ${wire.label} socket on the right!`,
                        tone: 'info',
                      });
                    }
                  }}
                  className={`w-full h-12 px-3 rounded-xl border-2 font-extrabold text-xs sm:text-sm flex items-center justify-between transition-all cursor-grab active:cursor-grabbing ${
                    isConnected
                      ? 'bg-slate-950/90 border-emerald-400/60 text-emerald-200 cursor-default'
                      : isSelected
                        ? `${wire.bgClass} border-white text-slate-950 scale-[1.03] shadow-lg`
                        : `bg-slate-950 hover:bg-slate-800 ${wire.borderClass} ${wire.textClass}`
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center ${wire.bgClass} text-slate-950`}
                    >
                      <WireShapeIcon id={wire.id} className="w-3.5 h-3.5" />
                    </span>
                    <span>{wire.label}</span>
                  </span>
                  <span
                    className={`w-3.5 h-3.5 rounded-full border-2 border-white/80 ${wire.bgClass}`}
                  />
                </button>
              );
            })}
          </div>

          {/* Center Circuit Status */}
          <div className="hidden sm:flex flex-col items-center justify-center gap-1.5 px-2">
            <Zap className={`w-6 h-6 ${allDone ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="font-mono-num text-xs font-bold text-slate-300">
              {matchedCount}/4
            </span>
          </div>

          {/* Right Terminals (Shuffled Sockets) */}
          <div className="space-y-3">
            <div className="text-[11px] font-bold text-slate-400 text-center">Sockets</div>
            {RIGHT_SOCKET_ORDER.map((rid) => {
              const wire = CIRCUIT_WIRES.find((w) => w.id === rid)!;
              const isConnected = matched[rid];
              const sparking = sparkSocket === rid;
              return (
                <button
                  key={rid}
                  ref={(el) => {
                    rightRefs.current[rid] = el;
                  }}
                  type="button"
                  onClick={() => {
                    if (isConnected || allDone) return;
                    if (!selectedLeft) {
                      setFeedback({
                        text: 'Tap or drag a coloured wire on the left first!',
                        tone: 'info',
                      });
                      return;
                    }
                    tryConnect(selectedLeft, rid);
                  }}
                  className={`w-full h-12 px-3 rounded-xl border-2 font-extrabold text-xs sm:text-sm flex items-center justify-between transition-all cursor-pointer ${
                    isConnected
                      ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
                      : selectedLeft
                        ? `bg-slate-950 hover:bg-slate-800 ${wire.borderClass} ${wire.textClass} ring-1 ring-white/15`
                        : `bg-slate-950 ${wire.borderClass} ${wire.textClass}`
                  } ${sparking ? 'scale-105 shadow-lg' : ''}`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isConnected ? `${wire.bgClass} border-white` : 'border-slate-500 bg-slate-900'
                    }`}
                  >
                    {isConnected && <Check className="w-2.5 h-2.5 text-slate-950" />}
                  </span>
                  <span className="flex items-center gap-2">
                    <span>{wire.label}</span>
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center ${wire.bgClass} text-slate-950`}
                    >
                      <WireShapeIcon id={wire.id} className="w-3.5 h-3.5" />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {allDone && (
        <button
          type="button"
          onClick={() => onCompleteRef.current()}
          className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl cursor-pointer"
        >
          <Check className="w-5 h-5" />
          <span>Great Job! Oxygen System Restored! · Continue</span>
        </button>
      )}
    </div>
  );
};

// =========================================================================
// LEGACY MISSION 1 WORKBENCH (Kept for checkpoint compatibility)
// =========================================================================
const FilterRepairWorkbench: React.FC<{
  alreadyRepaired?: boolean;
  onCommitted?: () => void;
  onComplete: () => void;
}> = ({ alreadyRepaired = false, onCommitted, onComplete }) => {
  const [filterRemoved, setFilterRemoved] = useState(alreadyRepaired);
  const [filterPlaced, setFilterPlaced] = useState(alreadyRepaired);
  const [pipeConnected, setPipeConnected] = useState(alreadyRepaired);
  const [holdPct, setHoldPct] = useState(alreadyRepaired ? 100 : 0);
  const [oxygenLevel, setOxygenLevel] = useState(alreadyRepaired ? 100 : 34);
  const [repairVerified, setRepairVerified] = useState(alreadyRepaired);
  const [hint, setHint] = useState(
    alreadyRepaired
      ? 'Oxygen Generator is already repaired and delivering 100% fresh air!'
      : 'Tap the clogged orange filter inside the machine to remove it.',
  );

  const filterSlotRef = useRef<HTMLDivElement | null>(null);
  const pipeSocketRef = useRef<HTMLDivElement | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onCommittedRef = useRef(onCommitted);
  onCommittedRef.current = onCommitted;

  useEffect(() => {
    console.info('[Mission1][Repair] Oxygen Generator repair interaction started', { alreadyRepaired });
    return () => {
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    };
  }, [alreadyRepaired]);

  const { dragging, startDrag, moveDrag, endDrag } = usePointerDrag((x, y, key) => {
    if (key === 'clean_filter') {
      if (!filterRemoved) {
        setHint('Remove the old dusty filter from the slot first—tap it!');
        return;
      }
      if (isInsideRect(x, y, filterSlotRef.current)) {
        soundEngine.playToolSuccess();
        setFilterPlaced(true);
        setOxygenLevel(58);
        setHint('Great fit! Now drag the loose Oxygen Pipe connector onto its glowing socket.');
        console.info('[Mission1][Repair] Repair step completed: clean_filter_installed');
      } else {
        setHint('Drag the clean blue filter right onto the dashed Filter Slot!');
      }
    } else if (key === 'o2_pipe') {
      if (!filterPlaced) {
        setHint('Place the clean filter into the Filter Slot before connecting the pipe!');
        return;
      }
      if (isInsideRect(x, y, pipeSocketRef.current)) {
        soundEngine.playToolSuccess();
        setPipeConnected(true);
        setOxygenLevel(76);
        setHint('Pipe sealed! Press and HOLD the Start Oxygen Fan button until it hits 100%!');
        console.info('[Mission1][Repair] Repair step completed: o2_pipe_connected');
      } else {
        setHint('Drag the pipe connector directly over the Intake Socket!');
      }
    }
  });

  useEffect(() => {
    if (alreadyRepaired) return;
    if (holdPct < 100) return;

    const validationPassed = filterRemoved && filterPlaced && pipeConnected && holdPct >= 100;
    if (!validationPassed) {
      console.warn('[Mission1][Repair] Repair validation failed', {
        filterRemoved,
        filterPlaced,
        pipeConnected,
        holdPct,
      });
      return;
    }

    if (completedRef.current) return;
    completedRef.current = true;
    setRepairVerified(true);
    setHint('Oxygen Generator Repaired! Fresh air restored to 100% — advancing mission…');
    onCommittedRef.current?.();
    console.info('[Mission1][Repair] Repair validation passed — committing completion');

    soundEngine.playMissionComplete();
    const iv = window.setInterval(() => {
      setOxygenLevel((prev) => {
        if (prev >= 100) {
          clearInterval(iv);
          return 100;
        }
        return Math.min(100, prev + 5);
      });
    }, 45);
    const done = window.setTimeout(() => {
      console.info('[Mission1][Repair] Firing Oxygen Generator repair completion callback');
      onCompleteRef.current();
    }, 750);
    return () => {
      clearInterval(iv);
      clearTimeout(done);
    };
  }, [alreadyRepaired, holdPct, filterRemoved, filterPlaced, pipeConnected]);

  const startHoldFan = () => {
    if (alreadyRepaired || completedRef.current) return;
    if (!filterPlaced || !pipeConnected) {
      setHint(
        !filterRemoved
          ? 'Look at the dusty filter first—tap it to pull the clogged filter out!'
          : !filterPlaced
            ? 'Drag the clean blue filter into the Filter Slot first!'
            : 'Drag the loose Oxygen Pipe into the Intake Socket first!',
      );
      return;
    }
    if (holdPct >= 100) return;
    soundEngine.playClick();
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    holdTimerRef.current = window.setInterval(() => {
      setHoldPct((p) => {
        if (p >= 100) {
          if (holdTimerRef.current) {
            clearInterval(holdTimerRef.current);
            holdTimerRef.current = null;
          }
          return 100;
        }
        return Math.min(100, p + 10);
      });
    }, 55);
  };

  const stopHoldFan = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldPct((p) => (p >= 100 ? 100 : 0));
  };

  return (
    <div className="p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-sky-400">Oxygen Centre · Inside Machine</div>
          <h3 className="font-display text-lg sm:text-xl font-bold text-white">
            Repair the Oxygen Generator
          </h3>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-slate-400">Oxygen Level</div>
          <div
            className={`font-mono-num text-lg font-bold ${
              oxygenLevel >= 90 ? 'text-emerald-400' : oxygenLevel >= 55 ? 'text-amber-300' : 'text-red-400'
            }`}
          >
            {oxygenLevel}%
          </div>
        </div>
      </div>

      {/* Live Oxygen Recovery Bar */}
      <div className="h-2.5 rounded-full bg-slate-900 overflow-hidden border border-white/10">
        <div
          className={`h-full transition-all duration-150 ${
            oxygenLevel >= 90 ? 'bg-emerald-400' : oxygenLevel >= 55 ? 'bg-amber-400' : 'bg-red-500'
          }`}
          style={{ width: `${oxygenLevel}%` }}
        />
      </div>

      {/* Helpful Hint Banner */}
      <div className="px-3.5 py-2 rounded-xl bg-sky-950/70 border border-sky-400/30 text-xs text-sky-100">
        {hint}
      </div>

      {/* Machine Schematic Workbench */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-white/12 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Filter Bay */}
          <div
            ref={filterSlotRef}
            onClick={() => {
              if (!filterRemoved) {
                soundEngine.playClick();
                setFilterRemoved(true);
                setHint('Dirty filter removed! Now drag the Clean Blue Filter into the Filter Slot.');
                console.info('[Mission1][Repair] Repair step completed: clogged_filter_removed');
              }
            }}
            className={`h-24 rounded-2xl border-2 flex flex-col items-center justify-center p-2 text-center transition-all ${
              !filterRemoved
                ? 'bg-orange-950/90 border-orange-500 text-orange-200 cursor-pointer hover:brightness-110'
                : filterPlaced
                  ? 'bg-sky-950 border-sky-400 text-sky-100'
                  : 'bg-slate-950 border-dashed border-sky-400/70 text-sky-300'
            }`}
          >
            {!filterRemoved ? (
              <>
                <span className="text-xs font-bold">Clogged Dusty Filter</span>
                <span className="text-[11px] text-orange-300 mt-1">Tap to Pull Out</span>
              </>
            ) : filterPlaced ? (
              <>
                <Check className="w-5 h-5 text-emerald-400 mb-1" />
                <span className="text-xs font-bold">Clean Filter Seated</span>
              </>
            ) : (
              <span className="text-xs font-semibold">Drop Clean Filter Here</span>
            )}
          </div>

          {/* Pipe Socket */}
          <div
            ref={pipeSocketRef}
            className={`h-24 rounded-2xl border-2 flex flex-col items-center justify-center p-2 text-center transition-all ${
              pipeConnected
                ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                : filterPlaced
                  ? 'bg-slate-950 border-dashed border-amber-400 text-amber-200'
                  : 'bg-slate-950 border-slate-700 text-slate-500'
            }`}
          >
            {pipeConnected ? (
              <>
                <Check className="w-5 h-5 text-emerald-400 mb-1" />
                <span className="text-xs font-bold">O₂ Pipe Connected</span>
              </>
            ) : (
              <>
                <span className="text-xs font-bold">Intake Socket</span>
                <span className="text-[11px] mt-1">
                  {filterPlaced ? 'Drag Pipe Here' : 'Install Filter First'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Draggable Parts Tray */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-white/10">
          {!filterPlaced && (
            <div
              onPointerDown={(e) => startDrag('clean_filter', 'Clean Blue Filter', e)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              className="touch-none select-none px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg cursor-grab active:cursor-grabbing"
            >
              Drag: Clean Blue Filter
            </div>
          )}

          {!pipeConnected && (
            <div
              onPointerDown={(e) => startDrag('o2_pipe', 'O₂ Pipe Connector', e)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              className="touch-none select-none px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-lg cursor-grab active:cursor-grabbing"
            >
              Drag: Loose O₂ Pipe
            </div>
          )}
        </div>

        {/* Hold-to-Operate Fan Switch / Repaired Confirmation */}
        {alreadyRepaired ? (
          <button
            onClick={() => onCompleteRef.current()}
            className="w-full py-3.5 rounded-2xl border-2 bg-emerald-500 hover:bg-emerald-400 border-emerald-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Check className="w-5 h-5" />
            <span>Oxygen Generator Already Repaired · Continue Mission</span>
          </button>
        ) : (
          <button
            onPointerDown={startHoldFan}
            onPointerUp={stopHoldFan}
            onPointerLeave={stopHoldFan}
            onPointerCancel={stopHoldFan}
            className={`touch-none w-full py-3.5 rounded-2xl border-2 font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer relative overflow-hidden ${
              repairVerified || holdPct >= 100
                ? 'bg-emerald-500 border-emerald-300 text-slate-950'
                : filterPlaced && pipeConnected
                  ? 'bg-slate-800 border-sky-400 text-white hover:bg-slate-700'
                  : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            <div
              className="absolute inset-y-0 left-0 bg-emerald-500/40 pointer-events-none transition-all duration-75"
              style={{ width: `${holdPct}%` }}
            />
            <Fan
              className={`w-5 h-5 relative z-10 ${holdPct >= 100 ? 'animate-spin' : ''}`}
            />
            <span className="relative z-10">
              {repairVerified || holdPct >= 100
                ? 'Oxygen Fan Spinning! Fresh Air Restored!'
                : holdPct > 0
                  ? `Hold to Spin Up Fan… ${holdPct}%`
                  : 'Press & HOLD: Start Oxygen Fan'}
            </span>
          </button>
        )}
      </div>

      {dragging && (
        <div
          className="fixed z-50 pointer-events-none px-4 py-2 rounded-xl bg-sky-400 text-slate-950 font-bold text-xs shadow-2xl -translate-x-1/2 -translate-y-1/2"
          style={{ left: dragging.x, top: dragging.y }}
        >
          {dragging.label}
        </div>
      )}
    </div>
  );
};

// =========================================================================
// MISSION 2A: ROTATE RED SHUTOFF VALVE WHEEL (Circular Pointer Rotation)
// =========================================================================
const ValveTurnWorkbench: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [turnedDeg, setTurnedDeg] = useState(0);
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const lastAngleRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  const flowPct = Math.max(0, Math.round(100 - (turnedDeg / 360) * 100));

  const getAngle = (clientX: number, clientY: number) => {
    const el = wheelRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return Math.atan2(clientY - (r.top + r.height / 2), clientX - (r.left + r.width / 2));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    lastAngleRef.current = getAngle(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (lastAngleRef.current === null || completedRef.current) return;
    const cur = getAngle(e.clientX, e.clientY);
    let delta = cur - lastAngleRef.current;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    lastAngleRef.current = cur;

    const degDelta = Math.abs((delta * 180) / Math.PI);
    setTurnedDeg((prev) => {
      const next = Math.min(360, prev + degDelta * 0.9);
      if (next >= 360 && !completedRef.current) {
        completedRef.current = true;
        soundEngine.playToolSuccess();
        setTimeout(onComplete, 650);
      }
      return next;
    });
  };

  const handlePointerUp = () => {
    lastAngleRef.current = null;
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-blue-400">Water Station · Shutoff Valve</div>
          <h3 className="font-display text-xl font-bold text-white">
            Rotate Valve to Stop Water Spray
          </h3>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-slate-400">Pipe Pressure</div>
          <div
            className={`font-mono-num text-lg font-bold ${
              flowPct === 0 ? 'text-emerald-400' : 'text-sky-300'
            }`}
          >
            {flowPct}%
          </div>
        </div>
      </div>

      <div className="p-5 rounded-2xl bg-slate-900 border border-white/12 flex flex-col items-center gap-4">
        {/* Visual spray meter */}
        <div className="flex items-center gap-2 text-xs font-semibold text-sky-200">
          <Droplets className={`w-4 h-4 ${flowPct > 0 ? 'text-sky-400' : 'text-slate-500'}`} />
          <span>
            {flowPct > 0
              ? 'Drag in a circle on the red wheel to shut off water flow!'
              : 'Valve Closed! Water spray stopped!'}
          </span>
        </div>

        {/* Rotatable Wheel */}
        <div
          ref={wheelRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="touch-none w-40 h-40 rounded-full border-8 border-red-500 bg-slate-950 flex items-center justify-center relative cursor-grab active:cursor-grabbing shadow-xl"
          style={{ transform: `rotate(${turnedDeg}deg)` }}
        >
          <div className="w-full h-3 bg-red-500 rounded-full absolute" />
          <div className="h-full w-3 bg-red-500 rounded-full absolute" />
          <div className="w-10 h-10 rounded-full bg-slate-200 border-4 border-slate-700 z-10 flex items-center justify-center">
            <RotateCw className="w-4 h-4 text-slate-800" />
          </div>
        </div>

        <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-emerald-400 transition-all duration-75"
            style={{ width: `${Math.round((turnedDeg / 360) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// MISSION 2B: PIPE CLAMP DRAG + BOLT TIGHTENING + RECYCLER HOLD
// =========================================================================
const PipeClampWorkbench: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [clampPlaced, setClampPlaced] = useState(false);
  const [bolts, setBolts] = useState([false, false]);
  const [holdPct, setHoldPct] = useState(0);
  const [waterReserve, setWaterReserve] = useState(42);
  const [hint, setHint] = useState('Drag the silver Pipe Clamp onto the cracked pipe joint.');

  const pipeJointRef = useRef<HTMLDivElement | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const boltsDone = bolts.every(Boolean);

  const { dragging, startDrag, moveDrag, endDrag } = usePointerDrag((x, y, key) => {
    if (key === 'pipe_clamp') {
      if (isInsideRect(x, y, pipeJointRef.current)) {
        soundEngine.playToolSuccess();
        setClampPlaced(true);
        setWaterReserve(64);
        setHint('Clamp seated! Now tap both bolts to tighten it.');
      } else {
        setHint('Drop the Pipe Clamp right over the glowing orange crack!');
      }
    }
  });

  useEffect(() => {
    if (holdPct >= 100 && clampPlaced && boltsDone && !completedRef.current) {
      completedRef.current = true;
      soundEngine.playMissionComplete();
      const iv = window.setInterval(() => {
        setWaterReserve((prev) => {
          if (prev >= 100) {
            clearInterval(iv);
            return 100;
          }
          return Math.min(100, prev + 4);
        });
      }, 45);
      const done = window.setTimeout(() => onCompleteRef.current(), 900);
      return () => {
        clearInterval(iv);
        clearTimeout(done);
      };
    }
  }, [holdPct, clampPlaced, boltsDone]);

  const tapBolt = (idx: number) => {
    if (!clampPlaced || bolts[idx]) return;
    soundEngine.playClick();
    const next = [...bolts];
    next[idx] = true;
    setBolts(next);
    if (next.every(Boolean)) {
      soundEngine.playToolSuccess();
      setWaterReserve(80);
      setHint('Sealed tight! Now press & HOLD Start Water Recycling!');
    }
  };

  const startHoldRecycler = () => {
    if (!clampPlaced) {
      setHint('The pipe joint is still cracked! Drag the silver Pipe Clamp onto the crack first!');
      return;
    }
    if (!boltsDone) {
      setHint('Tap both clamp bolts to tighten the seal before starting the pump!');
      return;
    }
    if (holdPct >= 100) return;
    soundEngine.playClick();
    holdTimerRef.current = window.setInterval(() => {
      setHoldPct((p) => {
        if (p >= 100) {
          if (holdTimerRef.current) clearInterval(holdTimerRef.current);
          return 100;
        }
        return Math.min(100, p + 9);
      });
    }, 55);
  };

  const stopHoldRecycler = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldPct((p) => (p >= 100 ? 100 : 0));
  };

  return (
    <div className="p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-blue-400">Water Station · Pipe Repair</div>
          <h3 className="font-display text-lg sm:text-xl font-bold text-white">
            Clamp the Pipe &amp; Restart Recycling
          </h3>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-slate-400">Water Reserves</div>
          <div
            className={`font-mono-num text-lg font-bold ${
              waterReserve >= 90 ? 'text-emerald-400' : 'text-sky-300'
            }`}
          >
            {waterReserve}%
          </div>
        </div>
      </div>

      <div className="h-2.5 rounded-full bg-slate-900 overflow-hidden border border-white/10">
        <div
          className="h-full bg-sky-400 transition-all duration-150"
          style={{ width: `${waterReserve}%` }}
        />
      </div>

      <div className="px-3.5 py-2 rounded-xl bg-blue-950/70 border border-blue-400/30 text-xs text-blue-100">
        {hint}
      </div>

      <div className="p-4 rounded-2xl bg-slate-900 border border-white/12 space-y-4">
        {/* Pipe Joint Area */}
        <div className="flex items-center justify-center py-3">
          <div className="h-7 w-20 rounded-l-lg bg-slate-600" />
          <div
            ref={pipeJointRef}
            className={`h-14 w-28 rounded-xl border-2 flex items-center justify-around px-2 transition-all ${
              boltsDone
                ? 'bg-emerald-950 border-emerald-400'
                : clampPlaced
                  ? 'bg-slate-700 border-sky-400'
                  : 'bg-orange-950/90 border-dashed border-orange-400'
            }`}
          >
            {!clampPlaced ? (
              <span className="text-[11px] font-bold text-orange-200 text-center">
                Cracked Joint
              </span>
            ) : (
              bolts.map((tight, i) => (
                <button
                  key={i}
                  onClick={() => tapBolt(i)}
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${
                    tight
                      ? 'bg-emerald-500 border-emerald-200 text-slate-950'
                      : 'bg-amber-400 border-white text-slate-950 hover:scale-105'
                  }`}
                >
                  {tight ? <Check className="w-4 h-4" /> : <Wrench className="w-3.5 h-3.5" />}
                </button>
              ))
            )}
          </div>
          <div className="h-7 w-20 rounded-r-lg bg-slate-600" />
        </div>

        {/* Draggable Clamp */}
        {!clampPlaced && (
          <div className="flex justify-center">
            <div
              onPointerDown={(e) => startDrag('pipe_clamp', 'Silver Pipe Clamp', e)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              className="touch-none select-none px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-white text-slate-950 font-bold text-xs shadow-lg cursor-grab active:cursor-grabbing flex items-center gap-2"
            >
              <Wrench className="w-4 h-4" /> Drag: Replacement Pipe Clamp
            </div>
          </div>
        )}

        {/* Hold-to-Start Water Recycler */}
        <button
          onPointerDown={startHoldRecycler}
          onPointerUp={stopHoldRecycler}
          onPointerLeave={stopHoldRecycler}
          onPointerCancel={stopHoldRecycler}
          className={`touch-none w-full py-3.5 rounded-2xl border-2 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer relative overflow-hidden ${
            holdPct >= 100
              ? 'bg-emerald-500 border-emerald-300 text-slate-950'
              : boltsDone
                ? 'bg-sky-500 border-sky-300 text-slate-950'
                : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
        >
          <div
            className="absolute inset-y-0 left-0 bg-emerald-400/50 pointer-events-none"
            style={{ width: `${holdPct}%` }}
          />
          <Droplets className="w-4 h-4 relative z-10" />
          <span className="relative z-10">
            {holdPct >= 100
              ? 'Water Recycling Online!'
              : holdPct > 0
                ? `Hold to Activate Recycler… ${holdPct}%`
                : 'Press & HOLD: Start Water Recycling'}
          </span>
        </button>
      </div>

      {dragging && (
        <div
          className="fixed z-50 pointer-events-none px-4 py-2 rounded-xl bg-slate-100 text-slate-950 font-bold text-xs shadow-2xl -translate-x-1/2 -translate-y-1/2"
          style={{ left: dragging.x, top: dragging.y }}
        >
          {dragging.label}
        </div>
      )}
    </div>
  );
};

// =========================================================================
// MISSION 3A: WIPE MARTIAN DUST OFF SOLAR CELLS (Continuous Touch/Mouse Scrubbing)
// =========================================================================
const SolarWipeWorkbench: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [dustLevels, setDustLevels] = useState<number[]>([100, 100, 100, 100, 100, 100, 100, 100, 100]);
  const [scrubbing, setScrubbing] = useState(false);
  const doneRef = useRef(false);

  const cleanCount = dustLevels.filter((v) => v <= 0).length;
  const voltage = Math.round((cleanCount / 9) * 24);

  const wipeAtPoint = (clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const idxAttr = el?.closest('[data-cell-idx]')?.getAttribute('data-cell-idx');
    if (idxAttr === null || idxAttr === undefined) return;
    const idx = Number(idxAttr);
    setDustLevels((prev) => {
      if (prev[idx] <= 0) return prev;
      soundEngine.playClick();
      const next = [...prev];
      next[idx] = 0;
      if (next.every((v) => v <= 0) && !doneRef.current) {
        doneRef.current = true;
        soundEngine.playToolSuccess();
        setTimeout(onComplete, 650);
      }
      return next;
    });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-amber-400">Solar Wing Array</div>
          <h3 className="font-display text-xl font-bold text-white">
            Swipe Across Panels to Wipe Dust
          </h3>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-slate-400">Solar Output</div>
          <div className="font-mono-num text-lg font-bold text-amber-300">{voltage}V / 24V</div>
        </div>
      </div>

      <div
        onPointerDown={(e) => {
          setScrubbing(true);
          wipeAtPoint(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (scrubbing) wipeAtPoint(e.clientX, e.clientY);
        }}
        onPointerUp={() => setScrubbing(false)}
        onPointerCancel={() => setScrubbing(false)}
        className="touch-none select-none grid grid-cols-3 gap-2 p-3.5 rounded-2xl bg-slate-900 border border-white/12"
      >
        {dustLevels.map((dust, idx) => (
          <div
            key={idx}
            data-cell-idx={idx}
            className={`h-20 rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-200 ${
              dust <= 0
                ? 'bg-blue-950 border-sky-400 text-sky-200'
                : 'bg-orange-900/85 border-orange-500/70 text-orange-200'
            }`}
          >
            {dust <= 0 ? (
              <>
                <Sun className="w-5 h-5 text-amber-300" />
                <span className="text-[11px] font-bold mt-1">Clean!</span>
              </>
            ) : (
              <span className="text-xs font-semibold">Red Dust</span>
            )}
          </div>
        ))}
      </div>
      <div className="text-xs text-center text-slate-300">
        Drag your finger or mouse across the dusty orange tiles ({cleanCount}/9 clean)
      </div>
    </div>
  );
};

// =========================================================================
// MISSION 3B: POWER DISTRIBUTION UNIT (Unplug Broken Wire -> Drag Cable -> Battery -> Power Lever)
// =========================================================================
const PowerBoxWorkbench: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [sparksCleared, setSparksCleared] = useState(false);
  const [cablePlugged, setCablePlugged] = useState(false);
  const [batteryOn, setBatteryOn] = useState(false);
  const [leverUp, setLeverUp] = useState(false);
  const [powerPct, setPowerPct] = useState(18);
  const [hint, setHint] = useState('Tap the sparking broken cable to unplug it safely first.');

  const solarSocketRef = useRef<HTMLDivElement | null>(null);
  const batterySocketRef = useRef<HTMLDivElement | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const { dragging, startDrag, moveDrag, endDrag } = usePointerDrag((x, y, key) => {
    if (key === 'yellow_cable') {
      if (!sparksCleared) {
        setHint('Unplug the sparking damaged wire before plugging in the new cable!');
        return;
      }
      if (isInsideRect(x, y, solarSocketRef.current)) {
        soundEngine.playToolSuccess();
        setCablePlugged(true);
        setPowerPct(58);
        setHint('Solar cable locked! Now tap Backup Battery ON, then flip the Main Power Switch.');
      } else if (isInsideRect(x, y, batterySocketRef.current)) {
        setHint('Match colors! Drag the Yellow Solar Cable to the Yellow Solar socket.');
      } else {
        setHint('Drop the Yellow Solar Cable right onto the Yellow Solar Socket!');
      }
    }
  });

  useEffect(() => {
    if (leverUp && !completedRef.current) {
      completedRef.current = true;
      soundEngine.playMissionComplete();
      const iv = window.setInterval(() => {
        setPowerPct((p) => {
          if (p >= 100) {
            clearInterval(iv);
            return 100;
          }
          return Math.min(100, p + 5);
        });
      }, 45);
      const t = window.setTimeout(() => onCompleteRef.current(), 850);
      return () => {
        clearInterval(iv);
        clearTimeout(t);
      };
    }
  }, [leverUp]);

  return (
    <div className="p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-amber-400">Power Distribution Unit</div>
          <h3 className="font-display text-lg sm:text-xl font-bold text-white">
            Reconnect &amp; Power Up the Base
          </h3>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-slate-400">Base Power</div>
          <div
            className={`font-mono-num text-lg font-bold ${
              powerPct >= 90 ? 'text-emerald-400' : 'text-amber-300'
            }`}
          >
            {powerPct}%
          </div>
        </div>
      </div>

      <div className="h-2.5 rounded-full bg-slate-900 overflow-hidden border border-white/10">
        <div
          className="h-full bg-amber-400 transition-all duration-150"
          style={{ width: `${powerPct}%` }}
        />
      </div>

      <div className="px-3.5 py-2 rounded-xl bg-amber-950/70 border border-amber-400/30 text-xs text-amber-100">
        {hint}
      </div>

      <div className="p-4 rounded-2xl bg-slate-900 border border-white/12 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Yellow Solar Socket */}
          <div
            ref={solarSocketRef}
            onClick={() => {
              if (!sparksCleared) {
                soundEngine.playClick();
                setSparksCleared(true);
                setHint('Damaged wire removed! Now drag the Yellow Solar Cable into the Yellow Socket.');
              }
            }}
            className={`h-24 rounded-2xl border-2 flex flex-col items-center justify-center p-2 text-center transition-all ${
              !sparksCleared
                ? 'bg-red-950/80 border-red-500 text-amber-200 cursor-pointer'
                : cablePlugged
                  ? 'bg-emerald-950 border-emerald-400 text-emerald-200'
                  : 'bg-slate-950 border-dashed border-amber-400 text-amber-200'
            }`}
          >
            {!sparksCleared ? (
              <>
                <Zap className="w-5 h-5 text-yellow-300 mb-1" />
                <span className="text-xs font-bold">Sparking Wire!</span>
                <span className="text-[11px]">Tap to Disconnect</span>
              </>
            ) : cablePlugged ? (
              <>
                <Check className="w-5 h-5 text-emerald-400 mb-1" />
                <span className="text-xs font-bold">Solar Bus Locked</span>
              </>
            ) : (
              <span className="text-xs font-bold">Yellow Solar Socket</span>
            )}
          </div>

          {/* Blue Backup Battery */}
          <div
            ref={batterySocketRef}
            onClick={() => {
              if (!cablePlugged) {
                setHint('Connect the Yellow Solar Cable first before flipping the Backup Battery!');
                return;
              }
              if (!batteryOn) {
                soundEngine.playToolSuccess();
                setBatteryOn(true);
                setPowerPct(78);
                setHint('Backup Battery Online! Now flip the Main Power Switch ON!');
              }
            }}
            className={`h-24 rounded-2xl border-2 flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-all ${
              batteryOn
                ? 'bg-sky-950 border-sky-400 text-sky-200'
                : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-sky-400/50'
            }`}
          >
            <Zap className={`w-5 h-5 mb-1 ${batteryOn ? 'text-sky-300' : 'text-slate-500'}`} />
            <span className="text-xs font-bold">
              {batteryOn ? 'Backup Battery: ON' : 'Backup Battery: OFF'}
            </span>
            {!batteryOn && <span className="text-[11px] text-sky-300">Tap to Activate</span>}
          </div>
        </div>

        {/* Draggable Replacement Cable */}
        {!cablePlugged && (
          <div className="flex justify-center">
            <div
              onPointerDown={(e) => startDrag('yellow_cable', 'Yellow Solar Cable', e)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              className="touch-none select-none px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-lg cursor-grab active:cursor-grabbing"
            >
              Drag: Yellow Solar Cable
            </div>
          </div>
        )}

        {/* Power Distribution Switch */}
        <button
          onClick={() => {
            if (!sparksCleared || !cablePlugged || !batteryOn) {
              setHint(
                !sparksCleared
                  ? 'Tap the sparking wire first to disconnect it safely!'
                  : !cablePlugged
                    ? 'Drag the Yellow Solar Cable into the Yellow Solar Socket first!'
                    : 'Tap the Backup Battery to turn it ON first!',
              );
              return;
            }
            setLeverUp(true);
          }}
          className={`w-full py-3.5 rounded-2xl border-2 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all ${
            leverUp
              ? 'bg-emerald-500 border-emerald-300 text-slate-950'
              : batteryOn
                ? 'bg-amber-500 hover:bg-amber-400 border-amber-300 text-slate-950'
                : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
        >
          <Lightbulb className="w-4 h-4" />
          <span>{leverUp ? 'Base Power Restored!' : 'Flip Main Power Switch ON'}</span>
        </button>
      </div>

      {dragging && (
        <div
          className="fixed z-50 pointer-events-none px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs shadow-2xl -translate-x-1/2 -translate-y-1/2"
          style={{ left: dragging.x, top: dragging.y }}
        >
          {dragging.label}
        </div>
      )}
    </div>
  );
};

// =========================================================================
// MISSION 4A: GREENHOUSE TUBE REPLACE + WATER 3 PLANT BEDS
// =========================================================================
const GreenhouseWaterWorkbench: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [tubeReplaced, setTubeReplaced] = useState(false);
  const [irrigationOn, setIrrigationOn] = useState(false);
  const [bedsWatered, setBedsWatered] = useState([false, false, false]);
  const [hint, setHint] = useState('Drag the Clear Water Tube onto the Greenhouse inlet socket.');

  const socketRef = useRef<HTMLDivElement | null>(null);

  const { dragging, startDrag, moveDrag, endDrag } = usePointerDrag((x, y, key) => {
    if (key === 'clear_tube') {
      if (isInsideRect(x, y, socketRef.current)) {
        soundEngine.playToolSuccess();
        setTubeReplaced(true);
        setHint('Tube connected! Tap Irrigation Valve ON, then tap each dry plant bed to water it!');
      } else {
        setHint('Drop the Clear Water Tube onto the dashed Greenhouse Inlet!');
      }
    }
  });

  const waterBed = (idx: number) => {
    if (!tubeReplaced) {
      setHint('Connect the Clear Water Tube first so water can reach the beds!');
      return;
    }
    if (!irrigationOn) {
      setHint('Tap the blue Irrigation Valve ON first!');
      return;
    }
    if (bedsWatered[idx]) return;
    soundEngine.playToolSuccess();
    const next = [...bedsWatered];
    next[idx] = true;
    setBedsWatered(next);
    if (next.every(Boolean)) {
      soundEngine.playMissionComplete();
      setHint('All 3 plant beds watered! Watch them perk right back up!');
      setTimeout(onComplete, 750);
    }
  };

  return (
    <div className="p-5 sm:p-6 space-y-4">
      <div>
        <div className="text-xs font-bold text-emerald-400">Greenhouse · Irrigation Line</div>
        <h3 className="font-display text-lg sm:text-xl font-bold text-white">
          Connect Water Tube &amp; Water Plant Beds
        </h3>
      </div>

      <div className="px-3.5 py-2 rounded-xl bg-emerald-950/70 border border-emerald-400/30 text-xs text-emerald-100">
        {hint}
      </div>

      <div className="p-4 rounded-2xl bg-slate-900 border border-white/12 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Water Tube Socket */}
          <div
            ref={socketRef}
            className={`h-20 rounded-2xl border-2 flex flex-col items-center justify-center p-2 text-center ${
              tubeReplaced
                ? 'bg-sky-950 border-sky-400 text-sky-100'
                : 'bg-slate-950 border-dashed border-emerald-400 text-emerald-200'
            }`}
          >
            {tubeReplaced ? (
              <>
                <Check className="w-5 h-5 text-emerald-400 mb-0.5" />
                <span className="text-xs font-bold">Clean Tube Connected</span>
              </>
            ) : (
              <span className="text-xs font-bold">Drop Clear Water Tube Here</span>
            )}
          </div>

          {/* Irrigation Valve Toggle */}
          <button
            onClick={() => {
              if (!tubeReplaced) {
                setHint('Drag the Clear Water Tube into the inlet before turning water ON!');
                return;
              }
              soundEngine.playClick();
              setIrrigationOn(true);
              setHint('Water flowing! Tap all 3 dry plant beds below to hydrate them!');
            }}
            className={`h-20 rounded-2xl border-2 font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer ${
              irrigationOn
                ? 'bg-sky-500 border-sky-300 text-slate-950'
                : 'bg-slate-950 border-slate-700 text-slate-300 hover:border-sky-400'
            }`}
          >
            <Droplets className="w-5 h-5" />
            <span>{irrigationOn ? 'Irrigation: FLOWING' : 'Tap: Turn Water ON'}</span>
          </button>
        </div>

        {!tubeReplaced && (
          <div className="flex justify-center">
            <div
              onPointerDown={(e) => startDrag('clear_tube', 'Clear Water Tube', e)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              className="touch-none select-none px-5 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs shadow-lg cursor-grab active:cursor-grabbing"
            >
              Drag: Replacement Water Tube
            </div>
          </div>
        )}

        {/* 3 Plant Beds to Water */}
        <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-white/10">
          {bedsWatered.map((wet, idx) => (
            <button
              key={idx}
              onClick={() => waterBed(idx)}
              className={`h-20 rounded-xl border-2 font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                wet
                  ? 'bg-emerald-900 border-emerald-400 text-emerald-200'
                  : 'bg-amber-950/70 border-amber-600/60 text-amber-200 hover:brightness-110'
              }`}
            >
              <Droplets className={`w-4 h-4 ${wet ? 'text-sky-300' : 'text-amber-400'}`} />
              <span>{wet ? 'Hydrated!' : `Water Bed ${idx + 1}`}</span>
            </button>
          ))}
        </div>
      </div>

      {dragging && (
        <div
          className="fixed z-50 pointer-events-none px-4 py-2 rounded-xl bg-sky-400 text-slate-950 font-bold text-xs shadow-2xl -translate-x-1/2 -translate-y-1/2"
          style={{ left: dragging.x, top: dragging.y }}
        >
          {dragging.label}
        </div>
      )}
    </div>
  );
};

// =========================================================================
// MISSION 4B: GROW-LIGHT SPECTRUM TUNER
// =========================================================================
const GrowLightWorkbench: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [red, setRed] = useState(25);
  const [blue, setBlue] = useState(85);
  const redOk = red >= 65 && red <= 85;
  const blueOk = blue >= 45 && blue <= 65;
  const allOk = redOk && blueOk;
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (allOk && !completedRef.current) {
      completedRef.current = true;
      soundEngine.playMissionComplete();
      const t = setTimeout(() => onCompleteRef.current(), 750);
      return () => clearTimeout(t);
    }
  }, [allOk]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-xs font-bold text-emerald-400">Greenhouse Grow Lights</div>
        <h3 className="font-display text-xl font-bold text-white">Tune the Plant Light Recipe</h3>
      </div>

      <div className="p-5 rounded-2xl bg-slate-900 border border-white/12 space-y-4">
        <div
          className="h-16 rounded-xl border border-white/15 flex items-center justify-center font-bold text-sm text-white transition-colors"
          style={{ backgroundColor: `rgb(${Math.round(red * 2.2)}, 40, ${Math.round(blue * 2.3)})` }}
        >
          {allOk ? (
            <span className="flex items-center gap-1.5 text-emerald-200">
              <Sparkles className="w-4 h-4" /> Tomatoes Blooming!
            </span>
          ) : (
            'Slide Red & Blue lights into the green target!'
          )}
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-rose-300 font-semibold">Red Warm Light (Goal: 65–85)</span>
              <span className={`font-mono-num font-bold ${redOk ? 'text-emerald-400' : 'text-white'}`}>
                {red}
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={red}
              onChange={(e) => setRed(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-sky-300 font-semibold">Blue Leaf Light (Goal: 45–65)</span>
              <span className={`font-mono-num font-bold ${blueOk ? 'text-emerald-400' : 'text-white'}`}>
                {blue}
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={blue}
              onChange={(e) => setBlue(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// MISSION 5A: ROTATE SPACE DISH TOWARD RELAY SATELLITE (Live Frequency Match)
// =========================================================================
const DishRotateWorkbench: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [angle, setAngle] = useState(18);
  const diff = Math.abs(angle - 68);
  const signal = Math.max(0, Math.round(100 - diff * 2.1));
  const locked = diff <= 4;
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (locked && !completedRef.current) {
      completedRef.current = true;
      soundEngine.playMissionComplete();
      const t = setTimeout(() => onCompleteRef.current(), 700);
      return () => clearTimeout(t);
    }
  }, [locked]);

  // Build SVG wave strings so kids visually match the purple wave onto the green target wave!
  const targetWavePts = Array.from({ length: 32 }, (_, i) => {
    const x = (i / 31) * 280;
    const y = 32 + Math.sin((i / 31) * Math.PI * 4) * 20;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const playerWavePts = Array.from({ length: 32 }, (_, i) => {
    const x = (i / 31) * 280;
    const freqScale = 2.2 + (angle / 68) * 1.8;
    const y = 32 + Math.sin((i / 31) * Math.PI * freqScale + (diff * 0.04)) * 20;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-xs font-bold text-purple-400">Communication Dish Aiming Wheel</div>
        <h3 className="font-display text-xl font-bold text-white">
          Match the Satellite Wave Signal
        </h3>
      </div>

      <div className="p-5 rounded-2xl bg-slate-900 border border-white/12 space-y-4">
        <div className="rounded-xl bg-slate-950 border border-white/10 p-3 flex justify-center">
          <svg viewBox="0 0 280 64" className="w-full h-16 overflow-visible">
            <polyline fill="none" stroke="#10b981" strokeWidth="3" strokeOpacity="0.45" strokeDasharray="5 4" points={targetWavePts} />
            <polyline fill="none" stroke={locked ? '#34d399' : '#c084fc'} strokeWidth="3.5" points={playerWavePts} />
          </svg>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-300">Signal Lock</span>
          <span className={`font-mono-num font-bold ${locked ? 'text-emerald-400' : 'text-amber-300'}`}>
            {signal}% {locked ? '· LOCKED!' : ''}
          </span>
        </div>
        <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all ${locked ? 'bg-emerald-400' : 'bg-purple-400'}`}
            style={{ width: `${signal}%` }}
          />
        </div>

        <input
          type="range"
          min={10}
          max={100}
          value={angle}
          onChange={(e) => setAngle(Number(e.target.value))}
          className="w-full accent-purple-500 cursor-pointer"
        />
        <div className="text-xs text-slate-400 text-center">
          Slide until the purple wave matches the green wave! (<span className="font-mono-num text-white">{angle}°</span>)
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// MISSION 5B / CHAPTER 6: HOLD TO BOOST & TRANSMIT RADIO SIGNAL (TIME-BASED)
// =========================================================================
const RADIO_TRANSMIT_DURATION_SEC = 3.2;

const RadioHoldWorkbench: React.FC<{
  initialProgress?: number;
  alreadyTransmitted?: boolean;
  onProgressChange?: (pct: number) => void;
  onCommitted?: () => void;
  onComplete: () => void;
}> = ({
  initialProgress = 0,
  alreadyTransmitted = false,
  onProgressChange,
  onCommitted,
  onComplete,
}) => {
  const startingPct = alreadyTransmitted
    ? 100
    : Math.max(0, Math.min(99, Math.round(initialProgress)));

  const [progress, setProgress] = useState<number>(startingPct);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [autoTransmitting, setAutoTransmitting] = useState<boolean>(false);
  const [received, setReceived] = useState<boolean>(alreadyTransmitted);

  const progressRef = useRef<number>(startingPct);
  const activeModeRef = useRef<'idle' | 'hold' | 'auto'>('idle');
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const lastReportedIntRef = useRef<number>(startingPct);
  const completedRef = useRef<boolean>(alreadyTransmitted);

  const onProgressChangeRef = useRef(onProgressChange);
  onProgressChangeRef.current = onProgressChange;
  const onCommittedRef = useRef(onCommitted);
  onCommittedRef.current = onCommitted;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const finishTransmission = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    activeModeRef.current = 'idle';
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    progressRef.current = 100;
    setProgress(100);
    setIsHolding(false);
    setAutoTransmitting(false);
    setReceived(true);
    onProgressChangeRef.current?.(100);
    onCommittedRef.current?.();
    soundEngine.playMissionComplete();
    window.setTimeout(() => {
      onCompleteRef.current();
    }, 1600);
  };

  useEffect(() => {
    if (alreadyTransmitted && !completedRef.current) {
      finishTransmission();
    }
  }, [alreadyTransmitted]);

  const stopLoop = () => {
    activeModeRef.current = 'idle';
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsHolding(false);
    setAutoTransmitting(false);
  };

  const ensureLoopRunning = (mode: 'hold' | 'auto') => {
    if (completedRef.current || progressRef.current >= 100) return;
    activeModeRef.current = mode;
    if (rafRef.current !== null) return;

    lastFrameRef.current = performance.now();
    const tick = (now: number) => {
      if (completedRef.current || activeModeRef.current === 'idle') {
        rafRef.current = null;
        return;
      }
      const dtSec = Math.min(0.1, Math.max(0, (now - lastFrameRef.current) / 1000));
      lastFrameRef.current = now;

      const ratePerSec = 100 / RADIO_TRANSMIT_DURATION_SEC;
      const next = Math.min(100, progressRef.current + dtSec * ratePerSec);
      progressRef.current = next;
      setProgress(next);

      const rounded = Math.round(next);
      if (rounded !== lastReportedIntRef.current) {
        lastReportedIntRef.current = rounded;
        onProgressChangeRef.current?.(rounded);
      }

      if (next >= 100) {
        finishTransmission();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const handleHoldStart = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (completedRef.current || autoTransmitting) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if synthetic pointer
    }
    soundEngine.playRadioChirp();
    setIsHolding(true);
    ensureLoopRunning('hold');
  };

  const handleHoldStop = (e?: React.PointerEvent<HTMLButtonElement>) => {
    if (e) {
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // ignore
      }
    }
    if (activeModeRef.current === 'hold') {
      stopLoop();
      onProgressChangeRef.current?.(Math.round(progressRef.current));
    }
  };

  const handleStartTimedTransmission = () => {
    if (completedRef.current || autoTransmitting) return;
    soundEngine.playRadioChirp();
    setIsHolding(false);
    setAutoTransmitting(true);
    ensureLoopRunning('auto');
  };

  useEffect(() => {
    const onGlobalRelease = () => {
      if (activeModeRef.current === 'hold') {
        stopLoop();
        onProgressChangeRef.current?.(Math.round(progressRef.current));
      }
    };
    window.addEventListener('pointerup', onGlobalRelease);
    window.addEventListener('pointercancel', onGlobalRelease);
    window.addEventListener('blur', onGlobalRelease);
    return () => {
      window.removeEventListener('pointerup', onGlobalRelease);
      window.removeEventListener('pointercancel', onGlobalRelease);
      window.removeEventListener('blur', onGlobalRelease);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const displayPct = Math.min(100, Math.round(progress));
  const remainingSec = Math.max(
    0,
    ((100 - progress) / 100) * RADIO_TRANSMIT_DURATION_SEC,
  ).toFixed(1);
  const isActive = isHolding || autoTransmitting;

  return (
    <div className="p-5 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-purple-400">Mars Radio Console</div>
          <h3 className="font-display text-xl font-bold text-white">
            Boost &amp; Send Radio Signal
          </h3>
        </div>
        <span
          className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold border ${
            received
              ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
              : isActive
                ? 'bg-sky-500/20 border-sky-400/50 text-sky-300'
                : displayPct > 0
                  ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                  : 'bg-slate-800 border-white/10 text-slate-300'
          }`}
        >
          {received
            ? 'Completed 100%'
            : isActive
              ? 'Transmitting…'
              : displayPct > 0
                ? `Paused at ${displayPct}%`
                : 'Ready'}
        </span>
      </div>

      <div className="px-3.5 py-2 rounded-xl bg-purple-950/60 border border-purple-400/30 text-xs text-purple-100 leading-relaxed">
        {received
          ? 'Transmission complete! Relay Satellite locked and delivered the Explorer Archive to Commander Nova.'
          : 'Press and hold the button below to beam the Sojourner Rover Archive across Mars, or tap START TRANSMISSION for an automatic timed send.'}
      </div>

      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-white/12 space-y-4">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
          <span className={displayPct >= 5 ? 'text-sky-300 font-bold' : ''}>Ares Outpost</span>
          <span className={displayPct >= 50 ? 'text-purple-300 font-bold' : ''}>
            Relay Satellite
          </span>
          <span className={displayPct >= 100 ? 'text-emerald-300 font-bold' : ''}>
            Nova’s Lander
          </span>
        </div>

        {/* Signal Progress Bar & Live Status */}
        <div className="space-y-1.5">
          <div className="h-3.5 rounded-full bg-slate-800 overflow-hidden border border-white/10">
            <div
              className={`h-full transition-[background-color] duration-150 ${
                received ? 'bg-emerald-400' : 'bg-gradient-to-r from-sky-400 via-purple-400 to-emerald-400'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono-num font-bold text-sky-300">
              Signal Progress: {displayPct}%
            </span>
            <span className="font-mono-num text-slate-300">
              {received
                ? 'Transmission Completed!'
                : isActive
                  ? `Est. ${remainingSec}s remaining`
                  : displayPct > 0
                    ? `Progress saved (${remainingSec}s left)`
                    : `Est. ${RADIO_TRANSMIT_DURATION_SEC.toFixed(1)}s`}
            </span>
          </div>
        </div>

        {!received ? (
          <div className="space-y-2.5">
            {/* Primary Hold-to-Transmit Control */}
            <button
              type="button"
              onPointerDown={handleHoldStart}
              onPointerUp={handleHoldStop}
              onPointerCancel={handleHoldStop}
              onLostPointerCapture={handleHoldStop}
              disabled={autoTransmitting}
              className={`touch-none select-none w-full py-3.5 px-4 rounded-2xl border-2 font-bold text-sm relative overflow-hidden flex items-center justify-center gap-2 transition-colors ${
                autoTransmitting
                  ? 'bg-slate-800 border-slate-700 text-slate-400 cursor-not-allowed'
                  : isHolding
                    ? 'bg-purple-500 border-sky-300 text-white cursor-pointer'
                    : 'bg-purple-600 hover:bg-purple-500 border-purple-400/60 text-white cursor-pointer'
              }`}
            >
              <div
                className="absolute inset-y-0 left-0 bg-sky-400/35 pointer-events-none"
                style={{ width: `${progress}%` }}
              />
              <Radio className="w-4 h-4 relative z-10" />
              <span className="relative z-10">
                {isHolding
                  ? `Holding — Transmitting… ${displayPct}%`
                  : displayPct > 0
                    ? `Hold to Resume Transmission (${displayPct}%)`
                    : 'Hold to Transmit Signal'}
              </span>
            </button>

            {/* Accessible Timed-Transmission Alternative */}
            <button
              type="button"
              onClick={handleStartTimedTransmission}
              disabled={autoTransmitting}
              className={`w-full py-2.5 px-4 rounded-xl border font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                autoTransmitting
                  ? 'bg-sky-950/70 border-sky-400/50 text-sky-200 cursor-default'
                  : 'bg-slate-800 hover:bg-slate-700 border-sky-400/40 text-sky-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-300" />
              <span>
                {autoTransmitting
                  ? `Transmission Started… ${displayPct}% (${remainingSec}s)`
                  : 'START TRANSMISSION (Timed Auto-Send)'}
              </span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-emerald-950/75 border border-emerald-400/45 text-emerald-100 text-xs sm:text-sm font-medium leading-relaxed text-center">
              <strong className="text-emerald-300 block mb-1">
                Signal Confirmed at 100%!
              </strong>
              Commander Nova: “Signal received! Excellent work. The Explorer Archive is safely
              back online. Let us see what we learned and prepare for our next Mars adventure!”
            </div>
            <button
              type="button"
              onClick={() => onCompleteRef.current()}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Complete Mission!
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// =========================================================================
// MISSION 6A: DRAG HEAVY STORM BATTERY LEVER
// =========================================================================
const StormBatteryWorkbench: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [sliderVal, setSliderVal] = useState(0);
  const doneRef = useRef(false);

  const handleChange = (v: number) => {
    setSliderVal(v);
    if (v >= 95 && !doneRef.current) {
      doneRef.current = true;
      soundEngine.playMissionComplete();
      setTimeout(onComplete, 550);
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <div className="text-xs font-bold text-amber-400">Power Station · Storm Backup</div>
        <h3 className="font-display text-xl font-bold text-white">
          Slide Backup Battery Lever to LOCKED
        </h3>
      </div>

      <div className="p-5 rounded-2xl bg-slate-900 border border-white/12 space-y-4">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-red-400">OFF (Storm Drop)</span>
          <span className={sliderVal >= 95 ? 'text-emerald-400' : 'text-amber-300'}>
            {sliderVal >= 95 ? 'BACKUP ONLINE!' : 'SLIDE RIGHT →'}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={sliderVal}
          onChange={(e) => handleChange(Number(e.target.value))}
          className="w-full accent-amber-400 cursor-pointer h-4"
        />
      </div>
    </div>
  );
};

// =========================================================================
// MISSION 6B: SLIDE 3 GREENHOUSE STORM SHUTTERS CLOSED
// =========================================================================
const StormShutterWorkbench: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [shutters, setShutters] = useState([0, 0, 0]);
  const doneRef = useRef(false);

  const updateShutter = (idx: number, val: number) => {
    const next = [...shutters];
    next[idx] = val;
    setShutters(next);
    if (next.every((s) => s >= 90) && !doneRef.current) {
      doneRef.current = true;
      soundEngine.playMissionComplete();
      setTimeout(onComplete, 550);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-xs font-bold text-emerald-400">Greenhouse · Storm Defense</div>
        <h3 className="font-display text-xl font-bold text-white">
          Slide All 3 Storm Shields Closed
        </h3>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900 border border-white/12 space-y-3">
        {shutters.map((val, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" /> Bay {idx + 1} Shield
              </span>
              <span className={val >= 90 ? 'text-emerald-400 font-bold' : 'text-amber-300'}>
                {val >= 90 ? 'LOCKED' : `${val}%`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={val}
              onChange={(e) => updateShutter(idx, Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>
        ))}
      </div>
    </div>
  );
};

// =========================================================================
// MISSION 6C: FLIP COVER & HOLD LANDING BEACON IGNITION
// =========================================================================
const BeaconIgnitionWorkbench: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [coverOpen, setCoverOpen] = useState(false);
  const [holdPct, setHoldPct] = useState(0);
  const timerRef = useRef<number | null>(null);
  const doneRef = useRef(false);

  const startHold = () => {
    if (!coverOpen || doneRef.current) return;
    soundEngine.playClick();
    timerRef.current = window.setInterval(() => {
      setHoldPct((p) => {
        const next = Math.min(100, p + 8);
        if (next >= 100 && !doneRef.current) {
          doneRef.current = true;
          if (timerRef.current) clearInterval(timerRef.current);
          soundEngine.playMissionComplete();
          setTimeout(onComplete, 650);
        }
        return next;
      });
    }, 55);
  };

  const stopHold = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!doneRef.current) setHoldPct(0);
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <div className="text-xs font-bold text-amber-400">Command Centre · Landing Beacon</div>
        <h3 className="font-display text-xl font-bold text-white">
          Open Safety Cover &amp; Fire Sky Beacon!
        </h3>
      </div>

      <div className="p-5 rounded-2xl bg-slate-900 border border-white/12 space-y-4">
        <button
          onClick={() => {
            soundEngine.playClick();
            setCoverOpen(true);
          }}
          className={`w-full py-2.5 rounded-xl border font-bold text-xs cursor-pointer ${
            coverOpen
              ? 'bg-emerald-950 border-emerald-400 text-emerald-300'
              : 'bg-slate-800 border-amber-400 text-amber-200'
          }`}
        >
          {coverOpen ? '1. Safety Cover Open!' : '1. Tap to Flip Open Safety Cover'}
        </button>

        <button
          onPointerDown={startHold}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          className={`touch-none w-full py-4 rounded-2xl border-2 font-bold text-sm relative overflow-hidden cursor-pointer ${
            holdPct >= 100
              ? 'bg-amber-400 border-white text-slate-950'
              : coverOpen
                ? 'bg-orange-500 hover:bg-orange-400 border-amber-300 text-slate-950'
                : 'bg-slate-800 border-slate-700 text-slate-500'
          }`}
        >
          <div
            className="absolute inset-y-0 left-0 bg-yellow-200/45 pointer-events-none"
            style={{ width: `${holdPct}%` }}
          />
          <span className="relative z-10">
            {holdPct >= 100
              ? 'BEACON LIT! Guiding Commander Nova Home!'
              : holdPct > 0
                ? `Charging Golden Sky Beam… ${holdPct}%`
                : '2. Press & HOLD: Ignite Landing Beacon'}
          </span>
        </button>
      </div>
    </div>
  );
};

// =========================================================================
// MISSION 4C: PLANT SEEDS, WATER BEDS & GROW MARS TOMATOES
// =========================================================================
const SeedGardenWorkbench: React.FC<{ isBotanist: boolean; onComplete: () => void }> = ({
  isBotanist,
  onComplete,
}) => {
  // Stage per bed: 0=empty soil, 1=seed planted, 2=watered & sprouting, 3=ripe tomatoes
  const [beds, setBeds] = useState<[number, number, number]>([0, 0, 0]);
  const [hint, setHint] = useState(
    'Tap each empty soil slot to plant Mars tomato seeds, then water them to grow!',
  );
  const doneRef = useRef(false);

  const handleBedTap = (idx: number) => {
    const stage = beds[idx];
    if (stage >= 3) return;
    if (stage === 0) {
      soundEngine.playSeedPlant();
      const next = [...beds] as [number, number, number];
      next[idx] = 1;
      setBeds(next);
      setHint('Seed tucked into soil! Tap again to mist it with recycled water!');
    } else if (stage === 1) {
      soundEngine.playToolSuccess();
      const next = [...beds] as [number, number, number];
      next[idx] = 2;
      setBeds(next);
      setHint(
        isBotanist
          ? 'Zara Botanist Boost! Sprouts are shooting up fast—tap to give them warm light!'
          : 'Green sprouts popped up! Tap once more to finish growing ripe red tomatoes!',
      );
    } else if (stage === 2) {
      soundEngine.playMissionComplete();
      const next = [...beds] as [number, number, number];
      next[idx] = 3;
      setBeds(next);
      if (next.every((s) => s === 3) && !doneRef.current) {
        doneRef.current = true;
        setHint('All 3 beds are bursting with bright red Mars tomatoes! Ready to harvest!');
        setTimeout(onComplete, 850);
      }
    }
  };

  const stageLabel = (s: number) =>
    s === 0
      ? 'Tap: Plant Seed'
      : s === 1
        ? 'Tap: Water Seed'
        : s === 2
          ? 'Tap: Grow Crop'
          : 'Ripe Tomato!';

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-emerald-400">Greenhouse · Seedling Beds</div>
          <h3 className="font-display text-xl font-bold text-white">
            Plant &amp; Grow Mars Tomatoes
          </h3>
        </div>
        {isBotanist && (
          <div className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-[11px] font-bold text-emerald-300">
            Botanist Bonus Active
          </div>
        )}
      </div>

      <div className="px-3.5 py-2 rounded-xl bg-emerald-950/70 border border-emerald-400/30 text-xs text-emerald-100">
        {hint}
      </div>

      <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-900 border border-white/12">
        {beds.map((st, idx) => (
          <button
            key={idx}
            onClick={() => handleBedTap(idx)}
            className={`h-32 rounded-2xl border-2 p-3 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
              st === 3
                ? 'bg-emerald-950 border-emerald-400 text-emerald-100'
                : st === 2
                  ? 'bg-lime-950/70 border-lime-400 text-lime-200'
                  : st === 1
                    ? 'bg-amber-950/70 border-amber-400 text-amber-100'
                    : 'bg-stone-900 border-stone-600 text-stone-300 hover:border-emerald-400'
            }`}
          >
            <Sprout
              className={`w-7 h-7 ${
                st === 3
                  ? 'text-red-400'
                  : st === 2
                    ? 'text-emerald-400'
                    : st === 1
                      ? 'text-amber-300'
                      : 'text-stone-400'
              }`}
            />
            <span className="text-xs font-bold text-center">Bed {idx + 1}</span>
            <span className="text-[11px] font-semibold text-center">{stageLabel(st)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// =========================================================================
// MISSION 6A: RADIATION SHELTER — PLACE MARTIAN SOIL SHIELDING LAYERS
// =========================================================================
const RadShieldingWorkbench: React.FC<{
  onProgress?: (level: number) => void;
  onComplete: () => void;
}> = ({ onProgress, onComplete }) => {
  const [zones, setZones] = useState<{ west: boolean; east: boolean; roof: boolean }>({
    west: false,
    east: false,
    roof: false,
  });
  const [hint, setHint] = useState(
    'Drag Martian Regolith Soil Blocks onto the West Wall, East Wall, and Roof Canopy!',
  );

  const westRef = useRef<HTMLDivElement | null>(null);
  const eastRef = useRef<HTMLDivElement | null>(null);
  const roofRef = useRef<HTMLDivElement | null>(null);
  const doneRef = useRef(false);

  const countPlaced = (z: typeof zones) =>
    (z.west ? 1 : 0) + (z.east ? 1 : 0) + (z.roof ? 1 : 0);

  const { dragging, startDrag, moveDrag, endDrag } = usePointerDrag((x, y, key) => {
    if (key !== 'regolith_block') return;
    let target: 'west' | 'east' | 'roof' | null = null;
    if (!zones.west && isInsideRect(x, y, westRef.current)) target = 'west';
    else if (!zones.east && isInsideRect(x, y, eastRef.current)) target = 'east';
    else if (!zones.roof && isInsideRect(x, y, roofRef.current)) target = 'roof';

    if (!target) {
      setHint('Drop the Martian Soil Block right onto an empty glowing shelter zone!');
      return;
    }

    soundEngine.playToolSuccess();
    const next = { ...zones, [target]: true };
    setZones(next);
    const total = countPlaced(next);
    onProgress?.(total);

    if (total === 3 && !doneRef.current) {
      doneRef.current = true;
      soundEngine.playMissionComplete();
      setHint('All 3 regolith layers packed! Shelter shielding thickness is now 100%!');
      setTimeout(onComplete, 800);
    } else {
      setHint(`${total}/3 shielding layers packed! Drag blocks onto the remaining spots.`);
    }
  });

  const placedCount = countPlaced(zones);
  const pct = Math.round((placedCount / 3) * 100);

  return (
    <div className="p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-rose-400">Radiation Shelter · Reinforcement</div>
          <h3 className="font-display text-lg sm:text-xl font-bold text-white">
            Place Regolith Soil Shielding Layers
          </h3>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-slate-400">Shielding</div>
          <div className="font-mono-num text-lg font-bold text-emerald-300">{pct}%</div>
        </div>
      </div>

      <div className="px-3.5 py-2 rounded-xl bg-rose-950/70 border border-rose-400/30 text-xs text-rose-100">
        {hint}
      </div>

      <div className="p-4 rounded-2xl bg-slate-900 border border-white/12 space-y-4">
        <div
          ref={roofRef}
          className={`h-16 rounded-2xl border-2 flex items-center justify-center gap-2 text-xs font-bold ${
            zones.roof
              ? 'bg-emerald-950 border-emerald-400 text-emerald-200'
              : 'bg-slate-950 border-dashed border-amber-400 text-amber-200'
          }`}
        >
          {zones.roof ? <Check className="w-4 h-4 text-emerald-400" /> : <Shield className="w-4 h-4" />}
          <span>{zones.roof ? 'Roof Canopy Shielded (100%)' : 'Drop Here: Roof Canopy Layer'}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div
            ref={westRef}
            className={`h-24 rounded-2xl border-2 flex flex-col items-center justify-center p-2 text-center text-xs font-bold ${
              zones.west
                ? 'bg-emerald-950 border-emerald-400 text-emerald-200'
                : 'bg-slate-950 border-dashed border-amber-400 text-amber-200'
            }`}
          >
            {zones.west ? <Check className="w-4 h-4 text-emerald-400 mb-1" /> : <Shield className="w-4 h-4 mb-1" />}
            <span>{zones.west ? 'West Wall Packed' : 'Drop: West Bunker Wall'}</span>
          </div>

          <div
            ref={eastRef}
            className={`h-24 rounded-2xl border-2 flex flex-col items-center justify-center p-2 text-center text-xs font-bold ${
              zones.east
                ? 'bg-emerald-950 border-emerald-400 text-emerald-200'
                : 'bg-slate-950 border-dashed border-amber-400 text-amber-200'
            }`}
          >
            {zones.east ? <Check className="w-4 h-4 text-emerald-400 mb-1" /> : <Shield className="w-4 h-4 mb-1" />}
            <span>{zones.east ? 'East Wall Packed' : 'Drop: East Bunker Wall'}</span>
          </div>
        </div>

        {placedCount < 3 && (
          <div className="flex justify-center pt-1">
            <div
              onPointerDown={(e) => startDrag('regolith_block', 'Martian Soil Shield Block', e)}
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
              className="touch-none select-none px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg cursor-grab active:cursor-grabbing"
            >
              Drag: Martian Regolith Soil Block ({3 - placedCount} left)
            </div>
          </div>
        )}
      </div>

      {dragging && (
        <div
          className="fixed z-50 pointer-events-none px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs shadow-2xl -translate-x-1/2 -translate-y-1/2"
          style={{ left: dragging.x, top: dragging.y }}
        >
          {dragging.label}
        </div>
      )}
    </div>
  );
};

// =========================================================================
// MISSION 6B: RADIATION STORM DRILL (CLEARLY LABELED GAME SIMULATION)
// =========================================================================
const RadStormDrillWorkbench: React.FC<{
  shieldLevel: number;
  onComplete: () => void;
}> = ({ shieldLevel, onComplete }) => {
  const [airlockSealed, setAirlockSealed] = useState(false);
  const [drillRunning, setDrillRunning] = useState(false);
  const [wavePct, setWavePct] = useState(0);
  const [drillDone, setDrillDone] = useState(false);

  const protectionPct = Math.min(99, 35 + shieldLevel * 21);

  useEffect(() => {
    if (!drillRunning || drillDone) return;
    const iv = window.setInterval(() => {
      setWavePct((w) => {
        if (w >= 100) {
          clearInterval(iv);
          soundEngine.playMissionComplete();
          setDrillDone(true);
          return 100;
        }
        return Math.min(100, w + 6);
      });
    }, 80);
    return () => clearInterval(iv);
  }, [drillRunning, drillDone]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-bold text-rose-400">
            GAME SIMULATION · Radiation Shelter Drill
          </div>
          <h3 className="font-display text-xl font-bold text-white">
            Activate Storm Protection &amp; Run Drill
          </h3>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-[10px] font-extrabold text-amber-200 uppercase">
          Game Simulation
        </span>
      </div>

      <div className="p-3 rounded-xl bg-slate-900 border border-amber-400/25 text-xs text-slate-200 leading-relaxed">
        <strong>Educational Game Simulation:</strong> These drill numbers show how packed soil
        layers help block simulated solar storm waves inside this game. They are not real-world
        Mars weather or safety predictions.
      </div>

      <div className="p-4 rounded-2xl bg-slate-900 border border-white/12 space-y-3.5">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-300">Simulated Regolith Shielding Rating</span>
          <span className="font-mono-num text-emerald-300">{protectionPct}% Protected</span>
        </div>

        <button
          onClick={() => {
            soundEngine.playClick();
            setAirlockSealed(true);
          }}
          className={`w-full py-3 rounded-xl border-2 font-bold text-xs cursor-pointer ${
            airlockSealed
              ? 'bg-emerald-950 border-emerald-400 text-emerald-200'
              : 'bg-slate-800 border-amber-400 text-amber-200 hover:bg-slate-700'
          }`}
        >
          {airlockSealed ? '1. Shelter Blast Airlock SEALED' : '1. Tap to Seal Shelter Airlock'}
        </button>

        {!drillDone ? (
          <button
            onClick={() => {
              if (!airlockSealed) return;
              soundEngine.playAlert();
              setDrillRunning(true);
            }}
            disabled={!airlockSealed || drillRunning}
            className={`w-full py-3.5 rounded-xl font-bold text-sm relative overflow-hidden cursor-pointer ${
              airlockSealed
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <div
              className="absolute inset-y-0 left-0 bg-amber-400/35 pointer-events-none"
              style={{ width: `${wavePct}%` }}
            />
            <span className="relative z-10">
              {drillRunning
                ? `Simulated Storm Wave Passing… ${wavePct}%`
                : '2. Start GAME SIMULATION Storm Drill'}
            </span>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-400/40 text-xs text-emerald-100 text-center font-semibold">
              Drill Passed! {protectionPct}% of the simulated solar storm wave was deflected by your
              regolith soil layers!
            </div>
            <button
              onClick={onComplete}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm cursor-pointer"
            >
              Finish Storm Drill
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// =========================================================================
// LOST ROVER DIAGNOSTIC & RECOVERY WORKBENCH (Wipe Dust -> Tune Dish -> Sync Relay)
// =========================================================================
const RoverDiagnosticWorkbench: React.FC<{
  rover: LostRoverSpec | null;
  onComplete: () => void;
}> = ({ rover, onComplete }) => {
  const [dustCleared, setDustCleared] = useState(0);
  const [antennaAngle, setAntennaAngle] = useState(25);
  const [syncHeld, setSyncHeld] = useState(0);
  const [holding, setHolding] = useState(false);

  const wipeDone = dustCleared >= 100;
  const dishLocked = Math.abs(antennaAngle - 68) <= 8;
  const synced = syncHeld >= 100;

  useEffect(() => {
    if (!holding || synced || !wipeDone || !dishLocked) return;
    const id = window.setInterval(() => {
      setSyncHeld((p) => {
        const next = Math.min(100, p + 8);
        if (next >= 100) {
          soundEngine.playMissionComplete();
          setHolding(false);
        }
        return next;
      });
    }, 80);
    return () => clearInterval(id);
  }, [holding, synced, wipeDone, dishLocked]);

  return (
    <div className="p-5 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-sky-400">
            {rover?.era ?? 'Mars Heritage Rover'}
          </div>
          <h3 className="font-display text-xl font-bold text-white">
            {rover?.name ?? 'Lost Mars Rover'} Diagnostic
          </h3>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-[10px] font-extrabold text-amber-200 uppercase shrink-0">
          Game Simulation
        </span>
      </div>

      {rover && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-sky-950/50 border border-sky-400/30 text-sky-100">
            <div className="font-bold text-sky-300 mb-0.5">Real NASA History</div>
            {rover.realHistoricalFact}
          </div>
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-400/30 text-amber-100">
            <div className="font-bold text-amber-300 mb-0.5">Colony Simulation Task</div>
            {rover.simulatedMissionTask}
          </div>
        </div>
      )}

      {/* Step 1: Swipe dust off rover solar/sensor deck */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-200">1. Brush Mars Dust Off Rover Deck</span>
          <span className="font-mono-num text-orange-300">{Math.round(dustCleared)}%</span>
        </div>
        <div
          onPointerMove={(e) => {
            if (e.buttons === 1 || e.pointerType === 'touch') {
              setDustCleared((d) => {
                const n = Math.min(100, d + 4.5);
                if (n === 100 && d < 100) soundEngine.playToolSuccess();
                return n;
              });
            }
          }}
          onPointerDown={() => {
            setDustCleared((d) => {
              const n = Math.min(100, d + 12);
              if (n === 100 && d < 100) soundEngine.playToolSuccess();
              return n;
            });
          }}
          className="touch-none h-14 rounded-xl bg-slate-950 border-2 border-dashed border-orange-400/50 relative overflow-hidden flex items-center justify-center cursor-ew-resize"
        >
          <div
            className="absolute inset-0 bg-[#9a3412] pointer-events-none transition-opacity"
            style={{ opacity: Math.max(0, 1 - dustCleared / 100) * 0.85 }}
          />
          <span className="relative z-10 text-xs font-bold text-white">
            {wipeDone ? 'Rover Deck Clean!' : 'Rub or Tap Back & Forth Here to Brush Dust'}
          </span>
        </div>
      </div>

      {/* Step 2: Aim Rover Relay Antenna to 68° */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-200">2. Align Telemetry Antenna (Target ~68°)</span>
          <span className={`font-mono-num ${dishLocked ? 'text-emerald-300' : 'text-amber-300'}`}>
            {antennaAngle}° {dishLocked ? '· LOCKED' : ''}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={antennaAngle}
          disabled={!wipeDone}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            setAntennaAngle(val);
            if (Math.abs(val - 68) <= 8) soundEngine.playScannerPing();
          }}
          className="w-full accent-sky-400 cursor-pointer"
        />
      </div>

      {/* Step 3: Tap or Hold to Sync Telemetry Packet (never gets stuck on %!) */}
      {!synced ? (
        <button
          onClick={() => {
            if (!wipeDone || !dishLocked) return;
            soundEngine.playRadioChirp();
            setHolding(true);
            setSyncHeld((p) => Math.min(100, p + 25));
          }}
          disabled={!wipeDone || !dishLocked}
          className={`touch-none w-full py-3.5 rounded-xl font-bold text-sm relative overflow-hidden cursor-pointer ${
            wipeDone && dishLocked
              ? 'bg-sky-600 hover:bg-sky-500 text-white'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <div
            className="absolute inset-y-0 left-0 bg-emerald-400/35 pointer-events-none transition-all duration-100"
            style={{ width: `${syncHeld}%` }}
          />
          <span className="relative z-10">
            {holding
              ? `Downloading Rover Telemetry… ${syncHeld}%`
              : '3. Tap to Sync & Download Rover Archive'}
          </span>
        </button>
      ) : (
        <button
          onClick={onComplete}
          className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm cursor-pointer"
        >
          Save Rover Archive &amp; Complete Tracking!
        </button>
      )}
    </div>
  );
};

// =========================================================================
// MISSION 1: REMOTE COMMUNICATION RELAY STABILIZER
// =========================================================================
const RelayStabilizeWorkbench: React.FC<{
  onCommitted: () => void;
  onComplete: () => void;
}> = ({ onCommitted, onComplete }) => {
  const [switches, setSwitches] = useState([false, false, false]);
  const [freq, setFreq] = useState(32);
  const doneRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const onCommittedRef = useRef(onCommitted);
  onCommittedRef.current = onCommitted;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const allOn = switches.every(Boolean);
  const locked = Math.abs(freq - 70) <= 10;
  const ready = allOn && locked;

  const toggleSwitch = (idx: number) => {
    soundEngine.playClick();
    const next = [...switches];
    next[idx] = !next[idx];
    setSwitches(next);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (ready && !doneRef.current) {
      doneRef.current = true;
      onCommittedRef.current();
      soundEngine.playMissionComplete();
      timerRef.current = window.setTimeout(() => onCompleteRef.current(), 700);
    }
  }, [ready]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-xs font-bold text-sky-400">Remote Exploration Site · Relay Cabinet</div>
        <h3 className="font-display text-xl font-bold text-white">
          Stabilize the Remote Comms Relay
        </h3>
        <p className="text-xs text-slate-300 mt-1">
          Commander Nova opened the relay door! Flip all 3 power switches green and slide the dial into the green zone.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5 p-4 rounded-2xl bg-slate-900 border border-white/12">
        {['Power A', 'Amplifier', 'Beacon'].map((label, idx) => (
          <button
            key={label}
            type="button"
            onClick={() => toggleSwitch(idx)}
            className={`py-3 px-2 rounded-xl border-2 font-bold text-xs flex flex-col items-center gap-1.5 cursor-pointer transition-colors ${
              switches[idx]
                ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                : 'bg-slate-800 border-amber-400/60 text-amber-200 hover:bg-slate-700'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>{label}</span>
            <span className="text-[10px] uppercase">
              {switches[idx] ? 'GREEN ON' : 'TAP TO FLIP'}
            </span>
          </button>
        ))}
      </div>

      <div className="p-4 rounded-2xl bg-slate-900 border border-white/12 space-y-2">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-slate-200">2. Lock Clear Signal (Green Zone ~70 MHz)</span>
          <span className={locked ? 'text-emerald-400' : 'text-amber-300'}>
            {freq} MHz {locked ? '· STEADY GREEN!' : ''}
          </span>
        </div>
        <input
          type="range"
          min={20}
          max={100}
          value={freq}
          onChange={(e) => {
            const v = Number(e.target.value);
            setFreq(v);
            if (Math.abs(v - 70) <= 10) soundEngine.playScannerPing();
          }}
          className="w-full accent-emerald-400 cursor-pointer h-3"
        />
      </div>
    </div>
  );
};

// =========================================================================
// MISSION 7: CLEAN & RESTART WATER RECYCLER
// =========================================================================
const RecyclerCleanWorkbench: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [dustCleared, setDustCleared] = useState(0);
  const [filterLocked, setFilterLocked] = useState(false);
  const doneRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const wipeDone = dustCleared >= 100;

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (wipeDone && filterLocked && !doneRef.current) {
      doneRef.current = true;
      soundEngine.playMissionComplete();
      timerRef.current = window.setTimeout(() => onCompleteRef.current(), 650);
    }
  }, [wipeDone, filterLocked]);

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-xs font-bold text-sky-400">Water Station · Recycler Drum</div>
        <h3 className="font-display text-xl font-bold text-white">
          Clean &amp; Restart the Water Recycler
        </h3>
      </div>

      <div
        onPointerDown={() => {
          soundEngine.playClick();
          setDustCleared((d) => Math.min(100, d + 25));
        }}
        className="touch-none h-20 rounded-2xl bg-slate-900 border-2 border-dashed border-sky-400/60 relative overflow-hidden flex items-center justify-center cursor-pointer"
      >
        <div
          className="absolute inset-0 bg-amber-900/75 pointer-events-none transition-opacity"
          style={{ opacity: Math.max(0, 1 - dustCleared / 100) }}
        />
        <span className="relative z-10 text-sm font-bold text-white flex items-center gap-2">
          <Droplets className="w-4 h-4 text-sky-300" />
          {wipeDone
            ? 'Drum Screen Sparkling Clean! (100%)'
            : `1. Tap Here to Rinse Red Dust (${dustCleared}%)`}
        </span>
      </div>

      <button
        type="button"
        disabled={!wipeDone}
        onClick={() => {
          soundEngine.playToolSuccess();
          setFilterLocked(true);
        }}
        className={`w-full py-3.5 rounded-xl border-2 font-bold text-sm cursor-pointer ${
          filterLocked
            ? 'bg-emerald-500 border-emerald-300 text-slate-950'
            : wipeDone
              ? 'bg-sky-600 hover:bg-sky-500 border-sky-300 text-white'
              : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
        }`}
      >
        {filterLocked ? 'Clean Water Loop Running!' : '2. Snap Fresh Filter & Restart Loop'}
      </button>
    </div>
  );
};

// =========================================================================
// MISSION 8: MEDICAL STATION GENTLE CREW CHECKUP
// =========================================================================
const MedicalScanWorkbench: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [checked, setChecked] = useState({ leo: false, maya: false, zara: false });
  const doneRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const scanCrew = (id: 'leo' | 'maya' | 'zara') => {
    soundEngine.playScannerPing();
    const next = { ...checked, [id]: true };
    setChecked(next);
    if (next.leo && next.maya && next.zara && !doneRef.current) {
      doneRef.current = true;
      soundEngine.playMissionComplete();
      timerRef.current = window.setTimeout(() => onCompleteRef.current(), 700);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-xs font-bold text-rose-400">Medical Room · Wellness Scanner</div>
        <h3 className="font-display text-xl font-bold text-white">
          Check Everyone’s Heartbeat &amp; Suit Seal
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-900 border border-white/12">
        {(
          [
            { id: 'leo', name: 'Leo', role: 'Engineer' },
            { id: 'maya', name: 'Maya', role: 'Scientist' },
            { id: 'zara', name: 'Zara', role: 'Botanist' },
          ] as const
        ).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => scanCrew(c.id)}
            className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
              checked[c.id]
                ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200'
                : 'bg-slate-800 border-rose-400/50 text-white hover:border-rose-300'
            }`}
          >
            <Activity className="w-6 h-6 text-rose-400" />
            <span className="text-sm font-bold">{c.name}</span>
            <span className="text-[11px] text-slate-300">{c.role}</span>
            <span className="text-[10px] font-bold uppercase mt-1">
              {checked[c.id] ? '100% Healthy!' : 'Tap to Scan'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

// =========================================================================
// MISSION 9: ORGANIZE FOOD SUPPLY PANTRY
// =========================================================================
const FoodSortWorkbench: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [placed, setPlaced] = useState([false, false, false]);
  const doneRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const packCrate = (idx: number) => {
    soundEngine.playToolSuccess();
    const next = [...placed];
    next[idx] = true;
    setPlaced(next);
    if (next.every(Boolean) && !doneRef.current) {
      doneRef.current = true;
      soundEngine.playMissionComplete();
      timerRef.current = window.setTimeout(() => onCompleteRef.current(), 650);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-xs font-bold text-emerald-400">Crew Home · Cooling Pantry</div>
        <h3 className="font-display text-xl font-bold text-white">
          Sort Fresh Crops &amp; Space Snacks onto Shelves
        </h3>
      </div>

      <div className="space-y-2.5 p-4 rounded-2xl bg-slate-900 border border-white/12">
        {[
          '🍅 Fresh Mars Tomatoes → Cold Produce Shelf',
          '🍓 Freeze-Dried Fruit Packs → Sealed Snack Drawer',
          '🥛 Protein & Cocoa Pouches → Warm Drink Rack',
        ].map((item, idx) => (
          <button
            key={item}
            type="button"
            onClick={() => packCrate(idx)}
            className={`w-full py-3 px-4 rounded-xl border-2 text-left text-xs font-bold flex items-center justify-between cursor-pointer transition-all ${
              placed[idx]
                ? 'bg-emerald-950 border-emerald-400 text-emerald-200'
                : 'bg-slate-800 border-amber-400/50 text-white hover:bg-slate-700'
            }`}
          >
            <span>{item}</span>
            <span>{placed[idx] ? 'STORED ✓' : 'TAP TO STORE'}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// =========================================================================
// MISSION 10: HABITAT TEMPERATURE CONTROL
// =========================================================================
const ThermalBalanceWorkbench: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [temp, setTemp] = useState(11);
  const doneRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const cozy = temp >= 20 && temp <= 23;

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleTemp = (v: number) => {
    setTemp(v);
    if (v >= 20 && v <= 23 && !doneRef.current) {
      doneRef.current = true;
      soundEngine.playMissionComplete();
      timerRef.current = window.setTimeout(() => onCompleteRef.current(), 700);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-xs font-bold text-amber-400">Crew Home · Thermostat</div>
        <h3 className="font-display text-xl font-bold text-white">
          Warm the Crew Habitat to a Cozy 21°C!
        </h3>
      </div>

      <div className="p-5 rounded-2xl bg-slate-900 border border-white/12 space-y-4 text-center">
        <div className="flex items-center justify-center gap-3">
          <Thermometer className={`w-8 h-8 ${cozy ? 'text-emerald-400' : 'text-sky-300'}`} />
          <span className="font-mono-num text-3xl font-black text-white">{temp}°C</span>
        </div>
        <div className="text-xs font-semibold text-slate-300">
          {cozy
            ? 'Perfect! Sleeping bunks are warm and cozy!'
            : temp < 20
              ? 'Too chilly! Slide right into the cozy 20°C–23°C zone.'
              : 'A bit too warm! Slide left into the cozy 20°C–23°C zone.'}
        </div>
        <input
          type="range"
          min={10}
          max={28}
          value={temp}
          onChange={(e) => handleTemp(Number(e.target.value))}
          className="w-full accent-amber-400 cursor-pointer h-3"
        />
      </div>
    </div>
  );
};

// =========================================================================
// MISSION 11: LOST EXPLORATION BEACON TUNER
// =========================================================================
const BeaconTuneWorkbench: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [cleaned, setCleaned] = useState(false);
  const [lit, setLit] = useState(false);
  const doneRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-xs font-bold text-orange-400">North Valley · Exploration Beacon</div>
        <h3 className="font-display text-xl font-bold text-white">
          Wake Up the Lost Trail Beacon
        </h3>
      </div>

      <div className="space-y-3 p-4 rounded-2xl bg-slate-900 border border-white/12">
        <button
          type="button"
          onClick={() => {
            soundEngine.playToolSuccess();
            setCleaned(true);
          }}
          className={`w-full py-3 rounded-xl border-2 font-bold text-xs cursor-pointer ${
            cleaned
              ? 'bg-emerald-950 border-emerald-400 text-emerald-200'
              : 'bg-slate-800 border-orange-400 text-orange-200 hover:bg-slate-700'
          }`}
        >
          {cleaned ? '1. Solar Cap Brushed Clean!' : '1. Brush Dust Off Solar Beacon Cap'}
        </button>

        <button
          type="button"
          disabled={!cleaned}
          onClick={() => {
            if (doneRef.current) return;
            doneRef.current = true;
            soundEngine.playMissionComplete();
            setLit(true);
            timerRef.current = window.setTimeout(() => onCompleteRef.current(), 650);
          }}
          className={`w-full py-3.5 rounded-xl font-bold text-sm cursor-pointer ${
            lit
              ? 'bg-amber-400 text-slate-950'
              : cleaned
                ? 'bg-orange-500 hover:bg-orange-400 text-slate-950'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          {lit ? 'Beacon Shining Bright!' : '2. Ignite Bright Orange Trail Pulse'}
        </button>
      </div>
    </div>
  );
};

// =========================================================================
// MISSION 14: MOUNTAIN RESEARCH STATION CALIBRATION
// =========================================================================
const MountainCalWorkbench: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [checks, setChecks] = useState({ wind: false, rock: false, sky: false });
  const doneRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const tapSensor = (key: 'wind' | 'rock' | 'sky') => {
    soundEngine.playScannerPing();
    const next = { ...checks, [key]: true };
    setChecks(next);
    if (next.wind && next.rock && next.sky && !doneRef.current) {
      doneRef.current = true;
      soundEngine.playMissionComplete();
      timerRef.current = window.setTimeout(() => onCompleteRef.current(), 650);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-xs font-bold text-emerald-400">Northwest Ridge · 5.4m Plateau</div>
        <h3 className="font-display text-xl font-bold text-white">
          Calibrate Mountain Station Sensors
        </h3>
      </div>

      <div className="grid grid-cols-3 gap-2.5 p-4 rounded-2xl bg-slate-900 border border-white/12">
        {[
          { k: 'wind' as const, label: 'Ridge Wind' },
          { k: 'rock' as const, label: 'Rock Core' },
          { k: 'sky' as const, label: 'Sky Clarity' },
        ].map((item) => (
          <button
            key={item.k}
            type="button"
            onClick={() => tapSensor(item.k)}
            className={`py-4 px-2 rounded-xl border-2 font-bold text-xs flex flex-col items-center gap-2 cursor-pointer ${
              checks[item.k]
                ? 'bg-emerald-950 border-emerald-400 text-emerald-200'
                : 'bg-slate-800 border-sky-400/50 text-white hover:bg-slate-700'
            }`}
          >
            <Compass className="w-5 h-5 text-emerald-300" />
            <span>{item.label}</span>
            <span className="text-[10px]">{checks[item.k] ? 'CALIBRATED ✓' : 'TAP TO TUNE'}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

// =========================================================================
// MISSION 17: POWER SATELLITE UPLINK ALIGNMENT
// =========================================================================
const SatelliteAlignWorkbench: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [angle, setAngle] = useState(20);
  const doneRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const locked = Math.abs(angle - 75) <= 9;

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleAngle = (v: number) => {
    setAngle(v);
    if (Math.abs(v - 75) <= 9 && !doneRef.current) {
      doneRef.current = true;
      soundEngine.playMissionComplete();
      timerRef.current = window.setTimeout(() => onCompleteRef.current(), 700);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-xs font-bold text-yellow-400">Solar Farm · Uplink Dish</div>
        <h3 className="font-display text-xl font-bold text-white">
          Point the Power Dish at Sun-Tracking Satellite (~75°)
        </h3>
      </div>

      <div className="p-5 rounded-2xl bg-slate-900 border border-white/12 space-y-3">
        <div className="flex justify-between text-xs font-bold">
          <span className="text-slate-300 flex items-center gap-1.5">
            <Sun className="w-4 h-4 text-yellow-400" /> Satellite Dish Tilt
          </span>
          <span className={locked ? 'text-emerald-400' : 'text-amber-300'}>
            {angle}° {locked ? '· FULL SUN LOCKED!' : ''}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={angle}
          onChange={(e) => handleAngle(Number(e.target.value))}
          className="w-full accent-yellow-400 cursor-pointer h-3"
        />
      </div>
    </div>
  );
};

// =========================================================================
// MISSION 18: REMOTE WEATHER STATION MAST
// =========================================================================
const WeatherCalWorkbench: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [spinReady, setSpinReady] = useState(false);
  const [gaugeOk, setGaugeOk] = useState(false);
  const doneRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-xs font-bold text-sky-400">Western Plains · Remote Weather Mast</div>
        <h3 className="font-display text-xl font-bold text-white">
          Free Wind Cups &amp; Send Forecast
        </h3>
      </div>

      <div className="space-y-3 p-4 rounded-2xl bg-slate-900 border border-white/12">
        <button
          type="button"
          onClick={() => {
            soundEngine.playToolSuccess();
            setSpinReady(true);
          }}
          className={`w-full py-3 rounded-xl border-2 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer ${
            spinReady
              ? 'bg-emerald-950 border-emerald-400 text-emerald-200'
              : 'bg-slate-800 border-sky-400 text-sky-200 hover:bg-slate-700'
          }`}
        >
          <Wind className="w-4 h-4" />
          {spinReady ? '1. Wind Cups Spinning Smoothly!' : '1. Tap to Clear Stuck Wind Cups'}
        </button>

        <button
          type="button"
          disabled={!spinReady}
          onClick={() => {
            if (doneRef.current) return;
            doneRef.current = true;
            soundEngine.playMissionComplete();
            setGaugeOk(true);
            timerRef.current = window.setTimeout(() => onCompleteRef.current(), 650);
          }}
          className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer ${
            gaugeOk
              ? 'bg-emerald-500 text-slate-950'
              : spinReady
                ? 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Gauge className="w-4 h-4" />
          {gaugeOk ? 'Weather Signal Clear!' : '2. Calibrate Dust Sensor & Send Data'}
        </button>
      </div>
    </div>
  );
};

// =========================================================================
// MISSION 19: BACKUP EMERGENCY HABITAT OVERRIDE
// =========================================================================
const EmergencyOverrideWorkbench: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [sealed, setSealed] = useState(false);
  const doneRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div>
        <div className="text-xs font-bold text-rose-400">Backup Emergency Habitat · Safety Test</div>
        <h3 className="font-display text-xl font-bold text-white">
          Test Colony Emergency Shield Override
        </h3>
      </div>

      <div className="p-5 rounded-2xl bg-slate-900 border border-white/12 space-y-4 text-center">
        <p className="text-xs text-slate-300">
          Tap the emergency safety switch below to verify that our backup dome locks down cleanly during drills!
        </p>
        <button
          type="button"
          onClick={() => {
            if (doneRef.current) return;
            doneRef.current = true;
            soundEngine.playMissionComplete();
            setSealed(true);
            timerRef.current = window.setTimeout(() => onCompleteRef.current(), 650);
          }}
          className={`w-full py-4 rounded-2xl font-extrabold text-sm cursor-pointer transition-colors ${
            sealed
              ? 'bg-emerald-500 text-slate-950'
              : 'bg-rose-600 hover:bg-rose-500 text-white'
          }`}
        >
          {sealed ? 'Backup Dome Verified 100% Safe!' : 'Verify Backup Emergency Override'}
        </button>
      </div>
    </div>
  );
};
