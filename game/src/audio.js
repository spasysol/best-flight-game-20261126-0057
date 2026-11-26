// Skyline Ridge — procedural sound: engine hum, wind rush, ring chimes.
// One clear job: every sound the game makes, synthesised in WebAudio.
// No audio files, no network — and silent until the pilot first touches
// a control, as browsers require.

export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let windSource = null;
  let windGain = null;
  let windFilter = null;
  let unlocked = false;

  function unlock() {
    if (unlocked) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Engine: two detuned saws through a low-pass, pitch follows rpm.
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineOsc2 = ctx.createOscillator();
      engineOsc2.type = 'sawtooth';
      engineOsc2.frequency.value = 55 * 1.007;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineOsc2.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      engineOsc2.start();

      // Wind: looped noise through a band-pass, gain follows airspeed.
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      windSource = ctx.createBufferSource();
      windSource.buffer = buf;
      windSource.loop = true;
      windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 700;
      windFilter.Q.value = 0.6;
      windGain = ctx.createGain();
      windGain.gain.value = 0;
      windSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(ctx.destination);
      windSource.start();
      unlocked = true;
    } catch (e) {
      // Sound is garnish: a game that cannot make it still flies.
      unlocked = false;
    }
  }

  function tone(freq, dur, type, gainValue, when = 0) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    const t = ctx.currentTime + when;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gainValue, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  return {
    unlock,
    // rpm 0..1 (throttle), speed01 0..1 (airspeed over max).
    setFlight(rpm, speed01) {
      if (!ctx || !unlocked) return;
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime;
      engineOsc.frequency.setTargetAtTime(52 + rpm * 95, t, 0.08);
      engineOsc2.frequency.setTargetAtTime((52 + rpm * 95) * 1.007, t, 0.08);
      engineGain.gain.setTargetAtTime(0.05 + rpm * 0.075, t, 0.1);
      windGain.gain.setTargetAtTime(speed01 * speed01 * 0.11, t, 0.15);
      windFilter.frequency.setTargetAtTime(500 + speed01 * 900, t, 0.15);
    },
    chime() {
      tone(880, 0.35, 'sine', 0.16);
      tone(1318, 0.45, 'sine', 0.12, 0.09);
    },
    thud() {
      if (!ctx) return;
      const t = ctx.currentTime;
      const len = ctx.sampleRate * 0.3;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.value = 0.35;
      src.connect(g);
      g.connect(ctx.destination);
      src.start(t);
      tone(70, 0.4, 'sine', 0.25);
    },
    fanfare() {
      tone(523, 0.25, 'triangle', 0.14);
      tone(659, 0.25, 'triangle', 0.14, 0.12);
      tone(784, 0.5, 'triangle', 0.16, 0.24);
    },
  };
}
