import { ListConstant } from '~/constants';
import { WorkflowExecution, WorkflowExecutionHistoryResponse, WorkflowExecutionListResponse, WorkflowExecutionResponse } from '~/models/server/workflowExecution';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function workflowExecution({
  client,
  handleFinalResponse,
  handleRequestError,
  handleRequest,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<WorkflowExecutionListResponse, H3Error<ErrorResponse>>}
   */
  const list = ({
    workflowId,
    nextToken: next_token,
    limit = ListConstant.WorkflowExecutionParams.PER_PAGE,
    sortField = ListConstant.SortField.START_TS,
    sortOrder = ListConstant.DefaultParams.SORT_ORDER,
  } = {}, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/runtime/list-executions', {
      watch: false,
      lazy,
      signal,
      body: {
        workflow_id: workflowId,
        next_token,
        limit,
        sort_field: sortField,
        sort_order: sortOrder,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new WorkflowExecutionListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {WorkflowExecution} runtime
   * @returns {AsyncData<WorkflowExecutionResponse, H3Error<ErrorResponse>>}
   */
  const get = ({
    executionArn: execution_arn,
  } = {}, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/runtime/get-execution', {
      watch: false,
      lazy,
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
          response._data = new WorkflowExecutionResponse(finalResponse._data.execution);
        }
      },
    });
  };

  /**
   * @param {WorkflowExecution} runtime
   * @returns {AsyncData<WorkflowExecutionResponse, H3Error<ErrorResponse>>}
   */
  const start = (runtime) => {
    return client.post('/runtime/start-execution', {
      watch: false,
      lazy: true,
      body: WorkflowExecution.toRequestPayload(runtime),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new WorkflowExecutionResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {WorkflowExecution} runtime
   * @returns {AsyncData<WorkflowExecutionResponse, H3Error<ErrorResponse>>}
   */
  const startWithExternalMemory = (runtime) => {
    return client.post('/runtime/start-execution-with-external-memory', {
      watch: false,
      lazy: true,
      body: WorkflowExecution.toRequestPayloadWithExternalMemory(runtime),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new WorkflowExecutionResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {WorkflowExecution} runtime
   * @returns {AsyncData<WorkflowExecutionResponse, H3Error<ErrorResponse>>}
   */
  const stop = ({
    executionArn: execution_arn,
  }) => {
    return client.post('/runtime/stop-execution', {
      watch: false,
      lazy: true,
      body: {
        execution_arn,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {WorkflowExecution} runtime
   * @returns {AsyncData<WorkflowExecutionResponse, H3Error<ErrorResponse>>}
   */
  const update = ({
    executionArn: execution_arn,
    displayName: display_name,
  } = {}) => {
    return client.post('/runtime/update-execution', {
      watch: false,
      lazy: true,
      body: {
        execution_arn,
        display_name,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {WorkflowExecution} runtime
   * @returns {AsyncData<WorkflowExecutionResponse, H3Error<ErrorResponse>>}
   */
  const getHistory = ({
    executionArn: execution_arn,
    limit = ListConstant.WorkflowExecutionHistoryParams.PER_PAGE,
    reverseOrder: reverse_order,
    nextToken: next_token,
    includeExecutionData: include_execution_data,
  } = {}, {
    lazy = true,
  } = {}) => {
    return client.post('/runtime/get-execution-history', {
      watch: false,
      lazy,
      body: {
        execution_arn,
        limit,
        reverse_order,
        next_token,
        include_execution_data,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new WorkflowExecutionHistoryResponse(finalResponse._data);
        }
      },
    });
  };

  return {
    list,
    get,
    start,
    startWithExternalMemory,
    stop,
    update,
    getHistory,
  };
};
