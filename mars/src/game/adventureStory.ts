import {
  BuildingId,
  ChapterId,
  CharacterId,
  CrewNpcId,
  CrewRoleId,
  DialogueLine,
  EquipmentPanelType,
  InteractiveNodeId,
  InteractiveNodeSpec,
  Step5Flow,
  WorldVisualState,
} from './types';

export interface BuildingInfo {
  id: BuildingId;
  name: string;
  shortDesc: string;
  accentHex: string;
  position: [number, number, number];
  tourCamOffset: [number, number, number];
}

export const LANDING_PAD_POS: [number, number] = [15.5, 13.5];

export const BASE_BUILDINGS: Record<BuildingId, BuildingInfo> = {
  crew_home: {
    id: 'crew_home',
    name: 'Crew Home',
    shortDesc: 'Living Dome & Bunks',
    accentHex: '#f97316',
    position: [0, 0, 0],
    tourCamOffset: [8, 6.5, 11],
  },
  oxygen_centre: {
    id: 'oxygen_centre',
    name: 'Oxygen Centre',
    shortDesc: 'Makes Fresh Air',
    accentHex: '#38bdf8',
    position: [-11.5, 0, 4.5],
    tourCamOffset: [6, 5, 9],
  },
  water_station: {
    id: 'water_station',
    name: 'Water Station',
    shortDesc: 'Cleans & Saves Water',
    accentHex: '#3b82f6',
    position: [-11.0, 0, -7.5],
    tourCamOffset: [7, 5.2, 8.5],
  },
  power_station: {
    id: 'power_station',
    name: 'Power Station',
    shortDesc: 'Solar Panels & Batteries',
    accentHex: '#eab308',
    position: [-15.5, 0, 11.5],
    tourCamOffset: [7, 5.5, 9],
  },
  greenhouse: {
    id: 'greenhouse',
    name: 'Greenhouse',
    shortDesc: 'Space Garden & Food',
    accentHex: '#10b981',
    position: [11.0, 0, -1.5],
    tourCamOffset: [6, 5.2, 9.5],
  },
  comms_tower: {
    id: 'comms_tower',
    name: 'Communication Tower',
    shortDesc: 'Space Dish & Radio',
    accentHex: '#a855f7',
    position: [10.0, 0, -11.5],
    tourCamOffset: [6.5, 6.2, 8.5],
  },
  medical_room: {
    id: 'medical_room',
    name: 'Medical Room',
    shortDesc: 'Astronaut Health Pod',
    accentHex: '#ef4444',
    position: [8.5, 0, 8.8],
    tourCamOffset: [6, 4.8, 8],
  },
  radiation_shelter: {
    id: 'radiation_shelter',
    name: 'Radiation Shelter',
    shortDesc: 'Armored Storm Bunker',
    accentHex: '#f43f5e',
    position: [-2.5, 0, 13.5],
    tourCamOffset: [6.5, 5.5, 9.5],
  },
  command_centre: {
    id: 'command_centre',
    name: 'Command Centre',
    shortDesc: 'Lookout & Landing Beacon',
    accentHex: '#f59e0b',
    position: [0, 0, -11.5],
    tourCamOffset: [7.5, 6.8, 9.5],
  },
};

export interface CharacterProfile {
  id: CharacterId;
  name: string;
  role: string;
  crewRoleId?: CrewRoleId;
  roleBadge?: string;
  specialtyTip?: string;
  suitColor: string;
  homePos: [number, number, number];
  rotY: number;
}

export const CHARACTERS_INFO: Record<CharacterId, CharacterProfile> = {
  alex: {
    id: 'alex',
    name: 'Alex',
    role: 'Lead Junior Astronaut',
    crewRoleId: 'engineer',
    roleBadge: 'Player Hero',
    specialtyTip: 'You lead field exploration, repairs & the Pressurized Exploration Vehicle!',
    suitColor: '#f97316',
    homePos: [2.2, 0, 6.2],
    rotY: 0.2,
  },
  leo: {
    id: 'leo',
    name: 'Leo',
    role: 'Colony Engineer',
    crewRoleId: 'engineer',
    roleBadge: 'Engineer',
    specialtyTip: 'Inspects oxygen scrubbers, water pumps, power lines & the Cargo Warehouse.',
    suitColor: '#ec4899',
    homePos: [-7.5, 0, 3.8],
    rotY: 0.45,
  },
  maya: {
    id: 'maya',
    name: 'Maya',
    role: 'Scientist',
    crewRoleId: 'scientist',
    roleBadge: 'Scientist',
    specialtyTip: 'Analyses rock samples in the Research Lab & monitors dust storm telemetry.',
    suitColor: '#06b6d4',
    homePos: [-2.2, 0, 6.2],
    rotY: 0.35,
  },
  zara: {
    id: 'zara',
    name: 'Zara',
    role: 'Botanist',
    crewRoleId: 'botanist',
    roleBadge: 'Botanist',
    specialtyTip: 'Tends Mars tomato beds, irrigation hoses & Greenhouse grow lights.',
    suitColor: '#10b981',
    homePos: [5.4, 0, -1.5],
    rotY: -0.7,
  },
  ryan: {
    id: 'ryan',
    name: 'Ryan',
    role: 'Comms Officer',
    crewRoleId: 'comms',
    roleBadge: 'Comms Officer',
    specialtyTip: 'Tracks rover radio signals, Commander Nova links & orbital cargo deliveries.',
    suitColor: '#eab308',
    homePos: [5.8, 0, -9.8],
    rotY: 0.55,
  },
  nova: {
    id: 'nova',
    name: 'Commander Nova',
    role: 'Mission Mentor',
    suitColor: '#2563eb',
    homePos: [4.2, 0, 7.0],
    rotY: -0.45,
  },
};

export const CREW_NPC_ORDER: CrewNpcId[] = ['leo', 'maya', 'zara', 'ryan'];

export const DELAYED_NOVA_MESSAGES: Record<number, DialogueLine[]> = {
  3: [
    {
      speaker: 'Commander Nova',
      role: 'Colony Comms Briefing',
      avatar: 'nova',
      text: 'Great drive back to Ares Colony, Alex! Now check in with Leo at the Oxygen Centre—fresh air keeps the whole base humming.',
    },
  ],
  6: [
    {
      speaker: 'Commander Nova',
      role: 'Chapter 2 Briefing',
      avatar: 'nova',
      text: 'Power, water, and air are steady! Meet Maya and Zara as you explore Colony Life: greenhouses, clean water recycling, health scans, and warm habitats.',
    },
  ],
  11: [
    {
      speaker: 'Commander Nova',
      role: 'Deep-Canyon Relay',
      avatar: 'nova',
      text: 'Ryan is ready at Comms Tower! Hop into your 6-wheel Exploration Vehicle whenever you want—lost beacons, heritage rovers, and mountain stations await beyond the dome!',
    },
  ],
  15: [
    {
      speaker: 'Commander Nova',
      role: 'Urgent Storm Telemetry',
      avatar: 'nova',
      text: 'Hold steady down there, Ares Crew! Dust levels are rising across the basin—keep batteries charged and the Radiation Shelter stocked!',
    },
  ],
  18: [
    {
      speaker: 'Commander Nova',
      role: 'Final Chapter Approaching',
      avatar: 'nova',
      text: 'Just a few big challenges left, Junior Astronaut! Our colony is counting on you to clear the weather mast, test shields, and bring our lander safely home.',
    },
  ],
};

