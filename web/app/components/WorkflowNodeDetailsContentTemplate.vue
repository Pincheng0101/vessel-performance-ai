<script setup>
import { ActionExecutionConstant } from '~/constants';

const props = defineProps({
  contentTemplate: {
    type: String,
    default: null,
  },
});
</script>

<template>
  <template v-if="props.contentTemplate">
    <WorkflowNodeDetailsGroup>
      <WorkflowNodeDetails
        :icon="ActionExecutionConstant.Icon.CONTENT_TEMPLATE"
        :text="props.contentTemplate"
      />
    </WorkflowNodeDetailsGroup>
  </template>
</template>
