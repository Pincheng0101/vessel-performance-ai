<script setup>
/**
 * @import { ErrorResponse } from '~/models/server'
 */

const route = useRoute();
const server = useServer();
const authStore = useAuthStore();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();

const state = reactive({
  /**
   * @type {ErrorResponse}
   */
  error: {},
});

breadcrumbStore.setLoading(true);

const { data, pending, error } = await server.apiKey.get({
  apiKeyId: route.params.id,
  userName: authStore.parsedToken.username,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const updateResource = async (resource) => {
  const { error } = await server.apiKey.update({
    ...resource,
    userName: authStore.parsedToken.username,
  });
  if (error.value) {
    state.error = error.value.data;
    return;
  }
  snackbarStore.setActionSuccess('__actionUpdate');
  navigateTo(`/user/api-keys/${data.value.id}`);
};
</script>

<template>
  <template v-if="pending">
    <AppEditPageLoader />
  </template>
  <template v-else>
    <template v-if="data">
      <AccountUserApiKeyForm
        :resource="data"
        :not-found-resource="state.error.notFoundResource"
        :on-submit="updateResource"
        :on-discard="() => navigateTo(`/user/api-keys/${data.id}`)"
      />
    </template>
    <template v-else>
      <template v-if="error">
        <ResourceErrorCard
          :label="$t('__fieldApiKey')"
          :status-code="error.data.status"
        />
      </template>
    </template>
  </template>
</template>
