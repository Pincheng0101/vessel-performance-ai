<script setup>
import { ResourceConstant } from '~/constants';
import { Variable } from '~/models/server/variable';

const props = defineProps({
  variableResource: {
    type: Variable,
    default: null,
  },
});
</script>

<template>
  <template v-if="props.variableResource">
    <WorkflowNodeDetailsGroup>
      <WorkflowNodeDetails
        :icon="ResourceConstant.Type.VARIABLE.icon"
        :text="props.variableResource.name"
      />
    </WorkflowNodeDetailsGroup>
  </template>
</template>
