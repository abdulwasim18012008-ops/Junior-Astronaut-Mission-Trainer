import { ExpansionPodId, LostRoverId } from './types';

export interface ExpansionPodSpec {
  id: ExpansionPodId;
  name: string;
  shortDesc: string;
  accentHex: string;
  x: number;
  z: number;
  radius: number;
  kind: 'dome' | 'lab' | 'dish' | 'garage' | 'observatory' | 'solar_array' | 'shelter';
  funFact: string;
}

export const EXPANSION_PODS: ExpansionPodSpec[] = [
  {
    id: 'rover_garage',
    name: 'Large Vehicle Hangar',
    shortDesc: '6-Wheel Exploration Vehicle & Charger',
    accentHex: '#f97316',
    x: 23,
    z: -3.5,
    radius: 3.1,
    kind: 'garage',
    funFact: 'Pressurized exploration vehicles park at heated solar bays so freezing -75°C Mars nights do not drain batteries!',
  },
  {
    id: 'research_lab',
    name: 'Research Lab',
    shortDesc: 'Soil & Rock Analysis',
    accentHex: '#06b6d4',
    x: 18.5,
    z: -16.5,
    radius: 2.5,
    kind: 'lab',
    funFact: 'Astronaut geologists bake Martian rock dust in mini ovens to spot water molecules!',
  },
  {
    id: 'geology_station',
    name: 'Geological Science Station',
    shortDesc: 'Core Drills & Strata',
    accentHex: '#d97706',
    x: -22,
    z: -15.5,
    radius: 2.3,
    kind: 'lab',
    funFact: 'Red Mars soil gets its rusty color from iron oxide—the same rust found on old Earth bikes!',
  },
  {
    id: 'weather_station',
    name: 'Weather Monitoring Station',
    shortDesc: 'Wind, Dust & Pressure',
    accentHex: '#38bdf8',
    x: -25.5,
    z: 2.5,
    radius: 2.1,
    kind: 'dish',
    funFact: 'Even though Mars air is 100× thinner than Earth’s, dust devils still spin high into the sky!',
  },
  {
    id: 'ice_station',
    name: 'Ice Exploration Station',
    shortDesc: 'Subsurface Ice Extraction',
    accentHex: '#60a5fa',
    x: -6.5,
    z: -24.5,
    radius: 2.4,
    kind: 'dome',
    funFact: 'Frozen water ice hides just beneath the red dust in many Martian mid-latitude plains!',
  },
  {
    id: 'emergency_shelter',
    name: 'Backup Emergency Habitat',
    shortDesc: 'Reserve Life Support Pod',
    accentHex: '#ef4444',
    x: 14.5,
    z: 23.5,
    radius: 2.4,
    kind: 'shelter',
    funFact: 'Space bases always include backup emergency habitats in case a main dome needs repairs.',
  },
  {
    id: 'observatory',
    name: 'Astronomical Observatory',
    shortDesc: 'Phobos & Deimos Dome',
    accentHex: '#8b5cf6',
    x: -17.5,
    z: 22.5,
    radius: 2.6,
    kind: 'observatory',
    funFact: 'Mars has two potato-shaped moons: fast Phobos rises in the west and sets in the east!',
  },
  {
    id: 'relay_station',
    name: 'Comms Relay Station',
    shortDesc: 'Deep-Range Colony Beacon',
    accentHex: '#a855f7',
    x: 24.5,
    z: -22.0,
    radius: 2.0,
    kind: 'dish',
    funFact: 'Orbiting Mars satellites catch quiet rover whispers and beam them powerfully back to Earth!',
  },
  {
    id: 'cargo_pod',
    name: 'Cargo & Supply Warehouse',
    shortDesc: 'Supply Terminal & Resupply Bay',
    accentHex: '#f59e0b',
    x: -15.5,
    z: -23.0,
    radius: 2.5,
    kind: 'shelter',
    funFact: 'Automated cargo landers touch down on the Cargo Pad so robotic transporters can deliver food, water, and spare parts!',
  },
  {
    id: 'suit_maintenance',
    name: 'Airlock & Suit Maintenance',
    shortDesc: 'Dust Cleaning & Thermal Check',
    accentHex: '#10b981',
    x: 7.0,
    z: 21.5,
    radius: 2.2,
    kind: 'dome',
    funFact: 'Fine Martian dust clings with static electricity, so astronauts brush suits in special airlocks!',
  },
  {
    id: 'drone_station',
    name: 'Drone Control Station',
    shortDesc: 'Aerial Scout Helipad',
    accentHex: '#14b8a6',
    x: -25.0,
    z: 15.5,
    radius: 2.2,
    kind: 'observatory',
    funFact: 'NASA’s Ingenuity helicopter proved rotor blades can fly in Mars’s ultra-thin atmosphere!',
  },
  {
    id: 'solar_expansion',
    name: 'Large Solar Farm',
    shortDesc: 'Auxiliary Colony Power Grid',
    accentHex: '#eab308',
    x: -27.5,
    z: -8.5,
    radius: 2.8,
    kind: 'solar_array',
    funFact: 'Mars receives about 43% as much sunlight as Earth, so large solar farms help power whole bases.',
  },
];

