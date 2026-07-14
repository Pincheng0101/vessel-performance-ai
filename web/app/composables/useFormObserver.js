export default function useFormObserver() {
  const observer = ref(null);
  const hasInvalidInput = ref(false);

  const checkInputs = (parent) => {
    const errorElements = parent.querySelectorAll('.v-input--error');
    hasInvalidInput.value = errorElements.length > 0;
  };

  const observeInputs = (target) => {
    observer.value = new MutationObserver(() => {
      checkInputs(target);
    });
    observer.value.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    checkInputs(target);
  };

  onBeforeUnmount(() => {
    observer.value?.disconnect();
  });

  return {
    observeInputs,
    hasInvalidInput,
  };
}
