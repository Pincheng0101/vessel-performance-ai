import * as ContentBlockConstant from './ContentBlockConstant';
import * as IconConstant from './IconConstant';

const Action = Object.freeze({
  PING: {
    value: 'ping',
  },
  CHAT: {
    value: 'chat',
  },
  EXECUTION: {
    value: 'execution',
  },
  SYNC_STORAGE: {
    value: 'sync-storage',
  },
});

const ResponseType = Object.freeze({
  PING: {
    title: 'Ping',
    value: 'ping',
    icon: 'mdi-radar',
    iconColor: 'text',
  },
  START: {
    title: 'Start',
    value: 'start',
    icon: 'mdi-play-circle-outline',
    iconColor: 'text',
  },
  DATA: {
    title: 'Data',
    value: 'data',
    icon: 'mdi-message-text-outline',
    iconColor: IconConstant.Color.SUCCEEDED,
  },
  END: {
    title: 'End',
    value: 'end',
    icon: 'mdi-location-exit',
    iconColor: 'text',
  },
  ERROR: {
    title: 'Error',
    value: 'error',
    icon: 'mdi-alert-circle',
    iconColor: IconConstant.Color.FAILED,
  },
  TIMEOUT: {
    value: 'timeout',
  },
});

const ContentBlockType = Object.freeze({
  ...ContentBlockConstant.Type,
  TOOL_USE: {
    value: 'tool_use',
  },
  TOOL_RESULT: {
    value: 'tool_result',
  },
  OBJECT: {
    value: 'object',
  },
});

const ContentBlock = Object.freeze({
  THINKING: {
    i18nTitle: '__messageAgentThinking',
    name: 'thinking',
    value: 'Thinking...',
  },
});

const MessageType = Object.freeze({
  TEXT: {
    value: 'text',
  },
  ANSWERS: {
    value: 'answers',
  },
});

const StopReason = Object.freeze({
  ASK_USER: {
    value: 'ask_user',
  },
  END_TURN: {
    value: 'end_turn',
  },
  MAX_TURNS_REACHED: {
    value: 'max_turns_reached',
  },
  MAX_ITERATIONS_REACHED: {
    value: 'max_iterations_reached',
  },
});

const EventType = Object.freeze({
  MESSAGE_START: {
    value: 'message_start',
  },
  MESSAGE_STOP: {
    value: 'message_stop',
  },
  CONTENT_BLOCK_START: {
    value: 'content_block_start',
  },
  CONTENT_BLOCK_DELTA: {
    value: 'content_block_delta',
  },
  CONTENT_BLOCK_STOP: {
    value: 'content_block_stop',
  },
  TOOL_RESULTS: {
    value: 'tool_results',
  },
  ERROR: {
    value: 'error',
  },
});

const StreamingEventType = Object.freeze({
  START: {
    value: 'start',
  },
  DATA: {
    value: 'data',
  },
  END: {
    value: 'end',
  },
});

export {
  Action,
  ContentBlock,
  ContentBlockType,
  EventType,
  MessageType,
  ResponseType,
  StopReason,
  StreamingEventType,
};
