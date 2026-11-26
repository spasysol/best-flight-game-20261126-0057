// Skyline Ridge — keyboard and mouse input.
// One clear job: turn keys and the mouse into one normalised stick input
// { pitch, roll, throttle } the flight model reads every frame.

export function createInput(canvas) {
  const keys = new Set();
  const mouse = { dx: 0, dy: 0, active: false };
  let locked = false;

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  }
  function onKeyUp(e) {
    keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  }
  function onMouseMove(e) {
    if (!locked) return;
    mouse.dx += e.movementX || 0;
    mouse.dy += e.movementY || 0;
  }
  function onClick() {
    if (!locked && canvas.requestPointerLock) {
      canvas.requestPointerLock();
    }
  }
  function onLockChange() {
    locked = document.pointerLockElement === canvas;
    mouse.active = locked;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('click', onClick);
  document.addEventListener('pointerlockchange', onLockChange);

  return {
    // Read the stick once per frame; mouse deltas are consumed on read.
    read() {
      let pitch = 0;
      let roll = 0;
      if (keys.has('ArrowUp')) pitch += 1;
      if (keys.has('ArrowDown')) pitch -= 1;
      if (keys.has('ArrowLeft')) roll -= 1;
      if (keys.has('ArrowRight')) roll += 1;
      // Mouse: push the nose where the pointer goes, gently.
      if (locked) {
        roll += Math.max(-1, Math.min(1, mouse.dx / 160));
        pitch -= Math.max(-1, Math.min(1, mouse.dy / 160));
      }
      // W/S or Shift/Ctrl nudge the throttle.
      let throttle = 0;
      if (keys.has('w') || keys.has('Shift')) throttle += 1;
      if (keys.has('s') || keys.has('Control')) throttle -= 1;
      mouse.dx = 0;
      mouse.dy = 0;
      return {
        pitch: Math.max(-1, Math.min(1, pitch)),
        roll: Math.max(-1, Math.min(1, roll)),
        throttle,
      };
    },
    pressed(key) {
      return keys.has(key);
    },
    consume(key) {
      keys.delete(key);
    },
    get mouseLocked() {
      return locked;
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('click', onClick);
      document.removeEventListener('pointerlockchange', onLockChange);
    },
  };
}
