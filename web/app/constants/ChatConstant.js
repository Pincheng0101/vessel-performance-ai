const MessageRole = Object.freeze({
  ASSISTANT: 'assistant',
  USER: 'user',
});

const MessageStatus = Object.freeze({
  ABORTED: 'aborted',
  COMPLETED: 'completed',
  COMPOSING: 'composing',
  FAILED: 'failed',
  PENDING: 'pending',
});

// WebSocket connection timeouts for the chat rooms, in milliseconds.
const ConnectionTimeout = Object.freeze({
  // Disconnect an idle connection after the user has been inactive this long, to free
  // server resources. Resumed automatically on the next send. // 10 minutes
  // Give up on a request only after the backend has been completely silent this long
  // while we are waiting for it. The runtime emits a checkpoint at least every
  // WS_IDLE_TIMEOUT (max 5 min), so this comfortably clears any live tool call; sustained
  // silence past it means the connection is dead.
  RESPONSE_STALL: 15 * 60 * 1000, // 15 minutes
});

export {
  ConnectionTimeout,
  MessageRole,
  MessageStatus,
};
