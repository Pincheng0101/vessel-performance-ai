import { AccountConstant, ListConstant } from '~/constants';
import { AgentPermission, AgentPermissionListResponse, AgentPermissionResponse } from '~/models/server/agentPermission';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function agentPermission({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<AgentPermissionListResponse, H3Error<ErrorResponse>>}
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
    accountType = AccountConstant.AccountType.AGENT_PERMISSION.value,
  } = {}, {
    lazy = true,
  } = {}) => {
    return client.post('/account/admin-list-agent-permissions', {
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
          response._data = new AgentPermissionListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {AgentPermission} permission
   * @returns {AsyncData<AgentPermissionResponse, H3Error<ErrorResponse>>}
   */
  const adminCreate = (permission) => {
    return client.post('/account/admin-create-agent-permission', {
      watch: false,
      lazy: true,
      body: AgentPermission.toRequestPayload(permission),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new AgentPermissionResponse(finalResponse._data.agent_permission);
        }
      },
    });
  };

  /**
   * @param {AgentPermission} permission
   * @returns {AsyncData<AgentPermissionResponse, H3Error<ErrorResponse>>}
   */
  const adminUpdate = (permission) => {
    return client.post('/account/admin-update-agent-permission', {
      watch: false,
      lazy: true,
      body: AgentPermission.toRequestPayload(permission),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @returns {AsyncData<AgentPermissionResponse, H3Error<ErrorResponse>>}
   */
  const adminDestroy = ({
    groupName: group_name,
    agentId: agent_id,
  }) => {
    return client.post('/account/admin-delete-agent-permission', {
      watch: false,
      lazy: true,
      body: {
        group_name,
        agent_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @returns {AsyncData<AgentPermissionListResponse, H3Error<ErrorResponse>>}
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
    accountType = AccountConstant.AccountType.AGENT_PERMISSION.value,
  } = {}, {
    lazy = true,
  } = {}) => {
    return client.post('/account/list-agent-permissions', {
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
          response._data = new AgentPermissionListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<AgentPermissionListResponse, H3Error<ErrorResponse>>}
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
    accountType = AccountConstant.AccountType.AGENT_PERMISSION.value,
  } = {}, {
    lazy = true,
  } = {}) => {
    return client.post('/account/list-agent-permissions-for-user', {
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
          response._data = new AgentPermissionListResponse(finalResponse._data);
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
