import { ListConstant } from '~/constants';
import { ChatSession, ChatSessionListResponse, ChatSessionMessagesResponse } from '~/models/server/chatSession';

/**
 * @import { AsyncData } from 'nuxt/app'
 * @import { ErrorResponse } from '~/models/server'
 * @import { H3Error } from 'h3'
 */

export default function chatSession({
  client,
  handleFinalResponse,
  handleRequest,
  handleRequestError,
  handleResponseError,
}) {
  /**
   * @returns {AsyncData<ChatSession, H3Error<ErrorResponse>>}
   */
  const get = ({
    agentId,
    sessionId,
    username,
  } = {}, {
    lazy = true,
    signal,
    onResponse = () => {},
  } = {}) => {
    return client.post('/runtime/get-chat-session', {
      watch: false,
      lazy,
      signal,
      body: {
        agent_id: agentId,
        session_id: sessionId,
        username,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          const item = finalResponse._data.chat_session;
          response._data = new ChatSession({
            agentId: item.agent_id,
            username: item.username,
            sessionId: item.session_id,
            sessionName: item.session_name,
            lastMessageTs: item.last_message_ts,
            createdTs: item.created_ts,
            storageId: item.storage_id,
          });
        }
        onResponse(response);
      },
    });
  };

  /**
   * @returns {AsyncData<ChatSessionListResponse, H3Error<ErrorResponse>>}
   */
  const list = ({
    agentId,
    nextToken: next_token,
    limit = ListConstant.DefaultParams.PER_PAGE,
    sessionIds: session_ids,
    username,
  } = {}, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/runtime/list-chat-sessions', {
      watch: false,
      lazy,
      signal,
      body: {
        agent_id: agentId,
        next_token,
        limit,
        session_ids,
        username,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new ChatSessionListResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<Object, H3Error<ErrorResponse>>}
   */
  const remove = ({
    agentId,
    sessionId,
  } = {}, {
    lazy = true,
  } = {}) => {
    return client.post('/runtime/delete-chat-session', {
      watch: false,
      lazy,
      body: {
        agent_id: agentId,
        session_id: sessionId,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  /**
   * @returns {AsyncData<ChatSessionMessagesResponse, H3Error<ErrorResponse>>}
   */
  const listMessages = ({
    agentId,
    sessionId,
    nextToken: next_token,
    limit = ListConstant.DefaultParams.PER_PAGE,
    username,
  } = {}, {
    lazy = true,
    signal,
  } = {}) => {
    return client.post('/runtime/list-chat-session-messages', {
      watch: false,
      lazy,
      signal,
      body: {
        agent_id: agentId,
        session_id: sessionId,
        next_token,
        limit,
        sort_order: 'DESC',
        username,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
      onResponse: async ({ response }) => {
        if (response.ok) {
          const finalResponse = await handleFinalResponse(response);
          response._data = new ChatSessionMessagesResponse(finalResponse._data);
        }
      },
    });
  };

  /**
   * @returns {AsyncData<Object, H3Error<ErrorResponse>>}
   */
  const update = ({
    agentId: agent_id,
    sessionId: session_id,
    sessionName: session_name,
  } = {}) => {
    return client.post('/runtime/update-chat-session', {
      watch: false,
      lazy: true,
      body: {
        agent_id,
        session_id,
        session_name,
      },
      onRequest: handleRequest,
      onRequestError: handleRequestError,
      onResponseError: handleResponseError,
    });
  };

  return {
    get,
    list,
    listMessages,
    remove,
    update,
  };
}
