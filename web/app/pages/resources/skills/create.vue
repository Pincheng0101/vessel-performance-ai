<script setup>
import { ResourceConstant } from '~/constants';

const server = useServer();
const snackbarStore = useSnackbarStore();

const createResource = async (resource) => {
  const { data, error } = await server.skill.create(resource);
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionCreate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.SKILL.value, data.value.id));
};
</script>

<template>
  <ResourceSkillForm
    :on-submit="createResource"
    :on-discard="() => navigateTo(resourceUtils.getUrl(ResourceConstant.Type.SKILL.value))"
  />
</template>
