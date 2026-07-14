import { defineStore } from 'pinia';
import { SnackbarConstant } from '~/constants';

/**
 * @import { SnackbarMessage } from '~/models/ui/SnackbarMessage.d'
 */

export const useSnackbarStore = defineStore('snackbar', () => {
  const { $rollbar } = useNuxtApp();

  /**
   * @type {SnackbarMessage}
   */
  const message = ref(null);

  const setMessage = (value) => {
    message.value = value;
  };

  const setSuccess = (text, options = {}) => {
    setMessage({ text, type: SnackbarConstant.Type.SUCCESS, ...options });
  };

  const setFailure = (text, options = {}) => {
    setMessage({ text, type: SnackbarConstant.Type.ERROR, ...options });
  };

  const setActionSuccess = (i18nKey, options = {}) => {
    setMessage({ action: i18nKey, type: SnackbarConstant.Type.SUCCESS, ...options });
  };

  const setActionFailure = (i18nKey, options = {}) => {
    setMessage({ action: i18nKey, type: SnackbarConstant.Type.ERROR, ...options });
  };

  const report = (error) => {
    $rollbar?.error(error);
  };

  return {
    message,
    setMessage,
    setSuccess,
    setFailure,
    setActionSuccess,
    setActionFailure,
    report,
  };
});
