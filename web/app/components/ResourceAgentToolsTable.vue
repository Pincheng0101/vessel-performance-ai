<script setup>
import { AgentConstant, ResourceConstant } from '~/constants';

const VIEW_MODE_STORAGE_KEY = 'agent-custom-tools-view-mode';

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
    default: () => ({}),
  },
});

const retrievalTools = defineModel('retrievalTools', {
  type: Array,
  default: () => [],
});

const searchEngineTools = defineModel('searchEngineTools', {
  type: Array,
  default: () => [],
});

const workflowTools = defineModel('workflowTools', {
  type: Array,
  default: () => [],
});

const mcpServerTools = defineModel('mcpServerTools', {
  type: Array,
  default: () => [],
});

const skillTools = defineModel('skillTools', {
  type: Array,
  default: () => [],
});

const lambdaTools = defineModel('lambdaTools', {
  type: Array,
  default: () => [],
});

const apiTools = defineModel('apiTools', {
  type: Array,
  default: () => [],
});

const httpClientTools = defineModel('httpClientTools', {
  type: Array,
  default: () => [],
});

const agentTools = defineModel('agentTools', {
  type: Array,
  default: () => [],
});

const athenaClientTools = defineModel('athenaClientTools', {
  type: Array,
  default: () => [],
});

const openSearchClientTools = defineModel('openSearchClientTools', {
  type: Array,
  default: () => [],
});

const mysqlClientTools = defineModel('mysqlClientTools', {
  type: Array,
  default: () => [],
});

const { t } = useI18n();

const state = reactive({
  selectedToolType: '',
  query: '',
  viewMode: localStorage.getItem(VIEW_MODE_STORAGE_KEY) || ResourceConstant.ViewMode.CARD.value,
});

watch(() => state.viewMode, (value) => {
  localStorage.setItem(VIEW_MODE_STORAGE_KEY, value);
});

const getToolTypeIconMeta = (icon) => {
  if (!icon) return {};
  if (!icon.startsWith('/')) {
    return { icon };
  }
  return {
    iconPath: icon,
    iconPathMaskColor: icon === ResourceConstant.Type.MCP_SERVER.iconPath ? 'primary' : undefined,
  };
};

