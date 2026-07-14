<script setup>
import { PromptRewriterExecutionConstant } from '~/constants';
import { LlmFactory } from '~/models/server/llm';

/**
 * @import { Llm } from '~/models/server/llm'
 */

const props = defineProps({
  variables: {
    type: Array,
    default: () => [],
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  isGenerateMode: {
    type: Boolean,
    default: false,
  },
});

const formData = defineModel('formData', {
  type: Object,
  default: {},
});

const executionLlmSettingsDialogRef = ref(null);
const { createVariableHighlightExtension, variableCompletion } = useEditor();

const state = reactive({
  draftExecutionLlmFormData: null,
  restoredExecutionLlm: null,
});

{
  if (formData.value?.executionLlm) {
    formData.value.executionLlm = LlmFactory.create(formData.value.executionLlm);
    state.restoredExecutionLlm = formData.value.executionLlm;
  }
  if (!Array.isArray(formData.value?.attachments)) {
    formData.value.attachments = [];
  }
}

/**
 * @param {Llm} v
 */
const handleExecutionLlmChange = (v) => {
  if (!v) return;
  if (objUtils.isObject(v) && v.id) return;
  syncExecutionLlm(v);
};

/**
 * @param {Llm} v
 */
const syncExecutionLlm = (v) => {
  if (!v) return;
  const llm = LlmFactory.create({
    ...v,
  });
  formData.value.executionLlm = llm;
};

const updateExecutionLlm = () => {
  Object.assign(formData.value.executionLlm, state.draftExecutionLlmFormData);
};

const rewriteInstructionVariableHighlightExtensions = computed(() => {
  if (props.variables.length === 0) return [];
  return [createVariableHighlightExtension({
    getAllowedKeys: () => new Set(props.variables || []),
    validateAllowedKeys: props.variables.length > 0,
  })];
});

const rewriteInstructionAutocompletionOverride = computed(() => {
  if (props.variables.length === 0) return [];
  return [context => variableCompletion({ context, variables: props.variables, matcher: /\{\{([a-zA-Z0-9_]*)$/ })];
});

const rewriteInstructionVariableHighlightKey = computed(() => (props.variables || []).join('|'));
</script>

<template>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('rewriteInstruction')"
    v-slot="{ id }"
    :label="$t(props.isGenerateMode ? '__fieldPromptRewriterGenerateInstruction' : '__fieldPromptRewriterRewriteInstruction')"
    :tooltip="$t('__tooltipPromptRewriterInstruction')"
  >
    <AppJinjaEditor
      :id="id"
      :key="`rewrite-instruction-${rewriteInstructionVariableHighlightKey}`"
      v-model="formData.rewriteInstruction"
      :max-length="10"
      :extensions="rewriteInstructionVariableHighlightExtensions"
      :autocompletion-override="rewriteInstructionAutocompletionOverride"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('constraints')"
    v-slot="{ id }"
    :label="$t('__fieldPromptRewriterConstraints')"
    :tooltip="$t('__tooltipPromptRewriterConstraints')"
  >
    <AppCombobox
      :id="id"
      v-model="formData.constraints"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('promptLanguage')"
    v-slot="{ id }"
    :label="$t('__fieldPromptRewriterPromptLanguage')"
    :tooltip="$t('__tooltipPromptRewriterPromptLanguage')"
  >
    <AppSelect
      :id="id"
      v-model="formData.promptLanguage"
      :items="Object.values(PromptRewriterExecutionConstant.PromptLanguage).map(lang => ({ value: lang.value, title: $t(lang.i18nTitle) }))"
    />
  </AppInputGroup>
  <AppFormFieldExpansionPanels>
    <AppFormFieldExpansionPanel :title="$t('__titleAdvancedSettings')">
      <PromptRewriteTargetLlmFormFields
        v-if="!props.hiddenFields.includes('targetLlm')"
        v-model:target-llm-type="formData.targetLlmType"
        v-model:target-model="formData.targetModel"
        v-model:target-llm-id="formData.targetLlmId"
        v-model:endpoint-url="formData.ollamaEndpointUrl"
        :hidden-fields="props.hiddenFields"
      />
      <ResourceLlmPaginatedSelect
        v-if="!props.hiddenFields.includes('executionLlm')"
        v-model="formData.executionLlm"
        v-model:restored-objects="state.restoredExecutionLlm"
        :field-name="$t('__fieldExecutionLlm')"
        required
        :tooltip="$t('__tooltipPromptRewriterExecutionLlm')"
        @update:model-value="handleExecutionLlmChange"
        @update:restored-objects="(v) => {
          if (!v) return;
          syncExecutionLlm(v);
        }"
      >
        <template #append>
          <AppDialog
            ref="executionLlmSettingsDialogRef"
            :on-submit="updateExecutionLlm"
          >
            <template #activator="{ onOpen }">
              <template v-if="formData.executionLlm">
                <AppIconButton
                  icon="mdi-tune"
                  variant="text"
                  aria-label="Tune Execution LLM Settings"
                  @click="() => {
                    state.draftExecutionLlmFormData = formData.executionLlm;
                    onOpen();
                  }"
                />
              </template>
            </template>
            <template #body="{ onSubmit, onCancel }">
              <AppForm
                :form-title="$t('__titleModifyItem', { action: $t('__actionConfigure'), item: formData.executionLlm ? formData.executionLlm.llmName : '' })"
                :on-submit="onSubmit"
                :on-discard="onCancel"
              >
                <template #body>
                  <ResourceLlmFormFields
                    :key="formData.executionLlm.id"
                    v-model:form-data="state.draftExecutionLlmFormData"
                    :resource="formData.executionLlm"
                    :hidden-fields="['llmName', 'llmType', 'apiKey', 'endpointUrl', 'region', 'crossRegionInference', 'model', 'credentialType']"
                    input-layout="narrow"
                  />
                </template>
              </AppForm>
            </template>
          </AppDialog>
        </template>
      </ResourceLlmPaginatedSelect>
      <AppInputGroup
        v-if="!props.hiddenFields.includes('attachments')"
        v-slot="{ id }"
        :label="$t('__fieldAttachment', 2)"
        :tooltip="$t('__tooltipPromptRewriterAttachments')"
      >
        <PromptRewriteAttachmentTable
          :id="id"
          v-model="formData.attachments"
          :llm-type="formData.executionLlm?.llmType"
        />
      </AppInputGroup>
      <AppInputGroup
        v-if="!props.hiddenFields.includes('contentSafety')"
        v-slot="{ id, label }"
        :label="$t('__fieldPromptRewriterEnableContentSafety')"
        :tooltip="$t('__tooltipPromptRewriterContentSafety')"
        required
      >
        <AppSwitch
          :id="id"
          v-model="formData.extensions.contentSafety"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
        />
      </AppInputGroup>
      <AppInputGroup
        v-if="!props.hiddenFields.includes('privacyProtection')"
        v-slot="{ id, label }"
        :label="$t('__fieldPromptRewriterEnablePrivacyProtection')"
        :tooltip="$t('__tooltipPromptRewriterPrivacyProtection')"
        required
      >
        <AppSwitch
          :id="id"
          v-model="formData.extensions.privacyProtection"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
        />
      </AppInputGroup>
    </AppFormFieldExpansionPanel>
  </AppFormFieldExpansionPanels>
</template>
