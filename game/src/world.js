// Skyline Ridge — the world: islands, ocean, sky, runway and rings.
// One clear job: build every static thing the plane flies over, and answer
// terrainHeight(x, z) with the exact same function the mesh is built from.

import * as THREE from 'three';
import { WORLD, PALETTE } from './config.js';
import { makeFbm, mulberry32 } from './random.js';

// Island shapes: a flat coastal plateau plus gaussian mountain peaks.
const ISLANDS = [
  {
    cx: 0, cz: 0, radius: 1600, plateau: 14,
    peaks: [
      { dx: -450, dz: -350, h: 230, sigma: 520 },
      { dx: 700, dz: -600, h: 130, sigma: 420 },
      { dx: -800, dz: 600, h: 110, sigma: 380 },
      { dx: 200, dz: 900, h: 70, sigma: 300 },
    ],
  },
  {
    cx: -1500, cz: 1000, radius: 950, plateau: 10,
    peaks: [
      { dx: 0, dz: 0, h: 150, sigma: 400 },
      { dx: 300, dz: 300, h: 80, sigma: 250 },
    ],
  },
  {
    cx: 1600, cz: -1200, radius: 850, plateau: 10,
    peaks: [{ dx: 0, dz: 0, h: 120, sigma: 350 }],
  },
];

// The runway: a flat strip on the main island's south-east shelf.
export const RUNWAY = {
  cx: 300,
  cz: 480,
  heading: 0.35, // radians from north (-Z), clockwise
  length: 420,
  width: 26,
  elevation: 14,
};

function smoothstep(a, b, t) {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
}

const detailNoise = makeFbm(WORLD.seed, 4);

// Raw island height before runway flattening.
function islandHeight(x, z) {
  let h = -8; // ocean floor
  for (const isl of ISLANDS) {
    const dx = x - isl.cx;
    const dz = z - isl.cz;
    const d = Math.sqrt(dx * dx + dz * dz) / isl.radius;
    if (d >= 1) continue;
    const mask = 1 - smoothstep(0.82, 1, d);
    let top = isl.plateau;
    for (const p of isl.peaks) {
      const px = x - (isl.cx + p.dx);
      const pz = z - (isl.cz + p.dz);
      const g = Math.exp(-(px * px + pz * pz) / (2 * p.sigma * p.sigma));
      top += p.h * g;
    }
    // Gentle detail, strongest mid-island, fading at the shore.
    top += detailNoise(x * 0.0016, z * 0.0016) * 9 * mask;
    h = Math.max(h, top * mask + -8 * (1 - mask));
  }
  return h;
}

// Distance from (x, z) to the runway rectangle, in metres (0 inside).
// Axes: along = along-track (+ toward the landing direction),
// cross = cross-track. The strip's long side is the along-track one.
function runwayDistance(x, z) {
  const dx = x - RUNWAY.cx;
  const dz = z - RUNWAY.cz;
  const h = RUNWAY.heading;
  const along = dx * Math.sin(h) - dz * Math.cos(h);
  const cross = dx * Math.cos(h) + dz * Math.sin(h);
  const du = Math.max(Math.abs(along) - RUNWAY.length / 2, 0);
  const dv = Math.max(Math.abs(cross) - RUNWAY.width / 2, 0);
  return Math.sqrt(du * du + dv * dv);
}

// The one height function: geometry, physics and shots all call this.
export function terrainHeight(x, z) {
  const raw = islandHeight(x, z);
  const d = runwayDistance(x, z);
  let h = raw;
  if (d <= 60) {
    const blend = 1 - smoothstep(18, 60, d);
    h = raw + (RUNWAY.elevation - raw) * blend;
  }
  // Glide-path corridor: the ridge south of the strip would make the
  // runway unlandable from its own approach heading, so the approach is
  // carved into the terrain — a valley falling at 3% to the threshold,
  // 140 m wide, fading out where the natural ground is already below
  // the glide path. The plane flies a 6% slope, so it stays above the
  // carved floor all the way in.
  const ap = approachBlend(x, z);
  // The corridor only ever carves DOWN: where the natural ground is
  // already below the glide path, leave it alone.
  if (ap) h = Math.min(h, h + (ap.target - h) * ap.strength);
  return h;
}

// The approach corridor. Axes: along = along-track (+ toward the landing
// direction), cross = cross-track. (Note: runwayDistance's u/v are the
// same two axes swapped — harmless there, since it only needs |u|, |v|.)
function approachBlend(x, z) {
  const dx = x - RUNWAY.cx;
  const dz = z - RUNWAY.cz;
  const h = RUNWAY.heading;
  const along = dx * Math.sin(h) - dz * Math.cos(h);
  const cross = dx * Math.cos(h) + dz * Math.sin(h);
  const d = -RUNWAY.length / 2 - along; // metres back from the threshold
  if (d < 0 || d > 850) return null;
  const ac = Math.abs(cross);
  if (ac > 70) return null;
  const target = RUNWAY.elevation + d * 0.03;
  const side = 1 - smoothstep(30, 70, ac);
  const far = 1 - smoothstep(750, 850, d);
  return { target, strength: side * far };
}

