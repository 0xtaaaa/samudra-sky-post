import * as THREE from 'three';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Builds the cockpit geometry mounted relative to the pilot's eye point.
 * Pilot eye in plane coordinates is approximately (0, 1.15, -1.6).
 * Looking forward along -Z (in plane local space).
 *
 * Contains:
 * - dark instrument panel
 * - six round gauges with bezels and lit needles (airspeed, altimeter, vertical speed, turn coordinator, fuel, RPM)
 * - a glare shield
 * - two window struts
 * - spinning propeller disc
 */
export function buildCockpit() {
  const group = new THREE.Group();

  // Dark materials for interior structure
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x181a1f,
    roughness: 0.8,
    metalness: 0.2,
  });
  const glareMat = new THREE.MeshStandardMaterial({
    color: 0x0d0e11,
    roughness: 0.9,
    metalness: 0.1,
  });
  const bezelMat = new THREE.MeshStandardMaterial({
    color: 0x3a3f47,
    roughness: 0.4,
    metalness: 0.8,
  });
  const dialMat = new THREE.MeshBasicMaterial({
    color: 0x080b0e,
  });
  const strutMat = new THREE.MeshStandardMaterial({
    color: 0x242830,
    roughness: 0.7,
    metalness: 0.3,
  });
  const needleMat = new THREE.MeshBasicMaterial({
    color: 0xffa033, // Lit warm amber/orange
  });
  const needleWhiteMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });

  // 1. Instrument Panel: positioned in front and slightly down from eye (0, 0, 0)
  // Eye is at (0, 0, 0) in cockpit group space, facing -Z.
  const panelZ = -0.72;
  const panelY = -0.26;
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(1.22, 0.48, 0.04),
    panelMat,
  );
  panel.position.set(0, panelY, panelZ);
  panel.rotation.x = 0.08; // slightly tilted back towards pilot
  group.add(panel);

  // Lower dash bulkhead/surround
  const lowerBulkhead = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.4, 0.2),
    panelMat,
  );
  lowerBulkhead.position.set(0, panelY - 0.32, panelZ + 0.05);
  group.add(lowerBulkhead);

  // 2. Glare shield: dark overhang right above the panel
  const glareShield = new THREE.Mesh(
    new THREE.BoxGeometry(1.26, 0.04, 0.22),
    glareMat,
  );
  glareShield.position.set(0, panelY + 0.24, panelZ + 0.08);
  glareShield.rotation.x = -0.05;
  group.add(glareShield);

  // Glare lip
  const glareLip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 1.26, 12),
    glareMat,
  );
  glareLip.rotation.z = Math.PI / 2;
  glareLip.position.set(0, panelY + 0.23, panelZ + 0.18);
  group.add(glareLip);

  // 3. Two window struts (canopy A-pillars left and right)
  const strutL = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.7, 0.05),
    strutMat,
  );
  strutL.position.set(-0.52, 0.06, -0.62);
  strutL.rotation.z = -0.32;
  strutL.rotation.x = 0.42;
  group.add(strutL);

  const strutR = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.7, 0.05),
    strutMat,
  );
  strutR.position.set(0.52, 0.06, -0.62);
  strutR.rotation.z = 0.32;
  strutR.rotation.x = 0.42;
  group.add(strutR);

  // Top canopy bar connecting struts
  const topBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.035, 0.04),
    strutMat,
  );
  topBar.position.set(0, 0.32, -0.48);
  group.add(topBar);

  // 4. Six round gauges with bezels and lit needles:
  // Six standard instruments:
  // Top row: airspeed, altimeter, vertical speed
  // Bottom row: turn coordinator, fuel, RPM
  const gauges = {};
  const gaugeConfigs = [
    { key: 'speed', x: -0.34, y: panelY + 0.10, radius: 0.075 },
    { key: 'alt',   x: 0.0,   y: panelY + 0.10, radius: 0.075 },
    { key: 'vsi',   x: 0.34,  y: panelY + 0.10, radius: 0.075 },
    { key: 'turn',  x: -0.34, y: panelY - 0.10, radius: 0.075 },
    { key: 'fuel',  x: 0.0,   y: panelY - 0.10, radius: 0.075 },
    { key: 'rpm',   x: 0.34,  y: panelY - 0.10, radius: 0.075 },
  ];

  gaugeConfigs.forEach((cfg) => {
    const gaugeGroup = new THREE.Group();
    // Position on front face of tilted panel
    gaugeGroup.position.set(cfg.x, cfg.y, panelZ + 0.022);
    gaugeGroup.rotation.x = 0.08;

    // Bezel ring
    const bezel = new THREE.Mesh(
      new THREE.RingGeometry(cfg.radius * 0.88, cfg.radius * 1.14, 32),
      bezelMat,
    );
    gaugeGroup.add(bezel);

    // Dark dial face
    const dial = new THREE.Mesh(
      new THREE.CircleGeometry(cfg.radius * 0.9, 32),
      dialMat,
    );
    dial.position.z = 0.001;
    gaugeGroup.add(dial);

    // Bezel outer lip for 3D depth
    const bezelLip = new THREE.Mesh(
      new THREE.CylinderGeometry(cfg.radius * 1.12, cfg.radius * 1.12, 0.015, 32, 1, true),
      bezelMat,
    );
    bezelLip.rotation.x = Math.PI / 2;
    bezelLip.position.z = 0.007;
    gaugeGroup.add(bezelLip);

    // Dial tick marks / markings
    const tickMat = new THREE.MeshBasicMaterial({ color: 0x98b8c8 });
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const tick = new THREE.Mesh(
        new THREE.PlaneGeometry(0.003, cfg.radius * 0.22),
        tickMat,
      );
      tick.position.set(
        Math.sin(angle) * (cfg.radius * 0.72),
        Math.cos(angle) * (cfg.radius * 0.72),
        0.002,
      );
      tick.rotation.z = -angle;
      gaugeGroup.add(tick);
    }

    // Lit needle
    const needlePivot = new THREE.Group();
    needlePivot.position.set(0, 0, 0.004);

    const needleGeom = new THREE.BufferGeometry();
    const halfBase = 0.005;
    const length = cfg.radius * 0.82;
    const verts = new Float32Array([
      -halfBase, 0, 0,
      halfBase, 0, 0,
      0, length, 0,
      // Counter-balance tail
      -halfBase * 0.8, 0, 0,
      halfBase * 0.8, 0, 0,
      0, -length * 0.25, 0,
    ]);
    needleGeom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    const needle = new THREE.Mesh(
      needleGeom,
      cfg.key === 'turn' ? needleWhiteMat : needleMat,
    );
    needlePivot.add(needle);

    // Center hub cap
    const cap = new THREE.Mesh(
      new THREE.CircleGeometry(0.012, 16),
      bezelMat,
    );
    cap.position.z = 0.005;
    needlePivot.add(cap);

    gaugeGroup.add(needlePivot);
    group.add(gaugeGroup);

    gauges[cfg.key] = needlePivot;
  });

  // 5. Spinning propeller disc visible through windscreen
  // Twin prop engines sit at x = -3.1 and x = +3.1, or nose prop disc ahead at z ~ -2.4.
  // In pilot view, a spinning prop disc forward-center / forward-sides gives strong cockpit immersion.
  const propDiscMat = new THREE.MeshBasicMaterial({
    color: 0xddeeff,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const propDiscs = new THREE.Group();
  // Nose / twin props visible out the windscreen
  const discLeft = new THREE.Mesh(new THREE.CircleGeometry(1.3, 32), propDiscMat);
  discLeft.position.set(-3.1, -1.3, -1.6);
  propDiscs.add(discLeft);

  const discRight = new THREE.Mesh(new THREE.CircleGeometry(1.3, 32), propDiscMat);
  discRight.position.set(3.1, -1.3, -1.6);
  propDiscs.add(discRight);

  // Central forward spinning propeller blur disc ahead of nose
  const discCenter = new THREE.Mesh(new THREE.CircleGeometry(1.15, 32), propDiscMat);
  discCenter.position.set(0, -0.4, -2.6);
  propDiscs.add(discCenter);

  // Cross blades on the prop blur for spinning motion
  const bladeMat = new THREE.MeshBasicMaterial({
    color: 0x22262a,
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const blades = new THREE.Group();
  const b1 = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 2.3), bladeMat);
  const b2 = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.12), bladeMat);
  blades.position.set(0, -0.4, -2.59);
  blades.add(b1);
  blades.add(b2);
  propDiscs.add(blades);

  group.add(propDiscs);

  group.userData = {
    gauges,
    propDiscs,
    blades,
  };

  return group;
}

