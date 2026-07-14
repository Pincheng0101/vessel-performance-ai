class mathUtils {
  /**
   * Calculates the sum of the provided values.
   *
   * @param {...number|number[]} values - The values to be summed. Can be individual numbers or an array of numbers.
   * @returns {number} The sum of the provided values.
   */
  static sum(...values) {
    values = arrUtils.cast(values.length === 1 ? values[0] : values);
    return values.reduce((sum, num) => sum + num, 0);
  }

  /**
   * Calculates the average of the given values.
   *
   * @param {...number|number[]} values - The values to average. Can be a series of numbers or an array of numbers.
   * @returns {number} The average of the given values. Returns 0 if the array is empty.
   */
  static average(...values) {
    values = arrUtils.cast(values.length === 1 ? values[0] : values);
    return arrUtils.isEmpty(values) ? 0 : mathUtils.sum(values) / values.length;
  }
}

export default mathUtils;
