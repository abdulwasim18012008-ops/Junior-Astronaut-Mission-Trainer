export type WorldId = 'mars' | 'moon';

export interface WorldProgressSummary {
  hasSave: boolean;
  label: string;
}

const MARS_STORAGE_KEY = 'junior_astronaut_adventure_save_v5';
const MOON_STORAGE_KEY = 'junior_astronaut_moon_campaign_v1';

export function readWorldProgress(): Record<WorldId, WorldProgressSummary> {
  const result: Record<WorldId, WorldProgressSummary> = {
    mars: { hasSave: false, label: 'New Expedition' },
    moon: { hasSave: false, label: 'New Campaign' },
  };

  try {
    const rawMars = localStorage.getItem(MARS_STORAGE_KEY);
    if (rawMars) {
      const parsed = JSON.parse(rawMars) as {
        completedMissions?: number[];
        currentMissionId?: number;
        highestMission?: number;
      };
      const done = parsed.completedMissions?.length ?? 0;
      const mission = Math.max(1, parsed.currentMissionId ?? parsed.highestMission ?? 1);
      if (done > 0 || mission > 1) {
        result.mars = {
          hasSave: true,
          label: `Saved · Mission ${mission} (${done} complete)`,
        };
      }
    }
  } catch {
    // Ignore storage parse errors
  }

  try {
    const rawMoon = localStorage.getItem(MOON_STORAGE_KEY);
    if (rawMoon) {
      const parsed = JSON.parse(rawMoon) as {
        completedMissions?: string[];
        currentMissionIndex?: number;
        points?: number;
      };
      const done = parsed.completedMissions?.length ?? 0;
      const idx = (parsed.currentMissionIndex ?? 0) + 1;
      if (done > 0 || idx > 1 || (parsed.points ?? 0) > 0) {
        result.moon = {
          hasSave: true,
          label: `Saved · Mission ${idx} (${done} complete)`,
        };
      }
    }
  } catch {
    // Ignore storage parse errors
  }

  return result;
}
