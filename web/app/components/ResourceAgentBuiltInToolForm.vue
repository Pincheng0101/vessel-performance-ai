<script setup>
import { AgentConstant } from '~/constants';

const props = defineProps({
  tool: {
    type: Object,
    required: true,
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
  formData: {
    ...objUtils.toRaw(props.tool),
  },
});

const submit = async () => {
  await props.onSubmit(objUtils.toRaw(state.formData));
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: $t('__actionEdit'), item: props.tool.name })"
    :data="state.formData"
    :on-submit="submit"
    :on-discard="props.onDiscard"
  >
    <template #body>
      <template v-if="props.tool.id === AgentConstant.BuiltInToolType.BASH.value">
        <ResourceAgentBuiltInToolBashFormFields
          v-model:form-data="state.formData"
          :hidden-fields="['enable', 'trackToolResults']"
        />
      </template>
      <template v-else-if="props.tool.id === AgentConstant.BuiltInToolType.BROWSER.value">
        <ResourceAgentBuiltInToolBrowserFormFields
          v-model:form-data="state.formData"
          :hidden-fields="['enable', 'trackToolResults']"
        />
      </template>
      <template v-else-if="props.tool.id === AgentConstant.BuiltInToolType.CODE.value">
        <ResourceAgentBuiltInToolCodeFormFields
          v-model:form-data="state.formData"
          :hidden-fields="['enable', 'trackToolResults']"
        />
      </template>
    </template>
  </AppForm>
</template>
