import { ListConstant } from '~/constants';
import { Storage, StorageListResponse, StorageResponse } from '~/models/server/storage';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function template({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<StorageListResponse, H3Error<ErrorResponse>>>}
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
    return client.post('/resource/list-storages', {
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
          response._data = new StorageListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {Storage} resource
   * @returns {AsyncData<StorageResponse, H3Error<ErrorResponse>>>}
   */
  const create = (resource) => {
    return client.post('/resource/create-storage', {
      watch: false,
      lazy: true,
      body: Storage.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new StorageResponse(finalResponse._data.storage);
        }
      },
    });
  };

  /**
   * @param {Storage} resource
   * @returns {AsyncData<StorageResponse, H3Error<ErrorResponse>>>}
   */
  const get = ({
    storageId: storage_id,
  } = {}, {
    lazy = true,
    onResponse = () => {},
  } = {}) => {
    return client.post('/resource/get-storage', {
      watch: false,
      lazy,
      body: {
        storage_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new StorageResponse(finalResponse._data.storage);
        }
        onResponse(response);
      },
    });
  };

  /**
   * @param {Storage} resource
   * @returns {AsyncData<StorageResponse, H3Error<ErrorResponse>>>}
   */
  const update = (resource) => {
    return client.post('/resource/update-storage', {
      watch: false,
      lazy: true,
      body: Storage.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {Storage} resource
   * @returns {AsyncData<StorageResponse, H3Error<ErrorResponse>>>}
   */
  const destroy = ({
    storageId: storage_id,
  }) => {
    return client.post('/resource/delete-storage', {
      watch: false,
      lazy: true,
      body: {
        storage_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {string} storageId
   * @param {string} newStorageName
   * @returns {AsyncData<StorageResponse, H3Error<ErrorResponse>>}
   */
  const duplicate = async ({
    storageId: storage_id,
    newStorageName: new_storage_name,
  }) => {
    const { data, error } = await get({ storageId: storage_id });

    if (error.value) {
      return { data: null, error };
    }
    const newStorage = new Storage({
      ...data.value,
      storageName: new_storage_name,
    });
    return create(newStorage);
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
