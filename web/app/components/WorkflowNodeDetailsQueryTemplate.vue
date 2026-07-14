<script setup>
import { QueryTemplateConstant } from '~/constants';
import { Template } from '~/models/server/template';

const props = defineProps({
  templateResource: {
    type: Template,
    default: null,
  },
  templateString: {
    type: String,
    default: null,
  },
});
</script>

<template>
  <template v-if="props.templateResource">
    <WorkflowNodeDetailsGroup>
      <WorkflowNodeDetails
        :icon="QueryTemplateConstant.QuerySource.EXISTING_QUERY_TEMPLATE.icon"
        :text="props.templateResource.name"
      />
    </WorkflowNodeDetailsGroup>
  </template>
  <template v-else-if="props.templateString">
    <WorkflowNodeDetailsGroup>
      <WorkflowNodeDetails
        :icon="QueryTemplateConstant.QuerySource.CUSTOM_QUERY_TEMPLATE.icon"
        :text="props.templateString"
      />
    </WorkflowNodeDetailsGroup>
  </template>
</template>
