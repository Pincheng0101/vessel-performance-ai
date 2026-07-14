<script setup>
import { ConnectorConstant } from '~/constants';
import { Connector } from '~/models/server/connector';

const props = defineProps({
  connectorResource: {
    type: Connector,
    default: null,
  },
});
</script>

<template>
  <template v-if="props.connectorResource">
    <WorkflowNodeDetailsGroup>
      <WorkflowNodeDetails
        :icon-path="findField(ConnectorConstant.Type, props.connectorResource.type, 'iconPath')"
        :text="props.connectorResource.name"
      />
    </WorkflowNodeDetailsGroup>
  </template>
</template>
