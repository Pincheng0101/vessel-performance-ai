<script setup>
import { ResourceConstant } from '~/constants';

/**
 * @import { KnowledgeBase } from '~/models/server/knowledgeBase'
 */

/**
 * @type {{ resource: KnowledgeBase }}
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
   * @type {KnowledgeBase}
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
    :form-title="$t('__titleModifyItem', { action: props.resource ? $t('__actionEdit') : $t('__actionCreate'), item: $t('__fieldKnowledgeBase') })"
    :icon="ResourceConstant.Type.KNOWLEDGE_BASE.icon"
    :data="state.formData"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <ResourceKnowledgeBaseFormFields
        v-model:form-data="state.formData"
        :resource="props.resource"
        :hidden-fields="props.hiddenFields"
      />
    </template>
  </AppForm>
</template>
