<script setup>
const props = defineProps({
  resource: {
    type: Object,
    default: null,
  },
  hiddenFields: {
    type: Array,
    default: () => [],
  },
  notFoundResource: {
    type: Object,
    default: () => {},
  },
});

const retrievalTools = defineModel('retrievalTools', {
  type: Array,
  default: () => [],
});

const searchEngineTools = defineModel('searchEngineTools', {
  type: Array,
  default: () => [],
});

const workflowTools = defineModel('workflowTools', {
  type: Array,
  default: () => [],
});

const mcpServerTools = defineModel('mcpServerTools', {
  type: Array,
  default: () => [],
});

const skillTools = defineModel('skillTools', {
  type: Array,
  default: () => [],
});

const lambdaTools = defineModel('lambdaTools', {
  type: Array,
  default: () => [],
});

const apiTools = defineModel('apiTools', {
  type: Array,
  default: () => [],
});

const httpClientTools = defineModel('httpClientTools', {
  type: Array,
  default: () => [],
});

const agentTools = defineModel('agentTools', {
  type: Array,
  default: () => [],
});

const athenaClientTools = defineModel('athenaClientTools', {
  type: Array,
  default: () => [],
});

const openSearchClientTools = defineModel('openSearchClientTools', {
  type: Array,
  default: () => [],
});

const mysqlClientTools = defineModel('mysqlClientTools', {
  type: Array,
  default: () => [],
});
</script>

<template>
  <ResourceAgentToolsTable
    v-model:retrieval-tools="retrievalTools"
    v-model:search-engine-tools="searchEngineTools"
    v-model:workflow-tools="workflowTools"
    v-model:mcp-server-tools="mcpServerTools"
    v-model:skill-tools="skillTools"
    v-model:lambda-tools="lambdaTools"
    v-model:api-tools="apiTools"
    v-model:http-client-tools="httpClientTools"
    v-model:agent-tools="agentTools"
    v-model:athena-client-tools="athenaClientTools"
    v-model:open-search-client-tools="openSearchClientTools"
    v-model:mysql-client-tools="mysqlClientTools"
    :resource="props.resource"
    :hidden-fields="props.hiddenFields"
    :not-found-resource="props.notFoundResource"
  />
</template>
