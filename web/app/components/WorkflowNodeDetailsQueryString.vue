<script setup>
import { QueryTemplateConstant } from '~/constants';

const props = defineProps({
  queryString: {
    type: String,
    default: null,
  },
});
</script>

<template>
  <template v-if="props.queryString">
    <WorkflowNodeDetailsGroup>
      <WorkflowNodeDetails
        :icon="QueryTemplateConstant.QuerySource.CUSTOM_QUERY_STRING.icon"
        :text="props.queryString"
      />
    </WorkflowNodeDetailsGroup>
  </template>
</template>
