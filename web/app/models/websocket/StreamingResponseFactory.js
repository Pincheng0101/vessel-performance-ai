import { StreamingConstant } from '~/constants';
import { ChatStreamingResponseFactory } from './chat';
import { ExecutionStreamingResponseFactory } from './execution';

class StreamingResponseFactory {
  static create(message) {
    switch (message.action) {
      case StreamingConstant.Action.CHAT.value:
        return ChatStreamingResponseFactory.create(message);
      case StreamingConstant.Action.EXECUTION.value:
        return ExecutionStreamingResponseFactory.create(message);
      default:
        return null;
    }
  }
}

export default StreamingResponseFactory;
