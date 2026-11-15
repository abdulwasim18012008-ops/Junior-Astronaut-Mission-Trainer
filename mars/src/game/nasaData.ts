// NASA Space Science Data Integration (DONKI, RadLab, OSDR, Mars Trek)
// Always reports exact Data Source, Timestamp/Date, Data Type, and Live vs. Archived vs. Sample Data status.

export type NasaDataStatus =
  | 'Live Public API'
  | 'Archived Measurement'
  | 'Sample Data Mode';

export interface NasaScienceDataset {
  id: 'donki' | 'radlab' | 'osdr' | 'mars_trek';
  name: string;
  source: string;
  dataType: string;
  timestamp: string;
  status: NasaDataStatus;
  headline: string;
  kidSummary: string;
  metrics: Array<{ label: string; value: string }>;
  safetyNote: string;
}

const SAMPLE_DATASETS: NasaScienceDataset[] = [
  {
    id: 'donki',
    name: 'DONKI Space Weather',
    source: 'NASA CCMC DONKI (Space Weather Database)',
    dataType: 'Solar Flare & Coronal Mass Ejection Log',
    timestamp: 'Sample Snapshot · 2025-02-14T18:20Z',
    status: 'Sample Data Mode',
    headline: 'C4.2 Moderate Solar Flare Recorded',
    kidSummary:
      'The Sun occasionally sends out bursts of light and fast particles called solar flares. Space weather watchers track them so astronauts know when to step inside a radiation shelter!',
    metrics: [
      { label: 'Flare Class', value: 'C4.2 (Mild)' },
      { label: 'Active Region', value: 'AR 13992' },
      { label: 'Mars Impact Watch', value: 'Monitor Only' },
    ],
    safetyNote:
      'Sample reference snapshot shown while offline/rate-limited. Not a live mission forecast.',
  },
  {
    id: 'radlab',
    name: 'RadLab Radiation Log',
    source: 'NASA MSL Curiosity RAD / RadLab Archive',
    dataType: 'Archived Surface & Transit Radiation Measurement',
    timestamp: 'Archived Record · Sol 3610 (2022-10-02)',
    status: 'Archived Measurement',
    headline: '~0.67 mSv/day Mars Surface Background',
    kidSummary:
      'Unlike Earth, Mars does not have a thick magnetic bubble or thick air blanket. Sensors on the Curiosity rover measured how much space radiation reaches the surface so engineers can design thick regolith shelters!',
    metrics: [
      { label: 'Archived Surface Rate', value: '0.67 mSv / day' },
      { label: 'Primary Source', value: 'Galactic Cosmic Rays' },
      { label: 'Earth Surface Avg', value: '~0.008 mSv / day' },
    ],
    safetyNote:
      'Archived Mars rover measurement for science education—never a live Mars weather or safety prediction.',
  },
  {
    id: 'osdr',
    name: 'OSDR Space Biology',
    source: 'NASA Open Science Data Repository (OSDR)',
    dataType: 'Archived Space Crop & Biology Study',
    timestamp: 'Study OSD-422 · Archived Dataset',
    status: 'Archived Measurement',
    headline: 'Space Tomato & Leafy Greens Light Study',
    kidSummary:
      'Scientists in NASA’s Open Science Data Repository study how red and blue LEDs help plants grow in low gravity and closed habitats—just like our Ares Outpost Greenhouse!',
    metrics: [
      { label: 'Experiment Focus', value: 'Red + Blue LED Growth' },
      { label: 'Habitat System', value: 'Hydroponic / Controlled' },
      { label: 'Crew Benefit', value: 'Fresh Food & O₂ Cycle' },
    ],
    safetyNote:
      'Educational summary from archived NASA OSDR plant-growth research.',
  },
  {
    id: 'mars_trek',
    name: 'Mars Trek Terrain',
    source: 'NASA Solar System Treks · MOLA Elevation',
    dataType: 'Mars Surface Topography & Crater Map',
    timestamp: 'MGS MOLA Global Map · Reference Archive',
    status: 'Archived Measurement',
    headline: 'Gale & Jezero Basin Canyon Region',
    kidSummary:
      'NASA’s Mars Trek uses laser altitude maps from orbiters to help mission planners find flat, safe landing pads and craters rich in rocks and ancient riverbeds!',
    metrics: [
      { label: 'Typical Landing Elevation', value: '-2.5 km to -4.5 km' },
      { label: 'Outpost Gravity', value: '3.72 m/s² (0.38 Earth g)' },
      { label: 'Soil Shielding Density', value: '~1.5 g/cm³ Regolith' },
    ],
    safetyNote:
      'Reference planetary terrain properties derived from NASA MOLA orbiter mapping.',
  },
];

