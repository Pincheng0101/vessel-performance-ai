import { StateConstant } from '~/constants';
import AgentActionExecution from './AgentActionExecution';
import AthenaActionExecution from './AthenaActionExecution';
import CodeActionExecution from './CodeActionExecution';
import DescribeWorkflowExecutionActionExecution from './DescribeWorkflowExecutionActionExecution';
import HttpsApiActionExecution from './HttpsApiActionExecution';
import LambdaActionExecution from './LambdaActionExecution';
import LlmActionExecution from './LlmActionExecution';
import McpActionExecution from './McpActionExecution';
import MySqlActionExecution from './MySqlActionExecution';
import OpenSearchActionExecution from './OpenSearchActionExecution';
import PassActionExecution from './PassActionExecution';
import RankerActionExecution from './RankerActionExecution';
import ReadUrlActionExecution from './ReadUrlActionExecution';
import RetrievalActionExecution from './RetrievalActionExecution';
import RetrieverActionExecution from './RetrieverActionExecution';
import SearchEngineActionExecution from './SearchEngineActionExecution';
import StartSyncWorkflowExecutionActionExecution from './StartSyncWorkflowExecutionActionExecution';
import StartWorkflowExecutionActionExecution from './StartWorkflowExecutionActionExecution';
import StructuredLlmActionExecution from './StructuredLlmActionExecution';
import TextActionExecution from './TextActionExecution';
import TransformationActionExecution from './TransformationActionExecution';

class ActionExecutionFactory {
  static toRequestPayload({
    actionPayload,
    input,
    externalMemoryInput,
  } = {}) {
    const params = {
      actionPayload,
      input,
      externalMemoryInput,
    };
    switch (actionPayload.actionType) {
      case StateConstant.ActionType.AGENT.value:
        return AgentActionExecution.toRequestPayload(params);
      case StateConstant.ActionType.ATHENA.value:
        return AthenaActionExecution.toRequestPayload(params);
      case StateConstant.ActionType.CODE.value:
        return CodeActionExecution.toRequestPayload(params);
      case StateConstant.ActionType.DESCRIBE_WORKFLOW_EXECUTION.value:
        return DescribeWorkflowExecutionActionExecution.toRequestPayload(params);
      case StateConstant.ActionType.HTTPS_API.value:
        return HttpsApiActionExecution.toRequestPayload(params);
      case StateConstant.ActionType.LAMBDA.value:
        return LambdaActionExecution.toRequestPayload(params);
      case StateConstant.ActionType.LLM.value:
        return LlmActionExecution.toRequestPayload(params);
      case StateConstant.ActionType.MCP.value:
        return McpActionExecution.toRequestPayload(params);
      case StateConstant.ActionType.MYSQL.value:
        return MySqlActionExecution.toRequestPayload(params);
      case StateConstant.ActionType.OPENSEARCH.value:
        return OpenSearchActionExecution.toRequestPayload(params);
      case StateConstant.ActionType.PASS.value:
        return PassActionExecution.toRequestPayload(params);
      case StateConstant.ActionType.RANKER.value:
        return RankerActionExecution.toRequestPayload(params);
      case StateConstant.ActionType.READ_URL.value:
        return ReadUrlActionExecution.toRequestPayload(params);
      case StateConstant.ActionType.RETRIEVAL.value:
        return RetrievalActionExecution.toRequestPayload(params);
      case StateConstant.ActionType.RETRIEVER.value:
        return RetrieverActionExecution.toRequestPayload(params);
      case StateConstant.ActionType.SEARCH_ENGINE.value:
        return SearchEngineActionExecution.toRequestPayload(params);
      case StateConstant.ActionType.START_SYNC_WORKFLOW_EXECUTION.value:
        return StartSyncWorkflowExecutionActionExecution.toRequestPayload(params);
      case StateConstant.ActionType.START_WORKFLOW_EXECUTION.value:
        return StartWorkflowExecutionActionExecution.toRequestPayload(params);
      case StateConstant.ActionType.STRUCTURED_LLM.value:
        return StructuredLlmActionExecution.toRequestPayload(params);
      case StateConstant.ActionType.TEXT.value:
        return TextActionExecution.toRequestPayload(params);
      case StateConstant.ActionType.TRANSFORMATION.value:
        return TransformationActionExecution.toRequestPayload(params);
      default:
        return null;
    }
  }
}

export default ActionExecutionFactory;