const TOOL_GROUP_DEFS = computed(() => [
  {
    key: 'retrievalTools',
    title: t(AgentConstant.ToolType.RETRIEVAL.i18nTitle),
    description: t(AgentConstant.ToolType.RETRIEVAL.i18nDescription),
    toolType: AgentConstant.ToolType.RETRIEVAL.value,
    icon: AgentConstant.ToolType.RETRIEVAL.icon,
    model: retrievalTools,
    details: item => [
      {
        title: t('__fieldKnowledgeBaseId'),
        value: item.knowledgeBaseId,
        link: item.knowledgeBaseId ? ({ href: resourceUtils.getUrl(ResourceConstant.Type.KNOWLEDGE_BASE.value, item.knowledgeBaseId), target: '_blank' }) : null,
        isCopyable: true,
      },
      {
        title: t('__fieldRetrieverId'),
        value: item.retrieverIds,
        isCopyable: true,
        link: retrieverId => ({ href: resourceUtils.getUrl(ResourceConstant.Type.RETRIEVER.value, retrieverId), target: '_blank' }),
      },
      {
        title: t('__fieldRankerId'),
        value: item.rankerId,
        link: item.rankerId ? ({ href: resourceUtils.getUrl(ResourceConstant.Type.RANKER.value, item.rankerId), target: '_blank' }) : null,
        isCopyable: true,
      },
      {
        title: t('__fieldDataField', 2),
        value: item.dataFields,
        isChip: true,
      },
      {
        title: t('__fieldDisplayName'),
        value: item.displayName,
      },
      {
        title: t('__fieldTag', 2),
        value: item.tags,
        isChip: true,
      },
    ],
  },
  {
    key: 'searchEngineTools',
    title: t(AgentConstant.ToolType.SEARCH_ENGINE.i18nTitle),
    description: t(AgentConstant.ToolType.SEARCH_ENGINE.i18nDescription),
    toolType: AgentConstant.ToolType.SEARCH_ENGINE.value,
    icon: AgentConstant.ToolType.SEARCH_ENGINE.icon,
    model: searchEngineTools,
    details: item => [
      {
        title: t('__fieldSearchEngineId'),
        value: item.searchEngineId,
        link: item.searchEngineId ? ({ href: resourceUtils.getUrl(ResourceConstant.Type.SEARCH_ENGINE.value, item.searchEngineId), target: '_blank' }) : null,
        isCopyable: true,
      },
      {
        title: t('__fieldDisplayName'),
        value: item.displayName,
      },
      {
        title: t('__fieldTag', 2),
        value: item.tags,
        isChip: true,
      },
    ],
  },
  {
    key: 'workflowTools',
    title: t(AgentConstant.ToolType.WORKFLOW.i18nTitle),
    description: t(AgentConstant.ToolType.WORKFLOW.i18nDescription),
    toolType: AgentConstant.ToolType.WORKFLOW.value,
    icon: AgentConstant.ToolType.WORKFLOW.icon,
    model: workflowTools,
    details: item => [
      {
        title: t('__fieldWorkflowId'),
        value: item.workflowId,
        link: item.workflowId ? ({ href: resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, item.workflowId), target: '_blank' }) : null,
        isCopyable: true,
      },
      {
        title: t('__fieldDisplayName'),
        value: item.displayName,
      },
      {
        title: t('__fieldTag', 2),
        value: item.tags,
        isChip: true,
      },
    ],
  },
  {
    key: 'mcpServerTools',
    title: t(AgentConstant.ToolType.MCP_SERVER.i18nTitle),
    description: t(AgentConstant.ToolType.MCP_SERVER.i18nDescription),
    toolType: AgentConstant.ToolType.MCP_SERVER.value,
    icon: AgentConstant.ToolType.MCP_SERVER.icon,
    model: mcpServerTools,
    details: item => [
      {
        title: t('__fieldMcpServerId'),
        value: item.mcpServerId,
        link: item.mcpServerId ? ({ href: resourceUtils.getUrl(ResourceConstant.Type.MCP_SERVER.value, item.mcpServerId), target: '_blank' }) : null,
        isCopyable: true,
      },
      {
        title: t('__fieldDisplayName'),
        value: item.displayName,
      },
      {
        title: t('__fieldTag', 2),
        value: item.tags,
        isChip: true,
      },
    ],
  },
  {
    key: 'skillTools',
    title: t(AgentConstant.ToolType.SKILL.i18nTitle),
    description: t(AgentConstant.ToolType.SKILL.i18nDescription),
    toolType: AgentConstant.ToolType.SKILL.value,
    icon: AgentConstant.ToolType.SKILL.icon,
    model: skillTools,
    details: item => [
      {
        title: t('__fieldSkillId'),
        value: item.skillId,
        link: item.skillId ? ({ href: resourceUtils.getUrl(ResourceConstant.Type.SKILL.value, item.skillId), target: '_blank' }) : null,
        isCopyable: true,
      },
      {
        title: t('__fieldDisplayName'),
        value: item.displayName,
      },
      {
        title: t('__fieldTag', 2),
        value: item.tags,
        isChip: true,
      },
    ],
  },
  {
    key: 'lambdaTools',
    title: t(AgentConstant.ToolType.LAMBDA.i18nTitle),
    description: t(AgentConstant.ToolType.LAMBDA.i18nDescription),
    toolType: AgentConstant.ToolType.LAMBDA.value,
    icon: AgentConstant.ToolType.LAMBDA.icon,
    model: lambdaTools,
    details: item => [
      {
        title: t('__fieldLambdaFunctionName'),
        value: item.functionName,
        isCopyable: true,
      },
      {
        title: t('__fieldInputSchema'),
        value: item.inputSchema,
        isJsonCode: true,
        editorOptions: { maxLines: 10 },
      },
      {
        title: t('__fieldDisplayName'),
        value: item.displayName,
      },
      {
        title: t('__fieldTag', 2),
        value: item.tags,
        isChip: true,
      },
    ],
  },
  {
    key: 'apiTools',
    title: t(AgentConstant.ToolType.API.i18nTitle),
    description: t(AgentConstant.ToolType.API.i18nDescription),
    toolType: AgentConstant.ToolType.API.value,
    icon: AgentConstant.ToolType.API.icon,
    model: apiTools,
    details: item => [
      {
        title: t('__fieldMethod'),
        value: item.method,
        isChip: true,
        chipOptions: { color: 'primary' },
      },
      {
        title: t('__fieldConnector'),
        value: item.connectorId,
        link: item.connectorId ? ({ href: resourceUtils.getUrl(ResourceConstant.Type.CONNECTOR.value, item.connectorId), target: '_blank' }) : null,
        isCopyable: true,
      },
      {
        title: t('__fieldUrl'),
        value: item.url,
        isCopyable: true,
      },
      {
        title: t('__fieldTimeout'),
        value: item.timeout,
      },
      {
        title: t('__fieldInputSchema'),
        value: item.inputSchema,
        isJsonCode: true,
        editorOptions: { maxLines: 10 },
      },
      {
        title: t('__fieldDisplayName'),
        value: item.displayName,
      },
      {
        title: t('__fieldTag', 2),
        value: item.tags,
        isChip: true,
      },
    ],
  },
  {
    key: 'httpClientTools',
    title: t(AgentConstant.ToolType.HTTP_CLIENT.i18nTitle),
    description: t(AgentConstant.ToolType.HTTP_CLIENT.i18nDescription),
    toolType: AgentConstant.ToolType.HTTP_CLIENT.value,
    icon: AgentConstant.ToolType.HTTP_CLIENT.icon,
    model: httpClientTools,
    details: item => [
      {
        title: t('__fieldConnector'),
        value: item.connectorId,
        link: item.connectorId ? ({ href: resourceUtils.getUrl(ResourceConstant.Type.CONNECTOR.value, item.connectorId), target: '_blank' }) : null,
        isCopyable: true,
      },
      {
        title: t('__fieldTimeout'),
        value: item.timeout,
      },
      {
        title: t('__fieldHttpHeader', 2),
        value: item.headers,
        isJsonCode: true,
        editorOptions: { maxLines: 10 },
      },
      {
        title: t('__fieldDisplayName'),
        value: item.displayName,
      },
      {
        title: t('__fieldTag', 2),
        value: item.tags,
        isChip: true,
      },
    ],
  },
  {
    key: 'agentTools',
    title: t(AgentConstant.ToolType.AGENT.i18nTitle),
    description: t(AgentConstant.ToolType.AGENT.i18nDescription),
    toolType: AgentConstant.ToolType.AGENT.value,
    icon: AgentConstant.ToolType.AGENT.icon,
    model: agentTools,
    details: item => [
      {
        title: t('__fieldAgentId'),
        value: item.agentId,
        link: item.agentId ? ({ href: resourceUtils.getUrl(ResourceConstant.Type.AGENT.value, item.agentId), target: '_blank' }) : null,
        isCopyable: true,
      },
      {
        title: t('__fieldDisplayName'),
        value: item.displayName,
      },
      {
        title: t('__fieldTag', 2),
        value: item.tags,
        isChip: true,
      },
    ],
  },
  {
    key: 'athenaClientTools',
    title: t(AgentConstant.ToolType.ATHENA_CLIENT.i18nTitle),
    description: t(AgentConstant.ToolType.ATHENA_CLIENT.i18nDescription),
    toolType: AgentConstant.ToolType.ATHENA_CLIENT.value,
    icon: AgentConstant.ToolType.ATHENA_CLIENT.icon,
    model: athenaClientTools,
    details: item => [
      {
        title: t('__fieldConnector'),
        value: item.connectorId,
        link: item.connectorId ? ({ href: resourceUtils.getUrl(ResourceConstant.Type.CONNECTOR.value, item.connectorId), target: '_blank' }) : null,
        isCopyable: true,
      },
      {
        title: t('__fieldDatabase'),
        value: item.database,
      },
      {
        title: t('__fieldWorkgroup'),
        value: item.workgroup,
      },
      {
        title: t('__fieldOutputLocation'),
        value: item.outputLocation,
      },
      {
        title: t('__fieldCatalog'),
        value: item.catalog,
      },
      {
        title: t('__fieldReadOnly'),
        value: item.readOnly,
      },
      {
        title: t('__fieldDisplayName'),
        value: item.displayName,
      },
      {
        title: t('__fieldTag', 2),
        value: item.tags,
        isChip: true,
      },
    ],
  },
  {
    key: 'openSearchClientTools',
    title: t(AgentConstant.ToolType.OPENSEARCH_CLIENT.i18nTitle),
    description: t(AgentConstant.ToolType.OPENSEARCH_CLIENT.i18nDescription),
    toolType: AgentConstant.ToolType.OPENSEARCH_CLIENT.value,
    icon: AgentConstant.ToolType.OPENSEARCH_CLIENT.icon,
    model: openSearchClientTools,
    details: item => [
      {
        title: t('__fieldConnector'),
        value: item.connectorId,
        link: item.connectorId ? ({ href: resourceUtils.getUrl(ResourceConstant.Type.CONNECTOR.value, item.connectorId), target: '_blank' }) : null,
        isCopyable: true,
      },
      {
        title: t('__fieldIsCacheConnection'),
        value: item.isCacheConnection,
      },
      {
        title: t('__fieldTimeout'),
        value: item.timeout,
      },
      {
        title: t('__fieldDisplayName'),
        value: item.displayName,
      },
      {
        title: t('__fieldTag', 2),
        value: item.tags,
        isChip: true,
      },
    ],
  },
  {
    key: 'mysqlClientTools',
    title: t(AgentConstant.ToolType.MYSQL_CLIENT.i18nTitle),
    description: t(AgentConstant.ToolType.MYSQL_CLIENT.i18nDescription),
    toolType: AgentConstant.ToolType.MYSQL_CLIENT.value,
    icon: AgentConstant.ToolType.MYSQL_CLIENT.icon,
    model: mysqlClientTools,
    details: item => [
      {
        title: t('__fieldConnector'),
        value: item.connectorId,
        link: item.connectorId ? ({ href: resourceUtils.getUrl(ResourceConstant.Type.CONNECTOR.value, item.connectorId), target: '_blank' }) : null,
        isCopyable: true,
      },
      {
        title: t('__fieldDatabase'),
        value: item.database,
      },
      {
        title: t('__fieldReadOnly'),
        value: item.readOnly,
      },
      {
        title: t('__fieldDisplayName'),
        value: item.displayName,
      },
      {
        title: t('__fieldTag', 2),
        value: item.tags,
        isChip: true,
      },
    ],
  },
]);

