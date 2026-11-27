export class RunScoring {
  constructor(options = {}) {
    this.targetTime = options.targetTime || 150;
    this.ringValue = options.ringValue || 150;
    this.perfectRingBonus = options.perfectRingBonus || 75;

    this.ringsCollected = 0;
    this.ringScore = 0;
    this.perfectRings = 0;

    this.landings = [];
    this.landingScore = 0;

    this.elapsedTime = 0;
    this.damageIncurred = 0;
    this.remainingFuelPercent = 100;
  }

  reset() {
    this.ringsCollected = 0;
    this.ringScore = 0;
    this.perfectRings = 0;
    this.landings = [];
    this.landingScore = 0;
    this.elapsedTime = 0;
    this.damageIncurred = 0;
    this.remainingFuelPercent = 100;
  }

  addRing({ distanceToCenter = 0, radius = 25 } = {}) {
    this.ringsCollected += 1;
    let earned = this.ringValue;
    const ratio = Math.max(0, Math.min(1, distanceToCenter / (radius || 1)));
    if (ratio < 0.3) {
      this.perfectRings += 1;
      earned += this.perfectRingBonus;
    } else {
      earned += Math.round((1 - ratio) * 40);
    }
    this.ringScore += earned;
    return earned;
  }

  addLanding({ touchDownSpeed = 0, verticalVelocity = 0, centerlineOffset = 0 } = {}) {
    const sinkAbs = Math.abs(verticalVelocity);
    let grade = 'C';
    let points = 250;

    if (sinkAbs < 1.8 && centerlineOffset < 4.0 && touchDownSpeed < 65) {
      grade = 'A+';
      points = 1000;
    } else if (sinkAbs < 3.2 && centerlineOffset < 8.0) {
      grade = 'A';
      points = 750;
    } else if (sinkAbs < 5.0 && centerlineOffset < 14.0) {
      grade = 'B';
      points = 500;
    } else {
      grade = 'Hard Landing';
      points = 150;
    }

    const entry = { grade, points, sinkRate: sinkAbs, offset: centerlineOffset };
    this.landings.push(entry);
    this.landingScore += points;
    return entry;
  }

  setFlightProgress({ elapsedTime, damage, fuelPercent }) {
    if (typeof elapsedTime === 'number') this.elapsedTime = elapsedTime;
    if (typeof damage === 'number') this.damageIncurred = damage;
    if (typeof fuelPercent === 'number') this.remainingFuelPercent = fuelPercent;
  }

  calculateTimeBonus() {
    if (this.elapsedTime <= 0) return 0;
    const diff = this.targetTime - this.elapsedTime;
    if (diff > 0) {
      return Math.round(diff * 12);
    }
    return 0;
  }

  calculateDamagePenalty() {
    return Math.round(Math.max(0, this.damageIncurred) * 8);
  }

  calculateFuelBonus() {
    const fuel = Math.max(0, Math.min(100, this.remainingFuelPercent));
    return Math.round(fuel * 4);
  }

  final() {
    const timeBonus = this.calculateTimeBonus();
    const damagePenalty = this.calculateDamagePenalty();
    const fuelBonus = this.calculateFuelBonus();

    const rawTotal = this.ringScore + this.landingScore + timeBonus + fuelBonus - damagePenalty;
    const total = Math.max(0, rawTotal);

    const lines = [
      `Rings collected: ${this.ringsCollected} (+${this.ringScore})`,
      `Perfect ring bullseyes: ${this.perfectRings}`,
      `Landing points: +${this.landingScore} (${this.landings.length} landings)`,
      `Time bonus: +${timeBonus} (Elapsed ${this.elapsedTime.toFixed(1)}s / Target ${this.targetTime}s)`,
      `Fuel remaining bonus: +${fuelBonus} (${this.remainingFuelPercent.toFixed(0)}%)`,
      `Airframe damage penalty: -${damagePenalty}`,
      `Final Total Score: ${total}`
    ];

    return {
      total,
      ringScore: this.ringScore,
      landingScore: this.landingScore,
      timeBonus,
      fuelBonus,
      damagePenalty,
      ringsCollected: this.ringsCollected,
      landings: this.landings,
      lines
    };
  }
}
