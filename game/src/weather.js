import * as THREE from 'three';

export const WEATHER_CLEAR = 'clear';
export const WEATHER_GUST = 'gust';
export const WEATHER_STORM = 'storm';

const WEATHER_PROFILES = {
  [WEATHER_CLEAR]: {
    baseWindSpeed: 2.5,
    gustMax: 4.0,
    gustPeriod: 12.0,
    fogDensity: 0.00045,
    rainCount: 0,
    turbulence: 0.2
  },
  [WEATHER_GUST]: {
    baseWindSpeed: 7.0,
    gustMax: 15.0,
    gustPeriod: 6.0,
    fogDensity: 0.00095,
    rainCount: 300,
    turbulence: 0.7
  },
  [WEATHER_STORM]: {
    baseWindSpeed: 14.0,
    gustMax: 26.0,
    gustPeriod: 3.5,
    fogDensity: 0.0022,
    rainCount: 1600,
    turbulence: 1.3
  }
};

export class WeatherSystem {
  constructor(scene, initialFront = WEATHER_CLEAR) {
    this.scene = scene;
    this.front = initialFront;
    this.time = 0;
    this.windAngle = Math.PI * 0.25;
    this.windVector = new THREE.Vector3(1, 0, 0);
    this.currentWindSpeed = 0;
    this.gustFactor = 0;
    this.fogRamp = 0.0005;

    this.rainMax = 2000;
    this.rainBoxRadius = 140;
    this.rainBoxHeight = 110;
    this.rainGeometry = null;
    this.rainPoints = null;
    this.rainPositions = null;
    this.rainVelocities = null;

    this.initRainSystem();
    this.setFront(initialFront);
  }

  initRainSystem() {
    this.rainGeometry = new THREE.BufferGeometry();
    this.rainPositions = new Float32Array(this.rainMax * 3);
    this.rainVelocities = new Float32Array(this.rainMax);

    for (let i = 0; i < this.rainMax; i++) {
      const idx = i * 3;
      this.rainPositions[idx] = (Math.random() - 0.5) * this.rainBoxRadius * 2;
      this.rainPositions[idx + 1] = Math.random() * this.rainBoxHeight;
      this.rainPositions[idx + 2] = (Math.random() - 0.5) * this.rainBoxRadius * 2;
      this.rainVelocities[i] = 45 + Math.random() * 30;
    }

    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x90b4d4,
      size: 0.7,
      transparent: true,
      opacity: 0.65,
      depthWrite: false
    });

    this.rainPoints = new THREE.Points(this.rainGeometry, material);
    this.rainPoints.frustumCulled = false;
    this.rainPoints.visible = false;
    this.scene.add(this.rainPoints);
  }

  setFront(name) {
    if (!WEATHER_PROFILES[name]) {
      name = WEATHER_CLEAR;
    }
    this.front = name;
    const profile = WEATHER_PROFILES[name];

    if (this.scene.fog && 'density' in this.scene.fog) {
      this.targetFogDensity = profile.fogDensity;
    } else {
      this.targetFogDensity = profile.fogDensity;
    }

    if (this.rainPoints) {
      this.rainPoints.visible = profile.rainCount > 0;
      this.rainGeometry.setDrawRange(0, profile.rainCount);
    }
  }

  getWindVector() {
    return this.windVector;
  }

  getTurbulence() {
    const profile = WEATHER_PROFILES[this.front] || WEATHER_PROFILES[WEATHER_CLEAR];
    return profile.turbulence * (1 + 0.4 * Math.sin(this.time * 2.3));
  }

  update(dt, planePos) {
    this.time += dt;
    const profile = WEATHER_PROFILES[this.front] || WEATHER_PROFILES[WEATHER_CLEAR];

    const wander = Math.sin(this.time * 0.08) * 0.35 + Math.cos(this.time * 0.03) * 0.2;
    const activeAngle = this.windAngle + wander;

    const gustCycle = Math.sin((this.time * Math.PI * 2) / profile.gustPeriod);
    const gustPulse = Math.max(0, gustCycle);
    this.gustFactor = Math.pow(gustPulse, 2);

    this.currentWindSpeed = profile.baseWindSpeed + this.gustFactor * (profile.gustMax - profile.baseWindSpeed);
    this.windVector.set(
      Math.cos(activeAngle) * this.currentWindSpeed,
      Math.sin(this.time * 1.2) * (this.gustFactor * 1.5),
      Math.sin(activeAngle) * this.currentWindSpeed
    );

    const rampSpeed = dt * 0.4;
    this.fogRamp += (this.targetFogDensity - this.fogRamp) * Math.min(1, rampSpeed);
    if (this.scene.fog && 'density' in this.scene.fog) {
      this.scene.fog.density = this.fogRamp;
    }

    if (profile.rainCount > 0 && this.rainPositions && planePos) {
      const activeCount = profile.rainCount;
      const positions = this.rainGeometry.attributes.position.array;
      const minX = planePos.x - this.rainBoxRadius;
      const maxX = planePos.x + this.rainBoxRadius;
      const minZ = planePos.z - this.rainBoxRadius;
      const maxZ = planePos.z + this.rainBoxRadius;
      const minY = Math.max(0, planePos.y - 30);
      const maxY = planePos.y + this.rainBoxHeight;

      for (let i = 0; i < activeCount; i++) {
        const idx = i * 3;
        positions[idx] += this.windVector.x * dt * 0.35;
        positions[idx + 1] -= this.rainVelocities[i] * dt;
        positions[idx + 2] += this.windVector.z * dt * 0.35;

        if (positions[idx + 1] < minY ||
            positions[idx] < minX || positions[idx] > maxX ||
            positions[idx + 2] < minZ || positions[idx + 2] > maxZ) {
          positions[idx] = planePos.x + (Math.random() - 0.5) * this.rainBoxRadius * 2;
          positions[idx + 1] = maxY - Math.random() * 15;
          positions[idx + 2] = planePos.z + (Math.random() - 0.5) * this.rainBoxRadius * 2;
        }
      }
      this.rainGeometry.attributes.position.needsUpdate = true;
    }
  }

  dispose() {
    if (this.rainPoints) {
      this.scene.remove(this.rainPoints);
      this.rainGeometry.dispose();
      this.rainPoints.material.dispose();
    }
  }
}
