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
});

const formData = defineModel('formData', {
  type: Object,
  default: {},
});
</script>

<template>
  <AppSwitch
    :id="id"
    v-model="formData[props.name]"
    :default-value="formData[props.name] ?? props.schema.default"
    :disabled="props.disabled"
    :readonly="props.readonly"
  />
</template>
