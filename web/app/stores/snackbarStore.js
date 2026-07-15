import { defineStore } from 'pinia';
import * as SnackbarConstant from '~/constants/SnackbarConstant';

/**
 * @import { SnackbarMessage } from '~/models/ui/SnackbarMessage.d'
 */

export const useSnackbarStore = defineStore('snackbar', () => {
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

  return {
    message,
    setMessage,
    setSuccess,
    setFailure,
  };
});
