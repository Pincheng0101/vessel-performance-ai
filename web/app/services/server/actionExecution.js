import { ActionExecutionFactory, ActionExecutionResponse } from '~/models/server/actionExecution';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 * @import { ActionExecution } from '~/models/server/actionExecution'
 */

export default function actionExecution({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<ActionExecutionResponse, H3Error<ErrorResponse>>}
   */
  const start = ({
    actionPayload,
    input,
    externalMemoryInput,
  } = {}, {
    signal,
  } = {}) => {
    return client.post('/runtime/start-action-execution', {
      watch: false,
      lazy: true,
      signal,
      body: ActionExecutionFactory.toRequestPayload({
        actionPayload,
        input,
        externalMemoryInput,
      }),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new ActionExecutionResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {ActionExecution} resource
   * @returns {AsyncData<ActionExecutionResponse, H3Error<ErrorResponse>>}
   */
  const get = ({
    executionArn: execution_arn,
  } = {}) => {
    return client.post('/runtime/get-action-execution', {
      watch: false,
      lazy: true,
      body: {
        execution_arn,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new ActionExecutionResponse(finalResponse._data);
        }
      },
    });
  };

  return {
    start,
    get,
  };
};
