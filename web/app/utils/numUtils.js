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

  /**
   * Convert a value to a finite number, or return a fallback for invalid values.
   *
   * @static
   * @param {*} value - The value to convert.
   * @param {number} [fallback=0] - The value to return when conversion is invalid or non-finite.
   * @returns {number} The finite numeric value, or the fallback.
   */
  static toFiniteNumber(value, fallback = 0) {
    const number = Number(value ?? fallback);

    return Number.isFinite(number) ? number : fallback;
  }

  /**
   * Format a percentage value as a display label with compact boundary labels.
   *
   * @static
   * @param {number|string} value - A percentage value, e.g. 42 for 42%.
   * @param {number} [decimalPlaces=1] - The number of fraction digits to display.
   * @returns {string} The formatted percentage label.
   */
  static formatPercentageLabel(value, decimalPlaces = 1) {
    const percentage = this.toFiniteNumber(value);

    if (percentage === 100) {
      return '100%';
    }

    const threshold = 1 / Math.pow(10, decimalPlaces);
    const upperBound = 100 - threshold;

    if (percentage > upperBound && percentage < 100) {
      return `>${this.format(upperBound, decimalPlaces)}%`;
    }

    if (percentage > 0 && percentage < threshold) {
      return `<${this.format(threshold, decimalPlaces)}%`;
    }

    return `${this.format(percentage, decimalPlaces)}%`;
  }
}

export default numUtils;
