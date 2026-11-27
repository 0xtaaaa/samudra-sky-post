// Samudra Sky Post — the game itself: boot, the run state machine, the
// camera, the screens and the loop. The flight model flies, the world holds
// the ground, the HUD reads the instruments; this file is the glue.

import * as THREE from 'three';
import { createWorld } from './world.js';
import { buildPlaneMesh, FlightModel } from './plane.js';
import { buildCockpit, setCockpitGauges } from './cockpit.js';
import { DamageModel } from './damage.js';
import { MISSIONS, totalRings, maxScore, rankTitle, windVector, windText } from './missions.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { stageShot } from './shots.js';
import { seedFromString } from './rng.js';
import { WeatherSystem } from './weather.js';
import { AlertSystem } from './alerts.js';
import { RunScoring } from './scoring.js';
import { FlightCameraRig } from './camera.js';
import { TerrainDetailSystem } from './terrain_detail.js';


const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const params = new URLSearchParams(location.search);
const SEED = params.has('seed') ? Number(params.get('seed')) || 7 : 7;
const SHOT = params.get('shot');
const FIXED_DT = 1 / 60;

// ------------------------------------------------------------------ boot

const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 14000);
camera.position.set(-40, 90, 120);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const hud = createHud();
const audio = createAudio();
const input = createInput();
const flight = new FlightModel();
const damageModel = new DamageModel();
const planeMesh = buildPlaneMesh();

const runScoring = new RunScoring({ targetTime: 240, ringValue: 100, perfectRingBonus: 50 });
const alertSystem = new AlertSystem(document.getElementById('alert-strip'));
const cameraRig = new FlightCameraRig(camera, planeMesh.group);
let weatherSystem = null;
let terrainDetails = null;

scene.add(planeMesh.group);

// Cockpit group mounted at pilot's eye inside planeMesh.group:
// Pilot eye offset matches cockpit camera eye offset: (0, 1.15, -1.6)
const cockpitGroup = buildCockpit();
cockpitGroup.position.set(0, 1.15, -1.6);
planeMesh.group.add(cockpitGroup);
cockpitGroup.visible = false;

// World cache: one world per time of day, rebuilt only when the sky changes.
const worlds = new Map();
let world = null;
let ringGroups = [];

function worldFor(mission) {
  if (!worlds.has(mission.timeOfDay)) {
    worlds.set(mission.timeOfDay, createWorld(scene, SEED, mission));
  }
  return worlds.get(mission.timeOfDay);
}

// ------------------------------------------------------------------ run state

const run = {
  missionIndex: 0,
  mission: MISSIONS[0],
  legIndex: 0,
  rings: [],
  ringIndex: 0,
  phase: 'takeoff', // 'takeoff' | 'rings' | 'approach' | 'done'
  score: 0,
  elapsed: 0,
  started: false,
  screen: 'title', // 'title' | 'play' | 'pause' | 'over'
  cameraMode: 'chase', // 'chase' | 'cockpit' | 'orbit'
  orbitYaw: 0,
  orbitPitch: 0.25,
  throttleTarget: 0,
  landingGrade: '',
  overTitle: '',
  overSub: '',
  overStats: '',
  frozen: false,
  shotMode: Boolean(SHOT),
};

function spawnPoint() {
  const rw = world.runways[0];
  return {
    x: rw.center.x,
    y: rw.center.y + 1.6,
    z: rw.center.z,
    heading: Math.PI - rw.heading,
  };
}

function clearRings() {
  for (const r of ringGroups) scene.remove(r.group);
  ringGroups = [];
}

function buildLeg(legIndex) {
  clearRings();
  const leg = run.mission.legs[legIndex];
  const pts = leg.rings.map(([x, z, y]) => [x, y, z]);
  ringGroups = world.makeRings(pts, 26);
  run.legIndex = legIndex;
  run.ringIndex = 0;
  run.rings = ringGroups;
  ringGroups.forEach((r, i) => world.setRingState(r, i === 0 ? 'next' : 'idle'));
}