const visibleToolGroups = computed(() => TOOL_GROUP_DEFS.value.filter(group => !props.hiddenFields.includes(group.key)));

const toolGroupByKey = computed(() => Object.fromEntries(visibleToolGroups.value.map(group => [group.key, group])));

const selectedAddGroup = computed(() => visibleToolGroups.value.find(group => group.toolType === state.selectedToolType) || null);

const tableHeaders = computed(() => [
  { title: t('__fieldName'), key: 'name' },
  {
    title: t('__fieldType'),
    key: 'toolTypeLabel',
    icon: item => getToolTypeIconMeta(item.toolTypeIcon).icon,
    iconPath: item => getToolTypeIconMeta(item.toolTypeIcon).iconPath,
    iconPathMaskColor: item => getToolTypeIconMeta(item.toolTypeIcon).iconPathMaskColor,
  },
  { title: t('__fieldDescription'), key: 'description', isBlockText: true, editorOptions: { maxLines: 10 } },
]);

const sanitizeTool = (tool, toolType) => {
  const rawTool = objUtils.toRaw(tool);
  delete rawTool.id;
  delete rawTool.toolTypeLabel;
  delete rawTool.toolTypeIcon;
  delete rawTool.toolGroupKey;
  delete rawTool.toolSourceIndex;
  return {
    ...rawTool,
    toolType,
  };
};

