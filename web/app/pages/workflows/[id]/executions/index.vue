<script setup>
import { ResourceConstant } from '~/constants';

const route = useRoute();

navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, route.params.id)}?tab=executions`, { replace: true });
</script>

<template>
  <div />
</template>
