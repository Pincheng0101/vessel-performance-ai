<script setup>
import { EmbeddingModelConstant } from '~/constants';
import { EmbeddingModel } from '~/models/server/embeddingModel';

const props = defineProps({
  embeddingModelResource: {
    type: EmbeddingModel,
    default: null,
  },
});
</script>

<template>
  <template v-if="props.embeddingModelResource">
    <WorkflowNodeDetailsGroup>
      <WorkflowNodeDetails
        :icon-path="findField(EmbeddingModelConstant.Type, props.embeddingModelResource.type, 'iconPath')"
        :text="props.embeddingModelResource.name"
      />
    </WorkflowNodeDetailsGroup>
  </template>
</template>