const filteredToolGroups = computed(() => {
  const q = String(state.query || '').toLowerCase();
  return visibleToolGroups.value
    .filter(group => group.title.toLowerCase().includes(q) || group.toolType.toLowerCase().includes(q))
    .map(group => ({
      ...group,
      ...getToolTypeIconMeta(group.icon),
    }));
});

const getTableItems = groups => groups.flatMap(group => group.model.value.map((tool, index) => ({
  ...sanitizeTool(tool, group.toolType),
  id: `${group.key}:${index}`,
  toolType: group.toolType,
  toolTypeLabel: group.title,
  toolTypeIcon: group.icon,
  toolGroupKey: group.key,
  toolSourceIndex: index,
})));

const tableItems = computed(() => getTableItems(visibleToolGroups.value));

const combinedTools = computed({
  get: () => tableItems.value,
  set: (next) => {
    visibleToolGroups.value.forEach((group) => {
      const currentItems = group.model.value.map(item => sanitizeTool(item, group.toolType));
      const nextItems = next
        .filter(item => item.toolGroupKey === group.key)
        .map(item => sanitizeTool(item, group.toolType));
      if (JSON.stringify(currentItems) === JSON.stringify(nextItems)) {
        return;
      }
      group.model.value = nextItems;
    });
  },
});

