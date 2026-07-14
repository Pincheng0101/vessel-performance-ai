import { Dimension } from '~/constants/WorkflowConstant';
import * as ContentBlockConstant from './ContentBlockConstant';
import * as FeatureConstant from './FeatureConstant';
import * as IconConstant from './IconConstant';
import * as LlmConstant from './LlmConstant';

const Type = Object.freeze({
  TASK: {
    i18nTitle: undefined,
    value: 'Task',
    iconColor: IconConstant.Color.ACTION,
  },
  CHOICE: {
    i18nTitle: '__workflowFlowChoice',
    value: 'Choice',
    defaultInputOutput: {
      inputPath: '$',
      outputPath: '$',
    },
    draggable: false,
    formComponent: 'FlowChoiceForm',
    icon: 'mdi-directions-fork',
    iconColor: IconConstant.Color.FLOW,
    nodeHeight: 152,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    stateDefinitionName: 'Choice',
    tooltip: '__tooltipWorkflowChoice',
  },
  MAP: {
    i18nTitle: '__workflowFlowMap',
    value: 'Map',
    defaultInputOutput: {
      inputPath: '$',
      resultSelector: null,
      outputPath: '$',
    },
    draggable: true,
    formComponent: 'FlowMapForm',
    icon: 'mdi-sync',
    iconColor: IconConstant.Color.FLOW,
    nodeHeight: 128,
    nodeWidth: 360,
    stateDefinitionName: 'Map',
    tooltip: '__tooltipWorkflowMap',
  },
  PARALLEL: {
    i18nTitle: '__workflowFlowParallel',
    value: 'Parallel',
    defaultInputOutput: {
      inputPath: '$',
      parameters: null,
      resultSelector: null,
      outputPath: '$',
    },
    draggable: true,
    formComponent: 'FlowParallelForm',
    icon: 'mdi-source-branch',
    iconColor: IconConstant.Color.FLOW,
    nodeHeight: 128,
    nodeWidth: 360,
    stateDefinitionName: 'Parallel',
    tooltip: '__tooltipWorkflowParallel',
  },
  PASS: {
    i18nTitle: '__workflowFlowPass',
    value: 'Pass',
    defaultInputOutput: {
      inputPath: '$',
      parameters: null,
      result: null,
      outputPath: '$',
    },
    draggable: true,
    formComponent: 'FlowPassForm',
    icon: 'mdi-transfer-down',
    iconColor: IconConstant.Color.FLOW,
    nodeHeight: Dimension.NODE_BASE_HEIGHT,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    stateDefinitionName: 'Pass',
    tooltip: '__tooltipWorkflowPass',
  },
  WAIT: {
    i18nTitle: '__workflowFlowWait',
    value: 'Wait',
    defaultInputOutput: {
      inputPath: '$',
      outputPath: '$',
    },
    draggable: true,
    formComponent: 'FlowWaitForm',
    icon: 'mdi-timer-outline',
    iconColor: IconConstant.Color.FLOW,
    nodeHeight: Dimension.NODE_BASE_HEIGHT,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    stateDefinitionName: 'Wait',
    tooltip: '__tooltipWorkflowWait',
  },
  SUCCEED: {
    i18nTitle: '__workflowFlowSucceed',
    value: 'Succeed',
    draggable: true,
    formComponent: 'FlowSucceedForm',
    icon: 'mdi-check-circle-outline',
    iconColor: IconConstant.Color.SUCCEEDED,
    nodeHeight: Dimension.NODE_BASE_HEIGHT,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    stateDefinitionName: 'Succeed',
    tooltip: '__tooltipWorkflowSucceed',
  },
  FAIL: {
    i18nTitle: '__workflowFlowFail',
    value: 'Fail',
    draggable: true,
    formComponent: 'FlowFailForm',
    icon: 'mdi-alert-circle-outline',
    iconColor: IconConstant.Color.FAILED,
    nodeHeight: Dimension.NODE_BASE_HEIGHT,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    stateDefinitionName: 'Fail',
    tooltip: '__tooltipWorkflowFail',
  },
});

