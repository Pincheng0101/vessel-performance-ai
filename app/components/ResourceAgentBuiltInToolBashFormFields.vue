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
    :label="$t('__fieldBashMaxTimeout')"
    :tooltip="$t('__tooltipAgentBashMaxTimeout')"
  >
    <AppTextField
      :id="id"
      v-model.number="formData.maxTimeout"
      type="number"
      :min="AgentConstant.DefaultParams.BASH_MAX_TIMEOUT.min"
      :max="AgentConstant.DefaultParams.BASH_MAX_TIMEOUT.max"
      :rules="(
        $validator
          .defineField(label)
          .gte(AgentConstant.DefaultParams.BASH_MAX_TIMEOUT.min)
          .lte(AgentConstant.DefaultParams.BASH_MAX_TIMEOUT.max)
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('maxOutputChars')"
    v-slot="{ id, label }"
    :label="$t('__fieldBashMaxOutputChars')"
    :tooltip="$t('__tooltipAgentBashMaxOutputChars')"
  >
    <AppTextField
      :id="id"
      v-model.number="formData.maxOutputChars"
      type="number"
      :min="AgentConstant.DefaultParams.BASH_MAX_OUTPUT_CHARS.min"
      :rules="(
        $validator
          .defineField(label)
          .gte(AgentConstant.DefaultParams.BASH_MAX_OUTPUT_CHARS.min)
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('blockedCommands')"
    v-slot="{ id }"
    :label="$t('__fieldBashBlockedCommands')"
    :tooltip="$t('__tooltipAgentBashBlockedCommands')"
  >
    <AppCombobox
      :id="id"
      v-model="formData.blockedCommands"
      chips
      multiple
    />
  </AppInputGroup>
</template>