export const INTERACTIVE_NODES: Record<InteractiveNodeId, InteractiveNodeSpec> = {
  // Mission 1 & 2: Remote Comms Relay & Return to Colony
  m1_remote_relay: {
    id: 'm1_remote_relay',
    label: 'Remote Communication Relay Box',
    promptAction: 'Inspect & Stabilize Remote Relay',
    position: [122, 0, 48],
    buildingId: 'comms_tower',
    recommendedRole: 'comms',
  },
  m2_camp_checkin: {
    id: 'm2_camp_checkin',
    label: 'Ares Colony Rover Bay',
    promptAction: 'Park Rover & Check In at Colony',
    position: [17.5, 0, -10.5],
    buildingId: 'command_centre',
    recommendedRole: 'engineer',
  },

  // Mission 3: Restore Oxygen
  m1_crew_monitor: {
    id: 'm1_crew_monitor',
    label: 'Crew Home Air Monitor',
    promptAction: 'Inspect Air Monitor Inside',
    position: [1.9, 0, 0.9],
    buildingId: 'crew_home',
    recommendedRole: 'scientist',
  },
  m1_o2_panel: {
    id: 'm1_o2_panel',
    label: 'Oxygen Power & Circuit Panel',
    promptAction: 'Repair Circuit',
    position: [-10.6, 0, 4.5],
    buildingId: 'oxygen_centre',
    recommendedRole: 'engineer',
  },
  m1_filter_crate: {
    id: 'm1_filter_crate',
    label: 'Spare Filter Storage Crate',
    promptAction: 'Pick Up Clean Air Filter',
    position: [-15.2, 0, 7.6],
    buildingId: 'oxygen_centre',
  },

  // Mission 2: The Water Emergency
  m2_leaking_pipe: {
    id: 'm2_leaking_pipe',
    label: 'Spraying Water Pipe (Inside)',
    promptAction: 'Inspect Leaking Pipe',
    position: [-11.2, 0, -7.8],
    buildingId: 'water_station',
    recommendedRole: 'engineer',
  },
  m2_repair_kit: {
    id: 'm2_repair_kit',
    label: 'Pipe Repair Kit Crate',
    promptAction: 'Grab Pipe Repair Kit',
    position: [-6.8, 0, -10.5],
    buildingId: 'water_station',
  },
  m2_shutoff_valve: {
    id: 'm2_shutoff_valve',
    label: 'Red Shutoff Valve (Inside)',
    promptAction: 'Close Shutoff Valve',
    position: [-10.0, 0, -6.1],
    buildingId: 'water_station',
    recommendedRole: 'engineer',
  },
  m2_water_console: {
    id: 'm2_water_console',
    label: 'Water Recycling Console',
    promptAction: 'Restart Water Recycling',
    position: [-10.0, 0, -8.9],
    buildingId: 'water_station',
  },

  // Mission 3: Power Under Pressure
  m3_power_monitor: {
    id: 'm3_power_monitor',
    label: 'Power Control Terminal (Inside)',
    promptAction: 'Check Power Terminal',
    position: [-14.8, 0, 11.5],
    buildingId: 'power_station',
    recommendedRole: 'scientist',
  },
  m3_solar_panel: {
    id: 'm3_solar_panel',
    label: 'Dust-Covered Solar Array',
    promptAction: 'Brush Dust Off Solar Panels',
    position: [-16.2, 0, 13.5],
    buildingId: 'power_station',
  },
  m3_loose_cable: {
    id: 'm3_loose_cable',
    label: 'Sparking Power Junction',
    promptAction: 'Reconnect Power Cable',
    position: [-13.0, 0, 13.6],
    buildingId: 'power_station',
    recommendedRole: 'engineer',
  },
  m3_power_restart: {
    id: 'm3_power_restart',
    label: 'Battery Charging Lever',
    promptAction: 'Restart Charging System',
    position: [-14.9, 0, 11.5],
    buildingId: 'power_station',
  },

  // Mission 4: Secrets Beyond the Colony (Forgotten Signal Expedition)
  m4_comms_signal: {
    id: 'm4_comms_signal',
    label: 'Long-Range Signal Scanner (Inside)',
    promptAction: 'Decode Mystery Mars Signal',
    position: [9.9, 0, -11.5],
    buildingId: 'comms_tower',
    recommendedRole: 'comms',
  },
  m4_garage_prep: {
    id: 'm4_garage_prep',
    label: 'Rover Garage Expedition Kit',
    promptAction: 'Grab Signal Tracker & Prep Rover',
    position: [19.0, 0, -3.5],
    buildingId: 'greenhouse',
    recommendedRole: 'engineer',
  },
  m4_track_clue: {
    id: 'm4_track_clue',
    label: 'Heritage Rover Tracks & Relay Post',
    promptAction: 'Scan Rover Tracks & Signal Ping',
    position: [43.5, 0, -25.5],
    buildingId: 'comms_tower',
    recommendedRole: 'scientist',
  },

  // Mission 5: The Forgotten Explorer (Comms Dish & Heritage Relay)
  m5_comms_console: {
    id: 'm5_comms_console',
    label: 'Radio Console (Inside)',
    promptAction: 'Check Radio Console',
    position: [9.9, 0, -11.5],
    buildingId: 'comms_tower',
    recommendedRole: 'comms',
  },
  m5_antenna_cable: {
    id: 'm5_antenna_cable',
    label: 'Outdoor Antenna Cable Box',
    promptAction: 'Secure Antenna Cable',
    position: [12.8, 0, -10.5],
    buildingId: 'comms_tower',
    recommendedRole: 'engineer',
  },
  m5_dish_gear: {
    id: 'm5_dish_gear',
    label: 'Parabolic Dish Aiming Wheel',
    promptAction: 'Aim Space Dish',
    position: [7.2, 0, -9.2],
    buildingId: 'comms_tower',
    recommendedRole: 'comms',
  },

  // Mission 6: The Greenhouse Crisis
  m6_plants: {
    id: 'm6_plants',
    label: 'Garden Plant Beds (Inside)',
    promptAction: 'Check Wilting Plants',
    position: [9.4, 0, -1.5],
    buildingId: 'greenhouse',
    recommendedRole: 'botanist',
  },
  m6_water_tube: {
    id: 'm6_water_tube',
    label: 'Greenhouse Irrigation Box',
    promptAction: 'Repair Irrigation & Water Beds',
    position: [10.8, 0, -1.5],
    buildingId: 'greenhouse',
    recommendedRole: 'engineer',
  },
  m6_grow_light: {
    id: 'm6_grow_light',
    label: 'Grow-Light Control Panel',
    promptAction: 'Tune Pink Grow Lights',
    position: [12.9, 0, -1.5],
    buildingId: 'greenhouse',
    recommendedRole: 'scientist',
  },
  m6_plant_seeds: {
    id: 'm6_plant_seeds',
    label: 'Seedling & Growth Tray',
    promptAction: 'Plant & Tend Space Seeds',
    position: [11.3, 0, -1.5],
    buildingId: 'greenhouse',
    recommendedRole: 'botanist',
  },
  m6_harvest: {
    id: 'm6_harvest',
    label: 'Ripe Mars Tomatoes',
    promptAction: 'Harvest Space Tomatoes!',
    position: [11.3, 0, -1.5],
    buildingId: 'greenhouse',
    recommendedRole: 'botanist',
  },

  // Mission 7: Repair Water Recycler
  m7_recycler_inspect: {
    id: 'm7_recycler_inspect',
    label: 'Water Recycler Drum (Inside)',
    promptAction: 'Inspect Water Recycler',
    position: [-9.75, 0, -8.5],
    buildingId: 'water_station',
    recommendedRole: 'engineer',
  },
  m7_recycler_filter: {
    id: 'm7_recycler_filter',
    label: 'Clean Filter Cartridge Rack',
    promptAction: 'Pick Up Clean Filter Screen',
    position: [-7.0, 0, -6.4],
    buildingId: 'water_station',
  },
  m7_recycler_console: {
    id: 'm7_recycler_console',
    label: 'Recycler Cleaning Console (Inside)',
    promptAction: 'Clean & Restart Recycler',
    position: [-10.1, 0, -8.9],
    buildingId: 'water_station',
    recommendedRole: 'engineer',
  },

  // Mission 8: Medical Station Checkup
  m8_med_supply: {
    id: 'm8_med_supply',
    label: 'First-Aid Supply Shelf (Inside)',
    promptAction: 'Restock Medical Kits',
    position: [8.6, 0, 7.3],
    buildingId: 'medical_room',
  },
  m8_med_scanner: {
    id: 'm8_med_scanner',
    label: 'Crew Health Scanner (Inside)',
    promptAction: 'Prepare Health Scanner',
    position: [7.65, 0, 9.8],
    buildingId: 'medical_room',
    recommendedRole: 'scientist',
  },
  m8_med_console: {
    id: 'm8_med_console',
    label: 'Vitals Checkup Screen (Inside)',
    promptAction: 'Run Gentle Crew Checkup',
    position: [7.8, 0, 8.8],
    buildingId: 'medical_room',
    recommendedRole: 'scientist',
  },

  // Mission 9: Food Supply Pantry
  m9_food_greenhouse: {
    id: 'm9_food_greenhouse',
    label: 'Fresh Harvest Basket (Greenhouse)',
    promptAction: 'Collect Fresh Harvest Crate',
    position: [11.0, 0, -1.5],
    buildingId: 'greenhouse',
    recommendedRole: 'botanist',
  },
  m9_food_storage: {
    id: 'm9_food_storage',
    label: 'Crew Home Food Pantry (Inside)',
    promptAction: 'Check Cooling Pantry',
    position: [-1.35, 0, -3.2],
    buildingId: 'crew_home',
  },
  m9_food_sorter: {
    id: 'm9_food_sorter',
    label: 'Snack & Ration Shelf (Inside)',
    promptAction: 'Sort Food Supplies',
    position: [-1.1, 0, -3.1],
    buildingId: 'crew_home',
    recommendedRole: 'botanist',
  },

  // Mission 10: Habitat Temperature Control
  m10_thermostat: {
    id: 'm10_thermostat',
    label: 'Crew Home Thermostat (Inside)',
    promptAction: 'Check Habitat Temperature',
    position: [0.65, 0, -3.2],
    buildingId: 'crew_home',
    recommendedRole: 'scientist',
  },
  m10_heater_coil: {
    id: 'm10_heater_coil',
    label: 'Habitat Heater Coil (Power Station)',
    promptAction: 'Boost Heater Power Line',
    position: [-14.9, 0, 11.5],
    buildingId: 'power_station',
    recommendedRole: 'engineer',
  },
  m10_crew_check: {
    id: 'm10_crew_check',
    label: 'Cozy Habitat Control (Inside)',
    promptAction: 'Warm Up Crew Habitat',
    position: [1.8, 0, 1.2],
    buildingId: 'crew_home',
    recommendedRole: 'engineer',
  },

  // Mission 11: Lost Exploration Beacon
  m11_comms_clue: {
    id: 'm11_comms_clue',
    label: 'Comms Beacon Tracker (Inside)',
    promptAction: 'Locate Silent Trail Beacon',
    position: [9.9, 0, -11.5],
    buildingId: 'comms_tower',
    recommendedRole: 'comms',
  },
  m11_lost_beacon: {
    id: 'm11_lost_beacon',
    label: 'North Valley Exploration Beacon',
    promptAction: 'Tune & Light Trail Beacon',
    position: [64, 0, -98],
    buildingId: 'comms_tower',
    recommendedRole: 'comms',
  },

  // Mission 13: Rover Recovery (Spirit)
  m13_dune_clue: {
    id: 'm13_dune_clue',
    label: 'Southwest Dune Track Marker',
    promptAction: 'Scan Spirit Wheel Tracks',
    position: [-74, 0, 48],
    buildingId: 'comms_tower',
    recommendedRole: 'scientist',
  },

  // Mission 14: Mountain Research Station
  m14_mountain_terminal: {
    id: 'm14_mountain_terminal',
    label: 'Mountain Station Access Pod',
    promptAction: 'Inspect Mountain Research Station',
    position: [-118, 0, -96],
    buildingId: 'command_centre',
    recommendedRole: 'scientist',
  },
  m14_mountain_sensor: {
    id: 'm14_mountain_sensor',
    label: 'Hilltop Wind & Rock Sensor',
    promptAction: 'Calibrate Mountain Sensors',
    position: [-116.5, 0, -94.8],
    buildingId: 'command_centre',
    recommendedRole: 'scientist',
  },

  // Mission 15: Dust Storm Preparation (M7 legacy nodes kept below)
  m7_weather_console: {
    id: 'm7_weather_console',
    label: 'Command Centre Weather Radar',
    promptAction: 'Check Approaching Dust Storm',
    position: [0, 0, -11.2],
    buildingId: 'command_centre',
    recommendedRole: 'scientist',
  },
  m7_battery_switch: {
    id: 'm7_battery_switch',
    label: 'Storm Backup Battery Switch',
    promptAction: 'Switch to Backup Batteries',
    position: [-15.1, 0, 11.5],
    buildingId: 'power_station',
    recommendedRole: 'engineer',
  },
  m7_greenhouse_shutter: {
    id: 'm7_greenhouse_shutter',
    label: 'Greenhouse Storm Shield Panel',
    promptAction: 'Close Greenhouse Storm Shields',
    position: [9.4, 0, -1.5],
    buildingId: 'greenhouse',
    recommendedRole: 'botanist',
  },

  // Mission 17: Power Satellite Problem
  m17_solar_sync: {
    id: 'm17_solar_sync',
    label: 'Solar Farm Tracking Panel',
    promptAction: 'Check Solar Wing Tilt',
    position: [-15.5, 0, 11.5],
    buildingId: 'power_station',
    recommendedRole: 'engineer',
  },
  m17_satellite_pad: {
    id: 'm17_satellite_pad',
    label: 'Power Satellite Uplink Dish',
    promptAction: 'Align Power Satellite Uplink',
    position: [-29.5, 0, -14],
    buildingId: 'power_station',
    recommendedRole: 'comms',
  },

  // Mission 18: Remote Weather Station
  m18_remote_weather: {
    id: 'm18_remote_weather',
    label: 'Western Outpost Weather Mast',
    promptAction: 'Clear & Calibrate Weather Station',
    position: [-124, 0, 34],
    buildingId: 'command_centre',
    recommendedRole: 'scientist',
  },
  m18_weather_report: {
    id: 'm18_weather_report',
    label: 'Command Centre Forecast Desk',
    promptAction: 'Deliver Weather Report',
    position: [0, 0, -11.2],
    buildingId: 'command_centre',
    recommendedRole: 'comms',
  },

  // Mission 19: Colony Emergency Shield Challenge
  m8_rad_inspect: {
    id: 'm8_rad_inspect',
    label: 'Shelter Sensor Console (Inside)',
    promptAction: 'Inspect Radiation Shelter',
    position: [-2.4, 0, 13.3],
    buildingId: 'radiation_shelter',
    recommendedRole: 'scientist',
  },
  m8_rad_blocks: {
    id: 'm8_rad_blocks',
    label: 'Martian Regolith Shielding Crate',
    promptAction: 'Collect Soil Shielding Blocks',
    position: [-6.4, 0, 12.6],
    buildingId: 'radiation_shelter',
  },
  m8_rad_shield: {
    id: 'm8_rad_shield',
    label: 'Shelter Shielding Wall Slots',
    promptAction: 'Install Regolith Shielding',
    position: [-3.9, 0, 13.8],
    buildingId: 'radiation_shelter',
    recommendedRole: 'engineer',
  },
  m8_rad_drill: {
    id: 'm8_rad_drill',
    label: 'Shelter Storm Protection Console',
    promptAction: 'Run Radiation Storm Drill',
    position: [-1.7, 0, 13.8],
    buildingId: 'radiation_shelter',
    recommendedRole: 'scientist',
  },
  m19_emergency_override: {
    id: 'm19_emergency_override',
    label: 'Backup Emergency Shield Switch',
    promptAction: 'Test Colony Emergency Override',
    position: [14.5, 0, 23.5],
    buildingId: 'radiation_shelter',
    recommendedRole: 'engineer',
  },

  // Mission 20: Final Mars Mission
  m9_shelter_check: {
    id: 'm9_shelter_check',
    label: 'Radiation Shelter Airlock Lock',
    promptAction: 'Verify Shelter & Crew Safe',
    position: [-2.4, 0, 13.3],
    buildingId: 'radiation_shelter',
    recommendedRole: 'scientist',
  },
  m9_solar_dust_check: {
    id: 'm9_solar_dust_check',
    label: 'Post-Storm Dusty Solar Wings',
    promptAction: 'Inspect & Wipe Storm Dust Off Panels',
    position: [-16.2, 0, 13.5],
    buildingId: 'power_station',
    recommendedRole: 'engineer',
  },
  m9_landing_beacon: {
    id: 'm9_landing_beacon',
    label: 'Command Centre Landing Beacon',
    promptAction: 'Ignite Landing Beacon!',
    position: [0, 0, -11.2],
    buildingId: 'command_centre',
    recommendedRole: 'comms',
  },

  // Guided Tour Nodes (placed by doorways)
  tour_crew_home: {
    id: 'tour_crew_home',
    label: 'Crew Home Airlock',
    promptAction: 'Hear About Crew Home',
    position: [0, 0, 5.4],
    buildingId: 'crew_home',
  },
  tour_oxygen_centre: {
    id: 'tour_oxygen_centre',
    label: 'Oxygen Centre Door',
    promptAction: 'Inspect Oxygen Maker',
    position: [-8.0, 0, 4.5],
    buildingId: 'oxygen_centre',
  },
  tour_water_station: {
    id: 'tour_water_station',
    label: 'Water Station Door',
    promptAction: 'Inspect Water Recycler',
    position: [-7.2, 0, -7.5],
    buildingId: 'water_station',
  },
  tour_power_station: {
    id: 'tour_power_station',
    label: 'Power Station Door',
    promptAction: 'Inspect Solar Arrays',
    position: [-12.5, 0, 11.5],
    buildingId: 'power_station',
  },
  tour_greenhouse: {
    id: 'tour_greenhouse',
    label: 'Greenhouse Door',
    promptAction: 'Inspect Space Garden',
    position: [6.8, 0, -1.5],
    buildingId: 'greenhouse',
  },
  tour_comms_tower: {
    id: 'tour_comms_tower',
    label: 'Communication Tower Door',
    promptAction: 'Inspect Space Dish',
    position: [6.8, 0, -11.5],
    buildingId: 'comms_tower',
  },
  tour_medical_room: {
    id: 'tour_medical_room',
    label: 'Medical Room Door',
    promptAction: 'Inspect Medical Pod',
    position: [5.4, 0, 8.8],
    buildingId: 'medical_room',
  },
  tour_radiation_shelter: {
    id: 'tour_radiation_shelter',
    label: 'Radiation Shelter Door',
    promptAction: 'Inspect Radiation Shelter',
    position: [-2.5, 0, 10.2],
    buildingId: 'radiation_shelter',
  },
  tour_command_centre: {
    id: 'tour_command_centre',
    label: 'Command Centre Door',
    promptAction: 'Inspect Command Tower',
    position: [0, 0, -8.2],
    buildingId: 'command_centre',
  },
};

