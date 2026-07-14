import { ListConstant } from '~/constants';
import { WorkflowCronExecutionListResponse } from '~/models/server/workflowCron';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function workflowCronExecution({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<WorkflowCronExecutionListResponse, H3Error<ErrorResponse>>}
   */
  const list = ({
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
  };
}
