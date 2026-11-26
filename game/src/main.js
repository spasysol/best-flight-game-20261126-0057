// Skyline Ridge — bootstrap, game loop, cameras and state machine.
// One clear job: wire the world, the plane, the input, the HUD and the
// missions together, and run the frame.

import * as THREE from 'three';
import { GAME_NAME, WORLD, FLIGHT, COURSES, COURSE_ORDER } from './config.js';
import { buildWorld, RUNWAY } from './world.js';
import { createPlane, createFlightState, stepFlight, posePlane } from './plane.js';
import { createInput } from './input.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { createMission } from './missions.js';
import { applyShot, headingDegrees } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || WORLD.seed);

let courseIndex = 0;
let course = COURSES[COURSE_ORDER[courseIndex]];

// --- Renderer, scene, camera -------------------------------------------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  62, window.innerWidth / window.innerHeight, 0.1, 20000,
);
camera.position.set(0, 60, 120);

// --- World, plane, systems ----------------------------------------------
const world = buildWorld(scene, course, seed);
const plane = createPlane();
scene.add(plane.group);
const flight = createFlightState(course);
let mission = createMission(course);
const input = createInput(canvas);
const hud = createHud();
const audio = createAudio();

const game = {
  flight,
  mission,
  world,
  cameraMode: 'chase',
  snapCamera,
};

let state = 'menu'; // menu | flying | landed | crashed | shot
let cameraMode = 'chase';
let elapsed = 0;
let menuAngle = 0;

// --- Camera ---------------------------------------------------------------
const camPos = new THREE.Vector3();
const camTarget = new THREE.Vector3();

function forwardVector() {
  return new THREE.Vector3(
    Math.sin(flight.heading) * Math.cos(flight.pitch),
    Math.sin(flight.pitch),
    -Math.cos(flight.heading) * Math.cos(flight.pitch),
  );
}

// Horizontal forward: the chase camera offsets from this, never from the
// pitched nose vector — otherwise a steep pull-up on the runway would
// push the camera underground.
function horizontalForward() {
  return new THREE.Vector3(Math.sin(flight.heading), 0, -Math.cos(flight.heading));
}

function updateCamera(dt) {
  const fwd = forwardVector();
  if (cameraMode === 'cockpit') {
    // Pilot's seat: just behind the nose, eyes on the horizon. The solid
    // prop blades and the blur disc hide here — a static blade would fill
    // the windscreen, and the disc sits a metre from the lens.
    plane.blades.visible = false;
    plane.disc.visible = false;
    const head = flight.pos.clone()
      .addScaledVector(fwd, 1.4)
      .add(new THREE.Vector3(0, 1.15, 0));
    camera.position.copy(head);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = -flight.heading;
    camera.rotation.x = flight.pitch;
    camera.rotation.z = -flight.roll * 0.35;
    return;
  }
  plane.blades.visible = true;
  plane.disc.visible = true;
  // Chase: behind and above the tail, easing after the plane.
  const hfwd = horizontalForward();
  const desired = flight.pos.clone()
    .addScaledVector(hfwd, -20)
    .add(new THREE.Vector3(0, 6.5, 0));
  const k = 1 - Math.exp(-3.2 * Math.max(dt, 0.001));
  camPos.lerp(desired, k);
  camera.position.copy(camPos);
  camTarget.copy(flight.pos).addScaledVector(hfwd, 18).add(new THREE.Vector3(0, 1.2, 0));
  camera.lookAt(camTarget);
}

function snapCamera() {
  cameraMode = game.cameraMode;
  const fwd = forwardVector();
  if (cameraMode === 'cockpit') {
    plane.blades.visible = false;
    plane.disc.visible = false;
    const head = flight.pos.clone()
      .addScaledVector(fwd, 1.4)
      .add(new THREE.Vector3(0, 1.15, 0));
    camera.position.copy(head);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = -flight.heading;
    camera.rotation.x = flight.pitch;
    camera.rotation.z = -flight.roll * 0.35;
    return;
  }
  plane.blades.visible = true;
  plane.disc.visible = true;
  const hfwd = horizontalForward();
  camPos.copy(flight.pos).addScaledVector(hfwd, -20).add(new THREE.Vector3(0, 6.5, 0));
  camera.position.copy(camPos);
  camTarget.copy(flight.pos).addScaledVector(hfwd, 18).add(new THREE.Vector3(0, 1.2, 0));
  camera.lookAt(camTarget);
}

// --- State changes ----------------------------------------------------------
function startFlight() {
  mission = createMission(course);
  game.mission = mission;
  Object.assign(flight, createFlightState(course));
  world.resetRings();
  cameraMode = 'chase';
  game.cameraMode = 'chase';
  hud.hideMenu();
  hud.hideEnd();
  hud.setCockpitMode(false);
  hud.setBanner(`${course.name} — ${course.objective}`, 4200);
  audio.unlock();
  state = 'flying';
  snapCamera();
}

