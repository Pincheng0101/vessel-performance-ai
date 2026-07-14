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

const { data, pending, error } = await server.storage.get({
  storageId: route.params.id,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const handleDelete = async ({ storageId }) => {
  const { error } = await server.storage.destroy({ storageId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value), { replace: true });
};

/**
 * @param {Resource} resource
 */
const handleDuplicate = async (resource) => {
  const { data, error } = await server.storage.duplicate({
    storageId: route.params.id,
    newStorageName: resource.name,
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
          { title: $t('__titleGeneral'), to: resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value, data.id), active: true },
          { title: $t('__fieldFile', 2), to: `${resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value, data.id)}/files` },
          { title: $t('__titleDependency', 2), value: 'dependencies' },
          { title: $t('__titleDependent', 2), value: 'dependents' },
        ]"
      />
      <template v-if="route.query.tab === 'dependencies'">
        <ResourceDependencyList
          :type="ResourceConstant.DependencyType.DEPENDENCY.value"
          :resource-id="data.id"
          :resource-type="ResourceConstant.Type.STORAGE.value"
        />
      </template>
      <template v-else-if="route.query.tab === 'dependents'">
        <ResourceDependencyList
          :resource-id="data.id"
          :resource-type="ResourceConstant.Type.STORAGE.value"
        />
      </template>
      <template v-else>
        <ResourceDetailsCard
          :item="data"
          :module="ResourceConstant.Type.STORAGE.module"
          :edit-path="`${resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value, data.id)}/edit`"
          :item-label="$t('__fieldStorage')"
          :allow-delete-recursively="ResourceConstant.Type.STORAGE.allowDeleteRecursively"
          :allow-validate="ResourceConstant.Type.STORAGE.allowValidate"
          :on-delete="handleDelete"
          :on-duplicate="handleDuplicate"
        />
      </template>
    </template>
    <template v-else>
      <template v-if="error">
        <ResourceErrorCard
          :label="$t('__fieldStorage')"
          :status-code="error.data.status"
        />
      </template>
    </template>
  </template>
</template>
