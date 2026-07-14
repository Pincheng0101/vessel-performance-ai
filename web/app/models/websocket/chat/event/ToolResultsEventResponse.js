import { StreamingConstant } from '~/constants';
import ChatStreamingEventResponse from './ChatStreamingEventResponse';
import ToolResultsRetrievalResponse from './ToolResultsRetrievalResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ToolResultsEventResponse extends ChatStreamingEventResponse {
  constructor({
    tool_results,
  } = {}) {
    super({
      event_type: StreamingConstant.EventType.TOOL_RESULTS.value,
    });

    this.toolResults = {
      retrieval: tool_results.retrieval?.map(item => new ToolResultsRetrievalResponse(item)),
    };
  }
}

export default ToolResultsEventResponse;
