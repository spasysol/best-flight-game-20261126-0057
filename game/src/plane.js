// Skyline Ridge — the aircraft: a high-wing bush plane built from
// primitives, and the arcade flight model that flies it.
// One clear job: what the plane looks like, and how it moves through air.

import * as THREE from 'three';
import { FLIGHT, PALETTE } from './config.js';
import { terrainHeight, RUNWAY } from './world.js';

// Build the plane mesh. Original design: "Kakatua", a sunset-orange
// high-wing bush plane with cream wings and a spinning prop.
export function createPlane() {
  const group = new THREE.Group();
  group.name = 'kakatua';
  const body = new THREE.MeshLambertMaterial({ color: PALETTE.planeBody });
  const cream = new THREE.MeshLambertMaterial({ color: PALETTE.planeWing });
  const trim = new THREE.MeshLambertMaterial({ color: PALETTE.planeTrim });
  const glass = new THREE.MeshPhongMaterial({
    color: PALETTE.glass, shininess: 120, specular: 0xaaccff,
  });

  // Fuselage: a tapered tube, nose at -Z.
  const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.42, 4.6, 12), body);
  fuselage.rotation.x = Math.PI / 2;
  fuselage.position.set(0, 0, 0.2);
  group.add(fuselage);

  // Nose cone and spinner.
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.1, 12), trim);
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 0, -2.6);
  group.add(nose);
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 10), cream);
  spinner.rotation.x = -Math.PI / 2;
  spinner.position.set(0, 0, -3.3);
  group.add(spinner);

  // Propeller: two blades on a hub at the nose, plus a faint disc that
  // reads as the spinning blur. The blades hide in cockpit view, where a
  // static blade would fill the windscreen; the disc stays, faint.
  const prop = new THREE.Group();
  prop.position.set(0, 0, -3.35);
  const blades = new THREE.Group();
  const bladeGeo = new THREE.BoxGeometry(0.22, 2.6, 0.08);
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const blade1 = new THREE.Mesh(bladeGeo, bladeMat);
  const blade2 = new THREE.Mesh(bladeGeo, bladeMat);
  blade2.rotation.z = Math.PI / 2;
  blades.add(blade1, blade2);
  prop.add(blades);
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.32, 28),
    new THREE.MeshBasicMaterial({
      color: 0x111111, transparent: true, opacity: 0.1,
      side: THREE.DoubleSide, depthWrite: false,
    }),
  );
  prop.add(disc);
  group.add(prop);

  // Cockpit glass.
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    glass,
  );
  canopy.scale.set(1, 0.75, 1.6);
  canopy.position.set(0, 0.42, -0.7);
  group.add(canopy);

  // High wing with struts.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.16, 1.5), cream);
  wing.position.set(0, 0.78, -0.3);
  group.add(wing);
  const strutGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.1, 6);
  for (const side of [-1, 1]) {
    const strut = new THREE.Mesh(strutGeo, trim);
    strut.position.set(side * 1.5, 0.28, -0.3);
    strut.rotation.z = side * 0.5;
    group.add(strut);
  }

  // Tail: horizontal stabiliser and vertical fin.
  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 1.0), cream);
  tailWing.position.set(0, 0.22, 2.3);
  group.add(tailWing);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 1.1), body);
  fin.position.set(0, 0.75, 2.35);
  group.add(fin);

  // Landing gear: two main wheels and a tail wheel.
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.22, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 6), trim);
    leg.position.set(side * 0.85, -0.85, -0.6);
    leg.rotation.z = side * 0.25;
    group.add(leg);
    const wheel = new THREE.Mesh(wheelGeo, trim);
    wheel.position.set(side * 1.0, -1.25, -0.6);
    group.add(wheel);
  }

  // Wingtip lights: red left, green right, always lit.
  const lightGeo = new THREE.SphereGeometry(0.09, 8, 8);
  const leftLight = new THREE.Mesh(
    lightGeo, new THREE.MeshBasicMaterial({ color: 0xff2222 }),
  );
  leftLight.position.set(-3.85, 0.78, -0.3);
  group.add(leftLight);
  const rightLight = new THREE.Mesh(
    lightGeo, new THREE.MeshBasicMaterial({ color: 0x22ff66 }),
  );
  rightLight.position.set(3.85, 0.78, -0.3);
  group.add(rightLight);

  group.traverse((o) => { o.castShadow = false; });
  return { group, prop, blades, disc };
}

// The flight state: one plain object the loop owns and the HUD reads.
export function createFlightState(course) {
  const dir = new THREE.Vector3(
    Math.sin(course.startHeading), 0, -Math.cos(course.startHeading),
  );
  const start = new THREE.Vector3(RUNWAY.cx, RUNWAY.elevation + 1.3, RUNWAY.cz)
    .addScaledVector(dir, -RUNWAY.length / 2 + 40);
  return {
    pos: start.clone(),
    heading: course.startHeading,
    pitch: 0,
    roll: 0,
    speed: 0,
    throttle: 0,
    fuel: FLIGHT.fuelCapacity,
    damage: 0,
    verticalSpeed: 0,
    airborne: false,
    crashed: false,
    landed: false,
    stalled: false,
    propAngle: 0,
  };
}

