<script setup>
import { DataForgeConstant } from '~/constants';
import { LlmFactory } from '~/models/server/llm';

const props = defineProps({
  generationConfig: {
    type: Object,
    default: null,
  },
  dataset: {
    type: Object,
    default: null,
  },
  fieldNames: {
    type: Array,
    default: () => [],
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
  formData: {},
  isLoading: false,
});

{
  if (props.generationConfig) {
    state.formData = {
      ...state.formData,
      ...props.generationConfig,
    };
  }
}

const submit = async () => {
  state.isLoading = true;
  await props.onSubmit(state.formData);
  state.isLoading = false;
};
</script>

<template>
  <AppForm
    :form-title="$t('__actionGenerateDatasetItems')"
    :submit-button-text="$t('__actionGenerate')"
    :on-submit="submit"
    :on-discard="props.onDiscard"
  >
    <template #actions>
      <AppButton
        :aria-label="$t('__actionReset')"
        :text="$t('__actionReset')"
        color="primary"
        variant="outlined"
        :disabled="state.isLoading"
        :width="100"
        @click="() => {
          state.formData = {
            executionLlm: LlmFactory.create(DataForgeConstant.DefaultParams.EXECUTION_LLM),
            generationSize: DataForgeConstant.DefaultParams.GENERATION_SIZE.default,
          };
        }"
      />
    </template>
    <template #body>
      <ResourceDatasetItemGenerateFormField
        v-model:form-data="state.formData"
        :dataset="props.dataset"
        :field-names="props.fieldNames"
        :loading="state.isLoading"
      />
    </template>
  </AppForm>
</template>
