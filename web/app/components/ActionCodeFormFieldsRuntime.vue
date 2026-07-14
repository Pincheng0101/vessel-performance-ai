<script setup>
import { CodeConstant, JsonSchemaConstant } from '~/constants';

const props = defineProps({
  onUpdate: {
    type: Function,
    default: () => {},
  },
  loadingText: {
    type: String,
    default: null,
  },
});

const runtime = defineModel('runtime', {
  type: Object,
  default: () => ({}),
});

const isGenerating = defineModel('isGenerating', {
  type: Boolean,
  default: false,
});

{
  runtime.value ??= {};
  runtime.value.code ??= CodeConstant.ActionExecutionParams.CODE;
  runtime.value.data ??= CodeConstant.ActionExecutionParams.DATA;
};
</script>

<template>
  <StateInputGroup
    v-model="runtime.code"
    :default-value="CodeConstant.ActionExecutionParams.CODE"
    :expected-value-types="[JsonSchemaConstant.DataType.STRING.value]"
    :label="$t('__fieldCode')"
    :tooltip="$t('__tooltipWorkflowActionCodeRuntimeCode')"
    :state-input-switch-disabled="isGenerating"
    :on-update="props.onUpdate"
    required
  >
    <template #default="{ id, label }">
      <AppPythonEditor
        :id="id"
        v-model="runtime.code"
        :loading="isGenerating"
        :disabled="isGenerating"
        :loading-text="props.loadingText"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .collect()
        )"
        @update:model-value="props.onUpdate"
      >
        <template #prepend-tools>
          <CodeGenerateButton
            v-model:code="runtime.code"
            v-model:loading="isGenerating"
            :runtime-type="runtime.runtimeType"
            :input-examples="runtime.data"
            :on-update="props.onUpdate"
          />
        </template>
      </AppPythonEditor>
    </template>
  </StateInputGroup>
  <StateInputGroup
    v-model="runtime.data"
    :default-value="CodeConstant.ActionExecutionParams.DATA"
    :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
    :label="$t('__fieldData')"
    :tooltip="$t('__tooltipWorkflowActionCodeRuntimeData')"
    :on-update="props.onUpdate"
  >
    <template #default="{ id, label }">
      <AppJsonEditor
        :id="id"
        v-model:object="runtime.data"
        :aria-label="label"
        enable-json-path-binding-linter
        @update:object="props.onUpdate"
      />
    </template>
  </StateInputGroup>
</template>