const getGroupByToolType = (toolType) => {
  return visibleToolGroups.value.find(group => group.toolType === toolType) || null;
};

const getExpandedRowItems = (item) => {
  const group = toolGroupByKey.value[item.toolGroupKey];
  if (!group) return [];
  return group.details(item);
};

const getAllUsedNames = () => TOOL_GROUP_DEFS.value.flatMap(group => group.model.value ?? []).map(tool => tool.name).filter(Boolean);

const updateGroupItem = (group, sourceIndex, nextItem) => {
  group.model.value = group.model.value.map((tool, index) => (
    index === sourceIndex ? sanitizeTool(nextItem, group.toolType) : tool
  ));
};

const addGroupItem = (group, nextItem) => {
  group.model.value = [...group.model.value, sanitizeTool(nextItem, group.toolType)];
};

const removeGroupItem = (group, sourceIndex) => {
  group.model.value = group.model.value.filter((_, index) => index !== sourceIndex);
};

const submitToolItem = (group, sourceIndex = null) => {
  return (nextItem) => {
    if (!group) return;
    const normalizedItem = sanitizeTool(nextItem, group.toolType);
    if (sourceIndex === null || sourceIndex === undefined) {
      addGroupItem(group, normalizedItem);
      return;
    }
    updateGroupItem(group, sourceIndex, normalizedItem);
  };
};

const handleOpenToolPicker = (onOpen) => {
  state.selectedToolType = '';
  state.query = '';
  onOpen();
};

const handleAddTypeSelect = (toolType) => {
  state.selectedToolType = toolType;
};

const handleBackToPicker = () => {
  state.selectedToolType = '';
};

watch(visibleToolGroups, (after) => {
  if (after.length < 1) {
    state.selectedToolType = '';
    return;
  }
  if (!after.some(group => group.toolType === state.selectedToolType)) {
    state.selectedToolType = after[0].toolType;
  }
}, { immediate: true });
</script>

