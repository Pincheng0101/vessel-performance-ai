const Module = Object.freeze({
  WORKFLOW: 'workflow',
});

const EditorMode = Object.freeze({
  DESIGN: {
    i18nTitle: '__workflowEditorModeDesign',
    value: 'design',
    icon: 'mdi-transit-connection-variant',
  },
  CODE: {
    i18nTitle: '__workflowEditorModeCode',
    value: 'code',
    icon: 'mdi-code-json',
  },
});

const FlowType = Object.freeze({
  DEFINITION: {
    value: 'definition',
  },
  EXECUTION: {
    value: 'execution',
  },
});

const DropType = Object.freeze({
  ADD: 'add',
  MOVE: 'move',
});

const EdgeType = Object.freeze({
  CUSTOM: 'custom',
  FALLBACK: 'fallback',
});

const Dimension = Object.freeze({
  SLOT_NODE_INTERACTION_WIDTH: 200,
  SLOT_NODE_INTERACTION_HEIGHT: 40,
  EDGE_INTERACTION: 60,
  PARENT_PADDING_TOP: 60,
  PARENT_PADDING_BOTTOM: 20,
  PARENT_PADDING_X: 20,
  NODE_HORIZONTAL_SPACING: 48,
  NODE_BASE_HEIGHT: 68,
  NODE_BASE_WIDTH: 200,
});

const StateMenuCategory = Object.freeze({
  GENERATIVE_AI: {
    i18nTitle: '__titleCategoryGenerativeAi',
    value: 'generativeAi',
    icon: 'mdi-robot',
  },
  CLOUD_COMPUTING: {
    i18nTitle: '__titleCategoryCloudComputing',
    value: 'cloudComputing',
    icon: 'mdi-cloud',
  },
  NETWORKING_AND_API: {
    i18nTitle: '__titleCategoryNetworkingAndApi',
    value: 'networkingAndApi',
    icon: 'mdi-api',
  },
  WEB_INTERACTION: {
    i18nTitle: '__titleCategoryWebInteraction',
    value: 'webInteraction',
    icon: 'mdi-web',
  },
  DATABASE: {
    i18nTitle: '__titleCategoryDatabase',
    value: 'database',
    icon: 'mdi-database',
  },
  RETRIEVE_AND_RANK: {
    i18nTitle: '__titleCategoryRetrieveAndRank',
    value: 'retrieveAndRank',
    icon: 'mdi-magnify',
  },
  WORKFLOW_EXECUTION: {
    i18nTitle: '__titleCategoryWorkflowExecution',
    value: 'workflowExecution',
    icon: 'mdi-sitemap',
  },
  TEXT_AND_DATA_OPERATIONS: {
    i18nTitle: '__titleCategoryTextAndDataOperations',
    value: 'textAndDataOperations',
    icon: 'mdi-file-document',
  },
});

const DefaultWorkflowName = 'MyWorkflow';

const RunActivityStateDefinitionNameSuffix = '_run_activity';

const ClassName = Object.freeze({
  HIGHLIGHTED: 'highlighted',
  INTERACTIVE: 'interactive',
});

const NodesCollapseStatus = Object.freeze({
  ALL_COLLAPSED: 'allCollapsed',
  ALL_EXPANDED: 'allExpanded',
  MIXED: 'mixed',
});

export {
  ClassName,
  DefaultWorkflowName,
  Dimension,
  DropType,
  EdgeType,
  EditorMode,
  FlowType,
  Module,
  NodesCollapseStatus,
  RunActivityStateDefinitionNameSuffix,
  StateMenuCategory,
};
