class elementUtils {
  /**
   * Get the element from the url of the marker.
   *
   * @param {string} url - The url of the marker.
   * @return {HTMLElement} - The element of the marker.
   */
  static getMarkerByUrl(url) {
    if (!url.startsWith('url(')) return;
    let markerId;
    // Remove "url('" and "')"
    markerId = url.slice(5, -2);
    if (!markerId.startsWith('#')) return;
    // Remove #
    markerId = markerId.slice(1);
    return document.getElementById(markerId);
  }

  /**
   * Get the actual rendered width of the element in pixels.
   * Includes padding and border, excludes margin.
   *
   * @param {HTMLElement} el - The target element.
   * @return {number} - The rendered width in pixels.
   */
  static getWidth(el) {
    return el.getBoundingClientRect().width || 0;
  }

  /**
   * Get the actual rendered height of the element in pixels.
   * Includes padding and border, excludes margin.
   *
   * @param {HTMLElement} el - The target element.
   * @return {number} - The rendered height in pixels.
   */
  static getHeight(el) {
    return el.getBoundingClientRect().height || 0;
  }

  /**
   * Get the computed top margin of the element in pixels.
   *
   * @param {HTMLElement} el - The target element.
   * @return {number} - The top margin in pixels.
   */
  static getMarginTop(el) {
    return parseFloat(getComputedStyle(el).marginTop) || 0;
  }

  /**
   * Get the computed bottom margin of the element in pixels.
   *
   * @param {HTMLElement} el - The target element.
   * @return {number} - The bottom margin in pixels.
   */
  static getMarginBottom(el) {
    return parseFloat(getComputedStyle(el).marginBottom) || 0;
  }
}

export default elementUtils;
