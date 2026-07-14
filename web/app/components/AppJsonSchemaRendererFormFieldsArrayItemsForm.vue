<script setup>
import { JsonSchemaConstant } from '~/constants';
import { JsonSchema } from '~/models/ui/jsonSchema';

const props = defineProps({
  nestedLevel: {
    type: Number,
    default: 0,
  },
  items: {
    type: Array,
    default: () => [],
  },
  item: {
    type: Object,
    default: null,
  },
  schema: {
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
  onSubmit: {
    type: Function,
    default: () => {},
  },
  onDiscard: {
    type: Function,
    default: () => {},
  },
});

const state = reactive({
  formData: {},
  isEnabled: true,
});

if (props.schema) {
  if (jsonSchemaUtils.getMainType(props.schema) !== JsonSchemaConstant.DataType.OBJECT.value) {
    // Generate structure for form data if not provided
    if (Object.keys(state.formData).length < 1) {
      state.formData[props.name] = jsonSchemaUtils.generateTemplate(props.schema);
    }
  }
}

if (props.item) {
  state.formData = objUtils.toRaw(props.item);
  state.isEnabled = jsonSchemaUtils.hasNullType(props.schema) && state.formData[props.name] !== null && state.formData[props.name] !== undefined;
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
    state.formData[props.name] = props.schema.default ?? jsonSchemaUtils.getDefaultValue(jsonSchemaUtils.getMainType(props.schema));
    return;
  }
  state.formData[props.name] = null;
};

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit(formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: props.item ? $t('__actionEdit') : $t('__actionAdd'), item: $t('__fieldItem') })"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <template v-if="jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.ARRAY.value">
        <AppJsonSchemaRendererFormFields
          v-model:form-data="state.formData"
          :enabled="state.isEnabled"
          :name="props.name"
          :nested-level="props.nestedLevel + 1"
          :readonly="props.readonly"
          :schema="props.schema"
        />
      </template>
      <template v-else-if="jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.OBJECT.value">
        <template v-if="Object.keys(props.schema.properties).length > 0">
          <template
            v-for="([name, property]) in Object.entries(props.schema.properties).sort(([, a], [, b]) => (a._order ?? Infinity) - (b._order ?? Infinity))"
            :key="name"
          >
            <AppJsonSchemaRendererFormFields
              v-model:form-data="state.formData"
              :nested-level="props.nestedLevel + 1"
              :name="name"
              :schema="property"
              :parent-schema="props.schema"
              :required="props.schema.required.includes(name)"
              :readonly="props.readonly"
            />
          </template>
        </template>
        <template v-else>
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__fieldValue')"
            required
          >
            <AppJsonEditor
              :id="id"
              v-model:object="state.formData"
              fill-height
              enable-json-path-binding-linter
              :readonly="props.readonly"
              :rules="(
                $validator
                  .defineField(label)
                  .required()
                  .json()
                  .jsonSchema(objUtils.removeKeys(props.schema, (key) => key.startsWith('_'))) // Remove custom properties for validation
                  .apply('jsonPathBinding')
                  .collect()
              )"
            />
          </AppInputGroup>
        </template>
      </template>
      <template v-else>
        <AppInputGroup
          v-slot="{ id, label }"
          :hint="props.schema.description"
          :label="props.schema.title || strUtils.toTitleCase(props.name)"
          :required="required"
        >
          <div class="d-flex flex-row align-start ga-2">
            <template v-if="jsonSchemaUtils.hasNullType(props.schema)">
              <AppCheckbox
                v-model="state.isEnabled"
                @update:model-value="handleEnabledChange"
              />
            </template>
            <template v-if="jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.STRING.value">
              <AppTextarea
                :id="id"
                v-model="state.formData[props.name]"
                :default-value="state.formData[props.name]"
                :disabled="!state.isEnabled"
                :readonly="props.readonly"
                :rules="(
                  $validator
                    .defineField(label)
                    .when({
                      required: state.isEnabled && props.schema.minLength > 0,
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
            <template v-else-if="jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.NUMBER.value || jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.INTEGER.value">
              <AppTextField
                :id="id"
                v-model.number="state.formData[props.name]"
                :default-value="state.formData[props.name]"
                :disabled="!state.isEnabled"
                :max="props.schema.maximum"
                :min="props.schema.minimum"
                :model-modifiers="{
                  integer: jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.INTEGER.value,
                }"
                :readonly="props.readonly"
                type="number"
                :rules="(
                  $validator
                    .defineField(label)
                    .when({
                      required: state.isEnabled && props.schema.minimum !== undefined,
                      integer: jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.INTEGER.value,
                      lte: props.schema.maximum !== undefined,
                      gte: props.schema.minimum !== undefined,
                    })
                    .required()
                    .gte(props.schema.minimum)
                    .lte(props.schema.maximum)
                    .collect()
                )"
              />
            </template>
            <template v-else-if="jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.BOOLEAN.value">
              <AppSwitch
                :id="id"
                v-model="state.formData[props.name]"
                :default-value="state.formData[props.name]"
                :disabled="!state.isEnabled"
                :readonly="props.readonly"
              />
            </template>
            <template v-else-if="jsonSchemaUtils.getMainType(props.schema) === JsonSchemaConstant.DataType.FILE.value">
              <AppFileInput
                :id="id"
                v-model:encoded="state.formData[props.name]"
                :default-value="state.formData[props.name]"
                :disabled="!state.isEnabled"
                :readonly="props.readonly"
                :supported-extensions="props.schema.contentMediaType ? [props.schema.contentMediaType] : props.schema.anyOf?.map(item => item.contentMediaType)"
                :rules="(
                  $validator
                    .defineField(label)
                    .when({
                      required: state.isEnabled && props.required,
                    })
                    .required()
                    .collect()
                )"
              />
            </template>
            <template v-else>
              <AppJsonEditor
                v-model:object="state.formData[props.name]"
                :default-value="state.formData[props.name]"
                :enable-json-linter="false"
                :readonly="props.readonly"
                fill-height
                :rules="(
                  $validator
                    .defineField(label)
                    .required()
                    .collect()
                )"
              />
            </template>
          </div>
        </AppInputGroup>
      </template>
    </template>
  </AppForm>
</template>
