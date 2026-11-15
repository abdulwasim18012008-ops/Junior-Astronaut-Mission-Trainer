import { BASE_BUILDINGS, CHARACTERS_INFO, CREW_NPC_ORDER } from './adventureStory';
import { BUILDING_ZONES, detectInsideBuilding, resolveCharacterCollisions } from './colonyLayout';
import {
  BuildingId,
  CrewNpcId,
  DialogueLine,
  NpcActivityState,
  NpcRuntimeStatus,
  WorldVisualState,
} from './types';

export interface NpcScheduleStop {
  minSol: number;
  maxSol: number;
  x: number;
  z: number;
  faceX?: number;
  faceZ?: number;
  state: NpcActivityState;
  taskLabel: string;
  buildingId: string;
}

const BUILDING_OUTSIDE_ENTRY: Record<BuildingId, [number, number]> = {
  crew_home: [0, 5.4],
  oxygen_centre: [-8.0, 4.5],
  water_station: [-7.2, -7.5],
  power_station: [-12.5, 11.5],
  greenhouse: [6.8, -1.5],
  comms_tower: [6.8, -11.5],
  medical_room: [5.2, 8.8],
  radiation_shelter: [-2.5, 10.1],
  command_centre: [0, -8.2],
};

// Authentic autonomous daily Sol schedules for each of the 4 crew specialists
const NPC_DAILY_SCHEDULES: Record<CrewNpcId, NpcScheduleStop[]> = {
  leo: [
    {
      minSol: 0.22,
      maxSol: 0.36,
      x: -11.2,
      z: 4.5,
      faceX: -13.0,
      faceZ: 4.5,
      state: 'inspecting',
      taskLabel: 'Inspecting O₂ Scrubbers',
      buildingId: 'oxygen_centre',
    },
    {
      minSol: 0.36,
      maxSol: 0.50,
      x: -10.8,
      z: -7.5,
      faceX: -12.8,
      faceZ: -7.5,
      state: 'working',
      taskLabel: 'Checking Water Recycling Pumps',
      buildingId: 'water_station',
    },
    {
      minSol: 0.50,
      maxSol: 0.64,
      x: 19.2,
      z: -2.2,
      faceX: 22.0,
      faceZ: -3.0,
      state: 'working',
      taskLabel: 'Servicing Exploration Vehicle Bay',
      buildingId: 'rover_garage',
    },
    {
      minSol: 0.64,
      maxSol: 0.76,
      x: -14.8,
      z: 11.5,
      faceX: -16.6,
      faceZ: 11.5,
      state: 'inspecting',
      taskLabel: 'Balancing Solar Grid Inverters',
      buildingId: 'power_station',
    },
    {
      minSol: 0.76,
      maxSol: 0.84,
      x: -14.0,
      z: -19.2,
      faceX: -15.5,
      faceZ: -23.0,
      state: 'interacting',
      taskLabel: 'Logging Cargo Warehouse Crates',
      buildingId: 'cargo_pod',
    },
    {
      minSol: 0.84,
      maxSol: 1.0,
      x: -1.8,
      z: -1.6,
      faceX: 0,
      faceZ: 0,
      state: 'resting',
      taskLabel: 'Resting in Crew Habitat',
      buildingId: 'crew_home',
    },
  ],
  maya: [
    {
      minSol: 0.22,
      maxSol: 0.38,
      x: 15.2,
      z: -15.2,
      faceX: 18.5,
      faceZ: -16.5,
      state: 'working',
      taskLabel: 'Analyzing Core Samples in Lab',
      buildingId: 'research_lab',
    },
    {
      minSol: 0.38,
      maxSol: 0.54,
      x: 0.0,
      z: -11.3,
      faceX: 0.0,
      faceZ: -12.8,
      state: 'inspecting',
      taskLabel: 'Tracking Dust Weather Radar',
      buildingId: 'command_centre',
    },
    {
      minSol: 0.54,
      maxSol: 0.68,
      x: -18.5,
      z: -14.2,
      faceX: -22.0,
      faceZ: -15.5,
      state: 'inspecting',
      taskLabel: 'Studying Geology Strata Drill',
      buildingId: 'geology_station',
    },
    {
      minSol: 0.68,
      maxSol: 0.84,
      x: 7.8,
      z: 8.8,
      faceX: 9.6,
      faceZ: 8.8,
      state: 'interacting',
      taskLabel: 'Reviewing Medical Diagnostics',
      buildingId: 'medical_room',
    },
    {
      minSol: 0.84,
      maxSol: 1.0,
      x: 1.8,
      z: -1.6,
      faceX: 0,
      faceZ: 0,
      state: 'resting',
      taskLabel: 'Resting in Crew Habitat',
      buildingId: 'crew_home',
    },
  ],
  zara: [
    {
      minSol: 0.22,
      maxSol: 0.44,
      x: 10.6,
      z: -1.5,
      faceX: 11.4,
      faceZ: -2.8,
      state: 'working',
      taskLabel: 'Pruning Hydroponic Tomatoes',
      buildingId: 'greenhouse',
    },
    {
      minSol: 0.44,
      maxSol: 0.56,
      x: -9.8,
      z: -7.0,
      faceX: -12.5,
      faceZ: -7.5,
      state: 'inspecting',
      taskLabel: 'Checking Plant Nutrient Water',
      buildingId: 'water_station',
    },
    {
      minSol: 0.56,
      maxSol: 0.74,
      x: 12.2,
      z: -1.5,
      faceX: 12.2,
      faceZ: 0.2,
      state: 'working',
      taskLabel: 'Calibrating Pink Grow Lights',
      buildingId: 'greenhouse',
    },
    {
      minSol: 0.74,
      maxSol: 0.84,
      x: 3.6,
      z: 2.2,
      faceX: 5.5,
      faceZ: 2.5,
      state: 'interacting',
      taskLabel: 'Preparing Dinner in Cafeteria',
      buildingId: 'crew_home',
    },
    {
      minSol: 0.84,
      maxSol: 1.0,
      x: -1.8,
      z: 1.6,
      faceX: 0,
      faceZ: 0,
      state: 'resting',
      taskLabel: 'Resting in Crew Habitat',
      buildingId: 'crew_home',
    },
  ],
  ryan: [
    {
      minSol: 0.22,
      maxSol: 0.40,
      x: 9.6,
      z: -11.5,
      faceX: 11.4,
      faceZ: -11.5,
      state: 'working',
      taskLabel: 'Monitoring Deep-Space Radio',
      buildingId: 'comms_tower',
    },
    {
      minSol: 0.40,
      maxSol: 0.56,
      x: 0.6,
      z: -11.2,
      faceX: 0.0,
      faceZ: -12.8,
      state: 'interacting',
      taskLabel: 'Syncing Orbital Telemetry',
      buildingId: 'command_centre',
    },
    {
      minSol: 0.56,
      maxSol: 0.70,
      x: 21.0,
      z: -19.5,
      faceX: 24.5,
      faceZ: -22.0,
      state: 'inspecting',
      taskLabel: 'Aligning Deep-Range Relay Dish',
      buildingId: 'relay_station',
    },
    {
      minSol: 0.70,
      maxSol: 0.84,
      x: 7.4,
      z: -9.4,
      faceX: 10.0,
      faceZ: -11.5,
      state: 'working',
      taskLabel: 'Scanning Canyon Rover Signals',
      buildingId: 'comms_tower',
    },
    {
      minSol: 0.84,
      maxSol: 1.0,
      x: 1.8,
      z: 1.6,
      faceX: 0,
      faceZ: 0,
      state: 'resting',
      taskLabel: 'Resting in Crew Habitat',
      buildingId: 'crew_home',
    },
  ],
};

