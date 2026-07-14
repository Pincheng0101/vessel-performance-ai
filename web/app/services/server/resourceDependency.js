import { Resource, ResourceDependencyDeleteResponse, ResourceDependencyListResponse } from '~/models/server/resourceDependency';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function resourceDependency({
  client,
  handleFinalResponse,
  handleRequestError,
  handleRequest,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<ResourceDependencyListResponse, H3Error<ErrorResponse>>}
   */
  const list = ({
    resourceId,
    resourceType,
    relatedResourceType,
    isRecursive = false,
  } = {}, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/resource/list-resource-dependencies', {
      watch: false,
      lazy,
      signal,
      body: {
        resource_id: resourceId,
        resource_type: resourceType,
        related_resource_type: relatedResourceType,
        is_recursive: isRecursive,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new ResourceDependencyListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {Object} param
   * @param {Resource<string>} param.resources
   * @returns {AsyncData<ResourceDependencyDeleteResponse, H3Error<ErrorResponse>>}
   */
  const deleteRecursively = ({
    resources,
  } = {}, {
    lazy = true,
  } = {}) => {
    const resourcesRequestPayload = resources.map(resource => Resource.toRequestPayload(resource));
    return client.post('/resource/delete-resources-recursively', {
      watch: false,
      lazy,
      body: {
        resources: resourcesRequestPayload,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new ResourceDependencyDeleteResponse(finalResponse._data);
        }
      },
    });
  };

  return {
    deleteRecursively,
    list,
  };
};
