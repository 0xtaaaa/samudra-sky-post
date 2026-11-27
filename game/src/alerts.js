export const ALERT_STALL = 'stall';
export const ALERT_OVERSPEED = 'overspeed';
export const ALERT_LOW_FUEL = 'low_fuel';
export const ALERT_GEAR_APPROACH = 'gear_approach';
export const ALERT_HARD_DESCENT = 'hard_descent';
export const ALERT_BOUNDS = 'bounds';

export const ALERT_DEFS = {
  [ALERT_BOUNDS]: {
    text: 'WARNING: AIRSPACE BOUNDARY EXCEEDED',
    priority: 100,
    blinkRate: 5.0,
    color: '#ff3333'
  },
  [ALERT_STALL]: {
    text: 'STALL WARNING - RECOVER NOSE DOWN',
    priority: 90,
    blinkRate: 6.0,
    color: '#ff2222'
  },
  [ALERT_HARD_DESCENT]: {
    text: 'PULL UP - HIGH SINK RATE',
    priority: 80,
    blinkRate: 4.5,
    color: '#ff4422'
  },
  [ALERT_OVERSPEED]: {
    text: 'OVERSPEED - THROTTLE IDLE',
    priority: 70,
    blinkRate: 3.5,
    color: '#ff7722'
  },
  [ALERT_GEAR_APPROACH]: {
    text: 'APPROACH CHECK - EXTEND LANDING GEAR',
    priority: 60,
    blinkRate: 2.5,
    color: '#ffaa00'
  },
  [ALERT_LOW_FUEL]: {
    text: 'LOW FUEL - DIVERT TO RUNWAY',
    priority: 50,
    blinkRate: 2.0,
    color: '#e6c822'
  }
};

export class AlertSystem {
  constructor(domElement = null) {
    this.domElement = domElement;
    this.activeAlert = null;
    this.timer = 0;
    this.visible = false;
  }

  bindElement(el) {
    this.domElement = el;
  }

  evaluateFlightState(state) {
    const alerts = [];
    const {
      airspeed = 50,
      altitude = 100,
      verticalSpeed = 0,
      fuel = 100,
      gearDown = true,
      maxSpeed = 110,
      stallSpeed = 26,
      distanceFromOrigin = 0,
      maxRange = 2800
    } = state;

    if (distanceFromOrigin > maxRange) {
      alerts.push(ALERT_BOUNDS);
    }

    if (airspeed < stallSpeed && altitude > 8) {
      alerts.push(ALERT_STALL);
    }

    if (airspeed > maxSpeed * 1.05) {
      alerts.push(ALERT_OVERSPEED);
    }

    if (verticalSpeed < -14 && altitude < 120 && altitude > 6) {
      alerts.push(ALERT_HARD_DESCENT);
    }

    if (altitude < 65 && airspeed < stallSpeed * 1.7 && !gearDown) {
      alerts.push(ALERT_GEAR_APPROACH);
    }

    if (fuel < 18) {
      alerts.push(ALERT_LOW_FUEL);
    }

    return alerts;
  }

  getCurrentAlert(alerts) {
    if (!alerts || alerts.length === 0) {
      return null;
    }
    let top = null;
    let topPriority = -1;
    for (const key of alerts) {
      const def = ALERT_DEFS[key];
      if (def && def.priority > topPriority) {
        topPriority = def.priority;
        top = { key, ...def };
      }
    }
    return top;
  }

  update(dt, flightState) {
    this.timer += dt;
    const alertKeys = this.evaluateFlightState(flightState);
    this.activeAlert = this.getCurrentAlert(alertKeys);

    if (this.domElement) {
      if (!this.activeAlert) {
        this.domElement.style.opacity = '0';
        this.domElement.textContent = '';
      } else {
        const period = 1.0 / this.activeAlert.blinkRate;
        const phase = (this.timer % period) / period;
        const isBlinkOn = phase < 0.65;
        this.domElement.textContent = this.activeAlert.text;
        this.domElement.style.color = this.activeAlert.color;
        this.domElement.style.borderColor = this.activeAlert.color;
        this.domElement.style.opacity = isBlinkOn ? '1' : '0.2';
      }
    }

    return this.activeAlert;
  }
}
