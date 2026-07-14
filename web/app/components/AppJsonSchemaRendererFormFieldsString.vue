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
  <template v-if="props.schema.enum?.length > 0">
    <AppSelect
      :id="props.id"
      v-model="formData[props.name]"
      clearable
      :default-value="formData[props.name] ?? props.schema.default"
      :disabled="props.disabled"
      :items="props.schema.enum"
      :readonly="props.readonly"
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
  <template v-else-if="props.schema.anyOf?.find(item => item.enum)?.enum?.length > 0">
    <AppCombobox
      :id="props.id"
      v-model="formData[props.name]"
      clearable
      :chips="false"
      :default-value="formData[props.name] ?? props.schema.default"
      :disabled="props.disabled"
      :items="props.schema.anyOf.find(item => item.enum)?.enum"
      :multiple="false"
      :readonly="props.readonly"
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
  <template v-else>
    <AppTextarea
      :id="props.id"
      v-model="formData[props.name]"
      :default-value="formData[props.name] ?? props.schema.default"
      :disabled="props.disabled"
      :readonly="props.readonly"
      :rules="(
        $validator
          .defineField(props.label)
          .when({
            required: props.required && !props.disabled && props.schema.minLength > 0,
            stringLengthGte: props.schema.minLength !== undefined,
            stringLengthLte: props.schema.maxLength !== undefined,
          })
          .required()
          .stringLengthGte(props.schema.minLength)
          .stringLengthLte(props.schema.maxLength)
          .collect()
      )"
    />
  </template>
</template>