// One physics step. Input: { pitch: -1..1, roll: -1..1, throttle: -1..1 delta }.
// Returns an event string when something decisive happens, else null.
export function stepFlight(state, input, dt, course) {
  if (state.crashed || state.landed) return null;

  // Throttle: W/S nudge it, clamped 0..1.
  state.throttle = Math.min(1, Math.max(0, state.throttle + input.throttle * dt * 0.9));
  const engineOn = state.fuel > 0;

  // Speed chases the throttle's target; with no throttle, drag bleeds it off.
  const target = engineOn ? state.throttle * FLIGHT.maxSpeed : 0;
  const rate = engineOn ? 0.35 : FLIGHT.drag;
  state.speed = Math.max(0, state.speed + (target - state.speed) * Math.min(1, rate * dt));

  // Attitude follows the stick, springing gently back toward level.
  // On the ground the nose stays near level — no 35° tail-dragger pose
  // while still rolling down the strip.
  state.pitch += input.pitch * FLIGHT.pitchRate * dt;
  const pitchMax = state.airborne ? FLIGHT.maxPitch : 0.15;
  state.pitch = Math.max(-FLIGHT.maxPitch, Math.min(pitchMax, state.pitch));
  state.roll += input.roll * FLIGHT.rollRate * dt;
  state.roll = Math.max(-FLIGHT.maxRoll, Math.min(FLIGHT.maxRoll, state.roll));
  if (Math.abs(input.roll) < 0.05) state.roll *= Math.max(0, 1 - dt * 0.9);
  if (Math.abs(input.pitch) < 0.05) state.pitch *= Math.max(0, 1 - dt * 0.6);

  // A banked wing turns the nose: coordinated-turn approximation.
  state.heading -= Math.tan(state.roll) * (state.speed / FLIGHT.maxSpeed)
    * FLIGHT.turnRate * dt * 1.4;

  // Lift: enough speed and the pitch becomes climb; too slow and it sinks.
  state.stalled = state.airborne && state.speed < FLIGHT.stallSpeed;
  if (state.airborne) {
    if (state.stalled) {
      state.verticalSpeed = -FLIGHT.sinkRate;
      state.pitch = Math.max(-0.25, state.pitch - dt * 0.5);
    } else {
      state.verticalSpeed = Math.sin(state.pitch) * state.speed * FLIGHT.liftFactor;
    }
  } else {
    state.verticalSpeed = 0;
  }

  // Move horizontally along the nose, then climb or sink on the wing.
  const horizontal = new THREE.Vector3(
    Math.sin(state.heading), 0, -Math.cos(state.heading),
  );
  const groundSpeed = state.speed * Math.cos(state.pitch);
  state.pos.addScaledVector(horizontal, groundSpeed * dt);
  if (state.airborne) state.pos.y += state.verticalSpeed * dt;

  // Take off: fast enough on the runway and the wing takes the weight.
  if (!state.airborne && state.speed >= FLIGHT.takeoffSpeed && state.pitch > 0.06) {
    state.airborne = true;
    state.pos.y = Math.max(state.pos.y, RUNWAY.elevation + 1.6);
  }

  // Fuel burns with throttle; an empty tank glides.
  if (engineOn) {
    state.fuel = Math.max(0, state.fuel - state.throttle * FLIGHT.fuelBurn * dt);
  }

  // Propeller spins with rpm.
  state.propAngle += (0.4 + state.throttle * 2.4) * state.speed * dt * 0.12
    + state.throttle * dt * 22;

  // Ground contact.
  const ground = terrainHeight(state.pos.x, state.pos.z);
  const agl = state.pos.y - ground;
  if (agl <= 1.2 && state.airborne) {
    // Landing check: over the runway, slow descent, gentle speed.
    const onRunway = isOverRunway(state.pos.x, state.pos.z);
    const soft = state.verticalSpeed > -3.5 && state.speed < 48;
    if (onRunway && soft && course.landToFinish) {
      state.landed = true;
      state.pos.y = RUNWAY.elevation + 1.3;
      state.verticalSpeed = 0;
      state.pitch = 0;
      state.roll = 0;
      return 'landed';
    }
    state.crashed = true;
    state.damage = FLIGHT.maxDamage;
    return 'crashed';
  }
  if (agl <= 1.2 && !state.airborne) {
    // Rolling on the ground: stay glued to the strip.
    state.pos.y = ground + 1.3;
  }
  return null;
}

function isOverRunway(x, z) {
  const dx = x - RUNWAY.cx;
  const dz = z - RUNWAY.cz;
  const h = RUNWAY.heading;
  const along = dx * Math.sin(h) - dz * Math.cos(h);
  const cross = dx * Math.cos(h) + dz * Math.sin(h);
  return Math.abs(along) < RUNWAY.length / 2 && Math.abs(cross) < RUNWAY.width / 2 + 2;
}

// Push the flight state into the visible mesh. The mesh's nose points
// down -Z, so yaw is -heading and pitch is +pitch (verified against the
// forward vector the physics uses).
export function posePlane(mesh, state) {
  mesh.group.position.copy(state.pos);
  mesh.group.rotation.order = 'YXZ';
  mesh.group.rotation.y = -state.heading;
  mesh.group.rotation.x = state.pitch;
  mesh.group.rotation.z = -state.roll;
  mesh.prop.rotation.z = state.propAngle;
}
