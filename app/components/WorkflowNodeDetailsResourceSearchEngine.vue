<script setup>
import { SearchEngineConstant } from '~/constants';
import { SearchEngine } from '~/models/server/searchEngine';

const props = defineProps({
  searchEngineResource: {
    type: SearchEngine,
    default: null,
  },
});
</script>

<template>
  <template v-if="props.searchEngineResource">
    <WorkflowNodeDetailsGroup>
      <WorkflowNodeDetails
        :icon-path="findField(SearchEngineConstant.Type, props.searchEngineResource.type, 'iconPath')"
        :text="props.searchEngineResource.name"
      />
    </WorkflowNodeDetailsGroup>
  </template>
</template>
