<script setup>
import { IconConstant, ResourceConstant } from '~/constants';

const VIEW_MODE_STORAGE_KEY = 'resources-view-mode';

const { t } = useI18n();

const query = ref('');
const viewMode = ref(localStorage.getItem(VIEW_MODE_STORAGE_KEY) || ResourceConstant.ViewMode.CARD.value);

watch(viewMode, (value) => {
  localStorage.setItem(VIEW_MODE_STORAGE_KEY, value);
});

const resources = computed(() => [
  {
    title: t('__fieldChunker', 2),
    path: resourceUtils.getUrl(ResourceConstant.Type.CHUNKER.value),
    icon: ResourceConstant.Type.CHUNKER.icon,
    description: t('__instructionResourceChunker'),
    module: ResourceConstant.Type.CHUNKER.module,
  },
  {
    title: t('__fieldConnector', 2),
    path: resourceUtils.getUrl(ResourceConstant.Type.CONNECTOR.value),
    icon: ResourceConstant.Type.CONNECTOR.icon,
    description: t('__instructionResourceConnector'),
    module: ResourceConstant.Type.CONNECTOR.module,
  },
  {
    title: t('__fieldDataset', 2),
    path: resourceUtils.getUrl(ResourceConstant.Type.DATASET.value),
    icon: ResourceConstant.Type.DATASET.icon,
    description: t('__instructionResourceDataset'),
    module: ResourceConstant.Type.DATASET.module,
  },
  {
    title: t('__fieldEmbeddingModel', 2),
    path: resourceUtils.getUrl(ResourceConstant.Type.EMBEDDING_MODEL.value),
    icon: ResourceConstant.Type.EMBEDDING_MODEL.icon,
    description: t('__instructionResourceEmbeddingModel'),
    module: ResourceConstant.Type.EMBEDDING_MODEL.module,
  },
  {
    title: t('__fieldKnowledgeBase', 2),
    path: resourceUtils.getUrl(ResourceConstant.Type.KNOWLEDGE_BASE.value),
    icon: ResourceConstant.Type.KNOWLEDGE_BASE.icon,
    description: t('__instructionResourceKnowledgeBase'),
    module: ResourceConstant.Type.KNOWLEDGE_BASE.module,
  },
  {
    title: t('__fieldLambdaFunction', 2),
    path: resourceUtils.getUrl(ResourceConstant.Type.LAMBDA_FUNCTION.value),
    icon: ResourceConstant.Type.LAMBDA_FUNCTION.icon,
    description: t('__instructionResourceLambdaFunction'),
    module: ResourceConstant.Type.LAMBDA_FUNCTION.module,
  },
  {
    title: t('__fieldLlm', 2),
    path: resourceUtils.getUrl(ResourceConstant.Type.LLM.value),
    icon: ResourceConstant.Type.LLM.icon,
    description: t('__instructionResourceLlm'),
    module: ResourceConstant.Type.LLM.module,
  },
  {
    title: t('__fieldLoader', 2),
    path: resourceUtils.getUrl(ResourceConstant.Type.LOADER.value),
    icon: ResourceConstant.Type.LOADER.icon,
    description: t('__instructionResourceLoader'),
    module: ResourceConstant.Type.LOADER.module,
  },
  {
    title: t('__fieldMcpServer', 2),
    path: resourceUtils.getUrl(ResourceConstant.Type.MCP_SERVER.value),
    iconPath: ResourceConstant.Type.MCP_SERVER.iconPath,
    description: t('__instructionResourceMcpServer'),
    module: ResourceConstant.Type.MCP_SERVER.module,
  },
  {
    title: t('__fieldRanker', 2),
    path: resourceUtils.getUrl(ResourceConstant.Type.RANKER.value),
    icon: ResourceConstant.Type.RANKER.icon,
    description: t('__instructionResourceRanker'),
    module: ResourceConstant.Type.RANKER.module,
  },
  {
    title: t('__fieldRetriever', 2),
    path: resourceUtils.getUrl(ResourceConstant.Type.RETRIEVER.value),
    icon: ResourceConstant.Type.RETRIEVER.icon,
    description: t('__instructionResourceRetriever'),
    module: ResourceConstant.Type.RETRIEVER.module,
  },
  {
    title: t('__fieldSearchEngine', 2),
    path: resourceUtils.getUrl(ResourceConstant.Type.SEARCH_ENGINE.value),
    icon: ResourceConstant.Type.SEARCH_ENGINE.icon,
    description: t('__instructionResourceSearchEngine'),
    module: ResourceConstant.Type.SEARCH_ENGINE.module,
  },
  {
    title: t('__fieldSkill', 2),
    path: resourceUtils.getUrl(ResourceConstant.Type.SKILL.value),
    icon: ResourceConstant.Type.SKILL.icon,
    description: t('__instructionResourceSkill'),
    module: ResourceConstant.Type.SKILL.module,
  },
  {
    title: t('__fieldStorage', 2),
    path: resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value),
    icon: ResourceConstant.Type.STORAGE.icon,
    description: t('__instructionResourceStorage'),
    module: ResourceConstant.Type.STORAGE.module,
  },
  {
    title: t('__fieldTemplate', 2),
    path: resourceUtils.getUrl(ResourceConstant.Type.TEMPLATE.value),
    icon: ResourceConstant.Type.TEMPLATE.icon,
    description: t('__instructionResourceTemplate'),
    module: ResourceConstant.Type.TEMPLATE.module,
  },
  {
    title: t('__fieldVariable', 2),
    path: resourceUtils.getUrl(ResourceConstant.Type.VARIABLE.value),
    icon: ResourceConstant.Type.VARIABLE.icon,
    description: t('__instructionResourceVariable'),
    module: ResourceConstant.Type.VARIABLE.module,
  },
]);

