<script setup>
/**
 * @typedef {Object<string, string>} DatasetItemData
 */
/**
 * @type {{ item: DatasetItemData | null }}
 */
const props = defineProps({
  item: {
    type: Object,
    default: null,
  },
  fieldNames: {
    type: Array,
    default: () => [],
  },
  actionLabel: {
    type: String,
    default: null,
  },
  itemLabel: {
    type: String,
    default: null,
  },
  onSubmit: {
    type: Function,
    required: true,
  },
  onDiscard: {
    type: Function,
    required: true,
  },
});

const state = reactive({
  formData: props.item
    ? objUtils.toRaw(props.item)
    : Object.fromEntries(
        props.fieldNames.map(fieldName => [fieldName, props.item?.[fieldName] ?? '']),
      ),
  isLoading: false,
});

const submit = async () => {
  state.isLoading = true;
  await props.onSubmit(state.formData);
  state.isLoading = false;
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: props.actionLabel || $t('__actionAdd'), item: itemLabel || $t('__fieldDatasetItem') })"
    :submit-button-text="props.submitButtonText"
    :on-submit="submit"
    :on-discard="props.onDiscard"
  >
    <template #body>
      <ResourceDatasetItemDataFormField
        v-model:form-data="state.formData"
        :item="state.formData"
        :field-names="props.fieldNames"
        :loading="state.isLoading"
      />
    </template>
  </AppForm>
</template>
