<script setup>
import { ResourceConstant } from '~/constants';

/**
 * @import { Resource } from '~/models/server';
 */

const route = useRoute();
const { t } = useI18n();
const server = useServer();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();

breadcrumbStore.setLoading(true);

const { resourceMap: loaderResourceMap, restoreResources: restoreLoaderResources } = useRestoredResource({ resourceType: ResourceConstant.Type.LOADER.module, keyField: ResourceConstant.Type.LOADER.id });

const state = reactive({
  isLoading: false,
});

const { data, pending, error } = await server.knowledgeBase.get({
  knowledgeBaseId: route.params.id,
}, {
  onResponse: async ({ _data }) => {
    state.isLoading = true;
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
    await restoreLoaderResources([_data.loaderId]);
    state.isLoading = false;
  },
});

const displayedData = computed(() => {
  if (!data.value) return null;

  const instance = objUtils.cloneWithPrototype(data.value);

  if (instance.loaderId && loaderResourceMap.value[instance.loaderId]) {
    instance.hydrateResourceMap(loaderResourceMap.value[instance.loaderId]);
  }

  return instance;
});

const handleDelete = async ({ knowledgeBaseId }) => {
  const { error } = await server.knowledgeBase.destroy({ knowledgeBaseId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.KNOWLEDGE_BASE.value), { replace: true });
};

/**
 * @param {Resource} resource
 */
const handleDuplicate = async (resource) => {
  const { data, error } = await server.knowledgeBase.duplicate({
    knowledgeBaseId: route.params.id,
    newKnowledgeBaseName: resource.name,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDuplicate');
  navigateTo(`${data.value.id}`);
};

const tabItems = computed(() => [
  { title: t('__titleGeneral'), value: 'general' },
  { title: t('__titleDependency', 2), value: 'dependencies' },
  { title: t('__titleDependent', 2), value: 'dependents' },
]);
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
      <AppTabs :items="tabItems">
        <template #general>
          <ResourceDetailsCard
            :item="displayedData"
            :module="ResourceConstant.Type.KNOWLEDGE_BASE.module"
            :edit-path="`${resourceUtils.getUrl(ResourceConstant.Type.KNOWLEDGE_BASE.value, data.id)}/edit`"
            :item-label="$t('__fieldKnowledgeBase')"
            :allow-delete-recursively="ResourceConstant.Type.KNOWLEDGE_BASE.allowDeleteRecursively"
            :allow-validate="ResourceConstant.Type.KNOWLEDGE_BASE.allowValidate"
            :on-delete="handleDelete"
            :on-duplicate="handleDuplicate"
          />
        </template>
        <template #dependencies>
          <ResourceDependencyList
            :type="ResourceConstant.DependencyType.DEPENDENCY.value"
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.KNOWLEDGE_BASE.value"
          />
        </template>
        <template #dependents>
          <ResourceDependencyList
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.KNOWLEDGE_BASE.value"
          />
        </template>
      </AppTabs>
    </template>
    <template v-else>
      <template v-if="error">
        <ResourceErrorCard
          :label="$t('__fieldKnowledgeBase')"
          :status-code="error.data.status"
        />
      </template>
    </template>
  </template>
</template>
