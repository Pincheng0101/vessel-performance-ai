class arrUtils {
  /**
   * Casts the given value to an array. If the value is already an array, it is returned as is.
   * Otherwise, the value is wrapped in an array.
   *
   * @param {*} value - The value to be cast to an array.
   * @returns {Array} The value cast to an array.
   */
  static cast(value) {
    return Array.isArray(value) ? value : [value];
  }

  /**
   * Deduplicates an array by removing duplicate values.
   *
   * @param {Array} value - The array to deduplicate.
   * @returns {Array} A new array with duplicate values removed. If the input is not an array, returns an empty array.
   */
  static deduplicate(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value)];
  }

  /**
   * Returns a new array with the input's elements in random order
   * (Fisher-Yates shuffle).
   *
   * @param {Array} value - The array to shuffle.
   * @returns {Array} A new shuffled array. Returns an empty array if the input is not an array.
   */
  static shuffle(value) {
    if (!Array.isArray(value)) return [];
    const result = [...value];
    for (let i = result.length - 1; i > 0; i--) {
      const j = randomUtils.secureInt(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

export default arrUtils;
