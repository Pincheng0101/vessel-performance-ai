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

const { data, pending, error } = await server.ranker.get({
  rankerId: route.params.id,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const handleDelete = async ({ rankerId }) => {
  const { error } = await server.ranker.destroy({ rankerId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.RANKER.value), { replace: true });
};

/**
 * @param {Resource} resource
 */
const handleDuplicate = async (resource) => {
  const { data, error } = await server.ranker.duplicate({
    rankerId: route.params.id,
    newRankerName: resource.name,
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
            :module="ResourceConstant.Type.RANKER.module"
            :edit-path="`${resourceUtils.getUrl(ResourceConstant.Type.RANKER.value, data.id)}/edit`"
            :item-label="$t('__fieldRanker')"
            :allow-delete-recursively="ResourceConstant.Type.RANKER.allowDeleteRecursively"
            :allow-validate="ResourceConstant.Type.RANKER.allowValidate"
            :on-delete="handleDelete"
            :on-duplicate="handleDuplicate"
          />
        </template>
        <template #dependencies>
          <ResourceDependencyList
            :type="ResourceConstant.DependencyType.DEPENDENCY.value"
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.RANKER.value"
          />
        </template>
        <template #dependents>
          <ResourceDependencyList
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.RANKER.value"
          />
        </template>
      </AppTabs>
    </template>
    <template v-else>
      <template v-if="error">
        <ResourceErrorCard
          :label="$t('__fieldRanker')"
          :status-code="error.data.status"
        />
      </template>
    </template>
  </template>
</template>
