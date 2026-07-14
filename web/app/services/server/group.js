import { AccountConstant, ListConstant } from '~/constants';
import { Group, GroupListResponse, GroupResponse } from '~/models/server/group';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function group({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<GroupListResponse, H3Error<ErrorResponse>>}
   */
  const adminList = ({
    userName: username,
    limit = 60,
    nextToken: next_token,
    sortField = ListConstant.DefaultParams.SORT_FIELD,
    sortOrder = ListConstant.DefaultParams.SORT_ORDER,
    filters = ListConstant.DefaultParams.FILTERS,
    filterLogic = ListConstant.DefaultParams.FILTER_LOGIC,
    query = ListConstant.DefaultParams.QUERY,
    outputFields = ListConstant.DefaultParams.OUTPUT_FIELDS,
    accountType = AccountConstant.AccountType.GROUP.value,
  } = {}, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/account/admin-list-groups', {
      watch: false,
      lazy,
      signal,
      body: {
        next_token,
        limit,
        username,
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
          response._data = new GroupListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {Group} account
   * @returns {AsyncData<GroupResponse, H3Error<ErrorResponse>>}
   */
  const adminCreate = (account) => {
    return client.post('/account/admin-create-group', {
      watch: false,
      lazy: true,
      body: Group.toRequestPayload(account),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new GroupResponse(finalResponse._data.group);
        }
      },
    });
  };

  /**
   * @param {Group} account
   * @returns {AsyncData<GroupResponse, H3Error<ErrorResponse>>}
   */
  const adminGet = ({
    groupName: group_name,
  } = {}) => {
    return client.post('/account/admin-get-group', {
      watch: false,
      lazy: true,
      body: {
        group_name,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new GroupResponse(finalResponse._data.group);
        }
      },
    });
  };

  /**
   * @param {Group} account
   * @returns {AsyncData<GroupResponse, H3Error<ErrorResponse>>}
   */
  const adminUpdate = (account) => {
    return client.post('/account/admin-update-group', {
      watch: false,
      lazy: true,
      body: Group.toRequestPayload(account),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {Group} account
   * @returns {AsyncData<GroupResponse, H3Error<ErrorResponse>>}
   */
  const adminDestroy = ({
    groupName: group_name,
  }) => {
    return client.post('/account/admin-delete-group', {
      watch: false,
      lazy: true,
      body: {
        group_name,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  const adminAddUsers = ({
    groupName: group_name,
    userNames: usernames,
  }) => {
    return client.post('/account/admin-add-users-to-group', {
      watch: false,
      lazy: true,
      body: {
        group_name,
        usernames,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  const adminRemoveUsers = ({
    groupName: group_name,
    userNames: usernames,
  }) => {
    return client.post('/account/admin-remove-users-from-group', {
      watch: false,
      lazy: true,
      body: {
        group_name,
        usernames,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {Group} account
   * @returns {AsyncData<GroupResponse, H3Error<ErrorResponse>>}
   */
  const get = ({
    groupName: group_name,
  } = {}) => {
    return client.post('/account/get-group', {
      watch: false,
      lazy: true,
      body: {
        group_name,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new GroupResponse(finalResponse._data.group);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<GroupListResponse, H3Error<ErrorResponse>>}
   */
  const listGroupsForUser = ({
    limit = 60,
    nextToken: next_token,
    sortField = ListConstant.DefaultParams.SORT_FIELD,
    sortOrder = ListConstant.DefaultParams.SORT_ORDER,
    filters = ListConstant.DefaultParams.FILTERS,
    filterLogic = ListConstant.DefaultParams.FILTER_LOGIC,
    query = ListConstant.DefaultParams.QUERY,
    outputFields = ListConstant.DefaultParams.OUTPUT_FIELDS,
    accountType = AccountConstant.AccountType.GROUP.value,
  } = {}, {
    lazy = true,
  } = {}) => {
    return client.post('/account/list-groups-for-user', {
      watch: false,
      lazy,
      body: {
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
          response._data = new GroupListResponse(finalResponse._data);
        }
      },
    });
  };

  return {
    adminList,
    adminCreate,
    adminGet,
    adminUpdate,
    adminDestroy,
    adminAddUsers,
    adminRemoveUsers,
    get,
    listGroupsForUser,
  };
}