const ActionType = Object.freeze({
  AGENT: {
    i18nTitle: '__fieldAgent',
    value: 'agent_action',
    defaultInputOutput: {
      inputPath: '$',
      resultSelector: {
        'message.$': '$.Payload.message',
        'response.$': '$.Payload.response',
      },
      outputPath: '$',
    },
    draggable: true,
    formComponent: 'ActionAgentForm',
    icon: IconConstant.Base.AGENT,
    iconColor: IconConstant.Color.ACTION,
    nodeHeight: 172,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    stateDefinitionName: 'AgentAction',
    tooltip: '__tooltipWorkflowActionAgent',
  },
  ATHENA: {
    i18nTitle: '__fieldAthena',
    value: 'athena_action',
    defaultInputOutput: {
      inputPath: '$',
      resultSelector: {
        'rows.$': '$.Payload.rows',
      },
      outputPath: '$',
    },
    draggable: true,
    formComponent: 'ActionAthenaForm',
    iconPath: '/images/icons/athenaTransparent.svg',
    iconColor: IconConstant.Color.ACTION,
    iconPathMaskColor: 'white',
    nodeHeight: Dimension.NODE_BASE_HEIGHT,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    stateDefinitionName: 'AthenaAction',
    tooltip: '__tooltipWorkflowActionAthena',
  },
  CODE: {
    i18nTitle: '__fieldCode',
    value: 'code_action',
    defaultInputOutput: {
      inputPath: '$',
      resultSelector: {
        'output.$': '$.Payload.output',
      },
      outputPath: '$',
    },
    draggable: true,
    formComponent: 'ActionCodeForm',
    icon: 'mdi-code-block-tags',
    iconColor: IconConstant.Color.ACTION,
    nodeHeight: Dimension.NODE_BASE_HEIGHT,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    stateDefinitionName: 'CodeAction',
    tooltip: '__tooltipWorkflowActionCode',
  },
  DESCRIBE_WORKFLOW_EXECUTION: {
    i18nTitle: '__fieldDescribeWorkflowExecution',
    value: 'describe_workflow_execution_action',
    defaultInputOutput: {
      inputPath: '$',
      resultSelector: {
        'status.$': '$.Payload.status',
        'output.$': '$.Payload.output',
      },
      outputPath: '$',
    },
    draggable: true,
    formComponent: 'ActionDescribeWorkflowExecutionForm',
    icon: 'mdi-information-outline',
    iconColor: IconConstant.Color.ACTION,
    nodeHeight: Dimension.NODE_BASE_HEIGHT,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    stateDefinitionName: 'DescribeWorkflowExecutionAction',
    tooltip: '__tooltipWorkflowActionDescribeWorkflowExecution',
  },
  HTTPS_API: {
    i18nTitle: '__fieldHttpsApi',
    value: 'https_api_action',
    defaultInputOutput: {
      inputPath: '$',
      resultSelector: {
        'output.$': '$.Payload.output',
      },
      outputPath: '$',
    },
    draggable: true,
    formComponent: 'ActionHttpsApiForm',
    icon: 'mdi-api',
    iconColor: IconConstant.Color.ACTION,
    nodeHeight: Dimension.NODE_BASE_HEIGHT,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    stateDefinitionName: 'HttpsApiAction',
    tooltip: '__tooltipWorkflowActionHttpsApi',
  },
  LAMBDA: {
    i18nTitle: '__fieldLambda',
    value: 'lambda_action',
    defaultInputOutput: {
      inputPath: '$',
      resultSelector: {
        'output.$': '$.Payload.output',
      },
      outputPath: '$',
    },
    draggable: true,
    formComponent: 'ActionLambdaForm',
    icon: 'mdi-lambda',
    iconColor: IconConstant.Color.ACTION,
    nodeHeight: Dimension.NODE_BASE_HEIGHT,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    stateDefinitionName: 'LambdaAction',
    tooltip: '__tooltipWorkflowActionLambda',
  },
  LLM: {
    i18nTitle: '__fieldLlm',
    value: 'llm_action',
    defaultInputOutput: {
      inputPath: '$',
      resultSelector: {
        'message.$': '$.Payload.message',
      },
      outputPath: '$',
    },
    draggable: true,
    formComponent: 'ActionLlmForm',
    icon: 'mdi-brain',
    iconColor: IconConstant.Color.ACTION,
    nodeHeight: 172,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    stateDefinitionName: 'LLMAction',
    tooltip: '__tooltipWorkflowActionLlm',
  },
  MCP: {
    i18nTitle: '__fieldMcp',
    value: 'mcp_action',
    defaultInputOutput: {
      inputPath: '$',
      resultSelector: {
        'response.$': '$.Payload.response',
      },
      outputPath: '$',
    },
    draggable: true,
    formComponent: 'ActionMcpForm',
    iconPath: '/images/icons/mcp.svg',
    iconColor: IconConstant.Color.ACTION,
    iconPathMaskColor: 'white',
    nodeHeight: Dimension.NODE_BASE_HEIGHT,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    stateDefinitionName: 'MCPAction',
    tooltip: '__tooltipWorkflowActionMcp',
  },
  MYSQL: {
    i18nTitle: '__fieldMySql',
    value: 'mysql_action',
    defaultInputOutput: {
      inputPath: '$',
      resultSelector: {
        'rows.$': '$.Payload.rows',
      },
      outputPath: '$',
    },
    draggable: true,
    formComponent: 'ActionMySqlForm',
    iconPath: '/images/icons/mysqlTransparent.svg',
    iconColor: IconConstant.Color.ACTION,
    iconPathMaskColor: 'white',
    nodeHeight: Dimension.NODE_BASE_HEIGHT,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    stateDefinitionName: 'MySQLAction',
    tooltip: '__tooltipWorkflowActionMySql',
  },
  OPENSEARCH: {
    i18nTitle: '__fieldOpenSearch',
    value: 'opensearch_action',
    defaultInputOutput: {
      inputPath: '$',
      resultSelector: {
        'response.$': '$.Payload.response',
      },
      outputPath: '$',
    },
    draggable: true,
    formComponent: 'ActionOpenSearchForm',
    iconPath: '/images/icons/opensearchTransparent.svg',
    iconColor: IconConstant.Color.ACTION,
    iconPathMaskColor: 'white',
    nodeHeight: Dimension.NODE_BASE_HEIGHT,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    stateDefinitionName: 'OpenSearchAction',
    tooltip: '__tooltipWorkflowActionOpenSearch',
  },
  PASS: {
    i18nTitle: '__fieldPass',
    value: 'pass_action',
    defaultInputOutput: {
      inputPath: '$',
      resultSelector: {
        'output.$': '$.Payload.output',
      },
      outputPath: '$',
    },
    draggable: true,
    formComponent: 'ActionPassForm',
    icon: 'mdi-arrow-right-bold-box-outline',
    iconColor: IconConstant.Color.ACTION,
    nodeHeight: Dimension.NODE_BASE_HEIGHT,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    stateDefinitionName: 'PassAction',
    tooltip: '__tooltipWorkflowActionPass',
  },
  RANKER: {
    i18nTitle: '__fieldRanker',
    value: 'ranker_action',
    defaultInputOutput: {
      inputPath: '$',
      resultSelector: {
        'docs.$': '$.Payload.docs',
      },
      outputPath: '$',
    },
    draggable: true,
    formComponent: 'ActionRankerForm',
    icon: 'mdi-sort-variant',
    iconColor: IconConstant.Color.ACTION,
    nodeHeight: Dimension.NODE_BASE_HEIGHT,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    stateDefinitionName: 'RankerAction',
    tooltip: '__tooltipWorkflowActionRanker',
  },
  READ_URL: {
    i18nTitle: '__fieldReadUrl',
    value: 'read_url_action',
    defaultInputOutput: {
      inputPath: '$',
      resultSelector: {
        'read_url_output.$': '$.Payload.read_url_output',
      },
      outputPath: '$',
    },
    draggable: true,
    formComponent: 'ActionReadUrlForm',
    icon: 'mdi-application',
    iconColor: IconConstant.Color.ACTION,
    nodeHeight: Dimension.NODE_BASE_HEIGHT,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    stateDefinitionName: 'ReadURLAction',
    tooltip: '__tooltipWorkflowActionReadUrl',
  },
  RETRIEVAL: {
    i18nTitle: '__fieldRetrieval',
    value: 'retrieval_action',
    defaultInputOutput: {
      inputPath: '$',
      resultSelector: {
        'docs.$': '$.Payload.docs',
      },
      outputPath: '$',
    },
    draggable: true,
    formComponent: 'ActionRetrievalForm',
    icon: IconConstant.Base.RETRIEVAL,
    iconColor: IconConstant.Color.ACTION,
    nodeHeight: Dimension.NODE_BASE_HEIGHT,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    requiredFeatures: [
      FeatureConstant.Name.OPENSEARCH,
    ],
    stateDefinitionName: 'RetrievalAction',
    tooltip: '__tooltipWorkflowActionRetrieval',
  },
  RETRIEVER: {
    i18nTitle: '__fieldRetriever',
    value: 'retriever_action',
    defaultInputOutput: {
      inputPath: '$',
      resultSelector: {
        'docs.$': '$.Payload.docs',
      },
      outputPath: '$',
    },
    draggable: true,
    formComponent: 'ActionRetrieverForm',
    icon: 'mdi-magnify',
    iconColor: IconConstant.Color.ACTION,
    nodeHeight: Dimension.NODE_BASE_HEIGHT,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    requiredFeatures: [
      FeatureConstant.Name.OPENSEARCH,
    ],
    stateDefinitionName: 'RetrieverAction',
    tooltip: '__tooltipWorkflowActionRetriever',
  },
  SEARCH_ENGINE: {
    i18nTitle: '__fieldSearchEngine',
    value: 'search_engine_action',
    defaultInputOutput: {
      inputPath: '$',
      resultSelector: {
        'search_results.$': '$.Payload.search_results',
      },
      outputPath: '$',
    },
    draggable: true,
    formComponent: 'ActionSearchEngineForm',
    icon: 'mdi-search-web',
    iconColor: IconConstant.Color.ACTION,
    nodeHeight: Dimension.NODE_BASE_HEIGHT,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    stateDefinitionName: 'SearchEngineAction',
    tooltip: '__tooltipWorkflowActionSearchEngine',
  },
  START_SYNC_WORKFLOW_EXECUTION: {
    i18nTitle: '__fieldStartSyncWorkflowExecution',
    value: 'start_sync_workflow_execution_action',
    defaultInputOutput: {
      inputPath: '$',
      resultSelector: null,
      outputPath: '$',
    },
    draggable: true,
    formComponent: 'ActionStartSyncWorkflowExecutionForm',
    icon: 'mdi-play-speed',
    iconColor: IconConstant.Color.ACTION,
    nodeHeight: Dimension.NODE_BASE_HEIGHT,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    stateDefinitionName: 'StartSyncWorkflowExecutionAction',
    tooltip: '__tooltipWorkflowActionStartSyncWorkflowExecution',
  },
  START_WORKFLOW_EXECUTION: {
    i18nTitle: '__fieldStartWorkflowExecution',
    value: 'start_workflow_execution_action',
    defaultInputOutput: {
      inputPath: '$',
      resultSelector: {
        'execution_arn.$': '$.Payload.execution_arn',
      },
      outputPath: '$',
    },
    draggable: true,
    formComponent: 'ActionStartWorkflowExecutionForm',
    icon: 'mdi-play-circle-outline',
    iconColor: IconConstant.Color.ACTION,
    nodeHeight: Dimension.NODE_BASE_HEIGHT,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    stateDefinitionName: 'StartWorkflowExecutionAction',
    tooltip: '__tooltipWorkflowActionStartWorkflowExecution',
  },
  STRUCTURED_LLM: {
    i18nTitle: '__fieldStructuredLlm',
    value: 'structured_llm_action',
    defaultInputOutput: {
      inputPath: '$',
      resultSelector: {
        'response.$': '$.Payload.response',
      },
      outputPath: '$',
    },
    draggable: true,
    formComponent: 'ActionStructuredLlmForm',
    icon: 'mdi-code-json',
    iconColor: IconConstant.Color.ACTION,
    nodeHeight: 172,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    stateDefinitionName: 'StructuredLLMAction',
    tooltip: '__tooltipWorkflowActionStructuredLlm',
  },
  TEXT: {
    i18nTitle: '__fieldText',
    value: 'text_action',
    defaultInputOutput: {
      inputPath: '$',
      resultSelector: {
        'text.$': '$.Payload.text',
      },
      outputPath: '$',
    },
    draggable: true,
    formComponent: 'ActionTextForm',
    icon: 'mdi-text-recognition',
    iconColor: IconConstant.Color.ACTION,
    nodeHeight: Dimension.NODE_BASE_HEIGHT,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    stateDefinitionName: 'TextAction',
    tooltip: '__tooltipWorkflowActionText',
  },
  TRANSFORMATION: {
    i18nTitle: '__fieldTransformation',
    value: 'transformation_action',
    defaultInputOutput: {
      inputPath: '$',
      resultSelector: {
        'transformation_output.$': '$.Payload.transformation_output',
      },
      outputPath: '$',
    },
    deprecated: true,
    draggable: true,
    formComponent: 'ActionTransformationForm',
    icon: 'mdi-cog-transfer-outline',
    iconColor: IconConstant.Color.ACTION,
    nodeHeight: Dimension.NODE_BASE_HEIGHT,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
    stateDefinitionName: 'TransformationAction',
    tooltip: '__tooltipWorkflowActionTransformation',
  },
  UNKNOWN: {
    i18nTitle: undefined,
    value: 'unknown_action',
  },
});

