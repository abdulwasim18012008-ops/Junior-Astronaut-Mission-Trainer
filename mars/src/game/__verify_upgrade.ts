import assert from 'node:assert';
import { CAMPAIGN_MISSIONS, INTERACTIVE_NODES } from './adventureStory';
import {
  getMevHatchWorldPos,
  REMOTE_MEV_START,
  REMOTE_SITE_POS,
  RESEARCH_CAMP_PARKING_POS,
} from './colonyExpansion';
import { resolveCharacterCollisions, resolveVehicleCollisions } from './colonyLayout';
import {
  BADGE_CATALOG,
  CAMPAIGN_CHAPTERS,
  LEARNING_RECAPS,
  OPTIONAL_TASKS,
  REWARD_POINTS,
} from './learningRecaps';
import {
  CHARGING_BAY_A_POS,
  CHARGING_BAY_B_POS,
  MARS_GRAVITY,
  MEV_BATTERY_CAPACITY_KWH,
  MEV_BATTERY_RESERVE_PCT,
  MEV_MASS_KG,
  SURFACE_TRACTION,
} from './marsConfig';
import {
  COLONY_MAP_LOCATIONS,
  computeNavigationRoute,
  EXPLORATION_MAP_LOCATIONS,
} from './navigation';

// 1. Mars gravity & vehicle constants
assert.strictEqual(MARS_GRAVITY, 3.71, 'Mars gravity must be 3.71 m/s²');
assert.strictEqual(MEV_MASS_KG, 2400, 'MEV mass must be 2400 kg');
assert.strictEqual(MEV_BATTERY_CAPACITY_KWH, 48.0, 'MEV battery capacity must be 48 kWh');
assert.strictEqual(MEV_BATTERY_RESERVE_PCT, 15, 'Emergency reserve must be 15%');
assert.ok(SURFACE_TRACTION.colony.grip > SURFACE_TRACTION.rock.grip, 'Colony grip > rock');
assert.ok(SURFACE_TRACTION.rock.grip > SURFACE_TRACTION.sand.grip, 'Rock grip > loose sand');
assert.ok(SURFACE_TRACTION.sand.grip > SURFACE_TRACTION.ice.grip, 'Sand grip > ice');

// 2. Charging Station Bays open, East back wall blocks vehicle
const bayA = resolveVehicleCollisions(CHARGING_BAY_A_POS[0], CHARGING_BAY_A_POS[1]);
assert.ok(
  Math.hypot(bayA.x - CHARGING_BAY_A_POS[0], bayA.z - CHARGING_BAY_A_POS[1]) < 0.05 && bayA.hitForce === 0,
  'Bay A center must remain free of colliders for MEV parking',
);
const bayB = resolveVehicleCollisions(CHARGING_BAY_B_POS[0], CHARGING_BAY_B_POS[1]);
assert.ok(
  Math.hypot(bayB.x - CHARGING_BAY_B_POS[0], bayB.z - CHARGING_BAY_B_POS[1]) < 0.05 && bayB.hitForce === 0,
  'Bay B center must remain free of colliders',
);
const eastWall = resolveVehicleCollisions(25.2, 3.4);
assert.ok(eastWall.hitForce > 0 && eastWall.x < 24.5, 'East back wall of Charging Station must deflect vehicle');

// 3. Expanded 20-mission campaign, chapters, learning recaps (no quizzes!), badges, and optional tasks
assert.strictEqual(CAMPAIGN_MISSIONS.length, 20, 'Expected 20 main missions across 4 chapters');
assert.strictEqual(CAMPAIGN_CHAPTERS.length, 4, 'Expected 4 campaign chapters');
assert.strictEqual(OPTIONAL_TASKS.length, 12, 'Expected 12 optional exploration & crew-help tasks');
assert.strictEqual(BADGE_CATALOG.length, 8, 'Expected 8 milestone badges');
assert.strictEqual(REWARD_POINTS.MAIN_MISSION, 100, 'Main mission points should be 100');
assert.strictEqual(REWARD_POINTS.OPTIONAL_TASK, 30, 'Optional task points should be 30');
assert.strictEqual(REWARD_POINTS.NEW_LOCATION, 25, 'New location points should be 25');
assert.strictEqual(REWARD_POINTS.HIDDEN_OBJECT, 20, 'Hidden object points should be 20');
assert.strictEqual(REWARD_POINTS.HELP_CREW, 40, 'Help crew points should be 40');

for (const m of CAMPAIGN_MISSIONS) {
  const recap = LEARNING_RECAPS[m.id];
  assert.ok(recap, `Learning recap must exist for Mission ${m.id}`);
  assert.ok(
    recap.problemDiscovered.length > 5 &&
      recap.whatYouDid.length > 5 &&
      recap.whatYouLearned.length > 5,
    `Learning recap for Mission ${m.id} must explain problem, action, and lesson`,
  );
  for (const st of m.steps) {
    for (const nid of st.activeNodes) {
      assert.ok(INTERACTIVE_NODES[nid], `Interactive node ${nid} in Mission ${m.id} must exist`);
    }
  }
}

