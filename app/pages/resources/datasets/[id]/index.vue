<script setup>
import { ResourceConstant } from '~/constants';

/**
 * @import { Resource } from '~/models/server';
 */

const route = useRoute();
const server = useServer();
const { openInNewTab } = useNavigation();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();
const { createSignal } = useAbortController();

breadcrumbStore.setLoading(true);

const signal = createSignal();

const { data, pending, error } = await server.dataset.get({
  datasetId: route.params.id,
}, {
  signal,
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const handleDelete = async ({ datasetId }) => {
  const { error } = await server.dataset.destroy({ datasetId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.DATASET.value), { replace: true });
};

/**
 * @param {Resource} resource
 */
const handleDuplicate = async (resource) => {
  const { data, error } = await server.dataset.duplicate({
    datasetId: route.params.id,
    newDatasetName: resource.name,
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
            :module="ResourceConstant.Type.DATASET.module"
            :edit-path="`${resourceUtils.getUrl(ResourceConstant.Type.DATASET.value, data.id)}/edit`"
            :item-label="$t('__fieldDataset')"
            :allow-delete-recursively="ResourceConstant.Type.DATASET.allowDeleteRecursively"
            :allow-validate="ResourceConstant.Type.DATASET.allowValidate"
            :on-delete="handleDelete"
            :on-duplicate="handleDuplicate"
          >
            <template #append-display-fields>
              <AppDisplayFieldGroup
                :items="data.fieldDisplayFields"
                :cols="12"
              />
            </template>
          </ResourceDetailsCard>
        </template>
        <template #dependencies>
          <ResourceDependencyList
            :type="ResourceConstant.DependencyType.DEPENDENCY.value"
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.DATASET.value"
          />
        </template>
        <template #dependents>
          <ResourceDependencyList
            :resource-id="data.id"
            :resource-type="ResourceConstant.Type.DATASET.value"
          />
        </template>
        <template #append>
          <div class="d-flex align-center justify-end ga-2">
            <AppButton
              :text="$t('__actionEvaluate')"
              append-icon="mdi-open-in-new"
              class="primary-gradient"
              @click="() => openInNewTab(`${resourceUtils.getUrl(ResourceConstant.Type.DATASET.value, route.params.id)}/evaluate`)"
            />
          </div>
        </template>
      </AppTabs>
    </template>
    <template v-else>
      <template v-if="error">
        <ResourceErrorCard
          :label="$t('__fieldDataset')"
          :status-code="error.data.status"
        />
      </template>
    </template>
  </template>
</template>
