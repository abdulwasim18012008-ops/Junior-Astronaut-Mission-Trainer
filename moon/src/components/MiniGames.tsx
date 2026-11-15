import React, { useState } from 'react';
import { MiniGameType, OptionalActivityDef } from '../types/game';
import { lunarAudio } from '../game/sound';
import { CheckCircle2, RotateCw, Sparkles, X } from 'lucide-react';

interface MiniGameModalProps {
  type: MiniGameType;
  contextLabel: string;
  optionalActivity?: OptionalActivityDef;
  onSuccess: () => void;
  onClose: () => void;
}

export const MiniGameModal: React.FC<MiniGameModalProps> = ({
  type,
  contextLabel,
  optionalActivity,
  onSuccess,
  onClose,
}) => {
  if (type === 'none') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border-2 border-amber-400/50 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="mb-4 flex items-center justify-between border-b border-slate-700 pb-3">
          <div>
            <div className="text-xs font-bold tracking-widest text-amber-400 uppercase">
              {optionalActivity ? 'Optional Exploration Activity' : 'Interactive Mission Task'}
            </div>
            <h2 className="text-xl font-bold text-white">{contextLabel}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm font-semibold text-slate-200 hover:bg-slate-700"
          >
            <X className="h-4 w-4" />
            Exit
          </button>
        </div>

        <MiniGameBody type={type} onSuccess={onSuccess} />
      </div>
    </div>
  );
};

const MiniGameBody: React.FC<{ type: MiniGameType; onSuccess: () => void }> = ({ type, onSuccess }) => {
  switch (type) {
    case 'crater_scan':
      return <CraterScanGame onSuccess={onSuccess} />;
    case 'sample_containment':
      return <SampleContainmentGame onSuccess={onSuccess} />;
    case 'circuit_match':
      return <CircuitMatchGame onSuccess={onSuccess} />;
    case 'pipe_align':
      return <PipeAlignGame onSuccess={onSuccess} />;
    case 'water_filter':
      return <WaterFilterGame onSuccess={onSuccess} />;
    case 'solar_replace':
      return <SolarReplaceGame onSuccess={onSuccess} />;
    case 'greenhouse_lights':
      return <GreenhouseLightsGame onSuccess={onSuccess} />;
    case 'thermal_balance':
      return <ThermalBalanceGame onSuccess={onSuccess} />;
    case 'medical_match':
      return <MedicalMatchGame onSuccess={onSuccess} />;
    case 'signal_frequency':
      return <SignalFrequencyGame onSuccess={onSuccess} />;
    case 'ice_drill':
      return <IceDrillGame onSuccess={onSuccess} />;
    case 'rover_repair':
      return <RoverRepairGame onSuccess={onSuccess} />;
    case 'path_detour':
      return <PathDetourGame onSuccess={onSuccess} />;
    case 'dish_align':
      return <DishAlignGame onSuccess={onSuccess} />;
    case 'outpost_power':
      return <OutpostPowerGame onSuccess={onSuccess} />;
    case 'final_synthesis':
      return <FinalSynthesisGame onSuccess={onSuccess} />;
    case 'earth_photo':
      return <EarthPhotoGame onSuccess={onSuccess} />;
    case 'observatory_sky':
      return <ObservatorySkyGame onSuccess={onSuccess} />;
    case 'buried_vault':
      return <BuriedVaultGame onSuccess={onSuccess} />;
    case 'crew_tools':
      return <CrewToolsGame onSuccess={onSuccess} />;
    case 'crew_botany':
      return <CrewBotanyGame onSuccess={onSuccess} />;
    default:
      return null;
  }
};

