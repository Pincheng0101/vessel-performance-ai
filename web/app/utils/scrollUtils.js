class scrollUtils {
  /**
   * Scrolls the target element to a specified vertical position with a given behavior.
   *
   * @param {Object} [options] - The options for scrolling.
   * @param {number} [options.top] - The vertical position to scroll to.
   * @param {number} [options.left] - The horizontal position to scroll to.
   * @param {string} [options.behavior] - The scrolling behavior, either 'auto' or 'smooth'.
   * @param {Window|Element} [options.target] - The target element to scroll. Defaults to the window object.
   */
  static scrollTo = ({ top = 0, left = 0, behavior = 'smooth', target = window } = {}) => {
    target.scrollTo({
      top,
      left,
      behavior,
    });
  };
}

export default scrollUtils;
