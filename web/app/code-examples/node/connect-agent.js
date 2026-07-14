import WebSocket from 'ws';

const url = '<WS_URL>';
const agentId = '___PLACEHOLDER_AGENT_ID___';
const sessionId = '';
const userMessage = 'Hello!';

const ws = new WebSocket(url);

ws.addEventListener('open', () => {
  ws.send(
    JSON.stringify({
      action: 'chat',
      agent_id: agentId,
      session_id: sessionId,
      message: {
        message_type: 'text',
        content: [{ content_block_type: 'text', text: userMessage }],
      },
    }),
  );
});

const chunkBuffers = {};

ws.addEventListener('message', (event) => {
  let msg = JSON.parse(event.data);

  if (msg.chunked) {
    const { chunk_id, chunk_index, chunk_total, payload } = msg;
    if (!chunkBuffers[chunk_id]) {
      chunkBuffers[chunk_id] = new Array(chunk_total).fill(null);
    }
    chunkBuffers[chunk_id][chunk_index] = payload;
    if (chunkBuffers[chunk_id].some(p => p === null)) return;
    msg = JSON.parse(chunkBuffers[chunk_id].join(''));
    delete chunkBuffers[chunk_id];
  }

  switch (msg.response_type) {
    case 'data':
      handleStreamingEvent(msg.event);
      break;
  }
});

const handleStreamingEvent = (event) => {
  switch (event.event_type) {
    case 'content_block_start':
      break;
    case 'content_block_delta':
      if (event.delta?.text) {
        process.stdout.write(event.delta.text);
      }
      break;
    case 'content_block_stop':
      break;
  }
};
