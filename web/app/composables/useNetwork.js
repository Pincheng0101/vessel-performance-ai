export function useNetwork() {
  const { t } = useI18n();
  const snackbarStore = useSnackbarStore();

  const updateNetworkStatus = () => {
    if (navigator.onLine) {
      snackbarStore.setSuccess(t('__messageNetworkOnline'));
      return;
    }
    snackbarStore.setFailure(t('__messageNetworkOffline'), { timeout: 3600 * 1000 });
  };

  onMounted(() => {
    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('online', updateNetworkStatus);
    window.removeEventListener('offline', updateNetworkStatus);
  });
};
