<script setup>
import { DatasetConstant } from '~/constants';

const props = defineProps({
  dataset: {
    type: Object,
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
  formData: {
    fields: [],
  },
  isLoading: false,
});

{
  const inputFields = arrUtils.cast(props.dataset?.inputFields || []).map(field => ({ ...field, fieldType: DatasetConstant.FieldType.INPUT_FIELD }));
  const outputFields = arrUtils.cast(props.dataset?.outputFields || []).map(field => ({ ...field, fieldType: DatasetConstant.FieldType.OUTPUT_FIELD }));
  state.formData.fields = inputFields.concat(outputFields);
}

const submit = async () => {
  state.isLoading = true;
  await props.onSubmit(state.formData);
  state.isLoading = false;
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: $t('__actionEdit'), item: $t('__titleColumn', 2) })"
    :on-submit="submit"
    :on-discard="props.onDiscard"
  >
    <template #body>
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__titleColumn')"
        required
      >
        <ResourceDatasetFieldTable
          :id="id"
          v-model="state.formData.fields"
          :loading="state.isLoading"
          :disabled-fields="['name']"
          :show-add-button="false"
          :show-remove-button="false"
        />
      </AppInputGroup>
    </template>
  </AppForm>
</template>
