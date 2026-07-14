<script setup>
import { JsonSchemaConstant, TransformationConstant } from '~/constants';

const props = defineProps({
  onUpdate: {
    type: Function,
    default: () => {},
  },
});

const input = defineModel('input', {
  type: [Object, String],
  default: null,
});
</script>

<template>
  <StateInputGroup
    v-model="input"
    :default-value="TransformationConstant.ActionExecutionParams.SIMPLIFIED_TO_TRADITIONAL_CHINESE_INPUT.default"
    :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
    :label="$t('__fieldInput')"
    :on-update="props.onUpdate"
    required
    enable-json-input-switch
    use-json-input
    force-use-json-input
  >
    <template #default="{ id, label }">
      <AppJsonEditor
        :id="id"
        v-model:object="input"
        enable-json-path-binding-linter
        :rules="(
          $validator
            .defineField(label)
            .required()
            .json()
            .jsonSchema(TransformationConstant.ActionExecutionParams.SIMPLIFIED_TO_TRADITIONAL_CHINESE_INPUT.jsonSchema)
            .apply('jsonPathBinding')
            .collect()
        )"
        @update:object="props.onUpdate"
      />
    </template>
  </StateInputGroup>
</template>
