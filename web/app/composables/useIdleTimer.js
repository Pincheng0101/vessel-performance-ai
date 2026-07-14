/**
 * Composable for managing idle timer
 *
 * @param {Object} options - Configuration options
 * @param {number} options.timeout - Idle timeout in milliseconds
 * @param {Function} options.onTimeout - Callback when timeout occurs
 * @returns {Object} Idle timer management methods
 */
export function useIdleTimer({ timeout, onTimeout }) {
  const timer = ref(null);
  const isTimedOut = ref(false);

  const clear = () => {
    if (timer.value) {
      clearTimeout(timer.value);
      timer.value = null;
    }
    isTimedOut.value = false;
  };

  const refresh = () => {
    clear();
    timer.value = setTimeout(() => {
      isTimedOut.value = true;
      if (onTimeout) {
        onTimeout();
      }
    }, timeout);
  };

  onBeforeUnmount(() => {
    clear();
  });

  return {
    isTimedOut,
    refresh,
    clear,
  };
}
