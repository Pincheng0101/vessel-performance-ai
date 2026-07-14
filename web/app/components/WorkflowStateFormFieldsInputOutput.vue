<script setup>
/**
 * @import { InputOutput } from '~/models/workflow/state'
 */

const props = defineProps({
  onUpdate: {
    type: Function,
    default: () => {},
  },
});

/**
 * @type {Ref<InputOutput>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});
</script>

<template>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldStateInputPath')"
    :tooltip="$t('__tooltipWorkflowStateInputPath')"
  >
    <StateInputCombobox
      :id="id"
      v-model="formData.inputPath"
      :label="label"
      @update:model-value="onUpdate"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="Object.hasOwn(props.formData, 'parameters')"
    v-slot="{ id, label }"
    :label="$t('__fieldStateParameter', 2)"
    :tooltip="$t('__tooltipWorkflowStateParameters')"
  >
    <AppJsonEditor
      :id="id"
      v-model:object="formData.parameters"
      enable-json-path-binding-linter
      :rules="(
        $validator
          .defineField(label)
          .json()
          .apply('jsonPathBinding')
          .collect()
      )"
      @update:object="onUpdate"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="Object.hasOwn(props.formData, 'resultSelector')"
    v-slot="{ id, label }"
    :label="$t('__fieldStateResultSelector')"
    :tooltip="$t('__tooltipWorkflowStateResultSelector')"
  >
    <AppJsonEditor
      :id="id"
      v-model:object="formData.resultSelector"
      enable-json-path-binding-linter
      :rules="(
        $validator
          .defineField(label)
          .json()
          .apply('jsonPathBinding')
          .collect()
      )"
      @update:object="onUpdate"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="Object.hasOwn(props.formData, 'result')"
    v-slot="{ id, label }"
    :label="$t('__fieldStateResult')"
    :tooltip="$t('__tooltipWorkflowStateResult')"
  >
    <AppJsonEditor
      :id="id"
      v-model:object="formData.result"
      enable-json-path-binding-linter
      :rules="(
        $validator
          .defineField(label)
          .json()
          .apply('jsonPathBinding')
          .collect()
      )"
      @update:object="onUpdate"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="Object.hasOwn(props.formData, 'resultPath')"
    v-slot="{ id, label }"
    :label="$t('__fieldStateResultPath')"
    :tooltip="$t('__tooltipWorkflowStateResultPath')"
  >
    <StateInputCombobox
      :id="id"
      v-model="formData.resultPath"
      :label="label"
      @update:model-value="onUpdate"
    />
  </AppInputGroup>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldStateOutputPath')"
    :tooltip="$t('__tooltipWorkflowStateOutputPath')"
  >
    <StateInputCombobox
      :id="id"
      v-model="formData.outputPath"
      :label="label"
      @update:model-value="onUpdate"
    />
  </AppInputGroup>
</template>
