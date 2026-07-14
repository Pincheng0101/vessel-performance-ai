<script setup>
import { ResourceConstant, RetrieverConstant } from '~/constants';

const props = defineProps({
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  notFoundResource: {
    type: Object,
    default: () => {},
  },
});

const embeddingModelId = defineModel('embeddingModelId', {
  type: String,
  default: null,
});

const filterQuery = defineModel('filterQuery', {
  type: [String, Object, Array],
  default: null,
});
</script>

<template>
  <ResourceEmbeddingModelPaginatedSelect
    v-if="!props.hiddenFields.includes('embeddingModelId')"
    v-model="embeddingModelId"
    :return-object="false"
    :tooltip="$t('__tooltipResourceRetrieverEmbeddingModel')"
    :not-found-object-id="props.notFoundResource?.type === ResourceConstant.Type.EMBEDDING_MODEL.module ? props.notFoundResource.id : null"
    clearable
  />
  <AppFormFieldExpansionPanels>
    <AppFormFieldExpansionPanel :title="$t('__titleAdvancedSettings')">
      <AppInputGroup
        v-if="!props.hiddenFields.includes('filterQuery')"
        v-slot="{ id, label }"
        :label="$t('__fieldFilterQuery')"
        :tooltip="$t('__tooltipWorkflowActionFilterQuery')"
      >
        <AppJsonEditor
          :id="id"
          v-model:object="filterQuery"
          enable-json-path-binding-linter
          :rules="(
            $validator
              .defineField(label)
              .json()
              .jsonSchema(RetrieverConstant.ActionExecutionParams.RETRIEVER_FILTER_QUERY.jsonSchema)
              .apply('jsonPathBinding')
              .collect()
          )"
          @blur="props.onUpdate"
        />
      </AppInputGroup>
    </AppFormFieldExpansionPanel>
  </AppFormFieldExpansionPanels>
</template>
