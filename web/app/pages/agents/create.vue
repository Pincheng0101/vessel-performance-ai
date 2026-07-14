<script setup>
import { ResourceConstant } from '~/constants';

const snackbarStore = useSnackbarStore();
const server = useServer();
const { t } = useI18n();

const createResource = async (resource, syncCreditConfig) => {
  const { data, error } = await server.agent.create(resource);
  if (error.value) {
    return;
  }

  const isCreditConfigSaved = await syncCreditConfig(data.value.id);
  if (isCreditConfigSaved === false) {
    snackbarStore.setFailure(t('__messageCreditConfigSaveFailed'));
  } else {
    snackbarStore.setActionSuccess('__actionCreate');
  }
  navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.AGENT.value, data.value.id)}/edit`);
};
</script>

<template>
  <ResourceAgentForm
    :on-submit="createResource"
    :on-discard="() => navigateTo(resourceUtils.getUrl(ResourceConstant.Type.AGENT.value))"
  />
</template>
