<script setup>
/**
 * @import { EmbeddingModel } from '~/models/server/embeddingModel
 * @import { RetrieverActionExecutionPayload } from '~/models/server/retriever'
 */

/**
 * @type {{ source: RetrieverActionExecutionPayload }}
 */
const props = defineProps({
  item: {
    type: Object,
    default: null,
  },
  resources: {
    type: Object,
    default: null,
  },
  onDiscard: {
    type: Function,
    default: () => {},
  },
  onResourcesUpdate: {
    type: Function,
    default: () => {},
  },
  onSubmit: {
    type: Function,
    default: () => {},
  },
});

const state = reactive({
  /**
   * @type {RetrieverActionExecutionPayload}
   */
  formData: {},
});

if (props.item) {
  /**
   * @type {RetrieverActionExecutionPayload}
   */
  state.formData = objUtils.toRaw(props.item);
}

const submit = async () => {
  /**
   * @type {RetrieverActionExecutionPayload}
   */
  const formData = objUtils.toRaw({
    ...state.formData,
  });
  await props.onSubmit(formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: props.item ? $t('__actionEdit') : $t('__actionAdd'), item: $t('__fieldRetriever') })"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <ActionRetrieverFormFields
        v-model:form-data="state.formData"
        :resources="props.resources"
        :on-resources-update="props.onResourcesUpdate"
      />
      <AppFormFieldExpansionPanels>
        <AppFormFieldExpansionPanel :title="$t('__titleAdvancedSettings')">
          <ActionRetrieverFormAdvancedFields v-model:form-data="state.formData" />
        </AppFormFieldExpansionPanel>
      </AppFormFieldExpansionPanels>
    </template>
  </AppForm>
</template>
