<script setup>
import { StateConstant, WorkflowConstant } from '~/constants';

const props = defineProps({
  onDragStart: {
    type: Function,
    default: () => {},
  },
});

const { t } = useI18n();

const state = reactive({
  expandMenu: true,
  tab: 'actions',
  keyword: '',
});

const items = computed(() => ({
  actions: {
    [WorkflowConstant.StateMenuCategory.GENERATIVE_AI.value]: [
      {
        type: StateConstant.ActionType.AGENT.value,
        label: t(StateConstant.ActionType.AGENT.i18nTitle),
        icon: StateConstant.ActionType.AGENT.icon,
        iconColor: StateConstant.ActionType.AGENT.iconColor,
        tooltip: t(StateConstant.ActionType.AGENT.tooltip),
        category: WorkflowConstant.StateMenuCategory.GENERATIVE_AI.value,
      },
      {
        type: StateConstant.ActionType.LLM.value,
        label: t(StateConstant.ActionType.LLM.i18nTitle),
        icon: StateConstant.ActionType.LLM.icon,
        iconColor: StateConstant.ActionType.LLM.iconColor,
        tooltip: t(StateConstant.ActionType.LLM.tooltip),
        category: WorkflowConstant.StateMenuCategory.GENERATIVE_AI.value,
      },
      {
        type: StateConstant.ActionType.STRUCTURED_LLM.value,
        label: t(StateConstant.ActionType.STRUCTURED_LLM.i18nTitle),
        icon: StateConstant.ActionType.STRUCTURED_LLM.icon,
        iconColor: StateConstant.ActionType.STRUCTURED_LLM.iconColor,
        tooltip: t(StateConstant.ActionType.STRUCTURED_LLM.tooltip),
        category: WorkflowConstant.StateMenuCategory.GENERATIVE_AI.value,
      },
    ],
    [WorkflowConstant.StateMenuCategory.CLOUD_COMPUTING.value]: [
      {
        type: StateConstant.ActionType.LAMBDA.value,
        label: t(StateConstant.ActionType.LAMBDA.i18nTitle),
        icon: StateConstant.ActionType.LAMBDA.icon,
        iconColor: StateConstant.ActionType.LAMBDA.iconColor,
        tooltip: t(StateConstant.ActionType.LAMBDA.tooltip),
        category: WorkflowConstant.StateMenuCategory.CLOUD_COMPUTING.value,
      },
    ],
    [WorkflowConstant.StateMenuCategory.NETWORKING_AND_API.value]: [
      {
        type: StateConstant.ActionType.HTTPS_API.value,
        label: t(StateConstant.ActionType.HTTPS_API.i18nTitle),
        icon: StateConstant.ActionType.HTTPS_API.icon,
        iconColor: StateConstant.ActionType.HTTPS_API.iconColor,
        tooltip: t(StateConstant.ActionType.HTTPS_API.tooltip),
        category: WorkflowConstant.StateMenuCategory.NETWORKING_AND_API.value,
      },
      {
        type: StateConstant.ActionType.MCP.value,
        label: t(StateConstant.ActionType.MCP.i18nTitle),
        iconPath: StateConstant.ActionType.MCP.iconPath,
        iconColor: StateConstant.ActionType.MCP.iconColor,
        iconPathMaskColor: StateConstant.ActionType.MCP.iconPathMaskColor,
        tooltip: t(StateConstant.ActionType.MCP.tooltip),
        category: WorkflowConstant.StateMenuCategory.NETWORKING_AND_API.value,
      },
    ],
    [WorkflowConstant.StateMenuCategory.WEB_INTERACTION.value]: [
      {
        type: StateConstant.ActionType.SEARCH_ENGINE.value,
        label: t(StateConstant.ActionType.SEARCH_ENGINE.i18nTitle),
        icon: StateConstant.ActionType.SEARCH_ENGINE.icon,
        iconColor: StateConstant.ActionType.SEARCH_ENGINE.iconColor,
        tooltip: t(StateConstant.ActionType.SEARCH_ENGINE.tooltip),
        category: WorkflowConstant.StateMenuCategory.WEB_INTERACTION.value,
      },
      {
        type: StateConstant.ActionType.READ_URL.value,
        label: t(StateConstant.ActionType.READ_URL.i18nTitle),
        icon: StateConstant.ActionType.READ_URL.icon,
        iconColor: StateConstant.ActionType.READ_URL.iconColor,
        tooltip: t(StateConstant.ActionType.READ_URL.tooltip),
        category: WorkflowConstant.StateMenuCategory.WEB_INTERACTION.value,
      },
    ],
    [WorkflowConstant.StateMenuCategory.DATABASE.value]: [
      {
        type: StateConstant.ActionType.ATHENA.value,
        label: t(StateConstant.ActionType.ATHENA.i18nTitle),
        iconPath: StateConstant.ActionType.ATHENA.iconPath,
        iconColor: StateConstant.ActionType.ATHENA.iconColor,
        iconPathMaskColor: StateConstant.ActionType.ATHENA.iconPathMaskColor,
        tooltip: t(StateConstant.ActionType.ATHENA.tooltip),
        category: WorkflowConstant.StateMenuCategory.DATABASE.value,
      },
      {
        type: StateConstant.ActionType.MYSQL.value,
        label: t(StateConstant.ActionType.MYSQL.i18nTitle),
        iconPath: StateConstant.ActionType.MYSQL.iconPath,
        iconColor: StateConstant.ActionType.MYSQL.iconColor,
        iconPathMaskColor: StateConstant.ActionType.MYSQL.iconPathMaskColor,
        tooltip: t(StateConstant.ActionType.MYSQL.tooltip),
        category: WorkflowConstant.StateMenuCategory.DATABASE.value,
      },
      {
        type: StateConstant.ActionType.OPENSEARCH.value,
        label: t(StateConstant.ActionType.OPENSEARCH.i18nTitle),
        iconPath: StateConstant.ActionType.OPENSEARCH.iconPath,
        iconColor: StateConstant.ActionType.OPENSEARCH.iconColor,
        iconPathMaskColor: StateConstant.ActionType.OPENSEARCH.iconPathMaskColor,
        tooltip: t(StateConstant.ActionType.OPENSEARCH.tooltip),
        category: WorkflowConstant.StateMenuCategory.DATABASE.value,
      },
    ],
    [WorkflowConstant.StateMenuCategory.RETRIEVE_AND_RANK.value]: [
      {
        type: StateConstant.ActionType.RETRIEVAL.value,
        label: t(StateConstant.ActionType.RETRIEVAL.i18nTitle),
        icon: StateConstant.ActionType.RETRIEVAL.icon,
        iconColor: StateConstant.ActionType.RETRIEVAL.iconColor,
        tooltip: t(StateConstant.ActionType.RETRIEVAL.tooltip),
        category: WorkflowConstant.StateMenuCategory.RETRIEVE_AND_RANK.value,
      },
      {
        type: StateConstant.ActionType.RETRIEVER.value,
        label: t(StateConstant.ActionType.RETRIEVER.i18nTitle),
        icon: StateConstant.ActionType.RETRIEVER.icon,
        iconColor: StateConstant.ActionType.RETRIEVER.iconColor,
        tooltip: t(StateConstant.ActionType.RETRIEVER.tooltip),
        category: WorkflowConstant.StateMenuCategory.RETRIEVE_AND_RANK.value,
      },
      {
        type: StateConstant.ActionType.RANKER.value,
        label: t(StateConstant.ActionType.RANKER.i18nTitle),
        icon: StateConstant.ActionType.RANKER.icon,
        iconColor: StateConstant.ActionType.RANKER.iconColor,
        tooltip: t(StateConstant.ActionType.RANKER.tooltip),
        category: WorkflowConstant.StateMenuCategory.RETRIEVE_AND_RANK.value,
      },
    ],
    [WorkflowConstant.StateMenuCategory.WORKFLOW_EXECUTION.value]: [
      {
        type: StateConstant.ActionType.START_SYNC_WORKFLOW_EXECUTION.value,
        label: t(StateConstant.ActionType.START_SYNC_WORKFLOW_EXECUTION.i18nTitle),
        icon: StateConstant.ActionType.START_SYNC_WORKFLOW_EXECUTION.icon,
        iconColor: StateConstant.ActionType.START_SYNC_WORKFLOW_EXECUTION.iconColor,
        tooltip: t(StateConstant.ActionType.START_SYNC_WORKFLOW_EXECUTION.tooltip),
        category: WorkflowConstant.StateMenuCategory.CLOUD_COMPUTING.value,
      },
      {
        type: StateConstant.ActionType.START_WORKFLOW_EXECUTION.value,
        label: t(StateConstant.ActionType.START_WORKFLOW_EXECUTION.i18nTitle),
        icon: StateConstant.ActionType.START_WORKFLOW_EXECUTION.icon,
        iconColor: StateConstant.ActionType.START_WORKFLOW_EXECUTION.iconColor,
        tooltip: t(StateConstant.ActionType.START_WORKFLOW_EXECUTION.tooltip),
        category: WorkflowConstant.StateMenuCategory.CLOUD_COMPUTING.value,
      },
      {
        type: StateConstant.ActionType.DESCRIBE_WORKFLOW_EXECUTION.value,
        label: t(StateConstant.ActionType.DESCRIBE_WORKFLOW_EXECUTION.i18nTitle),
        icon: StateConstant.ActionType.DESCRIBE_WORKFLOW_EXECUTION.icon,
        iconColor: StateConstant.ActionType.DESCRIBE_WORKFLOW_EXECUTION.iconColor,
        tooltip: t(StateConstant.ActionType.DESCRIBE_WORKFLOW_EXECUTION.tooltip),
        category: WorkflowConstant.StateMenuCategory.CLOUD_COMPUTING.value,
      },
    ],
    [WorkflowConstant.StateMenuCategory.TEXT_AND_DATA_OPERATIONS.value]: [
      {
        type: StateConstant.ActionType.CODE.value,
        label: t(StateConstant.ActionType.CODE.i18nTitle),
        icon: StateConstant.ActionType.CODE.icon,
        iconColor: StateConstant.ActionType.CODE.iconColor,
        tooltip: t(StateConstant.ActionType.CODE.tooltip),
        category: WorkflowConstant.StateMenuCategory.TEXT_AND_DATA_OPERATIONS.value,
      },
      {
        type: StateConstant.ActionType.TEXT.value,
        label: t(StateConstant.ActionType.TEXT.i18nTitle),
        icon: StateConstant.ActionType.TEXT.icon,
        iconColor: StateConstant.ActionType.TEXT.iconColor,
        tooltip: t(StateConstant.ActionType.TEXT.tooltip),
        category: WorkflowConstant.StateMenuCategory.TEXT_AND_DATA_OPERATIONS.value,
      },
      {
        type: StateConstant.ActionType.TRANSFORMATION.value,
        label: t(StateConstant.ActionType.TRANSFORMATION.i18nTitle),
        icon: StateConstant.ActionType.TRANSFORMATION.icon,
        iconColor: StateConstant.ActionType.TRANSFORMATION.iconColor,
        tooltip: t(StateConstant.ActionType.TRANSFORMATION.tooltip),
        category: WorkflowConstant.StateMenuCategory.TEXT_AND_DATA_OPERATIONS.value,
        deprecated: StateConstant.ActionType.TRANSFORMATION.deprecated,
      },
      {
        type: StateConstant.ActionType.PASS.value,
        label: t(StateConstant.ActionType.PASS.i18nTitle),
        icon: StateConstant.ActionType.PASS.icon,
        iconColor: StateConstant.ActionType.PASS.iconColor,
        tooltip: t(StateConstant.ActionType.PASS.tooltip),
        category: WorkflowConstant.StateMenuCategory.TEXT_AND_DATA_OPERATIONS.value,
      },
    ],
  },
  flow: [
    {
      type: StateConstant.Type.CHOICE.value,
      label: t(StateConstant.Type.CHOICE.i18nTitle),
      icon: StateConstant.Type.CHOICE.icon,
      iconColor: StateConstant.Type.CHOICE.iconColor,
      tooltip: t(StateConstant.Type.CHOICE.tooltip),
      category: '',
    },
    {
      type: StateConstant.Type.MAP.value,
      label: t(StateConstant.Type.MAP.i18nTitle),
      icon: StateConstant.Type.MAP.icon,
      iconColor: StateConstant.Type.MAP.iconColor,
      tooltip: t(StateConstant.Type.MAP.tooltip),
      category: '',
    },
    {
      type: StateConstant.Type.PARALLEL.value,
      label: t(StateConstant.Type.PARALLEL.i18nTitle),
      icon: StateConstant.Type.PARALLEL.icon,
      iconColor: StateConstant.Type.PARALLEL.iconColor,
      tooltip: t(StateConstant.Type.PARALLEL.tooltip),
      category: '',
    },
    {
      type: StateConstant.Type.PASS.value,
      label: t(StateConstant.Type.PASS.i18nTitle),
      icon: StateConstant.Type.PASS.icon,
      iconColor: StateConstant.Type.PASS.iconColor,
      tooltip: t(StateConstant.Type.PASS.tooltip),
      category: '',
    },
    {
      type: StateConstant.Type.WAIT.value,
      label: t(StateConstant.Type.WAIT.i18nTitle),
      icon: StateConstant.Type.WAIT.icon,
      iconColor: StateConstant.Type.WAIT.iconColor,
      tooltip: t(StateConstant.Type.WAIT.tooltip),
      category: '',
    },
    {
      type: StateConstant.Type.SUCCEED.value,
      label: t(StateConstant.Type.SUCCEED.i18nTitle),
      icon: StateConstant.Type.SUCCEED.icon,
      iconColor: StateConstant.Type.SUCCEED.iconColor,
      tooltip: t(StateConstant.Type.SUCCEED.tooltip),
      category: '',
    },
    {
      type: StateConstant.Type.FAIL.value,
      label: t(StateConstant.Type.FAIL.i18nTitle),
      icon: StateConstant.Type.FAIL.icon,
      iconColor: StateConstant.Type.FAIL.iconColor,
      tooltip: t(StateConstant.Type.FAIL.tooltip),
      category: '',
    },
  ],
}));

