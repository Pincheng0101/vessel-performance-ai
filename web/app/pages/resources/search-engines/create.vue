<script setup>
import { ResourceConstant } from '~/constants';

const server = useServer();
const snackbarStore = useSnackbarStore();

const createResource = async (resource) => {
  const { data, error } = await server.searchEngine.create(resource);
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionCreate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.SEARCH_ENGINE.value, data.value.id));
};
</script>

<template>
  <ResourceSearchEngineForm
    :on-submit="createResource"
    :on-discard="() => navigateTo(resourceUtils.getUrl(ResourceConstant.Type.SEARCH_ENGINE.value))"
  />
</template>
