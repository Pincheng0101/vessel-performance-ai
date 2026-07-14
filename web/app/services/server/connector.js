import { ListConstant } from '~/constants';
import { ConnectorFactory, ConnectorListResponse, ConnectorResponseFactory } from '~/models/server/connector';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { Connector, ConnectorResponse } from '~/models/server/connector'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function connector({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<ConnectorListResponse, H3Error<ErrorResponse>>}
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
    return client.post('/resource/list-connectors', {
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
          response._data = new ConnectorListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {Connector} resource
   * @returns {AsyncData<ConnectorResponse, H3Error<ErrorResponse>>}
   */
  const create = (resource) => {
    return client.post('/resource/create-connector', {
      watch: false,
      lazy: true,
      body: ConnectorFactory.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = ConnectorResponseFactory.create(finalResponse._data.connector);
        }
      },
    });
  };

  /**
   * @param {Connector} resource
   * @returns {AsyncData<ConnectorResponse, H3Error<ErrorResponse>>}
   */
  const get = ({
    connectorId: connector_id,
  } = {}, {
    lazy = true,
    onResponse = () => {},
  } = {}) => {
    return client.post('/resource/get-connector', {
      watch: false,
      lazy,
      body: {
        connector_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = ConnectorResponseFactory.create(finalResponse._data.connector);
        }
        onResponse(response);
      },
    });
  };

  /**
   * @param {Connector} resource
   * @returns {AsyncData<ConnectorResponse, H3Error<ErrorResponse>>}
   */
  const update = (resource) => {
    return client.post('/resource/update-connector', {
      watch: false,
      lazy: true,
      body: ConnectorFactory.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {Connector} resource
   * @returns {AsyncData<ConnectorResponse, H3Error<ErrorResponse>>}
   */
  const destroy = ({
    connectorId: connector_id,
  }) => {
    return client.post('/resource/delete-connector', {
      watch: false,
      lazy: true,
      body: {
        connector_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {string} connectorId
   * @param {string} newConnectorName
   * @returns {AsyncData<ConnectorResponse, H3Error<ErrorResponse>>}
   */
  const duplicate = async ({
    connectorId: connector_id,
    newConnectorName: new_connector_name,
  }) => {
    const { data, error } = await get({ connectorId: connector_id });

    if (error.value) {
      return { data: null, error };
    }

    const newConnector = ConnectorFactory.create({
      ...data.value,
      connectorName: new_connector_name,
    });
    return create(newConnector);
  };

  /**
   * @param {Connector} resource
   * @returns {AsyncData<ConnectorResponse, H3Error<ErrorResponse>>}
   */
  const validate = (resource) => {
    return client.post('/resource/validate-connector', {
      watch: false,
      lazy: true,
      body: ConnectorFactory.toValidateRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  return {
    list,
    create,
    get,
    update,
    destroy,
    duplicate,
    validate,
  };
};
