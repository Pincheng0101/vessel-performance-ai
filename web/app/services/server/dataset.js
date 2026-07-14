import { ListConstant } from '~/constants';
import {
  Dataset,
  DatasetListResponse,
  DatasetResponse,
} from '~/models/server/dataset';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function dataset({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<DatasetListResponse, H3Error<ErrorResponse>>}
   */
  const list = ({
    nextToken: next_token,
    limit = ListConstant.DefaultParams.PER_PAGE,
    sortField = ListConstant.DefaultParams.SORT_FIELD,
    sortOrder = ListConstant.DefaultParams.SORT_ORDER,
    filters = ListConstant.DefaultParams.FILTERS,
    filterLogic = ListConstant.DefaultParams.FILTER_LOGIC,
    query = ListConstant.DefaultParams.QUERY,
    outputFields = ListConstant.DefaultParams.OUTPUT_FIELDS,
    resourceType = 'dataset',
  } = {}, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/resource/list-datasets', {
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
        output_fields: outputFields,
        resource_type: resourceType,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new DatasetListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {Dataset} resource
   * @returns {AsyncData<DatasetResponse, H3Error<ErrorResponse>>}
   */
  const create = (resource) => {
    return client.post('/resource/create-dataset', {
      watch: false,
      lazy: true,
      body: Dataset.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new DatasetResponse(finalResponse._data.dataset);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<DatasetResponse, H3Error<ErrorResponse>>}
   */
  const get = ({
    datasetId: dataset_id,
  } = {}, {
    lazy = true,
    signal,
    onResponse = () => {},
  } = {}) => {
    return client.post('/resource/get-dataset', {
      watch: false,
      lazy,
      signal,
      body: {
        dataset_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new DatasetResponse(finalResponse._data.dataset);
        }
        onResponse(response);
      },
    });
  };

  /**
   * @param {Dataset} resource
   * @returns {AsyncData<Object, H3Error<ErrorResponse>>}
   */
  const update = (resource) => {
    return client.post('/resource/update-dataset', {
      watch: false,
      lazy: true,
      body: Dataset.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @returns {AsyncData<Object, H3Error<ErrorResponse>>}
   */
  const destroy = ({
    datasetId: dataset_id,
    cascade = true,
  } = {}) => {
    return client.post('/resource/delete-dataset', {
      watch: false,
      lazy: true,
      body: {
        dataset_id,
        cascade,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {string} datasetId
   * @param {string} newDatasetName
   * @returns {AsyncData<DatasetResponse, H3Error<ErrorResponse>>}
   */
  const duplicate = async ({
    datasetId: dataset_id,
    newDatasetName: new_dataset_name,
  }) => {
    const { data, error } = await get({ datasetId: dataset_id });

    if (error.value) {
      return { data: null, error };
    }

    const newDataset = new Dataset({
      ...data.value,
      datasetName: new_dataset_name,
    });
    return create(newDataset);
  };

  return {
    list,
    create,
    get,
    update,
    destroy,
    duplicate,
  };
}
