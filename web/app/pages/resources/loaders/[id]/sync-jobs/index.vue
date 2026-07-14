<script setup>
import { ResourceConstant } from '~/constants';

const route = useRoute();

navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.LOADER.value, route.params.id)}?tab=sync-jobs`, { replace: true });
</script>

<template>
  <div />
</template>
