import { ResourceConstant, StateConstant } from '~/constants';
import { MultiRequestResourceQuery } from '~/models/server/multiRequest';
import { ChoiceNode } from '~/models/workflow/state/choice';
import { EndNode } from '~/models/workflow/state/end';
import { FailNode } from '~/models/workflow/state/fail';
import { MapNode } from '~/models/workflow/state/map';
import { ParallelNode } from '~/models/workflow/state/parallel';
import { PassNode } from '~/models/workflow/state/pass';
import { StartNode } from '~/models/workflow/state/start';
import { SucceedNode } from '~/models/workflow/state/succeed';
import { TaskNode } from '~/models/workflow/state/task';
import { AgentNode } from '~/models/workflow/state/task/agent';
import { AthenaNode } from '~/models/workflow/state/task/athena';
import { CodeNode } from '~/models/workflow/state/task/code';
import { DescribeWorkflowExecutionNode } from '~/models/workflow/state/task/describeWorkflowExecution';
import { HttpsApiNode } from '~/models/workflow/state/task/httpsApi';
import { LambdaNode } from '~/models/workflow/state/task/lambda';
import { LlmNode } from '~/models/workflow/state/task/llm';
import { McpNode } from '~/models/workflow/state/task/mcp';
import { MySqlNode } from '~/models/workflow/state/task/mysql';
import { OpenSearchNode } from '~/models/workflow/state/task/opensearch';
import { PassNode as PassTaskNode } from '~/models/workflow/state/task/pass';
import { RankerNode } from '~/models/workflow/state/task/ranker';
import { ReadUrlNode } from '~/models/workflow/state/task/readUrl';
import { RetrievalNode } from '~/models/workflow/state/task/retrieval';
import { RetrieverNode } from '~/models/workflow/state/task/retriever';
import { SearchEngineNode } from '~/models/workflow/state/task/searchEngine';
import { StartSyncWorkflowExecutionNode } from '~/models/workflow/state/task/startSyncWorkflowExecution';
import { StartWorkflowExecutionNode } from '~/models/workflow/state/task/startWorkflowExecution';
import { StructuredLlmNode } from '~/models/workflow/state/task/structuredLlm';
import { TextNode } from '~/models/workflow/state/task/text';
import { TransformationNode } from '~/models/workflow/state/task/transformation';
import { WaitNode } from '~/models/workflow/state/wait';
import Node from './Node';

class NodeFactory {
  /**
   * @param {Node} payload
   */
  static create(payload) {
    switch (payload.type) {
      case StateConstant.Type.CHOICE.value:
        return new ChoiceNode(payload);
      case StateConstant.Type.FAIL.value:
        return new FailNode(payload);
      case StateConstant.Type.MAP.value:
        return new MapNode(payload);
      case StateConstant.Type.PARALLEL.value:
        return new ParallelNode(payload);
      case StateConstant.Type.PASS.value:
        return new PassNode(payload);
      case StateConstant.Type.SUCCEED.value:
        return new SucceedNode(payload);
      case StateConstant.Type.WAIT.value:
        return new WaitNode(payload);
      case StateConstant.ActionType.AGENT.value:
        return new AgentNode(payload);
      case StateConstant.ActionType.ATHENA.value:
        return new AthenaNode(payload);
      case StateConstant.ActionType.CODE.value:
        return new CodeNode(payload);
      case StateConstant.ActionType.DESCRIBE_WORKFLOW_EXECUTION.value:
        return new DescribeWorkflowExecutionNode(payload);
      case StateConstant.ActionType.HTTPS_API.value:
        return new HttpsApiNode(payload);
      case StateConstant.ActionType.LAMBDA.value:
        return new LambdaNode(payload);
      case StateConstant.ActionType.LLM.value:
        return new LlmNode(payload);
      case StateConstant.ActionType.MCP.value:
        return new McpNode(payload);
      case StateConstant.ActionType.MYSQL.value:
        return new MySqlNode(payload);
      case StateConstant.ActionType.OPENSEARCH.value:
        return new OpenSearchNode(payload);
      case StateConstant.ActionType.PASS.value:
        return new PassTaskNode(payload);
      case StateConstant.ActionType.RANKER.value:
        return new RankerNode(payload);
      case StateConstant.ActionType.READ_URL.value:
        return new ReadUrlNode(payload);
      case StateConstant.ActionType.RETRIEVAL.value:
        return new RetrievalNode(payload);
      case StateConstant.ActionType.RETRIEVER.value:
        return new RetrieverNode(payload);
      case StateConstant.ActionType.SEARCH_ENGINE.value:
        return new SearchEngineNode(payload);
      case StateConstant.ActionType.START_SYNC_WORKFLOW_EXECUTION.value:
        return new StartSyncWorkflowExecutionNode(payload);
      case StateConstant.ActionType.START_WORKFLOW_EXECUTION.value:
        return new StartWorkflowExecutionNode(payload);
      case StateConstant.ActionType.STRUCTURED_LLM.value:
        return new StructuredLlmNode(payload);
      case StateConstant.ActionType.TEXT.value:
        return new TextNode(payload);
      case StateConstant.ActionType.TRANSFORMATION.value:
        return new TransformationNode(payload);
      case StateConstant.ActionType.UNKNOWN.value:
        return new TaskNode(payload);
      case StateConstant.PseudoType.END.value:
        return new EndNode(payload);
      case StateConstant.PseudoType.START.value:
        return new StartNode(payload);
      default:
        return new Node(payload);
    }
  }

  /**
   * @param {Node} node
   * @returns {MultiRequestResourceQuery[]}
   */
  static toResourceQueries(node) {
    const createMultiRequestResourceQuery = ({ id, type }) => {
      if (!id) return null;
      if (jsonPathUtils.isJsonPath(id)) return null;
      return new MultiRequestResourceQuery({ id, type });
    };

    const findResourceQueries = (obj) => {
      if (!obj || typeof obj !== 'object') return [];
      return Object.entries(obj).flatMap(([key, value]) => {
        key = ResourceConstant.IdAliases[key] || key;
        const type = findField(ResourceConstant.Type, key, 'value', 'id');
        if (type) {
          return [createMultiRequestResourceQuery({
            id: value,
            type,
          })];
        }
        if (typeof value === 'object') {
          return findResourceQueries(value);
        }
        return [];
      });
    };

    const payload = node.data?.stateDefinition?.parameters?.payload;

    return findResourceQueries(payload).filter(Boolean);
  }
}

export default NodeFactory;