export interface MarsLandmarkSpec {
  id: string;
  name: string;
  regionName: string;
  category: string;
  x: number;
  z: number;
  discoveryRadius: number;
  scienceFact: string;
}

export const MARS_LANDMARKS: MarsLandmarkSpec[] = [
  {
    id: 'ancient_riverbed',
    name: 'Ares Ancient River Channel',
    regionName: 'Northeast Outflow Valley',
    category: 'Ancient Water',
    x: 74,
    z: -56,
    discoveryRadius: 18,
    scienceFact: 'Billions of years ago, liquid rivers carved winding delta channels across the Martian surface!',
  },
  {
    id: 'sand_dune_sea',
    name: 'Ochre Barchan Dune Sea',
    regionName: 'Southwest Wind Plains',
    category: 'Aeolian Dunes',
    x: -82,
    z: 54,
    discoveryRadius: 20,
    scienceFact: 'Steady Martian winds sculpt crescent-shaped barchan dunes out of dark basalt sand grains.',
  },
  {
    id: 'impact_crater',
    name: 'Meteorite Crater Rim',
    regionName: 'Southeast Crater Highlands',
    category: 'Impact Geology',
    x: 88,
    z: 76,
    discoveryRadius: 20,
    scienceFact: 'Impact craters dig up deep underground rock layers so scientists can read Mars’s ancient past!',
  },
  {
    id: 'rock_strata',
    name: 'Layered Sedimentary Cliff',
    regionName: 'Northwest Canyon Escarpment',
    category: 'Rock Strata',
    x: -96,
    z: -72,
    discoveryRadius: 19,
    scienceFact: 'Striped rock layers formed slowly over millions of years inside ancient Martian lakebeds.',
  },
  {
    id: 'ice_trench',
    name: 'Subsurface Frost Trench',
    regionName: 'Northern Polar Shelf',
    category: 'Frozen Water',
    x: 12,
    z: -136,
    discoveryRadius: 19,
    scienceFact: 'Clean water-ice sheets stay frozen beneath red Martian dust—future astronauts can melt them for drinking & fuel!',
  },
];

export interface MarsAnomalySpec {
  id: string;
  name: string;
  kind: 'landing_remains' | 'buried_probe' | 'stone_arch' | 'damaged_relay' | 'mineral_vein';
  x: number;
  z: number;
  discoveryRadius: number;
  storyNote: string;
  scienceFact: string;
}

export const MARS_ANOMALIES: MarsAnomalySpec[] = [
  {
    id: 'old_heatshield',
    name: 'Old Lander Heat Shield Site',
    kind: 'landing_remains',
    x: 52,
    z: -24,
    discoveryRadius: 13,
    storyNote: 'A scorched heat-shield shell & torn parachute rest on the rocks from an early Mars arrival!',
    scienceFact: 'Real Mars landers drop their glowing heat shields after slowing down through the thin atmosphere.',
  },
  {
    id: 'buried_probe',
    name: 'Dust-Covered Weather Probe',
    kind: 'buried_probe',
    x: -56,
    z: 22,
    discoveryRadius: 12,
    storyNote: 'Half-buried in orange drift sand sits an old colony wind sensor still blinking softly!',
    scienceFact: 'Long Martian seasons slowly bury stationary equipment beneath wind-blown iron-oxide dust.',
  },
  {
    id: 'basalt_arch',
    name: 'Wind-Carved Basalt Formation',
    kind: 'stone_arch',
    x: 60,
    z: 48,
    discoveryRadius: 14,
    storyNote: 'A dramatic natural rock arch shaped over eons by windblown Martian sand grains.',
    scienceFact: 'Windblown sand acts like gentle sandpaper over millions of years, carving strange stone shapes on Mars.',
  },
  {
    id: 'remote_relay',
    name: 'Remote Signal Relay Mast',
    kind: 'damaged_relay',
    x: -64,
    z: -48,
    discoveryRadius: 13,
    storyNote: 'A tilted solar relay pylon echoing weak radio telemetry from deeper in the canyon!',
    scienceFact: 'Remote relay antennas help rovers inside deep craters send science pictures back to orbital satellites.',
  },
  {
    id: 'clay_vein',
    name: 'Ancient Pale Mineral Vein',
    kind: 'mineral_vein',
    x: -18,
    z: -98,
    discoveryRadius: 13,
    storyNote: 'Bright pale mineral veins slice across the dark canyon floor—a clue to ancient underground water!',
    scienceFact: 'NASA rovers spotted white gypsum veins on Mars that only form where liquid water once flowed through rock cracks.',
  },
];

