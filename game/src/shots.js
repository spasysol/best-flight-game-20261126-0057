// Skyline Ridge — deterministic screenshot states.
// One clear job: put the plane, the mission and the camera exactly where
// a screenshot needs them, so ?shot=<name> always renders the same frame.
// The game still draws the frame itself; nothing here is a picture.

function place(state, x, y, z, heading, pitch, roll, speed, throttle, fuel) {
  state.pos.set(x, y, z);
  state.heading = heading;
  state.pitch = pitch;
  state.roll = roll;
  state.speed = speed;
  state.throttle = throttle;
  state.fuel = fuel;
  state.airborne = true;
  state.verticalSpeed = Math.sin(pitch) * speed * 0.92;
}

// The four shots the entry ships, in file order (first is the cover).
export const SHOT_NAMES = ['1-cover.jpg', '2-rings.jpg', '3-runway.jpg', '4-cockpit.jpg'];

export function applyShot(game, name) {
  const { flight, mission, world } = game;
  world.resetRings();
  switch (name) {
    case 'cover': {
      // Chase view, high over the northern slopes: the next ring big
      // ahead, the whole archipelago falling away below.
      place(flight, 700, 300, -650, 0.46, 0.02, -0.12, 55, 0.7, 78);
      mission.nextRing = 1;
      mission.ringsPassed = 1;
      mission.score = 100;
      world.setRingPassed(0);
      game.cameraMode = 'chase';
      break;
    }
    case 'rings': {
      // Banking hard through ring 3, the ring big in the frame.
      place(flight, 1080, 195, -700, 2.12, 0.03, 0.5, 62, 0.8, 64);
      mission.nextRing = 2;
      mission.ringsPassed = 2;
      mission.score = 200;
      world.setRingPassed(0);
      world.setRingPassed(1);
      game.cameraMode = 'chase';
      break;
    }
    case 'runway': {
      // Final approach, straight down the carved glide-path valley:
      // the strip ahead, all six rings already green behind us.
      place(flight, 180, 40, 809, 0.35, -0.05, 0.02, 38, 0.35, 45);
      mission.nextRing = 6;
      mission.ringsPassed = 6;
      mission.score = 600;
      for (let i = 0; i < 6; i++) world.setRingPassed(i);
      game.cameraMode = 'chase';
      break;
    }
    case 'cockpit': {
      // From the pilot's seat: the nose, the panel, the horizon.
      place(flight, 650, 210, -600, 0.5, 0.02, -0.08, 58, 0.75, 70);
      mission.nextRing = 3;
      mission.ringsPassed = 3;
      mission.score = 300;
      world.setRingPassed(0);
      world.setRingPassed(1);
      world.setRingPassed(2);
      game.cameraMode = 'cockpit';
      break;
    }
    default:
      return false;
  }
  // Face the camera where the shot needs it, immediately (no smoothing).
  game.snapCamera();
  return true;
}

// Heading (radians, 0 = north) to a compass bearing in degrees.
export function headingDegrees(heading) {
  return ((heading * 180) / Math.PI % 360 + 360) % 360;
}
