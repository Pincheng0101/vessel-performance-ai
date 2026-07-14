class randomUtils {
  /**
   * Generates a cryptographically secure random integer in the range [0, max).
   *
   * Uses rejection sampling so the result is uniformly distributed — a plain
   * `getRandomValues() % max` skews toward smaller values whenever `max` does
   * not evenly divide 2^32 (modulo bias).
   *
   * @param {number} max - The exclusive upper bound. Must be a positive integer.
   * @returns {number} A secure random integer in [0, max), or 0 when max is not a positive integer.
   */
  static secureInt(max) {
    if (!Number.isInteger(max) || max <= 0) return 0;
    const range = 0x100000000; // 2^32
    const limit = Math.floor(range / max) * max;
    const buffer = new Uint32Array(1);
    while (true) {
      crypto.getRandomValues(buffer);
      const value = buffer[0];
      if (value < limit) return value % max;
    }
  }
}

export default randomUtils;
