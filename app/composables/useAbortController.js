export default function useAbortController() {
  const abortController = ref(null);

  const abort = () => {
    abortController.value?.abort();
  };

  /**
   * Aborts the previous request and returns a new signal.
   * @returns {AbortSignal}
   */
  const createSignal = () => {
    abort();
    abortController.value = new AbortController();
    return abortController.value.signal;
  };

  onBeforeUnmount(() => {
    abort();
  });

  return {
    createSignal,
  };
};
