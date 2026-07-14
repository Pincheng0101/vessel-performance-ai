import { StateConstant } from '~/constants';
import AgentPayload from '~/models/workflow/state/task/agent/AgentPayload';
import AthenaPayload from '~/models/workflow/state/task/athena/AthenaPayload';
import CodePayload from '~/models/workflow/state/task/code/CodePayload';
import DescribeWorkflowExecutionPayload from '~/models/workflow/state/task/describeWorkflowExecution/DescribeWorkflowExecutionPayload';
import HttpsApiPayload from '~/models/workflow/state/task/httpsApi/HttpsApiPayload';
import LambdaPayload from '~/models/workflow/state/task/lambda/LambdaPayload';
import LlmPayload from '~/models/workflow/state/task/llm/LlmPayload';
import McpPayload from '~/models/workflow/state/task/mcp/McpPayload';
import MySqlPayload from '~/models/workflow/state/task/mysql/MySqlPayload';
import OpenSearchPayload from '~/models/workflow/state/task/opensearch/OpenSearchPayload';
import PassPayload from '~/models/workflow/state/task/pass/PassPayload';
import RankerPayload from '~/models/workflow/state/task/ranker/RankerPayload';
import ReadUrlPayload from '~/models/workflow/state/task/readUrl/ReadUrlPayload';
import RetrievalPayload from '~/models/workflow/state/task/retrieval/RetrievalPayload';
import RetrieverPayload from '~/models/workflow/state/task/retriever/RetrieverPayload';
import SearchEnginePayload from '~/models/workflow/state/task/searchEngine/SearchEnginePayload';
import StartSyncWorkflowExecutionPayload from '~/models/workflow/state/task/startSyncWorkflowExecution/StartSyncWorkflowExecutionPayload';
import StartWorkflowExecutionPayload from '~/models/workflow/state/task/startWorkflowExecution/StartWorkflowExecutionPayload';
import StructuredLlmPayload from '~/models/workflow/state/task/structuredLlm/StructuredLlmPayload';
import TextPayload from '~/models/workflow/state/task/text/TextPayload';
import TransformationPayload from '~/models/workflow/state/task/transformation/TransformationPayload';
import LambdaInvokePayload from './LambdaInvokePayload';

class LambdaInvokePayloadFactory {
  static createFromAsl(payload) {
    switch (payload.action_type) {
      case StateConstant.ActionType.AGENT.value:
        return AgentPayload.createFromAsl(payload);
      case StateConstant.ActionType.ATHENA.value:
        return AthenaPayload.createFromAsl(payload);
      case StateConstant.ActionType.CODE.value:
        return CodePayload.createFromAsl(payload);
      case StateConstant.ActionType.DESCRIBE_WORKFLOW_EXECUTION.value:
        return DescribeWorkflowExecutionPayload.createFromAsl(payload);
      case StateConstant.ActionType.HTTPS_API.value:
        return HttpsApiPayload.createFromAsl(payload);
      case StateConstant.ActionType.LAMBDA.value:
        return LambdaPayload.createFromAsl(payload);
      case StateConstant.ActionType.LLM.value:
        return LlmPayload.createFromAsl(payload);
      case StateConstant.ActionType.MCP.value:
        return McpPayload.createFromAsl(payload);
      case StateConstant.ActionType.MYSQL.value:
        return MySqlPayload.createFromAsl(payload);
      case StateConstant.ActionType.OPENSEARCH.value:
        return OpenSearchPayload.createFromAsl(payload);
      case StateConstant.ActionType.PASS.value:
        return PassPayload.createFromAsl(payload);
      case StateConstant.ActionType.RANKER.value:
        return RankerPayload.createFromAsl(payload);
      case StateConstant.ActionType.READ_URL.value:
        return ReadUrlPayload.createFromAsl(payload);
      case StateConstant.ActionType.RETRIEVAL.value:
        return RetrievalPayload.createFromAsl(payload);
      case StateConstant.ActionType.RETRIEVER.value:
        return RetrieverPayload.createFromAsl(payload);
      case StateConstant.ActionType.SEARCH_ENGINE.value:
        return SearchEnginePayload.createFromAsl(payload);
      case StateConstant.ActionType.START_SYNC_WORKFLOW_EXECUTION.value:
        return StartSyncWorkflowExecutionPayload.createFromAsl(payload);
      case StateConstant.ActionType.START_WORKFLOW_EXECUTION.value:
        return StartWorkflowExecutionPayload.createFromAsl(payload);
      case StateConstant.ActionType.STRUCTURED_LLM.value:
        return StructuredLlmPayload.createFromAsl(payload);
      case StateConstant.ActionType.TEXT.value:
        return TextPayload.createFromAsl(payload);
      case StateConstant.ActionType.TRANSFORMATION.value:
        return TransformationPayload.createFromAsl(payload);
      default:
        return LambdaInvokePayload.createFromAsl(payload);
    }
  }
}

export default LambdaInvokePayloadFactory;