export interface MissionStep {
  id: string;
  objectiveText: string;
  hintText: string;
  step5Flow?: Step5Flow;
  activeNodes: InteractiveNodeId[];
  focusPos?: [number, number, number];
  crewPos?: [number, number, number];
  dialogueOnStart?: DialogueLine[];
  nodeTriggers: Partial<
    Record<
      InteractiveNodeId,
      {
        dialogue?: DialogueLine[];
        equipmentPanel?: EquipmentPanelType;
        nextStep?: boolean;
        patchWorld?: Partial<WorldVisualState>;
        carryingItem?: string | null;
      }
    >
  >;
}

export interface MissionDefinition {
  id: number;
  chapterId: ChapterId;
  unlockedCrewIds: CrewNpcId[];
  label: string;
  title: string;
  badgeTitle: string;
  badgeColor: string;
  scienceTerm: string;
  simpleLesson: string;
  funFact: string;
  initialWorldPatch: Partial<WorldVisualState>;
  steps: MissionStep[];
}

export const OPENING_TOUR_LOCATIONS: Array<{
  nodeId: InteractiveNodeId;
  buildingId: BuildingId;
  dialogue: DialogueLine[];
}> = [
  {
    nodeId: 'tour_crew_home',
    buildingId: 'crew_home',
    dialogue: [
      {
        speaker: 'Commander Nova',
        role: 'Mission Mentor',
        avatar: 'nova',
        text: 'First stop: Crew Home! Walk up to any building airlock and the doors slide open so you can explore right inside!',
        focusTarget: [0, 2.2, 0],
      },
      {
        speaker: 'Ryan',
        role: 'Comms Officer',
        avatar: 'ryan',
        text: 'Awesome! Inside are our sleeping bunks, meeting table, and air monitor!',
      },
    ],
  },
  {
    nodeId: 'tour_oxygen_centre',
    buildingId: 'oxygen_centre',
    dialogue: [
      {
        speaker: 'Commander Nova',
        role: 'Mission Mentor',
        avatar: 'nova',
        text: 'This is the Oxygen Centre. Outside Mars air cannot be breathed by people, so this machine turns thin Mars air into fresh oxygen!',
        focusTarget: [-11.5, 2.0, 4.5],
      },
      {
        speaker: 'Maya',
        role: 'Scientist',
        avatar: 'maya',
        text: 'And that spinning roof fan keeps clean air flowing through the blue pipes!',
      },
    ],
  },
  {
    nodeId: 'tour_water_station',
    buildingId: 'water_station',
    dialogue: [
      {
        speaker: 'Commander Nova',
        role: 'Mission Mentor',
        avatar: 'nova',
        text: 'Here is the Water Station. On Mars, every single drop counts—these blue silos clean and recycle water over and over.',
        focusTarget: [-11.0, 2.0, -7.5],
      },
    ],
  },
  {
    nodeId: 'tour_power_station',
    buildingId: 'power_station',
    dialogue: [
      {
        speaker: 'Commander Nova',
        role: 'Mission Mentor',
        avatar: 'nova',
        text: 'Welcome to the Power Station. Shiny solar panels soak up sunlight to charge our battery bank—as long as red Mars dust stays off!',
        focusTarget: [-15.5, 1.8, 11.5],
      },
    ],
  },
  {
    nodeId: 'tour_greenhouse',
    buildingId: 'greenhouse',
    dialogue: [
      {
        speaker: 'Zara',
        role: 'Botanist',
        avatar: 'zara',
        text: 'Ooh, look inside the Greenhouse! Are those real Mars tomato beds under pink grow lights?',
        focusTarget: [11.0, 1.8, -1.5],
      },
      {
        speaker: 'Commander Nova',
        role: 'Mission Mentor',
        avatar: 'nova',
        text: 'Yes, Zara! Plants give astronauts fresh food and help keep crew morale sky high.',
      },
    ],
  },
  {
    nodeId: 'tour_comms_tower',
    buildingId: 'comms_tower',
    dialogue: [
      {
        speaker: 'Commander Nova',
        role: 'Mission Mentor',
        avatar: 'nova',
        text: 'That tall white dish is our Communication Tower. We aim it toward satellites to talk across Mars and back to Earth.',
        focusTarget: [10.0, 3.0, -11.5],
      },
    ],
  },
  {
    nodeId: 'tour_medical_room',
    buildingId: 'medical_room',
    dialogue: [
      {
        speaker: 'Commander Nova',
        role: 'Mission Mentor',
        avatar: 'nova',
        text: 'Our Medical Room keeps health scanners and first-aid gear ready so our crew always stays healthy.',
        focusTarget: [8.5, 1.8, 8.8],
      },
    ],
  },
  {
    nodeId: 'tour_radiation_shelter',
    buildingId: 'radiation_shelter',
    dialogue: [
      {
        speaker: 'Commander Nova',
        role: 'Mission Mentor',
        avatar: 'nova',
        text: 'And this armored bunker is our Radiation Shelter! Packed Martian soil—called regolith—shields astronauts during solar storm drills.',
        focusTarget: [-2.5, 2.0, 13.5],
      },
    ],
  },
  {
    nodeId: 'tour_command_centre',
    buildingId: 'command_centre',
    dialogue: [
      {
        speaker: 'Commander Nova',
        role: 'Mission Mentor',
        avatar: 'nova',
        text: 'Finally, the Command Centre! From here we watch storms and switch on the golden Landing Beacon whenever a spacecraft comes home.',
        focusTarget: [0, 3.2, -11.5],
      },
    ],
  },
];

export const SCENE_1_SPACE_LINES: DialogueLine[] = [
  {
    speaker: 'Narrator',
    role: 'Mars Adventure',
    avatar: 'nova',
    text: 'Far across the dark stars floats the Red Planet—Mars. Deep inside Ares Basin waits a brand-new home for Alex and the junior astronaut crew.',
  },
];

export const SCENE_2_ARRIVAL_LINES: DialogueLine[] = [
  {
    speaker: 'Alex',
    role: 'Lead Junior Astronaut',
    avatar: 'alex',
    text: 'Hold on tight! Our landing thrusters are firing—look at that red dust swirling across the canyon below!',
  },
];

