<script setup>
import { JsonSchemaConstant } from '~/constants';
import { JsonSchemaFactory } from '~/models/ui/jsonSchema';

const props = defineProps({
  label: {
    type: String,
    default: '',
  },
  schema: {
    type: Object,
    default: null,
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  validateWithSchema: {
    type: Boolean,
    default: true,
  },
  onUpdate: {
    type: Function,
    default: () => {},
  },
});

const formData = defineModel('formData', {
  type: [Object, String],
  default: {},
});

const useJsonInput = defineModel('useJsonInput', {
  type: Boolean,
  default: false,
});

const state = reactive({
  dereferencedOriginalSchema: null,
  schema: null,
});

const initializeState = () => {
  if (props.schema) {
    state.dereferencedOriginalSchema = jsonSchemaUtils.dereference(props.schema);
    // Generate structure for form data if not provided
    if (Object.keys(formData.value || {}).length < 1) {
      const template = jsonSchemaUtils.generateTemplate(state.dereferencedOriginalSchema);
      if (Object.keys(template).length > 0) {
        formData.value = template;
      }
    }
    state.schema = JsonSchemaFactory.create(state.dereferencedOriginalSchema);
    return;
  }
  useJsonInput.value = true;
};

watch(formData, (after) => {
  props.onUpdate(after);
}, { deep: true });

initializeState();
</script>

<template>
  <div>
    <!-- Use v-show to preserve component state when toggling visibility -->
    <div v-show="state.schema && !useJsonInput">
      <template v-if="state.schema">
        <template v-if="state.schema.type === JsonSchemaConstant.DataType.OBJECT.value">
          <template
            v-for="([name, property]) in Object.entries(state.schema.properties).sort(([, a], [, b]) => (a._order ?? Infinity) - (b._order ?? Infinity))"
            :key="name"
          >
            <AppJsonSchemaRendererFormFields
              v-if="!props.hiddenFields.includes(name)"
              v-model:form-data="formData"
              :name="name"
              :schema="property"
              :required="state.schema.required.includes(name)"
              :readonly="props.readonly"
              :hidden-fields="props.hiddenFields"
            />
          </template>
        </template>
        <template v-else-if="state.schema.type === JsonSchemaConstant.DataType.ARRAY.value">
          <template v-if="Array.isArray(formData) && formData.every(objUtils.isObject)">
            <AppJsonSchemaRendererFormFieldsArrayItemsTable
              v-model="formData"
              :schema="state.schema.items"
            />
          </template>
          <template v-else>
            <AppJsonEditor
              v-model:object="formData"
              :aria-label="props.label"
              :rules="(
                $validator
                  .defineField($t('__fieldInput'))
                  .when({
                    jsonSchema: props.validateWithSchema && state.schema,
                  })
                  .required()
                  .json()
                  .jsonSchema(objUtils.removeKeys(state.dereferencedOriginalSchema, (key) => key.startsWith('_'))) // Remove custom properties for validation
                  .apply('jsonPathBinding')
                  .collect()
              )"
              :readonly="props.readonly"
              fill-height
              enable-json-path-binding-linter
            />
          </template>
        </template>
      </template>
    </div>
    <template v-if="!state.schema || useJsonInput">
      <AppJsonEditor
        v-model:object="formData"
        :aria-label="props.label"
        :rules="(
          $validator
            .defineField($t('__fieldInput'))
            .when({
              jsonSchema: props.validateWithSchema && state.schema,
            })
            .required()
            .json()
            .jsonSchema(objUtils.removeKeys(state.dereferencedOriginalSchema, (key) => key.startsWith('_'))) // Remove custom properties for validation
            .apply('jsonPathBinding')
            .collect()
        )"
        :readonly="props.readonly"
        fill-height
        enable-json-path-binding-linter
        :on-object-update="(v) => {
          if (v) {
            formData = props.validateWithSchema ? jsonSchemaUtils.sanitize(v, state.schema) : v;
          }
        }"
      />
    </template>
  </div>
</template>