const PseudoType = Object.freeze({
  START: {
    i18nTitle: '__workflowFlowStart',
    value: 'FlowStart',
    compactHeight: 16,
    compactWidth: 16,
    formComponent: 'FlowStartForm',
    icon: 'mdi-map-marker',
    nodeHeight: Dimension.NODE_BASE_HEIGHT,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
  },
  END: {
    i18nTitle: '__workflowFlowEnd',
    value: 'FlowEnd',
    compactHeight: 16,
    compactWidth: 16,
    formComponent: 'FlowEndForm',
    icon: 'mdi-flag-checkered',
    nodeHeight: Dimension.NODE_BASE_HEIGHT,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
  },
  SLOT: {
    i18nTitle: undefined,
    value: 'FlowSlot',
    nodeHeight: 40,
    nodeWidth: Dimension.NODE_BASE_WIDTH,
  },
});

const DefaultResultPathPrefix = '$.';

const DefaultResultPathSuffix = 'Result';

const UseExternalMemoryResultSelector = Object.freeze({
  'external_memory_id.$': '$.Payload.external_memory_id',
});

const Task = Object.freeze({
  FUNCTION_NAME: 'LFEActionFunction',
});

const Resource = Object.freeze({
  LAMBDA_INVOKE: 'arn:aws:states:::lambda:invoke',
});