/**
 * Moves the needles in `group` according to state `s`.
 * Values are clamped to realistic instrument ranges.
 * @param {THREE.Group} group
 * @param {{speed?: number, alt?: number, vsi?: number, turn?: number, fuel?: number, rpm?: number}} s
 */
export function setCockpitGauges(group, s = {}) {
  if (!group || !group.userData || !group.userData.gauges) return;
  const g = group.userData.gauges;

  // 1. Airspeed (0 to 140 knots): 0 at bottom/top, sweeping ~300 degrees
  if (g.speed) {
    const speed = clamp(s.speed ?? 0, 0, 140);
    // 0 kt -> 2.2 rad, 140 kt -> -2.6 rad (clockwise rotation)
    const angle = 2.2 - (speed / 140) * 4.8;
    g.speed.rotation.z = angle;
  }

  // 2. Altimeter (0 to 10,000 ft): 1 revolution = 1000 ft or full sweep for scale
  if (g.alt) {
    const alt = clamp(s.alt ?? 0, 0, 10000);
    // Standard altimeter needle 1 rev per 1000 ft
    const angle = -(alt % 1000) / 1000 * Math.PI * 2;
    g.alt.rotation.z = angle;
  }

  // 3. Vertical Speed Indicator (-2000 to +2000 fpm): 0 is horizontal (PI/2 or 0)
  if (g.vsi) {
    const vsi = clamp(s.vsi ?? 0, -2000, 2000);
    // 0 fpm = horizontal left (Math.PI / 2), climb up (+), descent down (-)
    // needle at rest = Math.PI / 2
    const angle = Math.PI / 2 - (vsi / 2000) * (Math.PI * 0.85);
    g.vsi.rotation.z = angle;
  }

  // 4. Turn Coordinator (-1 to +1 bank/turn rate)
  if (g.turn) {
    const turn = clamp(s.turn ?? 0, -1, 1);
    // -1 (bank left) -> +0.7 rad, +1 (bank right) -> -0.7 rad
    const angle = -turn * 0.75;
    g.turn.rotation.z = angle;
  }

  // 5. Fuel (0 to 1.0): Empty (left/bottom) to Full (right/top)
  if (g.fuel) {
    const fuel = clamp(s.fuel ?? 0, 0, 1);
    // 0 = empty (~ 1.4 rad), 1 = full (~ -1.4 rad)
    const angle = 1.4 - fuel * 2.8;
    g.fuel.rotation.z = angle;
  }

  // 6. RPM (0 to 3000 RPM or 0 to 1 throttle normalized):
  if (g.rpm) {
    let rpmVal = s.rpm ?? 0;
    // If given as 0..1 ratio, scale to 0..3000 RPM
    if (rpmVal <= 1.0 && rpmVal >= 0) {
      rpmVal = rpmVal * 2800;
    }
    const rpm = clamp(rpmVal, 0, 3200);
    // 0 RPM -> 2.1 rad, 3000 RPM -> -2.5 rad
    const angle = 2.1 - (rpm / 3200) * 4.6;
    g.rpm.rotation.z = angle;
  }
}