// 1. Crater Investigation & Close-Up Geological Scan
const CraterScanGame: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [scanned, setScanned] = useState<string[]>([]);
  const targets = [
    {
      id: 'ejecta',
      label: 'Displaced Ejecta Blanket',
      x: 23,
      y: 34,
      desc: 'Pulverized anorthosite & lunar basalt thrown outward by the high-speed impact.',
      mineral: 'Lunar Silicates (SiO₂)',
      pct: 64,
      barColor: 'bg-slate-400',
    },
    {
      id: 'rim',
      label: 'Fractured Crater Rim',
      x: 75,
      y: 30,
      desc: 'Compressed and upturned regolith strata showing shock-wave fractures.',
      mineral: 'Shocked Basalt Glass',
      pct: 48,
      barColor: 'bg-amber-400',
    },
    {
      id: 'core',
      label: 'Metallic-Stony Chondrite',
      x: 50,
      y: 62,
      desc: 'Dense dark fusion-crusted space rock rich in nickel-iron veins and chondrules!',
      mineral: 'Nickel-Iron & Olivine',
      pct: 92,
      barColor: 'bg-sky-400',
    },
  ];

  const handleScan = (id: string) => {
    lunarAudio.playScanPulse();
    if (!scanned.includes(id)) {
      const next = [...scanned, id];
      setScanned(next);
      if (next.length === targets.length) {
        setTimeout(onSuccess, 850);
      }
    }
  };

  return (
    <div>
      <p className="mb-3 text-sm text-slate-300">
        Tap all 3 geological markers inside the crater scan view to analyze the impact site and meteorite specimen!
      </p>
      <div className="relative h-60 w-full overflow-hidden rounded-xl border border-cyan-500/40 bg-slate-950">
        {/* Realistic monochrome crater & chondrite meteorite cross-section */}
        <svg viewBox="0 0 400 200" className="h-full w-full">
          <defs>
            <radialGradient id="craterGrad" cx="50%" cy="62%" r="58%">
              <stop offset="0%" stopColor="#1e2229" />
              <stop offset="62%" stopColor="#3c424d" />
              <stop offset="100%" stopColor="#20252d" />
            </radialGradient>
            <linearGradient id="meteorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#525866" />
              <stop offset="50%" stopColor="#2b2e36" />
              <stop offset="100%" stopColor="#181a20" />
            </linearGradient>
          </defs>
          <rect width="400" height="200" fill="#090c12" />
          {/* Ejecta rays */}
          <path d="M55 75 L150 110 M345 72 L248 112 M110 46 L172 104 M290 48 L225 104" stroke="#64748b" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />
          <ellipse cx="200" cy="130" rx="166" ry="56" fill="url(#craterGrad)" stroke="#6b7280" strokeWidth="2.5" />
          <ellipse cx="200" cy="136" rx="112" ry="33" fill="#1b1f26" stroke="#4b5563" strokeWidth="1.5" />
          {/* Scattered meteorite fragments */}
          <polygon points="154,142 162,137 167,144 158,148" fill="#374151" stroke="#9ca3af" strokeWidth="0.8" />
          <polygon points="236,138 245,134 250,141 241,145" fill="#374151" stroke="#9ca3af" strokeWidth="0.8" />
          {/* Main irregular metallic-stony meteorite */}
          <polygon points="178,128 193,110 214,114 224,130 212,143 185,141" fill="url(#meteorGrad)" stroke="#94a3b8" strokeWidth="1.4" />
          {/* Metallic nickel-iron vein */}
          <path d="M189 124 L203 121 L213 130" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
        </svg>

        {targets.map((t) => {
          const isDone = scanned.includes(t.id);
          return (
            <button
              key={t.id}
              onClick={() => handleScan(t.id)}
              style={{ left: `${t.x}%`, top: `${t.y}%` }}
              className={`-translate-x-1/2 -translate-y-1/2 absolute rounded-xl border-2 px-3 py-1.5 text-xs font-bold transition-transform hover:scale-105 ${
                isDone
                  ? 'border-emerald-400 bg-emerald-900/95 text-emerald-200'
                  : 'border-amber-400 bg-slate-900/95 text-amber-300'
              }`}
            >
              {isDone ? '✓ ' : '⌖ '}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Live Spectrometer Readout */}
      <div className="mt-3 rounded-xl border border-slate-700 bg-slate-950 p-3">
        <div className="mb-2 flex items-center justify-between text-[11px] font-extrabold tracking-wider text-cyan-400 uppercase">
          <span>Handheld Geological Spectrometer</span>
          <span className="tabular-nums">{scanned.length} / {targets.length} Signatures Logged</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          {targets.map((t) => {
            const ok = scanned.includes(t.id);
            return (
              <div
                key={t.id}
                className={`rounded-lg border p-2.5 ${
                  ok ? 'border-emerald-500/50 bg-emerald-950/40 text-slate-200' : 'border-slate-800 bg-slate-900 text-slate-400'
                }`}
              >
                <div className="font-bold text-white">{t.label}</div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${ok ? t.barColor : 'bg-slate-700'}`}
                    style={{ width: ok ? `${t.pct}%` : '8%' }}
                  />
                </div>
                <div className="mt-1 text-[11px] font-semibold text-cyan-300">
                  {ok ? `${t.mineral} (${t.pct}%)` : 'Awaiting pulse scan'}
                </div>
                <div className="mt-0.5 text-[11px] leading-snug text-slate-300">
                  {ok ? t.desc : 'Tap marker above'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// 2. Sample Containment Case
const SampleContainmentGame: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [placed, setPlaced] = useState<number[]>([]);
  const samples = [
    { id: 1, name: 'Chondrite Grain', color: 'bg-violet-600' },
    { id: 2, name: 'Iron-Nickel Shard', color: 'bg-sky-600' },
    { id: 3, name: 'Fused Regolith Glass', color: 'bg-amber-600' },
  ];

  const handlePlace = (id: number) => {
    lunarAudio.playChime();
    if (!placed.includes(id)) {
      const next = [...placed, id];
      setPlaced(next);
      if (next.length === 3) setTimeout(onSuccess, 600);
    }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-slate-300">
        Tap each collected meteorite sample to lock it into its airtight lunar specimen canister!
      </p>
      <div className="grid grid-cols-3 gap-4">
        {samples.map((s) => {
          const isPlaced = placed.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => handlePlace(s.id)}
              className={`flex flex-col items-center justify-center rounded-xl border-2 p-5 transition-all ${
                isPlaced
                  ? 'border-emerald-400 bg-emerald-950/70'
                  : 'border-slate-600 bg-slate-800 hover:border-amber-400'
              }`}
            >
              <div className={`mb-3 h-14 w-14 rounded-full ${s.color} flex items-center justify-center text-2xl shadow-lg`}>
                {isPlaced ? '🔒' : '☄️'}
              </div>
              <div className="text-sm font-bold text-white">{s.name}</div>
              <div className="mt-1 text-xs text-slate-300">{isPlaced ? 'Sealed Safe' : 'Tap to Seal'}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// 3. Colour-Matching Circuit with Live SVG Glowing Wires (Oxygen & Power Systems)
const CircuitMatchGame: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const wires = [
    { id: 'cyan', label: 'O₂ Pump', color: 'bg-cyan-500', border: 'border-cyan-400', stroke: '#22d3ee', leftY: 32 },
    { id: 'amber', label: 'Air Filter', color: 'bg-amber-500', border: 'border-amber-400', stroke: '#f59e0b', leftY: 96 },
    { id: 'emerald', label: 'Pressure Valve', color: 'bg-emerald-500', border: 'border-emerald-400', stroke: '#10b981', leftY: 160 },
  ];
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const rightOrder = ['amber', 'emerald', 'cyan'];

  const handleRightClick = (id: string) => {
    if (!selectedLeft) return;
    if (selectedLeft === id && !matched.includes(id)) {
      lunarAudio.playChime();
      const next = [...matched, id];
      setMatched(next);
      setSelectedLeft(null);
      if (next.length === wires.length) setTimeout(onSuccess, 600);
    } else {
      lunarAudio.playTone(220, 0.12, 'sine', 0.08);
      setSelectedLeft(null);
    }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-slate-300">
        Tap a coloured plug on the left, then tap the matching colour socket on the right!
      </p>
      <div className="relative grid grid-cols-3 items-center gap-4">
        <div className="space-y-3">
          {wires.map((w) => {
            const done = matched.includes(w.id);
            const active = selectedLeft === w.id;
            return (
              <button
                key={w.id}
                disabled={done}
                onClick={() => {
                  lunarAudio.playTone(520, 0.08);
                  setSelectedLeft(w.id);
                }}
                className={`flex h-12 w-full items-center gap-2.5 rounded-xl border-2 px-3 text-left text-sm font-bold ${
                  done
                    ? 'border-emerald-500 bg-emerald-950/60 opacity-75'
                    : active
                    ? 'border-white bg-slate-700'
                    : `${w.border} bg-slate-800 hover:bg-slate-700`
                }`}
              >
                <span className={`h-4 w-4 shrink-0 rounded-full ${w.color}`} />
                <span className="truncate">{w.label}</span>
              </button>
            );
          })}
        </div>

        {/* Visual SVG Wire Connections */}
        <svg viewBox="0 0 120 192" className="h-44 w-full">
          {wires.map((w) => {
            const rightIdx = rightOrder.indexOf(w.id);
            const rightY = 32 + rightIdx * 64;
            const connected = matched.includes(w.id);
            return (
              <path
                key={w.id}
                d={`M 4 ${w.leftY} C 55 ${w.leftY}, 65 ${rightY}, 116 ${rightY}`}
                fill="none"
                stroke={connected ? w.stroke : '#334155'}
                strokeWidth={connected ? 5 : 2}
                strokeDasharray={connected ? undefined : '5 5'}
                strokeLinecap="round"
              />
            );
          })}
        </svg>

        <div className="space-y-3">
          {rightOrder.map((rid) => {
            const w = wires.find((x) => x.id === rid)!;
            const done = matched.includes(rid);
            return (
              <button
                key={rid}
                disabled={done}
                onClick={() => handleRightClick(rid)}
                className={`flex h-12 w-full items-center justify-between rounded-xl border-2 px-3 text-sm font-bold ${
                  done
                    ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                    : `${w.border} bg-slate-800 hover:bg-slate-700`
                }`}
              >
                <span>{done ? 'Linked ✓' : 'Socket'}</span>
                <span className={`h-4 w-4 shrink-0 rounded-full ${w.color}`} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// 4. Pipe Rotate & Align with Live Water Flow (Water Recycling)
const PipeAlignGame: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [angles, setAngles] = useState([90, 180, 90, 270]);
  const rotatePipe = (idx: number) => {
    lunarAudio.playTone(440, 0.08);
    const next = angles.map((a, i) => (i === idx ? (a + 90) % 360 : a));
    setAngles(next);
    if (next.every((a) => a % 180 === 0)) {
      lunarAudio.playChime();
      setTimeout(onSuccess, 550);
    }
  };

  let flowReached = 0;
  for (let i = 0; i < angles.length; i++) {
    if (angles[i] % 180 === 0) flowReached++;
    else break;
  }

  return (
    <div>
      <p className="mb-4 text-sm text-slate-300">
        Tap each pipe to turn it flat so blue water flows all the way to the tank!
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-sky-500/40 bg-slate-950 p-6">
        <span className="rounded-lg bg-sky-900 px-3 py-2 text-xs font-bold text-sky-200">INLET 💧</span>
        {angles.map((ang, i) => {
          const aligned = ang % 180 === 0;
          const hasWater = i < flowReached;
          return (
            <button
              key={i}
              onClick={() => rotatePipe(i)}
              className={`flex h-20 w-20 items-center justify-center rounded-xl border-2 transition-colors ${
                hasWater
                  ? 'border-cyan-400 bg-cyan-950/70'
                  : aligned
                  ? 'border-emerald-400 bg-emerald-950/60'
                  : 'border-amber-400 bg-slate-800 hover:bg-slate-700'
              }`}
            >
              <div
                style={{ transform: `rotate(${ang}deg)` }}
                className={`h-5 w-16 rounded-full transition-transform duration-150 ${
                  hasWater ? 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]' : 'bg-slate-400'
                }`}
              />
            </button>
          );
        })}
        <span
          className={`rounded-lg px-3 py-2 text-xs font-bold ${
            flowReached === angles.length ? 'bg-emerald-700 text-white' : 'bg-slate-800 text-slate-400'
          }`}
        >
          TANK {flowReached === angles.length ? '✓' : '○'}
        </span>
      </div>
    </div>
  );
};

// 4b. Drag-or-Tap Water Filter Cartridge Matching
const WaterFilterGame: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const filters = [
    { id: 'dust', label: '1. Moon Dust Sieve', color: 'border-amber-400 bg-amber-950/60', icon: '🪨' },
    { id: 'charcoal', label: '2. Charcoal Core', color: 'border-sky-400 bg-sky-950/60', icon: '🧽' },
    { id: 'uv', label: '3. Pure UV Mesh', color: 'border-emerald-400 bg-emerald-950/60', icon: '✨' },
  ];
  const [selected, setSelected] = useState<string | null>(null);
  const [slotted, setSlotted] = useState<string[]>([]);

  const placeIntoSlot = (slotId: string, itemId: string | null) => {
    if (!itemId) return;
    if (itemId === slotId && !slotted.includes(slotId)) {
      lunarAudio.playChime();
      const next = [...slotted, slotId];
      setSlotted(next);
      setSelected(null);
      if (next.length === filters.length) setTimeout(onSuccess, 550);
    } else {
      lunarAudio.playTone(220, 0.1);
      setSelected(null);
    }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-slate-300">
        Drag each water filter cartridge (or tap one, then tap its matching slot) to clean the water!
      </p>
      <div className="mb-4 grid grid-cols-3 gap-3">
        {filters.map((f) => {
          const done = slotted.includes(f.id);
          const active = selected === f.id;
          return (
            <button
              key={f.id}
              draggable={!done}
              onDragStart={(e) => e.dataTransfer.setData('text/plain', f.id)}
              onClick={() => !done && setSelected(f.id)}
              disabled={done}
              className={`rounded-xl border-2 p-3 text-center text-sm font-bold ${
                done
                  ? 'border-slate-700 bg-slate-900 opacity-40'
                  : active
                  ? 'border-white bg-slate-700'
                  : `${f.color} hover:brightness-110`
              }`}
            >
              <div className="text-2xl">{f.icon}</div>
              <div className="mt-1">{f.label}</div>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-700 bg-slate-950 p-4">
        {[filters[2], filters[0], filters[1]].map((slot) => {
          const filled = slotted.includes(slot.id);
          return (
            <button
              key={slot.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => placeIntoSlot(slot.id, e.dataTransfer.getData('text/plain'))}
              onClick={() => placeIntoSlot(slot.id, selected)}
              className={`flex h-24 flex-col items-center justify-center rounded-xl border-2 border-dashed p-2 text-xs font-bold ${
                filled
                  ? 'border-emerald-400 bg-emerald-950/60 text-emerald-200'
                  : 'border-slate-600 bg-slate-900 text-slate-300 hover:border-sky-400'
              }`}
            >
              <span className="text-xl">{filled ? '💧' : '⬇️'}</span>
              <span className="mt-1">{filled ? `${slot.label} Ready ✓` : `Slot: ${slot.label}`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// 5. Solar Replace & Align
const SolarReplaceGame: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [replaced, setReplaced] = useState(false);
  const [tilt, setTilt] = useState(10);

  const handleSlider = (val: number) => {
    setTilt(val);
    if (replaced && val >= 42 && val <= 58) {
      lunarAudio.playChime();
      setTimeout(onSuccess, 550);
    }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-slate-300">
        Step 1: Tap the cracked solar cell to replace it. Step 2: Slide the tilt angle to 50° to face the Sun!
      </p>
      <div className="mb-5 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((idx) => {
          const isDamaged = idx === 1 && !replaced;
          return (
            <button
              key={idx}
              onClick={() => {
                if (idx === 1 && !replaced) {
                  lunarAudio.playChime();
                  setReplaced(true);
                }
              }}
              className={`h-24 rounded-xl border-2 font-bold ${
                isDamaged
                  ? 'border-red-400 bg-red-950/70 text-red-200 hover:bg-red-900'
                  : 'border-sky-400 bg-blue-950 text-sky-200'
              }`}
            >
              {isDamaged ? '⚡ Cracked Cell (Tap to Replace)' : '☀️ Healthy Solar Cell'}
            </button>
          );
        })}
      </div>
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-4">
        <div className="mb-2 flex justify-between text-sm font-bold">
          <span>Solar Wing Angle: {tilt}°</span>
          <span className="text-amber-300">Target: 45° – 55°</span>
        </div>
        <input
          type="range"
          min={0}
          max={90}
          value={tilt}
          onChange={(e) => handleSlider(Number(e.target.value))}
          className="h-3 w-full cursor-pointer accent-amber-400"
        />
      </div>
    </div>
  );
};

// 6. Greenhouse Grow-Light Sequencing
const GreenhouseLightsGame: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [step, setStep] = useState(0);
  const bulbs = [
    { id: 0, label: '1. Blue Morning Light', color: 'bg-blue-500' },
    { id: 1, label: '2. Warm Sun Spectrum', color: 'bg-amber-400' },
    { id: 2, label: '3. Deep Red Leaf Boost', color: 'bg-rose-500' },
  ];

  const handlePress = (id: number) => {
    if (id === step) {
      lunarAudio.playTone(440 + id * 140, 0.14);
      const next = step + 1;
      setStep(next);
      if (next === 3) setTimeout(onSuccess, 550);
    } else {
      lunarAudio.playTone(220, 0.1);
    }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-slate-300">
        Turn on the Greenhouse grow lamps in order (1 → 2 → 3) so the lunar plants get healthy light!
      </p>
      <div className="grid grid-cols-3 gap-4">
        {bulbs.map((b) => {
          const lit = b.id < step;
          return (
            <button
              key={b.id}
              onClick={() => handlePress(b.id)}
              className={`flex flex-col items-center rounded-xl border-2 p-5 font-bold ${
                lit ? 'border-emerald-400 bg-emerald-950/70' : 'border-slate-600 bg-slate-800 hover:border-amber-400'
              }`}
            >
              <div className={`mb-3 h-12 w-12 rounded-full ${lit ? b.color : 'bg-slate-700'}`} />
              <span className="text-center text-sm">{b.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// 7. Habitat Thermal Regulator Balance
const ThermalBalanceGame: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [heat, setHeat] = useState(20);
  const [cool, setCool] = useState(80);

  const checkDone = (h: number, c: number) => {
    if (h >= 45 && h <= 60 && c >= 45 && c <= 60) {
      lunarAudio.playChime();
      setTimeout(onSuccess, 500);
    }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-slate-300">
        Slide both the Heater and Radiator Coolant controls into the green comfort zone (45% – 60%)!
      </p>
      <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-800 p-5">
        <div>
          <div className="mb-1 flex justify-between text-sm font-bold">
            <span className="text-orange-300">Habitat Heater: {heat}%</span>
            <span className="text-emerald-300">Safe Zone: 45–60%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={heat}
            onChange={(e) => {
              const v = Number(e.target.value);
              setHeat(v);
              checkDone(v, cool);
            }}
            className="w-full accent-orange-400"
          />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-sm font-bold">
            <span className="text-cyan-300">Radiator Coolant: {cool}%</span>
            <span className="text-emerald-300">Safe Zone: 45–60%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={cool}
            onChange={(e) => {
              const v = Number(e.target.value);
              setCool(v);
              checkDone(heat, v);
            }}
            className="w-full accent-cyan-400"
          />
        </div>
      </div>
    </div>
  );
};

// 8. Medical Diagnostic Sensor Match
const MedicalMatchGame: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [activated, setActivated] = useState<string[]>([]);
  const sensors = [
    { id: 'heart', icon: '❤️', label: 'Heart Monitor' },
    { id: 'oxygen', icon: '🫁', label: 'Breath Sensor' },
    { id: 'temp', icon: '🌡️', label: 'Body Temp Probe' },
    { id: 'scan', icon: '🩺', label: 'Bone Density Scan' },
  ];

  const toggle = (id: string) => {
    lunarAudio.playChime();
    if (!activated.includes(id)) {
      const next = [...activated, id];
      setActivated(next);
      if (next.length === sensors.length) setTimeout(onSuccess, 550);
    }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-slate-300">
        Tap all 4 Medical Bio-Sensors to calibrate the crew health monitor!
      </p>
      <div className="grid grid-cols-2 gap-3">
        {sensors.map((s) => {
          const ok = activated.includes(s.id);
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left font-bold ${
                ok ? 'border-emerald-400 bg-emerald-950/70' : 'border-rose-400/60 bg-slate-800 hover:bg-slate-700'
              }`}
            >
              <span className="text-2xl">{s.icon}</span>
              <div>
                <div>{s.label}</div>
                <div className="text-xs text-slate-300">{ok ? 'Online ✓' : 'Tap to Calibrate'}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// 9. Signal Frequency Alignment
const SignalFrequencyGame: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [freq, setFreq] = useState(25);
  const target = 72;
  const locked = Math.abs(freq - target) <= 6;

  return (
    <div>
      <p className="mb-4 text-sm text-slate-300">
        Tune the Underground Signal Scanner slider until the wave locks onto 72 MHz!
      </p>
      <div className="mb-4 flex h-24 items-center justify-center rounded-xl border border-cyan-500/40 bg-slate-950">
        <div className={`text-3xl font-black tabular-nums ${locked ? 'text-emerald-400' : 'text-cyan-300'}`}>
          {freq} MHz {locked ? ' — SIGNAL LOCKED!' : ''}
        </div>
      </div>
      <input
        type="range"
        min={10}
        max={100}
        value={freq}
        onChange={(e) => {
          const v = Number(e.target.value);
          setFreq(v);
          if (Math.abs(v - target) <= 6) {
            lunarAudio.playChime();
            setTimeout(onSuccess, 550);
          }
        }}
        className="w-full accent-cyan-400"
      />
    </div>
  );
};

// 10. Cryo-Drill Ice Extraction
const IceDrillGame: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [depth, setDepth] = useState(0);
  const handleDrill = () => {
    lunarAudio.playScanPulse();
    const next = Math.min(100, depth + 25);
    setDepth(next);
    if (next >= 100) setTimeout(onSuccess, 600);
  };

  return (
    <div className="text-center">
      <p className="mb-4 text-sm text-slate-300">
        Tap the Cryo-Drill button 4 times to extract a pure frozen lunar water-ice sample!
      </p>
      <div className="mx-auto mb-5 h-8 w-full max-w-md overflow-hidden rounded-full border border-sky-400 bg-slate-950">
        <div className="h-full bg-sky-400 transition-all duration-200" style={{ width: `${depth}%` }} />
      </div>
      <button
        onClick={handleDrill}
        className="rounded-xl border-2 border-sky-300 bg-sky-600 px-8 py-4 text-lg font-bold text-white hover:bg-sky-500"
      >
        ❄️ {depth >= 100 ? 'Ice Sample Collected!' : `Drill Deeper (${depth}%)`}
      </button>
    </div>
  );
};

// 11. Interactive Drag-and-Drop / Tap-to-Slot Rover Repair
const RoverRepairGame: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [fixed, setFixed] = useState<string[]>([]);
  const parts = [
    { id: 'wheel', label: 'Mesh Wheel', icon: '🛞', slotLabel: 'Front Axle' },
    { id: 'battery', label: 'Solar Battery', icon: '🔋', slotLabel: 'Power Bay' },
    { id: 'beacon', label: 'Radio Beacon', icon: '📡', slotLabel: 'Top Mast' },
  ];

  const installPart = (slotId: string, partId: string | null) => {
    if (!partId) return;
    if (partId === slotId && !fixed.includes(slotId)) {
      lunarAudio.playChime();
      const next = [...fixed, slotId];
      setFixed(next);
      setSelectedPart(null);
      if (next.length === 3) setTimeout(onSuccess, 550);
    } else {
      lunarAudio.playTone(220, 0.1);
      setSelectedPart(null);
    }
  };

  return (
    <div>
      <p className="mb-3 text-sm text-slate-300">
        Drag a new rover part onto its matching glowing slot (or tap a part, then tap the slot)!
      </p>
      <div className="mb-4 grid grid-cols-3 gap-3">
        {parts.map((p) => {
          const ok = fixed.includes(p.id);
          const active = selectedPart === p.id;
          return (
            <button
              key={p.id}
              draggable={!ok}
              onDragStart={(e) => e.dataTransfer.setData('text/plain', p.id)}
              onClick={() => !ok && setSelectedPart(p.id)}
              disabled={ok}
              className={`rounded-xl border-2 p-3 text-center font-bold ${
                ok
                  ? 'border-emerald-400 bg-emerald-950/60 opacity-45'
                  : active
                  ? 'border-white bg-slate-700'
                  : 'border-amber-400/70 bg-slate-800 hover:bg-slate-700'
              }`}
            >
              <div className="text-2xl">{p.icon}</div>
              <div className="mt-1 text-xs">{p.label}</div>
            </button>
          );
        })}
      </div>

      {/* Rover Diagram Slots */}
      <div className="grid grid-cols-3 gap-3 rounded-xl border border-amber-500/40 bg-slate-950 p-4">
        {parts.map((p) => {
          const ok = fixed.includes(p.id);
          return (
            <button
              key={p.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => installPart(p.id, e.dataTransfer.getData('text/plain'))}
              onClick={() => installPart(p.id, selectedPart)}
              className={`flex h-24 flex-col items-center justify-center rounded-xl border-2 border-dashed p-2 text-xs font-bold ${
                ok
                  ? 'border-emerald-400 bg-emerald-950/70 text-emerald-200'
                  : 'border-amber-400/70 bg-slate-900 text-amber-200 hover:bg-slate-800'
              }`}
            >
              <span className="text-2xl">{ok ? p.icon : '🔧'}</span>
              <span className="mt-1">{ok ? `${p.slotLabel} Fixed ✓` : `${p.slotLabel} (Drop ${p.label})`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// 12. Rockfall Safe Detour Mapping
const PathDetourGame: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [beacons, setBeacons] = useState<number[]>([]);
  const handlePlace = (idx: number) => {
    lunarAudio.playChime();
    if (!beacons.includes(idx)) {
      const next = [...beacons, idx];
      setBeacons(next);
      if (next.length === 3) setTimeout(onSuccess, 550);
    }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-slate-300">
        Boulders blocked the canyon! Tap all 3 safe ridge markers to open a clear path!
      </p>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((idx) => {
          const placed = beacons.includes(idx);
          return (
            <button
              key={idx}
              onClick={() => handlePlace(idx)}
              className={`rounded-xl border-2 p-5 font-bold ${
                placed ? 'border-emerald-400 bg-emerald-950/70' : 'border-amber-400 bg-slate-800 hover:bg-slate-700'
              }`}
            >
              <div className="text-2xl">{placed ? '🟡' : '📍'}</div>
              <div className="mt-1 text-sm">Safe Marker #{idx}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// 13. Relay Dish Rotate & Visual Earth Target Signal Lock
const DishAlignGame: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [angle, setAngle] = useState(0);
  const aligned = angle === 135;
  const rotate = () => {
    lunarAudio.playTone(540, 0.1);
    const next = (angle + 45) % 360;
    setAngle(next);
    if (next === 135) {
      lunarAudio.playChime();
      setTimeout(onSuccess, 600);
    }
  };

  return (
    <div className="text-center">
      <p className="mb-4 text-sm text-slate-300">
        Rotate the signal dish until its beam lines up with Earth!
      </p>
      <div className="relative mx-auto mb-4 flex h-40 w-full max-w-md items-center justify-between rounded-xl border border-cyan-500/40 bg-slate-950 px-8">
        <div className="flex flex-col items-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-cyan-400 bg-slate-900">
            <div style={{ transform: `rotate(${angle}deg)` }} className="text-4xl transition-transform duration-150">
              📡
            </div>
          </div>
          <span className="mt-1 text-xs font-bold text-slate-300 tabular-nums">{angle}°</span>
        </div>

        <div className="flex-1 px-4">
          <div
            className={`h-1.5 w-full rounded-full ${
              aligned ? 'bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]' : 'bg-slate-800'
            }`}
          />
          <div className="mt-1 text-xs font-bold text-amber-300">
            {aligned ? 'EARTH SIGNAL LOCKED ✓' : 'Target: 135°'}
          </div>
        </div>

        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-sky-300 via-blue-600 to-emerald-500 text-2xl shadow-lg">
          🌍
        </div>
      </div>
      <button
        onClick={rotate}
        className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 font-bold text-white hover:bg-cyan-500"
      >
        <RotateCw className="h-5 w-5" />
        Rotate Dish (+45°)
      </button>
    </div>
  );
};

// 14. Outpost Power & Data Boot
const OutpostPowerGame: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [steps, setSteps] = useState<number[]>([]);
  const labels = ['Unfold Solar Wing', 'Pressurize Science Pod', 'Download Deep-Space Data'];
  const clickStep = (i: number) => {
    lunarAudio.playChime();
    if (!steps.includes(i)) {
      const next = [...steps, i];
      setSteps(next);
      if (next.length === 3) setTimeout(onSuccess, 550);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-300">Activate all 3 Far-Side Research Outpost systems!</p>
      {labels.map((lbl, i) => {
        const done = steps.includes(i);
        return (
          <button
            key={lbl}
            onClick={() => clickStep(i)}
            className={`flex w-full items-center justify-between rounded-xl border-2 px-5 py-3.5 font-bold ${
              done ? 'border-emerald-400 bg-emerald-950/70' : 'border-amber-400/70 bg-slate-800 hover:bg-slate-700'
            }`}
          >
            <span>{lbl}</span>
            <span>{done ? 'ONLINE ✓' : 'ACTIVATE'}</span>
          </button>
        );
      })}
    </div>
  );
};

// 15. Final Synthesis Console (Mission 20)
const FinalSynthesisGame: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const items = [
    { id: 'meteor', label: 'Ancient Meteorite Crystals', icon: '☄️' },
    { id: 'ice', label: 'Shadowed Crater Water-Ice', icon: '❄️' },
    { id: 'signal', label: 'Underground Mineral Resonance', icon: '📡' },
    { id: 'outpost', label: 'Far-Side Outpost Archive', icon: '🛰️' },
  ];

  const add = (id: string) => {
    lunarAudio.playChime();
    if (!selected.includes(id)) {
      setSelected([...selected, id]);
    }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-slate-300">
        Combine all 4 major discoveries from your Moon Campaign, then transmit the complete report to Earth!
      </p>
      <div className="mb-5 grid grid-cols-2 gap-3">
        {items.map((it) => {
          const ok = selected.includes(it.id);
          return (
            <button
              key={it.id}
              onClick={() => add(it.id)}
              className={`flex items-center gap-3 rounded-xl border-2 p-3.5 text-left font-bold ${
                ok ? 'border-emerald-400 bg-emerald-950/70' : 'border-slate-600 bg-slate-800 hover:border-amber-400'
              }`}
            >
              <span className="text-2xl">{it.icon}</span>
              <span className="text-sm">{it.label}</span>
              {ok && <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-400" />}
            </button>
          );
        })}
      </div>
      <button
        disabled={selected.length < 4}
        onClick={onSuccess}
        className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold ${
          selected.length === 4
            ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
            : 'cursor-not-allowed bg-slate-700 text-slate-400'
        }`}
      >
        <Sparkles className="h-5 w-5" />
        {selected.length === 4 ? 'Transmit Final Discovery to Earth!' : `Select All Discoveries (${selected.length}/4)`}
      </button>
    </div>
  );
};

// 16. Photograph Earth Scenic Camera
const EarthPhotoGame: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [snapped, setSnapped] = useState(false);

  return (
    <div className="text-center">
      <p className="mb-3 text-sm text-slate-300">
        Line up Earth inside the lunar camera viewfinder and snap a scenic photograph!
      </p>
      <div className="relative mx-auto mb-4 flex h-52 w-full max-w-md items-center justify-center overflow-hidden rounded-xl border-2 border-sky-400/60 bg-slate-950">
        <div className="h-24 w-24 rounded-full bg-gradient-to-br from-sky-300 via-blue-600 to-emerald-500 shadow-[0_0_40px_rgba(56,189,248,0.6)]" />
        <div className="pointer-events-none absolute inset-4 border border-dashed border-white/40" />
        {snapped && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/25 text-lg font-black text-white">
            📸 PHOTO SAVED!
          </div>
        )}
      </div>
      <button
        onClick={() => {
          lunarAudio.playChime();
          setSnapped(true);
          setTimeout(onSuccess, 750);
        }}
        className="rounded-xl bg-sky-500 px-8 py-3 font-bold text-slate-950 hover:bg-sky-400"
      >
        📸 Snap Photograph of Earth
      </button>
    </div>
  );
};

// 17. Lunar Observatory Sky Observation
const ObservatorySkyGame: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [spotted, setSpotted] = useState<string[]>([]);
  const targets = [
    { id: 'earth', label: 'Earth', icon: '🌍', x: 25, y: 40, fact: 'Blue oceans & swirling clouds shine bright in the black lunar sky!' },
    { id: 'sun', label: 'The Sun', icon: '☀️', x: 72, y: 32, fact: 'With zero air on the Moon, the Sun glows sharply without hazy skies.' },
    { id: 'stars', label: 'Orion Star Cluster', icon: '✨', x: 52, y: 72, fact: 'Telescopes on the Moon never have to look through clouds!' },
  ];

  const handleSpot = (id: string) => {
    lunarAudio.playScanPulse();
    if (!spotted.includes(id)) {
      const next = [...spotted, id];
      setSpotted(next);
      if (next.length === targets.length) setTimeout(onSuccess, 750);
    }
  };

  return (
    <div>
      <p className="mb-3 text-sm text-slate-300">
        Look through the Observatory telescope and tap Earth, the Sun, and the Stars!
      </p>
      <div className="relative h-56 w-full overflow-hidden rounded-full border-4 border-sky-400/50 bg-slate-950">
        {targets.map((t) => {
          const ok = spotted.includes(t.id);
          return (
            <button
              key={t.id}
              onClick={() => handleSpot(t.id)}
              style={{ left: `${t.x}%`, top: `${t.y}%` }}
              className={`-translate-x-1/2 -translate-y-1/2 absolute flex items-center gap-2 rounded-xl border-2 px-3 py-1.5 text-xs font-bold ${
                ok ? 'border-emerald-400 bg-emerald-950/90 text-emerald-200' : 'border-sky-400 bg-slate-900/90 text-white hover:scale-105'
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              <span>{ok ? `${t.label} ✓` : `Focus ${t.label}`}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 text-center text-xs font-semibold text-sky-300">
        Spotted {spotted.length} / {targets.length} cosmic wonders
      </div>
    </div>
  );
};

// 18. Partially Buried Research Archive
const BuriedVaultGame: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [cleared, setCleared] = useState<number[]>([]);
  const [opened, setOpened] = useState(false);

  const sweepDust = (idx: number) => {
    lunarAudio.playScanPulse();
    if (!cleared.includes(idx)) {
      setCleared([...cleared, idx]);
    }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-slate-300">
        Tap all 3 moon-dust mounds to uncover the old buried dome hatch, then open its science log!
      </p>
      <div className="mb-4 grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => {
          const clean = cleared.includes(i);
          return (
            <button
              key={i}
              onClick={() => sweepDust(i)}
              className={`rounded-xl border-2 p-4 text-center font-bold ${
                clean ? 'border-emerald-400 bg-emerald-950/70 text-emerald-200' : 'border-amber-400/60 bg-slate-800 hover:bg-slate-700'
              }`}
            >
              <div className="text-2xl">{clean ? '✨' : '🪨'}</div>
              <div className="mt-1 text-xs">{clean ? 'Dust Cleared!' : `Brush Dust Mound #${i + 1}`}</div>
            </button>
          );
        })}
      </div>
      <button
        disabled={cleared.length < 3 || opened}
        onClick={() => {
          lunarAudio.playChime();
          setOpened(true);
          setTimeout(onSuccess, 600);
        }}
        className={`w-full rounded-xl py-3 text-sm font-extrabold ${
          cleared.length === 3 ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' : 'cursor-not-allowed bg-slate-800 text-slate-500'
        }`}
      >
        {opened ? 'Archive Data Downloaded ✓' : cleared.length === 3 ? 'Download Old Lunar Base Logs' : 'Clear All Dust First'}
      </button>
    </div>
  );
};

// 19. Crew Tools Rack (Help Leo)
const CrewToolsGame: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const tools = [
    { id: 'wrench', label: 'Torque Wrench', icon: '🔧' },
    { id: 'clamp', label: 'Wheel Clamp', icon: '⚙️' },
    { id: 'meter', label: 'Battery Tester', icon: '🔋' },
  ];
  const [picked, setPicked] = useState<string | null>(null);
  const [racked, setRacked] = useState<string[]>([]);

  const snapTool = (slotId: string, toolId: string | null) => {
    if (!toolId) return;
    if (toolId === slotId && !racked.includes(slotId)) {
      lunarAudio.playChime();
      const next = [...racked, slotId];
      setRacked(next);
      setPicked(null);
      if (next.length === tools.length) setTimeout(onSuccess, 550);
    } else {
      lunarAudio.playTone(220, 0.1);
      setPicked(null);
    }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-slate-300">
        Drag each astronaut tool into Leo’s padded tool rack (or tap tool, then tap slot)!
      </p>
      <div className="mb-4 grid grid-cols-3 gap-3">
        {tools.map((t) => {
          const done = racked.includes(t.id);
          return (
            <button
              key={t.id}
              draggable={!done}
              onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}
              onClick={() => !done && setPicked(t.id)}
              disabled={done}
              className={`rounded-xl border-2 p-3 text-center font-bold ${
                done
                  ? 'border-slate-700 bg-slate-900 opacity-40'
                  : picked === t.id
                  ? 'border-white bg-slate-700'
                  : 'border-amber-400 bg-slate-800 hover:bg-slate-700'
              }`}
            >
              <div className="text-2xl">{t.icon}</div>
              <div className="mt-1 text-xs">{t.label}</div>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-3 rounded-xl border border-slate-700 bg-slate-950 p-4">
        {[tools[1], tools[2], tools[0]].map((slot) => {
          const ok = racked.includes(slot.id);
          return (
            <button
              key={slot.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => snapTool(slot.id, e.dataTransfer.getData('text/plain'))}
              onClick={() => snapTool(slot.id, picked)}
              className={`flex h-20 flex-col items-center justify-center rounded-xl border-2 border-dashed text-xs font-bold ${
                ok ? 'border-emerald-400 bg-emerald-950/60 text-emerald-200' : 'border-slate-600 bg-slate-900 text-slate-300'
              }`}
            >
              <span>{ok ? `${slot.icon} Snapped ✓` : `Slot: ${slot.label}`}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// 20. Greenhouse Plant Growth Sequence (Help Zara)
const CrewBotanyGame: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [step, setStep] = useState(0);
  const items = [
    { id: 0, label: '1. Clean Water', icon: '💧' },
    { id: 1, label: '2. Mineral Sponge', icon: '🧽' },
    { id: 2, label: '3. Warm Grow Lamp', icon: '💡' },
    { id: 3, label: '4. Healthy Sprout!', icon: '🌱' },
  ];

  const handleTap = (id: number) => {
    if (id === step) {
      lunarAudio.playTone(460 + id * 120, 0.12);
      const next = step + 1;
      setStep(next);
      if (next === items.length) setTimeout(onSuccess, 600);
    } else {
      lunarAudio.playTone(220, 0.08);
    }
  };

  return (
    <div>
      <p className="mb-4 text-sm text-slate-300">
        Tap the greenhouse steps in order (1 → 2 → 3 → 4) to help Zara grow fresh Moon sprouts!
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[items[2], items[0], items[3], items[1]].map((it) => {
          const done = it.id < step;
          return (
            <button
              key={it.id}
              onClick={() => handleTap(it.id)}
              className={`flex flex-col items-center rounded-xl border-2 p-4 font-bold ${
                done ? 'border-emerald-400 bg-emerald-950/70 text-emerald-200' : 'border-slate-600 bg-slate-800 hover:border-emerald-400'
              }`}
            >
              <span className="text-3xl">{it.icon}</span>
              <span className="mt-2 text-center text-xs">{it.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
