import { SolPhase, StormStage, SurfaceType, WeatherType } from './types';

// Realistic Mars Surface Physics Constants (~38% of Earth's 9.81 m/s²)
export const MARS_GRAVITY = 3.71; // m/s²
// Weighted spacesuit push-off velocity -> ~1.58m apex height, ~1.88s crisp airborne phase
export const MARS_JUMP_IMPULSE = 3.42;
export const MARS_JUMP_PREP_TIME = 0.095; // Brief realistic knee compression before push-off

// Weighted Mars Gait Speeds (deliberate, balanced stride — never Earth-snappy or moon-floaty)
export const MARS_WALK_SPEED = 4.9;
export const MARS_JOG_SPEED = 6.6;
export const MARS_SPRINT_SPEED = 8.4;
export const MARS_CROUCH_SPEED = 2.65;
export const SUIT_ACCEL_DAMP = 7.2; // Suit mass acceleration inertia
export const SUIT_DECEL_DAMP = 6.2; // Natural heavy-boot settle without sliding

export const ROVER_MAX_SPEED = 14.5; // m/s (~52 km/h) on smooth sintered colony surface
export const ROVER_REVERSE_SPEED = 6.2;
export const ROVER_TURN_SPEED = 1.65;
export const MEV_MASS_KG = 2400;
export const MEV_WHEEL_RADIUS = 0.42;
export const MEV_WHEELBASE_M = 2.64;
export const MEV_BATTERY_CAPACITY_KWH = 48.0;
export const MEV_BATTERY_RESERVE_PCT = 15;
export const MEV_BASELINE_WH_PER_M = 195;
export const MEV_BATTERY_DRAIN_PER_M = 0.032; // fallback baseline

// Functional Vehicle Charging Station (adjacent to Large Vehicle Hangar, open west drive-in bays)
export const CHARGING_BAY_A_POS: [number, number] = [21.6, 1.6];
export const CHARGING_BAY_B_POS: [number, number] = [21.6, 5.2];
export const CHARGING_CONSOLE_POS: [number, number] = [24.2, 3.4];

export const CARGO_LANDING_PAD_POS: [number, number] = [-28.0, -23.0];

export interface SupplyBundleSpec {
  id: 'life_support' | 'food_rations' | 'spare_parts' | 'full_colony';
  name: string;
  desc: string;
  etaSec: number;
  rewards: {
    air?: number;
    water?: number;
    power?: number;
    food?: number;
    spareParts?: number;
    crewCondition?: number;
    roverBattery?: number;
  };
  accentHex: string;
}

export const SUPPLY_BUNDLES: SupplyBundleSpec[] = [
  {
    id: 'life_support',
    name: 'O₂ & Water Life-Support Pod',
    desc: 'Compressed oxygen cylinders, clean scrubber cartridges, and purified water tanks.',
    etaSec: 8,
    rewards: { air: 42, water: 42, crewCondition: 15 },
    accentHex: '#38bdf8',
  },
  {
    id: 'food_rations',
    name: 'Nutrition & Greenhouse Seeds Pack',
    desc: 'Fresh freeze-dried astronaut meals, soil nutrients, and greenhouse seed kits.',
    etaSec: 8,
    rewards: { food: 48, water: 12, crewCondition: 20 },
    accentHex: '#10b981',
  },
  {
    id: 'spare_parts',
    name: 'Engineering Hardware & Battery Crate',
    desc: 'Pipe clamps, solar fuses, air filters, and Exploration Vehicle power cells.',
    etaSec: 9,
    rewards: { spareParts: 6, power: 28, roverBattery: 45 },
    accentHex: '#f59e0b',
  },
  {
    id: 'full_colony',
    name: 'Heavy Colony Resupply Container',
    desc: 'Complete emergency resupply shipment balancing all colony survival systems.',
    etaSec: 11,
    rewards: { air: 30, water: 30, food: 35, power: 30, spareParts: 4, crewCondition: 25, roverBattery: 50 },
    accentHex: '#f97316',
  },
];

