import { CodeActionCopilotRequest, CodeActionCopilotResponse } from '~/models/server/codeAction';
import { StartHqCopilotAgent, StartHqCopilotAgentResponse } from '~/models/server/copilot';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function copilot({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @param {CodeActionCopilotRequest} runtime
   * @returns {AsyncData<CodeActionCopilotResponse, H3Error<ErrorResponse>>}
   */
  const startCodeAction = (runtime) => {
    return client.post('/copilot/start-code-action-copilot', {
      watch: false,
      lazy: true,
      body: CodeActionCopilotRequest.toRequestPayload(runtime),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new CodeActionCopilotResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {StartHqCopilotAgent} runtime
   * @returns {AsyncData<StartHqCopilotAgentResponse, H3Error<ErrorResponse>>}
   */
  const startHqCopilotAgent = (runtime, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/runtime/copilot/start-hq-copilot-agent', {
      watch: false,
      lazy,
      signal,
      body: StartHqCopilotAgent.toRequestPayload(runtime),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new StartHqCopilotAgentResponse(finalResponse._data);
        }
      },
    });
  };

  return {
    startCodeAction,
    startHqCopilotAgent,
  };
};
