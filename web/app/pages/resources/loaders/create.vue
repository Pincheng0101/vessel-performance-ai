<script setup>
import { ResourceConstant } from '~/constants';

/**
 * @import { ErrorResponse } from '~/models/server'
 * @import { LoaderErrorResponse } from '~/models/server/loader'
 */

const server = useServer();
const { t } = useI18n();
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
});

const createResource = async (resource) => {
  const { data, error } = await server.loader.create(resource);
  if (error.value) {
    if (error.value.data.isStatusUnprocessableEntity) {
      // Handle server-side validation errors
      state.errors.cron = error.value.data.findValidationError('invalid_cron_expression') ? t('__validationInvalidFormat', { field: t('__fieldSyncJob').toLowerCase() }) : null;
      return;
    }
    state.error = error.value.data;
    return;
  }
  snackbarStore.setActionSuccess('__actionCreate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.LOADER.value, data.value.id));
};
</script>

<template>
  <ResourceLoaderForm
    :not-found-resource="state.error.notFoundResource"
    :errors="state.errors"
    :on-submit="createResource"
    :on-discard="() => navigateTo(resourceUtils.getUrl(ResourceConstant.Type.LOADER.value))"
  />
</template>
