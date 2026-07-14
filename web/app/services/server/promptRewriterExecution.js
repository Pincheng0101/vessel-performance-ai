import { PromptRewriterExecution, PromptRewriterExecutionResponse } from '~/models/server/promptRewriter';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function promptRewriterExecution({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @param {PromptRewriterExecution} runtime
   * @returns {AsyncData<PromptRewriterExecutionResponse, H3Error<ErrorResponse>>}
   */
  const start = (runtime) => {
    return client.post('/promptforge/start-prompt-rewriter-execution', {
      watch: false,
      lazy: true,
      body: PromptRewriterExecution.toRequestPayload(runtime),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new PromptRewriterExecutionResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<PromptRewriterExecutionResponse, H3Error<ErrorResponse>>}
   */
  const get = ({
    executionArn: execution_arn,
  } = {}, {
    signal,
  } = {}) => {
    return client.post('/promptforge/get-prompt-rewriter-execution', {
      watch: false,
      lazy: true,
      signal,
      body: {
        execution_arn,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new PromptRewriterExecutionResponse(finalResponse._data);
        }
      },
    });
  };

  return {
    start,
    get,
  };
};
