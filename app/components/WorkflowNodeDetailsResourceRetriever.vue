<script setup>
import { RetrieverConstant } from '~/constants';
import { Retriever } from '~/models/server/retriever';

const props = defineProps({
  retrieverResource: {
    type: Retriever,
    default: null,
  },
});
</script>

<template>
  <template v-if="props.retrieverResource">
    <WorkflowNodeDetailsGroup>
      <WorkflowNodeDetails
        :icon-path="findField(RetrieverConstant.Type, props.retrieverResource.type, 'iconPath')"
        :text="props.retrieverResource.name"
      />
    </WorkflowNodeDetailsGroup>
  </template>
</template>
