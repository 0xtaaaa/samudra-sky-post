// Sound, synthesised live with WebAudio — no audio files, nothing to
// download. Engine drone, wind rush, a chime for each ring, a thud for a
// touchdown and a soft clunk for the gear. M for mute.

/** Create the sound engine. Call `unlock()` from a user gesture. */
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let windSrc = null;
  let windGain = null;
  let windFilter = null;
  let muted = false;
  let unlocked = false;

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);

    // Engine: two detuned saws through a low-pass, pitch follows throttle.
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 52;
    engineOsc2 = ctx.createOscillator();
    engineOsc2.type = 'sawtooth';
    engineOsc2.frequency.value = 52 * 1.007;
    const engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 320;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter);
    engineOsc2.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
    engineOsc2.start();

    // Wind: looped noise through a band-pass, loudness follows airspeed.
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    windSrc = ctx.createBufferSource();
    windSrc.buffer = buf;
    windSrc.loop = true;
    windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 500;
    windFilter.Q.value = 0.6;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    windSrc.start();
  }

  function blip(freq, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  return {
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
      unlocked = true;
    },
    get unlocked() {
      return unlocked;
    },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
    },
    get muted() {
      return muted;
    },
    /** Continuous engine/wind levels, called every frame. */
    update(throttle, speedKnots, airborne) {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      const rpm = 46 + throttle * 42;
      engineOsc.frequency.setTargetAtTime(rpm, t, 0.08);
      engineOsc2.frequency.setTargetAtTime(rpm * 1.007, t, 0.08);
      engineGain.gain.setTargetAtTime(airborne ? 0.05 + throttle * 0.075 : 0.02 + throttle * 0.05, t, 0.1);
      const wind = Math.max(0, (speedKnots - 25) / 110);
      windGain.gain.setTargetAtTime(airborne ? wind * 0.16 : 0, t, 0.15);
      windFilter.frequency.setTargetAtTime(380 + wind * 900, t, 0.15);
    },
    ring() {
      blip(880, 0.35, 'sine', 0.25);
      blip(1318, 0.5, 'sine', 0.2, 0.09);
    },
    touchdown() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(90, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.18);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 0.25);
    },
    clunk() {
      blip(160, 0.12, 'square', 0.12);
    },
    crash() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(220, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.4, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 0.6);
    },
    click() {
      blip(660, 0.07, 'sine', 0.12);
    },
  };
}
