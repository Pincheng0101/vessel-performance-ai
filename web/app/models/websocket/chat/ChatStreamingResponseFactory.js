import { ResponseType } from '~/constants/StreamingConstant';
import ChatDataStreamingResponse from './ChatDataStreamingResponse';
import ChatEndStreamingResponse from './ChatEndStreamingResponse';
import ChatErrorStreamingResponse from './ChatErrorStreamingResponse';
import ChatStartStreamingResponse from './ChatStartStreamingResponse';
import ChatStreamingResponse from './ChatStreamingResponse';

class ChatStreamingResponseFactory {
  static create(data) {
    // Use ?. to handle a potential null payload
    switch (data?.response_type) {
      case ResponseType.START.value:
        return new ChatStartStreamingResponse(data);
      case ResponseType.DATA.value:
        return new ChatDataStreamingResponse(data);
      case ResponseType.END.value:
        return new ChatEndStreamingResponse(data);
      case ResponseType.ERROR.value:
        return new ChatErrorStreamingResponse(data);
      default:
        return new ChatStreamingResponse(data);
    }
  }
}

export default ChatStreamingResponseFactory;
