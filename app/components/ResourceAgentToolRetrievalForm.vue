<script setup>
import { AgentConstant, ResourceConstant } from '~/constants';

const props = defineProps({
  item: {
    type: Object,
    default: null,
  },
  usedNames: {
    type: Array,
    default: () => [],
  },
  notFoundResource: {
    type: Object,
    default: () => {},
  },
  hiddenFields: {
    type: Array,
    default: () => [],
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
  formData: {},
});

if (props.item) {
  state.formData = objUtils.toRaw(props.item);
}
state.formData.trackToolResults ??= AgentConstant.ToolType.RETRIEVAL.defaultTrackToolResults;

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit({
    ...formData,
    toolType: AgentConstant.ToolType.RETRIEVAL.value,
  });
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyToolItem', { action: props.item ? $t('__actionEdit') : $t('__actionAdd'), item: $t('__fieldRetrieval') })"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldName')"
        :tooltip="$t('__tooltipAgentToolName')"
        required
      >
        <AppTextField
          :id="id"
          v-model="state.formData.name"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .unique(props.usedNames, props.item ? props.item.name : null)
              .collect()
          )"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldTrackToolResults')"
        :tooltip="$t('__tooltipTrackToolResultsRetrieval')"
      >
        <AppSwitch
          :id="id"
          v-model="state.formData.trackToolResults"
        />
      </AppInputGroup>
      <ResourceKnowledgeBasePaginatedSelect
        v-model="state.formData.knowledgeBaseId"
        :return-object="false"
        :not-found-object-id="props.notFoundResource?.type === ResourceConstant.Type.KNOWLEDGE_BASE.module ? props.notFoundResource.id : null"
        required
      />
      <ResourceRetrieverPaginatedSelect
        v-model="state.formData.retrieverIds"
        :return-object="false"
        :not-found-object-id="props.notFoundResource?.type === ResourceConstant.Type.RETRIEVER.module ? props.notFoundResource.id : null"
        multiple-select
        required
      />
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldDataField', 2)"
        :tooltip="$t('__tooltipAgentRetrievalDataFields')"
      >
        <AppCombobox
          :id="id"
          v-model="state.formData.dataFields"
        />
      </AppInputGroup>
      <ResourceRankerPaginatedSelect
        v-model="state.formData.rankerId"
        :return-object="false"
        :not-found-object-id="props.notFoundResource?.type === ResourceConstant.Type.RANKER.module ? props.notFoundResource.id : null"
        clearable
      />
      <AppInputGroup
        v-if="!props.hiddenFields.includes('knowledgeDomain')"
        v-slot="{ id }"
        :label="$t('__fieldKnowledgeDomain')"
        :tooltip="$t('__tooltipAgentKnowledgeDomain')"
      >
        <AppTextField
          :id="id"
          v-model="state.formData.knowledgeDomain"
          @blur="() => {
            if (state.formData.knowledgeDomain) {
              state.formData.description = AgentConstant.DefaultParams.RETRIEVAL.descriptionTemplate.replaceAll('`{{ domain_name }}`', state.formData.knowledgeDomain);
            }
          }"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldDescription')"
        required
      >
        <AppTextarea
          :id="id"
          v-model="state.formData.description"
          :rows="10"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .stringLengthLte(AgentConstant.DefaultParams.DESCRIPTION.maxLength)
              .collect()
          )"
        />
      </AppInputGroup>
      <AppFormFieldExpansionPanels>
        <AppFormFieldExpansionPanel :title="$t('__titleAdvancedSettings')">
          <AppInputGroup
            v-slot="{ id, label }"
            :label="$t('__fieldDisplayName')"
            :tooltip="$t('__tooltipAgentDisplayName')"
          >
            <AppTextField
              :id="id"
              v-model="state.formData.displayName"
              :rules="(
                $validator
                  .defineField(label)
                  .stringLengthLte(64)
                  .collect()
              )"
            />
          </AppInputGroup>
          <ResourceAgentToolTagsField v-model:object="state.formData.tags" />
        </AppFormFieldExpansionPanel>
      </AppFormFieldExpansionPanels>
    </template>
  </AppForm>
</template>
