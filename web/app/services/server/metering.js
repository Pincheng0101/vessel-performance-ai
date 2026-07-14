import {
  MeteringDescribeQuerySearchEngineUsage,
  MeteringDescribeQuerySearchEngineUsageResponse,
  MeteringDescribeQueryTokenUsage,
  MeteringDescribeQueryTokenUsageResponse,
  MeteringGetAgentCreditUsage,
  MeteringGetAgentCreditUsageResponse,
  MeteringGetAthenaQueryResult,
  MeteringGetAthenaQueryResultResponse,
  MeteringGetModelPricingResponse,
  MeteringStartAgentCreditUsage,
  MeteringStartAgentCreditUsageResponse,
  MeteringStartAthenaQuery,
  MeteringStartAthenaQueryResponse,
  MeteringStartQuerySearchEngineUsage,
  MeteringStartQuerySearchEngineUsageResponse,
  MeteringStartQueryTokenUsage,
  MeteringStartQueryTokenUsageResponse,
} from '~/models/server/metering';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function metering({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<MeteringStartQueryTokenUsageResponse, H3Error<ErrorResponse>>}
   */
  const startQueryTokenUsage = (request, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/metering/start-query-token-usage', {
      watch: false,
      lazy,
      signal,
      body: MeteringStartQueryTokenUsage.toRequestPayload(request),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new MeteringStartQueryTokenUsageResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<MeteringDescribeQueryTokenUsageResponse, H3Error<ErrorResponse>>}
   */
  const describeQueryTokenUsage = (request, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/metering/describe-query-token-usage', {
      watch: false,
      lazy,
      signal,
      body: MeteringDescribeQueryTokenUsage.toRequestPayload(request),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new MeteringDescribeQueryTokenUsageResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<MeteringStartQuerySearchEngineUsageResponse, H3Error<ErrorResponse>>}
   */
  const startQuerySearchEngineUsage = (request, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/metering/start-query-search-engine-usage', {
      watch: false,
      lazy,
      signal,
      body: MeteringStartQuerySearchEngineUsage.toRequestPayload(request),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new MeteringStartQuerySearchEngineUsageResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<MeteringDescribeQuerySearchEngineUsageResponse, H3Error<ErrorResponse>>}
   */
  const describeQuerySearchEngineUsage = (request, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/metering/describe-query-search-engine-usage', {
      watch: false,
      lazy,
      signal,
      body: MeteringDescribeQuerySearchEngineUsage.toRequestPayload(request),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new MeteringDescribeQuerySearchEngineUsageResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<MeteringGetModelPricingResponse, H3Error<ErrorResponse>>}
   */
  const getModelPricing = ({
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/metering/get-model-pricing', {
      watch: false,
      lazy,
      signal,
      body: {},
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new MeteringGetModelPricingResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<MeteringStartAgentCreditUsageResponse, H3Error<ErrorResponse>>}
   */
  const startAgentCreditUsage = (request, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/metering/start-agent-credit-usage', {
      watch: false,
      lazy,
      signal,
      body: MeteringStartAgentCreditUsage.toRequestPayload(request),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new MeteringStartAgentCreditUsageResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<MeteringGetAgentCreditUsageResponse, H3Error<ErrorResponse>>}
   */
  const getAgentCreditUsage = (request, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/metering/get-agent-credit-usage', {
      watch: false,
      lazy,
      signal,
      body: MeteringGetAgentCreditUsage.toRequestPayload(request),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new MeteringGetAgentCreditUsageResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<MeteringStartAthenaQueryResponse, H3Error<ErrorResponse>>}
   */
  const startAthenaQuery = (request, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/metering/start-athena-query', {
      watch: false,
      lazy,
      signal,
      body: MeteringStartAthenaQuery.toRequestPayload(request),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new MeteringStartAthenaQueryResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<MeteringGetAthenaQueryResultResponse, H3Error<ErrorResponse>>}
   */
  const getAthenaQueryResult = (request, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/metering/get-athena-query-result', {
      watch: false,
      lazy,
      signal,
      body: MeteringGetAthenaQueryResult.toRequestPayload(request),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new MeteringGetAthenaQueryResultResponse(finalResponse._data);
        }
      },
    });
  };

  return {
    describeQuerySearchEngineUsage,
    describeQueryTokenUsage,
    getAgentCreditUsage,
    getAthenaQueryResult,
    getModelPricing,
    startAgentCreditUsage,
    startAthenaQuery,
    startQuerySearchEngineUsage,
    startQueryTokenUsage,
  };
}
