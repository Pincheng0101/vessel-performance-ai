<script setup>
import { AgentConstant } from '~/constants';

const props = defineProps({
  hiddenFields: {
    type: Array,
    default: () => [],
  },
});

const formData = defineModel('formData', {
  type: Object,
  default: () => ({}),
});

const { t } = useI18n();

const runtimeTypeOptions = computed(() => Object.values(AgentConstant.BuiltInToolCodeRuntimeType).map(runtimeType => ({
  ...runtimeType,
  title: t(runtimeType.i18nTitle),
  subtitle: t(runtimeType.i18nSubtitle),
})));
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('runtimeType')"
    v-slot="{ id, label }"
    :label="$t('__fieldCodeRuntimeType')"
    :tooltip="$t('__tooltipCodeRuntimeType')"
  >
    <AppSelect
      :id="id"
      v-model="formData.runtimeType"
      :items="runtimeTypeOptions"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
</template>
