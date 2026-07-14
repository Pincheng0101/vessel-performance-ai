<script setup>
import { AgentConstant, ResourceConstant } from '~/constants';

/**
 * @import { Agent } from '~/models/server/agent'
 */

/**
 * @type {{ resource: Agent }}
 */
const props = defineProps({
  resource: {
    type: Object,
    default: null,
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  notFoundResource: {
    type: Object,
    default: () => {},
  },
});

/**
 * @type {Ref<Agent>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});

const authStore = useAuthStore();
const { isFirstPartyEnv } = useRuntimeConfig().public;
const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const creditConfigRef = ref(null);
const creditPanelRef = ref(null);

const isCreditPanelVisible = computed(() => isFirstPartyEnv && !props.hiddenFields.includes('enableCredit'));

const shouldRevealCreditSection = computed(() => route.query.section === 'credit' && isCreditPanelVisible.value);

const defaultOpenPanels = computed(() => (shouldRevealCreditSection.value ? ['credit'] : []));

onMounted(async () => {
  if (!shouldRevealCreditSection.value) return;
  // Drop the one-shot intent first so a reload doesn't re-trigger expand/scroll
  // Awaiting it lets the router's default scroll behavior settle *before* we scroll — otherwise that navigation cancels the smooth scroll mid-flight
  const nextQuery = { ...route.query };
  delete nextQuery.section;
  await router.replace({ query: nextQuery });
  await nextTick();
  creditPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// Proxies the nested credit config fields' save-time sync up to ResourceAgentForm,
// so the agent form's single Save can persist the admin-only credit config
// (create/update/delete) for the given agent id after the agent itself is saved.
defineExpose({
  syncCreditConfig: agentId => creditConfigRef.value?.syncConfig?.(agentId),
});

const state = reactive({
  isPromptRewriting: false,
  llmResource: null,
  isLlmSwitchingEnabled: false,
  switchableLlmResources: [],
  tools: {
    retrieval: [],
    searchEngine: [],
    mcpServer: [],
    workflow: [],
    skill: [],
    lambda: [],
    api: [],
    httpClient: [],
    agent: [],
    athenaClient: [],
    openSearchClient: [],
    mysqlClient: [],
  },
  builtInTools: {
    askUserQuestion: {},
    task: {},
    read: {},
    glob: {},
    grep: {},
    readUrl: {},
    skill: {},
    bash: {},
    browser: {},
    code: {},
    write: {},
  },
});

// Convert null to empty string to prevent displaying "null" text
if (strUtils.isEmpty(formData.value.agentPrompt)) {
  formData.value.agentPrompt = '';
}
if (strUtils.isEmpty(formData.value.description)) {
  formData.value.description = '';
}
formData.value.maxTurns ??= AgentConstant.DefaultParams.MAX_TURNS.default;
formData.value.maxIterations ??= AgentConstant.DefaultParams.MAX_ITERATIONS.default;
formData.value.llmIds ??= null;
state.isLlmSwitchingEnabled = formData.value.llmIds !== null;

const hydrateToolsFromFormData = () => {
  state.tools.retrieval = formData.value.tools?.filter(tool => tool.toolType === AgentConstant.ToolType.RETRIEVAL.value) || [];
  state.tools.searchEngine = formData.value.tools?.filter(tool => tool.toolType === AgentConstant.ToolType.SEARCH_ENGINE.value) || [];
  state.tools.mcpServer = formData.value.tools?.filter(tool => tool.toolType === AgentConstant.ToolType.MCP_SERVER.value) || [];
  state.tools.workflow = formData.value.tools?.filter(tool => tool.toolType === AgentConstant.ToolType.WORKFLOW.value) || [];
  state.tools.skill = formData.value.tools?.filter(tool => tool.toolType === AgentConstant.ToolType.SKILL.value) || [];
  state.tools.lambda = formData.value.tools?.filter(tool => tool.toolType === AgentConstant.ToolType.LAMBDA.value) || [];
  state.tools.api = formData.value.tools?.filter(tool => tool.toolType === AgentConstant.ToolType.API.value) || [];
  state.tools.httpClient = formData.value.tools?.filter(tool => tool.toolType === AgentConstant.ToolType.HTTP_CLIENT.value) || [];
  state.tools.agent = formData.value.tools?.filter(tool => tool.toolType === AgentConstant.ToolType.AGENT.value) || [];
  state.tools.athenaClient = formData.value.tools?.filter(tool => tool.toolType === AgentConstant.ToolType.ATHENA_CLIENT.value) || [];
  state.tools.openSearchClient = formData.value.tools?.filter(tool => tool.toolType === AgentConstant.ToolType.OPENSEARCH_CLIENT.value) || [];
  state.tools.mysqlClient = formData.value.tools?.filter(tool => tool.toolType === AgentConstant.ToolType.MYSQL_CLIENT.value) || [];
};

const hydrateBuiltInToolsFromFormData = () => {
  const source = formData.value.builtInTools || {};
  state.builtInTools.askUserQuestion = source.askUserQuestion;
  state.builtInTools.task = source.task;
  state.builtInTools.read = source.read;
  state.builtInTools.glob = source.glob;
  state.builtInTools.grep = source.grep;
  state.builtInTools.readUrl = source.readUrl;
  state.builtInTools.skill = source.skill || {};
  state.builtInTools.bash = source.bash;
  state.builtInTools.browser = source.browser;
  state.builtInTools.code = source.code;
  state.builtInTools.write = source.write;
};

const autoEnableBuiltInSkillTool = (hasCustomSkillTool, hadCustomSkillTool) => {
  if (!state.builtInTools.skill) return;
  if (hasCustomSkillTool && !hadCustomSkillTool && !state.builtInTools.skill.enable) {
    state.builtInTools.skill.enable = true;
    syncBuiltInToolsToFormData();
  }
};

const syncToolsToFormData = () => {
  formData.value.tools = [
    ...state.tools.retrieval.map(item => ({ ...item, toolType: AgentConstant.ToolType.RETRIEVAL.value })),
    ...state.tools.searchEngine.map(item => ({ ...item, toolType: AgentConstant.ToolType.SEARCH_ENGINE.value })),
    ...state.tools.mcpServer.map(item => ({ ...item, toolType: AgentConstant.ToolType.MCP_SERVER.value })),
    ...state.tools.workflow.map(item => ({ ...item, toolType: AgentConstant.ToolType.WORKFLOW.value })),
    ...state.tools.skill.map(item => ({ ...item, toolType: AgentConstant.ToolType.SKILL.value })),
    ...state.tools.lambda.map(item => ({ ...item, toolType: AgentConstant.ToolType.LAMBDA.value })),
    ...state.tools.api.map(item => ({ ...item, toolType: AgentConstant.ToolType.API.value })),
    ...state.tools.httpClient.map(item => ({ ...item, toolType: AgentConstant.ToolType.HTTP_CLIENT.value })),
    ...state.tools.agent.map(item => ({ ...item, toolType: AgentConstant.ToolType.AGENT.value })),
    ...state.tools.athenaClient.map(item => ({ ...item, toolType: AgentConstant.ToolType.ATHENA_CLIENT.value })),
    ...state.tools.openSearchClient.map(item => ({ ...item, toolType: AgentConstant.ToolType.OPENSEARCH_CLIENT.value })),
    ...state.tools.mysqlClient.map(item => ({ ...item, toolType: AgentConstant.ToolType.MYSQL_CLIENT.value })),
  ];
};

const syncBuiltInToolsToFormData = () => {
  formData.value.builtInTools = {
    askUserQuestion: { ...state.builtInTools.askUserQuestion },
    task: { ...state.builtInTools.task },
    read: { ...state.builtInTools.read },
    glob: { ...state.builtInTools.glob },
    grep: { ...state.builtInTools.grep },
    readUrl: { ...state.builtInTools.readUrl },
    skill: { ...state.builtInTools.skill },
    bash: { ...state.builtInTools.bash },
    browser: { ...state.builtInTools.browser },
    code: { ...state.builtInTools.code },
    write: { ...state.builtInTools.write },
  };
};

hydrateToolsFromFormData();
hydrateBuiltInToolsFromFormData();
syncToolsToFormData();
syncBuiltInToolsToFormData();

watch(() => state.tools, syncToolsToFormData, { deep: true });
watch(() => state.builtInTools, syncBuiltInToolsToFormData, { deep: true });
watch(
  () => state.tools.skill.length > 0,
  (hasCustomSkillTool, hadCustomSkillTool) => {
    autoEnableBuiltInSkillTool(hasCustomSkillTool, hadCustomSkillTool);
  },
  { immediate: true },
);

const syncLlmResources = (llmIds) => {
  const resourceMap = Object.fromEntries(state.switchableLlmResources.map(item => [item.id, item]));
  if (state.llmResource?.id) {
    resourceMap[state.llmResource.id] = state.llmResource;
  }

  const nextResources = [
    ...(formData.value.llmId && llmIds.includes(formData.value.llmId) && resourceMap[formData.value.llmId]
      ? [resourceMap[formData.value.llmId]]
      : []),
    ...llmIds
      .filter(id => id !== formData.value.llmId)
      .map(id => resourceMap[id])
      .filter(Boolean),
  ];

  const currentIds = state.switchableLlmResources.map(item => item.id);
  const nextIds = nextResources.map(item => item.id);
  if (!arrUtils.isEqualOrdered(currentIds, nextIds)) {
    state.switchableLlmResources = nextResources;
  }
};

const normalizeSwitchableLlmIds = () => {
  if (!state.isLlmSwitchingEnabled || formData.value.llmIds === null) return;

  const currentIds = formData.value.llmIds || [];
  const nextIds = [...new Set([
    ...(formData.value.llmId ? [formData.value.llmId] : []),
    ...currentIds,
  ])];

  if (!arrUtils.isEqualOrdered(currentIds, nextIds)) {
    formData.value.llmIds = nextIds;
  }

  syncLlmResources(nextIds);
};

const outputFormatOptions = computed(() => AgentConstant.OutputFormatOptions.map(item => ({
  ...item,
  title: t(item.title),
})));

const switchableLlmsDisableCondition = computed(() => {
  if (!formData.value.llmId) return null;
  return {
    conditions: [
      {
        field: 'llmId',
        operator: '==',
        value: formData.value.llmId,
      },
    ],
  };
});

const handleIsLlmSwitchingEnabledUpdate = (enabled) => {
  if (enabled === state.isLlmSwitchingEnabled) return;

  state.isLlmSwitchingEnabled = enabled;

  if (enabled) {
    formData.value.llmIds = formData.value.llmIds || [];
    normalizeSwitchableLlmIds();
    return;
  }

  formData.value.llmIds = null;
  state.switchableLlmResources = [];
};

const handleDefaultLlmUpdate = (llmId) => {
  formData.value.llmId = llmId;

  if (!state.isLlmSwitchingEnabled || formData.value.llmIds === null) return;

  normalizeSwitchableLlmIds();
};

const handleSwitchableLlmsUpdate = (llmIds) => {
  const nextIds = [...new Set(llmIds || [])];

  if (formData.value.llmId && !nextIds.includes(formData.value.llmId)) {
    nextIds.unshift(formData.value.llmId);
  }

  if (!arrUtils.isEqualOrdered(formData.value.llmIds || [], nextIds)) {
    formData.value.llmIds = nextIds;
  }
  syncLlmResources(nextIds);
};

watch(() => formData.value.llmId, (after) => {
  if (!after || !state.isLlmSwitchingEnabled || formData.value.llmIds === null) return;
  normalizeSwitchableLlmIds();
});

watch(() => state.llmResource?.id, (after) => {
  if (!after || !state.isLlmSwitchingEnabled || formData.value.llmIds === null) return;
  normalizeSwitchableLlmIds();
});
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('agentName')"
    v-slot="{ id, label }"
    :label="$t('__fieldName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.agentName"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .stringLengthLte(64)
          .notStartsWith('default')
          .collect()
      )"
    />
  </AppInputGroup>
  <ResourceLlmPaginatedSelect
    v-if="!props.hiddenFields.includes('llmId')"
    v-model="formData.llmId"
    v-model:restored-objects="state.llmResource"
    :not-found-object-id="props.notFoundResource?.type === ResourceConstant.Type.LLM.module ? props.notFoundResource.id : null"
    :on-update="handleDefaultLlmUpdate"
    required
    :return-object="false"
  />
  <AppInputGroup
    v-if="!props.hiddenFields.includes('description')"
    v-slot="{ id, label }"
    :label="$t('__fieldDescription')"
    :tooltip="$t('__tooltipAgentDescription')"
  >
    <AppTextarea
      :id="id"
      v-model="formData.description"
      :rules="(
        $validator
          .defineField(label)
          .stringLengthLte(AgentConstant.DefaultParams.DESCRIPTION.maxLength)
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('agentPrompt')"
    v-slot="{ id }"
    :label="$t('__fieldAgentPrompt')"
    :tooltip="$t('__tooltipAgentPrompt')"
  >
    <AppJinjaEditor
      :id="id"
      v-model="formData.agentPrompt"
      :loading="state.isPromptRewriting"
      :disabled="state.isPromptRewriting"
      :max-lines="10"
    >
      <template #prepend-tools>
        <PromptRewriteButton
          v-model:prompt="formData.agentPrompt"
          v-model:loading="state.isPromptRewriting"
          :target-llm-id="formData.llmId"
          :hidden-fields="['targetModel', 'targetLlmType', 'targetLlmId', 'targetLlmSource', 'endpointUrl']"
          :seed-original-prompt-builder="() => {
            const lines = [`Agent name: ${formData.agentName}`];
            if (formData.description) lines.push(`Agent description: ${formData.description}`);
            return lines.join('\n');
          }"
        />
      </template>
    </AppJinjaEditor>
  </AppInputGroup>
  <AppFormFieldExpansionPanels :default-open-panels="defaultOpenPanels">
    <AppFormFieldExpansionPanel :title="$t('__titleBuiltInTools')">
      <ResourceAgentBuiltInToolsFormFields
        v-model:built-in-tool-ask-user-question="state.builtInTools.askUserQuestion"
        v-model:built-in-tool-task="state.builtInTools.task"
        v-model:built-in-tool-read="state.builtInTools.read"
        v-model:built-in-tool-glob="state.builtInTools.glob"
        v-model:built-in-tool-grep="state.builtInTools.grep"
        v-model:built-in-tool-read-url="state.builtInTools.readUrl"
        v-model:built-in-tool-skill="state.builtInTools.skill"
        v-model:built-in-tool-bash="state.builtInTools.bash"
        v-model:built-in-tool-browser="state.builtInTools.browser"
        v-model:built-in-tool-code="state.builtInTools.code"
        v-model:built-in-tool-write="state.builtInTools.write"
        :hidden-fields="props.hiddenFields"
      />
    </AppFormFieldExpansionPanel>
    <AppFormFieldExpansionPanel :title="$t('__titleCustomTools')">
      <ResourceAgentToolsFormFields
        v-model:retrieval-tools="state.tools.retrieval"
        v-model:search-engine-tools="state.tools.searchEngine"
        v-model:workflow-tools="state.tools.workflow"
        v-model:mcp-server-tools="state.tools.mcpServer"
        v-model:skill-tools="state.tools.skill"
        v-model:lambda-tools="state.tools.lambda"
        v-model:api-tools="state.tools.api"
        v-model:http-client-tools="state.tools.httpClient"
        v-model:agent-tools="state.tools.agent"
        v-model:athena-client-tools="state.tools.athenaClient"
        v-model:open-search-client-tools="state.tools.openSearchClient"
        v-model:mysql-client-tools="state.tools.mysqlClient"
        :resource="props.resource"
        :hidden-fields="props.hiddenFields"
        :not-found-resource="props.notFoundResource"
      />
    </AppFormFieldExpansionPanel>
    <AppFormFieldExpansionPanel
      v-if="!props.hiddenFields.includes('llmIds') || !props.hiddenFields.includes('outputFormat') || !props.hiddenFields.includes('maxTurns') || !props.hiddenFields.includes('maxIterations')"
      :title="$t('__titleAdvancedSettings')"
    >
      <AppInputGroup
        v-if="!props.hiddenFields.includes('llmIds')"
        v-slot="{ id }"
        :label="$t('__fieldAgentEnableLlmSwitching')"
        :tooltip="$t('__tooltipAgentEnableLlmSwitching')"
      >
        <AppSwitch
          :id="id"
          :model-value="state.isLlmSwitchingEnabled"
          @update:model-value="handleIsLlmSwitchingEnabledUpdate"
        />
      </AppInputGroup>
      <ResourceLlmPaginatedSelect
        v-if="!props.hiddenFields.includes('llmIds') && state.isLlmSwitchingEnabled"
        v-model="formData.llmIds"
        v-model:restored-objects="state.switchableLlmResources"
        :field-name="$t('__fieldSwitchableLlms')"
        :tooltip="$t('__tooltipAgentSwitchableLlms')"
        :disable-condition="switchableLlmsDisableCondition"
        :disabled-tooltip="$t('__tooltipAgentDefaultLlmLocked')"
        :on-update="handleSwitchableLlmsUpdate"
        required
        multiple-select
        :return-object="false"
      >
        <template #chip="{ item, handleClose }">
          <v-chip
            color="primary"
            :closable="(item.raw?.id || item.value) !== formData.llmId"
            @click:close="handleClose(item)"
          >
            <div class="text-truncate">
              {{ item.title }}
            </div>
          </v-chip>
        </template>
      </ResourceLlmPaginatedSelect>
      <AppInputGroup
        v-if="!props.hiddenFields.includes('outputFormat')"
        v-slot="{ id }"
        :label="$t('__fieldAgentOutputFormat')"
        :tooltip="$t('__tooltipAgentOutputFormat')"
      >
        <AppSelect
          :id="id"
          v-model="formData.outputFormat"
          :items="outputFormatOptions"
        />
      </AppInputGroup>
      <AppInputGroup
        v-if="!props.hiddenFields.includes('maxTurns')"
        v-slot="{ id, label }"
        :label="$t('__fieldMaxTurns')"
        :tooltip="$t('__tooltipAgentMaxTurns')"
      >
        <AppTextField
          :id="id"
          v-model.integer="formData.maxTurns"
          type="number"
          :min="AgentConstant.DefaultParams.MAX_TURNS.min"
          :max="AgentConstant.DefaultParams.MAX_TURNS.max"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .gte(AgentConstant.DefaultParams.MAX_TURNS.min)
              .lte(AgentConstant.DefaultParams.MAX_TURNS.max)
              .collect()
          )"
        />
      </AppInputGroup>
      <AppInputGroup
        v-if="!props.hiddenFields.includes('maxIterations')"
        v-slot="{ id, label }"
        :label="$t('__fieldMaxIterations')"
        :tooltip="$t('__tooltipAgentMaxIterations')"
      >
        <AppTextField
          :id="id"
          v-model.integer="formData.maxIterations"
          type="number"
          :min="AgentConstant.DefaultParams.MAX_ITERATIONS.min"
          :max="AgentConstant.DefaultParams.MAX_ITERATIONS.max"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .gte(AgentConstant.DefaultParams.MAX_ITERATIONS.min)
              .lte(AgentConstant.DefaultParams.MAX_ITERATIONS.max)
              .collect()
          )"
        />
      </AppInputGroup>
    </AppFormFieldExpansionPanel>
    <AppFormFieldExpansionPanel
      v-if="!props.hiddenFields.includes('uiConfig')"
      :title="$t('__titleUiSettings')"
    >
      <ResourceAgentUiConfigFormFields
        v-model:ui-config="formData.uiConfig"
        :hidden-fields="props.hiddenFields"
        :agent-name="formData.agentName"
        :agent-description="formData.description"
        :agent-prompt="formData.agentPrompt"
        :llm-id="formData.llmId"
      />
    </AppFormFieldExpansionPanel>
    <AppFormFieldExpansionPanel
      v-if="isCreditPanelVisible"
      ref="creditPanelRef"
      value="credit"
      :title="$t('__titleCreditSettings')"
    >
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldAgentEnableCredit')"
        :tooltip="$t('__tooltipAgentEnableCredit')"
      >
        <AppSwitch
          :id="id"
          v-model="formData.enableCredit"
        />
      </AppInputGroup>
      <template v-if="authStore.parsedToken.isAdmin">
        <ResourceAgentCreditConfigFormFields
          ref="creditConfigRef"
          :agent-id="formData.agentId"
        />
      </template>
    </AppFormFieldExpansionPanel>
  </AppFormFieldExpansionPanels>
</template>
