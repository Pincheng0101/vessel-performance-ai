<script setup>
import { ResourceConstant } from '~/constants';

const server = useServer();
const snackbarStore = useSnackbarStore();

const createResource = async (resource) => {
  const { data, error } = await server.lambdaFunction.create(resource);
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionCreate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.LAMBDA_FUNCTION.value, data.value.id));
};
</script>

<template>
  <ResourceLambdaFunctionForm
    :on-submit="createResource"
    :on-discard="() => navigateTo(resourceUtils.getUrl(ResourceConstant.Type.LAMBDA_FUNCTION.value))"
  />
</template>
