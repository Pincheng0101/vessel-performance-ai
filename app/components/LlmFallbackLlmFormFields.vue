<script setup>
import { JsonSchemaConstant, LlmConstant } from '~/constants';
import { Llm, LlmActionExecutionPayloadFactory, LlmFactory } from '~/models/server/llm';

const props = defineProps({
  resourceMap: {
    type: Object,
    default: null,
  },
  messages: {
    type: [Array, String],
    default: () => [],
  },
  jsonSchema: {
    type: Object,
    default: () => ({}),
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  enableReferencePathSwitch: {
    type: Boolean,
    default: true,
  },
  onResourcesUpdate: {
    type: Function,
    default: () => {},
  },
});

const formData = defineModel('formData', {
  type: Object,
  default: {},
});

const state = reactive({
  /**
   * @type {ReturnType<typeof LlmFactory.create>}
   */
  llmResource: null,
  draftFormData: null,
});

{
  if (formData.value?.llmId) {
    const restoredLlm = props.resourceMap?.[formData.value.llmId] || LlmFactory.create(formData.value);
    if (restoredLlm) {
      state.llmResource = restoredLlm;
    }
  }
  // Restore the model because it is not defined in the LlmActionExecutionPayload
  if (state.llmResource instanceof Llm) {
    formData.value.model = state.llmResource.model;
    formData.value.llmName = state.llmResource.llmName;
  }
};

/**
 * @param {Llm} v
 */
const handleLlmResourceChange = (v) => {
  if (!v) return;
  if (objUtils.isObject(v) && v.id) return;
  syncFormDataWithLlmResource(v);
};

/**
 * @param {Llm} v
 */
const syncFormDataWithLlmResource = (v) => {
  if (!v) return;

  if (referencePathUtils.isReferencePath(v)) {
    formData.value = v;
    return;
  }

  const llm = LlmActionExecutionPayloadFactory.create({
    ...formData.value,
    ...v,
  });
  // Restore the model because it is not defined in the payload
  if (v instanceof Llm) {
    llm.model = v.model;
    llm.llmName = v.llmName;
    // Initialize messages only when llmId is first selected
    if (!formData.value.llmId) {
      llm.messages = props.messages;
      if (!props.hiddenFields.includes('jsonSchema')) {
        llm.jsonSchema = props.jsonSchema;
      }
    }
    if (!formData.value.guardrailVersion) {
      llm.guardrailVersion = LlmConstant.ActionExecutionParams.GUARDRAILS.version;
    }
  }
  formData.value = llm;
};

const update = () => {
  Object.assign(formData.value, {
    ...state.draftFormData,
    systemPrompt: strUtils.isEmpty(state.draftFormData.systemPrompt) ? null : state.draftFormData.systemPrompt,
  });
};
</script>

<template>
  <!-- Bind "restored-objects" to apply the default value -->
  <ResourceLlmPaginatedSelect
    v-model="state.llmResource"
    v-model:restored-objects="state.llmResource"
    required
    aria-label="Select Fallback LLM"
    @update:model-value="handleLlmResourceChange"
    @update:restored-objects="(v) => {
      if (!v) return;
      syncFormDataWithLlmResource(v);
      if (objUtils.isObject(v) && v.id) {
        props.onResourcesUpdate(v);
      }
    }"
  >
    <template #append>
      <AppDialog
        ref="dialogRef"
        :on-submit="update"
      >
        <template #activator="{ onOpen }">
          <template v-if="formData.llmId">
            <AppIconButton
              icon="mdi-tune"
              variant="text"
              aria-label="Tune LLM Settings"
              @click="() => {
                state.draftFormData = { ...formData };
                onOpen();
              }"
            />
          </template>
        </template>
        <template #body="{ onSubmit, onCancel }">
          <AppForm
            :form-title="$t('__titleModifyItem', { action: $t('__actionConfigure'), item: state.llmResource ? state.llmResource.llmName : '' })"
            :on-submit="onSubmit"
            :on-discard="onCancel"
          >
            <template #body>
              <ResourceLlmFormFields
                :key="state.llmResource.id"
                v-model:form-data="state.draftFormData"
                :resource="state.llmResource"
                :hidden-fields="['llmName', 'llmType', 'apiKey', 'endpointUrl', 'region', 'crossRegionInference', 'model', 'credentialType', 'effort']"
                input-layout="narrow"
                enable-state-input-switch
              />
            </template>
          </AppForm>
        </template>
      </AppDialog>
    </template>
  </ResourceLlmPaginatedSelect>
  <template v-if="(state.llmResource instanceof Llm) && formData">
    <ReferencePathInputGroup
      v-model="formData.messages"
      :label="$t('__fieldMessage', 2)"
      :tooltip="$t('__tooltipWorkflowActionMessages')"
      required
    >
      <template #default="{ label }">
        <LlmMessageTable
          v-model="formData.messages"
          :llm-type="formData.llmType"
          :aria-label="label"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
        />
      </template>
    </ReferencePathInputGroup>
    <template v-if="!props.hiddenFields.includes('jsonSchema')">
      <ReferencePathInputGroup
        v-model="formData.jsonSchema"
        :default-value="JsonSchemaConstant.Base.DEFAULT_SCHEMA"
        :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
        :label="$t('__fieldJsonSchema')"
        :schema="JsonSchemaConstant.Base.META_SCHEMA"
        :on-update="update"
        required
        enable-json-switch
      >
        <template #default="{ label }">
          <AppJsonSchemaBuilderInput
            v-model:form-data="formData.jsonSchema"
            :label="label"
            :rules="(
              $validator
                .defineField(label)
                .required()
                .collect()
            )"
          />
        </template>
      </ReferencePathInputGroup>
    </template>
    <AppFormFieldExpansionPanels>
      <AppFormFieldExpansionPanel :title="$t('__titleAdvancedActionSettings')">
        <ReferencePathInputGroup
          v-model="formData.guardrailId"
          :label="$t('__fieldGuardrailId')"
          :tooltip="$t('__tooltipWorkflowActionGuardrailId')"
        >
          <template #default="{ id }">
            <AppTextField
              :id="id"
              v-model="formData.guardrailId"
            />
          </template>
        </ReferencePathInputGroup>
        <ReferencePathInputGroup
          v-model="formData.guardrailVersion"
          :default-value="LlmConstant.ActionExecutionParams.GUARDRAILS.version"
          :label="$t('__fieldGuardrailVersion')"
          :tooltip="$t('__tooltipWorkflowActionGuardrailVersion')"
        >
          <template #default="{ id }">
            <AppTextField
              :id="id"
              v-model="formData.guardrailVersion"
            />
          </template>
        </ReferencePathInputGroup>
      </AppFormFieldExpansionPanel>
    </AppFormFieldExpansionPanels>
  </template>
</template>