function endFlight(kind, detail) {
  state = kind;
  audio.thud();
  if (kind === 'landed') {
    const centre = centrelineOffset();
    const bonus = mission.scoreLanding(flight.verticalSpeed, centre);
    audio.fanfare();
    hud.showEnd('TOUCHDOWN — WELCOME HOME', [
      `Course: ${course.name}`,
      `Rings cleared: ${mission.ringsPassed}/${course.rings.length}`,
      `Landing bonus: +${bonus}`,
      `Time: ${Math.round(mission.elapsed)}s (par ${course.parSeconds}s)`,
      `Fuel left: ${Math.round(flight.fuel)}%`,
      `FINAL SCORE: ${mission.score}`,
      'Press R to fly again',
    ]);
  } else {
    hud.showEnd('CRASHED — THE RIDGE WINS THIS TIME', [
      `Course: ${course.name}`,
      `Rings cleared: ${mission.ringsPassed}/${course.rings.length}`,
      `Score: ${mission.score}`,
      detail || 'Keep the speed up and the wings level.',
      'Press R to fly again',
    ]);
  }
}

function centrelineOffset() {
  // Cross-track distance from the strip's centreline, in metres.
  const dx = flight.pos.x - RUNWAY.cx;
  const dz = flight.pos.z - RUNWAY.cz;
  const h = RUNWAY.heading;
  return Math.abs(dx * Math.cos(h) + dz * Math.sin(h));
}

function switchCourse(dir) {
  courseIndex = (courseIndex + dir + COURSE_ORDER.length) % COURSE_ORDER.length;
  course = COURSES[COURSE_ORDER[courseIndex]];
  hud.showMenu(course.name, course.objective);
}

// --- HUD sync -----------------------------------------------------------------
function syncHud() {
  hud.setFlight({
    speed: flight.speed,
    alt: Math.max(0, flight.pos.y),
    verticalSpeed: flight.verticalSpeed,
    headingDeg: headingDegrees(flight.heading),
    throttle: flight.throttle,
    fuel: flight.fuel,
    pitch: flight.pitch,
    roll: flight.roll,
    stalled: flight.stalled,
    groundWarn: flight.airborne && flight.pos.y < 60 && flight.verticalSpeed < -4,
    score: mission.score,
    ringsPassed: mission.ringsPassed,
    ringsTotal: course.rings.length,
    objective: course.objective,
  });
}

// --- Main loop ------------------------------------------------------------------
const clock = new THREE.Clock();

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;

  if (state === 'menu') {
    // Slow orbit around the parked plane while the pilot decides.
    menuAngle += dt * 0.12;
    const c = new THREE.Vector3(RUNWAY.cx, RUNWAY.elevation + 1.3, RUNWAY.cz);
    camera.position.set(
      c.x + Math.sin(menuAngle) * 26,
      c.y + 9,
      c.z + Math.cos(menuAngle) * 26,
    );
    camera.lookAt(c.x, c.y + 1, c.z);
    posePlane(plane, flight);
    world.update(dt, elapsed);
    renderer.render(scene, camera);
    return;
  }

  if (state === 'shot') {
    // Frozen frame for a screenshot: pose, HUD, render, nothing moves.
    posePlane(plane, flight);
    syncHud();
    world.update(0, 0);
    renderer.render(scene, camera);
    return;
  }

  if (state === 'flying') {
    const stick = input.read();
    const event = stepFlight(flight, stick, dt, course);
    mission.tick(dt);
    if (mission.checkRing(flight.pos)) {
      world.setRingPassed(mission.ringsPassed - 1);
      audio.chime();
      hud.setBanner(`RING ${mission.ringsPassed}/${course.rings.length} — +100`, 1600);
      if (mission.ringsDone && course.landToFinish) {
        hud.setBanner('ALL RINGS CLEAR — BRING HER HOME', 3000);
      }
    }
    if (event === 'landed') endFlight('landed');
    else if (event === 'crashed') {
      endFlight('crashed', flight.speed > 40
        ? 'Too fast into the ground — bleed speed before touchdown.'
        : 'Mind the terrain — the ridge is higher than it looks.');
    }
    audio.setFlight(flight.throttle, flight.speed / FLIGHT.maxSpeed);
  }

  // Camera, HUD and world keep running through the end screens too.
  if (input.pressed('v')) {
    input.consume('v');
    if (state === 'flying') {
      cameraMode = cameraMode === 'chase' ? 'cockpit' : 'chase';
      game.cameraMode = cameraMode;
      hud.setCockpitMode(cameraMode === 'cockpit');
      snapCamera();
    }
  }
  updateCamera(state === 'flying' ? dt : 0.016);
  posePlane(plane, flight);
  syncHud();
  world.update(dt, elapsed);
  renderer.render(scene, camera);
}

// --- Global keys ---------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && state === 'menu') startFlight();
  if ((e.key === 'r' || e.key === 'R') && (state === 'landed' || state === 'crashed')) {
    startFlight();
  }
  if (state === 'menu' && (e.key === '1' || e.key === '2' || e.key === '3')) {
    courseIndex = Number(e.key) - 1;
    course = COURSES[COURSE_ORDER[courseIndex]];
    hud.showMenu(course.name, course.objective);
  }
  if (state === 'menu' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    switchCourse(e.key === 'ArrowRight' ? 1 : -1);
  }
  if (e.key === 'm' || e.key === 'M') audio.unlock();
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Boot -----------------------------------------------------------------------
document.title = `${GAME_NAME} — Island Run`;
hud.showMenu(course.name, course.objective);

if (shotName) {
  // Deterministic screenshot mode: no menu, no physics, one frozen frame.
  hud.hideMenu();
  hud.hideEnd();
  audio.unlock = () => {};
  state = 'shot';
  applyShot(game, shotName);
  hud.setCockpitMode(game.cameraMode === 'cockpit');
  syncHud();
}

frame();
