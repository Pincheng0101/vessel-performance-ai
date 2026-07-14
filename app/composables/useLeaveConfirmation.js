export const useLeaveConfirmation = ({ enabled = true } = {}) => {
  if (!enabled) {
    return {
      enableConfirmation: () => {},
      disableConfirmation: () => {},
    };
  }

  const { t } = useI18n();

  const isEnabled = ref(false);
  const message = ref(null);

  const isDev = import.meta.env.DEV;

  const handleBeforeUnload = (e) => {
    if (isEnabled.value) {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  const confirm = (next, text) => {
    const ok = window.confirm(text);
    if (ok) {
      next();
    } else {
      next(false);
    }
  };

  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
  });

  onBeforeRouteLeave((to, from, next) => {
    if (isEnabled.value && !isDev) {
      confirm(next, message.value || t('__instructionLeaveSite'));
    } else {
      next();
    }
  });

  onBeforeRouteUpdate((to, from, next) => {
    if (isEnabled.value && !isDev) {
      confirm(next, message.value || t('__instructionLeaveSite'));
    } else {
      next();
    }
  });

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  });

  const enableConfirmation = (text) => {
    isEnabled.value = true;
    message.value = text || '';
  };

  const disableConfirmation = () => {
    isEnabled.value = false;
    message.value = '';
  };

  return {
    enableConfirmation,
    disableConfirmation,
  };
};