export const SCENE_3_WELCOME_LINES: DialogueLine[] = [
  {
    speaker: 'Commander Nova',
    role: 'Mission Mentor',
    avatar: 'nova',
    text: 'Welcome to Mars, Alex! You will lead field missions while Maya, Zara, and Ryan back you up on science, plants, and comms. Let us tour the base together!',
    focusTarget: [3.2, 1.6, 6.4],
  },
  {
    speaker: 'Maya',
    role: 'Scientist',
    avatar: 'maya',
    text: 'Whoa, gravity here is only 3.71 m/s²—less than half of Earth’s! Lead the way around Ares Outpost!',
  },
];

export const SCENE_5_DEPARTURE_LINES: DialogueLine[] = [
  {
    speaker: 'Commander Nova',
    role: 'Mission Mentor',
    avatar: 'nova',
    text: 'Hold on—an urgent supply capsule lost its beacon two valleys away! I have to lift off in the Ares Lander and retrieve it right now.',
    focusTarget: [15.5, 3.0, 13.5],
  },
  {
    speaker: 'Commander Nova',
    role: 'Mission Mentor',
    avatar: 'nova',
    text: 'Lead the crew, Alex! Watch your Air, Water, Power, and Food, ask Maya, Zara, or Ryan anytime with Ask Crew, and radio me if anything unusual happens!',
    focusTarget: [15.5, 4.0, 13.5],
  },
  {
    speaker: 'Ryan',
    role: 'Comms Officer',
    avatar: 'ryan',
    text: 'Whoa… he actually took off! We are running a whole Mars colony together!',
  },
  {
    speaker: 'Zara',
    role: 'Botanist',
    avatar: 'zara',
    text: 'Do not worry—everything looks calm right now. What could possibly go wrong?',
  },
];

