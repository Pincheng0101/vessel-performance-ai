import { PoolMfaConfigResponse } from '~/models/server/account';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function authentication({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  const adminGetUserPoolMfaConfig = () => {
    return client.post('/account/admin-get-user-pool-mfa-config', {
      watch: false,
      lazy: true,
      body: {},
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new PoolMfaConfigResponse(finalResponse._data.config);
        }
      },
    });
  };

  const adminSetUserPoolMfaConfig = ({
    mfaConfiguration: mfa_configuration,
    softwareTokenMfaEnabled: software_token_mfa_enabled,
    webAuthnUserVerification: web_authn_user_verification,
  }) => {
    return client.post('/account/admin-set-user-pool-mfa-config', {
      watch: false,
      lazy: true,
      body: {
        mfa_configuration,
        software_token_mfa_enabled,
        web_authn_user_verification,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new PoolMfaConfigResponse(finalResponse._data.config);
        }
      },
    });
  };

  return {
    adminGetUserPoolMfaConfig,
    adminSetUserPoolMfaConfig,
  };
}
