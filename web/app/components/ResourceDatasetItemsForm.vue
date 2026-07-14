<script setup>
const props = defineProps({
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
  formData: [],
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
    :form-title="$t('__titleModifyItem', { action: props.actionLabel || $t('__actionAdd'), item: itemLabel || $t('__fieldDatasetItem', 2) })"
    :on-submit="submit"
    :on-discard="props.onDiscard"
  >
    <template #body>
      <ResourceDatasetItemCreateTable
        v-model="state.formData"
        :field-names="props.fieldNames"
        :loading="state.isLoading"
      />
    </template>
  </AppForm>
</template>
