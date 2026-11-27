import * as THREE from 'three';

function createPseudoRandom(seed = 1337) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export class TerrainDetailSystem {
  constructor(scene, runwayPlacements = [], seed = 42) {
    this.scene = scene;
    this.runways = runwayPlacements;
    this.seed = seed;
    this.random = createPseudoRandom(seed);

    this.group = new THREE.Group();
    this.windsocks = [];
    this.papiLights = [];

    this.buildInstancedFloraAndHuts();
    this.buildRunwayFixtures();
    this.scene.add(this.group);
  }

  buildInstancedFloraAndHuts() {
    const palmCount = 140;
    const trunkGeom = new THREE.CylinderGeometry(0.3, 0.5, 6, 6);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6e5234 });
    const palmMesh = new THREE.InstancedMesh(trunkGeom, trunkMat, palmCount);

    const hutCount = 35;
    const hutGeom = new THREE.BoxGeometry(4.5, 3.2, 4.5);
    const hutMat = new THREE.MeshLambertMaterial({ color: 0x8b7355 });
    const hutMesh = new THREE.InstancedMesh(hutGeom, hutMat, hutCount);

    const postCount = 60;
    const postGeom = new THREE.CylinderGeometry(0.12, 0.12, 2.5, 5);
    const postMat = new THREE.MeshLambertMaterial({ color: 0xddaa22 });
    const postMesh = new THREE.InstancedMesh(postGeom, postMat, postCount);

    const dummy = new THREE.Object3D();

    for (let i = 0; i < palmCount; i++) {
      const rx = (this.random() - 0.5) * 1600;
      const rz = (this.random() - 0.5) * 1600;
      const scale = 0.8 + this.random() * 0.6;
      dummy.position.set(rx, 3 * scale, rz);
      dummy.rotation.set((this.random() - 0.5) * 0.15, this.random() * Math.PI * 2, (this.random() - 0.5) * 0.15);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      palmMesh.setMatrixAt(i, dummy.matrix);
    }
    palmMesh.instanceMatrix.needsUpdate = true;
    this.group.add(palmMesh);

    for (let i = 0; i < hutCount; i++) {
      const hx = (this.random() - 0.5) * 1400;
      const hz = (this.random() - 0.5) * 1400;
      dummy.position.set(hx, 1.6, hz);
      dummy.rotation.set(0, this.random() * Math.PI * 2, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      hutMesh.setMatrixAt(i, dummy.matrix);
    }
    hutMesh.instanceMatrix.needsUpdate = true;
    this.group.add(hutMesh);

    for (let i = 0; i < postCount; i++) {
      const px = (this.random() - 0.5) * 1800;
      const pz = (this.random() - 0.5) * 1800;
      dummy.position.set(px, 1.25, pz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      postMesh.setMatrixAt(i, dummy.matrix);
    }
    postMesh.instanceMatrix.needsUpdate = true;
    this.group.add(postMesh);
  }

  buildRunwayFixtures() {
    const list = this.runways.length > 0 ? this.runways : [{ position: new THREE.Vector3(0, 0, 0), heading: 0 }];

    for (const rwy of list) {
      const basePos = rwy.position || new THREE.Vector3(0, 0, 0);
      const angle = rwy.heading || 0;

      // Windsock assembly
      const sockGroup = new THREE.Group();
      sockGroup.position.copy(basePos).add(new THREE.Vector3(26 * Math.cos(angle + 1.57), 0, 26 * Math.sin(angle + 1.57)));

      const poleGeom = new THREE.CylinderGeometry(0.12, 0.15, 6, 6);
      const poleMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });
      const pole = new THREE.Mesh(poleGeom, poleMat);
      pole.position.y = 3;
      sockGroup.add(pole);

      const coneGeom = new THREE.ConeGeometry(0.55, 2.8, 8, 1, true);
      coneGeom.rotateX(Math.PI / 2);
      const coneMat = new THREE.MeshLambertMaterial({ color: 0xff5511 });
      const cone = new THREE.Mesh(coneGeom, coneMat);
      cone.position.set(0, 5.8, 0);
      sockGroup.add(cone);

      this.windsocks.push({ group: sockGroup, cone });
      this.group.add(sockGroup);

      // PAPI 4-light bar
      const papiBar = new THREE.Group();
      const forward = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
      const lateral = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));

      const barOrigin = new THREE.Vector3().copy(basePos).addScaledVector(lateral, 18).addScaledVector(forward, 25);
      papiBar.position.copy(barOrigin);

      const lightMeshes = [];
      for (let i = 0; i < 4; i++) {
        const offsetDist = (i - 1.5) * 2.8;
        const lampGeom = new THREE.BoxGeometry(0.7, 0.5, 0.7);
        const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const lamp = new THREE.Mesh(lampGeom, lampMat);
        lamp.position.copy(lateral).multiplyScalar(offsetDist);
        lamp.position.y = 0.4;
        papiBar.add(lamp);
        lightMeshes.push(lamp);
      }

      this.papiLights.push({ group: papiBar, lights: lightMeshes });
      this.group.add(papiBar);
    }
  }

  update(time, windVector = null) {
    if (windVector) {
      const heading = Math.atan2(windVector.z, windVector.x);
      const windSpeed = windVector.length();

      for (const sock of this.windsocks) {
        sock.cone.rotation.y = heading + Math.PI;
        const droop = Math.max(0.15, Math.min(1.4, windSpeed / 12.0));
        sock.cone.rotation.z = Math.sin(time * 3.5 + sock.group.position.x) * 0.08 * droop;
      }
    }

    const blinkCycle = Math.sin(time * 2.5);
    for (const papi of this.papiLights) {
      for (let i = 0; i < papi.lights.length; i++) {
        const lamp = papi.lights[i];
        if (i < 2) {
          lamp.material.color.setHex(0xff3322); // red on inner lamps
        } else {
          lamp.material.color.setHex(blinkCycle > 0 ? 0xffffff : 0xffeebb); // white glide slope
        }
      }
    }
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