export interface NpcAgentMemory {
  id: CrewNpcId;
  state: NpcActivityState;
  taskLabel: string;
  buildingId: string;
  targetX: number;
  targetZ: number;
  faceX: number;
  faceZ: number;
  waypoints: Array<[number, number]>;
  stuckTimer: number;
  lastX: number;
  lastZ: number;
  walkCycle: number;
  stepHalfIdx: number;
}

export function createInitialNpcAgents(): Record<CrewNpcId, NpcAgentMemory> {
  const result = {} as Record<CrewNpcId, NpcAgentMemory>;
  CREW_NPC_ORDER.forEach((id) => {
    const info = CHARACTERS_INFO[id];
    const [hx, , hz] = info.homePos;
    result[id] = {
      id,
      state: 'idle',
      taskLabel: 'Starting Shift',
      buildingId: 'crew_home',
      targetX: hx,
      targetZ: hz,
      faceX: 0,
      faceZ: 0,
      waypoints: [],
      stuckTimer: 0,
      lastX: hx,
      lastZ: hz,
      walkCycle: Math.random() * Math.PI * 2,
      stepHalfIdx: 0,
    };
  });
  return result;
}

function pickScheduleStop(id: CrewNpcId, sol01: number): NpcScheduleStop {
  const list = NPC_DAILY_SCHEDULES[id];
  const p = ((sol01 % 1) + 1) % 1;
  if (p < 0.22) {
    return list[list.length - 1]; // Pre-dawn night rest
  }
  return list.find((s) => p >= s.minSol && p < s.maxSol) ?? list[0];
}

