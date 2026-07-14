<script setup>
import { CodeConstant, StateConstant } from '~/constants';

/**
 * @import { CodeNodeData } from '~/models/workflow/state/task/code'
 */

/**
 * @type {{ data: CodeNodeData }}
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
const payload = computed(() => stateDefinition.value.parameters.payload);
const runtime = computed(() => payload.value.runtime);
const { t } = useI18n();

const runtimeType = computed(() => runtime.value?.runtimeType);
const runtimeTitle = computed(() => t(findField(CodeConstant.RuntimeTypes, runtimeType.value, 'i18nTitle')));
const runtimeIcon = computed(() => findField(CodeConstant.RuntimeTypes, runtimeType.value, 'icon'));
</script>

<template>
  <WorkflowNode
    :title="$t('__workflowAction', { action: $t(StateConstant.ActionType.CODE.i18nTitle) })"
    :icon="StateConstant.ActionType.CODE.icon"
    :is-state-definition-valid="props.data.isFormGroupValid"
    :readonly="props.readonly"
  >
    <template #body>
      <WorkflowNodeTitle :text="stateDefinition.name" />
      <template v-if="!props.readonly && runtimeType">
        <WorkflowNodeDetailsGroup>
          <WorkflowNodeDetails
            :icon="runtimeIcon"
            :text="runtimeTitle || runtimeType"
          />
        </WorkflowNodeDetailsGroup>
      </template>
    </template>
  </WorkflowNode>
</template>
