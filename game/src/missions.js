// The five mail runs of Samudra Sky Post. Each one names its sky, its wind,
// its ring course and the strip it ends on. Rings are [x, z, altitude]
// waypoints over the water between the islands; the course is the job, the
// landing is the signature at the bottom of it.

/**
 * A mail run.
 * @typedef {Object} Mission
 * @property {string} id
 * @property {string} name
 * @property {string} blurb
 * @property {'dawn'|'day'|'dusk'|'storm'} timeOfDay
 * @property {{speed:number, fromDeg:number}} wind  speed in m/s, fromDeg the compass bearing it blows from
 * @property {number} turbulence  0 (calm) to ~0.6 (rough)
 * @property {Array<{rings: Array<[number, number, number]>, land: number}>} legs  land is an index into the world's runways
 * @property {number} parSeconds  the time a tidy run takes, for the time bonus
 */

export const MISSIONS = [
  {
    id: 'first-light',
    name: 'Run 1 — First Light',
    blurb: 'A calm dawn over the strait. Five rings out to Karang, then set her down on the strip.',
    timeOfDay: 'dawn',
    wind: { speed: 2, fromDeg: 315 },
    turbulence: 0,
    legs: [
      {
        rings: [
          [500, 200, 160],
          [950, -300, 180],
          [1350, -800, 200],
          [1700, -1150, 170],
          [1780, -1440, 180],
        ],
        land: 1,
      },
    ],
    parSeconds: 240,
  },
  {
    id: 'crosswind-run',
    name: 'Run 2 — Crosswind Run',
    blurb: 'A stiff westerly across the bay. Eight rings around Palem and back home to Samudra Field.',
    timeOfDay: 'day',
    wind: { speed: 8, fromDeg: 270 },
    turbulence: 0.12,
    legs: [
      {
        rings: [
          [700, 400, 170],
          [1200, 900, 200],
          [1000, 1700, 170],
          [300, 1900, 190],
          [-600, 1500, 210],
          [-1200, 800, 180],
          [-700, 200, 170],
          [100, -200, 160],
        ],
        land: 0,
      },
    ],
    parSeconds: 300,
  },
  {
    id: 'twin-isles',
    name: 'Run 3 — Twin Isles',
    blurb: 'Two drops, two landings: out to Karang with the morning post, then back with the replies.',
    timeOfDay: 'day',
    wind: { speed: 4, fromDeg: 200 },
    turbulence: 0.08,
    legs: [
      {
        rings: [
          [600, -300, 170],
          [1200, -800, 190],
          [1700, -1150, 170],
        ],
        land: 1,
      },
      {
        rings: [
          [1400, -900, 170],
          [800, -400, 180],
          [300, -100, 160],
        ],
        land: 0,
      },
    ],
    parSeconds: 420,
  },
  {
    id: 'dusk-delivery',
    name: 'Run 4 — Dusk Delivery',
    blurb: 'The sun is going down and the lamps are coming on. Ten rings around the outer isles, land at Karang by lamplight.',
    timeOfDay: 'dusk',
    wind: { speed: 5, fromDeg: 140 },
    turbulence: 0.15,
    legs: [
      {
        rings: [
          [500, 300, 180],
          [1300, 700, 210],
          [2100, 600, 200],
          [2400, 100, 190],
          [2100, -600, 210],
          [1900, -1100, 170],
          [1200, -1400, 180],
          [600, -1200, 170],
          [900, -700, 190],
          [1500, -1300, 160],
        ],
        land: 1,
      },
    ],
    parSeconds: 360,
  },
  {
    id: 'storm-post',
    name: 'Run 5 — Storm Post',
    blurb: 'The storm has arrived and the mail still flies. Twelve rings in rough air, then home through the murk.',
    timeOfDay: 'storm',
    wind: { speed: 12, fromDeg: 250 },
    turbulence: 0.5,
    legs: [
      {
        rings: [
          [600, 500, 200],
          [1400, 900, 230],
          [2000, 400, 220],
          [2300, -300, 210],
          [1800, -900, 200],
          [1200, -1500, 190],
          [500, -1600, 200],
          [-300, -1300, 220],
          [-1100, -900, 210],
          [-1500, -200, 230],
          [-900, 400, 200],
          [-200, 300, 170],
        ],
        land: 0,
      },
    ],
    parSeconds: 420,
  },
];

/** Total rings in a mission, across its legs. */
export function totalRings(mission) {
  return mission.legs.reduce((n, leg) => n + leg.rings.length, 0);
}

/** The best possible score: every ring, every landing, the full time bonus. */
export function maxScore(mission) {
  return totalRings(mission) * 100 + mission.legs.length * 250 + mission.parSeconds * 2;
}

/** A rank title from a score's fraction of the best possible. */
export function rankTitle(score, mission) {
  const f = score / maxScore(mission);
  if (f >= 1) return 'SKY POSTMASTER';
  if (f >= 0.8) return 'SENIOR COURIER';
  if (f >= 0.6) return 'ISLAND PILOT';
  return 'ROOKIE POSTIE';
}

/** A wind vector (m/s, world axes) from a mission's wind. */
export function windVector(mission) {
  const toDeg = ((mission.wind.fromDeg + 180) % 360) * (Math.PI / 180);
  return { x: Math.sin(toDeg) * mission.wind.speed, y: 0, z: -Math.cos(toDeg) * mission.wind.speed };
}

/** "12 kt NW" style text for the HUD. */
export function windText(mission) {
  const kt = Math.round(mission.wind.speed * 1.94384);
  if (kt === 0) return 'CALM';
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round(mission.wind.fromDeg / 22.5) % 16;
  return `${kt} kt ${dirs[idx]}`;
}
