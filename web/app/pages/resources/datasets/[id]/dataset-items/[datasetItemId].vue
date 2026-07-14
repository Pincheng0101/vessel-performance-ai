<script setup>
import { ResourceConstant, StatusConstant } from '~/constants';

const route = useRoute();
const server = useServer();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();
const { perPage, sortOrder, sortField } = usePagination();

breadcrumbStore.setLoading(true);

const { data } = await server.datasetItem.list({
  nextToken: null,
  datasetId: route.params.id,
  limit: perPage.value,
  sortField: sortField.value,
  sortOrder: sortOrder.value,
  datasetItemIds: [route.params.datasetItemId],
}, {
  lazy: false,
  onResponse: ({ _data }) => {
    const item = _data.data?.[0];
    breadcrumbStore.setBreadcrumb(route.params.datasetItemId, item.datasetItemId);
    breadcrumbStore.setLoading(false);
  },
});

const datasetItem = computed(() => data.value?.data?.[0] ?? null);

const handleDelete = async () => {
  const { error } = await server.datasetItem.destroy({
    datasetId: route.params.id,
    datasetItemIds: [route.params.datasetItemId],
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.DATASET.value, route.params.id)}/dataset-items`, { replace: true });
};
</script>

<template>
  <template v-if="datasetItem">
    <ResourceInfoTitle :title="datasetItem.datasetItemId" />
    <ResourceDetailsCard
      :item="datasetItem"
      :item-label="$t('__fieldDatasetItem')"
      :allow-delete-recursively="ResourceConstant.Type.DATASET.allowDeleteRecursively"
      :allow-validate="ResourceConstant.Type.DATASET.allowValidate"
      :on-delete="handleDelete"
    >
      <template #append-display-fields>
        <AppDisplayFieldGroup
          :items="datasetItem.datasetItemDataDisplayFields"
          :cols="12"
        />
      </template>
    </ResourceDetailsCard>
  </template>
  <template v-else>
    <template v-if="data?.failures.length > 0">
      <ResourceErrorCard
        :label="$t('__fieldDatasetItem')"
        :status-code="data.failures[0]?.errorMessage.includes('not found') ? StatusConstant.StatusCode.NOT_FOUND : StatusConstant.StatusCode.INTERNAL_SERVER_ERROR"
      />
    </template>
  </template>
</template>