function resetRun(missionIndex) {
  run.missionIndex = missionIndex;
  run.mission = MISSIONS[missionIndex];
  world = worldFor(run.mission);
  run.score = 0;
  run.elapsed = 0;
  run.phase = 'takeoff';
  run.started = false;
  buildLeg(0);
  const s = spawnPoint();
  flight.reset(s);
  flight.gearDown = true;
  flight.flaps = false;
  run.throttleTarget = 0;
  damageModel.service();
  runScoring.reset();
  runScoring.targetTime = run.mission.parSeconds || 240;
  if (weatherSystem) weatherSystem.dispose();
  weatherSystem = new WeatherSystem(scene, run.mission.timeOfDay === 'storm' ? 'storm' : (run.mission.turbulence > 0.1 ? 'gust' : 'clear'));
  if (terrainDetails) terrainDetails.dispose();
  terrainDetails = new TerrainDetailSystem(scene, world.runways, SEED + missionIndex);
  cameraRig.setMode(run.cameraMode);

  run.landingGrade = '';
  run.cameraMode = 'chase';
  run.orbitYaw = 0;
  run.orbitPitch = 0.25;
  updateObjective();
  hud.setMission(run.mission.name, objectiveText(), windText(run.mission));
  syncMesh(0);
}

function objectiveText() {
  if (run.phase === 'takeoff') return 'Take off from Samudra Field — full throttle, pull up past 34 kt';
  if (run.phase === 'rings') {
    const leg = run.mission.legs[run.legIndex];
    const total = totalRings(run.mission);
    const done = run.mission.legs.slice(0, run.legIndex).reduce((n, l) => n + l.rings.length, 0) + run.ringIndex;
    return `Fly the mail rings — ring ${done + 1} of ${total} ahead${run.mission.legs.length > 1 ? ` (leg ${run.legIndex + 1}/${run.mission.legs.length})` : ''}`;
  }
  if (run.phase === 'approach') {
    const leg = run.mission.legs[run.legIndex];
    return `All rings done — land on ${world.runways[leg.land].name}, gear down, gentle descent`;
  }
  return 'Run complete';
}

function updateObjective() {
  hud.setMission(run.mission.name, objectiveText(), windText(run.mission));
}

function currentTarget() {
  if (run.phase === 'rings' && run.ringIndex < run.rings.length) {
    const r = run.rings[run.ringIndex];
    return { x: r.pos.x, y: r.pos.y, z: r.pos.z };
  }
  if (run.phase === 'approach') {
    const leg = run.mission.legs[run.legIndex];
    const rw = world.runways[leg.land];
    return { x: rw.center.x, y: rw.center.y + 30, z: rw.center.z };
  }
  if (run.phase === 'takeoff') {
    // Climb straight for the first ring: no detour past it, or the run
    // starts with a long turn back.
    const leg = run.mission.legs[run.legIndex];
    if (leg.rings.length > 0) {
      const [x, z, y] = leg.rings[0];
      return { x, y, z };
    }
    const s = spawnPoint();
    return { x: s.x + 600, y: s.y + 120, z: s.z };
  }
  return null;
}

// ------------------------------------------------------------------ screens

function showScreen(name) {
  run.screen = name;
  $('screen-title').classList.toggle('on', name === 'title');
  $('screen-pause').classList.toggle('on', name === 'pause');
  $('screen-over').classList.toggle('on', name === 'over');
  if (name === 'play') hud.show();
  else hud.hide();
  const status = $('status');
  if (name === 'title') status.textContent = 'Samudra Sky Post title screen. Choose a mail run and fly.';
  if (name === 'pause') status.textContent = 'Game paused.';
  if (name === 'over') status.textContent = `${run.overTitle}. ${run.overSub}`;
}

function endRun(crashed, reason) {
  const timeBonus = Math.max(0, Math.round(run.mission.parSeconds - run.elapsed)) * 2;
  if (!crashed) run.score += timeBonus;
  const title = crashed ? 'NURI-7 IS DOWN' : 'RUN COMPLETE';
  const sub = crashed
    ? reason
    : `${rankTitle(run.score, run.mission)} — ${run.mission.name}`;
  const mm = String(Math.floor(run.elapsed / 60)).padStart(2, '0');
  const ss = String(Math.floor(run.elapsed % 60)).padStart(2, '0');
  const gradeText = run.landingGrade ? ` · Landing ${run.landingGrade}` : '';
  const stats = crashed
    ? `Score ${run.score} · Rings ${ringsDone()} of ${totalRings(run.mission)} · Time ${mm}:${ss}${gradeText}`
    : `Score ${run.score} (best possible ${maxScore(run.mission)}) · Time ${mm}:${ss} · Time bonus +${timeBonus}${gradeText}`;
  run.overTitle = title;
  run.overSub = sub;
  run.overStats = stats;
  $('over-title').textContent = title;
  $('over-sub').textContent = sub;
  $('over-stats').textContent = stats;
  $('btn-next').style.display = crashed ? 'none' : 'inline-block';
  if (!run.shotMode) {
    showScreen('over');
    if (crashed) audio.crash();
  }
  try {
    const key = `samudra-best-${run.mission.id}`;
    const best = Number(window.localStorage.getItem(key) || 0);
    if (run.score > best) window.localStorage.setItem(key, String(run.score));
  } catch {
    // Storage may be unavailable; the score still stands for this run.
  }
}

