class colorUtils {
  /**
   * Converts a given text to a color code.
   * The color code is generated based on a hash of the text and a seed value.
   * The resulting color is adjusted to ensure it falls within a specified range.
   *
   * @param {string} text - The input text to convert to a color code.
   * @param {number} seed - An optional seed value to influence the hash generation.
   * @returns {string} The resulting color code in hexadecimal format.
   */
  static textToColorCode(text, seed = 0) {
    const hash = strUtils.hash(text, seed);
    const color = `#${((hash & 0xFFFFFF).toString(16).padStart(6, '0')).toUpperCase()}`;
    let [r, g, b] = color.match(/\w\w/g).map(c => parseInt(c, 16));
    const minLimit = 80;
    const maxLimit = 200;
    r = Math.min(Math.max(r, minLimit), maxLimit);
    g = Math.min(Math.max(g, minLimit), maxLimit);
    b = Math.min(Math.max(b, minLimit), maxLimit);
    return `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  };

  /**
   * Computes the appropriate text color (black or white) based on the brightness of the given hex color.
   *
   * @param {string} hex - The hex color code (e.g., "#FFFFFF" or "FFFFFF").
   * @returns {string} Returns 'black' if the brightness is greater than 128, otherwise returns 'white'.
   */
  static computeTextColor(hex) {
    const [r, g, b] = hex.match(/\w\w/g).map(c => parseInt(c, 16));
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? 'black' : 'white';
  };
}

export default colorUtils;
