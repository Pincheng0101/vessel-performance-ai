import { ListConstant } from '~/constants';
import { LambdaFunction, LambdaFunctionListResponse, LambdaFunctionResponse } from '~/models/server/lambdaFunction';

export default function lambdaFunction({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
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
    return client.post('/resource/list-lambda-functions', {
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
          response._data = new LambdaFunctionListResponse(finalResponse._data);
        }
      },
    });
  };

  const create = (resource) => {
    return client.post('/resource/create-lambda-function', {
      watch: false,
      lazy: true,
      body: LambdaFunction.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new LambdaFunctionResponse(finalResponse._data.lambda_function);
        }
      },
    });
  };

  const get = ({
    lambdaFunctionId: lambda_function_id,
  } = {}, {
    lazy = true,
    onResponse = () => {},
  } = {}) => {
    return client.post('/resource/get-lambda-function', {
      watch: false,
      lazy,
      body: {
        lambda_function_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new LambdaFunctionResponse(finalResponse._data.lambda_function);
        }
        onResponse(response);
      },
    });
  };

  const update = (resource) => {
    return client.post('/resource/update-lambda-function', {
      watch: false,
      lazy: true,
      body: LambdaFunction.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  const destroy = ({
    lambdaFunctionId: lambda_function_id,
  } = {}) => {
    return client.post('/resource/delete-lambda-function', {
      watch: false,
      lazy: true,
      body: {
        lambda_function_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  const duplicate = async ({
    lambdaFunctionId: lambda_function_id,
    newLambdaFunctionName: new_lambda_function_name,
  }) => {
    const { data, error } = await get({ lambdaFunctionId: lambda_function_id });

    if (error.value) {
      return { data: null, error };
    }

    const newLambdaFunction = new LambdaFunction({
      ...data.value,
      lambdaFunctionId: '',
      lambdaFunctionName: new_lambda_function_name,
    });
    return create(newLambdaFunction);
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
