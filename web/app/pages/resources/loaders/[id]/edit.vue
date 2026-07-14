<script setup>
import { ResourceConstant, StatusConstant } from '~/constants';

/**
 * @import { ErrorResponse } from '~/models/server'
 * @import { LoaderErrorResponse } from '~/models/server/loader'
 */

const route = useRoute();
const server = useServer();
const { hasWritePermission } = useResourcePermission();
const breadcrumbStore = useBreadcrumbStore();
const snackbarStore = useSnackbarStore();

const state = reactive({
  /**
   * @type {ErrorResponse}
   */
  error: {},
  /**
   * @type {LoaderErrorResponse}
   */
  errors: {},
  hasPermission: null,
});

breadcrumbStore.setLoading(true);
state.hasPermission = await hasWritePermission(ResourceConstant.Type.LOADER.value);

const { data, pending, error } = await server.loader.get({
  loaderId: route.params.id,
}, {
  onResponse: ({ _data }) => {
    breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
    breadcrumbStore.setLoading(false);
  },
});

const updateResource = async (resource) => {
  const { error } = await server.loader.update(resource);
  if (error.value) {
    if (error.value.data.isStatusUnprocessableEntity) {
      // Handle server-side validation errors
      state.errors.cron = error.value.data.findValidationError('invalid_cron_expression') ? t('__validationInvalidFormat', { field: t('__fieldSyncJob').toLowerCase() }) : null;
      return;
    }
    state.error = error.value.data;
    return;
  }
  snackbarStore.setActionSuccess('__actionUpdate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.LOADER.value, data.value.id));
};
</script>

<template>
  <template v-if="pending">
    <AppEditPageLoader />
  </template>
  <template v-else-if="!state.hasPermission || error">
    <ResourceErrorCard
      :label="$t('__fieldLoader')"
      :status-code="state.hasPermission ? error.data.status : StatusConstant.StatusCode.FORBIDDEN"
    />
  </template>
  <template v-else-if="data">
    <ResourceLoaderForm
      :resource="data"
      :not-found-resource="state.error.notFoundResource"
      :errors="state.errors"
      :on-submit="updateResource"
      :on-discard="() => navigateTo(resourceUtils.getUrl(ResourceConstant.Type.LOADER.value, data.id))"
    />
  </template>
</template>
