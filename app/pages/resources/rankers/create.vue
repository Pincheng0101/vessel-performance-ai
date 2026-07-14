<script setup>
import { ResourceConstant } from '~/constants';

/**
 * @import { ErrorResponse } from '~/models/server'
 */

const server = useServer();
const snackbarStore = useSnackbarStore();

const state = reactive({
  /**
   * @type {ErrorResponse}
   */
  error: {},
});

const createResource = async (resource) => {
  const { data, error } = await server.ranker.create(resource);
  if (error.value) {
    state.error = error.value.data;
    return;
  }
  snackbarStore.setActionSuccess('__actionCreate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.RANKER.value, data.value.id));
};
</script>

<template>
  <ResourceRankerForm
    :not-found-resource="state.error.notFoundResource"
    :on-submit="createResource"
    :on-discard="() => navigateTo(resourceUtils.getUrl(ResourceConstant.Type.RANKER.value))"
  />
</template>
