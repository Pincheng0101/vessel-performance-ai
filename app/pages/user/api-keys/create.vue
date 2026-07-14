<script setup>
/**
 * @import { ErrorResponse } from '~/models/server'
 */

const snackbarStore = useSnackbarStore();
const server = useServer();

const state = reactive({
  /**
   * @type {ErrorResponse}
   */
  error: {},
});

const createApiKey = async (resource) => {
  const { data, error } = await server.apiKey.create(resource);
  if (error.value) {
    state.error = error.value.data;
    return;
  }
  snackbarStore.setActionSuccess('__actionCreate');
  navigateTo(`/user/api-keys/${data.value.id}`);
};
</script>

<template>
  <AccountUserApiKeyForm
    :not-found-resource="state.error.notFoundResource"
    :on-submit="createApiKey"
    :on-discard="() => navigateTo('/user/api-keys')"
  />
</template>