export const SURFACE_SPEED_MULT: Record<SurfaceType, number> = {
  colony: 1.0,
  rock: 0.9,
  sand: 0.74, // Soft dunes pull gently at boots/tires
  ice: 0.84,
};

export const SURFACE_TRACTION: Record<SurfaceType, { grip: number; rollRes: number }> = {
  colony: { grip: 0.98, rollRes: 0.025 },
  rock: { grip: 0.86, rollRes: 0.048 },
  sand: { grip: 0.68, rollRes: 0.088 },
  ice: { grip: 0.54, rollRes: 0.032 },
};

// Martian Sol (24 hours 37 minutes = 1477 minutes)
export const SOL_MINUTES = 24 * 60 + 37;
export const BASE_SOL_PROGRESS_PER_SEC = 8 / SOL_MINUTES;

// Consistent prevailing Martian wind vector (WNW -> ESE) across all dust layers & weather consoles
export const MARTIAN_WIND_DIR = { x: 0.88, z: 0.47, label: 'WNW → ESE' } as const;

export interface StormStageSpec {
  stage: StormStage;
  label: string;
  shortTag: string;
  fogDensity: number;
  hazeOpacity: number;
  groundDustOpacity: number;
  fineMoteOpacity: number;
  windMs: number;
  windSpeedVis: number;
  dustTau: number;
  visibilityPct: number;
  outdoorSpeedMult: number;
  solarEfficiency: number;
  roverCamVisibilityPct: number;
  skyWarmthTint: number; // 0 = natural clear salmon/blue, 1 = deep rusty storm scattering
  kidNote: string;
}

// Scientifically plausible 5-stage Martian dust storm (thin ~1% CO₂ atmosphere: suspended fine dust & visibility drop, never hurricane walls)
export const STORM_STAGE_SPECS: Record<StormStage, StormStageSpec> = {
  1: {
    stage: 1,
    label: 'Calm Atmosphere',
    shortTag: 'Stage 1 · Calm',
    fogDensity: 0.0028,
    hazeOpacity: 0.05,
    groundDustOpacity: 0.06,
    fineMoteOpacity: 0.22,
    windMs: 4,
    windSpeedVis: 1.8,
    dustTau: 0.35,
    visibilityPct: 100,
    outdoorSpeedMult: 1.0,
    solarEfficiency: 1.0,
    roverCamVisibilityPct: 100,
    skyWarmthTint: 0.0,
    kidNote: 'Calm, crisp thin Martian air—distant canyon mesas and craters are crystal clear!',
  },
  2: {
    stage: 2,
    label: 'Wind Begins & Light Dust',
    shortTag: 'Stage 2 · Light Dust',
    fogDensity: 0.0054,
    hazeOpacity: 0.16,
    groundDustOpacity: 0.24,
    fineMoteOpacity: 0.40,
    windMs: 12,
    windSpeedVis: 4.8,
    dustTau: 0.85,
    visibilityPct: 84,
    outdoorSpeedMult: 0.96,
    solarEfficiency: 0.82,
    roverCamVisibilityPct: 86,
    skyWarmthTint: 0.28,
    kidNote: 'Steady afternoon breeze lifts fine rust-colored sand across the ground in low wisps.',
  },
  3: {
    stage: 3,
    label: 'Dust Increases & Visibility Drops',
    shortTag: 'Stage 3 · Dust Rising',
    fogDensity: 0.0096,
    hazeOpacity: 0.36,
    groundDustOpacity: 0.48,
    fineMoteOpacity: 0.56,
    windMs: 19,
    windSpeedVis: 7.8,
    dustTau: 1.75,
    visibilityPct: 60,
    outdoorSpeedMult: 0.88,
    solarEfficiency: 0.58,
    roverCamVisibilityPct: 62,
    skyWarmthTint: 0.56,
    kidNote: 'Weather sensors detect dust rising—amber haze softens far-away hills. Head toward base!',
  },
  4: {
    stage: 4,
    label: 'Strong Regional Dust Storm',
    shortTag: 'Stage 4 · Regional Storm',
    fogDensity: 0.0156,
    hazeOpacity: 0.58,
    groundDustOpacity: 0.72,
    fineMoteOpacity: 0.72,
    windMs: 28,
    windSpeedVis: 11.4,
    dustTau: 3.4,
    visibilityPct: 32,
    outdoorSpeedMult: 0.74,
    solarEfficiency: 0.26,
    roverCamVisibilityPct: 34,
    skyWarmthTint: 0.88,
    kidNote: 'GAME SIMULATION: Thick suspended Mars dust dims sunlight, slows outdoor travel, and coats solar wings!',
  },
  5: {
    stage: 5,
    label: 'Storm Gradually Clearing',
    shortTag: 'Stage 5 · Clearing',
    fogDensity: 0.0068,
    hazeOpacity: 0.22,
    groundDustOpacity: 0.26,
    fineMoteOpacity: 0.42,
    windMs: 11,
    windSpeedVis: 3.6,
    dustTau: 1.1,
    visibilityPct: 76,
    outdoorSpeedMult: 0.94,
    solarEfficiency: 0.72,
    roverCamVisibilityPct: 78,
    skyWarmthTint: 0.32,
    kidNote: 'Winds calm down and heavy grains settle gently back onto the regolith—good time to inspect solar arrays!',
  },
};

