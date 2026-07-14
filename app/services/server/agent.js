import { ListConstant } from '~/constants';
import { Agent, AgentListResponse, AgentResponse, StartAgent, StartAgentResponse, ValidateAgentTools, ValidateAgentToolsResponse } from '~/models/server/agent';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function agent({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @param {Agent} resource
   * @returns {AsyncData<AgentListResponse, H3Error<ErrorResponse>>}
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
    return client.post('/resource/list-agents', {
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
          response._data = new AgentListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {Agent} resource
   * @returns {AsyncData<AgentResponse, H3Error<ErrorResponse>>}
   */
  const create = (resource) => {
    return client.post('/resource/create-agent', {
      watch: false,
      lazy: true,
      body: Agent.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new AgentResponse(finalResponse._data.agent);
        }
      },
    });
  };

  /**
   * @param {Agent} resource
   * @returns {AsyncData<AgentResponse, H3Error<ErrorResponse>>}
   */
  const get = ({
    agentId: agent_id,
  } = {}, {
    lazy = true,
    signal,
    onResponse = () => {},
    onResponseError: customOnResponseError,
  } = {}) => {
    return client.post('/resource/get-agent', {
      watch: false,
      lazy,
      signal,
      body: {
        agent_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: customOnResponseError ?? handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new AgentResponse(finalResponse._data.agent);
        }
        onResponse(response);
      },
    });
  };

  /**
   * @param {Agent} resource
   * @returns {AsyncData<AgentResponse, H3Error<ErrorResponse>>}
   */
  const update = (resource) => {
    return client.post('/resource/update-agent', {
      watch: false,
      lazy: true,
      body: Agent.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {Agent} resource
   * @returns {AsyncData<AgentResponse, H3Error<ErrorResponse>>}
   */
  const destroy = ({
    agentId: agent_id,
  }) => {
    return client.post('/resource/delete-agent', {
      watch: false,
      lazy: true,
      body: {
        agent_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {StartAgent} runtime
   * @returns {AsyncData<StartAgentResponse, H3Error<ErrorResponse>>}
   */
  const start = (runtime, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/runtime/start-agent', {
      watch: false,
      lazy,
      signal,
      body: StartAgent.toRequestPayload(runtime),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new StartAgentResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {string} agentId
   * @param {string} newAgentName
   * @returns {AsyncData<AgentResponse, H3Error<ErrorResponse>>}
   */
  const duplicate = async ({
    agentId: agent_id,
    newAgentName: new_agent_name,
  }) => {
    const { data, error } = await get({ agentId: agent_id });

    if (error.value) {
      return { data: null, error };
    }

    const newAgent = new Agent({
      ...data.value,
      agentName: new_agent_name,
    });
    return create(newAgent);
  };

  /**
   * @param {ValidateAgentTools} request
   * @returns {AsyncData<ValidateAgentToolsResponse, H3Error<ErrorResponse>>}
   */
  const validateTools = (request, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/runtime/validate-agent-tools', {
      watch: false,
      lazy,
      signal,
      body: ValidateAgentTools.toRequestPayload(request),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new ValidateAgentToolsResponse(finalResponse._data);
        }
      },
    });
  };

  return {
    list,
    create,
    get,
    update,
    destroy,
    start,
    validateTools,
    duplicate,
  };
}
