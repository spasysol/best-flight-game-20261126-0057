// Skyline Ridge — tuning, palette and mission courses.
// One clear job: every number the game balances on lives here, nowhere else.

export const GAME_NAME = 'Skyline Ridge';
export const GAME_TAGLINE = 'Island Run';

// World geometry (metres). The terrain spans WORLD_SIZE on each side,
// centred on the origin. Sea level is y = 0.
export const WORLD = {
  size: 6000,
  segments: 128,
  seaLevel: 0,
  maxHeight: 260,
  seed: 20261126,
};

// Flight model (arcade, but honest: speed buys lift, banks buy turns).
export const FLIGHT = {
  maxSpeed: 78, // m/s at full throttle, level flight
  stallSpeed: 24, // m/s — below this the wing quits and the nose drops
  takeoffSpeed: 27, // m/s — rotate speed on the runway
  accel: 14, // m/s^2 gained at full throttle
  drag: 0.55, // 1/s — how fast speed decays with no throttle
  pitchRate: 0.85, // rad/s at full deflection
  rollRate: 1.5, // rad/s at full deflection
  maxPitch: 0.61, // rad — about 35 degrees
  maxRoll: 1.05, // rad — about 60 degrees
  turnRate: 0.55, // heading change per second at full bank and speed
  liftFactor: 0.92, // how much of the pitch turns into climb
  sinkRate: 9, // m/s fallen when stalled
  fuelCapacity: 100,
  fuelBurn: 1.15, // units/s at full throttle
  maxDamage: 100,
};

// Scoring.
export const SCORE = {
  ring: 100,
  landingSoft: 250, // vertical speed gentler than -2 m/s
  landingOk: 120, // vertical speed gentler than -3.5 m/s
  centreBonus: 80, // landed within 6 m of the centreline
  timeBonusPerSecond: 2, // per second under the course par time
};

// Golden-hour palette — terrain, sky and aircraft in one warm style.
export const PALETTE = {
  skyTop: 0x5f8fd0,
  skyBottom: 0xffd9a3,
  sun: 0xffb347,
  fog: 0xf2c48d,
  ocean: 0x1e6f8e,
  oceanDeep: 0x14506b,
  sand: 0xe8d29a,
  grass: 0x5da24a,
  grassDark: 0x3f7d38,
  rock: 0x8a7f74,
  peak: 0xcfc8bd,
  runway: 0x3a3f46,
  runwayLine: 0xf5f2e8,
  ring: 0xff7a1a,
  ringPassed: 0x37d67a,
  planeBody: 0xff8c2f,
  planeWing: 0xfff3d6,
  planeTrim: 0x2f3a44,
  glass: 0x1c2f45,
};

// Mission courses. Each course is a list of rings the pilot must fly
// through in order, then (when landToFinish is true) land on the runway.
// Ring positions are x (east), y (altitude), z (south) in metres.
export const COURSES = {
  rings: {
    id: 'rings',
    name: 'Ring Tour',
    objective: 'Fly through all 6 rings, then land on the runway',
    parSeconds: 150,
    landToFinish: true,
    startHeading: 0.35,
    rings: [
      { x: 320, y: 210, z: -420, r: 26 },
      { x: 760, y: 230, z: -820, r: 26 },
      { x: 1180, y: 200, z: -560, r: 26 },
      { x: 1080, y: 160, z: 60, r: 26 },
      { x: 620, y: 130, z: 420, r: 26 },
      { x: 180, y: 120, z: 240, r: 26 },
    ],
  },
  canyon: {
    id: 'canyon',
    name: 'Canyon Dash',
    objective: 'Thread 5 low gates through the canyon, then land',
    parSeconds: 120,
    landToFinish: true,
    startHeading: 0.35,
    rings: [
      { x: -560, y: 110, z: 620, r: 24 },
      { x: -980, y: 125, z: 240, r: 24 },
      { x: -1240, y: 140, z: -320, r: 24 },
      { x: -900, y: 120, z: -760, r: 24 },
      { x: -420, y: 115, z: -620, r: 24 },
    ],
  },
  return: {
    id: 'return',
    name: 'Runway Return',
    objective: 'Take off, clear 3 rings, come home and land',
    parSeconds: 135,
    landToFinish: true,
    startHeading: 0.35,
    rings: [
      { x: 420, y: 160, z: -380, r: 26 },
      { x: 900, y: 190, z: -700, r: 26 },
      { x: 700, y: 160, z: -120, r: 26 },
    ],
  },
};

export const COURSE_ORDER = ['rings', 'canyon', 'return'];
