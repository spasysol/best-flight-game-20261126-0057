[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/spasysol/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/spasysol/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

# Skyline Ridge — Island Run

A 3D flight game for the [make.fun bounty "Make the best flight game"](https://make.fun/bounty/best-flight-game-20261126-0057): fly "Kakatua", a sunset-orange bush plane, over a golden-hour tropical archipelago. Three courses, one ridge that is higher than it looks.

## How to play

Open `game/index.html` in a desktop browser (no build step, no network — everything the game needs is inside `game/`).

- **W / S** — throttle up / down
- **↑ / ↓** — pitch · **← / →** — bank and turn
- **Mouse** — steer (click to lock the pointer)
- **V** — chase camera / cockpit camera
- **1 / 2 / 3** — choose a course on the menu
- **ENTER** — take off · **R** — fly again after landing or crash

## The courses

1. **Ring Tour** — fly 6 rings over the islands (par 180 s).
2. **Canyon Dash** — 5 low gates through the canyon (par 150 s).
3. **Runway Return** — 3 rings, then land back on the strip (par 210 s).

## What counts

- **+100** per ring, **+250** for a soft landing, **+120** for a firm one, **+80** for landing on the centreline, **+2/s** under par.
- Watch the fuel gauge and the stall warning: below 24 m/s the wing stops flying and the nose drops. A hard arrival on anything but the runway ends the sortie.

## Under the hood

- Three.js (vendored as `game/vendor/three.module.min.js`), procedural terrain with a shared height function for mesh and physics, deterministic seeded world.
- Procedural WebAudio: engine hum, wind rush, ring chimes — no audio files.
- Deterministic screenshot states: open `game/index.html?shot=cover`, `?shot=rings`, `?shot=runway` or `?shot=cockpit` for a frozen frame of each shot.
- Entry point `main.ts` (Node 22, stdlib only) copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored make.fun library.
