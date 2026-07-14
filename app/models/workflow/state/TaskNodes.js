import ActionAgentNode from '~/components/ActionAgentNode';
import ActionAthenaNode from '~/components/ActionAthenaNode';
import ActionCodeNode from '~/components/ActionCodeNode';
import ActionDescribeWorkflowExecutionNode from '~/components/ActionDescribeWorkflowExecutionNode';
import ActionHttpsApiNode from '~/components/ActionHttpsApiNode';
import ActionLambdaNode from '~/components/ActionLambdaNode';
import ActionLlmNode from '~/components/ActionLlmNode';
import ActionMcpNode from '~/components/ActionMcpNode.vue';
import ActionMySqlNode from '~/components/ActionMySqlNode';
import ActionOpenSearchNode from '~/components/ActionOpenSearchNode';
import ActionPassNode from '~/components/ActionPassNode';
import ActionRankerNode from '~/components/ActionRankerNode';
import ActionReadUrlNode from '~/components/ActionReadUrlNode';
import ActionRetrievalNode from '~/components/ActionRetrievalNode';
import ActionRetrieverNode from '~/components/ActionRetrieverNode';
import ActionSearchEngineNode from '~/components/ActionSearchEngineNode';
import ActionStartSyncWorkflowExecutionNode from '~/components/ActionStartSyncWorkflowExecutionNode';
import ActionStartWorkflowExecutionNode from '~/components/ActionStartWorkflowExecutionNode';
import ActionStructuredLlmNode from '~/components/ActionStructuredLlmNode';
import ActionTextNode from '~/components/ActionTextNode';
import ActionTransformationNode from '~/components/ActionTransformationNode';
import ActionUnknownNode from '~/components/ActionUnknownNode';
import { StateConstant } from '~/constants';

const { ActionType } = StateConstant;

const TaskNodes = [
  {
    name: ActionType.AGENT.value,
    component: ActionAgentNode,
  },
  {
    name: ActionType.ATHENA.value,
    component: ActionAthenaNode,
  },
  {
    name: ActionType.CODE.value,
    component: ActionCodeNode,
  },
  {
    name: ActionType.DESCRIBE_WORKFLOW_EXECUTION.value,
    component: ActionDescribeWorkflowExecutionNode,
  },
  {
    name: ActionType.HTTPS_API.value,
    component: ActionHttpsApiNode,
  },
  {
    name: ActionType.LAMBDA.value,
    component: ActionLambdaNode,
  },
  {
    name: ActionType.LLM.value,
    component: ActionLlmNode,
  },
  {
    name: ActionType.MCP.value,
    component: ActionMcpNode,
  },
  {
    name: ActionType.MYSQL.value,
    component: ActionMySqlNode,
  },
  {
    name: ActionType.OPENSEARCH.value,
    component: ActionOpenSearchNode,
  },
  {
    name: ActionType.PASS.value,
    component: ActionPassNode,
  },
  {
    name: ActionType.RANKER.value,
    component: ActionRankerNode,
  },
  {
    name: ActionType.READ_URL.value,
    component: ActionReadUrlNode,
  },
  {
    name: ActionType.RETRIEVAL.value,
    component: ActionRetrievalNode,
  },
  {
    name: ActionType.RETRIEVER.value,
    component: ActionRetrieverNode,
  },
  {
    name: ActionType.SEARCH_ENGINE.value,
    component: ActionSearchEngineNode,
  },
  {
    name: ActionType.START_SYNC_WORKFLOW_EXECUTION.value,
    component: ActionStartSyncWorkflowExecutionNode,
  },
  {
    name: ActionType.START_WORKFLOW_EXECUTION.value,
    component: ActionStartWorkflowExecutionNode,
  },
  {
    name: ActionType.STRUCTURED_LLM.value,
    component: ActionStructuredLlmNode,
  },
  {
    name: ActionType.TEXT.value,
    component: ActionTextNode,
  },
  {
    name: ActionType.TRANSFORMATION.value,
    component: ActionTransformationNode,
  },
  {
    name: ActionType.UNKNOWN.value,
    component: ActionUnknownNode,
  },
];

export default TaskNodes;
