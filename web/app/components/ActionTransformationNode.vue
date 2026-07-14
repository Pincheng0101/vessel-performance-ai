<script setup>
import { ResourceConstant, StateConstant, TransformationConstant } from '~/constants';

/**
 * @import { TransformationNodeData } from '~/models/workflow/state/task/transformation'
 * @import { Resource } from '~/models/server'
 */

/**
 * @type {{ data: TransformationNodeData, resources: Record<string, Resource[]> }}
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

const variables = computed(() => props.resources?.[ResourceConstant.Type.VARIABLE.listKey] || {});

const restoredVariable = computed(() => variables.value[payload.value.transformation.variableId]);
</script>

<template>
  <WorkflowNode
    :title="$t('__workflowAction', { action: $t(StateConstant.ActionType.TRANSFORMATION.i18nTitle) })"
    :icon="StateConstant.ActionType.TRANSFORMATION.icon"
    :is-state-definition-valid="props.data.isFormGroupValid"
    :readonly="props.readonly"
  >
    <template #body>
      <WorkflowNodeTitle :text="stateDefinition.name" />
      <template v-if="!props.readonly && payload.transformation.transformationType">
        <WorkflowNodeDetailsGroup>
          <WorkflowNodeDetails
            :icon-path="findField(TransformationConstant.Type, payload.transformation.transformationType, 'iconPath')"
            :text="findField(TransformationConstant.Type, payload.transformation.transformationType, 'title')"
          />
        </WorkflowNodeDetailsGroup>
        <WorkflowNodeDetailsResourceVariable :variable-resource="restoredVariable" />
      </template>
    </template>
  </WorkflowNode>
</template>