export function weatherToStormStage(weather: WeatherType, stormOverride?: boolean): StormStage {
  if (stormOverride) return 4;
  switch (weather) {
    case 'Clear':
      return 1;
    case 'Light Dust':
    case 'Windy':
      return 2;
    case 'Dust Devil':
    case 'Local Storm':
      return 3;
    case 'Regional Storm':
    case 'Severe Storm':
      return 4;
  }
}

export interface WeatherSpec {
  id: WeatherType;
  label: string;
  stormStage: StormStage;
  fogDensity: number;
  solarEfficiency: number;
  windMs: number;
  dustSpeed: number;
  dustOpacity: number;
  dustDevils: number;
  commsStaticPct: number;
  kidNote: string;
}

export const WEATHER_SPECS: Record<WeatherType, WeatherSpec> = {
  Clear: {
    id: 'Clear',
    label: 'Clear Skies',
    stormStage: 1,
    fogDensity: 0.0028,
    solarEfficiency: 1.0,
    windMs: 4,
    dustSpeed: 1.8,
    dustOpacity: 0.22,
    dustDevils: 0,
    commsStaticPct: 0,
    kidNote: 'Crisp salmon-butterscotch sky! Distant mesas stay sharp and solar arrays generate full power.',
  },
  'Light Dust': {
    id: 'Light Dust',
    label: 'Wind & Light Dust',
    stormStage: 2,
    fogDensity: 0.0052,
    solarEfficiency: 0.84,
    windMs: 10,
    dustSpeed: 4.0,
    dustOpacity: 0.38,
    dustDevils: 0,
    commsStaticPct: 4,
    kidNote: 'Fine iron-oxide dust drifts low over the craters, warming the horizon.',
  },
  Windy: {
    id: 'Windy',
    label: 'Breezy Canyon Winds',
    stormStage: 2,
    fogDensity: 0.0062,
    solarEfficiency: 0.79,
    windMs: 14,
    dustSpeed: 5.4,
    dustOpacity: 0.44,
    dustDevils: 1,
    commsStaticPct: 8,
    kidNote: 'Mars air is ~100× thinner than Earth’s—even fast winds carry only fine dust grains!',
  },
  'Local Storm': {
    id: 'Local Storm',
    label: 'Dust Rising Squall',
    stormStage: 3,
    fogDensity: 0.0094,
    solarEfficiency: 0.58,
    windMs: 19,
    dustSpeed: 7.8,
    dustOpacity: 0.62,
    dustDevils: 1,
    commsStaticPct: 16,
    kidNote: 'Amber haze thickens over distant ridges while the colony remains easy to navigate.',
  },
  'Dust Devil': {
    id: 'Dust Devil',
    label: 'Dust Devil Alley',
    stormStage: 3,
    fogDensity: 0.0072,
    solarEfficiency: 0.74,
    windMs: 16,
    dustSpeed: 5.2,
    dustOpacity: 0.5,
    dustDevils: 3,
    commsStaticPct: 10,
    kidNote: 'Warm soil heats thin air into tall dust whirlwinds that even sweep solar panels clean!',
  },
  'Regional Storm': {
    id: 'Regional Storm',
    label: 'Strong Regional Storm',
    stormStage: 4,
    fogDensity: 0.0145,
    solarEfficiency: 0.32,
    windMs: 26,
    dustSpeed: 10.8,
    dustOpacity: 0.76,
    dustDevils: 1,
    commsStaticPct: 28,
    kidNote: 'Suspended dust dims sunlight and hides distant canyon walls—return to base or turn on suit lights!',
  },
  'Severe Storm': {
    id: 'Severe Storm',
    label: 'Peak Regional Storm',
    stormStage: 4,
    fogDensity: 0.0172,
    solarEfficiency: 0.22,
    windMs: 31,
    dustSpeed: 12.2,
    dustOpacity: 0.84,
    dustDevils: 1,
    commsStaticPct: 38,
    kidNote: 'GAME SIMULATION: Thick suspended Mars dust limits far visibility and coats solar wings!',
  },
};

