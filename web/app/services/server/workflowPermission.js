import { AccountConstant, ListConstant } from '~/constants';
import { WorkflowPermission, WorkflowPermissionListResponse, WorkflowPermissionResponse } from '~/models/server/workflowPermission';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function workflowPermission({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<WorkflowPermissionListResponse, H3Error<ErrorResponse>>}
   */
  const adminList = ({
    groupName: group_name,
    nextToken: next_token,
    limit = ListConstant.DefaultParams.PER_PAGE,
    sortField = ListConstant.DefaultParams.SORT_FIELD,
    sortOrder = ListConstant.DefaultParams.SORT_ORDER,
    filters = ListConstant.DefaultParams.FILTERS,
    filterLogic = ListConstant.DefaultParams.FILTER_LOGIC,
    query = ListConstant.DefaultParams.QUERY,
    outputFields = ListConstant.DefaultParams.OUTPUT_FIELDS,
    accountType = AccountConstant.AccountType.WORKFLOW_PERMISSION.value,
  } = {}, {
    lazy = true,
  } = {}) => {
    return client.post('/account/admin-list-workflow-permissions', {
      watch: false,
      lazy,
      body: {
        group_name,
        next_token,
        limit,
        sort_field: sortField,
        sort_order: sortOrder,
        filters,
        filter_logic: filterLogic,
        search_string: query,
        output_fields: outputFields,
        account_type: accountType,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new WorkflowPermissionListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {WorkflowPermission} permission
   * @returns {AsyncData<WorkflowPermissionResponse, H3Error<ErrorResponse>>}
   */
  const adminCreate = (permission) => {
    return client.post('/account/admin-create-workflow-permission', {
      watch: false,
      lazy: true,
      body: WorkflowPermission.toRequestPayload(permission),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new WorkflowPermissionResponse(finalResponse._data.workflow_permission);
        }
      },
    });
  };

  /**
   * @param {WorkflowPermission} permission
   * @returns {AsyncData<WorkflowPermissionResponse, H3Error<ErrorResponse>>}
   */
  const adminUpdate = (permission) => {
    return client.post('/account/admin-update-workflow-permission', {
      watch: false,
      lazy: true,
      body: WorkflowPermission.toRequestPayload(permission),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @returns {AsyncData<WorkflowPermissionResponse, H3Error<ErrorResponse>>}
   */
  const adminDestroy = ({
    groupName: group_name,
    workflowId: workflow_id,
  }) => {
    return client.post('/account/admin-delete-workflow-permission', {
      watch: false,
      lazy: true,
      body: {
        group_name,
        workflow_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @returns {AsyncData<WorkflowPermissionListResponse, H3Error<ErrorResponse>>}
   */
  const listByGroup = ({
    groupName: group_name,
    nextToken: next_token,
    limit = ListConstant.DefaultParams.PER_PAGE,
    sortField = ListConstant.DefaultParams.SORT_FIELD,
    sortOrder = ListConstant.DefaultParams.SORT_ORDER,
    filters = ListConstant.DefaultParams.FILTERS,
    filterLogic = ListConstant.DefaultParams.FILTER_LOGIC,
    query = ListConstant.DefaultParams.QUERY,
    outputFields = ListConstant.DefaultParams.OUTPUT_FIELDS,
    accountType = AccountConstant.AccountType.WORKFLOW_PERMISSION.value,
  } = {}, {
    lazy = true,
  } = {}) => {
    return client.post('/account/list-workflow-permissions', {
      watch: false,
      lazy,
      body: {
        group_name,
        next_token,
        limit,
        sort_field: sortField,
        sort_order: sortOrder,
        filters,
        filter_logic: filterLogic,
        search_string: query,
        output_fields: outputFields,
        account_type: accountType,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new WorkflowPermissionListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<WorkflowPermissionListResponse, H3Error<ErrorResponse>>}
   */
  const listByUser = ({
    username,
    nextToken: next_token,
    limit = ListConstant.DefaultParams.PER_PAGE,
    sortField = ListConstant.DefaultParams.SORT_FIELD,
    sortOrder = ListConstant.DefaultParams.SORT_ORDER,
    filters = ListConstant.DefaultParams.FILTERS,
    filterLogic = ListConstant.DefaultParams.FILTER_LOGIC,
    query = ListConstant.DefaultParams.QUERY,
    outputFields = ListConstant.DefaultParams.OUTPUT_FIELDS,
    accountType = AccountConstant.AccountType.WORKFLOW_PERMISSION.value,
  } = {}, {
    lazy = true,
  } = {}) => {
    return client.post('/account/list-workflow-permissions-for-user', {
      watch: false,
      lazy,
      body: {
        username,
        next_token,
        limit,
        sort_field: sortField,
        sort_order: sortOrder,
        filters,
        filter_logic: filterLogic,
        search_string: query,
        output_fields: outputFields,
        account_type: accountType,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new WorkflowPermissionListResponse(finalResponse._data);
        }
      },
    });
  };

  return {
    adminList,
    adminCreate,
    adminUpdate,
    adminDestroy,
    listByGroup,
    listByUser,
  };
}
