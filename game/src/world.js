// The world of Kepulauan Samudra: procedural islands, ocean, sky, runways,
// mail rings and the little things that make it a place (palms, huts, a
// volcano, a lighthouse). Everything is built from one seed, so the same
// seed always builds the same world — and the terrain height function here
// is the same one the flight model asks about, so what you see is what you
// can hit.

import * as THREE from 'three';
import { makeRng } from './rng.js';

// ------------------------------------------------------------------ noise

/** A deterministic 2D value-noise field from a seed. */
function makeNoise(seed) {
  const hash = (ix, iz) => {
    let h = (ix * 374761393 + iz * 668265263 + seed * 974634211) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (((h ^ (h >>> 16)) >>> 0) % 10000) / 10000;
  };
  const smooth = (t) => t * t * (3 - 2 * t);
  const at = (x, z) => {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    const fx = x - ix;
    const fz = z - iz;
    const a = hash(ix, iz);
    const b = hash(ix + 1, iz);
    const c = hash(ix, iz + 1);
    const d = hash(ix + 1, iz + 1);
    const u = smooth(fx);
    const v = smooth(fz);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  return (x, z) => {
    // Three octaves of value noise, roughly -1..1, centred on 0.5.
    const n =
      0.55 * at(x * 0.0016, z * 0.0016) +
      0.3 * at(x * 0.004 + 13.7, z * 0.004 + 7.1) +
      0.15 * at(x * 0.011 + 41.3, z * 0.011 + 29.9);
    return n;
  };
}

// ------------------------------------------------------------------ layout

/** The islands, fixed in shape, jittered by the seed. */
function islandLayout(rng) {
  const j = (v) => v + rng.range(-90, 90);
  return [
    { name: 'Pulau Samudra', x: j(0), z: j(0), r: 950, h: 120, volcano: false },
    { name: 'Pulau Karang', x: j(1900), z: j(-1250), r: 620, h: 95, volcano: false },
    { name: 'Gunung Api', x: j(-1700), z: j(1500), r: 720, h: 300, volcano: true },
    { name: 'Pulau Palem', x: j(1000), z: j(1950), r: 380, h: 70, volcano: false },
    { name: 'Batu Karang', x: j(-2300), z: j(-900), r: 260, h: 55, volcano: false },
    { name: 'Pulau Kecil', x: j(2400), z: j(900), r: 240, h: 45, volcano: false },
  ];
}

// ------------------------------------------------------------------ helpers

/** A soft radial glow texture, drawn once on a canvas, for halos and lamps. */
function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A tiny palm: trunk, fronds and a coconut or two. */
function makePalm(rng) {
  const g = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a6b48, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f8f4e, roughness: 0.8 });
  const h = rng.range(7, 11);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, h, 6), trunkMat);
  trunk.position.y = h / 2;
  trunk.rotation.z = rng.range(-0.12, 0.12);
  g.add(trunk);
  for (let i = 0; i < 6; i++) {
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4.2, 4), leafMat);
    const a = (i / 6) * Math.PI * 2 + rng.range(-0.2, 0.2);
    frond.position.set(Math.cos(a) * 1.6, h + 0.6, Math.sin(a) * 1.6);
    frond.rotation.z = Math.cos(a) * 1.15;
    frond.rotation.x = -Math.sin(a) * 1.15;
    g.add(frond);
  }
  const nut = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 6, 5),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 }),
  );
  nut.position.set(0.5, h + 0.2, 0.3);
  g.add(nut);
  return g;
}

/** A stilt hut: box, pyramid roof, little stilts. */
function makeHut(rng) {
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: 0xc9a06a, roughness: 0.9 });
  const roof = new THREE.MeshStandardMaterial({ color: 0xa44a2e, roughness: 0.85 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 4), wall);
  body.position.y = 2.2;
  g.add(body);
  const top = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.6, 4), roof);
  top.position.y = 5;
  top.rotation.y = Math.PI / 4;
  g.add(top);
  for (const [sx, sz] of [[-2, -1.5], [2, -1.5], [-2, 1.5], [2, 1.5]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.4, 5), wall);
    leg.position.set(sx, 0.7, sz);
    g.add(leg);
  }
  return g;
}

