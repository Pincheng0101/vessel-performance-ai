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
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('maxTimeout')"
    v-slot="{ id, label }"
    :label="$t('__fieldBrowserMaxTimeout')"
    :tooltip="$t('__tooltipAgentBrowserMaxTimeout')"
  >
    <AppTextField
      :id="id"
      v-model.number="formData.maxTimeout"
      type="number"
      :min="AgentConstant.DefaultParams.BROWSER_MAX_TIMEOUT.min"
      :max="AgentConstant.DefaultParams.BROWSER_MAX_TIMEOUT.max"
      :rules="(
        $validator
          .defineField(label)
          .gte(AgentConstant.DefaultParams.BROWSER_MAX_TIMEOUT.min)
          .lte(AgentConstant.DefaultParams.BROWSER_MAX_TIMEOUT.max)
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('maxOutputChars')"
    v-slot="{ id, label }"
    :label="$t('__fieldBrowserMaxOutputChars')"
    :tooltip="$t('__tooltipAgentBrowserMaxOutputChars')"
  >
    <AppTextField
      :id="id"
      v-model.number="formData.maxOutputChars"
      type="number"
      :min="AgentConstant.DefaultParams.BROWSER_MAX_OUTPUT_CHARS.min"
      :max="AgentConstant.DefaultParams.BROWSER_MAX_OUTPUT_CHARS.max"
      :rules="(
        $validator
          .defineField(label)
          .gte(AgentConstant.DefaultParams.BROWSER_MAX_OUTPUT_CHARS.min)
          .lte(AgentConstant.DefaultParams.BROWSER_MAX_OUTPUT_CHARS.max)
          .collect()
      )"
    />
  </AppInputGroup>
</template>
