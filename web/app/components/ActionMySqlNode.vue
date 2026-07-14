<script setup>
import { IconConstant, ResourceConstant, StateConstant } from '~/constants';

/**
 * @import { MySqlNodeData } from '~/models/workflow/state/task/mysql'
 */

/**
 * @type {{ data: MySqlNodeData, resources: Record<string, Resource[]> }}
 */
const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
  resources: {
    type: Object,
    default: null,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
});

const stateDefinition = computed(() => props.data.stateDefinition);
const payload = computed(() => stateDefinition.value.parameters.payload);

const connectors = computed(() => props.resources?.[ResourceConstant.Type.CONNECTOR.listKey] || {});

const restoredConnector = computed(() => connectors.value[payload.value.connectorId]);
</script>

<template>
  <WorkflowNode
    :title="$t('__workflowAction', { action: $t(StateConstant.ActionType.MYSQL.i18nTitle) })"
    :icon-path="StateConstant.ActionType.MYSQL.iconPath"
    :icon-path-mask-color="StateConstant.ActionType.MYSQL.iconPathMaskColor"
    :is-state-definition-valid="props.data.isFormGroupValid"
    :readonly="props.readonly"
  >
    <template #body>
      <WorkflowNodeTitle :text="stateDefinition.name" />
      <template v-if="!props.readonly">
        <WorkflowNodeDetailsResourceConnector :connector-resource="restoredConnector" />
        <template v-if="payload.database">
          <WorkflowNodeDetailsGroup>
            <WorkflowNodeDetails
              :icon="IconConstant.Base.DATABASE"
              :text="payload.database"
            />
          </WorkflowNodeDetailsGroup>
        </template>
      </template>
    </template>
  </WorkflowNode>
</template>
