import { ListConstant } from '~/constants';
import { KnowledgeBaseDocumentResponse, KnowledgeBaseFactory, KnowledgeBaseListResponse, KnowledgeBaseResponseFactory } from '~/models/server/knowledgeBase';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 * @import { KnowledgeBase, KnowledgeBaseDocumentResponse, KnowledgeBaseResponse } from '~/models/server/knowledgeBase'
 */

export default function knowledgeBase({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<KnowledgeBaseListResponse, H3Error<ErrorResponse>>}
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
    return client.post('/resource/list-knowledge-bases', {
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
          response._data = new KnowledgeBaseListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @param {KnowledgeBase} resource
   * @returns {AsyncData<KnowledgeBaseResponse, H3Error<ErrorResponse>>}
   */
  const create = (resource) => {
    return client.post('/resource/create-knowledge-base', {
      watch: false,
      lazy: true,
      body: KnowledgeBaseFactory.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = KnowledgeBaseResponseFactory.create(finalResponse._data.knowledge_base);
        }
      },
    });
  };

  /**
   * @param {KnowledgeBase} resource
   * @returns {AsyncData<KnowledgeBaseResponse, H3Error<ErrorResponse>>}
   */
  const get = ({
    knowledgeBaseId: knowledge_base_id,
  } = {}, {
    lazy = true,
    onResponse = () => {},
  } = {}) => {
    return client.post('/resource/get-knowledge-base', {
      watch: false,
      lazy,
      body: {
        knowledge_base_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = KnowledgeBaseResponseFactory.create(finalResponse._data.knowledge_base);
        }
        onResponse(response);
      },
    });
  };

  /**
   * @param {KnowledgeBase} resource
   * @returns {AsyncData<KnowledgeBaseResponse, H3Error<ErrorResponse>>}
   */
  const update = (resource) => {
    return client.post('/resource/update-knowledge-base', {
      watch: false,
      lazy: true,
      body: KnowledgeBaseFactory.toRequestPayload(resource),
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {KnowledgeBase} resource
   * @returns {AsyncData<KnowledgeBaseResponse, H3Error<ErrorResponse>>}
   */
  const destroy = ({
    knowledgeBaseId: knowledge_base_id,
  }) => {
    return client.post('/resource/delete-knowledge-base', {
      watch: false,
      lazy: true,
      body: {
        knowledge_base_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @param {string} knowledgeBaseId
   * @param {string} newKnowledgeBaseName
   * @returns {AsyncData<KnowledgeBaseResponse, H3Error<ErrorResponse>>}
   */
  const duplicate = async ({
    knowledgeBaseId: knowledge_base_id,
    newKnowledgeBaseName: new_knowledge_base_name,
  }) => {
    const { data, error } = await get({ knowledgeBaseId: knowledge_base_id });

    if (error.value) {
      return { data: null, error };
    }

    const newKnowledgeBase = KnowledgeBaseFactory.create({
      ...data.value,
      knowledgeBaseName: new_knowledge_base_name,
    });
    return create(newKnowledgeBase);
  };

  /**
   * @param {string} knowledgeBaseId
   * @param {string} docId
   * @param {string[]} includeFields
   * @returns {AsyncData<KnowledgeBaseDocumentResponse, H3Error<ErrorResponse>>}
   */
  const getDocument = ({
    docId: doc_id,
    includeFields: include_fields,
    knowledgeBaseId: knowledge_base_id,
  } = {}, {
    lazy = true,
  } = {}) => {
    return client.post('/resource/get-knowledge-base-document', {
      watch: false,
      lazy,
      body: {
        doc_id,
        include_fields,
        knowledge_base_id,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new KnowledgeBaseDocumentResponse(finalResponse._data);
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
    duplicate,
    getDocument,
  };
}
