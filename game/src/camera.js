import * as THREE from 'three';

export const CAMERA_CHASE = 'chase';
export const CAMERA_COCKPIT = 'cockpit';
export const CAMERA_ORBIT = 'orbit';

export class FlightCameraRig {
  constructor(camera, planeMesh) {
    this.camera = camera;
    this.planeMesh = planeMesh;
    this.mode = CAMERA_CHASE;

    this.currentPosition = new THREE.Vector3();
    this.currentTarget = new THREE.Vector3();

    this.lookOffset = new THREE.Vector2(0, 0);
    this.orbitAngles = { yaw: 0, pitch: 0.25, distance: 30 };

    this.smoothPos = 7.5;
    this.smoothTarget = 12.0;

    this.shakeIntensity = 0;
    this.shakeTime = 0;
    this.shakeOffset = new THREE.Vector3();

    if (planeMesh) {
      this.currentPosition.copy(planeMesh.position).add(new THREE.Vector3(0, 5, -20));
      this.currentTarget.copy(planeMesh.position);
    }
  }

  setMode(mode) {
    if ([CAMERA_CHASE, CAMERA_COCKPIT, CAMERA_ORBIT].includes(mode)) {
      this.mode = mode;
    }
  }

  cycleMode() {
    if (this.mode === CAMERA_CHASE) {
      this.mode = CAMERA_COCKPIT;
    } else if (this.mode === CAMERA_COCKPIT) {
      this.mode = CAMERA_ORBIT;
    } else {
      this.mode = CAMERA_CHASE;
    }
    return this.mode;
  }

  setLookOffset(dx, dy) {
    this.lookOffset.set(dx, dy);
  }

  applyTurbulence(amount) {
    this.shakeIntensity = Math.min(2.5, this.shakeIntensity + amount);
  }

  computeShake(dt, speedRatio, gustRatio = 0) {
    this.shakeTime += dt * 35;
    this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 2.0);

    const baseShake = Math.max(0, (speedRatio - 0.75) * 0.45);
    const totalAmp = baseShake + gustRatio * 0.25 + this.shakeIntensity * 0.18;

    this.shakeOffset.set(
      Math.sin(this.shakeTime * 1.7) * totalAmp * 0.15,
      Math.cos(this.shakeTime * 2.1) * totalAmp * 0.2,
      Math.sin(this.shakeTime * 1.3) * totalAmp * 0.12
    );
  }

  update(dt, speedRatio = 0.5, gustRatio = 0) {
    if (!this.planeMesh) return;

    this.computeShake(dt, speedRatio, gustRatio);

    const desiredPos = new THREE.Vector3();
    const desiredTarget = new THREE.Vector3();

    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.planeMesh.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.planeMesh.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.planeMesh.quaternion);

    if (this.mode === CAMERA_COCKPIT) {
      desiredPos.copy(this.planeMesh.position)
        .addScaledVector(forward, 0.4)
        .addScaledVector(up, 1.15)
        .addScaledVector(right, this.lookOffset.x * 0.5);

      desiredTarget.copy(desiredPos)
        .addScaledVector(forward, 35)
        .addScaledVector(up, this.lookOffset.y * 10);

      this.currentPosition.lerp(desiredPos, 1 - Math.exp(-dt * 24.0));
      this.currentTarget.lerp(desiredTarget, 1 - Math.exp(-dt * 28.0));
    } else if (this.mode === CAMERA_ORBIT) {
      const radius = this.orbitAngles.distance;
      const phi = this.orbitAngles.pitch;
      const theta = this.orbitAngles.yaw + this.lookOffset.x * 2.5;

      const orbitVec = new THREE.Vector3(
        radius * Math.cos(phi) * Math.sin(theta),
        radius * Math.sin(phi) + this.lookOffset.y * 10,
        radius * Math.cos(phi) * Math.cos(theta)
      );

      desiredPos.copy(this.planeMesh.position).add(orbitVec);
      desiredTarget.copy(this.planeMesh.position).addScaledVector(up, 1.5);

      this.currentPosition.lerp(desiredPos, 1 - Math.exp(-dt * this.smoothPos));
      this.currentTarget.lerp(desiredTarget, 1 - Math.exp(-dt * this.smoothTarget));
    } else {
      // Default: CAMERA_CHASE
      const chaseDistance = 16.0;
      const chaseHeight = 4.0;

      desiredPos.copy(this.planeMesh.position)
        .addScaledVector(forward, -chaseDistance)
        .addScaledVector(up, chaseHeight)
        .addScaledVector(right, this.lookOffset.x * 4.0);

      desiredTarget.copy(this.planeMesh.position)
        .addScaledVector(forward, 15.0)
        .addScaledVector(up, 1.2 + this.lookOffset.y * 4.0);

      this.currentPosition.lerp(desiredPos, 1 - Math.exp(-dt * this.smoothPos));
      this.currentTarget.lerp(desiredTarget, 1 - Math.exp(-dt * this.smoothTarget));
    }

    this.camera.position.copy(this.currentPosition).add(this.shakeOffset);
    this.camera.lookAt(this.currentTarget);
  }
}
