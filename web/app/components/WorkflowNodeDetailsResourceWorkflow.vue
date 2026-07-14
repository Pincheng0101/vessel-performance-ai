<script setup>
import { ResourceConstant } from '~/constants';
import { Workflow } from '~/models/server/workflow';

const props = defineProps({
  workflowResource: {
    type: Workflow,
    default: null,
  },
});
</script>

<template>
  <template v-if="props.workflowResource">
    <WorkflowNodeDetailsGroup>
      <WorkflowNodeDetails
        :icon="ResourceConstant.Type.WORKFLOW.icon"
        :text="props.workflowResource.name"
      />
    </WorkflowNodeDetailsGroup>
  </template>
</template>
