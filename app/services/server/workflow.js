import { ListConstant } from '~/constants';
import { Workflow, WorkflowListResponse, WorkflowResponse } from '~/models/server/workflow';
import { WorkflowDefinition } from '~/models/workflow/state';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function workflow({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @param {Variable} resource
   * @returns {AsyncData<WorkflowListResponse, H3Error<ErrorResponse>>}
   */
  const list = ({
    nextToken: next_token,
    outputFields: output_fields = ['workflow_id', 'workflow_name', 'status', 'updated_ts'],
    limit = ListConstant.DefaultParams.PER_PAGE,
    sortField = ListConstant.DefaultParams.SORT_FIELD,
    sortOrder = ListConstant.DefaultParams.SORT_ORDER,
    filters = ListConstant.DefaultParams.FILTERS,
    filterLogic = ListConstant.DefaultParams.FILTER_LOGIC,
    query = ListConstant.DefaultParams.QUERY,
  } = {}, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/resource/list-workflows', {
      watch: false,
      lazy,
      signal,
      body: {
        next_token,
        limit,
        output_fields,
        sort_field: sortField,
        sort_order: sortOrder,
        filters,
        filter_logic: filterLogic,
        search_string: query,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new WorkflowListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {Workflow} workflow
   * @returns {AsyncData<WorkflowResponse, H3Error<ErrorResponse>>}
   */
  const create = (workflow) => {
    return client.post('/resource/create-workflow', {
      watch: false,
      lazy: true,
      body: Workflow.toRequestPayload(workflow),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new WorkflowResponse(finalResponse._data.workflow);
        }
      },
    });
  };

  /**
   * @param {Workflow} workflow
   * @returns {AsyncData<WorkflowResponse, H3Error<ErrorResponse>>}
   */
  const get = ({
    workflowId: workflow_id,
  } = {}, {
    lazy = true,
    signal,
    onResponse = () => {},
    onResponseError: customOnResponseError,
  } = {}) => {
    return client.post('/resource/get-workflow', {
      watch: false,
      lazy,
      signal,
      body: {
        workflow_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: customOnResponseError ?? handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new WorkflowResponse(finalResponse._data.workflow);
        }
        onResponse(response);
      },
    });
  };

  /**
   * @param {Workflow} workflow
   * @returns {AsyncData<WorkflowResponse, H3Error<ErrorResponse>>}
   */
  const update = (workflow) => {
    return client.post('/resource/update-workflow', {
      watch: false,
      lazy: true,
      body: Workflow.toRequestPayload(workflow),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {Workflow} workflow
   * @returns {AsyncData<WorkflowResponse, H3Error<ErrorResponse>>}
   */
  const destroy = ({
    workflowId: workflow_id,
  }) => {
    return client.post('/resource/delete-workflow', {
      watch: false,
      lazy: true,
      body: {
        workflow_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {string} workflowId
   * @param {string} newWorkflowName
   * @returns {AsyncData<WorkflowResponse, H3Error<ErrorResponse>>}
   */
  const duplicate = async ({
    workflowId: workflow_id,
    newWorkflowName: new_workflow_name,
  }) => {
    const { data, error } = await get({ workflowId: workflow_id });

    if (error.value) {
      return { data: null, error };
    }

    const newWorkflow = new Workflow({
      ...data.value,
      workflowName: new_workflow_name,
      definition: WorkflowDefinition.toAsl(data.value.definition),
    });

    return create(newWorkflow);
  };

  return {
    list,
    create,
    get,
    update,
    destroy,
    duplicate,
  };
};
