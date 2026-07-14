<script setup>
import { ResourceConstant } from '~/constants';

const server = useServer();
const snackbarStore = useSnackbarStore();

const createResource = async (resource) => {
  const { data, error } = await server.dataset.create(resource);
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionCreate');
  navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.DATASET.value, data.value.id)}/evaluate`);
};
</script>

<template>
  <ResourceDatasetForm
    :on-submit="createResource"
    :on-discard="() => navigateTo(resourceUtils.getUrl(ResourceConstant.Type.DATASET.value))"
  />
</template>
