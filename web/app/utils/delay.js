/**
 * Creates a promise that resolves after a specified delay.
 *
 * @param {number} ms - The number of milliseconds to delay.
 * @returns {Promise<void>} A promise that resolves after the specified delay.
 */
const delay = ms => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

export default delay;