function ringsDone() {
  const before = run.mission.legs.slice(0, run.legIndex).reduce((n, l) => n + l.rings.length, 0);
  return before + run.ringIndex;
}

// ------------------------------------------------------------------ the sim (also the shots.js handle)

const env = {
  wind: new THREE.Vector3(0, 0, 0),
  turbulence: 0,
  terrainHeight: (x, z) => world.terrainHeight(x, z),
  runways: [],
  rng: Math.random,
};
const simRng = (() => {
  let s = seedFromString('samudra-turbulence');
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();
env.rng = simRng;

function syncMesh(dt) {
  const g = planeMesh.group;
  g.position.copy(flight.pos);
  g.rotation.order = 'YXZ';
  g.rotation.set(flight.pitch, -flight.heading, -flight.bank);
  flight.propAngle += (4 + flight.throttle * 40) * dt;
  for (const p of planeMesh.props) p.rotation.z = flight.propAngle;
  // Gear slides up when retracted.
  const wantY = flight.gearDown ? 0 : 1.7;
  planeMesh.gear.position.y += (wantY - planeMesh.gear.position.y) * Math.min(1, dt * 4);
  // Tail light blinks twice a second.
  planeMesh.lights[2].visible = Math.floor(performance.now() / 500) % 2 === 0;

  // In cockpit camera mode: show cockpit group and hide external plane mesh
  // while keeping shadows (Three.js shadow map renders objects with castShadow=true,
  // depthWrite=false & colorWrite=false hides from camera rendering while shadow map uses custom depth pass)
  const isCockpit = run.cameraMode === 'cockpit';
  cockpitGroup.visible = isCockpit;
  for (const child of planeMesh.group.children) {
    if (child !== cockpitGroup) {
      child.traverse((o) => {
        if (o.isMesh && o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) {
            m.colorWrite = !isCockpit;
            m.depthWrite = !isCockpit;
          }
        }
        if (o.isLight || o.type === 'Mesh') {
          // If light lamp spheres
          if (isCockpit && o.geometry && o.geometry.type === 'SphereGeometry') {
            o.visible = false;
          } else if (!isCockpit && o.geometry && o.geometry.type === 'SphereGeometry') {
            o.visible = true;
          }
        }
      });
    }
  }

  // Animate cockpit propeller blur
  if (cockpitGroup.userData && cockpitGroup.userData.blades) {
    cockpitGroup.userData.blades.rotation.z = flight.propAngle;
  }
}

function stepGame(dt, stick) {
  if (run.screen !== 'play' && !run.shotMode) return;
  if (weatherSystem) {
    weatherSystem.update(dt, flight.pos);
    const liveWind = weatherSystem.getWindVector();
    env.wind.set(liveWind.x, liveWind.y, liveWind.z);
    env.turbulence = run.mission.turbulence + weatherSystem.getTurbulence();
  } else {
    const wv = windVector(run.mission);
    env.wind.set(wv.x, wv.y, wv.z);
    env.turbulence = run.mission.turbulence;
  }
  if (terrainDetails) {
    terrainDetails.update(run.elapsed, env.wind);
  }
  env.runways = world.runways;

  // Throttle lever follows W/S.
  if (stick.throttleUp) run.throttleTarget = clamp(run.throttleTarget + dt * 0.7, 0, 1);
  if (stick.throttleDown) run.throttleTarget = clamp(run.throttleTarget - dt * 0.7, 0, 1);
  const input = {
    throttle: stick.throttle !== undefined ? stick.throttle : run.throttleTarget,
    pitch: stick.pitch,
    bank: stick.bank,
  };

  // Damage & fuel model update
  const dmgStatus = damageModel.update(dt, flight.throttle);
  if (dmgStatus.engineCut) {
    // Cut throttle when fuel is exhausted
    flight.throttle = Math.max(0, flight.throttle - dt * 2.0);
    input.throttle = 0;
    run.throttleTarget = 0;
  }
  // Roughness adds mechanical turbulence
  if (dmgStatus.roughness > 0) {
    env.turbulence += dmgStatus.roughness * 0.45;
  }

  const prevVspeed = flight.vspeed;
  const prevBank = flight.bank;
  const runwayUnderPlane = flight.runwayUnder(env.runways);
  let touchdownOffset = 0;
  if (runwayUnderPlane) {
    const dx = flight.pos.x - runwayUnderPlane.center.x;
    const dz = flight.pos.z - runwayUnderPlane.center.z;
    touchdownOffset = Math.abs(dx * Math.cos(runwayUnderPlane.heading) - dz * Math.sin(runwayUnderPlane.heading));
  }

  const before = flight.grounded;
  const result = flight.step(dt, input, env);
  if (!before && flight.grounded && result === 'landed') {
    audio.touchdown();
    const fpm = Math.abs(prevVspeed * 196.85); // ft/min descent rate
    const bankDeg = Math.abs((prevBank * 180) / Math.PI);
    const offsetM = touchdownOffset;

    let grade = 'FIRM';
    let pts = 250;
    if (fpm < 180 && bankDeg < 4.0 && offsetM < 6.0) {
      grade = 'BUTTER';
      pts = 400;
    } else if (fpm < 420 && bankDeg < 10.0 && offsetM < 12.0) {
      grade = 'FIRM';
      pts = 250;
    } else {
      grade = 'BOUNCED';
      pts = 150;
      damageModel.hit(0.18);
    }
    run.landingGrade = grade;
    const landingResult = runScoring.addLanding({ touchDownSpeed: flight.speed, verticalVelocity: prevVspeed, centerlineOffset: offsetM });
    pts = landingResult.points;
    run.score = runScoring.ringScore + runScoring.landingScore;
    const gradeMsg = `LANDING: ${grade} (+${pts})`;
    if (typeof hud.showMessage === 'function') hud.showMessage(gradeMsg);
    hud.flash(gradeMsg);
    if (run.phase === 'approach') {
      if (run.legIndex + 1 < run.mission.legs.length) {
        buildLeg(run.legIndex + 1);
        run.phase = 'rings';
        updateObjective();
        hud.flash(`LEG ${run.legIndex + 1} COMPLETE — NEXT DROP`);
      } else {
        run.phase = 'done';
        endRun(false, '');
      }
    }
  }
  if (result === 'crashed' && !run.shotMode) {
    run.landingGrade = 'CRASH';
    damageModel.hit(1.0);
    const crashMsg = 'LANDING: CRASH';
    if (typeof hud.showMessage === 'function') hud.showMessage(crashMsg);
    hud.flash(crashMsg);
    run.phase = 'done';
    endRun(true, 'She went down short of the strip. The post will fly again tomorrow.');
    return;
  }
  if (result === 'crashed' && run.shotMode) {
    run.phase = 'done';
    return;
  }

  // Takeoff: once airborne, the rings are the job.
  if (run.phase === 'takeoff' && !flight.grounded) {
    run.phase = 'rings';
    run.started = true;
    updateObjective();
    hud.flash('AIRBORNE — FLY THE RINGS');
  }

  // Rings: fly through the next one.
  if (run.phase === 'rings' && run.ringIndex < run.rings.length) {
    const ring = run.rings[run.ringIndex];
    const d = flight.pos.distanceTo(ring.pos);
    if (d < ring.radius * 0.95) {
      world.setRingState(ring, 'passed');
      const earned = runScoring.addRing({ distanceToCenter: d, radius: ring.radius });
      run.score = runScoring.ringScore + runScoring.landingScore;
      run.ringIndex += 1;
      audio.ring();
      hud.flash(`RING ${ringsDone()} / ${totalRings(run.mission)}  +100`);
      if (run.ringIndex < run.rings.length) {
        world.setRingState(run.rings[run.ringIndex], 'next');
      } else {
        run.phase = 'approach';
        updateObjective();
        hud.flash('ALL RINGS — BRING HER HOME');
      }
      updateObjective();
    }
  }

  if (run.screen === 'play') run.elapsed += dt;
  world.update(dt);
  syncMesh(dt);
}

const sim = {
  flight,
  terrainHeight: (x, z) => world.terrainHeight(x, z),
  runway: (i) => world.runways[i],
  target: () => currentTarget(),
  phase: () => run.phase,
  reset: (missionIndex) => {
    resetRun(missionIndex);
    run.screen = 'play';
    hud.show();
  },
  place: (x, y, z, heading, speed, opts) => {
    flight.pos.set(x, y, z);
    flight.heading = heading;
    flight.pitch = 0;
    flight.bank = 0;
    flight.speed = speed;
    flight.throttle = 0.6;
    flight.grounded = false;
    flight.crashed = false;
    flight.gearDown = opts.gearDown;
    flight.flaps = opts.flaps;
    if (opts.ringIndex !== undefined) {
      run.ringIndex = opts.ringIndex;
      ringGroups.forEach((r, i) =>
        world.setRingState(r, i < opts.ringIndex ? 'passed' : i === opts.ringIndex ? 'next' : 'idle'),
      );
    }
    if (opts.score !== undefined) run.score = opts.score;
    run.phase = 'rings';
    syncMesh(0);
  },
  tick: (dt, input) => stepGame(dt, input),
  setCamera: (name) => {
    run.cameraMode = name;
    cameraRig.setMode(name);
    hud.setCamera(name.toUpperCase());
  },
  setScreen: (name) => {
    if (name === 'play') {
      showScreen('play');
    }
  },
};

// ------------------------------------------------------------------ camera

const camPos = new THREE.Vector3(-40, 90, 120);
const camTarget = new THREE.Vector3(0, 60, 0);

function updateCamera(dt) {
  if (run.screen === 'title' || run.screen === 'over') {
    return;
  }
  const look = input.look();
  cameraRig.setLookOffset(look.dx * 0.003, look.dy * 0.002);
  cameraRig.setMode(run.cameraMode);
  const gustRatio = weatherSystem ? weatherSystem.gustFactor : 0;
  cameraRig.update(dt, flight.speed / 80, gustRatio);
}

// ------------------------------------------------------------------ HUD refresh

const _v = new THREE.Vector3();
function refreshHud() {
  const target = currentTarget();
  let dist = null;
  let angle = null;
  if (target) {
    dist = flight.pos.distanceTo(new THREE.Vector3(target.x, target.y, target.z));
    _v.set(target.x, target.y, target.z).project(camera);
    const onScreen = _v.z < 1 && Math.abs(_v.x) < 0.95 && Math.abs(_v.y) < 0.9;
    if (!onScreen) {
      // Direction to the target across the screen: 0° is up.
      angle = (Math.atan2(_v.x, -_v.y) * 180) / Math.PI;
    }
  }
  const alertObj = alertSystem.update(FIXED_DT, {
    airspeed: flight.speedKnots,
    altitude: flight.altitudeFt,
    verticalSpeed: flight.vspeed,
    fuel: damageModel.fuel * 100,
    gearDown: flight.gearDown,
    maxSpeed: 105,
    stallSpeed: 28,
    distanceFromOrigin: flight.pos.length(),
    maxRange: 3200
  });

  const windSpd = env.wind.length();
  const windDirDeg = Math.round(((Math.atan2(env.wind.x, env.wind.z) * 180 / Math.PI) + 360) % 360);
  const windStr = `${Math.round(windSpd * 1.94)} kt @ ${windDirDeg}°`;

  hud.update({
    speedKt: flight.speedKnots,
    altFt: flight.altitudeFt,
    vsiFpm: flight.vspeed * 196.85,
    headingDeg: flight.headingDeg,
    pitch: flight.pitch,
    bank: flight.bank,
    throttle: flight.throttle,
    flaps: flight.flaps,
    gearDown: flight.gearDown,
    ringsDone: ringsDone(),
    ringsTotal: totalRings(run.mission),
    score: run.score,
    elapsedSec: run.elapsed,
    targetDistM: dist,
    targetAngleDeg: angle,
    legLabel: run.mission.legs.length > 1 ? `LEG ${run.legIndex + 1}/${run.mission.legs.length}` : '',
    fuel: damageModel.fuel,
    damage: damageModel.damage,
    alert: alertObj,
    windReadout: windStr
  });

  setCockpitGauges(cockpitGroup, {
    speed: flight.speedKnots,
    alt: flight.altitudeFt,
    vsi: flight.vspeed * 196.85,
    turn: flight.bank,
    fuel: damageModel.fuel,
    rpm: flight.throttle * 2800,
  });
}

// ------------------------------------------------------------------ loop

let last = performance.now();
let acc = 0;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (run.frozen) {
    // The staged frame keeps rendering (and the chase camera keeps
    // tracking the plane) while the simulation itself stands still.
    updateCamera(dt);
    renderer.render(scene, camera);
    return;
  }
  if (run.screen === 'play') {
    const keys = input.poll();
    if (keys.has('KeyP') || keys.has('Escape')) showScreen('pause');
    if (keys.has('KeyM')) {
      audio.setMuted(!audio.muted);
      hud.flash(audio.muted ? 'SOUND OFF' : 'SOUND ON');
    }
    if (keys.has('KeyC')) {
      run.cameraMode = cameraRig.cycleMode();
      hud.setCamera(run.cameraMode.toUpperCase());
      hud.flash(`CAMERA — ${run.cameraMode.toUpperCase()}`);
    }
    if (keys.has('KeyF')) {
      flight.flaps = !flight.flaps;
      audio.clunk();
      hud.flash(flight.flaps ? 'FLAPS DOWN' : 'FLAPS UP');
    }
    if (keys.has('KeyG')) {
      flight.gearDown = !flight.gearDown;
      audio.clunk();
      hud.flash(flight.gearDown ? 'GEAR DOWN' : 'GEAR UP');
    }
    if (keys.has('KeyR')) {
      resetRun(run.missionIndex);
      showScreen('play');
      hud.flash('RUN RESTARTED');
    }
    const stick = input.stick();
    acc += dt;
    while (acc >= FIXED_DT) {
      stepGame(FIXED_DT, stick);
      acc -= FIXED_DT;
    }
    audio.update(flight.throttle, flight.speedKnots, !flight.grounded);
    refreshHud();
  } else if (run.screen === 'title' || run.screen === 'over') {
    // A slow drift over the airfield behind the menus.
    const t = now / 1000;
    camera.position.set(
      Math.sin(t * 0.05) * 220 - 40,
      130 + Math.sin(t * 0.03) * 12,
      Math.cos(t * 0.05) * 220 + 60,
    );
    camera.lookAt(60, 60, 60);
    world.update(dt);
    syncMesh(dt);
  }
  updateCamera(dt);
  renderer.render(scene, camera);
}