export interface SolVisualSample {
  phase: SolPhase;
  timeLabel: string;
  sunElevationRad: number;
  sunAzimuthRad: number;
  daylightFactor: number;
  sunsetFactor: number;
  nightFactor: number;
  outsideTempC: number;
  sunIntensity: number;
}

export function computeSolVisualSample(solProgress01: number): SolVisualSample {
  const p = ((solProgress01 % 1) + 1) % 1;
  const totalMin = Math.floor(p * SOL_MINUTES);
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  const timeLabel = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

  let phase: SolPhase = 'Night';
  if (p >= 0.18 && p < 0.24) phase = 'Pre-dawn';
  else if (p >= 0.24 && p < 0.31) phase = 'Sunrise';
  else if (p >= 0.31 && p < 0.43) phase = 'Morning';
  else if (p >= 0.43 && p < 0.58) phase = 'Midday';
  else if (p >= 0.58 && p < 0.70) phase = 'Afternoon';
  else if (p >= 0.70 && p < 0.78) phase = 'Sunset';
  else if (p >= 0.78 && p < 0.85) phase = 'Dusk';
  else phase = 'Night';

  const sunAngle = (p - 0.25) * Math.PI * 2;
  const sinElev = Math.sin(sunAngle);
  const sunElevationRad = Math.asin(Math.max(-1, Math.min(1, sinElev))) * 0.82;
  const sunAzimuthRad = p * Math.PI * 2 - Math.PI * 0.5;

  const daylightFactor = Math.max(0, Math.min(1, (sinElev + 0.12) / 0.72));
  const nightFactor = 1 - Math.max(0, Math.min(1, (sinElev + 0.18) / 0.32));
  const horizonDist = Math.abs(sinElev - 0.04);
  const sunsetFactor = Math.max(0, 1 - horizonDist / 0.26);

  const thermalWave = Math.sin((p - 0.33) * Math.PI * 2);
  const outsideTempC = Math.round(-40 + thermalWave * 35);

  const sunIntensity = 0.2 + daylightFactor * 2.15;

  return {
    phase,
    timeLabel,
    sunElevationRad,
    sunAzimuthRad,
    daylightFactor,
    sunsetFactor,
    nightFactor,
    outsideTempC,
    sunIntensity,
  };
}

export function pickNextWeather(current: WeatherType): WeatherType {
  // Natural storm escalation / clearing progression
  if (current === 'Regional Storm' || current === 'Severe Storm') {
    return 'Light Dust'; // Stage 5 gradual clearing!
  }
  if (current === 'Local Storm') {
    return Math.random() < 0.55 ? 'Regional Storm' : 'Light Dust';
  }
  const pool: WeatherType[] = ['Clear', 'Clear', 'Light Dust', 'Windy', 'Dust Devil', 'Local Storm'];
  const filtered = pool.filter((w) => w !== current);
  return filtered[Math.floor(Math.random() * filtered.length)];
}
