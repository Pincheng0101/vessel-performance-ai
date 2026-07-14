<script setup>
import { JsonSchemaConstant, LlmConstant, StateConstant } from '~/constants';
import { Llm } from '~/models/server/llm';

/**
 * @import { LoaderSourceAugmentedField } from '~/models/server/loader/loaderSource'
 */

/**
 * @type {{ items: LoaderSourceAugmentedField[], item: LoaderSourceAugmentedField }}
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
   * @type {LoaderSourceAugmentedField}
   */
  formData: {
    llm: {},
  },
  /**
   * @type {Llm}
   */
  llmResource: null,
  useJsonSchema: false,
});

if (props.item) {
  state.formData = objUtils.toRaw(props.item);
  state.useJsonSchema = state.formData.actionType === StateConstant.ActionType.STRUCTURED_LLM.value;
  state.llmResource = state.formData.llm ? new Llm(state.formData.llm) : null;
}

const useContent = computed(() => props.item?.llm.content && !props.item?.llm.messages);

/**
 * @param {Llm} v
 */
const handleLlmChange = (v) => {
  Object.assign(state.formData.llm, v);
};

const handleUseJsonSchemaChange = (v) => {
  state.formData.llm.jsonSchema = v ? JsonSchemaConstant.Base.DEFAULT_SCHEMA : null;
  // Force re-validation by reassigning the fallbackLlms to clear previous validation errors
  state.formData.fallbackLlms = [...(state.formData.fallbackLlms || [])];
};

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  formData.actionType = state.useJsonSchema ? StateConstant.ActionType.STRUCTURED_LLM.value : StateConstant.ActionType.LLM.value;
  await props.onSubmit(formData);
};

const migrateContentToMessages = () => {
  if (!useContent.value) return;
  // Migrate the old content field to messages field
  state.formData.llm.messages = [
    {
      role: LlmConstant.MessageRole.USER.value,
      content: state.formData.llm.content,
    },
  ];
  delete state.formData.llm.content;
};

onMounted(() => {
  migrateContentToMessages();
});
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: props.item ? $t('__actionEdit') : $t('__actionAdd'), item: $t('__fieldAugmentedField') })"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldAugmentedFieldName')"
        required
      >
        <AppTextField
          :id="id"
          v-model="state.formData.augmentedFieldName"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .unique(props.items.map(item => item.augmentedFieldName), props.item ? props.item.augmentedFieldName : null)
              .notOneOf(['content', 'chunk', 'retriever_chunk'])
              .collect()
          )"
        />
      </AppInputGroup>
      <ResourceLlmPaginatedSelect
        v-model="state.llmResource"
        required
        @update:model-value="handleLlmChange"
      >
        <template #append>
          <AppDialog
            :on-submit="(formData) => {
              Object.assign(state.formData.llm, formData);
            }"
          >
            <template #activator="{ onOpen }">
              <AppIconButton
                v-if="state.formData.llm.llmId"
                icon="mdi-tune"
                variant="text"
                @click="onOpen"
              />
            </template>
            <template #body="{ onSubmit, onCancel }">
              <ResourceLlmForm
                :resource="state.formData.llm"
                :hidden-fields="['apiKey', 'llmName', 'llmType', 'region', 'crossRegionInference', 'model', 'credentialType', 'accountId', 'roleName', 'awsAccessKeyId', 'awsSecretAccessKey']"
                :allow-validate="false"
                :on-submit="onSubmit"
                :on-discard="onCancel"
                input-layout="narrow"
              />
            </template>
          </AppDialog>
        </template>
      </ResourceLlmPaginatedSelect>
      <template v-if="state.llmResource">
        <ReferencePathInputGroup
          v-model="state.formData.llm.messages"
          :label="$t('__fieldMessage', 2)"
          :enable-reference-path-switch="false"
          required
        >
          <template #default="{ label }">
            <LlmMessageTable
              v-model="state.formData.llm.messages"
              :enable-reference-path-switch="false"
              :llm-type="state.llmResource ? state.llmResource.llmType : null"
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
      </template>
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldUseJsonSchema')"
      >
        <AppSwitch
          :id="id"
          v-model="state.useJsonSchema"
          @update:model-value="handleUseJsonSchemaChange"
        />
      </AppInputGroup>
      <template v-if="state.useJsonSchema">
        <ReferencePathInputGroup
          v-model="state.formData.llm.jsonSchema"
          :default-value="JsonSchemaConstant.Base.DEFAULT_SCHEMA"
          :enable-reference-path-switch="false"
          :expected-value-types="[JsonSchemaConstant.DataType.OBJECT.value]"
          :label="$t('__fieldJsonSchema')"
          :schema="JsonSchemaConstant.Base.META_SCHEMA"
          enable-json-switch
          required
        >
          <template #default="{ label }">
            <AppJsonSchemaBuilderInput
              v-model:form-data="state.formData.llm.jsonSchema"
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
      <template v-if="state.formData.llm.llmId">
        <AppInputGroup
          v-slot="{ id, label }"
          :label="$t('__fieldLlmFallbackLlm', 2)"
          :tooltip="$t('__tooltipWorkflowActionLlmFallbackLlms')"
        >
          <LlmFallbackLlmTable
            :id="id"
            v-model="state.formData.fallbackLlms"
            :aria-label="label"
            :messages="state.formData.llm.messages"
            :json-schema="state.useJsonSchema ? state.formData.llm.jsonSchema : null"
            :hidden-fields="state.useJsonSchema ? [] : ['jsonSchema']"
            :rules="(
              $validator
                .defineField(label)
                .when({
                  fallbackLlmHasJsonSchema: state.useJsonSchema,
                })
                .apply('fallbackLlmHasJsonSchema')
                .collect()
            )"
          />
        </AppInputGroup>
      </template>
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldAllowRetry')"
        :tooltip="$t('__tooltipWorkflowActionRetry')"
      >
        <AppSwitch
          :id="id"
          v-model="state.formData.retry"
        />
      </AppInputGroup>
    </template>
  </AppForm>
</template>
