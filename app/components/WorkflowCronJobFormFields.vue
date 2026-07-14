<script setup>
import { StatusConstant } from '~/constants';

/**
 * @import { WorkflowCron } from '~/models/server/workflowCron'
 */

const props = defineProps({
  inputSchema: {
    type: Object,
    default: null,
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
});

/**
 * @type {Ref<WorkflowCron>}
 */
const formData = defineModel('formData', {
  type: Object,
  default: {},
});

const state = reactive({
  refresh: 0,
});
</script>

<template>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldName')"
    required
  >
    <AppTextField
      :id="id"
      v-model="formData.workflowCronName"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-slot="{ id, label }"
    :label="$t('__fieldCronJob')"
    :tooltip="$t('__tooltipWorkflowCronJob')"
    required
  >
    <AppCronInput
      :id="id"
      v-model="formData.cron"
      :rules="(
        $validator
          .defineField(label)
          .required()
          .collect()
      )"
    />
  </AppInputGroup>
  <AppInputGroup
    v-if="!props.hiddenFields.includes('status')"
    v-slot="{ id }"
    :label="$t('__fieldEnabled')"
  >
    <AppSwitch
      :id="id"
      v-model="formData.status"
      :false-value="StatusConstant.Runtime.INACTIVE.value"
      :true-value="StatusConstant.Runtime.ACTIVE.value"
    />
  </AppInputGroup>
  <AppJsonSchemaRendererInputGroup
    :key="state.refresh"
    v-model:form-data="formData.stateInput"
    :label="$t('__fieldInput')"
    :schema="props.inputSchema"
    :validate-with-schema="!!props.inputSchema"
  />
  <AppFormFieldExpansionPanels>
    <AppFormFieldExpansionPanel :title="$t('__titleAdvancedSettings')">
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldUploadInputToExternalMemory')"
        :tooltip="$t('__tooltipWorkflowUseExternalMemoryInput')"
      >
        <AppSwitch
          :id="id"
          v-model="formData.useExternalMemoryInput"
        />
      </AppInputGroup>
      <AppInputGroup
        v-if="formData.useExternalMemoryInput"
        v-slot="{ id, label }"
        :label="$t('__fieldStateMemoryInputSelector')"
        :tooltip="$t('__tooltipWorkflowStateMemoryInputSelector')"
      >
        <AppJsonEditor
          :id="id"
          v-model:object="formData.stateMemoryInputSelector"
          :rules="(
            $validator
              .defineField(label)
              .json()
              .collect()
          )"
        />
      </AppInputGroup>
    </AppFormFieldExpansionPanel>
  </AppFormFieldExpansionPanels>
</template>
