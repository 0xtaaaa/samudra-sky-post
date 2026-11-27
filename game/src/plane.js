// Nuri-7, the twin-prop mail plane: a low-poly aircraft built from
// primitives, plus the arcade flight model that flies it. The model is
// forgiving on purpose — this is a mail run, not a simulator — but it still
// stalls if you get slow, still drops if you get careless, and still needs
// the gear down and a gentle descent to land.

import * as THREE from 'three';

// ------------------------------------------------------------------ the mesh

/** Build the Nuri-7 mesh. Returns the group and its moving parts. */
export function buildPlaneMesh() {
  const group = new THREE.Group();
  const cream = new THREE.MeshStandardMaterial({ color: 0xf2e8d5, roughness: 0.55, metalness: 0.15 });
  const red = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5, metalness: 0.2 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2f36, roughness: 0.6, metalness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fd8ef, roughness: 0.15, metalness: 0.55 });

  // Fuselage: a cylinder lying along Z, nose cone, tail taper.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.95, 7.2, 12), cream);
  body.rotation.x = Math.PI / 2;
  group.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.8, 12), red);
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = -4.5;
  group.add(nose);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.95, 2.2, 12), cream);
  tail.rotation.x = Math.PI / 2;
  tail.position.z = 4.7;
  group.add(tail);
  // Red cheatline along the fuselage.
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.17, 1.0, 5.4, 12, 1, true, 0, Math.PI * 2), red);
  stripe.rotation.x = Math.PI / 2;
  stripe.position.set(0, -0.12, -0.6);
  stripe.scale.set(1, 1, 1);
  group.add(stripe);

  // Cockpit windows.
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 0.9), glass);
  windshield.position.set(0, 0.75, -2.6);
  windshield.rotation.x = -0.35;
  group.add(windshield);
  for (let i = 0; i < 3; i++) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.8), glass);
    win.position.set(1.16, 0.35, -1.2 + i * 1.5);
    group.add(win);
    const win2 = win.clone();
    win2.position.x = -1.16;
    group.add(win2);
  }

  // Main wing and tailplane.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(13.5, 0.28, 2.2), cream);
  wing.position.set(0, 0.15, -0.4);
  group.add(wing);
  const wingTipL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 2.2), red);
  wingTipL.position.set(-6.6, 0.15, -0.4);
  group.add(wingTipL);
  const wingTipR = wingTipL.clone();
  wingTipR.position.x = 6.6;
  group.add(wingTipR);
  const tailplane = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.22, 1.5), cream);
  tailplane.position.set(0, 0.55, 4.9);
  group.add(tailplane);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.2, 1.8), red);
  fin.position.set(0, 1.4, 4.9);
  group.add(fin);
  // "NURI-7" on the fin, as a tiny red-on-cream plate is overkill; the tail
  // number rides on the stripe instead: two small white boxes.
  const tailMark = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 1.0), new THREE.MeshStandardMaterial({ color: 0xf2e8d5, roughness: 0.5 }));
  tailMark.position.set(0, 1.5, 4.9);
  group.add(tailMark);

  // Engine nacelles + spinning props.
  const props = [];
  for (const side of [-1, 1]) {
    const nacelle = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 2.4, 10), cream);
    nacelle.rotation.x = Math.PI / 2;
    nacelle.position.set(side * 3.1, -0.15, -0.9);
    group.add(nacelle);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 8), dark);
    hub.rotation.x = Math.PI / 2;
    hub.position.set(side * 3.1, -0.15, -2.25);
    group.add(hub);
    const prop = new THREE.Group();
    prop.position.set(side * 3.1, -0.15, -2.5);
    for (const a of [0, Math.PI / 2]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.6, 0.08), dark);
      blade.rotation.z = a;
      prop.add(blade);
    }
    group.add(prop);
    props.push(prop);
    // A faint disc so the spinning prop reads at speed.
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1.35, 24),
      new THREE.MeshBasicMaterial({ color: 0xdddddd, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false }),
    );
    disc.position.set(side * 3.1, -0.15, -2.5);
    group.add(disc);
  }

  // Landing gear: nose wheel + two mains, in a group that slides down/up.
  const gear = new THREE.Group();
  const strutMat = new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.4, metalness: 0.6 });
  const tyreMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
  for (const [x, z] of [[0, -2.6], [-1.4, 0.6], [1.4, 0.6]]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 6), strutMat);
    strut.position.set(x, -1.35, z);
    gear.add(strut);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10), tyreMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, -1.95, z);
    gear.add(wheel);
  }
  group.add(gear);

  // Navigation lights: red port, green starboard, white tail.
  const lights = [];
  const lamp = (color, x, y, z) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color }));
    m.position.set(x, y, z);
    group.add(m);
    lights.push(m);
  };
  lamp(0xff3b30, -6.8, 0.15, -0.4);
  lamp(0x34e07a, 6.8, 0.15, -0.4);
  lamp(0xffffff, 0, 0.6, 5.9);

  group.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = false;
    }
  });
  return { group, props, gear, lights };
}

// ------------------------------------------------------------------ the model

const G = 9.81;
const KNOTS = 1.94384; // m/s -> knots
const M_TO_FT = 3.28084;

/**
 * The flight model. State is metres, radians and m/s; `step` moves it one
 * tick and reports what happened (flying, landed, crashed).
 */
export class FlightModel {
  constructor() {
    // A harmless default spawn until reset() places the plane on a runway.
    this.reset({ x: 0, y: 100, z: 0, heading: 0 });
  }

  reset(spawn) {
    this.pos = new THREE.Vector3(spawn.x, spawn.y, spawn.z);
    this.heading = spawn.heading;
    this.pitch = 0;
    this.bank = 0;
    this.speed = 0;
    this.throttle = 0;
    this.flaps = false;
    this.gearDown = true;
    this.grounded = true;
    this.vspeed = 0;
    this.crashed = false;
    this.landed = false;
    this.propAngle = 0;
  }

