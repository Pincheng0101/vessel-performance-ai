<script setup>
import { LlmConstant } from '~/constants';

/**
 * @import { MessageActionExecutionPayload } from '~/models/server/message'
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
  llmType: {
    type: String,
    default: '',
  },
  llmId: {
    type: String,
    default: '',
  },
  onlyUserRole: {
    type: Boolean,
    default: false,
  },
  enableReferencePathSwitch: {
    type: Boolean,
    default: true,
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
   * @type {MessageActionExecutionPayload}
   */
  formData: {
    role: LlmConstant.MessageRole.USER.value,
  },
});

if (props.item) {
  state.formData = objUtils.toRaw(props.item);
}

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit(formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: props.item ? $t('__actionEdit') : $t('__actionCreate'), item: $t('__fieldMessage') })"
    :on-submit="submit"
    :on-discard="onDiscard"
  >
    <template #body>
      <LlmMessageFormFields
        v-model:form-data="state.formData"
        :llm-type="props.llmType"
        :llm-id="props.llmId"
        :only-user-role="props.onlyUserRole"
        :enable-reference-path-switch="props.enableReferencePathSwitch"
      />
    </template>
  </AppForm>
</template>