async function fetchWithTimeout(url: string, ms = 3200): Promise<Response> {
  const ctrl = new AbortController();
  const id = window.setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

export async function loadNasaScienceDatasets(): Promise<NasaScienceDataset[]> {
  const results = SAMPLE_DATASETS.map((d) => ({ ...d }));

  // 1. Attempt live public NASA CCMC DONKI Solar Flare endpoint (no API key required)
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 14 * 24 * 3600 * 1000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const url = `https://kauai.ccmc.gsfc.nasa.gov/DONKI/WS/get/FLR?startDate=${fmt(start)}&endDate=${fmt(end)}`;
    const res = await fetchWithTimeout(url, 3200);
    if (res.ok) {
      const json = (await res.json()) as Array<{
        classType?: string;
        beginTime?: string;
        activeRegionNum?: number;
        sourceLocation?: string;
      }>;
      if (Array.isArray(json) && json.length > 0) {
        const latest = json[json.length - 1];
        results[0] = {
          ...results[0],
          status: 'Live Public API',
          timestamp: latest.beginTime ? `Observed ${latest.beginTime}` : `Checked ${fmt(end)}`,
          headline: `${latest.classType ?? 'Solar'} Flare Observed by DONKI`,
          metrics: [
            { label: 'Latest Class', value: latest.classType ?? 'Tracked' },
            {
              label: 'Active Region',
              value: latest.activeRegionNum ? `AR ${latest.activeRegionNum}` : 'Solar Disk',
            },
            { label: '14-Day Events', value: `${json.length} logged` },
          ],
          safetyNote:
            'Live public NASA CCMC DONKI solar observation feed. Mars storm drills in-game remain GAME SIMULATIONS.',
        };
      }
    }
  } catch {
    // Clean fallback to Sample Data Mode
  }

  // 2. Attempt public NASA OSDR search API for space plant studies
  try {
    const res = await fetchWithTimeout(
      'https://osdr.nasa.gov/osdr/data/search?term=tomato&size=1&from=0',
      3200,
    );
    if (res.ok) {
      const json = (await res.json()) as {
        hits?: {
          total?: number;
          hits?: Array<{ _source?: { Accession?: string; 'Study Title'?: string } }>;
        };
      };
      const firstHit = json?.hits?.hits?.[0]?._source;
      if (firstHit) {
        results[2] = {
          ...results[2],
          status: 'Live Public API',
          timestamp: `OSDR Catalog Query · ${new Date().toISOString().slice(0, 10)}`,
          headline: firstHit['Study Title']
            ? firstHit['Study Title'].slice(0, 62)
            : results[2].headline,
          metrics: [
            { label: 'Study ID', value: firstHit.Accession ?? 'OSD Catalog' },
            { label: 'Matching Studies', value: `${json?.hits?.total ?? 1} archived` },
            { label: 'Crew Benefit', value: 'Food & Air Cycle' },
          ],
          safetyNote:
            'Study metadata queried from NASA OSDR public catalog (historical spaceflight experiments).',
        };
      }
    }
  } catch {
    // Clean fallback to Sample/Archived record
  }

  return results;
}