const flattenedItems = computed(() => [...Object.values(items.value.actions).flatMap(action => action), ...items.value.flow]);

const filteredItems = computed(() => {
  const searchTerm = state.keyword.toLowerCase();
  return flattenedItems.value.filter(item => ['label', 'category', 'type'].some(key => item[key].toLowerCase().includes(searchTerm)),
  );
});
</script>

<template>
  <v-card class="menu-wrapper">
    <v-expansion-panels
      v-model="state.expandMenu"
      flat
    >
      <v-expansion-panel
        :height="60"
        class="pa-0 font-weight-medium"
      >
        <v-expansion-panel-title class="d-flex align-center py-0 px-3 ga-2 font-weight-bold">
          <v-icon
            icon="mdi-plus"
            size="small"
          />
          {{ $t('__actionAddState') }}
        </v-expansion-panel-title>
        <v-divider v-if="state.expandMenu !== undefined" />
        <v-expansion-panel-text>
          <div class="pa-3">
            <AppTextField
              v-model="state.keyword"
              prepend-inner-icon="mdi-magnify"
              bg-color="backgroundScale1"
              :placeholder="t('__actionSearch')"
              clearable
            />
          </div>
          <template v-if="state.keyword">
            <v-sheet
              color="transparent"
              class="search-window-wrapper overflow-auto pa-3"
            >
              <div class="text-body-2 mb-2">
                {{ strUtils.addSpacesAroundAscii($t('__titleMatchingFound', { count: filteredItems.length }), filteredItems.length) }}
              </div>
              <div class="d-flex flex-column ga-2">
                <WorkflowStateMenuItem
                  v-for="item in filteredItems"
                  :key="item.type"
                  :item="item"
                  :on-drag-start="($event) => props.onDragStart($event, item.type)"
                />
              </div>
            </v-sheet>
          </template>
          <template v-else>
            <AppTabs
              :append-query="false"
              :height="40"
              :items="[
                { title: $t('__titleAction', 2), value: 'actions' },
                { title: $t('__titleFlow', 2), value: 'flows' },
              ]"
              divider-class="mb-0"
              show-divider
              grow
            >
              <template #actions>
                <v-sheet
                  color="transparent"
                  class="tab-window-wrapper overflow-auto"
                >
                  <v-expansion-panels
                    :rounded="false"
                    multiple
                    variant="accordion"
                  >
                    <v-expansion-panel
                      v-for="(subCategory, key) in items.actions"
                      :key="key"
                      :value="key"
                      class="font-weight-regular"
                    >
                      <v-expansion-panel-title
                        min-height="40"
                        class="px-3"
                      >
                        <v-icon
                          size="x-small"
                          class="mr-2"
                          color="categoryIcon"
                        >
                          {{ findField(WorkflowConstant.StateMenuCategory, key, 'icon') }}
                        </v-icon>
                        {{ $t(findField(WorkflowConstant.StateMenuCategory, key, 'i18nTitle')) }}
                      </v-expansion-panel-title>
                      <v-expansion-panel-text>
                        <v-sheet
                          color="transparent"
                          class="pa-3"
                        >
                          <div class="d-flex flex-column ga-2">
                            <WorkflowStateMenuItem
                              v-for="action in subCategory"
                              :key="action.type"
                              :item="action"
                              :on-drag-start="($event) => props.onDragStart($event, action.type)"
                            />
                          </div>
                        </v-sheet>
                      </v-expansion-panel-text>
                    </v-expansion-panel>
                  </v-expansion-panels>
                </v-sheet>
              </template>
              <template #flows>
                <v-sheet
                  color="transparent"
                  class="tab-window-wrapper overflow-auto pa-3"
                >
                  <div class="d-flex flex-column ga-2">
                    <WorkflowStateMenuItem
                      v-for="flow in items.flow"
                      :key="flow.type"
                      :item="flow"
                      :on-drag-start="($event) => props.onDragStart($event, flow.type)"
                    />
                  </div>
                </v-sheet>
              </template>
            </AppTabs>
          </template>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </v-card>
</template>

<style lang="scss" scoped>
:deep(.v-input__details) {
  display: none;
}
.menu-wrapper {
  position: absolute;
  top: calc(60px + 20px); // header + offset
  left: 32px;
  z-index: 1;
}
.tab-window-wrapper {
  // Workflow edit page floating component: 100dvh - app header - top offset - header - search - tabs - divider - bottom offset
  height: calc(100dvh - 60px - 20px - 60px - 64px - 40px - 1px - 60px);
}
.search-window-wrapper {
  // Workflow edit page floating component: 100dvh - app header - top offset - header - search - bottom offset
  height: calc(100dvh - 60px - 20px - 60px - 64px - 60px);
}
.v-expansion-panels {
  width: 240px;
  :deep(.v-expansion-panel-text__wrapper) {
    padding: 0px !important;
  }
  :deep(.v-tab__slider) {
    height: 2px;
  }
}
</style>
