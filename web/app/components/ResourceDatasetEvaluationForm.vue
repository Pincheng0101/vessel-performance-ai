<script setup>
import { LlmConstant } from '~/constants';
import { LlmFactory } from '~/models/server/llm';

const props = defineProps({
  dataset: {
    type: Object,
    default: null,
  },
});

const isExpanded = defineModel('expanded', {
  type: Boolean,
  default: true,
});

const formData = defineModel('formData', {
  type: Object,
  default: () => ({
    llmResource: null,
    systemPrompt: '',
    userPrompt: '',
  }),
});

const { createVariableHighlightExtension, variableCompletion } = useEditor();

const formRef = ref(null);

const state = reactive({
  isLoading: false,
  fieldNames: props.dataset?.inputFields?.map(field => field.name) || [],
});

if (!formData.value.llmResource) {
  formData.value.llmResource = LlmFactory.create({
    llmId: LlmConstant.DefaultLlm.ID,
    llmType: LlmConstant.DefaultLlm.TYPE,
    llmName: LlmConstant.DefaultLlm.NAME,
  });
}

const variableHighlightExtensions = computed(() => {
  return [createVariableHighlightExtension({
    getAllowedKeys: () => new Set(state.fieldNames || []),
  })];
});

const variableHighlightKey = computed(() => (state.fieldNames || []).join('|'));

watch(() => props.dataset, (after) => {
  state.fieldNames = after?.inputFields?.map(field => field.name) || [];
});
</script>

<template>
  <AppForm
    ref="formRef"
    :form-title="$t('__fieldInput')"
  >
    <template #actions>
      <AppExpandToggleButton v-model:expanded="isExpanded" />
    </template>
    <template #body>
      <AppInputGroup
        :label="$t('__fieldVariable', 2)"
        :tooltip="$t('__tooltipResourceDatasetEvaluationVariable')"
      >
        <template #default>
          <AppCombobox
            v-model="state.fieldNames"
            readonly
          />
        </template>
      </AppInputGroup>
      <ResourceLlmPaginatedSelect
        v-model="formData.llmResource"
        v-model:restored-objects="formData.llmResource"
        :tooltip="$t('__tooltipResourceDatasetEvaluationLlm')"
        required
      />
      <AppInputGroup
        :label="$t('__fieldSystemPrompt')"
        :tooltip="$t('__tooltipResourceDatasetEvaluationLlmSystemPrompt')"
      >
        <template #default>
          <AppTextarea v-model="formData.systemPrompt" />
        </template>
      </AppInputGroup>
      <AppInputGroup
        :label="$t('__fieldUserPrompt')"
        :tooltip="$t('__tooltipResourceDatasetEvaluationLlmUserPrompt')"
      >
        <template #default>
          <AppJinjaEditor
            :key="`user-${variableHighlightKey}`"
            v-model="formData.userPrompt"
            :loading="state.isLoading"
            :disabled="state.isLoading"
            :extensions="variableHighlightExtensions"
            :max-lines="10"
            :autocompletion-override="[(context) => variableCompletion({ context, variables: state.fieldNames, matcher: /\{\{([a-zA-Z0-9_]*)$/ })]"
          >
            <template #prepend-tools>
              <PromptRewriteButton
                v-model:prompt="formData.userPrompt"
                v-model:loading="state.isLoading"
                :variables="state.fieldNames"
                :target-llm-id="formData.llmResource?.llmId"
                :target-llm-type="formData.llmResource?.llmType"
                :target-model="formData.llmResource?.model"
                :hidden-fields="['targetModel', 'targetLlmType', 'targetLlmId', 'targetLlmSource', 'endpointUrl']"
              />
            </template>
          </AppJinjaEditor>
        </template>
      </AppInputGroup>
    </template>
  </AppForm>
</template>
