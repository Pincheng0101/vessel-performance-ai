<script setup>
import { IconConstant } from '~/constants';
/**
 * @import { WorkflowCron } from '~/models/server/workflowCron'
 */

const props = defineProps({
  resource: {
    type: Object,
    default: null,
  },
  inputSchema: {
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
  onCancel: {
    type: Function,
    default: null,
  },
});

const state = reactive({
  /**
   * @type {WorkflowCron}
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
    :form-title="$t('__titleModifyItem', { action: props.resource ? $t('__actionEdit') : $t('__actionCreate'), item: $t('__titleSchedule') })"
    :icon="IconConstant.Base.CRON_JOB"
    :data="state.formData"
    :on-submit="submit"
  >
    <template #body>
      <WorkflowCronJobFormFields
        v-model:form-data="state.formData"
        :input-schema="props.inputSchema"
        :hidden-fields="props.hiddenFields"
      />
    </template>
  </AppForm>
</template>
