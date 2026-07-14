<script setup>
import { JsonSchemaConstant } from '~/constants';
import { JsonSchema } from '~/models/ui/jsonSchema';

const props = defineProps({
  nestedLevel: {
    type: Number,
    default: 0,
  },
  schema: {
    type: JsonSchema,
    required: true,
  },
  parentSchema: {
    type: JsonSchema,
    default: null,
  },
  name: {
    type: String,
    required: true,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  required: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
});

const state = reactive({
  isEnabled: true,
});

{
  state.isEnabled = props.enabled;
}

const formData = defineModel('formData', {
  type: Object,
  default: {},
  get(value) {
    if (objUtils.isObject(value) && strUtils.isEmpty(value[props.name])) {
      // Convert empty input to undefined when the field is not required
      if (!props.required) {
        value[props.name] = undefined;
        return value;
      }
      // Convert empty input to null when the field is required but disabled
      if (!state.isEnabled) {
        value[props.name] = null;
        return value;
      }
    }
    return value;
  },
});

if (props.parentSchema) {
  // Generate structure for form data if not provided
  if (Object.keys(formData.value || {}).length < 1) {
    const template = jsonSchemaUtils.generateTemplate(props.parentSchema);
    if (Object.keys(template).length > 0) {
      formData.value = template;
    }
  }
}

const required = computed(() => {
  if (!props.required) {
    return false;
  }
  if (jsonSchemaUtils.hasNullType(props.schema) && !state.isEnabled) {
    return false;
  }
  const mainType = jsonSchemaUtils.getMainType(props.schema);
  switch (mainType) {
    case JsonSchemaConstant.DataType.STRING.value:
      return props.schema.minLength > 0;
    case JsonSchemaConstant.DataType.NUMBER.value:
    case JsonSchemaConstant.DataType.INTEGER.value:
      return props.schema.minimum !== undefined;
    case JsonSchemaConstant.DataType.ARRAY.value:
      return props.schema.minItems > 0;
    default:
      return false;
  }
});

const handleEnabledChange = (v) => {
  if (v) {
    formData.value[props.name] = props.schema.default ?? jsonSchemaUtils.getDefaultValue(jsonSchemaUtils.getMainType(props.schema));
    return;
  }
  formData.value[props.name] = null;
};
</script>

<template>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="props.schema.title || strUtils.toTitleCase(props.name)"
    :required="required"
    :hint="props.schema.description"
    :bordered="jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.OBJECT.value && Object.keys(props.schema.properties).length > 0"
  >
    <div class="d-flex flex-row align-start ga-2">
      <template v-if="jsonSchemaUtils.hasNullType(props.schema)">
        <AppCheckbox
          v-model="state.isEnabled"
          @update:model-value="handleEnabledChange"
        />
      </template>
      <template v-if="jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.STRING.value">
        <AppJsonSchemaRendererFormFieldsString
          :id="id"
          v-model:form-data="formData"
          :disabled="!state.isEnabled"
          :label="label"
          :name="props.name"
          :readonly="props.readonly"
          :required="props.required"
          :schema="props.schema"
        />
      </template>
      <template v-else-if="jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.NUMBER.value || jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.INTEGER.value">
        <AppJsonSchemaRendererFormFieldsNumber
          :id="id"
          v-model:form-data="formData"
          :disabled="!state.isEnabled"
          :label="label"
          :name="props.name"
          :readonly="props.readonly"
          :required="props.required"
          :schema="props.schema"
        />
      </template>
      <template v-else-if="jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.BOOLEAN.value">
        <AppJsonSchemaRendererFormFieldsBoolean
          :id="id"
          v-model:form-data="formData"
          :disabled="!state.isEnabled"
          :label="label"
          :name="props.name"
          :readonly="props.readonly"
          :schema="props.schema"
        />
      </template>
      <template v-else-if="jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.ARRAY.value">
        <AppJsonSchemaRendererFormFieldsArray
          :id="id"
          v-model:form-data="formData"
          :disabled="!state.isEnabled"
          :label="label"
          :name="props.name"
          :nested-level="props.nestedLevel + 1"
          :readonly="props.readonly"
          :required="props.required"
          :schema="props.schema"
        />
      </template>
      <template v-else-if="jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.OBJECT.value">
        <AppJsonSchemaRendererFormFieldsObject
          v-model:form-data="formData"
          :hidden-fields="props.hiddenFields"
          :label="label"
          :name="props.name"
          :nested-level="props.nestedLevel + 1"
          :readonly="props.readonly"
          :required="props.required"
          :schema="props.schema"
        />
      </template>
      <template v-else-if="jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.FILE.value">
        <AppJsonSchemaRendererFormFieldsFile
          :id="id"
          v-model:form-data="formData"
          :disabled="!state.isEnabled"
          :label="label"
          :name="props.name"
          :readonly="props.readonly"
          :required="props.required"
          :schema="props.schema"
        />
      </template>
      <template v-else>
        <AppJsonEditor
          v-model:object="formData[props.name]"
          :allow-primitive="!!(props.schema.anyOf || props.schema.oneOf)"
          :default-value="formData[props.name] ?? props.schema.default"
          :enable-json-linter="false"
          :readonly="props.readonly"
          fill-height
          :rules="(
            $validator
              .defineField(label)
              .when({
                required: props.required,
              })
              .required()
              .collect()
          )"
        />
      </template>
    </div>
  </AppInputGroup>
</template>
