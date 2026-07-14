export const useRouteStore = defineStore('route', () => {
  const route = useRoute();

  const hash = ref(route.hash);

  const setHash = (value) => {
    hash.value = value;
  };

  const updateHistoryHash = (value) => {
    // Update the URL hash without causing a page jump
    history.replaceState(null, '', value || location.pathname + location.search);
  };

  return {
    hash,
    setHash,
    updateHistoryHash,
  };
});
