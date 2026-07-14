import { ListConstant } from '~/constants';
import { Template, TemplateListResponse, TemplateResponse } from '~/models/server/template';

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
   * @returns {AsyncData<TemplateListResponse, H3Error<ErrorResponse>>>}
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
    return client.post('/resource/list-templates', {
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
          response._data = new TemplateListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {Template} resource
   * @returns {AsyncData<TemplateResponse, H3Error<ErrorResponse>>>}
   */
  const create = (resource) => {
    return client.post('/resource/create-template', {
      watch: false,
      lazy: true,
      body: Template.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new TemplateResponse(finalResponse._data.template);
        }
      },
    });
  };

  /**
   * @param {Template} resource
   * @returns {AsyncData<TemplateResponse, H3Error<ErrorResponse>>>}
   */
  const get = ({
    templateId: template_id,
  } = {}, {
    lazy = true,
    onResponse = () => {},
  } = {}) => {
    return client.post('/resource/get-template', {
      watch: false,
      lazy,
      body: {
        template_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new TemplateResponse(finalResponse._data.template);
        }
        onResponse(response);
      },
    });
  };

  /**
   * @param {Template} resource
   * @returns {AsyncData<TemplateResponse, H3Error<ErrorResponse>>>}
   */
  const update = (resource) => {
    return client.post('/resource/update-template', {
      watch: false,
      lazy: true,
      body: Template.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {Template} resource
   * @returns {AsyncData<TemplateResponse, H3Error<ErrorResponse>>>}
   */
  const destroy = ({
    templateId: template_id,
  }) => {
    return client.post('/resource/delete-template', {
      watch: false,
      lazy: true,
      body: {
        template_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {string} templateId
   * @param {string} newTemplateName
   * @returns {AsyncData<TemplateResponse, H3Error<ErrorResponse>>}
   */
  const duplicate = async ({
    templateId: template_id,
    newTemplateName: new_template_name,
  }) => {
    const { data, error } = await get({ templateId: template_id });

    if (error.value) {
      return { data: null, error };
    }

    const newTemplate = new Template({
      ...data.value,
      templateName: new_template_name,
    });
    return create(newTemplate);
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