const filteredResources = computed(() => {
  const q = String(query.value || '').toLowerCase();
  return resources.value.filter(r => r.title.toLowerCase().includes(q) || r.module.toLowerCase().includes(q));
});
</script>

<template>
  <div class="d-flex flex-column ga-4">
    <div class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon
          :icon="IconConstant.Base.RESOURCE"
          class="mr-2"
          color="primary"
          size="small"
        />
        <span class="text-h6">
          {{ $t('__titleResource', 2) }}
        </span>
      </div>
      <AppButtonToggle
        v-model="viewMode"
        :button-width="44"
        :items="Object.values(ResourceConstant.ViewMode).map(mode => ({ ...mode, tooltip: $t(mode.tooltip) }))"
      />
    </div>
    <AppTextField
      v-model="query"
      :label="$t('__actionSearch')"
      prepend-inner-icon="mdi-magnify"
      hide-details
      clearable
    />
    <template v-if="viewMode === ResourceConstant.ViewMode.CARD.value">
      <v-row>
        <v-col
          v-for="resource in filteredResources"
          :key="resource.title"
          :cols="12"
          :sm="6"
          :md="4"
        >
          <v-card
            :min-height="180"
            :prepend-icon="resource.icon"
            :title="resource.title"
            :to="resource.path"
            height="100%"
            class="d-flex flex-column"
          >
            <template #prepend>
              <template v-if="resource.icon">
                <v-icon color="primary">
                  {{ resource.icon }}
                </v-icon>
              </template>
              <template v-else-if="resource.iconPath">
                <AppImageIcon
                  :src="resource.iconPath"
                  class="mr-0"
                  mask-color="primary"
                />
              </template>
            </template>
            <v-card-text>
              {{ resource.description }}
            </v-card-text>
            <v-card-actions class="pa-4">
              <ResourceTypeIcons :module="resource.module" />
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
    </template>
    <template v-if="viewMode === ResourceConstant.ViewMode.LIST.value">
      <div class="resource-list-table">
        <AppTable
          :headers="[
            {
              title: $t('__fieldName'),
              key: 'title',
              icon: item => item.icon,
              iconColor: 'primary',
              iconPath: item => item.iconPath,
              iconPathMaskColor: 'primary',
              link: item => ({ href: item.path }),
            },
            { title: $t('__fieldDescription'), key: 'description' },
            { title: $t('__fieldSupportedType', 2), key: 'module' },
          ]"
          :items="filteredResources"
          :server-side="false"
          :show-pagination="false"
          :enable-search="false"
        >
          <template #item.module="{ item }">
            <ResourceTypeIcons
              :module="item.module"
              :max-icons="20"
              wrap
            />
          </template>
        </AppTable>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
:deep(.v-card-item) {
  height: 60px;
}
:deep(.v-card-title) {
  background: transparent !important;
  font-size: 20px !important;
}
.resource-list-table {
  :deep(table) {
    table-layout: fixed;
  }
  :deep(th:nth-child(1)),
  :deep(td:nth-child(1)) {
    width: 20%;
  }
  :deep(th:nth-child(2)),
  :deep(td:nth-child(2)) {
    width: 48%;
  }
}
</style>
