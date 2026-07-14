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
  disabledFields: {
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
  availableNames: {
    type: Array,
    default: () => [],
  },
  usedNames: {
    type: Array,
    default: () => [],
  },
});

const state = reactive({
  formData: props.item
    ? objUtils.toRaw(props.item)
    : {
        name: '',
        description: '',
      },
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
    :form-title="$t('__titleModifyItem', { action: props.actionLabel || $t('__actionAdd'), item: itemLabel || $t('__fieldField') })"
    :submit-button-text="props.submitButtonText"
    :on-submit="submit"
    :on-discard="props.onDiscard"
  >
    <template #body>
      <ResourceDatasetFieldFormField
        v-model:form-data="state.formData"
        :item="state.formData"
        :disabled-fields="props.disabledFields"
        :available-names="props.availableNames"
        :used-names="props.usedNames"
        :loading="state.isLoading"
      />
    </template>
  </AppForm>
</template>
