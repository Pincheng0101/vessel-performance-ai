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

  /**
   * Scrolls the window to the element with the specified ID.
   *
   * @param {string} targetId - The ID of the target element to scroll to.
   * @param {number} offset - Optional offset to adjust the final scroll position.
   */
  static scrollToElementById = (targetId, offset = 0) => {
    if (!targetId) return;
    const targetElement = document.querySelector(targetId);
    if (!targetElement) return;
    const elementPosition = targetElement.getBoundingClientRect().top + window.scrollY;
    scrollUtils.scrollTo({ top: elementPosition - offset });
  };
}

export default scrollUtils;