export const CAMPAIGN_MISSIONS: MissionDefinition[] = [
  // =========================================================================
  // CHAPTER 1: ARRIVAL AT THE MARS COLONY (Missions 1–5)
  // =========================================================================
  {
    id: 1,
    chapterId: 1,
    unlockedCrewIds: [],
    label: 'Mission 1',
    title: 'Remote Comms Relay Assignment',
    badgeTitle: 'Relay Rookie',
    badgeColor: '#38bdf8',
    scienceTerm: 'Remote Radio Relays',
    simpleLesson: 'Remote relay stations bounce messages over Mars hills so explorers stay connected!',
    funFact: 'Mars has tall ridges and deep craters, so relay boxes help signals travel around cliffs!',
    initialWorldPatch: {
      introPhase: 'site_inspection',
      relayPanelOpen: false,
      relayRepaired: false,
      o2AlarmActive: false,
      o2FanSpinning: true,
      waterLeakActive: false,
      powerBlackout: false,
      plantsWilting: false,
      dustStormActive: false,
      stormStage: 1,
      weather: 'Clear',
      beaconBeamActive: false,
      landerState: 'gone',
      novaPresent: true,
      crewMood: 'calm',
      unlockedCrewIds: [],
    },
    steps: [
      {
        id: 'm1_remote_step1',
        objectiveText: 'Inspect & stabilize the Remote Communication Relay with Commander Nova',
        hintText: 'Follow Commander Nova to the glowing Remote Relay cabinet and tune its signal steady green.',
        activeNodes: ['m1_remote_relay'],
        focusPos: [122, 1.5, 48],
        crewPos: [120.5, 0, 49.5],
        nodeTriggers: {
          m1_remote_relay: {
            equipmentPanel: 'm1_relay_stabilize',
          },
        },
      },
    ],
  },
  {
    id: 2,
    chapterId: 1,
    unlockedCrewIds: [],
    label: 'Mission 2',
    title: 'Drive Back to Ares Colony',
    badgeTitle: 'Mars Driver',
    badgeColor: '#f97316',
    scienceTerm: 'Rover Navigation',
    simpleLesson: 'Electric Mars vehicles follow safe mapped routes around rocks back to their colony bay.',
    funFact: 'Six wide wheels let Mars exploration rovers climb smoothly over loose red sand!',
    initialWorldPatch: {
      introPhase: 'drive_to_camp',
      relayPanelOpen: true,
      relayRepaired: true,
      o2AlarmActive: false,
      o2FanSpinning: true,
      waterLeakActive: false,
      powerBlackout: false,
      dustStormActive: false,
      stormStage: 1,
      weather: 'Clear',
      landerState: 'gone',
      novaPresent: true,
      novaSeatedInRover: true,
      alexSeatedInRover: true,
      drivingRover: true,
      vehicleDashLit: true,
      vehicleHeadlights: true,
      crewMood: 'calm',
      unlockedCrewIds: [],
    },
    steps: [
      {
        id: 'm2_drive_step1',
        objectiveText: 'Drive the Exploration Vehicle west along the golden route to Ares Colony',
        hintText: 'Use W/A/S/D (or arrow keys / on-screen wheel controls) to follow the golden route back to the colony bay!',
        step5Flow: {
          whatHappened: 'You and Commander Nova fixed the Remote Communication Relay!',
          whereToGo: 'Ares Colony Rover Bay',
          whatToDo: 'Steer the 6x6 vehicle along the glowing golden path back to camp.',
          actionLabel: 'Drive to Ares Colony',
          successMessage: 'Safely arrived at Ares Colony!',
        },
        activeNodes: ['m2_camp_checkin'],
        focusPos: [17.5, 1.2, -10.5],
        crewPos: [17.5, 0, -10.5],
        nodeTriggers: {
          m2_camp_checkin: {
            nextStep: true,
            patchWorld: {
              introPhase: 'camp_arrival',
              novaSeatedInRover: false,
              alexSeatedInRover: false,
              drivingRover: false,
            },
          },
        },
      },
    ],
  },
  {
    id: 3,
    chapterId: 1,
    unlockedCrewIds: ['leo'],
    label: 'Mission 3',
    title: 'Restore Colony Oxygen',
    badgeTitle: 'Fresh Air Hero',
    badgeColor: '#38bdf8',
    scienceTerm: 'Breathable Air',
    simpleLesson: 'Astronauts need clean oxygen to breathe—matching colored wires restarts the air fan!',
    funFact: 'On Mars, special machines pull carbon dioxide from the sky to create fresh oxygen inside!',
    initialWorldPatch: {
      introPhase: 'none',
      o2AlarmActive: true,
      o2FanSpinning: false,
      oxygenGeneratorRepaired: false,
      waterLeakActive: false,
      powerBlackout: false,
      dustStormActive: false,
      stormStage: 1,
      landerState: 'gone',
      novaPresent: false,
      crewMood: 'worried',
      crewFocusPos: [-8.5, 0, 4.8],
      unlockedCrewIds: ['leo'],
    },
    steps: [
      {
        id: 'm3_o2_step1',
        objectiveText: 'Enter Oxygen Centre & connect the colored wires on the circuit panel',
        hintText: 'Walk west into the Oxygen Centre and press Interact on the sparking circuit panel.',
        step5Flow: {
          whatHappened: 'The Oxygen Centre air fan stopped spinning!',
          whereToGo: 'Inside Oxygen Centre',
          whatToDo: 'Connect the 4 matching colored wires and spin up fresh air.',
          actionLabel: 'Repair Circuit',
          successMessage: 'Oxygen Fan Spinning Smoothly!',
        },
        activeNodes: ['m1_o2_panel'],
        focusPos: [-10.6, 1.4, 4.5],
        crewPos: [-8.2, 0, 5.2],
        dialogueOnStart: [
          {
            speaker: 'Leo',
            role: 'Colony Engineer',
            avatar: 'leo',
            text: 'Welcome back, Alex! Just in time—a loose circuit stopped our Oxygen Centre fan. Let us fix the wires inside right away!',
            focusTarget: [-11.5, 2.0, 4.5],
          },
        ],
        nodeTriggers: {
          m1_o2_panel: {
            equipmentPanel: 'm1_circuit_repair',
          },
        },
      },
    ],
  },
  {
    id: 4,
    chapterId: 1,
    unlockedCrewIds: ['leo'],
    label: 'Mission 4',
    title: 'The Water Emergency',
    badgeTitle: 'Water Saver',
    badgeColor: '#3b82f6',
    scienceTerm: 'Water Conservation',
    simpleLesson: 'Close the shutoff valve first, then clamp a cracked pipe so precious Mars water is saved.',
    funFact: 'Every single drop of water on Mars is precious—crews save and clean nearly every ounce!',
    initialWorldPatch: {
      introPhase: 'none',
      o2AlarmActive: false,
      o2FanSpinning: true,
      waterLeakActive: true,
      waterValveClosed: false,
      waterPuddleVisible: true,
      powerBlackout: false,
      dustStormActive: false,
      stormStage: 1,
      landerState: 'gone',
      novaPresent: false,
      crewMood: 'worried',
      crewFocusPos: [-6.8, 0, -6.4],
      unlockedCrewIds: ['leo'],
    },
    steps: [
      {
        id: 'm4_water_step1',
        objectiveText: 'Inspect the spraying water pipe inside Water Station',
        hintText: 'Walk northwest into the Water Station and inspect the leaking pipe.',
        activeNodes: ['m2_leaking_pipe'],
        crewPos: [-6.8, 0, -6.2],
        dialogueOnStart: [
          {
            speaker: 'Leo',
            role: 'Colony Engineer',
            avatar: 'leo',
            text: 'Hear that hiss?! A pipe inside Water Station sprang a leak! Check inside right away!',
            focusTarget: [-11.2, 1.4, -7.8],
          },
        ],
        nodeTriggers: {
          m2_leaking_pipe: {
            dialogue: [
              {
                speaker: 'Leo',
                role: 'Colony Engineer',
                avatar: 'leo',
                text: 'Grab the Pipe Repair Kit outside first, then shut off the Red Valve so we can clamp the pipe!',
                focusTarget: [-6.8, 1.0, -10.5],
              },
            ],
            nextStep: true,
          },
        },
      },
      {
        id: 'm4_water_step2',
        objectiveText: 'Pick up the Pipe Repair Kit crate outside',
        hintText: 'Step outside Water Station to the glowing blue Repair Kit crate.',
        activeNodes: ['m2_repair_kit'],
        crewPos: [-6.5, 0, -8.5],
        nodeTriggers: {
          m2_repair_kit: {
            carryingItem: 'Pipe Repair Kit',
            nextStep: true,
          },
        },
      },
      {
        id: 'm4_water_step3',
        objectiveText: 'Turn the Red Shutoff Valve inside Water Station',
        hintText: 'Step back inside and turn the red valve wheel.',
        activeNodes: ['m2_shutoff_valve'],
        crewPos: [-7.0, 0, -6.2],
        nodeTriggers: {
          m2_shutoff_valve: {
            equipmentPanel: 'm2_valve_turn',
          },
        },
      },
      {
        id: 'm4_water_step4',
        objectiveText: 'Clamp the cracked pipe tight',
        hintText: 'Walk to the leaking pipe inside and clamp it closed!',
        activeNodes: ['m2_leaking_pipe'],
        crewPos: [-7.0, 0, -7.2],
        nodeTriggers: {
          m2_leaking_pipe: {
            equipmentPanel: 'm2_pipe_repair',
          },
        },
      },
    ],
  },
  {
    id: 5,
    chapterId: 1,
    unlockedCrewIds: ['leo', 'maya'],
    label: 'Mission 5',
    title: 'Restore Colony Solar Power',
    badgeTitle: 'Solar Star',
    badgeColor: '#eab308',
    scienceTerm: 'Solar Power',
    simpleLesson: 'Solar panels turn sunlight into electricity—dust blocks sunbeams, so panels need wiping!',
    funFact: 'Afternoon Mars breezes sometimes dust off real Mars rover solar wings automatically!',
    initialWorldPatch: {
      introPhase: 'none',
      o2AlarmActive: false,
      o2FanSpinning: true,
      waterLeakActive: false,
      powerBlackout: true,
      solarDusty: true,
      cableSparking: true,
      dustStormActive: false,
      stormStage: 2,
      landerState: 'gone',
      novaPresent: false,
      crewMood: 'worried',
      crewFocusPos: [-12.0, 0, 11.5],
      unlockedCrewIds: ['leo', 'maya'],
    },
    steps: [
      {
        id: 'm5_pow_step1',
        objectiveText: 'Check the Power Terminal inside Power Station',
        hintText: 'Head southwest into the Power Station hut.',
        activeNodes: ['m3_power_monitor'],
        crewPos: [-11.5, 0, 10.8],
        dialogueOnStart: [
          {
            speaker: 'Maya',
            role: 'Scientist',
            avatar: 'maya',
            text: 'Lights flickered out! I just arrived at Science Ops—check the Power Station terminal with me!',
            focusTarget: [-15.5, 1.8, 11.5],
          },
        ],
        nodeTriggers: {
          m3_power_monitor: {
            dialogue: [
              {
                speaker: 'Maya',
                role: 'Scientist',
                avatar: 'maya',
                text: 'Dust covered the solar wings and a junction cable came loose! Brush the panels clean outside!',
                focusTarget: [-16.2, 1.8, 13.5],
              },
            ],
            nextStep: true,
          },
        },
      },
      {
        id: 'm5_pow_step2',
        objectiveText: 'Brush the red dust off the Solar Panels',
        hintText: 'Step outside beside the solar panels and brush them clean.',
        activeNodes: ['m3_solar_panel'],
        crewPos: [-12.8, 0, 14.2],
        nodeTriggers: {
          m3_solar_panel: {
            equipmentPanel: 'm3_solar_clean',
          },
        },
      },
      {
        id: 'm5_pow_step3',
        objectiveText: 'Plug the sparking power cable firmly back in',
        hintText: 'Inspect the junction box beside Power Station and click the plug back home.',
        activeNodes: ['m3_loose_cable'],
        crewPos: [-11.8, 0, 13.2],
        nodeTriggers: {
          m3_loose_cable: {
            equipmentPanel: 'm3_cable_plug',
          },
        },
      },
    ],
  },

  // =========================================================================
  // CHAPTER 2: LIFE AT THE COLONY (Missions 6–10)
  // =========================================================================
  {
    id: 6,
    chapterId: 2,
    unlockedCrewIds: ['leo', 'maya', 'zara'],
    label: 'Mission 6',
    title: 'Greenhouse Rescue',
    badgeTitle: 'Mars Gardener',
    badgeColor: '#10b981',
    scienceTerm: 'Indoor Gardening',
    simpleLesson: 'Space plants need steady water droplets and pink grow lights to make fresh food.',
    funFact: 'Pink-purple LED lights use the exact red and blue colors green leaves love most!',
    initialWorldPatch: {
      o2AlarmActive: false,
      o2FanSpinning: true,
      waterLeakActive: false,
      powerBlackout: false,
      plantsWilting: true,
      tomatoesRipe: false,
      gardenStage: 0,
      dustStormActive: false,
      stormStage: 1,
      landerState: 'gone',
      novaPresent: false,
      crewMood: 'worried',
      crewFocusPos: [6.8, 0, -1.5],
      unlockedCrewIds: ['leo', 'maya', 'zara'],
    },
    steps: [
      {
        id: 'm6_gh_step1',
        objectiveText: 'Inspect the wilting tomato beds inside the Greenhouse',
        hintText: 'Walk east into the Greenhouse airlock and inspect the dry plants.',
        activeNodes: ['m6_plants'],
        crewPos: [6.5, 0, -0.4],
        dialogueOnStart: [
          {
            speaker: 'Zara',
            role: 'Botanist',
            avatar: 'zara',
            text: 'Alex, help! The Greenhouse water tube clogged and our tomato plants look thirsty!',
            focusTarget: [11.0, 1.6, -1.5],
          },
        ],
        nodeTriggers: {
          m6_plants: { nextStep: true },
        },
      },
      {
        id: 'm6_gh_step2',
        objectiveText: 'Clear the blocked Greenhouse water tube',
        hintText: 'Use the Irrigation Box along the Greenhouse center aisle.',
        activeNodes: ['m6_water_tube'],
        crewPos: [6.8, 0, -0.6],
        nodeTriggers: {
          m6_water_tube: { equipmentPanel: 'm4_water_tube' },
        },
      },
      {
        id: 'm6_gh_step3',
        objectiveText: 'Tune the Pink & Blue Grow Lights',
        hintText: 'Walk to the Grow-Light panel inside the Greenhouse.',
        activeNodes: ['m6_grow_light'],
        crewPos: [7.0, 0, -1.2],
        nodeTriggers: {
          m6_grow_light: { equipmentPanel: 'm4_light_tuner' },
        },
      },
      {
        id: 'm6_gh_step4',
        objectiveText: 'Plant tomato seeds & grow ripe Mars tomatoes!',
        hintText: 'Tap the seedling beds in the Greenhouse to plant, water, and harvest!',
        activeNodes: ['m6_plant_seeds'],
        crewPos: [7.0, 0, -1.4],
        nodeTriggers: {
          m6_plant_seeds: { equipmentPanel: 'm4_seed_garden' },
        },
      },
    ],
  },
  {
    id: 7,
    chapterId: 2,
    unlockedCrewIds: ['leo', 'maya', 'zara'],
    label: 'Mission 7',
    title: 'Repair the Water Recycler',
    badgeTitle: 'Clean Water Ace',
    badgeColor: '#0ea5e9',
    scienceTerm: 'Water Recycling',
    simpleLesson: 'Water recyclers wash used water clean again so the colony can reuse it every day.',
    funFact: 'Space stations clean water so carefully it becomes even purer than tap water on Earth!',
    initialWorldPatch: {
      o2AlarmActive: false,
      o2FanSpinning: true,
      waterLeakActive: false,
      powerBlackout: false,
      plantsWilting: false,
      tomatoesRipe: true,
      gardenStage: 3,
      dustStormActive: false,
      stormStage: 1,
      landerState: 'gone',
      novaPresent: false,
      crewMood: 'worried',
      crewFocusPos: [-9.0, 0, -8.0],
      unlockedCrewIds: ['leo', 'maya', 'zara'],
    },
    steps: [
      {
        id: 'm7_rec_step1',
        objectiveText: 'Inspect the dusty Water Recycler drum inside Water Station',
        hintText: 'Walk inside Water Station to the blue recycler unit on the east wall.',
        activeNodes: ['m7_recycler_inspect'],
        crewPos: [-8.5, 0, -7.2],
        dialogueOnStart: [
          {
            speaker: 'Leo',
            role: 'Colony Engineer',
            avatar: 'leo',
            text: 'Fine red dust got into our Water Recycler drum! Let us swap its filter screen and flush it clean.',
            focusTarget: [-9.75, 1.5, -8.5],
          },
        ],
        nodeTriggers: {
          m7_recycler_inspect: { nextStep: true },
        },
      },
      {
        id: 'm7_rec_step2',
        objectiveText: 'Pick up a fresh Filter Cartridge outside Water Station',
        hintText: 'Grab the clean spare cartridge just outside the Water Station airlock.',
        activeNodes: ['m7_recycler_filter'],
        crewPos: [-7.2, 0, -6.6],
        nodeTriggers: {
          m7_recycler_filter: {
            carryingItem: 'Clean Recycler Filter',
            nextStep: true,
          },
        },
      },
      {
        id: 'm7_rec_step3',
        objectiveText: 'Install the filter & clean the Water Recycler',
        hintText: 'Use the Recycler Console inside Water Station to flush dust and restart clean flow.',
        activeNodes: ['m7_recycler_console'],
        crewPos: [-9.2, 0, -8.5],
        nodeTriggers: {
          m7_recycler_console: {
            equipmentPanel: 'm7_recycler_clean',
          },
        },
      },
    ],
  },
  {
    id: 8,
    chapterId: 2,
    unlockedCrewIds: ['leo', 'maya', 'zara'],
    label: 'Mission 8',
    title: 'Medical Station Checkup',
    badgeTitle: 'Crew Medic',
    badgeColor: '#ef4444',
    scienceTerm: 'Astronaut Health',
    simpleLesson: 'Astronauts check heartbeats and exercise muscles often because Mars has lighter gravity.',
    funFact: 'Because Mars gravity is lighter than Earth’s, bouncing feels easy, so crews exercise to stay strong!',
    initialWorldPatch: {
      o2AlarmActive: false,
      o2FanSpinning: true,
      waterLeakActive: false,
      powerBlackout: false,
      plantsWilting: false,
      tomatoesRipe: true,
      gardenStage: 3,
      dustStormActive: false,
      stormStage: 1,
      landerState: 'gone',
      novaPresent: false,
      crewMood: 'calm',
      crewFocusPos: [7.8, 0, 8.8],
      unlockedCrewIds: ['leo', 'maya', 'zara'],
    },
    steps: [
      {
        id: 'm8_med_step1',
        objectiveText: 'Restock the First-Aid Shelf inside Medical Room',
        hintText: 'Enter Medical Room (southeast dome) and check the supply cabinet.',
        activeNodes: ['m8_med_supply'],
        crewPos: [7.5, 0, 8.2],
        dialogueOnStart: [
          {
            speaker: 'Maya',
            role: 'Scientist',
            avatar: 'maya',
            text: 'Time for our monthly crew wellness check in the Medical Room! Help me restock the kits and run health scans.',
            focusTarget: [8.5, 1.8, 8.8],
          },
        ],
        nodeTriggers: {
          m8_med_supply: {
            carryingItem: 'Fresh Medical Kit',
            nextStep: true,
          },
        },
      },
      {
        id: 'm8_med_step2',
        objectiveText: 'Run the Crew Health Checkup on the Vitals Screen',
        hintText: 'Walk over to the glowing blue Vitals Console inside Medical Room.',
        activeNodes: ['m8_med_console'],
        crewPos: [7.6, 0, 9.0],
        nodeTriggers: {
          m8_med_console: {
            equipmentPanel: 'm8_medical_scan',
          },
        },
      },
    ],
  },
  {
    id: 9,
    chapterId: 2,
    unlockedCrewIds: ['leo', 'maya', 'zara'],
    label: 'Mission 9',
    title: 'Organize the Food Pantry',
    badgeTitle: 'Pantry Helper',
    badgeColor: '#22c55e',
    scienceTerm: 'Space Nutrition',
    simpleLesson: 'Balanced fresh crops and sealed space rations give explorers energy all day long.',
    funFact: 'Space snacks are sealed tight so crumbs do not float away and stay fresh for months!',
    initialWorldPatch: {
      o2AlarmActive: false,
      o2FanSpinning: true,
      waterLeakActive: false,
      powerBlackout: false,
      plantsWilting: false,
      tomatoesRipe: true,
      gardenStage: 3,
      dustStormActive: false,
      stormStage: 1,
      landerState: 'gone',
      novaPresent: false,
      crewMood: 'calm',
      crewFocusPos: [-1.1, 0, -3.1],
      unlockedCrewIds: ['leo', 'maya', 'zara'],
    },
    steps: [
      {
        id: 'm9_food_step1',
        objectiveText: 'Collect a basket of fresh tomatoes from the Greenhouse',
        hintText: 'Walk to the Greenhouse center beds to grab fresh crops.',
        activeNodes: ['m9_food_greenhouse'],
        crewPos: [7.5, 0, -1.5],
        dialogueOnStart: [
          {
            speaker: 'Zara',
            role: 'Botanist',
            avatar: 'zara',
            text: 'Our Greenhouse tomatoes are ready, and supply crates arrived in Crew Home! Help me pack and sort everything neatly!',
            focusTarget: [11.0, 1.5, -1.5],
          },
        ],
        nodeTriggers: {
          m9_food_greenhouse: {
            carryingItem: 'Fresh Mars Tomatoes',
            nextStep: true,
          },
        },
      },
      {
        id: 'm9_food_step2',
        objectiveText: 'Sort fresh crops & dry snacks into Crew Home Pantry',
        hintText: 'Step inside Crew Home (center dome) to the northern food pantry shelf.',
        activeNodes: ['m9_food_sorter'],
        crewPos: [-0.8, 0, -2.5],
        nodeTriggers: {
          m9_food_sorter: {
            equipmentPanel: 'm9_food_sort',
          },
        },
      },
    ],
  },
  {
    id: 10,
    chapterId: 2,
    unlockedCrewIds: ['leo', 'maya', 'zara'],
    label: 'Mission 10',
    title: 'Habitat Temperature Control',
    badgeTitle: 'Cozy Engineer',
    badgeColor: '#f59e0b',
    scienceTerm: 'Thermal Insulation',
    simpleLesson: 'Mars gets super cold at night, so dome heaters and insulated walls keep crews warm!',
    funFact: 'Even warm Mars afternoons drop below freezing fast as soon as the sun sets!',
    initialWorldPatch: {
      o2AlarmActive: false,
      o2FanSpinning: true,
      waterLeakActive: false,
      powerBlackout: false,
      plantsWilting: false,
      tomatoesRipe: true,
      gardenStage: 3,
      dustStormActive: false,
      stormStage: 1,
      solProgress: 0.78,
      weather: 'Clear',
      landerState: 'gone',
      novaPresent: false,
      crewMood: 'worried',
      crewFocusPos: [0.65, 0, -3.2],
      unlockedCrewIds: ['leo', 'maya', 'zara'],
    },
    steps: [
      {
        id: 'm10_temp_step1',
        objectiveText: 'Check the chilly Thermostat inside Crew Home',
        hintText: 'Enter Crew Home and inspect the thermostat gauge on the north wall.',
        activeNodes: ['m10_thermostat'],
        crewPos: [0.6, 0, -2.2],
        dialogueOnStart: [
          {
            speaker: 'Leo',
            role: 'Colony Engineer',
            avatar: 'leo',
            text: 'Brrr! Sunset cooled down Crew Home! Check the Thermostat inside so we can warm the sleeping pods up!',
            focusTarget: [0.65, 1.5, -3.2],
          },
        ],
        nodeTriggers: {
          m10_thermostat: {
            nextStep: true,
          },
        },
      },
      {
        id: 'm10_temp_step2',
        objectiveText: 'Boost heater power at Power Station',
        hintText: 'Walk southwest into Power Station to route warm power to the habitat.',
        activeNodes: ['m10_heater_coil'],
        crewPos: [-12.2, 0, 11.2],
        nodeTriggers: {
          m10_heater_coil: {
            nextStep: true,
          },
        },
      },
      {
        id: 'm10_temp_step3',
        objectiveText: 'Set Crew Home to a cozy 21°C!',
        hintText: 'Head back inside Crew Home and adjust the Habitat Heater dial.',
        activeNodes: ['m10_crew_check'],
        crewPos: [1.5, 0, 0.8],
        nodeTriggers: {
          m10_crew_check: {
            equipmentPanel: 'm10_thermal_balance',
          },
        },
      },
    ],
  },

  // =========================================================================
  // CHAPTER 3: EXPLORING BEYOND THE COLONY (Missions 11–15)
  // =========================================================================
  {
    id: 11,
    chapterId: 3,
    unlockedCrewIds: ['leo', 'maya', 'zara', 'ryan'],
    label: 'Mission 11',
    title: 'Lost Exploration Beacon',
    badgeTitle: 'Trail Blazer',
    badgeColor: '#f97316',
    scienceTerm: 'Navigation Beacons',
    simpleLesson: 'Bright radio beacons act like lighthouses so Mars rovers always find their way home.',
    funFact: 'Exploring far beyond base means crews mark hills and trails with tiny solar beacons!',
    initialWorldPatch: {
      o2AlarmActive: false,
      o2FanSpinning: true,
      waterLeakActive: false,
      powerBlackout: false,
      plantsWilting: false,
      tomatoesRipe: true,
      gardenStage: 3,
      dustStormActive: false,
      stormStage: 1,
      solProgress: 0.28,
      weather: 'Clear',
      landerState: 'gone',
      novaPresent: false,
      crewMood: 'calm',
      crewFocusPos: [7.0, 0, -10.5],
      unlockedCrewIds: ['leo', 'maya', 'zara', 'ryan'],
    },
    steps: [
      {
        id: 'm11_bcn_step1',
        objectiveText: 'Check the Comms Beacon Tracker inside Communication Tower',
        hintText: 'Ryan is ready! Enter Communication Tower to pin the silent north trail beacon.',
        activeNodes: ['m11_comms_clue'],
        crewPos: [6.8, 0, -10.4],
        dialogueOnStart: [
          {
            speaker: 'Ryan',
            role: 'Comms Officer',
            avatar: 'ryan',
            text: 'Hey Alex! A solar trail beacon out in the far north valley went quiet. Check my console inside Comms Tower for its GPS coordinates!',
            focusTarget: [10.0, 2.4, -11.5],
          },
        ],
        nodeTriggers: {
          m11_comms_clue: {
            nextStep: true,
          },
        },
      },
      {
        id: 'm11_bcn_step2',
        objectiveText: 'Drive to the North Valley Beacon & tune its light back on!',
        hintText: 'Hop in your Exploration Vehicle and follow the golden route north (~100m) to the beacon post!',
        activeNodes: ['m11_lost_beacon'],
        focusPos: [64, 1.5, -98],
        crewPos: [6.8, 0, -10.4],
        nodeTriggers: {
          m11_lost_beacon: {
            equipmentPanel: 'm11_beacon_tune',
          },
        },
      },
    ],
  },
  {
    id: 12,
    chapterId: 3,
    unlockedCrewIds: ['leo', 'maya', 'zara', 'ryan'],
    label: 'Mission 12',
    title: 'The Forgotten Rover: Sojourner',
    badgeTitle: 'Rover Finder',
    badgeColor: '#38bdf8',
    scienceTerm: 'Rover Telemetry',
    simpleLesson: 'Astronauts follow radio chirps and wheel tracks to rescue tiny robotic explorers.',
    funFact: 'NASA’s Sojourner in 1997 was the very first wheeled robot to explore rocks on Mars!',
    initialWorldPatch: {
      o2AlarmActive: false,
      o2FanSpinning: true,
      waterLeakActive: false,
      powerBlackout: false,
      dustStormActive: false,
      stormStage: 1,
      weather: 'Clear',
      landerState: 'gone',
      novaPresent: false,
      crewMood: 'calm',
      crewFocusPos: [7.4, 0, -10.5],
      unlockedCrewIds: ['leo', 'maya', 'zara', 'ryan'],
    },
    steps: [
      {
        id: 'm12_step1',
        objectiveText: 'Inspect the radio chirp inside Communication Tower',
        hintText: 'Enter the Communication Tower and check the Long-Range Signal Scanner.',
        activeNodes: ['m4_comms_signal'],
        crewPos: [6.8, 0, -10.4],
        dialogueOnStart: [
          {
            speaker: 'Ryan',
            role: 'Comms Officer',
            avatar: 'ryan',
            text: 'Awesome! With the north beacon shining, our dish picked up a tiny chirp northeast! Come decode it inside Comms Tower!',
            focusTarget: [10.0, 2.4, -11.5],
          },
        ],
        nodeTriggers: {
          m4_comms_signal: { nextStep: true },
        },
      },
      {
        id: 'm12_step2',
        objectiveText: 'Pick up the Signal Tracker Kit near the Rover Garage',
        hintText: 'Walk east past the Greenhouse to grab the Signal Tracker.',
        activeNodes: ['m4_garage_prep'],
        crewPos: [17.0, 0, -3.2],
        nodeTriggers: {
          m4_garage_prep: {
            carryingItem: 'Signal Tracker',
            patchWorld: { activeTool: 'signal_detector' },
            nextStep: true,
          },
        },
      },
      {
        id: 'm12_step3',
        objectiveText: 'Scan the Northeast Wheel Tracks & Signal Post',
        hintText: 'Drive northeast (~52m) along the golden trail to the relay clue post.',
        activeNodes: ['m4_track_clue'],
        crewPos: [16.5, 0, -3.0],
        nodeTriggers: {
          m4_track_clue: {
            patchWorld: { discoveredTrackClues: true },
            nextStep: true,
          },
        },
      },
      {
        id: 'm12_step4',
        objectiveText: 'Find Sojourner Rover & save its photo archive!',
        hintText: 'Continue northeast (~30m) until Sojourner appears, then inspect & brush its solar deck!',
        activeNodes: [],
        crewPos: [16.5, 0, -3.0],
        nodeTriggers: {},
      },
    ],
  },
  {
    id: 13,
    chapterId: 3,
    unlockedCrewIds: ['leo', 'maya', 'zara', 'ryan'],
    label: 'Mission 13',
    title: 'Rover Recovery: Spirit in the Dunes',
    badgeTitle: 'Dune Rescuer',
    badgeColor: '#fb923c',
    scienceTerm: 'Martian Sand Dunes',
    simpleLesson: 'Soft powdery Mars sand can slow rovers down, so wide bumpy wheels help grip the ground.',
    funFact: 'Spirit explored Mars for more than 6 years—20 times longer than its original 90-day goal!',
    initialWorldPatch: {
      o2AlarmActive: false,
      o2FanSpinning: true,
      waterLeakActive: false,
      powerBlackout: false,
      dustStormActive: false,
      stormStage: 1,
      weather: 'Clear',
      landerState: 'gone',
      novaPresent: false,
      crewMood: 'calm',
      crewFocusPos: [-12, 0, 12],
      unlockedCrewIds: ['leo', 'maya', 'zara', 'ryan'],
    },
    steps: [
      {
        id: 'm13_step1',
        objectiveText: 'Follow the southwest sand trail to the Spirit Track Marker',
        hintText: 'Drive southwest out into the dunes (~85m) to scan Spirit’s wheel imprint.',
        activeNodes: ['m13_dune_clue'],
        focusPos: [-74, 1.2, 48],
        crewPos: [-10, 0, 10],
        dialogueOnStart: [
          {
            speaker: 'Maya',
            role: 'Scientist',
            avatar: 'maya',
            text: 'We just caught a second rover ping in the Southwest Dunes! Drive out and check Spirit’s wheel sensors!',
            focusTarget: [-74, 1.2, 48],
          },
        ],
        nodeTriggers: {
          m13_dune_clue: { nextStep: true },
        },
      },
      {
        id: 'm13_step2',
        objectiveText: 'Reach Spirit Rover in the Southwest Dunes & run diagnostics',
        hintText: 'Drive just a little further southwest to Spirit and inspect its solar deck!',
        activeNodes: [],
        focusPos: [-92, 1.2, 62],
        crewPos: [-10, 0, 10],
        nodeTriggers: {},
      },
    ],
  },
  {
    id: 14,
    chapterId: 3,
    unlockedCrewIds: ['leo', 'maya', 'zara', 'ryan'],
    label: 'Mission 14',
    title: 'Mountain Research Station',
    badgeTitle: 'Mountain Climber',
    badgeColor: '#10b981',
    scienceTerm: 'Highland Science',
    simpleLesson: 'High hilltops let weather and rock instruments measure wide winds cleanly above dust.',
    funFact: 'Mars has the tallest volcano in the entire solar system—Olympus Mons, three times taller than Everest!',
    initialWorldPatch: {
      o2AlarmActive: false,
      o2FanSpinning: true,
      waterLeakActive: false,
      powerBlackout: false,
      dustStormActive: false,
      stormStage: 1,
      weather: 'Clear',
      landerState: 'gone',
      novaPresent: false,
      crewMood: 'calm',
      crewFocusPos: [-12, 0, -10],
      unlockedCrewIds: ['leo', 'maya', 'zara', 'ryan'],
    },
    steps: [
      {
        id: 'm14_step1',
        objectiveText: 'Climb the Northwest Ridge to the Mountain Research Station',
        hintText: 'Drive northwest up the gentle ridge ramp toward the glowing Mountain Pod!',
        activeNodes: ['m14_mountain_terminal'],
        focusPos: [-118, 6.2, -96],
        crewPos: [-12, 0, -10],
        dialogueOnStart: [
          {
            speaker: 'Maya',
            role: 'Scientist',
            avatar: 'maya',
            text: 'Our high Mountain Research Pod on the Northwest Ridge needs a sensor checkup! Drive up carefully along the gentle slope.',
            focusTarget: [-118, 6.2, -96],
          },
        ],
        nodeTriggers: {
          m14_mountain_terminal: { nextStep: true },
        },
      },
      {
        id: 'm14_step2',
        objectiveText: 'Calibrate the Hilltop Wind & Rock Sensors',
        hintText: 'Step beside the Mountain Sensor mast right next to the hilltop pod.',
        activeNodes: ['m14_mountain_sensor'],
        focusPos: [-116.5, 6.2, -94.8],
        crewPos: [-116, 5.4, -95],
        nodeTriggers: {
          m14_mountain_sensor: {
            equipmentPanel: 'm14_mountain_cal',
          },
        },
      },
    ],
  },
  {
    id: 15,
    chapterId: 3,
    unlockedCrewIds: ['leo', 'maya', 'zara', 'ryan'],
    label: 'Mission 15',
    title: 'Dust Storm Preparation',
    badgeTitle: 'Storm Defender',
    badgeColor: '#f59e0b',
    scienceTerm: 'Martian Dust Storm',
    simpleLesson: 'Dust storms dim sunlight, so crews switch to backup batteries and shut plant shields!',
    funFact: 'Mars air is super thin—dust storms do not blow houses down, but thick dust hides the sun!',
    initialWorldPatch: {
      o2AlarmActive: false,
      o2FanSpinning: true,
      waterLeakActive: false,
      powerBlackout: false,
      solarDusty: false,
      plantsWilting: false,
      tomatoesRipe: true,
      gardenStage: 3,
      stormShuttersClosed: false,
      shelterDoorsClosed: false,
      outdoorGearSecured: false,
      stormWarningActive: true,
      stormWarningCountdown: 42,
      shelterShieldLevel: 0,
      radiationDrillActive: false,
      dustStormActive: false,
      stormStage: 3,
      weather: 'Local Storm',
      landerState: 'gone',
      novaPresent: false,
      crewMood: 'worried',
      crewFocusPos: [0, 0, -8.2],
      unlockedCrewIds: ['leo', 'maya', 'zara', 'ryan'],
    },
    steps: [
      {
        id: 'm15_step1',
        objectiveText: 'Check the Weather Radar inside Command Centre',
        hintText: 'Walk inside Command Centre to check the approaching orange dust cloud.',
        activeNodes: ['m7_weather_console'],
        crewPos: [0, 0, -8.2],
        dialogueOnStart: [
          {
            speaker: 'Ryan',
            role: 'Comms Officer',
            avatar: 'ryan',
            text: 'Storm Watch! Dust levels are climbing fast across the canyon—check Command Centre radar right away!',
            focusTarget: [0, 2.2, -11.2],
          },
        ],
        nodeTriggers: {
          m7_weather_console: {
            patchWorld: {
              weather: 'Local Storm',
              stormStage: 3,
              stormWarningActive: true,
              stormWarningCountdown: 30,
              powerBlackout: true,
              solarDusty: true,
            },
            nextStep: true,
          },
        },
      },
      {
        id: 'm15_step2',
        objectiveText: 'Switch Power Station to Backup Storm Batteries',
        hintText: 'Sprint into Power Station and slide the backup battery lever to LOCKED.',
        activeNodes: ['m7_battery_switch'],
        crewPos: [-12.0, 0, 11.2],
        nodeTriggers: {
          m7_battery_switch: { equipmentPanel: 'm7_battery_lever' },
        },
      },
      {
        id: 'm15_step3',
        objectiveText: 'Close the Greenhouse Storm Shields',
        hintText: 'Walk inside the Greenhouse and slide all 3 storm shields closed.',
        activeNodes: ['m7_greenhouse_shutter'],
        crewPos: [6.8, 0, -1.5],
        nodeTriggers: {
          m7_greenhouse_shutter: { equipmentPanel: 'm7_shutter_slide' },
        },
      },
      {
        id: 'm15_step4',
        objectiveText: 'Seal the Radiation Shelter to ride out the storm safely',
        hintText: 'Step inside the south Radiation Shelter and check its console.',
        activeNodes: ['m8_rad_inspect'],
        crewPos: [-2.5, 0, 13.6],
        nodeTriggers: {
          m8_rad_inspect: {
            patchWorld: {
              stormStage: 4,
              dustStormActive: true,
              shelterDoorsClosed: true,
              outdoorGearSecured: true,
              stormWarningActive: false,
            },
            nextStep: true,
          },
        },
      },
    ],
  },

  // =========================================================================
  // CHAPTER 4: THE BIG MARS CHALLENGE (Missions 16–20)
  // =========================================================================
  {
    id: 16,
    chapterId: 4,
    unlockedCrewIds: ['leo', 'maya', 'zara', 'ryan'],
    label: 'Mission 16',
    title: 'Communication Network Failure',
    badgeTitle: 'Signal Ace',
    badgeColor: '#a855f7',
    scienceTerm: 'Space Radio Dish',
    simpleLesson: 'Space dishes must aim carefully at orbiting satellites to beam clear voices home.',
    funFact: 'Radio waves zoom at light speed, yet still take minutes crossing space from Mars to Earth!',
    initialWorldPatch: {
      o2AlarmActive: false,
      o2FanSpinning: true,
      waterLeakActive: false,
      powerBlackout: false,
      dustStormActive: false,
      stormStage: 2,
      weather: 'Windy',
      landerState: 'gone',
      novaPresent: false,
      crewMood: 'worried',
      crewFocusPos: [6.8, 0, -10.5],
      unlockedCrewIds: ['leo', 'maya', 'zara', 'ryan'],
    },
    steps: [
      {
        id: 'm16_step1',
        objectiveText: 'Check the static Radio Console inside Communication Tower',
        hintText: 'Walk into the Communication Tower to check why radio voices went fuzzy.',
        activeNodes: ['m5_comms_console'],
        crewPos: [6.8, 0, -10.5],
        dialogueOnStart: [
          {
            speaker: 'Ryan',
            role: 'Comms Officer',
            avatar: 'ryan',
            text: 'Storm gusts rattled our main space dish and shook a cable loose! Check inside Comms Tower!',
            focusTarget: [10.0, 2.6, -11.5],
          },
        ],
        nodeTriggers: {
          m5_comms_console: { nextStep: true },
        },
      },
      {
        id: 'm16_step2',
        objectiveText: 'Secure the outdoor Antenna Cable Box',
        hintText: 'Step around to the east side of the Communication Tower.',
        activeNodes: ['m5_antenna_cable'],
        crewPos: [12.0, 0, -9.0],
        nodeTriggers: {
          m5_antenna_cable: { nextStep: true },
        },
      },
      {
        id: 'm16_step3',
        objectiveText: 'Aim the Parabolic Dish at the relay satellite',
        hintText: 'Turn the aiming wheel outside Communication Tower until signal locks.',
        activeNodes: ['m5_dish_gear'],
        crewPos: [6.4, 0, -9.0],
        nodeTriggers: {
          m5_dish_gear: { equipmentPanel: 'm5_dish_align' },
        },
      },
      {
        id: 'm16_step4',
        objectiveText: 'Run a clear Radio Signal Check inside Comms Tower',
        hintText: 'Step inside Communication Tower to confirm 100% crisp signal!',
        activeNodes: ['m5_comms_console'],
        crewPos: [6.8, 0, -10.5],
        nodeTriggers: {
          m5_comms_console: { equipmentPanel: 'm5_radio_test' },
        },
      },
    ],
  },
  {
    id: 17,
    chapterId: 4,
    unlockedCrewIds: ['leo', 'maya', 'zara', 'ryan'],
    label: 'Mission 17',
    title: 'Power Satellite Uplink',
    badgeTitle: 'Sun Tracker',
    badgeColor: '#eab308',
    scienceTerm: 'Solar Sun-Tracking',
    simpleLesson: 'Orbiting satellites tell solar wings where bright sunshine is strongest after storms.',
    funFact: 'Tilting solar arrays toward the sun gives explorers extra battery power all afternoon!',
    initialWorldPatch: {
      o2AlarmActive: false,
      o2FanSpinning: true,
      waterLeakActive: false,
      powerBlackout: false,
      solarDusty: false,
      dustStormActive: false,
      stormStage: 1,
      weather: 'Clear',
      landerState: 'gone',
      novaPresent: false,
      crewMood: 'calm',
      crewFocusPos: [-15.5, 0, 11.5],
      unlockedCrewIds: ['leo', 'maya', 'zara', 'ryan'],
    },
    steps: [
      {
        id: 'm17_step1',
        objectiveText: 'Check Solar Wing tilt at Power Station',
        hintText: 'Visit Power Station to verify solar wing battery telemetry.',
        activeNodes: ['m17_solar_sync'],
        crewPos: [-13.5, 0, 11.2],
        dialogueOnStart: [
          {
            speaker: 'Leo',
            role: 'Colony Engineer',
            avatar: 'leo',
            text: 'Our western Satellite Uplink Dish near the Solar Farm needs an orbital sun-tracking sync!',
            focusTarget: [-29.5, 1.5, -14],
          },
        ],
        nodeTriggers: {
          m17_solar_sync: { nextStep: true },
        },
      },
      {
        id: 'm17_step2',
        objectiveText: 'Align the Power Satellite Uplink Dish west of the Solar Farm',
        hintText: 'Walk or drive northwest toward the Solar Farm uplink dish and lock the sun-tracking beam.',
        activeNodes: ['m17_satellite_pad'],
        focusPos: [-29.5, 1.5, -14],
        crewPos: [-26.5, 0, -13],
        nodeTriggers: {
          m17_satellite_pad: {
            equipmentPanel: 'm17_satellite_align',
          },
        },
      },
    ],
  },
  {
    id: 18,
    chapterId: 4,
    unlockedCrewIds: ['leo', 'maya', 'zara', 'ryan'],
    label: 'Mission 18',
    title: 'Remote Weather Station',
    badgeTitle: 'Weather Watcher',
    badgeColor: '#38bdf8',
    scienceTerm: 'Weather Forecasting',
    simpleLesson: 'Distant weather masts spot swirling winds hours early so the colony stays prepared!',
    funFact: 'Mars weather stations measure wind, temperature, and air pressure day and night!',
    initialWorldPatch: {
      o2AlarmActive: false,
      o2FanSpinning: true,
      waterLeakActive: false,
      powerBlackout: false,
      dustStormActive: false,
      stormStage: 1,
      weather: 'Windy',
      landerState: 'gone',
      novaPresent: false,
      crewMood: 'calm',
      crewFocusPos: [0, 0, -11.2],
      unlockedCrewIds: ['leo', 'maya', 'zara', 'ryan'],
    },
    steps: [
      {
        id: 'm18_step1',
        objectiveText: 'Drive far west to free & calibrate the Remote Weather Station',
        hintText: 'Take your Exploration Vehicle west (~124m) to the tall yellow Weather Mast!',
        activeNodes: ['m18_remote_weather'],
        focusPos: [-124, 2.0, 34],
        crewPos: [-121, 0, 34],
        dialogueOnStart: [
          {
            speaker: 'Maya',
            role: 'Scientist',
            avatar: 'maya',
            text: 'Our western Remote Weather Mast stopped spinning in a gust! Drive west to free its wind cups and calibrate the forecast.',
            focusTarget: [-124, 2.0, 34],
          },
        ],
        nodeTriggers: {
          m18_remote_weather: {
            equipmentPanel: 'm18_weather_cal',
          },
        },
      },
      {
        id: 'm18_step2',
        objectiveText: 'Deliver the clear Weather Report to Command Centre',
        hintText: 'Drive back east to Command Centre and log the fresh forecast!',
        activeNodes: ['m18_weather_report'],
        crewPos: [0, 0, -9.2],
        nodeTriggers: {
          m18_weather_report: {
            nextStep: true,
          },
        },
      },
    ],
  },
  {
    id: 19,
    chapterId: 4,
    unlockedCrewIds: ['leo', 'maya', 'zara', 'ryan'],
    label: 'Mission 19',
    title: 'Colony Emergency Shield Drill',
    badgeTitle: 'Colony Guardian',
    badgeColor: '#f43f5e',
    scienceTerm: 'Regolith Shielding',
    simpleLesson: 'Packed red Mars soil blocks harmful space rays and keeps radiation shelters cozy.',
    funFact: 'Engineers plan to pack Mars dirt over rooftops to make extra-strong safety bunkers!',
    initialWorldPatch: {
      o2AlarmActive: false,
      o2FanSpinning: true,
      waterLeakActive: false,
      powerBlackout: false,
      solarDusty: true,
      stormShuttersClosed: true,
      shelterDoorsClosed: false,
      shelterShieldLevel: 0,
      radiationDrillActive: true,
      dustStormActive: true,
      stormStage: 4,
      weather: 'Regional Storm',
      landerState: 'gone',
      novaPresent: false,
      crewMood: 'worried',
      crewFocusPos: [-2.5, 0, 10.2],
      unlockedCrewIds: ['leo', 'maya', 'zara', 'ryan'],
    },
    steps: [
      {
        id: 'm19_step1',
        objectiveText: 'Inspect weak spots inside the Radiation Shelter',
        hintText: 'Walk south from Crew Home inside the armored Radiation Shelter.',
        activeNodes: ['m8_rad_inspect'],
        crewPos: [-2.5, 0, 9.8],
        dialogueOnStart: [
          {
            speaker: 'Maya',
            role: 'Scientist',
            avatar: 'maya',
            text: 'Colony Safety Drill (GAME SIMULATION)! Let us reinforce our Radiation Shelter walls and test the Emergency Override!',
            focusTarget: [-2.5, 2.0, 13.5],
          },
        ],
        nodeTriggers: {
          m8_rad_inspect: { nextStep: true },
        },
      },
      {
        id: 'm19_step2',
        objectiveText: 'Collect Martian Soil Shielding Blocks outside',
        hintText: 'Grab the regolith soil crate west of the Radiation Shelter.',
        activeNodes: ['m8_rad_blocks'],
        crewPos: [-6.2, 0, 11.2],
        nodeTriggers: {
          m8_rad_blocks: {
            carryingItem: 'Regolith Shielding Blocks',
            nextStep: true,
          },
        },
      },
      {
        id: 'm19_step3',
        objectiveText: 'Pack Soil Shielding Layers onto the Shelter Walls & Roof',
        hintText: 'Step inside Radiation Shelter and drag the soil blocks onto the walls and roof.',
        activeNodes: ['m8_rad_shield'],
        crewPos: [-2.5, 0, 10.2],
        nodeTriggers: {
          m8_rad_shield: { equipmentPanel: 'm6_rad_shielding' },
        },
      },
      {
        id: 'm19_step4',
        objectiveText: 'Run the Radiation Storm Shield Drill',
        hintText: 'Use the Radiation Shelter Storm Console inside.',
        activeNodes: ['m8_rad_drill'],
        crewPos: [-2.5, 0, 10.2],
        nodeTriggers: {
          m8_rad_drill: { equipmentPanel: 'm6_rad_storm_drill' },
        },
      },
      {
        id: 'm19_step5',
        objectiveText: 'Verify the Backup Emergency Habitat Switch',
        hintText: 'Walk east of Radiation Shelter to the Backup Emergency Dome switch!',
        activeNodes: ['m19_emergency_override'],
        crewPos: [12.5, 0, 21.0],
        nodeTriggers: {
          m19_emergency_override: { equipmentPanel: 'm19_emergency_panel' },
        },
      },
    ],
  },
  {
    id: 20,
    chapterId: 4,
    unlockedCrewIds: ['leo', 'maya', 'zara', 'ryan'],
    label: 'Final Mission',
    title: 'A New Home on Mars',
    badgeTitle: 'Commander of Mars',
    badgeColor: '#fbbf24',
    scienceTerm: 'Post-Storm Recovery',
    simpleLesson: 'Teamwork, clean solar wings, and a glowing sky beacon welcome explorers safely home!',
    funFact: 'After big Mars dust storms clear, crews inspect solar arrays and resume full exploration!',
    initialWorldPatch: {
      o2AlarmActive: false,
      o2FanSpinning: true,
      waterLeakActive: false,
      powerBlackout: false,
      solarDusty: true,
      plantsWilting: false,
      tomatoesRipe: true,
      gardenStage: 3,
      stormShuttersClosed: true,
      shelterDoorsClosed: false,
      shelterShieldLevel: 3,
      radiationDrillActive: false,
      dustStormActive: false,
      stormStage: 5,
      weather: 'Light Dust',
      beaconBeamActive: false,
      landerState: 'gone',
      novaPresent: false,
      crewMood: 'calm',
      crewFocusPos: [-2.5, 0, 10.2],
      unlockedCrewIds: ['leo', 'maya', 'zara', 'ryan'],
    },
    steps: [
      {
        id: 'm20_step1',
        objectiveText: 'Confirm the whole crew is safe at Radiation Shelter',
        hintText: 'Walk into the Radiation Shelter to confirm everyone is healthy as skies clear.',
        activeNodes: ['m9_shelter_check'],
        crewPos: [-2.5, 0, 10.2],
        dialogueOnStart: [
          {
            speaker: 'Commander Nova',
            role: 'Radio Transmission',
            avatar: 'nova',
            text: 'Ares Colony, skies are clearing! Check crew safety, wipe settled storm dust off the solar wings, and ignite the Landing Beacon for our big celebration!',
            focusTarget: [-2.4, 1.8, 13.3],
          },
        ],
        nodeTriggers: {
          m9_shelter_check: { nextStep: true },
        },
      },
      {
        id: 'm20_step2',
        objectiveText: 'Wipe post-storm dust off the Solar Wings',
        hintText: 'Walk to the Power Station solar wings and brush them sparkling clean.',
        activeNodes: ['m9_solar_dust_check'],
        crewPos: [-12.8, 0, 14.2],
        nodeTriggers: {
          m9_solar_dust_check: { equipmentPanel: 'm3_solar_clean' },
        },
      },
      {
        id: 'm20_step3',
        objectiveText: 'Ignite the Command Centre Landing Beacon!',
        hintText: 'Sprint inside Command Centre and fire the golden sky beacon!',
        activeNodes: ['m9_landing_beacon'],
        crewPos: [0, 0, -8.2],
        nodeTriggers: {
          m9_landing_beacon: { equipmentPanel: 'm7_beacon_ignition' },
        },
      },
    ],
  },
];

export const ENDING_CELEBRATION_LINES: DialogueLine[] = [
  {
    speaker: 'Commander Nova',
    role: 'Mission Mentor',
    avatar: 'nova',
    text: 'Touchdown right on the Landing Pad! That golden beacon shone bright across the clearing Martian sky!',
    focusTarget: [15.5, 2.5, 13.5],
  },
  {
    speaker: 'Commander Nova',
    role: 'Mission Mentor',
    avatar: 'nova',
    text: 'Alex, Leo, Maya, Zara, and Ryan—you fixed remote relays, drove across red plains, saved oxygen and water, grew fresh tomatoes, found lost rovers, climbed mountains, and kept everyone cozy. Mars truly feels like home!',
  },
];
