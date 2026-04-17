// ─── Seeded PRNG ──────────────────────────────────────────────────────────
// Mulberry32 – a fast, high-quality 32-bit seeded PRNG.
// Every call to rng() returns the next deterministic float in [0, 1).
// Used to make the entire NEAT simulation reproducible from a single seed.

function mulberry32(seed) {
  let s = seed | 0
  return function () {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createRng(seed) {
  const next = mulberry32(seed)

  return {
    /** Float in [0, 1) */
    random() {
      return next()
    },

    /** Integer in [min, max) */
    randInt(min, max) {
      return min + Math.floor(next() * (max - min))
    },

    /** Pick a random element from an array */
    pick(arr) {
      return arr[Math.floor(next() * arr.length)]
    },

    /** Gaussian approximation via Box-Muller */
    gaussian(mean = 0, std = 1) {
      const u1 = next() || 1e-10
      const u2 = next()
      return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    },
  }
}
