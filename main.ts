// Skyline Ridge — Island Run (Node 22, standard library only).
//
// The entry point the grader runs. The game itself is the static folder
// game/ beside this file — plain HTML, ES modules and one vendored
// Three.js build, nothing fetched from the network — and this program
// hands it in: it copies game/ and screenshots/ into /output and writes
// /output/dossier.json, the summary the judge reads, using the vendored
// make.fun library. Run it anywhere with MAKEFUN_OUTPUT_DIR set:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Inside the grader's container /output is used instead.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The entry is not complete without its cover: refuse a silent dossier
// when the game or its screenshots are missing, so a broken hand-in
// fails loudly here instead of quietly in front of the judge.
if (!existsSync(join(here, 'game', 'index.html'))) {
  throw new Error('Skyline Ridge: game/index.html is missing');
}
const shotDir = join(here, 'screenshots');
if (!existsSync(shotDir) || readdirSync(shotDir).length < 3) {
  throw new Error('Skyline Ridge: screenshots/ needs at least 3 images');
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the dossier bytes; the other caps refuse an entry the scorer would
// refuse anyway — more than 4 screenshots or one over 256 KiB; more than
// 993 files in game/ or 48 MiB of game files in all; a path under game/
// over 1000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(`Skyline Ridge handed in: ${out} (game + ${readdirSync(shotDir).length} screenshots + dossier.json)`);
