<script setup>
/**
 * @import { Workflow } from '~/models/server/workflow'
 */

/**
 * @type {{ workflow: Workflow }}
 */
const props = defineProps({
  workflow: {
    type: Object,
    required: true,
  },
  onWorkflowConfigChange: {
    type: Function,
    default: null,
  },
});

const dialogConfigRef = ref(null);

const openConfigDialog = () => {
  if (dialogConfigRef.value) {
    dialogConfigRef.value.open();
  }
};
</script>

<template>
  <div class="d-flex align-center ga-1">
    <!-- Max width: button width - icon width -->
    <v-sheet
      :max-width="240 - 32"
      class="text-truncate font-weight-medium bg-transparent"
    >
      {{ props.workflow.workflowName }}
    </v-sheet>
    <AppIconButton
      variant="text"
      icon="mdi-pencil-outline"
      class="opacity-70"
      icon-size="16"
      :ripple="false"
      @click="openConfigDialog"
    />
  </div>
  <AppDialog
    ref="dialogConfigRef"
    :width="1000"
    :on-submit="props.onWorkflowConfigChange"
  >
    <template #body="{ onSubmit, onCancel }">
      <WorkflowConfigForm
        :resource="props.workflow"
        :on-submit="onSubmit"
        :on-cancel="onCancel"
      />
    </template>
  </AppDialog>
</template>
