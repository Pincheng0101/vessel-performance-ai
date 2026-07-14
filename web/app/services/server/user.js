import { AccountConstant, ListConstant } from '~/constants';
import { User, UserBatchGetResponse, UserListResponse, UserResponse } from '~/models/server/user';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function user({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<UserListResponse, H3Error<ErrorResponse>>}
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
    accountType = AccountConstant.AccountType.USER.value,
    outputFields = ListConstant.DefaultParams.OUTPUT_FIELDS,
  } = {}, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/account/admin-list-users', {
      watch: false,
      lazy,
      signal,
      body: {
        group_name,
        next_token,
        limit,
        sort_field: sortField,
        sort_order: sortOrder,
        filters,
        filter_logic: filterLogic,
        search_string: query,
        account_type: accountType,
        output_fields: outputFields,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new UserListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {User} account
   * @returns {AsyncData<UserResponse, H3Error<ErrorResponse>>}
   */
  const adminCreate = (account) => {
    return client.post('/account/admin-create-user', {
      watch: false,
      lazy: true,
      body: User.toRequestPayloadWithAdmin(account),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new UserResponse(finalResponse._data.user);
        }
      },
    });
  };

  /**
   * @param {User} account
   * @returns {AsyncData<UserResponse, H3Error<ErrorResponse>>}
   */
  const adminGet = ({
    userName: username,
  } = {}) => {
    return client.post('/account/admin-get-user', {
      watch: false,
      lazy: true,
      body: {
        username,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new UserResponse(finalResponse._data.user);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<UserBatchGetResponse, H3Error<ErrorResponse>>}
   */
  const adminGetUsers = ({
    userNames: usernames = [],
  } = {}, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/account/admin-get-users', {
      watch: false,
      lazy,
      signal,
      body: {
        usernames,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new UserBatchGetResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {User} account
   * @returns {AsyncData<UserResponse, H3Error<ErrorResponse>>}
   */
  const adminUpdate = (account) => {
    return client.post('/account/admin-update-user', {
      watch: false,
      lazy: true,
      body: User.toRequestPayloadWithAdmin(account),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {User} account
   * @returns {AsyncData<UserResponse, H3Error<ErrorResponse>>}
   */
  const adminDestroy = ({
    userName: username,
  }) => {
    return client.post('/account/admin-delete-user', {
      watch: false,
      lazy: true,
      body: {
        username,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {User} account
   * @returns {AsyncData<UserResponse, H3Error<ErrorResponse>>}
   */
  const adminResetUserPassword = ({
    userName: username,
    temporaryPassword: temporary_password,
  }) => {
    return client.post('/account/admin-reset-user-password', {
      watch: false,
      lazy: true,
      body: {
        username,
        temporary_password,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  const adminResetUserMfa = ({ userName: username }) => {
    return client.post('/account/admin-reset-user-mfa', {
      watch: false,
      lazy: true,
      body: { username },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  const adminUserGlobalSignOut = ({ userName: username }) => {
    return client.post('/account/admin-user-global-sign-out', {
      watch: false,
      lazy: true,
      body: { username },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  const globalSignOut = () => {
    return client.post('/account/global-sign-out', {
      watch: false,
      lazy: true,
      body: {},
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @returns {AsyncData<UserListResponse, H3Error<ErrorResponse>>}
   */
  const listUsersInGroup = ({
    groupName: group_name,
    nextToken: next_token,
    limit = ListConstant.DefaultParams.PER_PAGE,
    sortField = ListConstant.DefaultParams.SORT_FIELD,
    sortOrder = ListConstant.DefaultParams.SORT_ORDER,
    filters = ListConstant.DefaultParams.FILTERS,
    filterLogic = ListConstant.DefaultParams.FILTER_LOGIC,
    query = ListConstant.DefaultParams.QUERY,
    outputFields = ListConstant.DefaultParams.OUTPUT_FIELDS,
    accountType = AccountConstant.AccountType.USER.value,
  } = {}, {
    lazy = true,
  } = {}) => {
    return client.post('/account/list-users-in-group', {
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
          response._data = new UserListResponse(finalResponse._data);
        }
      },
    });
  };

  return {
    adminList,
    adminCreate,
    adminGet,
    adminGetUsers,
    adminUpdate,
    adminDestroy,
    adminResetUserPassword,
    adminResetUserMfa,
    adminUserGlobalSignOut,
    globalSignOut,
    listUsersInGroup,
  };
}
