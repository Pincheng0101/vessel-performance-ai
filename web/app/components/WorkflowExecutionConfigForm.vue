<script setup>
/**
 * @import { WorkflowExecution } from '~/models/server/workflowExecution'
 */

/**
 * @type {{ resource: WorkflowExecution }}
 */
const props = defineProps({
  execution: {
    type: Object,
    default: () => {},
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
   * @type {WorkflowExecution}
   */
  formData: {
    displayName: props.execution.displayName,
  },
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
    :form-title="$t('__titleModifyItem', { action: $t('__actionEdit'), item: $t('__fieldExecution') })"
    :on-submit="submit"
    :on-discard="props.onCancel"
  >
    <template #body>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldName')"
        required
      >
        <AppTextField
          :id="id"
          v-model="state.formData.displayName"
          autofocus
          :rules="(
            $validator
              .defineField(label)
              .required()
              .collect()
          )"
        />
      </AppInputGroup>
    </template>
  </AppForm>
</template>