// ------------------------------------------------------------------ the world

/**
 * Build the whole world into `scene` for one mission's time of day.
 * Returns the live world: terrain height, runways, rings and an update step.
 */
export function createWorld(scene, seed, mission) {
  const rng = makeRng(seed);
  const noise = makeNoise(seed);
  const islands = islandLayout(rng);
  const glowTex = makeGlowTexture();

  const time = mission.timeOfDay; // 'dawn' | 'day' | 'dusk' | 'storm'
  const palette = {
    dawn: { sky: 0x87b5d6, fog: 0x9fbdd4, sun: 0xffd9a0, sunPos: [2600, 420, -1800], hemi: 0.75, sunI: 1.5 },
    day: { sky: 0x7fc4ea, fog: 0xa8d4ee, sun: 0xfff3d0, sunPos: [1800, 2600, -1200], hemi: 0.9, sunI: 1.9 },
    dusk: { sky: 0xc97e4e, fog: 0xd89a6a, sun: 0xff9a4d, sunPos: [-2400, 260, 1600], hemi: 0.55, sunI: 1.2 },
    storm: { sky: 0x5a6b78, fog: 0x6b7d8c, sun: 0xcfd8de, sunPos: [1200, 1800, -2000], hemi: 0.45, sunI: 0.8 },
  }[time];

  scene.background = new THREE.Color(palette.sky);
  scene.fog = new THREE.Fog(palette.fog, 1200, 9000);

  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x3a5a3a, palette.hemi);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(palette.sun, palette.sunI);
  sun.position.set(...palette.sunPos);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 1024;
  sun.shadow.mapSize.height = 1024;
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 8000;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  const amb = new THREE.AmbientLight(0xffffff, 0.18);
  scene.add(amb);

  // Sun disc, so the light has a face in the sky.
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(180, 32),
    new THREE.MeshBasicMaterial({ color: palette.sun, fog: false }),
  );
  sunDisc.position.set(palette.sunPos[0] * 2.4, palette.sunPos[1] * 2.4 + 300, palette.sunPos[2] * 2.4);
  sunDisc.lookAt(0, 0, 0);
  scene.add(sunDisc);
  const sunGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: glowTex, color: palette.sun, transparent: true, opacity: 0.85, fog: false, depthWrite: false }),
  );
  sunGlow.scale.set(1400, 1400, 1);
  sunGlow.position.copy(sunDisc.position);
  scene.add(sunGlow);

  // ---------------------------------------------------------- terrain height
  // The airstrips sit on levelled aprons: the raw island is a ridge, so a
  // flat runway mesh would float above the slope at one end and bury itself
  // at the other. The height blends to each strip's elevation inside its
  // footprint and feathers back to the raw terrain over a few hundred metres.
  const runwaySpecs = [
    { name: 'Samudra Field', cx: 60, cz: 60, headingDeg: 90, length: 620, width: 34 },
    { name: 'Karang Strip', cx: 1900, cz: -1250, headingDeg: 35, length: 480, width: 30 },
  ];
  for (const rw of runwaySpecs) {
    const h = (rw.headingDeg * Math.PI) / 180;
    rw.ax = Math.sin(h);
    rw.az = Math.cos(h);
    rw.px = Math.cos(h);
    rw.pz = -Math.sin(h);
    rw.elev = rawHeight(rw.cx, rw.cz);
  }

  function terrainHeight(x, z) {
    let h = rawHeight(x, z);
    for (const rw of runwaySpecs) {
      const dx = x - rw.cx;
      const dz = z - rw.cz;
      const u = dx * rw.ax + dz * rw.az; // along the strip
      const v = dx * rw.px + dz * rw.pz; // across the strip
      const du = Math.max(0, Math.abs(u) - (rw.length / 2 + 60)) / 250;
      const dv = Math.max(0, Math.abs(v) - (rw.width / 2 + 50)) / 100;
      const t = Math.min(1, Math.max(du, dv));
      if (t >= 1) continue;
      const w = 1 - (3 * t * t - 2 * t * t * t); // smoothstep falloff
      h = h * (1 - w) + rw.elev * w;
    }
    return h;
  }

  function rawHeight(x, z) {
    let h = -14; // the sea floor, below the waterline
    for (const is of islands) {
      const dx = (x - is.x) / is.r;
      const dz = (z - is.z) / is.r;
      const d2 = dx * dx + dz * dz;
      if (d2 > 2.2) continue;
      const bump = Math.exp(-d2 * 1.6);
      const detail = 0.55 + 0.45 * noise(x, z);
      let hh = is.h * bump * detail;
      if (is.volcano) {
        // A steep cone with a crater dip on top.
        const d = Math.sqrt(d2);
        hh = Math.max(hh, is.h * Math.max(0, 1 - d * 1.15) * 1.25);
        if (d < 0.16) hh -= (0.16 - d) * 220;
      }
      h = Math.max(h, hh);
    }
    // Gentle swell far from land, never above the waterline.
    h += (noise(x * 0.5 + 500, z * 0.5 + 500) - 0.5) * 2;
    return h;
  }

  // Terrain mesh, vertex-coloured by height and slope.
  const SIZE = 6800;
  const SEG = 150;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const sand = new THREE.Color(0xd9c08a);
  const grass = new THREE.Color(0x4f9e4d);
  const deepGrass = new THREE.Color(0x2f7d3a);
  const rock = new THREE.Color(0x8a7f74);
  const dark = new THREE.Color(0x4a3f38);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = terrainHeight(x, z);
    pos.setY(i, h);
    if (h < 3) tmp.copy(sand);
    else if (h < 80) tmp.copy(grass).lerp(deepGrass, Math.min(1, h / 120));
    else if (h < 120) tmp.copy(deepGrass).lerp(rock, (h - 80) / 40);
    else tmp.copy(rock).lerp(dark, Math.min(1, (h - 120) / 160));
    // A little noise in the colour so the ground is not flat-shaded.
    const n = 0.92 + 0.16 * noise(x * 3 + 9, z * 3 + 4);
    colors[i * 3] = tmp.r * n;
    colors[i * 3 + 1] = tmp.g * n;
    colors[i * 3 + 2] = tmp.b * n;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const terrain = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }),
  );
  terrain.receiveShadow = true;
  scene.add(terrain);

  // Ocean: one big plane at the waterline, faintly transparent.
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(14000, 14000),
    new THREE.MeshPhongMaterial({ color: time === 'dusk' ? 0x2a5f7e : 0x1565a0, transparent: true, opacity: 0.93, shininess: 140, specular: 0x99ccff }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.y = 0;
  scene.add(ocean);

  // ---------------------------------------------------------- clouds
  const clouds = [];
  const cloudMat = new THREE.MeshStandardMaterial({
    color: time === 'storm' ? 0x8b98a5 : 0xffffff,
    roughness: 1,
    transparent: true,
    opacity: time === 'storm' ? 0.92 : 0.82,
  });
  const cloudCount = time === 'storm' ? 34 : 22;
  for (let i = 0; i < cloudCount; i++) {
    const cl = new THREE.Group();
    const puffs = rng.int(3, 5);
    for (let p = 0; p < puffs; p++) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(rng.range(28, 70), 10, 8), cloudMat);
      s.position.set(rng.range(-70, 70), rng.range(-8, 10), rng.range(-30, 30));
      s.scale.y = 0.42;
      cl.add(s);
    }
    cl.position.set(rng.range(-3200, 3200), rng.range(260, 520), rng.range(-3200, 3200));
    scene.add(cl);
    clouds.push({ g: cl, speed: rng.range(2, 6) });
  }

  // ---------------------------------------------------------- runways
  function makeRunway(name, cx, cz, headingDeg, length, width) {
    const g = new THREE.Group();
    const heading = (headingDeg * Math.PI) / 180;
    const asphalt = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.6, length),
      new THREE.MeshStandardMaterial({ color: 0x2e3238, roughness: 0.9 }),
    );
    asphalt.position.y = 0.3;
    g.add(asphalt);
    // Centreline dashes.
    const dashMat = new THREE.MeshStandardMaterial({ color: 0xf2f2e8, roughness: 0.7 });
    for (let d = -length / 2 + 24; d < length / 2 - 10; d += 34) {
      const dash = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 16), dashMat);
      dash.position.set(0, 0.7, d);
      g.add(dash);
    }
    // Threshold bars.
    for (const end of [-1, 1]) {
      for (let s = -2; s <= 2; s++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, 8), dashMat);
        bar.position.set(s * 4.4, 0.7, end * (length / 2 - 10));
        g.add(bar);
      }
    }
    // Edge lights, warm amber, with a glow sprite each.
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
    for (let d = -length / 2 + 12; d <= length / 2 - 12; d += 48) {
      for (const s of [-1, 1]) {
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 6), lampMat);
        lamp.position.set(s * (width / 2 + 3), 1.4, d);
        g.add(lamp);
        const glow = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: glowTex, color: 0xffb347, transparent: true, opacity: 0.75, depthWrite: false }),
        );
        glow.scale.set(9, 9, 1);
        glow.position.copy(lamp.position);
        g.add(glow);
      }
    }
    // Windsock on a pole beside the threshold.
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 9, 6),
      new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.6 }),
    );
    pole.position.set(width / 2 + 12, 4.5, -length / 2 + 18);
    g.add(pole);
    const sock = new THREE.Mesh(
      new THREE.ConeGeometry(1.5, 5, 8),
      new THREE.MeshStandardMaterial({ color: 0xff7a3d, roughness: 0.7 }),
    );
    sock.rotation.z = Math.PI / 2;
    sock.position.set(width / 2 + 15, 8.6, -length / 2 + 18);
    g.add(sock);
    g.position.set(cx, terrainHeight(cx, cz) + 0.4, cz);
    g.rotation.y = heading;
    scene.add(g);
    return {
      name,
      center: new THREE.Vector3(cx, terrainHeight(cx, cz) + 0.8, cz),
      heading,
      length,
      width,
      group: g,
      sock,
    };
  }

  const runwayA = makeRunway('Samudra Field', 60, 60, 90, 620, 34);
  const runwayB = makeRunway('Karang Strip', 1900, -1250, 35, 480, 30);

  // ---------------------------------------------------------- props
  const props = new THREE.Group();
  scene.add(props);
  function scatterOnLand(count, place) {
    let put = 0;
    let tries = 0;
    while (put < count && tries < count * 40) {
      tries++;
      const x = rng.range(-2800, 2800);
      const z = rng.range(-2800, 2800);
      const h = terrainHeight(x, z);
      if (h < 4 || h > 60) continue;
      // Keep the runways clear.
      let clear = true;
      for (const rw of [runwayA, runwayB]) {
        const dx = x - rw.center.x;
        const dz = z - rw.center.z;
        const along = Math.abs(dx * Math.sin(rw.heading) + dz * Math.cos(rw.heading));
        const across = Math.abs(dx * Math.cos(rw.heading) - dz * Math.sin(rw.heading));
        if (along < rw.length / 2 + 40 && across < rw.width / 2 + 40) clear = false;
      }
      if (!clear) continue;
      place(x, h, z);
      put++;
    }
  }
  scatterOnLand(90, (x, h, z) => {
    const palm = makePalm(rng);
    palm.position.set(x, h - 0.3, z);
    palm.rotation.y = rng.range(0, Math.PI * 2);
    props.add(palm);
  });
  scatterOnLand(14, (x, h, z) => {
    const hut = makeHut(rng);
    hut.position.set(x, h, z);
    hut.rotation.y = rng.range(0, Math.PI * 2);
    props.add(hut);
  });

  // Volcano smoke: a column of slow grey sprites above Gunung Api.
  const smoke = [];
  const smokeMat = new THREE.SpriteMaterial({ map: glowTex, color: 0x9aa0a6, transparent: true, opacity: 0.4, depthWrite: false });
  for (let i = 0; i < 10; i++) {
    const s = new THREE.Sprite(smokeMat);
    const sc = 40 + i * 12;
    s.scale.set(sc, sc, 1);
    s.position.set(-1700 + rng.range(-30, 30), 300 + i * 22, 1500 + rng.range(-30, 30));
    scene.add(s);
    smoke.push(s);
  }

  // Lighthouse on Batu Karang, lamp turning slowly.
  const lightHouse = new THREE.Group();
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(4, 5.5, 34, 10),
    new THREE.MeshStandardMaterial({ color: 0xf2ede2, roughness: 0.8 }),
  );
  tower.position.y = 17;
  lightHouse.add(tower);
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(4.4, 4.4, 5, 10),
    new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.8 }),
  );
  band.position.y = 20;
  lightHouse.add(band);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(3, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0 }),
  );
  lamp.position.y = 36;
  lightHouse.add(lamp);
  const beamPivot = new THREE.Group();
  beamPivot.position.y = 36;
  lightHouse.add(beamPivot);
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(26, 190, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.rotation.z = Math.PI / 2;
  beam.position.set(95, 0, 0);
  beamPivot.add(beam);
  lightHouse.position.set(-2300, terrainHeight(-2300, -900), -900);
  scene.add(lightHouse);

  // Buoys bobbing in the water along the mail lane.
  const buoys = [];
  const buoyMat = new THREE.MeshStandardMaterial({ color: 0xff7a3d, roughness: 0.7 });
  for (let i = 0; i < 12; i++) {
    const b = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4.5, 8), buoyMat);
    const t = i / 11;
    b.position.set(-400 + t * 2600 + rng.range(-60, 60), 1.5, -600 + t * 500 + rng.range(-60, 60));
    scene.add(b);
    buoys.push(b);
  }

  // ---------------------------------------------------------- rings
  /** Build a ring course: `points` are [x, y, z] waypoints; rings face the next one. */
  function makeRings(points, radius) {
    const rings = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const next = points[(i + 1) % points.length];
      const g = new THREE.Group();
      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 1.7, 10, 40),
        new THREE.MeshBasicMaterial({ color: 0xffb347 }),
      );
      g.add(torus);
      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: glowTex, color: 0xffb347, transparent: true, opacity: 0.5, depthWrite: false }),
      );
      halo.scale.set(radius * 2.8, radius * 2.8, 1);
      g.add(halo);
      g.position.set(p[0], p[1], p[2]);
      g.lookAt(next[0], next[1], next[2]);
      scene.add(g);
      rings.push({ group: g, torus, halo, pos: new THREE.Vector3(p[0], p[1], p[2]), radius, passed: false });
    }
    return rings;
  }

  function setRingState(ring, state) {
    // 'next' amber and bright, 'passed' green and dim, 'idle' soft amber.
    ring.passed = state === 'passed';
    const color = state === 'passed' ? 0x58d68d : state === 'next' ? 0xffb347 : 0xc98a3d;
    ring.torus.material.color.setHex(color);
    ring.halo.material.color.setHex(color);
    // Passed rings keep only the green torus: their glow washed out the
    // frame whenever one sat near the edge of the chase camera's view.
    ring.halo.material.opacity = state === 'next' ? 0.65 : state === 'passed' ? 0 : 0.3;
  }

  // ---------------------------------------------------------- update
  let elapsed = 0;
  function update(dt) {
    elapsed += dt;
    for (const c of clouds) {
      c.g.position.x += c.speed * dt;
      if (c.g.position.x > 3400) c.g.position.x = -3400;
    }
    for (let i = 0; i < smoke.length; i++) {
      const s = smoke[i];
      s.position.y += dt * 3;
      s.material.opacity = 0.42 - (i / smoke.length) * 0.25;
      if (s.position.y > 540) s.position.y = 300;
    }
    beamPivot.rotation.y = elapsed * 0.5;
    for (let i = 0; i < buoys.length; i++) {
      buoys[i].position.y = 1.5 + Math.sin(elapsed * 0.9 + i * 1.3) * 0.7;
      buoys[i].rotation.z = Math.sin(elapsed * 0.7 + i) * 0.12;
    }
    ocean.position.y = Math.sin(elapsed * 0.4) * 0.25;
  }

  return { terrainHeight, runways: [runwayA, runwayB], makeRings, setRingState, update, islands };
}
