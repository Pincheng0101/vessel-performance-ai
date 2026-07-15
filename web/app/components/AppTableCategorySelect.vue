<script setup>
import * as ListConstant from '~/constants/ListConstant';

const model = defineModel({
  type: String,
  default: ListConstant.DefaultParams.CATEGORY,
});
</script>

<template>
  <AppSelect
    v-model="model"
    :items="Object.values(ListConstant.Category).map(item => ({ ...item, title: $t(item.i18nTitle) }))"
    hide-details
  />
</template>
