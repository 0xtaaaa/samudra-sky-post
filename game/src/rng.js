// Seeded random numbers (mulberry32) so a world built from one seed is the
// same world every time: the same seed always gives the same frame.

/** A deterministic random function from a 32-bit seed. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A small helper bundle around one seeded stream. */
export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    /** A float in [0, 1). */
    next,
    /** A float in [min, max). */
    range(min, max) {
      return min + (max - min) * next();
    },
    /** An integer in [min, max] (inclusive). */
    int(min, max) {
      return Math.floor(min + (max - min + 1) * next());
    },
    /** One element of `items`. */
    pick(items) {
      return items[Math.floor(next() * items.length)];
    },
    /** A roughly normal value in [-1, 1] (mean of three uniforms). */
    gauss() {
      return (next() + next() + next() - 1.5) / 1.5;
    },
  };
}

/** Turn a short string into a stable 32-bit seed. */
export function seedFromString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
