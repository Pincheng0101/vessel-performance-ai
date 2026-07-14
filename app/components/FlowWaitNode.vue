<script setup>
import { StateConstant } from '~/constants';

/**
 * @import { WaitNodeData } from '~/models/workflow/state/wait'
 */

/**
 * @type {{ data: WaitNodeData }}
 */
const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
});

const stateDefinition = computed(() => props.data.stateDefinition);
const seconds = computed(() => stateDefinition.value.seconds);
const secondsPath = computed(() => stateDefinition.value.secondsPath);
const timestamp = computed(() => stateDefinition.value.timestamp);
const timestampPath = computed(() => stateDefinition.value.timestampPath);
</script>

<template>
  <WorkflowNode
    :title="$t(StateConstant.Type.WAIT.i18nTitle)"
    :icon="StateConstant.Type.WAIT.icon"
    :icon-background="StateConstant.Type.WAIT.iconColor"
    :is-state-definition-valid="props.data.isFormGroupValid"
    :readonly="props.readonly"
  >
    <template #body>
      <WorkflowNodeTitle :text="stateDefinition.name" />
      <template v-if="!props.readonly">
        <template v-if="seconds || secondsPath">
          <WorkflowNodeDetailsGroup>
            <WorkflowNodeDetails
              :icon="StateConstant.Type.WAIT.icon"
              :text="seconds ? $t('__workflowFlowWaitFor', { interval: numUtils.format(seconds) }) : secondsPath"
            />
          </WorkflowNodeDetailsGroup>
        </template>
        <template v-else-if="timestamp || timestampPath">
          <WorkflowNodeDetailsGroup>
            <WorkflowNodeDetails
              :icon="StateConstant.Type.WAIT.icon"
              :text="timestamp ? $t('__workflowFlowWaitUntil', { date: $dayjs(timestamp).utc().format() }) : timestampPath"
            />
          </WorkflowNodeDetailsGroup>
        </template>
      </template>
    </template>
  </WorkflowNode>
</template>