// ------------------------------------------------------------------ wiring

function buildMissionPicks() {
  const box = $('mission-picks');
  box.innerHTML = '';
  MISSIONS.forEach((m, i) => {
    const b = document.createElement('button');
    b.className = 'mission-pick' + (i === run.missionIndex ? ' sel' : '');
    b.textContent = m.name;
    b.addEventListener('click', () => {
      run.missionIndex = i;
      audio.unlock();
      audio.click();
      resetRun(i);
      buildMissionPicks();
    });
    box.appendChild(b);
  });
}

$('btn-fly').addEventListener('click', () => {
  audio.unlock();
  audio.click();
  resetRun(run.missionIndex);
  showScreen('play');
});
$('btn-resume').addEventListener('click', () => {
  audio.click();
  showScreen('play');
});
$('btn-again').addEventListener('click', () => {
  audio.click();
  resetRun(run.missionIndex);
  showScreen('play');
});
$('btn-next').addEventListener('click', () => {
  audio.click();
  const next = (run.missionIndex + 1) % MISSIONS.length;
  resetRun(next);
  buildMissionPicks();
  showScreen('play');
});
window.addEventListener('keydown', (e) => {
  if (e.code === 'Enter' && run.screen === 'title') $('btn-fly').click();
  if (e.code === 'KeyP' && run.screen === 'pause') showScreen('play');
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    audio.unlock();
  }
});
canvas.addEventListener('pointerdown', () => audio.unlock());