export function computeNpcGoal(id: CrewNpcId, state: WorldVisualState): NpcScheduleStop {
  // 1. Urgent Colony Emergencies override normal shift
  if (state.radiationDrillActive || state.stormStage >= 4 || state.dustStormActive || state.shelterDoorsClosed) {
    const shelterOffsets: Record<CrewNpcId, [number, number]> = {
      leo: [-3.2, 12.8],
      maya: [-1.8, 12.8],
      zara: [-3.2, 14.0],
      ryan: [-1.8, 14.0],
    };
    const [sx, sz] = shelterOffsets[id];
    return {
      minSol: 0,
      maxSol: 1,
      x: sx,
      z: sz,
      faceX: -2.5,
      faceZ: 14.5,
      state: 'emergency',
      taskLabel: state.radiationDrillActive
        ? 'Storm Drill Shelter'
        : 'Sheltering Indoors During Dust Storm',
      buildingId: 'radiation_shelter',
    };
  }

  // Stage 3 Approaching Storm / Early Warning: each crew member performs outdoor prep before sheltering
  if (state.stormStage === 3 || state.stormWarningActive) {
    if (id === 'leo') {
      return {
        minSol: 0,
        maxSol: 1,
        x: -13.6,
        z: 9.2,
        faceX: -15.5,
        faceZ: 11.5,
        state: 'emergency',
        taskLabel: 'Securing Power & O₂ Equipment (Storm Prep)',
        buildingId: 'power_station',
      };
    }
    if (id === 'maya') {
      return {
        minSol: 0,
        maxSol: 1,
        x: -19.2,
        z: -6.2,
        faceX: -20.5,
        faceZ: -8.5,
        state: 'emergency',
        taskLabel: 'Securing Research Lab Samples',
        buildingId: 'research_lab',
      };
    }
    if (id === 'zara') {
      return {
        minSol: 0,
        maxSol: 1,
        x: 9.4,
        z: -1.5,
        faceX: 11.0,
        faceZ: -1.5,
        state: 'emergency',
        taskLabel: 'Checking Greenhouse Storm Shutters',
        buildingId: 'greenhouse',
      };
    }
    return {
      minSol: 0,
      maxSol: 1,
      x: -23.2,
      z: 2.5,
      faceX: -25.5,
      faceZ: 2.5,
      state: 'emergency',
      taskLabel: 'Monitoring Weather Station Telemetry',
      buildingId: 'weather_station',
    };
  }

  if (state.o2AlarmActive && id === 'leo') {
    return {
      minSol: 0,
      maxSol: 1,
      x: -10.8,
      z: 4.5,
      faceX: -12.8,
      faceZ: 4.5,
      state: 'emergency',
      taskLabel: 'Inspecting Clogged O₂ Filter',
      buildingId: 'oxygen_centre',
    };
  }

  if (state.waterLeakActive && id === 'leo') {
    return {
      minSol: 0,
      maxSol: 1,
      x: -10.4,
      z: -7.5,
      faceX: -12.6,
      faceZ: -7.5,
      state: 'emergency',
      taskLabel: 'Isolating Water Pipe Leak',
      buildingId: 'water_station',
    };
  }

  if (state.powerBlackout && (id === 'leo' || id === 'maya')) {
    return {
      minSol: 0,
      maxSol: 1,
      x: id === 'leo' ? -14.8 : -14.2,
      z: id === 'leo' ? 11.4 : 12.2,
      faceX: -16.5,
      faceZ: 11.5,
      state: 'emergency',
      taskLabel: 'Stabilizing Power Inverters',
      buildingId: 'power_station',
    };
  }

  if (state.plantsWilting && id === 'zara') {
    return {
      minSol: 0,
      maxSol: 1,
      x: 10.6,
      z: -1.5,
      faceX: 11.5,
      faceZ: -2.8,
      state: 'emergency',
      taskLabel: 'Checking Wilting Greenhouse Crops',
      buildingId: 'greenhouse',
    };
  }

  // 2. Cargo Lander Delivery logistics check
  if (
    (state.cargoDelivery.phase === 'DESCENDING' ||
      state.cargoDelivery.phase === 'UNLOADING' ||
      state.cargoDelivery.phase === 'TRANSPORTING') &&
    id === 'leo'
  ) {
    return {
      minSol: 0,
      maxSol: 1,
      x: -17.5,
      z: -19.8,
      faceX: -28.0,
      faceZ: -23.0,
      state: 'inspecting',
      taskLabel: 'Coordinating Cargo Lander Unload',
      buildingId: 'cargo_pod',
    };
  }

  // 3. Standard Martian Sol daily routine
  return pickScheduleStop(id, state.solProgress);
}

