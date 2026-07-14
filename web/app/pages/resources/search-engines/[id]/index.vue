<script setup>
import { ResourceConstant, SearchEngineConstant } from '~/constants';

/**
 * @import { Resource } from '~/models/server';
 */

const route = useRoute();
const server = useServer();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();

breadcrumbStore.setLoading(true);

const { data, pending, error } = await server.searchEngine.get({
  searchEngineId: route.params.id,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const handleDelete = async ({ searchEngineId }) => {
  const { error } = await server.searchEngine.destroy({ searchEngineId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.SEARCH_ENGINE.value), { replace: true });
};

/**
 * @param {Resource} resource
 */
const handleDuplicate = async (resource) => {
  const { data, error } = await server.searchEngine.duplicate({
    searchEngineId: route.params.id,
    newSearchEngineName: resource.name,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDuplicate');
  navigateTo(`${data.value.id}`);
};
</script>

<template>
  <template v-if="pending">
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
          { title: $t('__titleDependency', 2), value: 'dependencies' },
          { title: $t('__titleDependent', 2), value: 'dependents' },
        ]"
      >
        <template #general>
          <ResourceDetailsCard
            :item="data"
            :module="ResourceConstant.Type.SEARCH_ENGINE.module"
            :edit-path="`${resourceUtils.getUrl(ResourceConstant.Type.SEARCH_ENGINE.value, data.id)}/edit`"
            :item-label="$t('__fieldSearchEngine')"
            :allow-delete-recursively="ResourceConstant.Type.SEARCH_ENGINE.allowDeleteRecursively"
            :allow-validate="ResourceConstant.Type.SEARCH_ENGINE.allowValidate"
            :validate-button-tooltip="findField(SearchEngineConstant.Type, data.searchEngineType, 'i18nValidateAction') ? $t(findField(SearchEngineConstant.Type, data.searchEngineType, 'i18nValidateAction')) : null"
            :on-delete="handleDelete"
            :on-duplicate="handleDuplicate"
          />
        </template>
        <template #dependencies>
          <ResourceDependencyList
            :type="ResourceConstant.DependencyType.DEPENDENCY.value"
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.SEARCH_ENGINE.value"
          />
        </template>
        <template #dependents>
          <ResourceDependencyList
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.SEARCH_ENGINE.value"
          />
        </template>
      </AppTabs>
    </template>
    <template v-else>
      <template v-if="error">
        <ResourceErrorCard
          :label="$t('__fieldSearchEngine')"
          :status-code="error.data.status"
        />
      </template>
    </template>
  </template>
</template>