// ------------------------------------------------------------------ start

resetRun(0);
buildMissionPicks();
showScreen('title');

if (SHOT) {
  // Staged screenshot: run the shot, freeze the frame, tell the shooter.
  setTimeout(() => {
    try {
      const missionParam = Number(params.get('mission'));
      if (Number.isInteger(missionParam) && missionParam >= 0 && missionParam < MISSIONS.length) {
        resetRun(missionParam);
      }
      stageShot(SHOT, sim);
      refreshHud();
      // Snap the chase camera onto the plane before freezing the frame,
      // or the shot keeps the title screen's distant orbit view.
      updateCamera(5);
      updateCamera(5);
      updateCamera(5);
      run.frozen = true;
      window.__shotDone = true;
      window.__shotInfo = {
        shot: SHOT,
        mission: run.mission.name,
        screen: run.screen,
        phase: run.phase,
        ringsDone: ringsDone(),
        pos: [flight.pos.x, flight.pos.y, flight.pos.z].map((v) => Math.round(v)),
        speedKt: Math.round(flight.speedKnots),
        altFt: Math.round(flight.altitudeFt),
        grounded: flight.grounded,
        crashed: flight.crashed,
      };
    } catch (err) {
      window.__shotError = String(err && err.stack || err);
    }
  }, 400);
}

requestAnimationFrame(frame);
