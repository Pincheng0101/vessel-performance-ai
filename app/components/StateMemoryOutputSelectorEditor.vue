<script setup>
import { StateConstant } from '~/constants';

const props = defineProps({
  onUpdate: {
    type: Function,
    default: () => {},
  },
});

const stateMemoryOutputSelector = defineModel('stateMemoryOutputSelector', {
  type: Object,
  default: null,
});

const resultSelector = defineModel('resultSelector', {
  type: Object,
  default: null,
});

const updateResultSelector = (v) => {
  if (!v) return;
  const baseSelector = { ...StateConstant.UseExternalMemoryResultSelector };
  Object.keys(v).forEach((key) => {
    // Ignores keys ending with '.$' in state memory output selector, as they're handled by the backend, not AWS
    if (referencePathUtils.hasDollarSuffix(key)) return;
    baseSelector[referencePathUtils.toDollarSuffix(key)] = referencePathUtils.toDollarPrefix(`Payload.state_memory.${key}`);
  });
  resultSelector.value = baseSelector;
  props.onUpdate();
};
</script>

<template>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldStateMemoryOutputSelector')"
    :tooltip="$t('__tooltipWorkflowStateMemoryOutputSelector')"
    :on-update="props.onUpdate"
  >
    <AppJsonEditor
      :id="id"
      v-model:object="stateMemoryOutputSelector"
      :rules="(
        $validator
          .defineField(label)
          .json()
          .collect()
      )"
      @update:object="updateResultSelector"
    />
  </AppInputGroup>
</template>
