<script setup>
import { AgentConstant } from '~/constants';

const props = defineProps({
  toolType: {
    type: String,
    default: '',
  },
  item: {
    type: Object,
    default: null,
  },
  usedNames: {
    type: Array,
    default: () => [],
  },
  notFoundResource: {
    type: Object,
    default: () => ({}),
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  onSubmit: {
    type: Function,
    default: () => {},
  },
  onDiscard: {
    type: Function,
    default: () => {},
  },
});
</script>

<template>
  <ResourceAgentToolRetrievalForm
    v-if="props.toolType === AgentConstant.ToolType.RETRIEVAL.value"
    :item="props.item"
    :used-names="props.usedNames"
    :not-found-resource="props.notFoundResource"
    :hidden-fields="props.hiddenFields"
    :on-submit="props.onSubmit"
    :on-discard="props.onDiscard"
  />
  <ResourceAgentToolSearchEngineForm
    v-else-if="props.toolType === AgentConstant.ToolType.SEARCH_ENGINE.value"
    :item="props.item"
    :used-names="props.usedNames"
    :not-found-resource="props.notFoundResource"
    :on-submit="props.onSubmit"
    :on-discard="props.onDiscard"
  />
  <ResourceAgentToolMcpServerForm
    v-else-if="props.toolType === AgentConstant.ToolType.MCP_SERVER.value"
    :item="props.item"
    :used-names="props.usedNames"
    :not-found-resource="props.notFoundResource"
    :on-submit="props.onSubmit"
    :on-discard="props.onDiscard"
  />
  <ResourceAgentToolWorkflowForm
    v-else-if="props.toolType === AgentConstant.ToolType.WORKFLOW.value"
    :item="props.item"
    :used-names="props.usedNames"
    :not-found-resource="props.notFoundResource"
    :on-submit="props.onSubmit"
    :on-discard="props.onDiscard"
  />
  <ResourceAgentToolSkillForm
    v-else-if="props.toolType === AgentConstant.ToolType.SKILL.value"
    :item="props.item"
    :used-names="props.usedNames"
    :not-found-resource="props.notFoundResource"
    :on-submit="props.onSubmit"
    :on-discard="props.onDiscard"
  />
  <ResourceAgentToolLambdaForm
    v-else-if="props.toolType === AgentConstant.ToolType.LAMBDA.value"
    :item="props.item"
    :used-names="props.usedNames"
    :not-found-resource="props.notFoundResource"
    :on-submit="props.onSubmit"
    :on-discard="props.onDiscard"
  />
  <ResourceAgentToolApiForm
    v-else-if="props.toolType === AgentConstant.ToolType.API.value"
    :item="props.item"
    :used-names="props.usedNames"
    :not-found-resource="props.notFoundResource"
    :on-submit="props.onSubmit"
    :on-discard="props.onDiscard"
  />
  <ResourceAgentToolHttpClientForm
    v-else-if="props.toolType === AgentConstant.ToolType.HTTP_CLIENT.value"
    :item="props.item"
    :used-names="props.usedNames"
    :not-found-resource="props.notFoundResource"
    :on-submit="props.onSubmit"
    :on-discard="props.onDiscard"
  />
  <ResourceAgentToolAgentForm
    v-else-if="props.toolType === AgentConstant.ToolType.AGENT.value"
    :item="props.item"
    :used-names="props.usedNames"
    :not-found-resource="props.notFoundResource"
    :on-submit="props.onSubmit"
    :on-discard="props.onDiscard"
  />
  <ResourceAgentToolAthenaClientForm
    v-else-if="props.toolType === AgentConstant.ToolType.ATHENA_CLIENT.value"
    :item="props.item"
    :used-names="props.usedNames"
    :not-found-resource="props.notFoundResource"
    :on-submit="props.onSubmit"
    :on-discard="props.onDiscard"
  />
  <ResourceAgentToolOpenSearchClientForm
    v-else-if="props.toolType === AgentConstant.ToolType.OPENSEARCH_CLIENT.value"
    :item="props.item"
    :used-names="props.usedNames"
    :not-found-resource="props.notFoundResource"
    :on-submit="props.onSubmit"
    :on-discard="props.onDiscard"
  />
  <ResourceAgentToolMySqlClientForm
    v-else-if="props.toolType === AgentConstant.ToolType.MYSQL_CLIENT.value"
    :item="props.item"
    :used-names="props.usedNames"
    :not-found-resource="props.notFoundResource"
    :on-submit="props.onSubmit"
    :on-discard="props.onDiscard"
  />
</template>
