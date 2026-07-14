<script setup>
import { RankerConstant } from '~/constants';
import { Ranker } from '~/models/server/ranker';

const props = defineProps({
  rankerResource: {
    type: Ranker,
    default: null,
  },
});
</script>

<template>
  <template v-if="props.rankerResource">
    <WorkflowNodeDetailsGroup>
      <WorkflowNodeDetails
        :icon-path="findField(RankerConstant.Type, props.rankerResource.type, 'iconPath')"
        :text="props.rankerResource.name"
      />
    </WorkflowNodeDetailsGroup>
  </template>
</template>
