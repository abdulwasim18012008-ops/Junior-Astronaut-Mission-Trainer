import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Car,
  Check,
  Compass,
  Eye,
  Footprints,
  HelpCircle,
  Mouse,
  RotateCcw,
  Sliders,
} from 'lucide-react';

interface KeyCapProps {
  label: string;
  wide?: boolean;
  accent?: 'amber' | 'sky' | 'orange' | 'emerald' | 'slate';
  active?: boolean;
}

export const KeyCap: React.FC<KeyCapProps> = ({
  label,
  wide = false,
  accent = 'slate',
  active = false,
}) => {
  const palette =
    active
      ? 'border-amber-300 bg-amber-400 text-slate-950 shadow-[0_3px_0_#b45309]'
      : accent === 'amber'
      ? 'border-amber-400/70 bg-amber-950/80 text-amber-200 shadow-[0_3px_0_#78350f]'
      : accent === 'sky'
      ? 'border-sky-400/70 bg-sky-950/80 text-sky-200 shadow-[0_3px_0_#075985]'
      : accent === 'orange'
      ? 'border-orange-400/70 bg-orange-950/80 text-orange-200 shadow-[0_3px_0_#9a3412]'
      : accent === 'emerald'
      ? 'border-emerald-400/70 bg-emerald-950/80 text-emerald-200 shadow-[0_3px_0_#065f46]'
      : 'border-slate-500 bg-slate-800 text-white shadow-[0_3px_0_#1e293b]';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg border-2 px-2 py-1 text-xs font-black tracking-wide select-none ${
        wide ? 'min-w-[68px]' : 'min-w-[32px]'
      } ${palette}`}
    >
      {label}
    </span>
  );
};

interface OnFootTutorialProps {
  onDismiss: () => void;
}

export const OnFootTutorialCard: React.FC<OnFootTutorialProps> = ({ onDismiss }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pressedDir, setPressedDir] = useState<string | null>(null);
  const [didMove, setDidMove] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') setPressedDir('W');
      else if (e.code === 'KeyS' || e.code === 'ArrowDown') setPressedDir('S');
      else if (e.code === 'KeyA' || e.code === 'ArrowLeft') setPressedDir('A');
      else if (e.code === 'KeyD' || e.code === 'ArrowRight') setPressedDir('D');
      else return;

      setDidMove(true);
    };
    const onKeyUp = () => setPressedDir(null);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (step === 1 && didMove) {
      const t = window.setTimeout(() => setStep(2), 1400);
      return () => clearTimeout(t);
    }
  }, [step, didMove]);

  return (
    <div className="pointer-events-auto w-80 rounded-2xl border-2 border-sky-400/70 bg-slate-950/95 p-4 text-slate-100 shadow-2xl">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-black tracking-wider text-sky-400 uppercase">
          <Footprints className="h-4 w-4" />
          <span>Astronaut Guide · {step}/3</span>
        </div>
        <button
          onClick={onDismiss}
          className="rounded-md px-2 py-0.5 text-[11px] font-bold text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          Skip
        </button>
      </div>

      {step === 1 && (
        <div className="mt-2.5">
          <div className="text-sm font-black text-white">Walk Around the Moon</div>
          <p className="mt-1 text-xs text-slate-300">
            Hold W, A, S, or D to walk across the lunar ground.
          </p>

          {/* Visual WASD keycap cluster + motion direction diagram */}
          <div className="mt-3 flex items-center justify-center gap-5 rounded-xl border border-slate-800 bg-slate-900/90 py-3">
            <div className="flex flex-col items-center gap-1.5">
              <KeyCap label="W" accent="sky" active={pressedDir === 'W'} />
              <div className="flex items-center gap-1.5">
                <KeyCap label="A" accent="sky" active={pressedDir === 'A'} />
                <KeyCap label="S" accent="sky" active={pressedDir === 'S'} />
                <KeyCap label="D" accent="sky" active={pressedDir === 'D'} />
              </div>
            </div>
            <div className="grid grid-cols-3 grid-rows-3 items-center justify-items-center gap-0.5 text-sky-400">
              <div />
              <ArrowUp className={`h-4 w-4 ${pressedDir === 'W' ? 'text-amber-400' : 'opacity-65'}`} />
              <div />
              <ArrowLeft className={`h-4 w-4 ${pressedDir === 'A' ? 'text-amber-400' : 'opacity-65'}`} />
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <ArrowRight className={`h-4 w-4 ${pressedDir === 'D' ? 'text-amber-400' : 'opacity-65'}`} />
              <div />
              <ArrowDown className={`h-4 w-4 ${pressedDir === 'S' ? 'text-amber-400' : 'opacity-65'}`} />
              <div />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-300">
              {didMove ? 'Great moving!' : 'Try pressing W, A, S, or D'}
            </span>
            <button
              onClick={() => setStep(2)}
              className="rounded-lg bg-sky-500 px-3 py-1 text-xs font-black text-slate-950 hover:bg-sky-400"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-2.5">
          <div className="text-sm font-black text-white">Look, Jump & Bound</div>
          <p className="mt-1 text-xs text-slate-300">
            Drag with your mouse to look around, jump high in low gravity, or bound faster.
          </p>
          <div className="mt-3 space-y-2 rounded-xl border border-slate-800 bg-slate-900/90 p-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-bold text-slate-200">
                <Mouse className="h-4 w-4 text-sky-400" /> Drag Mouse
              </span>
              <span className="text-slate-400">Look around</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <KeyCap label="Space" wide accent="amber" />
              <span className="text-slate-300">Low-gravity jump</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <KeyCap label="Shift" wide accent="sky" />
              <span className="text-slate-300">Bound faster</span>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setStep(3)}
              className="rounded-lg bg-sky-500 px-3 py-1 text-xs font-black text-slate-950 hover:bg-sky-400"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-2.5">
          <div className="text-sm font-black text-white">Interact & Open Map</div>
          <p className="mt-1 text-xs text-slate-300">
            Use these keys anytime you explore the base or lunar craters.
          </p>
          <div className="mt-3 space-y-2 rounded-xl border border-slate-800 bg-slate-900/90 p-2.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <KeyCap label="E" accent="amber" />
              <span className="text-slate-200">Talk, collect, or enter</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <KeyCap label="M" accent="emerald" />
              <span className="text-slate-200">Open 3D World Map</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <KeyCap label="Esc" accent="slate" />
              <span className="text-slate-200">Pause & Controls Help</span>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={onDismiss}
              className="flex items-center gap-1 rounded-lg bg-emerald-400 px-3.5 py-1.5 text-xs font-black text-slate-950 hover:bg-emerald-300"
            >
              <Check className="h-3.5 w-3.5" /> Got It!
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface RoverTutorialProps {
  onDismiss: () => void;
}

export const FirstTimeRoverGuide: React.FC<RoverTutorialProps> = ({ onDismiss }) => {
  return (
    <div className="pointer-events-auto w-80 rounded-2xl border-2 border-orange-400/80 bg-slate-950/95 p-4 text-slate-100 shadow-2xl">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-black tracking-wider text-orange-400 uppercase">
          <Car className="h-4 w-4" />
          <span>Lunar Rover Controls</span>
        </div>
        <button
          onClick={onDismiss}
          className="rounded-lg bg-orange-500 px-2.5 py-1 text-xs font-black text-slate-950 hover:bg-orange-400"
        >
          Got It
        </button>
      </div>
      <p className="mt-1.5 text-xs text-slate-300">
        You are in the Lunar Rover! Watch your battery meter and visit blue pads to recharge.
      </p>
      <div className="mt-2.5 space-y-1.5 rounded-xl border border-slate-800 bg-slate-900/90 p-2.5 text-xs">
        <div className="flex items-center justify-between">
          <KeyCap label="W" accent="orange" />
          <span className="text-slate-200">Accelerate forward</span>
        </div>
        <div className="flex items-center justify-between">
          <KeyCap label="S" accent="orange" />
          <span className="text-slate-200">Brake or reverse</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <KeyCap label="A" accent="orange" />
            <KeyCap label="D" accent="orange" />
          </div>
          <span className="text-slate-200">Steer left / right</span>
        </div>
        <div className="flex items-center justify-between">
          <KeyCap label="Space" wide accent="amber" />
          <span className="text-slate-200">Handbrake</span>
        </div>
        <div className="flex items-center justify-between">
          <KeyCap label="E" accent="sky" />
          <span className="text-slate-200">Exit the rover</span>
        </div>
      </div>
    </div>
  );
};

interface ControlsHelpPanelProps {
  cameraSensitivity: number;
  showGoldenTrail: boolean;
  onChangeSensitivity: (val: number) => void;
  onToggleGoldenTrail: (enabled: boolean) => void;
  onReplayTutorial: () => void;
}

export const ControlsHelpPanel: React.FC<ControlsHelpPanelProps> = ({
  cameraSensitivity,
  showGoldenTrail,
  onChangeSensitivity,
  onToggleGoldenTrail,
  onReplayTutorial,
}) => {
  return (
    <div className="space-y-5">
      {/* Camera & Navigation Settings */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-white">
              <Sliders className="h-4 w-4 text-sky-400" />
              <span>Camera Sensitivity</span>
            </div>
            <span className="text-xs font-black text-sky-300 tabular-nums">
              {cameraSensitivity.toFixed(1)}x
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Adjust how fast the camera turns when you drag your mouse.
          </p>
          <input
            type="range"
            min={0.4}
            max={2.2}
            step={0.1}
            value={cameraSensitivity}
            onChange={(e) => onChangeSensitivity(parseFloat(e.target.value))}
            className="mt-3 w-full accent-sky-400"
          />
          <div className="mt-1 flex justify-between text-[10px] font-bold text-slate-500">
            <span>Gentle (0.4x)</span>
            <span>Standard (1.0x)</span>
            <span>Fast (2.2x)</span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-slate-700 bg-slate-950 p-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-white">
                <Compass className="h-4 w-4 text-amber-400" />
                <span>Golden Navigation Trail</span>
              </div>
              <button
                onClick={() => onToggleGoldenTrail(!showGoldenTrail)}
                className={`rounded-lg px-3 py-1 text-xs font-black ${
                  showGoldenTrail
                    ? 'bg-amber-400 text-slate-950'
                    : 'border border-slate-600 bg-slate-800 text-slate-300'
                }`}
              >
                {showGoldenTrail ? 'ON' : 'OFF'}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              Show or hide the glowing golden path leading toward your active mission goal.
            </p>
          </div>
          <button
            onClick={onReplayTutorial}
            className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-sky-400/50 bg-sky-950/60 px-3 py-2 text-xs font-bold text-sky-200 hover:bg-sky-900/60"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Replay On-Foot & Rover Control Guides
          </button>
        </div>
      </div>

      {/* Illustrated On-Foot & Rover Control Guides */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-sky-300">
            <Footprints className="h-4 w-4" />
            <span>On-Foot Astronaut Controls</span>
          </div>
          <div className="space-y-2 text-xs">
            {[
              { key: 'W', desc: 'Move forward across the lunar surface.' },
              { key: 'A', desc: 'Move left.' },
              { key: 'S', desc: 'Move backward.' },
              { key: 'D', desc: 'Move right.' },
              { key: 'Space', wide: true, desc: 'Jump high in gentle Moon gravity.' },
              { key: 'Shift', wide: true, desc: 'Bound faster while moving.' },
              { key: 'E', desc: 'Talk to crew, collect samples, or enter buildings.' },
              { key: 'M', desc: 'Open or close the full 3D World Map.' },
              { key: 'Esc', desc: 'Pause the game and view Controls & Help.' },
              { key: 'Mouse Drag', wide: true, desc: 'Look around; scroll wheel zooms.' },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-900/70 px-3 py-1.5"
              >
                <KeyCap label={item.key} wide={item.wide} accent="sky" />
                <span className="text-right text-slate-200">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-950 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-orange-300">
            <Car className="h-4 w-4" />
            <span>Lunar Rover Controls</span>
          </div>
          <div className="space-y-2 text-xs">
            {[
              { key: 'W', desc: 'Drive forward and climb hills.' },
              { key: 'S', desc: 'Slow down or drive in reverse.' },
              { key: 'A', desc: 'Steer the rover left.' },
              { key: 'D', desc: 'Steer the rover right.' },
              { key: 'Space', wide: true, desc: 'Apply the rover handbrake.' },
              { key: 'E', desc: 'Park safely and step out of the rover.' },
              { key: 'C', desc: 'Recharge battery when parked on a blue pad.' },
              { key: 'B', desc: 'Use emergency solar boost if battery reaches 0%.' },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-900/70 px-3 py-1.5"
              >
                <KeyCap label={item.key} wide={item.wide} accent="orange" />
                <span className="text-right text-slate-200">{item.desc}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-2.5 text-[11px] text-slate-400">
            <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span>
              Tip: The rover never drives by itself—climb in with <strong className="text-white">E</strong> whenever you want to explore distant craters!
            </span>
          </div>
        </div>
      </div>

      {/* Camera behavior note */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-slate-300">
        <Eye className="h-4 w-4 shrink-0 text-sky-400" />
        <span>
          Smooth third-person camera follows gently as you explore forward and settles naturally behind the rover while driving.
        </span>
      </div>
    </div>
  );
};
