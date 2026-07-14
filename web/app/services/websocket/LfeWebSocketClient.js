import { StreamingConstant } from '~/constants';
import { ChunkedMessageResponse, StreamingResponseFactory } from '~/models/websocket';
import { ChatAnswersStreamingRequest, ChatTextStreamingRequest } from '~/models/websocket/chat';
import { ExecutionStreamingRequest } from '~/models/websocket/execution';

class LfeWebSocketClient {
  static MAX_FRAME_BYTES = 28 * 1024;
  static MAX_CHUNK_PAYLOAD_BYTES = 16 * 1024;
  static textEncoder = new TextEncoder();

  constructor({
    url,
    token,
    onOpen = () => {},
    onMessage = () => {},
    onClose = () => {},
    onError = () => {},
    onActivity = () => {},
  }) {
    this.ws = null;
    this.url = url;
    this.token = token;
    this.currentExecutionArn = null;
    this.lastMessageTimestamp = null;
    this.onOpen = onOpen;
    this.onMessage = onMessage;
    this.onClose = onClose;
    this.onError = onError;
    this.onActivity = onActivity;
    this.connectPromise = null;
    this.pingIntervalId = null;
    this.chunkBuffers = {};
    this.retryCount = 0;
    this.maxRetries = 2;
    this.isClosing = false;
  }

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  connect() {
    this.isClosing = false;
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = new Promise((resolve) => {
      const protocols = this.token ? ['json', this.token] : [];
      const ws = new WebSocket(this.url, protocols);
      this.ws = ws;

      ws.onopen = () => {
        this.retryCount = 0;
        this.onOpen();
        this.connectPromise = null;
        resolve();
      };

      ws.onmessage = (event) => {
        this.handleMessage(event);
      };

      ws.onerror = (error) => {
        this.stopPing();
        this.onError(error);
      };

      ws.onclose = (event) => {
        this.stopPing();
        this.connectPromise = null;

        if (!event.wasClean && !this.isClosing && this.retryCount < this.maxRetries) {
          this.retryCount++;
          (async () => {
            try {
              await delay(5000);
              await this.connect();
              this.startPing();
            } catch {
              // Rejection handled via onClose callback when retries are exhausted
            }
          })();
          return;
        }

        this.retryCount = 0;
        this.onClose(event);
      };
    });

    return this.connectPromise;
  }

  handleMessage(event) {
    let parsedData = JSON.parse(event.data);

    // Any inbound frame — including server timeout/resume checkpoints that are consumed
    // internally below — proves the backend is alive; surface it as activity so callers
    // can keep a response-stall watchdog from firing during long, quiet tool calls.
    this.onActivity();

    // Reassemble chunked frames before processing
    if (parsedData.chunked) {
      const result = this.appendChunk(parsedData);
      if (!result) return;
      parsedData = result;
    }

    if (parsedData.timestamp) {
      this.lastMessageTimestamp = parsedData.timestamp;
    }

    const isTimeout = parsedData.response_type === StreamingConstant.ResponseType.TIMEOUT.value;

    if (isTimeout && this.currentExecutionArn && this.lastMessageTimestamp) {
      // Start from the next millisecond to avoid receiving duplicate messages
      this.getExecution(new ExecutionStreamingRequest({
        executionArn: this.currentExecutionArn,
        lastMessageTimestamp: this.lastMessageTimestamp + 1,
      }));
      return;
    }

    const message = StreamingResponseFactory.create(parsedData);
    if (message) {
      this.onMessage(message);
    }
  }

  appendChunk(data) {
    const { chunkId, chunkIndex, chunkTotal, payload } = new ChunkedMessageResponse(data);
    const buffer = this.chunkBuffers[chunkId] ??= new Array(chunkTotal);
    buffer[chunkIndex] = payload;
    if (buffer.includes(undefined)) return null;
    const result = JSON.parse(buffer.join(''));
    delete this.chunkBuffers[chunkId];
    return result;
  }

  async ensureConnected() {
    if (this.ws.readyState === WebSocket.CLOSED) {
      await this.connect();
      return;
    }
    if (this.ws.readyState === WebSocket.CONNECTING) {
      await this.connect();
      return;
    }
    if (this.ws.readyState === WebSocket.CLOSING) {
      const previousWs = this.ws;
      await new Promise((resolve) => {
        previousWs.addEventListener('close', resolve, { once: true });
      });
      await this.connect();
      return;
    }
  }

  async send(message) {
    try {
      await this.ensureConnected();
      const serialized = JSON.stringify(message);
      if (this.getByteLength(serialized) <= LfeWebSocketClient.MAX_FRAME_BYTES) {
        this.ws.send(serialized);
        return;
      }
      this.sendChunked(serialized);
    } catch (error) {
      console.error(error);
    }
  }

  getByteLength(value) {
    return LfeWebSocketClient.textEncoder.encode(value).length;
  }

  findChunkEnd(value, start) {
    let low = start + 1;
    let high = Math.min(value.length, start + LfeWebSocketClient.MAX_CHUNK_PAYLOAD_BYTES);
    let best = start;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const bytes = this.getByteLength(value.slice(start, mid));
      if (bytes <= LfeWebSocketClient.MAX_CHUNK_PAYLOAD_BYTES) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    if (best === start) {
      return Math.min(value.length, start + 1);
    }
    return best;
  }

  splitIntoChunks(value) {
    const chunks = [];
    let start = 0;
    while (start < value.length) {
      const end = this.findChunkEnd(value, start);
      chunks.push(value.slice(start, end));
      start = end;
    }
    return chunks;
  }

  sendChunked(serialized) {
    const payloadChunks = this.splitIntoChunks(serialized);
    const chunkId = crypto.randomUUID();
    const chunkTotal = payloadChunks.length;
    payloadChunks.forEach((payload, chunkIndex) => {
      this.ws.send(JSON.stringify({
        chunked: true,
        chunk_id: chunkId,
        chunk_index: chunkIndex,
        chunk_total: chunkTotal,
        payload,
      }));
    });
  }

  ping() {
    this.send({
      action: StreamingConstant.Action.PING.value,
    });
  }

  syncStorage() {
    this.send({
      action: StreamingConstant.Action.SYNC_STORAGE.value,
    });
  }

  startPing() {
    if (this.pingIntervalId) return;
    this.pingIntervalId = setInterval(() => {
      this.ping();
    }, 10 * 1000);
  }

  stopPing() {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  /**
   * @param {ChatTextStreamingRequest} payload
   */
  chat(payload) {
    this.send(ChatTextStreamingRequest.toRequestPayload(payload));
  }

  /**
   * @param {ChatAnswersStreamingRequest} payload
   */
  chatAnswers(payload) {
    this.send(ChatAnswersStreamingRequest.toRequestPayload(payload));
  }

  /**
   * @param {ExecutionStreamingRequest} payload
   */
  getExecution(payload) {
    this.currentExecutionArn = payload.executionArn;
    this.send(ExecutionStreamingRequest.toRequestPayload(payload));
  }

  close() {
    this.isClosing = true;
    this.connectPromise = null;
    this.stopPing();
    switch (this.ws.readyState) {
      case WebSocket.CLOSED:
      case WebSocket.CLOSING:
      case WebSocket.CONNECTING:
        break;
      default:
        this.ws.close();
        break;
    }
    this.currentExecutionArn = null;
    this.lastMessageTimestamp = null;
    this.chunkBuffers = {};
  }
};

export default LfeWebSocketClient;
