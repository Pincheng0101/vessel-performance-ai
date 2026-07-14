<script setup>
/**
 * @import { Workflow } from '~/models/server/workflow';
 */

/**
 * @type {Ref<Workflow>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});
</script>

<template>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldWorkflowName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.workflowName"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    :label="$t('__fieldComment')"
    :tooltip="$t('__tooltipWorkflowComment')"
  >
    <AppMarkdownEditor v-model="formData.definition.comment" />
  </AppInputGroup>
</template>
