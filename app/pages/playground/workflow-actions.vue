<script setup>
import { StateConstant } from '~/constants';
import { NodeFactory } from '~/models/workflow';
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
import { PassNode } from '~/models/workflow/state/task/pass';
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

definePageMeta({
  layout: 'fluid',
});

const { t } = useI18n();

const actions = computed(() => [
  {
    title: t('__workflowAction', { action: t('__fieldAgent') }),
    value: StateConstant.ActionType.AGENT.value,
    node: AgentNode,
  },
  {
    title: t('__workflowAction', { action: t('__fieldAthena') }),
    value: StateConstant.ActionType.ATHENA.value,
    node: AthenaNode,
  },
  {
    title: t('__workflowAction', { action: t('__fieldCode') }),
    value: StateConstant.ActionType.CODE.value,
    node: CodeNode,
  },
  {
    title: t('__workflowAction', { action: t('__fieldDescribeWorkflowExecution') }),
    value: StateConstant.ActionType.DESCRIBE_WORKFLOW_EXECUTION.value,
    node: DescribeWorkflowExecutionNode,
  },
  {
    title: t('__workflowAction', { action: t('__fieldHttpsApi') }),
    value: StateConstant.ActionType.HTTPS_API.value,
    node: HttpsApiNode,
  },
  {
    title: t('__workflowAction', { action: t('__fieldLambda') }),
    value: StateConstant.ActionType.LAMBDA.value,
    node: LambdaNode,
  },
  {
    title: t('__workflowAction', { action: t('__fieldLlm') }),
    value: StateConstant.ActionType.LLM.value,
    node: LlmNode,
  },
  {
    title: t('__workflowAction', { action: t('__fieldMcp') }),
    value: StateConstant.ActionType.MCP.value,
    node: McpNode,
  },
  {
    title: t('__workflowAction', { action: t('__fieldMySql') }),
    value: StateConstant.ActionType.MYSQL.value,
    node: MySqlNode,
  },
  {
    title: t('__workflowAction', { action: t('__fieldOpenSearch') }),
    value: StateConstant.ActionType.OPENSEARCH.value,
    node: OpenSearchNode,
  },
  {
    title: t('__workflowAction', { action: t('__fieldPass') }),
    value: StateConstant.ActionType.PASS.value,
    node: PassNode,
  },
  {
    title: t('__workflowAction', { action: t('__fieldRanker') }),
    value: StateConstant.ActionType.RANKER.value,
    node: RankerNode,
  },
  {
    title: t('__workflowAction', { action: t('__fieldReadUrl') }),
    value: StateConstant.ActionType.READ_URL.value,
    node: ReadUrlNode,
  },
  {
    title: t('__workflowAction', { action: t('__fieldRetrieval') }),
    value: StateConstant.ActionType.RETRIEVAL.value,
    node: RetrievalNode,
  },
  {
    title: t('__workflowAction', { action: t('__fieldRetriever') }),
    value: StateConstant.ActionType.RETRIEVER.value,
    node: RetrieverNode,
  },
  {
    title: t('__workflowAction', { action: t('__fieldSearchEngine') }),
    value: StateConstant.ActionType.SEARCH_ENGINE.value,
    node: SearchEngineNode,
  },
  {
    title: t('__workflowAction', { action: t('__fieldStartWorkflowExecution') }),
    value: StateConstant.ActionType.START_WORKFLOW_EXECUTION.value,
    node: StartWorkflowExecutionNode,
  },
  {
    title: t('__workflowAction', { action: t('__fieldStartSyncWorkflowExecution') }),
    value: StateConstant.ActionType.START_SYNC_WORKFLOW_EXECUTION.value,
    node: StartSyncWorkflowExecutionNode,
  },
  {
    title: t('__workflowAction', { action: t('__fieldStructuredLlm') }),
    value: StateConstant.ActionType.STRUCTURED_LLM.value,
    node: StructuredLlmNode,
  },
  {
    title: t('__workflowAction', { action: t('__fieldText') }),
    value: StateConstant.ActionType.TEXT.value,
    node: TextNode,
  },
  {
    title: t('__workflowAction', { action: t('__fieldTransformation') }),
    value: StateConstant.ActionType.TRANSFORMATION.value,
    node: TransformationNode,
  },
]);

const form = shallowRef(null);

const state = reactive({
  node: null,
});

const handleActionChange = (v) => {
  const formComponent = findField(StateConstant.ActionType, v, 'formComponent');
  form.value = defineAsyncComponent(() => import(`~/components/${formComponent}.vue`));
  const node = findField(actions.value, v, 'node');
  state.node = new node();
};

const handleUpdate = (v) => {
  state.node = NodeFactory.create(v);
};
</script>

<template>
  <ResourceInfoTitle
    title="Workflow Actions"
    class="mb-4"
  />
  <AppInputGroup
    v-slot="{ id }"
    :label="$t('__fieldAction')"
    required
  >
    <AppSelect
      :id="id"
      v-model="state.action"
      :item-props="false"
      :items="Object.values(actions)"
      @update:model-value="handleActionChange"
    />
  </AppInputGroup>
  <template v-if="form">
    <component
      :is="form"
      :node="state.node"
      :on-update="handleUpdate"
      class="full-width"
    />
  </template>
</template>
