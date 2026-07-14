<script setup>
import { StateConstant } from '~/constants';

/**
 * @import { FailNodeData } from '~/models/workflow/state/fail'
 */

/**
 * @type {{ data: FailNodeData }}
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
const error = computed(() => stateDefinition.value.error);
const errorPath = computed(() => stateDefinition.value.errorPath);
const cause = computed(() => stateDefinition.value.cause);
const causePath = computed(() => stateDefinition.value.causePath);
</script>

<template>
  <WorkflowNode
    :title="$t(StateConstant.Type.FAIL.i18nTitle)"
    :icon="StateConstant.Type.FAIL.icon"
    :icon-background="StateConstant.Type.FAIL.iconColor"
    :is-state-definition-valid="props.data.isFormGroupValid"
    :readonly="props.readonly"
  >
    <template #body>
      <WorkflowNodeTitle :text="stateDefinition.name" />
      <template v-if="!props.readonly">
        <template v-if="error || errorPath">
          <WorkflowNodeDetailsGroup>
            <WorkflowNodeDetails
              :icon="StateConstant.Type.FAIL.icon"
              :text="error || errorPath"
            />
          </WorkflowNodeDetailsGroup>
        </template>
        <template v-if="cause || causePath">
          <WorkflowNodeDetailsGroup>
            <WorkflowNodeDetails
              :icon="StateConstant.Type.FAIL.icon"
              :text="cause || causePath"
            />
          </WorkflowNodeDetailsGroup>
        </template>
      </template>
    </template>
  </WorkflowNode>
</template>
