<script setup>
import { DatasetConstant } from '~/constants';

const props = defineProps({
  onSubmit: {
    type: Function,
    required: true,
  },
  onDiscard: {
    type: Function,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

const state = reactive({
  formData: {
    fieldType: DatasetConstant.FieldType.INPUT_FIELD,
    fields: [],
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
    :form-title="$t('__titleModifyItem', { action: $t('__actionAdd'), item: $t('__titleColumn') })"
    :submit-button-text="$t('__actionAdd')"
    :on-submit="submit"
    :on-discard="props.onDiscard"
  >
    <template #body>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldType')"
        class="pb-3"
        required
      >
        <AppSelect
          :id="id"
          v-model="state.formData.fieldType"
          :items="[
            { title: $t('__fieldInputField'), value: DatasetConstant.FieldType.INPUT_FIELD },
            { title: $t('__fieldOutputField'), value: DatasetConstant.FieldType.OUTPUT_FIELD },
          ]"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
          hide-details
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ label }"
        :label="$t('__fieldField', 2)"
        required
      >
        <ResourceDatasetFieldTable
          v-model="state.formData.fields"
          :loading="props.loading || state.isLoading"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
        />
      </AppInputGroup>
    </template>
  </AppForm>
</template>
