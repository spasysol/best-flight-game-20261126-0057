// Skyline Ridge — missions: courses, ring progress, scoring, the clock.
// One clear job: what counts as progress, and what a sortie is worth.

import { SCORE } from './config.js';

export function createMission(course) {
  return {
    course,
    nextRing: 0,
    ringsPassed: 0,
    score: 0,
    elapsed: 0,
    finished: false,
    // True once every ring is cleared; landing then ends the sortie.
    get ringsDone() {
      return this.nextRing >= course.rings.length;
    },
    reset() {
      this.nextRing = 0;
      this.ringsPassed = 0;
      this.score = 0;
      this.elapsed = 0;
      this.finished = false;
    },
    tick(dt) {
      if (!this.finished) this.elapsed += dt;
    },
    // The ring the pilot is hunting now, or null when the course is done.
    currentRing() {
      return this.nextRing < course.rings.length
        ? course.rings[this.nextRing]
        : null;
    },
    // Did the plane just fly through the current ring? A ring counts when
    // the plane passes within its radius while crossing its face plane.
    // We approximate with a sphere check on the ring centre: simple,
    // forgiving, and it reads clearly in play.
    checkRing(pos) {
      const ring = this.currentRing();
      if (!ring) return false;
      const dx = pos.x - ring.x;
      const dy = pos.y - ring.y;
      const dz = pos.z - ring.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < ring.r) {
        this.nextRing += 1;
        this.ringsPassed += 1;
        this.score += SCORE.ring;
        return true;
      }
      return false;
    },
    // Score the landing once the wheels are down for good.
    scoreLanding(verticalSpeed, centreOffset) {
      if (this.finished) return 0;
      this.finished = true;
      let bonus = 0;
      const vs = Math.abs(verticalSpeed);
      if (vs < 2) bonus += SCORE.landingSoft;
      else if (vs < 3.5) bonus += SCORE.landingOk;
      if (centreOffset < 6) bonus += SCORE.centreBonus;
      const under = Math.max(0, this.course.parSeconds - this.elapsed);
      bonus += Math.round(under * SCORE.timeBonusPerSecond);
      this.score += bonus;
      return bonus;
    },
  };
}
