/**
 * Waits until the predicate returns true.
 *
 * @param {() => boolean} predicate - Condition to be met.
 * @param {Object} options
 * @param {number} options.interval - Polling interval in milliseconds.
 * @param {number} options.timeout - Timeout in milliseconds.
 * @returns {Promise<void>} Resolves when predicate is true.
 */
const waitFor = (predicate, { interval = 50, timeout = 60 * 1000 } = {}) => new Promise((resolve, reject) => {
  const startTime = Date.now();

  const tick = () => {
    try {
      if (predicate()) {
        resolve();
        return;
      }
    } catch (error) {
      reject(error);
      return;
    }

    if (Date.now() - startTime >= timeout) {
      reject(new Error('waitFor timeout'));
      return;
    }

    setTimeout(tick, interval);
  };

  tick();
});

export default waitFor;
