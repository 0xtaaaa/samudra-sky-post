// Screenshot staging: each named shot plays the real rules forward from a
// fresh run for a fixed number of steps, steered by a simple autopilot, so
// the frame is what a short game really looks like — and the same seed
// always gives the same frame. The autopilot only ever flies the plane the
// way a player could: stick, throttle, flaps and gear.

const STEP = 1 / 60;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * The autopilot: steer toward `target` {x, y, z}, climb when the ground
 * ahead is close, keep the speed the phase asks for. Returns a stick input
 * in the flight model's own shape.
 */
function autopilot(sim, target, phase) {
  const f = sim.flight;
  const dx = target.x - f.pos.x;
  const dz = target.z - f.pos.z;
  const dist = Math.hypot(dx, dz);
  const wantHeading = Math.atan2(dx, -dz);
  const headingErr = wrapAngle(wantHeading - f.heading);
  // Bank hard on a big error: at mail-plane speeds a gentle bank turns
  // so wide the ring is gone before the nose comes round.
  // Heading: hold the runway straight while the wheels are on the ground,
  // then turn for the ring. Steering on the roll drifts off the centreline.
  const bank = f.grounded ? 0 : clamp(headingErr * 3.0, -1, 1);

  const altErr = target.y - f.pos.y;
  // Climb hard when below the ring: a gentle climb arrives under it.
  let pitch = clamp(altErr * 0.02, -0.6, 0.9);
  // On the approach, descend gently: a dive now is a crash, not a landing.
  if (phase === 'approach') pitch = clamp(pitch, -0.18, 0.5);

  // Look 300 m ahead: if the ground there is close, climb now.
  const aheadX = f.pos.x + Math.sin(f.heading) * 300;
  const aheadZ = f.pos.z - Math.cos(f.heading) * 300;
  const aheadGround = sim.terrainHeight(aheadX, aheadZ);
  if (aheadGround > f.pos.y - 45) pitch = Math.max(pitch, 0.85);

  let throttle = 0.72;
  if (phase === 'approach') throttle = 0.52;
  if (dist < 260) throttle = 0.55;
  if (Math.abs(headingErr) > 0.5) throttle = 0.45; // slow down to turn tighter
  if (f.speed < 38) throttle = 0.85;
  return { pitch, bank, throttle };
}

/**
 * Stage one named shot and leave the game showing that frame.
 * `sim` is the game handle main.js provides: reset(missionIndex),
 * place(x, y, z, heading, speed, opts), tick(dt, input), target(),
 * terrainHeight(x, z), flight, setScreen(name), showHud().
 * Returns the screen to show ('play' for every shot: the HUD is always on).
 */
export function stageShot(name, sim) {
  if (name === 'start') {
    // On the strip at dawn, engines idling, runway ahead, HUD lit.
    sim.reset(0);
    for (let i = 0; i < 2 / STEP; i++) {
      sim.tick(STEP, { pitch: 0, bank: 0, throttle: 0.12 });
    }
    sim.setScreen('play');
    return { screen: 'play' };
  }

  if (name === 'dusk') {
    // Evening run: forty seconds into the dusk delivery, rings ahead.
    sim.reset(3);
    for (let i = 0; i < 40 / STEP; i++) {
      const target = sim.target();
      if (!target) break;
      sim.tick(STEP, autopilot(sim, target, sim.phase()));
    }
    sim.setScreen('play');
    return { screen: 'play' };
  }

  if (name === 'landing') {
    // Short final: placed 900 m out on the extended centreline of Karang
    // Strip, gear down, flaps down, the last ring lit as next. The frame
    // is taken on final, runway dead ahead, before any touchdown.
    sim.reset(0);
    const rw = sim.runway(1);
    const elev = sim.terrainHeight(rw.center.x, rw.center.z);
    const axis = { x: Math.sin(rw.heading), z: Math.cos(rw.heading) };
    const threshold = { x: rw.center.x - axis.x * 300, y: elev + 45, z: rw.center.z - axis.z * 300 };
    const start = { x: threshold.x - axis.x * 900, y: elev + 120, z: threshold.z - axis.z * 900 };
    sim.place(start.x, start.y, start.z, Math.PI - rw.heading, 46, { gearDown: true, flaps: true, ringIndex: 4, score: 400 });
    for (let i = 0; i < 20 / STEP; i++) {
      const target = sim.target();
      if (!target) break;
      sim.tick(STEP, autopilot(sim, target, 'approach'));
    }
    sim.setScreen('play');
    return { screen: 'play' };
  }

  // 'play' (the default): twenty-six seconds into the first run, mid-course
  // through the rings, islands below, HUD live.
  sim.reset(0);
  for (let i = 0; i < 26 / STEP; i++) {
    const target = sim.target();
    if (!target) break;
    sim.tick(STEP, autopilot(sim, target, sim.phase()));
  }
  sim.setScreen('play');
  return { screen: 'play' };
}