<template>
  <AppTable
    v-model="combinedTools"
    :server-side="false"
    :headers="tableHeaders"
    :items="tableItems"
    :enable-search="false"
    :show-pagination="false"
    :enable-expand="true"
    :is-expanded-row-visible="item => getExpandedRowItems(item).length > 0"
    bordered
    enable-scroll-button
    hide-no-data
  >
    <template #expanded-row="{ item }">
      <div
        v-if="getExpandedRowItems(item).length > 0"
        class="py-3"
      >
        <AppDisplayFieldGroup :items="getExpandedRowItems(item)" />
      </div>
    </template>
    <template #actions="{ item }">
      <AppDialog
        v-if="getGroupByToolType(item.toolType)"
        color="background"
        :width="1000"
        :on-submit="submitToolItem(getGroupByToolType(item.toolType), item.toolSourceIndex)"
      >
        <template #activator="{ onOpen }">
          <AppIconButton
            icon="mdi-pencil"
            variant="text"
            @click="onOpen"
          />
        </template>
        <template #body="{ onSubmit, onCancel }">
          <ResourceAgentToolsForm
            :key="item.toolType"
            :item="item"
            :tool-type="item.toolType"
            :used-names="getAllUsedNames()"
            :not-found-resource="props.notFoundResource"
            :hidden-fields="props.hiddenFields"
            :on-submit="onSubmit"
            :on-discard="onCancel"
          />
        </template>
      </AppDialog>
      <AppIconButton
        icon="mdi-trash-can"
        variant="text"
        @click="() => {
          const group = getGroupByToolType(item.toolType);
          if (!group) return;
          removeGroupItem(group, item.toolSourceIndex);
        }"
      />
    </template>
    <template #bottom>
      <div class="d-flex justify-center">
        <AppDialog
          color="background"
          :width="1000"
          :on-submit="submitToolItem(selectedAddGroup)"
        >
          <template #activator="{ onOpen }">
            <AppIconButton
              :aria-label="$t('__actionAdd')"
              color="primary"
              icon="mdi-plus"
              @click="() => handleOpenToolPicker(onOpen)"
            />
          </template>
          <template #body="{ onSubmit, onCancel }">
            <template v-if="state.selectedToolType">
              <ResourceAgentToolsForm
                :key="state.selectedToolType"
                :tool-type="state.selectedToolType"
                :used-names="getAllUsedNames()"
                :not-found-resource="props.notFoundResource"
                :hidden-fields="props.hiddenFields"
                :on-submit="onSubmit"
                :on-discard="handleBackToPicker"
              />
            </template>
            <template v-else>
              <div class="d-flex flex-column ga-4 pa-6">
                <div class="d-flex align-center ga-3">
                  <v-icon
                    icon="mdi-toolbox"
                    color="primary"
                    size="small"
                  />
                  <div class="text-h6">
                    {{ $t('__titleModifyItem', { action: $t('__actionAdd'), item: $t('__titleTool') }) }}
                  </div>
                  <v-spacer />
                  <AppButtonToggle
                    v-model="state.viewMode"
                    :button-width="44"
                    :items="Object.values(ResourceConstant.ViewMode).map(mode => ({ ...mode, tooltip: $t(mode.tooltip) }))"
                  />
                  <AppIconButton
                    icon="mdi-close"
                    variant="text"
                    @click="onCancel"
                  />
                </div>
                <AppTextField
                  v-model="state.query"
                  :label="$t('__actionSearch')"
                  prepend-inner-icon="mdi-magnify"
                  hide-details
                  clearable
                />
                <template v-if="filteredToolGroups.length > 0">
                  <v-row v-if="state.viewMode === ResourceConstant.ViewMode.CARD.value">
                    <v-col
                      v-for="item in filteredToolGroups"
                      :key="item.key"
                      class="d-flex"
                      :cols="12"
                      :sm="6"
                      :md="4"
                    >
                      <v-card
                        :min-height="180"
                        class="d-flex flex-column h-100 w-100 tool-picker-card"
                        rounded="lg"
                        @click="() => handleAddTypeSelect(item.toolType)"
                      >
                        <v-card-item>
                          <template #prepend>
                            <template v-if="item.iconPath">
                              <AppImageIcon
                                :src="item.iconPath"
                                class="mr-0"
                                :mask-color="item.iconPathMaskColor || ''"
                                :width="24"
                                :height="24"
                              />
                            </template>
                            <template v-else>
                              <v-icon
                                :icon="item.icon"
                                color="primary"
                                :size="24"
                              />
                            </template>
                          </template>
                          <div class="font-weight-medium text-truncate-2 pr-8">
                            {{ item.title }}
                          </div>
                        </v-card-item>
                        <v-card-text class="pt-0">
                          <p class="text-truncate-3 mb-0">
                            {{ item.description || item.title }}
                          </p>
                        </v-card-text>
                      </v-card>
                    </v-col>
                  </v-row>
                  <v-list
                    v-else
                    border
                    class="py-0"
                    rounded="lg"
                  >
                    <template
                      v-for="(item, index) in filteredToolGroups"
                      :key="item.key"
                    >
                      <v-list-item
                        :subtitle="item.description || item.title"
                        class="py-3"
                        @click="() => handleAddTypeSelect(item.toolType)"
                      >
                        <template #title>
                          <div class="font-weight-medium">
                            {{ item.title }}
                          </div>
                        </template>
                        <template #prepend>
                          <AppImageIcon
                            v-if="item.iconPath"
                            :src="item.iconPath"
                            class="mr-4"
                            :mask-color="item.iconPathMaskColor || ''"
                            :width="24"
                            :height="24"
                          />
                          <v-icon
                            v-else
                            :icon="item.icon"
                            color="primary"
                            :size="24"
                          />
                        </template>
                        <template #append>
                          <v-icon icon="mdi-chevron-right" />
                        </template>
                      </v-list-item>
                      <v-divider v-if="index < filteredToolGroups.length - 1" />
                    </template>
                  </v-list>
                </template>
                <template v-else>
                  <AppInfoCard
                    :title="$t('__titleNoTool')"
                    icon="mdi-toolbox-outline"
                  />
                </template>
              </div>
            </template>
          </template>
        </AppDialog>
      </div>
    </template>
  </AppTable>
</template>

<style lang="scss" scoped>
:deep(.tool-picker-card .v-card-item) {
  height: 60px;
}
</style>
