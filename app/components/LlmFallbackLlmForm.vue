<script setup>
/**
 * @import { LlmActionExecutionPayload } from '~/models/server/llm'
 */

const props = defineProps({
  item: {
    type: Object,
    default: null,
  },
  enableReferencePathSwitch: {
    type: Boolean,
    default: true,
  },
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
  onSubmit: {
    type: Function,
    required: true,
  },
  onDiscard: {
    type: Function,
    required: true,
  },
  onResourcesUpdate: {
    type: Function,
    default: () => {},
  },
});

const state = reactive({
  /**
   * @type {LlmActionExecutionPayload}
   */
  formData: {},
});

if (props.item) {
  state.formData = objUtils.toRaw(props.item);
}

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit(formData);
};

const cancel = () => {
  state.formData = props.item ? objUtils.toRaw(props.item) : {};
  props.onDiscard();
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: props.item ? $t('__actionEdit') : $t('__actionCreate'), item: $t('__fieldLlmFallbackLlm') })"
    :on-submit="submit"
    :on-discard="cancel"
  >
    <template #body>
      <LlmFallbackLlmFormFields
        v-model:form-data="state.formData"
        :enable-reference-path-switch="props.enableReferencePathSwitch"
        :resource-map="props.resourceMap"
        :messages="props.messages"
        :json-schema="props.jsonSchema"
        :hidden-fields="props.hiddenFields"
        :on-resources-update="props.onResourcesUpdate"
      />
    </template>
  </AppForm>
</template>
