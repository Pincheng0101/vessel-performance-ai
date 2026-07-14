import { ListConstant } from '~/constants';
import { McpServerFactory, McpServerListResponse, McpServerResponseFactory, McpServerToolCallRequest, McpServerToolListRequest, McpServerToolListResponse, McpServerValidateRequest } from '~/models/server/mcpServer';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 * @import { McpServer, McpServerResponse } from '~/models/server/mcpServer'
 */

export default function mcpServer({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<McpServerListResponse, H3Error<ErrorResponse>>}
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
    return client.post('/resource/list-mcp-servers', {
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
          response._data = new McpServerListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {McpServer} resource
   * @returns {AsyncData<McpServerResponse, H3Error<ErrorResponse>>}
   */
  const create = (resource) => {
    return client.post('/resource/create-mcp-server', {
      watch: false,
      lazy: true,
      body: McpServerFactory.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = McpServerResponseFactory.create(finalResponse._data.mcp_server);
        }
      },
    });
  };

  /**
   * @param {McpServer} resource
   * @returns {AsyncData<McpServerResponse, H3Error<ErrorResponse>>}
   */
  const get = ({
    mcpServerId: mcp_server_id,
  } = {}, {
    lazy = true,
    onResponse = () => {},
  } = {}) => {
    return client.post('/resource/get-mcp-server', {
      watch: false,
      lazy,
      body: {
        mcp_server_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = McpServerResponseFactory.create(finalResponse._data.mcp_server);
        }
        onResponse(response);
      },
    });
  };

  /**
   * @param {McpServer} resource
   * @returns {AsyncData<McpServerResponse, H3Error<ErrorResponse>>}
   */
  const update = (resource) => {
    return client.post('/resource/update-mcp-server', {
      watch: false,
      lazy: true,
      body: McpServerFactory.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {McpServer} resource
   * @returns {AsyncData<McpServerResponse, H3Error<ErrorResponse>>}
   */
  const destroy = ({
    mcpServerId: mcp_server_id,
  }) => {
    return client.post('/resource/delete-mcp-server', {
      watch: false,
      lazy: true,
      body: {
        mcp_server_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {string} mcpServerId
   * @param {string} newMcpServerName
   * @returns {AsyncData<McpServerResponse, H3Error<ErrorResponse>>}
   */
  const duplicate = async ({
    mcpServerId: mcp_server_id,
    newMcpServerName: new_mcp_server_name,
  }) => {
    const { data, error } = await get({ mcpServerId: mcp_server_id });

    if (error.value) {
      return { data: null, error };
    }

    const newMcpServer = McpServerFactory.create({
      ...data.value,
      mcpServerName: new_mcp_server_name,
    });
    return create(newMcpServer);
  };

  /**
   * @param {McpServer} resource
   * @returns {AsyncData<McpServerToolListResponse, H3Error<ErrorResponse>>}
   */
  const listTools = ({
    mcpServerId,
    accessToken,
  } = {}, {
    lazy = true,
  } = {}) => {
    return client.post('/resource/list-mcp-tools', {
      watch: false,
      lazy,
      body: McpServerToolListRequest.toRequestPayload({
        mcpServerId,
        accessToken,
      }),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new McpServerToolListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {McpServerToolCallRequest} call
   * @returns {AsyncData<Object>, H3Error<ErrorResponse>>}
   */
  const callTool = (call) => {
    return client.post('/resource/call-mcp-tool', {
      watch: false,
      lazy: true,
      body: McpServerToolCallRequest.toRequestPayload(call),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = finalResponse._data.response;
        }
      },
    });
  };

  const validate = (request) => {
    return client.post('/resource/validate-mcp-server', {
      watch: false,
      lazy: true,
      body: McpServerValidateRequest.toRequestPayload(request),
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
    listTools,
    callTool,
    validate,
  };
};