export interface LostRoverSpec {
  id: LostRoverId;
  name: string;
  regionName: string;
  era: string;
  x: number;
  z: number;
  accentHex: string;
  signalFreqMHz: string;
  transmissionClue: string;
  realHistoricalFact: string;
  simulatedMissionTask: string;
  diagnosticIssue: string;
}

export const LOST_ROVERS: LostRoverSpec[] = [
  {
    id: 'sojourner',
    name: 'Sojourner Heritage Site',
    regionName: 'Ares Floodplain Spur',
    era: 'Real NASA Mission: 1997 Mars Pathfinder',
    x: 68,
    z: -44,
    accentHex: '#38bdf8',
    signalFreqMHz: '401.58 MHz',
    transmissionClue: 'Weak 401.58 MHz chirp detected northeast past the Old Heat Shield toward the Ancient River Channel!',
    realHistoricalFact:
      'Real History: NASA’s microwave-oven-sized Sojourner became the first wheeled robot to rove Mars in 1997!',
    simulatedMissionTask:
      'GAME SIMULATION: Dust settled on its solar deck during a canyon squall. Wipe the panels and ping its tiny heritage beacon!',
    diagnosticIssue: 'Solar Deck Dust & Weak Telemetry Ping',
  },
  {
    id: 'spirit',
    name: 'Spirit Exploration Site',
    regionName: 'Ochre Barchan Dune Margin',
    era: 'Real NASA Mission: 2004–2010 Gusev Crater',
    x: -92,
    z: 62,
    accentHex: '#f97316',
    signalFreqMHz: '401.82 MHz',
    transmissionClue: 'Soft-sand wheel distress echo coming from southwest across the Ochre Dune Sea!',
    realHistoricalFact:
      'Real History: Spirit climbed Martian hills and found signs of ancient hot springs before getting stuck in soft sand in 2009.',
    simulatedMissionTask:
      'GAME SIMULATION: A sand drift jammed its wheel sensor. Clear the regolith and upload a simulated orbital relay check!',
    diagnosticIssue: 'Soft Sand Wheel Lock & Relay Drift',
  },
  {
    id: 'opportunity',
    name: 'Opportunity Ridge Site',
    regionName: 'Southeast Crater Rim',
    era: 'Real NASA Mission: 2004–2018 Meridiani Planum',
    x: 102,
    z: 66,
    accentHex: '#eab308',
    signalFreqMHz: '402.10 MHz',
    transmissionClue: 'Faint marathon-rover beacon bouncing off the Southeast Meteorite Crater Rim!',
    realHistoricalFact:
      'Real History: Opportunity drove over 45 km (a Martian marathon!) until a massive 2018 planet-wide dust storm blocked sunlight.',
    simulatedMissionTask:
      'GAME SIMULATION: Re-align its high-gain antenna and boost battery warmers so its science archive syncs to Ares Outpost!',
    diagnosticIssue: 'Dust-Dimmed Array & Dish Misalignment',
  },
  {
    id: 'curiosity',
    name: 'Curiosity Gale Site',
    regionName: 'Layered Sedimentary Cliff',
    era: 'Real NASA Mission: 2012–Present Gale Crater',
    x: -108,
    z: -78,
    accentHex: '#10b981',
    signalFreqMHz: '437.10 MHz',
    transmissionClue: 'Deep 437.10 MHz nuclear-rover telemetry pulsing near the Northwest Layered Cliff!',
    realHistoricalFact:
      'Real History: Nuclear-powered Curiosity carries the RAD radiation detector and proved Gale Crater once held freshwater lakes!',
    simulatedMissionTask:
      'GAME SIMULATION: Its rock-laser spectrometer needs a target calibration check and weather relay upload!',
    diagnosticIssue: 'Spectrometer Laser Alignment Check',
  },
  {
    id: 'perseverance',
    name: 'Perseverance Delta Site',
    regionName: 'Northern Frost & Delta Basin',
    era: 'Real NASA Mission: 2021–Present Jezero Crater',
    x: 18,
    z: -152,
    accentHex: '#a855f7',
    signalFreqMHz: '437.45 MHz',
    transmissionClue: 'High-frequency 437.45 MHz signal radiating far north beyond the Frost Trench!',
    realHistoricalFact:
      'Real History: Perseverance explored Jezero’s ancient river delta, flew the Ingenuity helicopter, and tested MOXIE oxygen production!',
    simulatedMissionTask:
      'GAME SIMULATION: Retrieve a simulated cached rock tube telemetry packet and relay it back to the colony Research Lab!',
    diagnosticIssue: 'Sample Cache Relay & MOXIE Telemetry Sync',
  },
];
