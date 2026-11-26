// Skyline Ridge — the HUD: airspeed, altitude, heading, throttle, fuel
// and an artificial horizon, plus menus and the end-of-sortie debrief.
// One clear job: every number and light the pilot reads, in the DOM.

const KTS = 1.94384; // m/s to knots
const FT = 3.28084; // metres to feet

function compassLabel(deg) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

export function createHud() {
  const $ = (id) => document.getElementById(id);
  const els = {
    speed: $('hud-speed'),
    alt: $('hud-alt'),
    vsi: $('hud-vsi'),
    heading: $('hud-heading'),
    headingTape: $('hud-tape'),
    throttleBar: $('hud-throttle-fill'),
    throttlePct: $('hud-throttle-pct'),
    fuelBar: $('hud-fuel-fill'),
    fuelPct: $('hud-fuel-pct'),
    horizon: $('hud-horizon'),
    score: $('hud-score'),
    objective: $('hud-objective'),
    rings: $('hud-rings'),
    warn: $('hud-warn'),
    banner: $('hud-banner'),
    menu: $('menu'),
    end: $('end'),
    endTitle: $('end-title'),
    endLines: $('end-lines'),
    cockpit: $('cockpit-panel'),
  };
  const hctx = els.horizon.getContext('2d');

  function drawHorizon(pitch, roll) {
    const w = els.horizon.width;
    const h = els.horizon.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = w / 2 - 2;
    hctx.clearRect(0, 0, w, h);
    hctx.save();
    hctx.beginPath();
    hctx.arc(cx, cy, r, 0, Math.PI * 2);
    hctx.clip();
    // Sky and ground, rolled with the aircraft.
    hctx.translate(cx, cy);
    hctx.rotate(-roll);
    const horizonY = pitch * 90;
    hctx.fillStyle = '#7fb2e5';
    hctx.fillRect(-r - 4, -r - 4, (r + 4) * 2, r + 4 + horizonY);
    hctx.fillStyle = '#8a6f4d';
    hctx.fillRect(-r - 4, horizonY, (r + 4) * 2, r + 4 - horizonY + 4);
    hctx.strokeStyle = '#ffffff';
    hctx.lineWidth = 2;
    hctx.beginPath();
    hctx.moveTo(-r, horizonY);
    hctx.lineTo(r, horizonY);
    hctx.stroke();
    hctx.restore();
    // Fixed wings marker and rim.
    hctx.strokeStyle = '#ffd23e';
    hctx.lineWidth = 3;
    hctx.beginPath();
    hctx.moveTo(cx - 26, cy);
    hctx.lineTo(cx - 8, cy);
    hctx.moveTo(cx + 8, cy);
    hctx.lineTo(cx + 26, cy);
    hctx.stroke();
    hctx.strokeStyle = 'rgba(255,255,255,0.9)';
    hctx.lineWidth = 2;
    hctx.beginPath();
    hctx.arc(cx, cy, r, 0, Math.PI * 2);
    hctx.stroke();
  }

  function setBar(bar, pct, pctEl) {
    const p = Math.max(0, Math.min(100, pct));
    bar.style.width = `${p}%`;
    if (pctEl) pctEl.textContent = `${Math.round(p)}%`;
    bar.classList.toggle('low', p < 25);
  }

  return {
    // Called every frame while flying.
    setFlight(f) {
      els.speed.textContent = `${Math.round(f.speed * KTS)}`;
      els.alt.textContent = `${Math.round(f.alt * FT)}`;
      const vsi = Math.round(f.verticalSpeed * FT * 60);
      els.vsi.textContent = `${vsi >= 0 ? '+' : ''}${vsi} fpm`;
      const deg = ((f.headingDeg % 360) + 360) % 360;
      els.heading.textContent = `${String(Math.round(deg)).padStart(3, '0')}° ${compassLabel(deg)}`;
      // Compass tape: the cardinal points around the current heading.
      let tape = '';
      for (let d = -60; d <= 60; d += 15) {
        const h = ((Math.round(deg) + d) % 360 + 360) % 360;
        const label = h % 90 === 0 ? ['N', 'E', 'S', 'W'][Math.round(h / 90) % 4] : `${h}`;
        tape += `<span class="tick" style="left:${50 + d * 0.55}%">${label}</span>`;
      }
      els.headingTape.innerHTML = tape;
      setBar(els.throttleBar, f.throttle * 100, els.throttlePct);
      setBar(els.fuelBar, f.fuel, els.fuelPct);
      drawHorizon(f.pitch, f.roll);
      els.score.textContent = `SCORE ${f.score}`;
      els.rings.textContent = `RINGS ${f.ringsPassed}/${f.ringsTotal}`;
      els.objective.textContent = f.objective;
      const warns = [];
      if (f.stalled) warns.push('STALL — NOSE DOWN, ADD POWER');
      if (f.fuel < 20 && f.fuel > 0) warns.push('LOW FUEL');
      if (f.fuel <= 0) warns.push('FUEL EMPTY — GLIDING');
      if (f.groundWarn) warns.push('PULL UP');
      els.warn.textContent = warns.join('  •  ');
      els.warn.classList.toggle('show', warns.length > 0);
    },
    setBanner(text, ms) {
      els.banner.textContent = text;
      els.banner.classList.add('show');
      if (ms) {
        clearTimeout(this._bannerTimer);
        this._bannerTimer = setTimeout(() => {
          els.banner.classList.remove('show');
        }, ms);
      }
    },
    setCockpitMode(on) {
      els.cockpit.classList.toggle('show', on);
    },
    showMenu(courseName, objective) {
      $('menu-course').textContent = courseName;
      $('menu-objective').textContent = objective;
      els.menu.classList.remove('hidden');
      els.end.classList.add('hidden');
    },
    hideMenu() {
      els.menu.classList.add('hidden');
    },
    showEnd(title, lines) {
      els.endTitle.textContent = title;
      els.endLines.innerHTML = lines.map((l) => `<div>${l}</div>`).join('');
      els.end.classList.remove('hidden');
    },
    hideEnd() {
      els.end.classList.add('hidden');
    },
  };
}