function heightColor(h, out) {
  // Sand, grass, dark forest, rock, pale peak — one warm style.
  if (h < 3.5) out.setHex(PALETTE.sand);
  else if (h < 70) out.setHex(PALETTE.grass);
  else if (h < 140) out.setHex(PALETTE.grassDark);
  else if (h < 200) out.setHex(PALETTE.rock);
  else out.setHex(PALETTE.peak);
  return out;
}

function makeCloudTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const blobs = [
    [64, 70, 42], [36, 78, 26], [92, 76, 28], [52, 52, 26], [80, 54, 22],
  ];
  for (const [x, y, r] of blobs) {
    const grad = g.createRadialGradient(x, y, 2, x, y, r);
    grad.addColorStop(0, 'rgba(255,250,240,0.85)');
    grad.addColorStop(1, 'rgba(255,250,240,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSkyDome(scene) {
  const geo = new THREE.SphereGeometry(9000, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(PALETTE.skyTop) },
      bottom: { value: new THREE.Color(PALETTE.skyBottom) },
      sunDir: { value: new THREE.Vector3(-0.55, 0.28, -0.79).normalize() },
      sunColor: { value: new THREE.Color(PALETTE.sun) },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 top;
      uniform vec3 bottom;
      uniform vec3 sunDir;
      uniform vec3 sunColor;
      void main() {
        float h = clamp(vDir.y, -0.1, 1.0);
        vec3 col = mix(bottom, top, pow(max(h, 0.0), 0.55));
        float sun = pow(max(dot(normalize(vDir), sunDir), 0.0), 90.0);
        float halo = pow(max(dot(normalize(vDir), sunDir), 0.0), 7.0);
        col += sunColor * (sun * 0.9 + halo * 0.28);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const dome = new THREE.Mesh(geo, mat);
  scene.add(dome);
  return dome;
}

function buildTerrain(scene) {
  const geo = new THREE.PlaneGeometry(
    WORLD.size, WORLD.size, WORLD.segments, WORLD.segments,
  );
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const col = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = terrainHeight(x, z);
    pos.setY(i, h);
    heightColor(h, col);
    // Slight random tint so the low-poly facets read individually.
    const tint = 0.94 + 0.06 * ((i * 2654435761) % 100) / 100;
    colors[i * 3] = col.r * tint;
    colors[i * 3 + 1] = col.g * tint;
    colors[i * 3 + 2] = col.b * tint;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'terrain';
  scene.add(mesh);

  // Ocean: one big plane just under the shoreline.
  const oceanGeo = new THREE.PlaneGeometry(WORLD.size * 2.4, WORLD.size * 2.4);
  oceanGeo.rotateX(-Math.PI / 2);
  const ocean = new THREE.Mesh(
    oceanGeo,
    new THREE.MeshPhongMaterial({
      color: PALETTE.ocean,
      shininess: 90,
      specular: 0x99ccdd,
      transparent: true,
      opacity: 0.94,
    }),
  );
  ocean.position.y = 0.4;
  ocean.name = 'ocean';
  scene.add(ocean);
  return mesh;
}

function buildRunway(scene) {
  const group = new THREE.Group();
  group.name = 'runway';
  const dir = new THREE.Vector3(
    Math.sin(RUNWAY.heading), 0, -Math.cos(RUNWAY.heading),
  );
  const perp = new THREE.Vector3(
    Math.cos(RUNWAY.heading), 0, Math.sin(RUNWAY.heading),
  );
  const center = new THREE.Vector3(RUNWAY.cx, RUNWAY.elevation + 0.35, RUNWAY.cz);

  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(RUNWAY.width, 0.7, RUNWAY.length),
    new THREE.MeshLambertMaterial({ color: PALETTE.runway }),
  );
  strip.position.copy(center);
  // The strip's long axis is local Z; rotation.y = -heading maps local
  // -Z onto the landing direction (sin h, -cos h).
  strip.rotation.y = -RUNWAY.heading;
  group.add(strip);

  // Centreline dashes.
  const dashGeo = new THREE.BoxGeometry(1.6, 0.15, 14);
  const dashMat = new THREE.MeshBasicMaterial({ color: PALETTE.runwayLine });
  for (let s = -RUNWAY.length / 2 + 24; s < RUNWAY.length / 2 - 12; s += 32) {
    const dash = new THREE.Mesh(dashGeo, dashMat);
    dash.position.copy(center).addScaledVector(dir, s);
    dash.position.y = RUNWAY.elevation + 0.78;
    dash.rotation.y = -RUNWAY.heading;
    group.add(dash);
  }

  // Threshold bars at both ends.
  const barGeo = new THREE.BoxGeometry(2.2, 0.15, 18);
  for (const end of [-1, 1]) {
    for (const off of [-8, -4, 0, 4, 8]) {
      const bar = new THREE.Mesh(barGeo, dashMat);
      bar.position.copy(center)
        .addScaledVector(dir, end * (RUNWAY.length / 2 - 12))
        .addScaledVector(perp, off);
      bar.position.y = RUNWAY.elevation + 0.78;
      // Bars run across the strip, 90° from the dashes.
      bar.rotation.y = -RUNWAY.heading - Math.PI / 2;
      group.add(bar);
    }
  }

  // Windsock at the runway's south-west corner.
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 9, 8),
    new THREE.MeshLambertMaterial({ color: 0xdddddd }),
  );
  const sockBase = center.clone()
    .addScaledVector(dir, -RUNWAY.length / 2 - 14)
    .addScaledVector(perp, RUNWAY.width / 2 + 8);
  sockBase.y = RUNWAY.elevation + 4.5;
  pole.position.copy(sockBase);
  group.add(pole);
  const sock = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 4.5, 10, 1, true),
    new THREE.MeshLambertMaterial({ color: 0xff6a2a, side: THREE.DoubleSide }),
  );
  sock.rotation.z = Math.PI / 2;
  sock.rotation.y = 0.7;
  sock.position.copy(sockBase);
  sock.position.y += 4.6;
  group.add(sock);

  scene.add(group);
  return group;
}

