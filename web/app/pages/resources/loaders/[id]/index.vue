<script setup>
import { ResourceConstant } from '~/constants';

/**
 * @import { Resource } from '~/models/server';
 */

const route = useRoute();
const server = useServer();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();

breadcrumbStore.setLoading(true);

const { resourceMap: knowledgeBaseResourceMap, restoreResources: restoreKnowledgeBaseResources } = useRestoredResource({ resourceType: ResourceConstant.Type.KNOWLEDGE_BASE.module, keyField: ResourceConstant.Type.KNOWLEDGE_BASE.id });
const { resourceMap: retrieverResourceMap, restoreResources: restoreRetrieverResources } = useRestoredResource({ resourceType: ResourceConstant.Type.RETRIEVER.module, keyField: ResourceConstant.Type.RETRIEVER.id });
const { resourceMap: connectorResourceMap, restoreResources: restoreConnectorResources } = useRestoredResource({ resourceType: ResourceConstant.Type.CONNECTOR.module, keyField: ResourceConstant.Type.CONNECTOR.id });
const { resourceMap: chunkerResourceMap, restoreResources: restoreChunkerResources } = useRestoredResource({ resourceType: ResourceConstant.Type.CHUNKER.module, keyField: ResourceConstant.Type.CHUNKER.id });
const { resourceMap: storageResourceMap, restoreResources: restoreStorageResources } = useRestoredResource({ resourceType: ResourceConstant.Type.STORAGE.module, keyField: ResourceConstant.Type.STORAGE.id });
const { resourceMap: llmResourceMap, restoreResources: restoreLlmResources } = useRestoredResource({ resourceType: ResourceConstant.Type.LLM.module, keyField: ResourceConstant.Type.LLM.id });

const state = reactive({
  isLoading: false,
});

const { data, pending, error } = await server.loader.get({
  loaderId: route.params.id,
}, {
  onResponse: async ({ _data }) => {
    state.isLoading = true;
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
    await Promise.all([
      restoreKnowledgeBaseResources([_data.knowledgeBaseId]),
      restoreRetrieverResources([..._data.retrieverIds]),
      restoreConnectorResources(_data.sources.map(source => source.connectorId)),
      restoreChunkerResources(_data.sources.map(source => source.chunkerId)),
      restoreStorageResources(_data.sources.map(source => source.storageId)),
      restoreLlmResources(_data.sources.map(source => source.llmId)),
    ]);
    state.isLoading = false;
  },
});

const displayedData = computed(() => {
  if (!data.value) return null;

  const instance = objUtils.cloneWithPrototype(data.value);

  if (instance.knowledgeBaseId && knowledgeBaseResourceMap.value[instance.knowledgeBaseId]) {
    instance.hydrateResourceMap(knowledgeBaseResourceMap.value[instance.knowledgeBaseId]);
  }

  if (instance.retrieverIds?.length) {
    instance.hydrateResourceMap(instance.retrieverIds.map(id => retrieverResourceMap.value[id] ?? { id }));
  }

  const { sources } = instance;
  if (sources?.length) {
    sources.forEach((source) => {
      if (!source) return;
      const { connectorId, chunkerId, storageId, llmId } = source;
      if (connectorId && connectorResourceMap.value[connectorId]) {
        instance.hydrateResourceMap(connectorResourceMap.value[connectorId]);
      }
      if (chunkerId && chunkerResourceMap.value[chunkerId]) {
        instance.hydrateResourceMap(chunkerResourceMap.value[chunkerId]);
      }
      if (storageId && storageResourceMap.value[storageId]) {
        instance.hydrateResourceMap(storageResourceMap.value[storageId]);
      }
      if (llmId && llmResourceMap.value[llmId]) {
        instance.hydrateResourceMap(llmResourceMap.value[llmId]);
      }
    });
  }

  return instance;
});

const handleDelete = async ({ loaderId }) => {
  const { error } = await server.loader.destroy({ loaderId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.LOADER.value), { replace: true });
};

/**
 * @param {Resource} resource
 */
const handleDuplicate = async (resource) => {
  const { data, error } = await server.loader.duplicate({
    loaderId: route.params.id,
    knowledgeBaseId: resource.knowledgeBaseId,
    newLoaderName: resource.name,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDuplicate');
  navigateTo(`${data.value.id}`);
};
</script>

<template>
  <template v-if="pending || state.isLoading">
    <AppDetailPageLoader />
  </template>
  <template v-else>
    <template v-if="data">
      <ResourceInfoTitle :title="data.name">
        <template #prepend>
          <AppAddToFavoritesButton
            :item="data"
            :type="data.resourceType"
            persistent
          />
        </template>
      </ResourceInfoTitle>
      <AppTabs
        :items="[
          { title: $t('__titleGeneral'), value: 'general' },
          { title: $t('__fieldSyncJob', 2), value: 'sync-jobs' },
          { title: $t('__titleDependency', 2), value: 'dependencies' },
          { title: $t('__titleDependent', 2), value: 'dependents' },
        ]"
      >
        <template #general>
          <ResourceDetailsCard
            :item="displayedData"
            :module="ResourceConstant.Type.LOADER.module"
            :edit-path="`${resourceUtils.getUrl(ResourceConstant.Type.LOADER.value, data.id)}/edit`"
            :item-label="$t('__fieldLoader')"
            :allow-delete-recursively="ResourceConstant.Type.LOADER.allowDeleteRecursively"
            :allow-validate="ResourceConstant.Type.LOADER.allowValidate"
            :on-delete="handleDelete"
            :on-duplicate="handleDuplicate"
          >
            <template #append-display-fields>
              <AppDisplayFieldGroup :items="displayedData.sourcesDisplayFields" />
            </template>
          </ResourceDetailsCard>
        </template>
        <template #sync-jobs>
          <ResourceSyncJobList />
        </template>
        <template #dependencies>
          <ResourceDependencyList
            :type="ResourceConstant.DependencyType.DEPENDENCY.value"
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.LOADER.value"
          />
        </template>
        <template #dependents>
          <ResourceDependencyList
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.LOADER.value"
          />
        </template>
      </AppTabs>
    </template>
    <template v-else>
      <template v-if="error">
        <ResourceErrorCard
          :label="$t('__fieldLoader')"
          :status-code="error.data.status"
        />
      </template>
    </template>
  </template>
</template>
