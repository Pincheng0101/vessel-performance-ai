<script setup>
import { ResourceConstant } from '~/constants';
import { KnowledgeBase } from '~/models/server/knowledgeBase';

const props = defineProps({
  knowledgeBaseResource: {
    type: KnowledgeBase,
    default: null,
  },
});
</script>

<template>
  <template v-if="props.knowledgeBaseResource">
    <WorkflowNodeDetailsGroup>
      <WorkflowNodeDetails
        :icon="ResourceConstant.Type.KNOWLEDGE_BASE.icon"
        :text="props.knowledgeBaseResource.name"
      />
    </WorkflowNodeDetailsGroup>
  </template>
</template>