function buildClouds(scene, seed) {
  const rng = mulberry32(seed ^ 0x5f3a);
  const tex = makeCloudTexture();
  const group = new THREE.Group();
  group.name = 'clouds';
  for (let i = 0; i < 42; i++) {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 0.55 + rng() * 0.3,
      depthWrite: false,
    });
    const spr = new THREE.Sprite(mat);
    const a = rng() * Math.PI * 2;
    const r = 700 + rng() * 3200;
    spr.position.set(Math.cos(a) * r, 300 + rng() * 160, Math.sin(a) * r);
    const w = 260 + rng() * 420;
    spr.scale.set(w, w * 0.42, 1);
    spr.userData.drift = 2 + rng() * 4;
    group.add(spr);
  }
  scene.add(group);
  return group;
}

function buildRings(scene, course) {
  const group = new THREE.Group();
  group.name = 'rings';
  const meshes = [];
  const ringGeo = new THREE.TorusGeometry(1, 0.09, 10, 40);
  for (let i = 0; i < course.rings.length; i++) {
    const def = course.rings[i];
    const mat = new THREE.MeshBasicMaterial({ color: PALETTE.ring });
    const ring = new THREE.Mesh(ringGeo, mat);
    ring.scale.setScalar(def.r);
    ring.position.set(def.x, def.y, def.z);
    // Face the ring toward the previous point (or the runway for the first).
    const from = i === 0
      ? { x: RUNWAY.cx, y: RUNWAY.elevation + 30, z: RUNWAY.cz }
      : course.rings[i - 1];
    const dx = def.x - from.x;
    const dz = def.z - from.z;
    ring.rotation.y = Math.atan2(dx, dz);
    ring.userData.index = i;
    ring.userData.passed = false;
    group.add(ring);
    meshes.push(ring);
  }
  scene.add(group);
  return meshes;
}

// Build the whole world for one course. Returns handles the game needs.
export function buildWorld(scene, course, seed) {
  makeSkyDome(scene);
  scene.fog = new THREE.Fog(PALETTE.fog, 900, 5200);

  const sun = new THREE.DirectionalLight(0xffe0b3, 2.4);
  sun.position.set(-2200, 1100, -3100);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xbfd9ff, 0x8a6f4d, 1.1));

  buildTerrain(scene);
  buildRunway(scene);
  const clouds = buildClouds(scene, seed);
  const rings = buildRings(scene, course);

  return {
    rings,
    clouds,
    setRingPassed(i) {
      const ring = rings[i];
      if (!ring) return;
      ring.userData.passed = true;
      ring.material.color.setHex(PALETTE.ringPassed);
    },
    resetRings() {
      for (const ring of rings) {
        ring.userData.passed = false;
        ring.material.color.setHex(PALETTE.ring);
      }
    },
    update(dt, elapsed) {
      // Slow cloud drift so the sky feels alive without moving the ground.
      for (const spr of clouds.children) {
        spr.position.x += spr.userData.drift * dt;
        if (spr.position.x > 4200) spr.position.x = -4200;
      }
      // The next ring pulses gently so the pilot can find it.
      const t = elapsed * 2.2;
      for (const ring of rings) {
        if (ring.userData.passed) continue;
        const s = ring.userData.baseScale ?? (ring.userData.baseScale = ring.scale.x);
        const pulse = 1 + Math.sin(t + ring.userData.index) * 0.03;
        ring.scale.setScalar(s * pulse);
      }
    },
  };
}
