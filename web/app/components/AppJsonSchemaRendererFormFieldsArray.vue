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
  nestedLevel: {
    type: Number,
    default: 0,
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
  <template v-if="jsonSchemaUtils.getMainType(props.schema.items) === JsonSchemaConstant.DataType.STRING.value">
    <template v-if="jsonSchemaUtils.hasNullType(props.schema.items) || props.schema.items.default || props.schema.items.minLength || props.schema.items.maxLength">
      <AppJsonSchemaRendererFormFieldsArrayItemsTable
        v-model="formData[props.name]"
        :disabled="props.disabled"
        :nested-level="props.nestedLevel + 1"
        :readonly="props.readonly"
        :required="props.required"
        :schema="props.schema.items"
      />
    </template>
    <template v-else-if="props.schema.items.enum">
      <AppAutocomplete
        :id="props.id"
        v-model="formData[props.name]"
        :default-value="formData[props.name] ?? props.schema.default"
        :disabled="props.disabled"
        :items="props.schema.items.enum"
        :readonly="props.readonly"
        chips
        multiple
        :rules="(
          $validator
            .defineField(props.label)
            .when({
              required: props.required && !props.disabled && props.schema.minItems > 0,
            })
            .subsetOf(props.schema.items.enum)
            .required()
            .collect()
        )"
      />
    </template>
    <template v-else>
      <AppCombobox
        :id="props.id"
        v-model="formData[props.name]"
        :default-value="formData[props.name] ?? props.schema.default"
        :disabled="props.disabled"
        :readonly="props.readonly"
        :rules="(
          $validator
            .defineField(props.label)
            .when({
              required: props.required && !props.disabled && props.schema.minItems > 0,
            })
            .required()
            .collect()
        )"
      />
    </template>
  </template>
  <template v-else-if="jsonSchemaUtils.getMainType(props.schema.items) === JsonSchemaConstant.DataType.NUMBER.value || jsonSchemaUtils.getMainType(props.schema.items) === JsonSchemaConstant.DataType.INTEGER.value">
    <template v-if="jsonSchemaUtils.hasNullType(props.schema.items) || props.schema.items.default || props.schema.items.minimum || props.schema.items.maximum">
      <AppJsonSchemaRendererFormFieldsArrayItemsTable
        v-model="formData[props.name]"
        :disabled="props.disabled"
        :nested-level="props.nestedLevel + 1"
        :readonly="props.readonly"
        :required="props.required"
        :schema="props.schema.items"
      />
    </template>
    <template v-else-if="props.schema.items.enum">
      <AppAutocomplete
        :id="props.id"
        v-model="formData[props.name]"
        :default-value="formData[props.name] ?? props.schema.default"
        :disabled="props.disabled"
        :items="props.schema.items.enum"
        :readonly="props.readonly"
        chips
        multiple
        :rules="(
          $validator
            .defineField(props.label)
            .when({
              required: props.required && !props.disabled && props.schema.minItems > 0,
            })
            .subsetOf(props.schema.items.enum)
            .required()
            .collect()
        )"
      />
    </template>
    <template v-else>
      <AppCombobox
        :id="props.id"
        v-model="formData[props.name]"
        :default-value="formData[props.name] ?? props.schema.default"
        :disabled="props.disabled"
        :readonly="props.readonly"
        type="number"
        :rules="(
          $validator
            .defineField(props.label)
            .when({
              required: props.required && !props.disabled && props.schema.minItems > 0,
            })
            .required()
            .collect()
        )"
      />
    </template>
  </template>
  <template v-else-if="jsonSchemaUtils.getMainType(props.schema.items) === JsonSchemaConstant.DataType.OBJECT.value">
    <AppJsonSchemaRendererFormFieldsArrayItemsTable
      v-model="formData[props.name]"
      :nested-level="props.nestedLevel + 1"
      :schema="props.schema.items"
      :name="props.name"
      :readonly="props.readonly"
      :required="props.required"
    />
  </template>
  <template v-else>
    <AppJsonSchemaRendererFormFieldsArrayItemsTable
      v-model="formData[props.name]"
      :disabled="props.disabled"
      :nested-level="props.nestedLevel + 1"
      :readonly="props.readonly"
      :required="props.required"
      :schema="props.schema.items"
    />
  </template>
</template>
