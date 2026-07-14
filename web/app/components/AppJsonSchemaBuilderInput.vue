<script setup>
import { JsonSchemaConstant } from '~/constants';
import { JsonSchemaFactory, JsonSchemaTableItem, ObjectJsonSchema } from '~/models/ui/jsonSchema';

const props = defineProps({
  label: {
    type: String,
    default: '',
  },
  defaultValue: {
    type: Object,
    default: null,
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  rules: {
    type: Array,
    default: () => [],
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
  formData: {
    tableItems: [],
  },
});

const toTableItems = (v) => {
  if (!v) return [];
  const jsonSchema = new ObjectJsonSchema(v);
  const tableItems = Object.entries(jsonSchema.properties).map(([key, property]) => {
    const tableItem = new JsonSchemaTableItem({
      ...property,
      name: key,
      required: jsonSchema.required.includes(key),
    });
    if (jsonSchemaUtils.getMainType(property) === JsonSchemaConstant.DataType.OBJECT.value) {
      tableItem.interimSchema = property;
    }
    return tableItem;
  });
  return tableItems;
};

/**
 * @param {JsonSchemaTableItem[]} tableItems
 */
const toJsonSchema = (tableItems) => {
  const properties = tableItems.reduce((acc, tableItem, i) => {
    const property = JsonSchemaFactory.create(tableItem);
    property._order = i;
    if (jsonSchemaUtils.getMainType(tableItem) === JsonSchemaConstant.DataType.OBJECT.value) {
      property.required = tableItem.interimSchema.required;
    }
    // Set type to string for file type
    objUtils.mutate(property, (key, value) => {
      if (key === 'type' && arrUtils.cast(value).includes(JsonSchemaConstant.DataType.FILE.value)) {
        return arrUtils.cast(value).includes(JsonSchemaConstant.DataType.NULL.value)
          ? [JsonSchemaConstant.DataType.STRING.value, JsonSchemaConstant.DataType.NULL.value]
          : JsonSchemaConstant.DataType.STRING.value;
      }
    });
    acc[tableItem.name] = property;
    return acc;
  }, {});
  return {
    type: JsonSchemaConstant.DataType.OBJECT.value,
    properties,
    required: tableItems.filter(({ required }) => required).map(({ name }) => name),
  };
};

if (props.defaultValue) {
  formData.value = props.defaultValue;
  state.formData.tableItems = toTableItems(props.defaultValue).sort((a, b) => (a._order ?? Infinity) - (b._order ?? Infinity));
}

if (Object.keys(formData.value || {}).length > 0) {
  state.formData.tableItems = toTableItems(formData.value).sort((a, b) => (a._order ?? Infinity) - (b._order ?? Infinity));
}
</script>

<template>
  <div>
    <template v-if="useJsonInput">
      <AppJsonEditor
        v-model:object="formData"
        :aria-label="props.label"
        :rules="(
          $validator
            .defineField(label)
            .required()
            .json()
            .jsonSchema(JsonSchemaConstant.Base.META_SCHEMA)
            .collect()
        )"
        fill-height
        @update:object="(v) => {
          if (!v) formData = {};
          state.formData.tableItems = toTableItems(v);
        }"
      />
    </template>
    <template v-else>
      <AppJsonSchemaBuilderTable
        v-model="state.formData.tableItems"
        :aria-label="label"
        :rules="props.rules"
        @update:model-value="(v) => {
          const jsonSchema = toJsonSchema(v);
          formData = jsonSchema;
        }"
      />
    </template>
  </div>
</template>
