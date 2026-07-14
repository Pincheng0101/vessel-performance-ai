<script setup>
import { JsonSchemaConstant } from '~/constants';

/**
 * @import { JsonSchemaTableItem } from '~/models/ui/jsonSchema'
 */

/**
 * @type {{ items: JsonSchemaTableItem[], item: JsonSchemaTableItem }}
 */
const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  item: {
    type: Object,
    default: null,
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
  /**
   * @type {JsonSchemaTableItem}
   */
  formData: {},
});

if (props.item) {
  state.formData = objUtils.toRaw(props.item);
}

const hydrateSchema = (output, source) => {
  if (!output || !source) return;
  const mainType = jsonSchemaUtils.getMainType(output);
  if (mainType === JsonSchemaConstant.DataType.OBJECT.value) {
    output.properties = source.interimSchema.properties;
  }
  if (mainType === JsonSchemaConstant.DataType.ARRAY.value) {
    if (jsonSchemaUtils.getMainType(output.items) === JsonSchemaConstant.DataType.OBJECT.value) {
      output.items.required = source.items.interimSchema.required;
    }
    hydrateSchema(output.items, source.items);
  }
};

const submit = async () => {
  /**
   * @type {JsonSchemaTableItem}
   */
  const formData = objUtils.toRaw(state.formData);

  if (formData.enum?.length < 1) {
    delete formData.enum;
  }

  if (formData.allowCustomValue) {
    const primitiveTypes = [
      JsonSchemaConstant.DataType.STRING.value,
      JsonSchemaConstant.DataType.NUMBER.value,
      JsonSchemaConstant.DataType.INTEGER.value,
    ];

    if (primitiveTypes.includes(jsonSchemaUtils.getMainType(formData))) {
      formData.anyOf = [
        { type: formData.type, enum: formData.enum },
        { type: formData.type },
      ];
      delete formData.enum;
    }
  }

  hydrateSchema(formData, state.formData);

  await props.onSubmit(formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: props.item ? $t('__actionEdit') : $t('__actionAdd'), item: $t('__fieldProperty') })"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <AppJsonSchemaBuilderFormFields
        v-model:form-data="state.formData"
        :items="props.items"
        :item="props.item"
      />
    </template>
  </AppForm>
</template>
