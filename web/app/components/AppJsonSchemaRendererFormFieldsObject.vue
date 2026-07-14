<script setup>
import { JsonSchema } from '~/models/ui/jsonSchema';

const props = defineProps({
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
  readonly: {
    type: Boolean,
    default: false,
  },
  required: {
    type: Boolean,
    default: false,
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
});

const formData = defineModel('formData', {
  type: Object,
  default: {},
});
</script>

<template>
  <div class="w-100">
    <template v-if="Object.keys(props.schema.properties).length > 0">
      <template
        v-for="([name, property]) in Object.entries(props.schema.properties).sort(([, a], [, b]) => (a._order ?? Infinity) - (b._order ?? Infinity))"
        :key="name"
      >
        <AppJsonSchemaRendererFormFields
          v-if="!props.hiddenFields.includes(name)"
          v-model:form-data="formData[props.name]"
          :nested-level="props.nestedLevel + 1"
          :name="name"
          :schema="property"
          :parent-schema="props.schema"
          :readonly="props.readonly"
          :required="props.schema.required.includes(name)"
          :hidden-fields="props.hiddenFields"
        />
      </template>
    </template>
    <template v-else>
      <AppJsonEditor
        v-model:object="formData[props.name]"
        :readonly="props.readonly"
        fill-height
        :rules="(
          $validator
            .defineField(props.label)
            .when({
              required: props.required,
            })
            .required()
            .json()
            .jsonSchema(objUtils.removeKeys(props.schema, (key) => key.startsWith('_')), false) // Remove custom properties for validation
            .collect()
        )"
      />
    </template>
  </div>
</template>