export function buildPathWaypoints(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  destBuildingId: string,
): Array<[number, number]> {
  const pts: Array<[number, number]> = [];
  const startBld = detectInsideBuilding(fromX, fromZ);
  const destIsCoreBuilding = destBuildingId in BUILDING_ZONES;

  // Step cleanly out through current building's doorway first
  if (startBld && startBld !== destBuildingId) {
    const out = BUILDING_OUTSIDE_ENTRY[startBld];
    pts.push([out[0], out[1]]);
  }

  // Intermediate plaza waypoint for long cross-colony walks so NPCs stay on colony walkways
  const dist = Math.hypot(toX - fromX, toZ - fromZ);
  if (dist > 16 && (!startBld || startBld !== destBuildingId)) {
    const midX = (fromX + toX) * 0.5;
    const midZ = (fromZ + toZ) * 0.5;
    // Nudge midpoint slightly onto open plaza ring if inside a building footprint
    const insideMid = detectInsideBuilding(midX, midZ);
    if (insideMid) {
      const safePlaza = BUILDING_OUTSIDE_ENTRY[insideMid];
      pts.push([safePlaza[0], safePlaza[1]]);
    }
  }

  // Step outside destination doorway before entering destination room
  if (destIsCoreBuilding && startBld !== destBuildingId) {
    const destDoor = BUILDING_OUTSIDE_ENTRY[destBuildingId as BuildingId];
    pts.push([destDoor[0], destDoor[1]]);
  }

  pts.push([toX, toZ]);
  return pts;
}

