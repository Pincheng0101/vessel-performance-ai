import { ListConstant } from '~/constants';
import {
  WorkflowCron,
  WorkflowCronExecutionListResponse,
  WorkflowCronListResponse,
  WorkflowCronResponse,
} from '~/models/server/workflowCron';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function workflowCron({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<WorkflowCronListResponse, H3Error<ErrorResponse>>}
   */
  const list = ({
    workflowId: workflow_id,
    nextToken: next_token,
    limit = ListConstant.DefaultParams.PER_PAGE,
  } = {}, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/resource/list-workflow-crons', {
      watch: false,
      lazy,
      signal,
      body: {
        workflow_id,
        next_token,
        limit,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new WorkflowCronListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {WorkflowCron} resource
   * @returns {AsyncData<WorkflowCronResponse, H3Error<ErrorResponse>>}
   */
  const create = (resource) => {
    return client.post('/resource/create-workflow-cron', {
      watch: false,
      lazy: true,
      body: WorkflowCron.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new WorkflowCronResponse(finalResponse._data.workflow_cron);
        }
      },
    });
  };

  /**
   * @param {WorkflowCron} resource
   * @returns {AsyncData<WorkflowCronResponse, H3Error<ErrorResponse>>}
   */
  const get = ({
    workflowCronId: workflow_cron_id,
  } = {}, {
    lazy = true,
    signal,
    onResponse = () => {},
  } = {}) => {
    return client.post('/resource/get-workflow-cron', {
      watch: false,
      lazy,
      signal,
      body: {
        workflow_cron_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new WorkflowCronResponse(finalResponse._data.workflow_cron);
        }
        onResponse(response);
      },
    });
  };

  /**
   * @param {WorkflowCron} resource
   * @returns {AsyncData<WorkflowCronResponse, H3Error<ErrorResponse>>}
   */
  const update = (resource) => {
    return client.post('/resource/update-workflow-cron', {
      watch: false,
      lazy: true,
      body: WorkflowCron.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {WorkflowCron} resource
   * @returns {AsyncData<WorkflowCronResponse, H3Error<ErrorResponse>>}
   */
  const destroy = ({
    workflowCronId: workflow_cron_id,
  }) => {
    return client.post('/resource/delete-workflow-cron', {
      watch: false,
      lazy: true,
      body: {
        workflow_cron_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @returns {AsyncData<WorkflowCronExecutionListResponse, H3Error<ErrorResponse>>}
   */
  const listExecutions = ({
    workflowCronId: workflow_cron_id,
    nextToken: next_token,
    limit = ListConstant.DefaultParams.PER_PAGE,
  } = {}, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/runtime/list-workflow-cron-executions', {
      watch: false,
      lazy,
      signal,
      body: {
        workflow_cron_id,
        next_token,
        limit,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new WorkflowCronExecutionListResponse(finalResponse._data);
        }
      },
    });
  };

  return {
    list,
    create,
    get,
    update,
    destroy,
    listExecutions,
  };
}
