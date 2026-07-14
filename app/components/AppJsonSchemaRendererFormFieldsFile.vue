<script setup>
import { JsonSchema } from '~/models/ui/jsonSchema';

const props = defineProps({
  id: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
  schema: {
    type: JsonSchema,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  required: {
    type: Boolean,
    default: false,
  },
});

const formData = defineModel('formData', {
  type: Object,
  default: {},
});
</script>

<template>
  <AppFileInput
    :id="props.id"
    v-model:encoded="formData[props.name]"
    :default-value="formData[props.name] ?? props.schema.default"
    :supported-extensions="props.schema.contentMediaType ? [props.schema.contentMediaType] : props.schema.anyOf?.map(item => item.contentMediaType)"
    :readonly="props.readonly"
    :disabled="props.disabled"
    :rules="(
      $validator
        .defineField(props.label)
        .when({
          required: props.required,
        })
        .required()
        .collect()
    )"
  />
</template>
