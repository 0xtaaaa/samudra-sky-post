/**
 * Damage and fuel model for Nuri-7 mail plane.
 * Fields:
 * - fuel: 0..1 (starts at 1.0)
 * - damage: 0..1 (starts at 0.0)
 * - roughness: 0..1 (grows with damage)
 */
export class DamageModel {
  constructor() {
    this.fuel = 1.0;
    this.damage = 0.0;
    this.roughness = 0.0;
  }

  /**
   * Reset / repair plane state to factory fresh.
   */
  service() {
    this.fuel = 1.0;
    this.damage = 0.0;
    this.roughness = 0.0;
  }

  /**
   * Fuel burns with throttle over time.
   * Empty fuel cuts the engine (returns remaining fuel).
   * @param {number} rate Rate multiplier or direct burn amount
   */
  burn(rate = 0.001) {
    this.fuel = Math.max(0, this.fuel - rate);
    return this.fuel;
  }

  /**
   * Inflict damage on the aircraft (amount 0..1).
   * Roughness grows with damage.
   * @param {number} amount
   */
  hit(amount = 0.1) {
    this.damage = Math.max(0, Math.min(1.0, this.damage + amount));
    this.roughness = Math.max(0, Math.min(1.0, this.damage * 0.95));
    return this.damage;
  }

  /**
   * Advance one simulation tick.
   * Fuel drains with throttle, roughness grows with damage,
   * empty fuel cuts the engine (indicated by throttle cutoff / zero power).
   * @param {number} dt seconds
   * @param {number} throttle 0..1
   * @returns {{ fuel: number, damage: number, roughness: number, engineCut: boolean }}
   */
  update(dt, throttle = 0) {
    const safeDt = Math.max(0, dt);
    const safeThrottle = Math.max(0, Math.min(1, throttle));

    // Base idle burn plus throttle consumption
    // Consumes ~100% fuel across roughly 150-200s at full throttle
    const burnRate = (0.0012 + safeThrottle * 0.0045) * safeDt;
    if (this.fuel > 0) {
      this.fuel = Math.max(0, this.fuel - burnRate);
    }

    // Roughness grows with damage, with small mechanical flutter when damaged
    const baseRoughness = Math.min(1.0, this.damage * 0.9 + (this.damage > 0 ? 0.05 : 0));
    this.roughness = Math.max(this.roughness, baseRoughness);

    const engineCut = this.fuel <= 0;

    return {
      fuel: this.fuel,
      damage: this.damage,
      roughness: this.roughness,
      engineCut,
    };
  }
}
