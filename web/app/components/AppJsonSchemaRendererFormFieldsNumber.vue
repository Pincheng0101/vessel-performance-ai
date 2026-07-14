<script setup>
import { JsonSchemaConstant } from '~/constants';
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
      v-model.integer="formData[props.name]"
      clearable
      :default-value="formData[props.name] ?? props.schema.default"
      :disabled="props.disabled"
      :items="props.schema.enum"
      :readonly="props.readonly"
      :rules="(
        $validator
          .defineField(props.label)
          .when({
            required: props.required && !props.disabled,
            integer: jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.INTEGER.value,
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
      type="number"
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
            required: props.required && !props.disabled,
            integer: jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.INTEGER.value,
          })
          .integer()
          .required()
          .collect()
      )"
    />
  </template>
  <template v-else>
    <template v-if="props.schema.minimum && props.schema.maximum && props.schema._step">
      <AppSlider
        v-model="formData[props.name]"
        :default-value="formData[props.name] ?? props.schema.default"
        :disabled="props.disabled"
        :max="props.schema.maximum"
        :min="props.schema.minimum"
        :readonly="props.readonly"
        :step="props.schema._step"
        :rules="(
          $validator
            .defineField(props.label)
            .when({
              required: props.required && !props.disabled,
              integer: jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.INTEGER.value,
              gte: props.schema.minimum !== undefined,
              lte: props.schema.maximum !== undefined,
            })
            .required()
            .gte(props.schema.minimum)
            .lte(props.schema.maximum)
            .collect()
        )"
      />
    </template>
    <template v-else>
      <AppTextField
        :id="props.id"
        v-model.number="formData[props.name]"
        :default-value="formData[props.name] ?? props.schema.default"
        :disabled="props.disabled"
        :max="props.schema.maximum"
        :min="props.schema.minimum"
        :model-modifiers="{
          integer: jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.INTEGER.value,
        }"
        :readonly="props.readonly"
        :step="props.schema._step"
        type="number"
        :rules="(
          $validator
            .defineField(props.label)
            .when({
              required: props.required && !props.disabled && props.schema.minimum !== undefined,
              integer: jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.INTEGER.value,
              gte: props.schema.minimum !== undefined,
              lte: props.schema.maximum !== undefined,
            })
            .required()
            .gte(props.schema.minimum)
            .lte(props.schema.maximum)
            .collect()
        )"
        @focus="(e) => {
          // Select the input when the value is 0 to improve UX
          if (formData[props.name] === 0) {
            e.target.select();
          }
        }"
        @blur="() => {
          // Convert empty input to 0 when the field is required and does not allow null
          if (strUtils.isEmpty(formData[props.name]) && props.required && !jsonSchemaUtils.hasNullType(props.schema)) {
            formData[props.name] = 0;
          }
        }"
      />
    </template>
  </template>
</template>
