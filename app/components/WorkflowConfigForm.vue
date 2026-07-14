<script setup>
/**
 * @import { Workflow } from '~/models/server/workflow'
 */

/**
 * @type {{ resource: Workflow }}
 */
const props = defineProps({
  resource: {
    type: Object,
    default: null,
  },
  onSubmit: {
    type: Function,
    default: () => {},
  },
  onCancel: {
    type: Function,
    default: () => {},
  },
});

const state = reactive({
  /**
   * @type {Workflow}
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
    :form-title="$t('__titleModifyItem', { action: $route.name === 'workflows' ? $t('__actionCreate') : $t('__actionEdit'), item: $t('__fieldWorkflow') })"
    :on-submit="submit"
    :on-discard="props.onCancel"
  >
    <template #body>
      <WorkflowConfigFormFields v-model:form-data="state.formData" />
    </template>
  </AppForm>
</template>