export function stepNpcAgent(
  agent: NpcAgentMemory,
  curX: number,
  curZ: number,
  dt: number,
  state: WorldVisualState,
  playerX: number,
  playerZ: number,
): { nextX: number; nextZ: number; moving: boolean; speed: number; targetYaw: number | null } {
  // Talking override: face Alex cleanly when player talks to this NPC
  if (state.talkingNpcId === agent.id) {
    agent.state = 'talking';
    return {
      nextX: curX,
      nextZ: curZ,
      moving: false,
      speed: 0,
      targetYaw: Math.atan2(playerX - curX, playerZ - curZ),
    };
  }

  const goal = computeNpcGoal(agent.id, state);
  const goalChanged =
    Math.hypot(goal.x - agent.targetX, goal.z - agent.targetZ) > 0.6 ||
    agent.buildingId !== goal.buildingId;

  if (goalChanged) {
    agent.targetX = goal.x;
    agent.targetZ = goal.z;
    agent.faceX = goal.faceX ?? goal.x;
    agent.faceZ = goal.faceZ ?? goal.z;
    agent.buildingId = goal.buildingId;
    agent.taskLabel = goal.taskLabel;
    agent.waypoints = buildPathWaypoints(curX, curZ, goal.x, goal.z, goal.buildingId);
    agent.stuckTimer = 0;
  }

  // Check waypoint progression
  while (agent.waypoints.length > 0) {
    const [wx, wz] = agent.waypoints[0];
    if (Math.hypot(wx - curX, wz - curZ) < 0.65) {
      agent.waypoints.shift();
    } else {
      break;
    }
  }

  if (agent.waypoints.length === 0) {
    agent.state = goal.state;
    const faceDx = agent.faceX - curX;
    const faceDz = agent.faceZ - curZ;
    const targetYaw = Math.hypot(faceDx, faceDz) > 0.2 ? Math.atan2(faceDx, faceDz) : null;
    return { nextX: curX, nextZ: curZ, moving: false, speed: 0, targetYaw };
  }

  // Walk smoothly along current waypoint
  agent.state = goal.state === 'emergency' ? 'emergency' : 'walking';
  const [wx, wz] = agent.waypoints[0];
  const dx = wx - curX;
  const dz = wz - curZ;
  const dist = Math.hypot(dx, dz);
  const walkSpeed = goal.state === 'emergency' ? 3.95 : 2.65;

  const stepDist = Math.min(dist, walkSpeed * dt);
  let tryX = curX + (dx / Math.max(0.001, dist)) * stepDist;
  let tryZ = curZ + (dz / Math.max(0.001, dist)) * stepDist;

  // Gentle anti-corner slide if blocked > 0.45s
  const movedSinceLast = Math.hypot(curX - agent.lastX, curZ - agent.lastZ);
  if (movedSinceLast < walkSpeed * dt * 0.15) {
    agent.stuckTimer += dt;
    if (agent.stuckTimer > 0.45) {
      const perpX = -dz / Math.max(0.001, dist);
      const perpZ = dx / Math.max(0.001, dist);
      const side = agent.id === 'leo' || agent.id === 'zara' ? 1 : -1;
      tryX += perpX * side * walkSpeed * dt * 0.9;
      tryZ += perpZ * side * walkSpeed * dt * 0.9;
    }
    if (agent.stuckTimer > 3.2) {
      // Skip obstructed intermediate waypoint cleanly
      agent.waypoints.shift();
      agent.stuckTimer = 0;
    }
  } else {
    agent.stuckTimer = Math.max(0, agent.stuckTimer - dt * 2);
  }
  agent.lastX = curX;
  agent.lastZ = curZ;

  const safe = resolveCharacterCollisions(tryX, tryZ, 0.36);
  const yaw = Math.atan2(dx, dz);

  return {
    nextX: safe.x,
    nextZ: safe.z,
    moving: true,
    speed: walkSpeed,
    targetYaw: yaw,
  };
}

