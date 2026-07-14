import { AgentCreditConfig, AgentCreditConfigResponse } from '~/models/server/agentCreditConfig';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function agentCreditConfig({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<AgentCreditConfigResponse, H3Error<ErrorResponse>>}
   */
  const adminGet = ({
    agentId: agent_id,
  } = {}, {
    lazy = true,
    onResponse = () => {},
  } = {}) => {
    return client.post('/account/admin-get-agent-credit-config', {
      watch: false,
      lazy,
      body: {
        agent_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      // A 400 means the config is simply not set yet; treat it as "not configured"
      // rather than showing an error snackbar (handled by the caller).
      onResponseError: (context) => {
        if (context.response?.status === 400) {
          return;
        }
        return handleResponseError(context);
      },
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new AgentCreditConfigResponse(finalResponse._data.agent_credit_config);
        }
        onResponse(response);
      },
    });
  };

  /**
   * @param {AgentCreditConfig} config
   * @returns {AsyncData<AgentCreditConfigResponse, H3Error<ErrorResponse>>}
   */
  const adminCreate = (config) => {
    return client.post('/account/admin-create-agent-credit-config', {
      watch: false,
      lazy: true,
      body: AgentCreditConfig.toRequestPayload(config),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new AgentCreditConfigResponse(finalResponse._data.agent_credit_config);
        }
      },
    });
  };

  /**
   * @param {AgentCreditConfig} config
   * @returns {AsyncData<AgentCreditConfigResponse, H3Error<ErrorResponse>>}
   */
  const adminUpdate = (config) => {
    return client.post('/account/admin-update-agent-credit-config', {
      watch: false,
      lazy: true,
      body: AgentCreditConfig.toRequestPayload(config),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new AgentCreditConfigResponse(finalResponse._data.agent_credit_config);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<{status: string}, H3Error<ErrorResponse>>}
   */
  const adminDestroy = ({
    agentId: agent_id,
  }) => {
    return client.post('/account/admin-delete-agent-credit-config', {
      watch: false,
      lazy: true,
      body: {
        agent_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  return {
    adminGet,
    adminCreate,
    adminUpdate,
    adminDestroy,
  };
}