  get speedKnots() {
    return this.speed * KNOTS;
  }

  get altitudeFt() {
    return Math.max(0, this.pos.y * M_TO_FT);
  }

  get headingDeg() {
    return ((this.heading * 180) / Math.PI % 360 + 360) % 360;
  }

  get forward() {
    const cp = Math.cos(this.pitch);
    return new THREE.Vector3(Math.sin(this.heading) * cp, Math.sin(this.pitch), -Math.cos(this.heading) * cp);
  }

  /**
   * One physics tick.
   * @param dt seconds
   * @param input { throttle, pitch, bank } each -1..1 (throttle is a target 0..1 here)
   * @param env { wind: THREE.Vector3, turbulence: number, terrainHeight(x,z), runways, rng }
   * @returns 'flying' | 'landed' | 'crashed' | 'ground'
   */
  step(dt, input, env) {
    if (this.crashed) return 'crashed';
    const stall = this.flaps ? 24 : 30;
    // Flaps cap the top speed; the throttle still sets the speed below that
    // cap, or the plane could never slow down enough to land with flaps out.
    const maxSpeed = Math.min(18 + this.throttle * 68, this.flaps ? 58 : 99);

    // Throttle spools toward the target; speed chases its own target.
    this.throttle += Math.max(-1, Math.min(1, input.throttle - this.throttle)) * Math.min(1, dt * 1.4);
    const target = this.grounded ? 14 + this.throttle * 46 : maxSpeed;
    const accel = this.grounded ? 7 : 5;
    this.speed += Math.max(-accel * dt, Math.min(accel * dt, target - this.speed));

    // Liftoff: fast enough and pulling up. This runs before the pitch ease
    // and the ground-strike check below, so the rotation actually lifts the
    // nose and the liftoff tick is not mistaken for a ground strike.
    if (this.grounded && this.speed > 34 && input.pitch > 0.25) {
      this.grounded = false;
      this.pitch = 0.12;
    }

    // Bank and pitch ease toward the stick.
    const maxBank = 1.05;
    const maxPitch = 0.42;
    this.bank += (input.bank * maxBank - this.bank) * Math.min(1, dt * 2.2);
    const wantPitch = this.grounded ? 0 : input.pitch * maxPitch;
    this.pitch += (wantPitch - this.pitch) * Math.min(1, dt * 2.0);

    // Turbulence shakes the wings a little.
    if (env.turbulence > 0 && !this.grounded) {
      this.bank += (env.rng() - 0.5) * env.turbulence * dt * 2.2;
      this.pitch += (env.rng() - 0.5) * env.turbulence * dt * 0.9;
    }

    // A coordinated turn: bank makes heading change.
    const turnRate = (G * Math.tan(this.bank)) / Math.max(22, this.speed);
    this.heading += turnRate * dt;

    // Climb and sink: vertical speed comes from pitch, less a stall sink.
    let vy = this.speed * Math.sin(this.pitch);
    if (!this.grounded && this.speed < stall) {
      // Stalling: the nose drops and she sinks.
      vy -= (stall - this.speed) * 1.1;
      this.pitch += (0 - this.pitch) * Math.min(1, dt * 0.8) - 0.25 * dt;
    }
    if (this.grounded) vy = 0;
    this.vspeed = vy;

    const fwd = this.forward;
    this.pos.x += (fwd.x * this.speed + env.wind.x) * dt;
    this.pos.y += vy * dt + env.wind.y * dt;
    this.pos.z += (fwd.z * this.speed + env.wind.z) * dt;

    const ground = env.terrainHeight(this.pos.x, this.pos.z);
    const clearance = this.pos.y - ground;

    if (!this.grounded) {
      // Touching the ground while airborne: landing or crash? A plane that
      // has just lifted off sits at clearance 1.6 and is climbing away, so
      // only a descent (or flying below the surface) counts as a strike.
      if (clearance <= 1.6 && (vy <= 0 || clearance <= 0)) {
        // Touching the ground while airborne: landing or crash?
        const rw = this.runwayUnder(env.runways);
        const gentle = this.vspeed > -4.5 && this.speed < 48;
        if (rw && gentle && this.gearDown) {
          this.grounded = true;
          this.landed = true;
          this.pos.y = ground + 1.6;
          this.pitch = 0;
          this.bank *= 0.3;
          return 'landed';
        }
        if (rw && gentle && !this.gearDown) {
          this.crashed = true;
          return 'crashed';
        }
        this.crashed = true;
        return 'crashed';
      }
    } else {
      // Rolling: stay on the ground, bleed speed when the throttle is low.
      this.pos.y = ground + 1.6;
      if (this.throttle < 0.25) this.speed = Math.max(0, this.speed - 9 * dt);
      // Gentle steering on the ground.
      this.heading += input.bank * 0.35 * dt * Math.min(1, this.speed / 20);
      if (this.speed < 0.5) return 'ground';
    }
    return this.grounded ? 'ground' : 'flying';
  }

  /** The runway under the plane, if it is over one and roughly aligned. */
  runwayUnder(runways) {
    for (const rw of runways) {
      const dx = this.pos.x - rw.center.x;
      const dz = this.pos.z - rw.center.z;
      const along = dx * Math.sin(rw.heading) + dz * Math.cos(rw.heading);
      const across = dx * Math.cos(rw.heading) - dz * Math.sin(rw.heading);
      if (Math.abs(along) < rw.length / 2 && Math.abs(across) < rw.width / 2 + 6) {
        return rw;
      }
    }
    return null;
  }
}
