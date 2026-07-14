<script setup>
import { Handle, Position } from '@vue-flow/core';
import { StateConstant, StatusConstant, WorkflowConstant } from '~/constants';

const props = defineProps({
  id: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: '',
  },
  data: {
    type: Object,
    default: () => ({}),
  },
  dimensions: {
    type: Object,
    default: () => ({}),
  },
});

const { t } = useI18n();

const DEFAULT_NODE_WIDTH = 200;
const DEFAULT_NODE_HEIGHT = 48;

const defaultWidth = computed(() => props.type === StateConstant.PseudoType.START.value || props.type === StateConstant.PseudoType.END.value ? 16 : DEFAULT_NODE_WIDTH);
const defaultHeight = computed(() => props.type === StateConstant.PseudoType.START.value || props.type === StateConstant.PseudoType.END.value ? 16 : DEFAULT_NODE_HEIGHT);
const hasBackgroundColor = computed(() => props.data?.executionStatus && props.data.executionStatus !== StatusConstant.Runtime.NOT_STARTED.value);
const choiceItems = computed(() => props.data.stateDefinition?.choices || []);
const title = computed(() => props.data.stateDefinition?.name.endsWith(WorkflowConstant.RunActivityStateDefinitionNameSuffix) ? t('__workflowActivityRun') : props.data.stateDefinition?.name);
const errorHandlingCatches = computed(() => props.data.stateDefinition?.errorHandling?.catches || []);
</script>

<template>
  <div class="wrapper">
    <template v-if="props.type === StateConstant.PseudoType.START.value || props.type === StateConstant.PseudoType.END.value">
      <v-card class="rounded w-100 h-100 d-flex justify-center align-center" />
    </template>
    <template v-else>
      <div class="w-100 h-100">
        <v-card
          class="w-100 h-100"
          :color="props.data?.executionStatus?.toLowerCase()"
        >
          <v-card-text class="h-100 px-2 py-0 d-flex align-start">
            <div class="title-wrapper w-100 d-flex justify-space-between align-center">
              <!-- Max Width: dimension width - node padding - padding -->
              <AppTitle
                :font-size="16"
                :icon="findField(StateConstant.Type, props.type, 'icon') || findField(StateConstant.ActionType, props.type, 'icon')"
                icon-background="transparent"
                :icon-path="findField(StateConstant.Type, props.type, 'iconPath') || findField(StateConstant.ActionType, props.type, 'iconPath')"
                :icon-path-mask-color="findField(StateConstant.Type, props.type, 'iconPathMaskColor') || findField(StateConstant.ActionType, props.type, 'iconPathMaskColor')"
                :icon-color="hasBackgroundColor ? 'white' : ''"
                :text="title"
                :text-color="hasBackgroundColor ? 'white' : ''"
                :max-width="props.dimensions.width - 10 * 2 - 20"
              />
              <!-- Hardcode color to avoid flickering -->
              <AppProgressCircular
                v-if="props.data?.executionStatus === StatusConstant.Runtime.RUNNING.value"
                class="mr-1"
                :size="14"
                :width="2"
                color="#ffffff"
              />
              <AppTooltip
                :text="props.data.stateDefinition?.name"
                activator="parent"
              />
            </div>
          </v-card-text>
        </v-card>
      </div>
    </template>
    <Handle
      v-if="props.type !== StateConstant.PseudoType.START.value"
      type="target"
      :position="Position.Left"
    />
    <Handle
      v-if="props.type !== StateConstant.PseudoType.END.value && props.type !== StateConstant.Type.CHOICE.value"
      type="source"
      :position="Position.Right"
    />
    <template v-if="choiceItems.length > 0">
      <div
        v-for="choiceItem in choiceItems"
        :key="choiceItem.id"
      >
        <Handle
          :id="choiceItem.sourceHandle"
          type="source"
          :position="Position.Right"
        />
      </div>
    </template>
    <template v-if="errorHandlingCatches.length > 0">
      <div
        v-for="catchItem in errorHandlingCatches"
        :key="catchItem.id"
      >
        <Handle
          :id="catchItem.id"
          class="fallback progress"
          type="source"
          :position="Position.Right"
        />
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.wrapper {
  width: v-bind('props.dimensions?.width ? `${props.dimensions.width}px` : `${defaultWidth}px`');
  height: v-bind('props.dimensions?.height ? `${props.dimensions.height}px` : `${defaultHeight}px`');
}
.v-card {
  overflow: visible;
  border: 1px solid white;
  &.rounded {
    border-radius: 50% !important;
    background-color: rgba(var(--v-theme-backgroundScale3));
  }
}
.title-wrapper {
  height: v-bind('`${defaultHeight}px`');
}
</style>
