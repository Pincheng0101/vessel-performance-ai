<script setup>
import { Handle, Position } from '@vue-flow/core';
import { StateConstant, WorkflowConstant } from '~/constants';

/**
 * @import { ChoiceNodeData } from '~/models/workflow/state/choice'
 */

/**
 * @type {{ data: ChoiceNodeData }}
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

const { getChoiceItemDisplayText } = useChoiceFlow();

const stateDefinition = computed(() => props.data.stateDefinition);
const choiceItems = computed(() => (stateDefinition.value.choices || []).sort((a, b) => (b.isDefault - a.isDefault)));
</script>

<template>
  <WorkflowNode
    :title="$t(StateConstant.Type.CHOICE.i18nTitle)"
    :icon="StateConstant.Type.CHOICE.icon"
    :icon-background="StateConstant.Type.CHOICE.iconColor"
    :is-state-definition-valid="props.data.isFormGroupValid"
    :readonly="props.readonly"
    hide-right-handle
  >
    <template #body="{ isHovering }">
      <WorkflowNodeTitle :text="stateDefinition.name" />
      <div
        v-for="choiceItem in choiceItems"
        :key="choiceItem.id"
        class="position-relative"
      >
        <WorkflowNodeDetailsGroup>
          <WorkflowNodeDetails
            :text="choiceItem.isDefault ? $t('__fieldDefault') : getChoiceItemDisplayText(choiceItem)"
            icon="mdi-arrow-right-thick"
          />
        </WorkflowNodeDetailsGroup>
        <Handle
          :id="choiceItem.sourceHandle"
          :class="isHovering ? WorkflowConstant.ClassName.HIGHLIGHTED : ''"
          type="source"
          :position="Position.Right"
        />
      </div>
    </template>
  </WorkflowNode>
</template>

<style lang="scss" scoped>
.vue-flow__handle {
  // Card padding + border width
  right: calc(-12px - 2px);
}
</style>
