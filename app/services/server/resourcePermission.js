import { AccountConstant, ListConstant } from '~/constants';
import { ResourcePermission, ResourcePermissionListResponse, ResourcePermissionResponse } from '~/models/server/resourcePermission';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function resourcePermission({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<ResourcePermissionListResponse, H3Error<ErrorResponse>>}
   */
  const adminList = ({
    groupName: group_name,
    resourceType: resource_type,
    limit = ListConstant.DefaultParams.PER_PAGE,
    nextToken: next_token,
    sortField = ListConstant.DefaultParams.SORT_FIELD,
    sortOrder = ListConstant.DefaultParams.SORT_ORDER,
    filters = ListConstant.DefaultParams.FILTERS,
    filterLogic = ListConstant.DefaultParams.FILTER_LOGIC,
    query = ListConstant.DefaultParams.QUERY,
    outputFields = ListConstant.DefaultParams.OUTPUT_FIELDS,
    accountType = AccountConstant.AccountType.RESOURCE_PERMISSION.value,
  } = {}, {
    lazy = true,
  } = {}) => {
    return client.post('/account/admin-list-resource-permissions', {
      watch: false,
      lazy,
      body: {
        group_name,
        resource_type,
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
          response._data = new ResourcePermissionListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {ResourcePermission} permission
   * @returns {AsyncData<ResourcePermissionResponse, H3Error<ErrorResponse>>}
   */
  const adminCreate = (permission) => {
    return client.post('/account/admin-create-resource-permission', {
      watch: false,
      lazy: true,
      body: ResourcePermission.toRequestPayload(permission),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new ResourcePermissionResponse(finalResponse._data.resource_permission);
        }
      },
    });
  };

  /**
   * @param {ResourcePermission} permission
   * @returns {AsyncData<ResourcePermissionResponse, H3Error<ErrorResponse>>}
   */
  const adminUpdate = (permission) => {
    return client.post('/account/admin-update-resource-permission', {
      watch: false,
      lazy: true,
      body: ResourcePermission.toRequestPayload(permission),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @returns {AsyncData<ResourcePermissionResponse, H3Error<ErrorResponse>>}
   */
  const adminDestroy = ({
    groupName: group_name,
    resourceId: resource_id,
  }) => {
    return client.post('/account/admin-delete-resource-permission', {
      watch: false,
      lazy: true,
      body: {
        group_name,
        resource_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @returns {AsyncData<ResourcePermissionListResponse, H3Error<ErrorResponse>>}
   */
  const listByGroup = ({
    groupName: group_name,
    resourceType: resource_type,
    limit = ListConstant.DefaultParams.PER_PAGE,
    nextToken: next_token,
    sortField = ListConstant.DefaultParams.SORT_FIELD,
    sortOrder = ListConstant.DefaultParams.SORT_ORDER,
    filters = ListConstant.DefaultParams.FILTERS,
    filterLogic = ListConstant.DefaultParams.FILTER_LOGIC,
    query = ListConstant.DefaultParams.QUERY,
    outputFields = ListConstant.DefaultParams.OUTPUT_FIELDS,
    accountType = AccountConstant.AccountType.RESOURCE_PERMISSION.value,
  } = {}, {
    lazy = true,
  } = {}) => {
    return client.post('/account/list-resource-permissions', {
      watch: false,
      lazy,
      body: {
        group_name,
        resource_type,
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
          response._data = new ResourcePermissionListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<ResourcePermissionListResponse, H3Error<ErrorResponse>>}
   */
  const listByUser = ({
    username,
    resourceType,
    limit = ListConstant.DefaultParams.PER_PAGE,
    nextToken: next_token,
    sortField = ListConstant.DefaultParams.SORT_FIELD,
    sortOrder = ListConstant.DefaultParams.SORT_ORDER,
    filters = ListConstant.DefaultParams.FILTERS,
    filterLogic = ListConstant.DefaultParams.FILTER_LOGIC,
    query = ListConstant.DefaultParams.QUERY,
    outputFields = ListConstant.DefaultParams.OUTPUT_FIELDS,
    accountType = AccountConstant.AccountType.RESOURCE_PERMISSION.value,
  } = {}, {
    lazy = true,
  } = {}) => {
    return client.post('/account/list-resource-permissions-for-user', {
      watch: false,
      lazy,
      body: {
        username,
        resource_type: resourceType,
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
          response._data = new ResourcePermissionListResponse(finalResponse._data);
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
