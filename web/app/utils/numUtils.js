class numUtils {
  /**
   * Format a numeric value to a fixed number of decimal places using Intl.NumberFormat.
   *
   * Converts non-number inputs with Number(value). If `value` is `null`, `undefined`, or cannot be
   * converted to a finite number, the method returns `null`. Formatting uses the runtime's default
   * locale.
   *
   * @static
   * @param {number|string} value - The value to format. Can be a number or a numeric string.
   * @param {number} [decimalPlaces=0] - The number of fraction digits to display (used as both
   *   minimumFractionDigits and maximumFractionDigits).
   * @returns {string|null} The formatted number string, or `null` for invalid/non-finite inputs.
   */
  static format(value, decimalPlaces = 0) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(value);
  }
}

export default numUtils;