// 4. Remote Comms Relay & Mission 2 MEV return route + Chapter 3/4 distant routes
assert.ok(
  Math.hypot(REMOTE_SITE_POS[0], REMOTE_SITE_POS[1]) > 100,
  'Mission 1 Remote Comms Relay must start far outside main colony',
);
const m2Route = computeNavigationRoute(
  REMOTE_MEV_START.x,
  REMOTE_MEV_START.z,
  RESEARCH_CAMP_PARKING_POS[0],
  RESEARCH_CAMP_PARKING_POS[1],
  'vehicle',
  {
    destinationId: 'research_camp',
    destinationName: 'Ares Colony',
    destinationCategory: 'colony',
  },
);
assert.ok(m2Route.waypoints.length >= 2 && m2Route.totalDistanceM > 80, 'Mission 2 drive back route valid');

// 5. EV Guided Travel Checks: hatch symmetry, collision-safe exit, & distant travel triggers (>= 34m)
const leftHatch = getMevHatchWorldPos(RESEARCH_CAMP_PARKING_POS[0], RESEARCH_CAMP_PARKING_POS[1], 0, 1.68, 0.18, 'left');
const rightHatch = getMevHatchWorldPos(RESEARCH_CAMP_PARKING_POS[0], RESEARCH_CAMP_PARKING_POS[1], 0, 1.68, 0.18, 'right');
assert.ok(
  Math.abs(Math.hypot(leftHatch[0] - RESEARCH_CAMP_PARKING_POS[0], leftHatch[1] - RESEARCH_CAMP_PARKING_POS[1]) - Math.hypot(1.68, 0.18)) < 0.05 &&
    Math.hypot(leftHatch[0] - rightHatch[0], leftHatch[1] - rightHatch[1]) > 3.2,
  'MEV left/right hatch positions must lie on opposite sides of the vehicle chassis',
);
const rawExit = getMevHatchWorldPos(CHARGING_BAY_A_POS[0], CHARGING_BAY_A_POS[1], 0, 2.38, 0.35, 'left');
const safeExit = resolveCharacterCollisions(rawExit[0], rawExit[1], 0.42);
assert.ok(
  Number.isFinite(safeExit.x) && Number.isFinite(safeExit.z),
  'EV disembark position must resolve cleanly without NaN',
);
for (const distantMissionId of [11, 12, 13, 14, 18]) {
  const mission = CAMPAIGN_MISSIONS.find((m) => m.id === distantMissionId);
  assert.ok(mission, `Mission ${distantMissionId} must exist`);
  const maxDist = mission.steps.reduce((best, st) => {
    for (const nid of st.activeNodes) {
      const node = INTERACTIVE_NODES[nid];
      if (node) {
        best = Math.max(best, Math.hypot(node.position[0], node.position[2] - 6));
      }
    }
    return best;
  }, 0);
  assert.ok(
    maxDist >= 34 || distantMissionId === 12 || distantMissionId === 13,
    `Mission ${distantMissionId} travel step (${maxDist.toFixed(1)}m) must qualify for >= 34m EV travel guidance`,
  );
  assert.ok(maxDist >= 50, `Mission ${distantMissionId} must include a distant >= 50m travel leg`);
}

// 6. Map locations counts & obstacle-aware routing
assert.strictEqual(COLONY_MAP_LOCATIONS.length, 18, 'Expected 18 colony locations');
assert.ok(EXPLORATION_MAP_LOCATIONS.length >= 13, 'Expected >= 13 exploration map locations');

for (const dest of EXPLORATION_MAP_LOCATIONS) {
  const footRoute = computeNavigationRoute(0, 6, dest.x, dest.z, 'foot', {
    destinationId: dest.id,
    destinationName: dest.name,
    destinationCategory: dest.category,
  });
  assert.ok(footRoute.waypoints.length >= 2 && footRoute.totalDistanceM > 5, `Foot route to ${dest.id} valid`);

  const mevRoute = computeNavigationRoute(
    CHARGING_BAY_A_POS[0] - 4,
    CHARGING_BAY_A_POS[1],
    dest.approachX,
    dest.approachZ,
    'vehicle',
    {
      destinationId: dest.id,
      destinationName: dest.name,
      destinationCategory: dest.category,
    },
  );
  assert.ok(mevRoute.waypoints.length >= 2 && mevRoute.totalDistanceM > 5, `Vehicle route to ${dest.id} valid`);
}

console.log('ALL_UPGRADE_CHECKS_PASSED', {
  missions: CAMPAIGN_MISSIONS.length,
  chapters: CAMPAIGN_CHAPTERS.length,
  optionalTasks: OPTIONAL_TASKS.length,
  badges: BADGE_CATALOG.length,
  colonyLocations: COLONY_MAP_LOCATIONS.length,
  explorationLocations: EXPLORATION_MAP_LOCATIONS.length,
});
