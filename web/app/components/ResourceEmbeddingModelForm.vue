<script setup>
import { ResourceConstant } from '~/constants';

/**
 * @import { EmbeddingModel } from '~/models/server/embeddingModel'
 */

/**
 * @type {{ resource: EmbeddingModel }}
 */
const props = defineProps({
  resource: {
    type: Object,
    default: null,
  },
  hiddenFields: {
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
  /**
   * @type {EmbeddingModel}
   */
  formData: {},
});

if (props.resource) {
  state.formData = objUtils.toRaw(props.resource);
}

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit(formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: props.resource ? $t('__actionEdit') : $t('__actionCreate'), item: $t('__fieldEmbeddingModel') })"
    :icon="ResourceConstant.Type.EMBEDDING_MODEL.icon"
    :data="state.formData"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <ResourceEmbeddingModelFormFields
        v-model:form-data="state.formData"
        :resource="props.resource"
        :hidden-fields="props.hiddenFields"
      />
    </template>
  </AppForm>
</template>