export function getCrewInteractionDialogue(
  npcId: CrewNpcId | 'nova',
  status: NpcRuntimeStatus | undefined,
  state: WorldVisualState,
  resources: { air: number; water: number; power: number; food: number; spareParts: number },
): DialogueLine[] {
  if (npcId === 'nova') {
    return [
      {
        speaker: 'Commander Nova',
        role: 'Mission Mentor',
        avatar: 'nova',
        text: 'Great work on every repair, Alex! Follow your mission tracker across Ares Colony and check out optional discoveries whenever you spot glowing cyan markers!',
      },
    ];
  }

  const profile = CHARACTERS_INFO[npcId];
  const currentTask = status?.taskLabel ?? 'monitoring colony stations';

  if (state.cargoDelivery.phase === 'DESCENDING' || state.cargoDelivery.phase === 'TRANSPORTING') {
    return [
      {
        speaker: profile.name,
        role: profile.role,
        avatar: npcId,
        text: `Look toward the northwest Cargo Pad, Alex! Our ${state.cargoDelivery.bundleName} is arriving right on schedule and the cargo rover is moving crates to the Warehouse!`,
      },
    ];
  }

  if (npcId === 'leo') {
    const lowParts = resources.spareParts <= 2;
    return [
      {
        speaker: 'Leo',
        role: 'Colony Engineer',
        avatar: 'leo',
        text: lowParts
          ? `Right now I am ${currentTask.toLowerCase()}, and our Spare Parts crate is getting low (${resources.spareParts} left)! You can request a Hardware Supply Drop from the Supply Terminal!`
          : `Hey Alex! I am ${currentTask.toLowerCase()}. Pressurized pipes and Exploration Vehicle suspension look solid—let me know if any alarm trips!`,
      },
    ];
  }

  if (npcId === 'maya') {
    return [
      {
        speaker: 'Maya',
        role: 'Scientist',
        avatar: 'maya',
        text:
          state.stormStage >= 3
            ? `Dust Stage ${state.stormStage} is rolling across Ares Basin! Keep an eye on solar efficiency and check the Weather Radar inside Command Centre.`
            : `Hi Alex! I am ${currentTask.toLowerCase()}. Remember Mars gravity is 3.71 m/s², and our Research Lab can analyze any core samples you bring back!`,
      },
    ];
  }

  if (npcId === 'zara') {
    return [
      {
        speaker: 'Zara',
        role: 'Botanist',
        avatar: 'zara',
        text:
          resources.food < 45
            ? `Food reserves are down to ${Math.round(resources.food)}%! I am ${currentTask.toLowerCase()}, and we should either harvest fresh Greenhouse tomatoes or order a Nutrition Pack!`
            : `Hey Alex! I am ${currentTask.toLowerCase()}. Healthy green plants help scrub CO₂ and give our crew fresh Martian snacks!`,
      },
    ];
  }

  return [
    {
      speaker: 'Ryan',
      role: 'Comms Officer',
      avatar: 'ryan',
      text: `Radio check, Alex! I am ${currentTask.toLowerCase()}. Commander Nova sends delayed canyon updates over our relay dish, and I can also uplink Cargo Resupply orders anytime!`,
    },
  ];
}

export function getStructureDisplayName(id: string): string {
  if (id in BASE_BUILDINGS) {
    return BASE_BUILDINGS[id as BuildingId].name;
  }
  const names: Record<string, string> = {
    research_lab: 'Research Lab',
    geology_station: 'Geological Station',
    rover_garage: 'Vehicle Hangar & Garage',
    cargo_pod: 'Cargo & Supply Warehouse',
    relay_station: 'Comms Relay Station',
    observatory: 'Observatory',
    weather_station: 'Weather Station',
    ice_station: 'Ice Extraction Station',
    emergency_shelter: 'Backup Habitat',
    suit_maintenance: 'Suit Maintenance',
    drone_station: 'Drone Control',
    solar_expansion: 'Solar Farm',
  };
  return names[id] ?? id;
}
