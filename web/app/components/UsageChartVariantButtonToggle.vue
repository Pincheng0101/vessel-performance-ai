<script setup>
import { UsageConstant } from '~/constants';

const model = defineModel({
  type: String,
  default: UsageConstant.ChartVariant.TOKEN_COUNT.value,
});

const { t } = useI18n();

const items = computed(() => Object.values(UsageConstant.ChartVariant).map(item => ({
  ...item,
  title: t(item.i18nTitle),
})));
</script>

<template>
  <AppButtonToggle
    v-model="model"
    :items="items"
    :button-width="null"
    :elevation="0"
    dense
  />
</template>
