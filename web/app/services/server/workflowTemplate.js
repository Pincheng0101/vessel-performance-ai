import { ListConstant } from '~/constants';
import {
  WorkflowDefinitionExportResponse,
  WorkflowDefinitionImportResponse,
  WorkflowDefinitionToExport,
  WorkflowDefinitionToImport,
  WorkflowTemplate,
  WorkflowTemplateListResponse,
  WorkflowTemplateResponse,
} from '~/models/server/workflowTemplate';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function workflowTemplate({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<WorkflowTemplateListResponse, H3Error<ErrorResponse>>}
   */
  const list = ({
    nextToken: next_token,
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
    return client.post('/resource/list-workflow-templates', {
      watch: false,
      lazy,
      signal,
      body: {
        next_token,
        limit,
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
          response._data = new WorkflowTemplateListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<WorkflowTemplateResponse, H3Error<ErrorResponse>>}
   */
  const get = ({
    workflowTemplateId: workflow_template_id,
  } = {}, {
    lazy = true,
    signal,
    onResponse = () => {},
  } = {}) => {
    return client.post('/resource/get-workflow-template', {
      watch: false,
      lazy,
      signal,
      body: {
        workflow_template_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new WorkflowTemplateResponse(finalResponse._data.workflow_template);
        }
        onResponse(response);
      },
    });
  };

  /**
   * @param {WorkflowDefinitionToImport} definition
   * @returns {AsyncData<WorkflowDefinitionImportResponse, H3Error<ErrorResponse>>}
   */
  const importDefinition = (definition) => {
    return client.post('/resource/import-workflow-definition', {
      watch: false,
      lazy: true,
      body: WorkflowDefinitionToImport.toRequestPayload(definition),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new WorkflowDefinitionImportResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {WorkflowDefinitionToExport} definition
   * @returns {AsyncData<WorkflowDefinitionExportResponse, H3Error<ErrorResponse>>}
   */
  const exportDefinition = (definition) => {
    return client.post('/resource/export-workflow-definition', {
      watch: false,
      lazy: true,
      body: WorkflowDefinitionToExport.toRequestPayload(definition),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new WorkflowDefinitionExportResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {WorkflowTemplate} template
   * @returns {AsyncData<WorkflowTemplateResponse, H3Error<ErrorResponse>>}
   */
  const create = (template) => {
    return client.post('/resource/create-workflow-template', {
      watch: false,
      lazy: true,
      body: WorkflowTemplate.toRequestPayload(template),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new WorkflowTemplateResponse(finalResponse._data.workflow_template);
        }
      },
    });
  };

  const destroy = ({
    workflowTemplateId: workflow_template_id,
  }) => {
    return client.post('/resource/delete-workflow-template', {
      watch: false,
      lazy: true,
      body: {
        workflow_template_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  return {
    list,
    get,
    importDefinition,
    exportDefinition,
    create,
    destroy,
  };
}