const WaitType = Object.freeze({
  SECONDS: 'seconds',
  TIMESTAMP: 'timestamp',
});

const MapProcessorConfigMode = Object.freeze({
  INLINE: 'INLINE',
});

const MapDefaultDefinition = Object.freeze({
  MAX_CONCURRENCY: {
    min: 1,
    max: 1000,
    default: 10,
    step: 1,
  },
});

const StateInputPathPlaceholder = Object.freeze({
  DEFAULT: '$.stateInput.key',
});

const Source = Object.freeze({
  STATE_INPUT: {
    i18nTitle: '__fieldStateInput',
    value: 'state_input',
  },
});

const InitialWorkflowStates = Object.freeze([
  {
    type: Type.TASK.value,
    name: ActionType.LLM.stateDefinitionName,
    resource: Resource.LAMBDA_INVOKE,
    end: true,
    inputOutput: {
      inputPath: ActionType.LLM.defaultInputOutput.inputPath,
      resultSelector: ActionType.LLM.defaultInputOutput.resultSelector,
      resultPath: '$.LLMActionResult',
      outputPath: ActionType.LLM.defaultInputOutput.outputPath,
    },
    parameters: {
      functionName: Task.FUNCTION_NAME,
      payload: {
        actionType: ActionType.LLM.value,
        defaultOutput: null,
        llm: {
          llmId: LlmConstant.DefaultLlm.ID,
          llmType: LlmConstant.Type.BEDROCK_ANTHROPIC.value,
          messages: [
            {
              role: LlmConstant.MessageRole.USER.value,
              content: [
                {
                  contentBlockType: ContentBlockConstant.Type.TEXT.value,
                  contentBlockName: 'default-prompt',
                  text: 'Say hello.',
                },
              ],
            },
          ],
        },
        retry: null,
        useExternalMemoryOutput: false,
      },
    },
  },
]);

export {
  ActionType,
  DefaultResultPathPrefix,
  DefaultResultPathSuffix,
  InitialWorkflowStates,
  MapDefaultDefinition,
  MapProcessorConfigMode,
  PseudoType,
  Resource,
  Source,
  StateInputPathPlaceholder,
  Task,
  Type,
  UseExternalMemoryResultSelector,
  WaitType,
};
