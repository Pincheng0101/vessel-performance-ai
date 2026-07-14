import { CreateResourcePermission, CreateResourcePermissionResponse } from '~/models/server/createResourcePermission';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function createResourcePermission({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<CreateResourcePermissionResponse, H3Error<ErrorResponse>>}
   */
  const adminGet = ({
    groupName: group_name,
  } = {}, {
    lazy = true,
  } = {}) => {
    return client.post('/account/admin-get-create-resource-permission', {
      watch: false,
      lazy,
      body: {
        group_name,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new CreateResourcePermissionResponse(finalResponse._data.create_resource_permission);
        }
      },
    });
  };

  /**
   * @param {CreateResourcePermission} permission
   * @returns {AsyncData<void, H3Error<ErrorResponse>>}
   */
  const adminUpdate = (permission) => {
    return client.post('/account/admin-update-create-resource-permission', {
      watch: false,
      lazy: true,
      body: CreateResourcePermission.toRequestPayload(permission),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  return {
    adminGet,
    adminUpdate,
  };
}
