import { PasskeyResponse } from '~/models/server/account';
import { User, UserResponse } from '~/models/server/user';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function me({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  const get = () => {
    return client.post('/account/get-user', {
      watch: false,
      lazy: true,
      body: {},
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new UserResponse(finalResponse._data.user);
        }
      },
    });
  };

  /**
   * @param {User} account
   * @returns {AsyncData<UserResponse, H3Error<ErrorResponse>>}
   */
  const update = (account) => {
    return client.post('/account/update-user', {
      watch: false,
      lazy: true,
      body: User.toRequestPayloadWithUser(account),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  const changePassword = ({ oldPassword: old_password, newPassword: new_password }) => {
    return client.post('/account/change-user-password', {
      watch: false,
      lazy: true,
      body: { old_password, new_password },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  const startTotpSetup = () => {
    return client.post('/account/start-totp-setup', {
      watch: false,
      lazy: true,
      body: {},
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  const verifyTotpSetup = ({ userCode: user_code, friendlyDeviceName: friendly_device_name }) => {
    return client.post('/account/verify-totp-setup', {
      watch: false,
      lazy: true,
      body: { user_code, friendly_device_name },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  const listPasskeys = () => {
    return client.post('/account/list-passkeys', {
      watch: false,
      lazy: true,
      body: {},
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = (finalResponse._data.passkeys || []).map(item => new PasskeyResponse(item));
        }
      },
    });
  };

  const deletePasskey = ({ credentialId: credential_id }) => {
    return client.post('/account/delete-passkey', {
      watch: false,
      lazy: true,
      body: { credential_id },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  return {
    get,
    update,
    changePassword,
    startTotpSetup,
    verifyTotpSetup,
    listPasskeys,
    deletePasskey,
  };
}
