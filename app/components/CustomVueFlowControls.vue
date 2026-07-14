<script setup>
import { Controls } from '@vue-flow/controls';
import { useVueFlow } from '@vue-flow/core';

const props = defineProps({
  showInteractive: {
    type: Boolean,
    default: true,
  },
  isUndoDisabled: {
    type: Boolean,
    default: false,
  },
  isRedoDisabled: {
    type: Boolean,
    default: false,
  },
  isSetSwappableDisabled: {
    type: Boolean,
    default: false,
  },
  onUndo: {
    type: Function,
    default: null,
  },
  onRedo: {
    type: Function,
    default: null,
  },
  onCollapseToggle: {
    type: Function,
    default: null,
  },
  onOrganize: {
    type: Function,
    default: null,
  },
  onSwappableSet: {
    type: Function,
    default: null,
  },
});

const { awsAccountEnv } = useRuntimeConfig().public;

const {
  fitView,
  getViewport,
  maxZoom,
  minZoom,
  setInteractive,
  toObject,
  zoomIn,
  zoomOut,
} = useVueFlow();

const isInteractive = defineModel('isInteractive', {
  type: Boolean,
  default: false,
});

const isSwappable = defineModel('isSwappable', {
  type: Boolean,
  default: true,
});

const isCollapsed = defineModel('isCollapsed', {
  type: Boolean,
  default: false,
});
</script>

<template>
  <Controls
    :show-interactive="props.showInteractive"
    position="bottom-center"
    class="bg-backgroundScale2 elevation-1 rounded-lg"
  >
    <template #top>
      <template v-if="props.onUndo">
        <CustomVueFlowControlButton
          :disabled="props.isUndoDisabled"
          :tooltip="$t('__actionUndo')"
          icon="mdi-arrow-u-left-top"
          @click="props.onUndo"
        />
      </template>
      <template v-if="props.onRedo">
        <CustomVueFlowControlButton
          :disabled="props.isRedoDisabled"
          :tooltip="$t('__actionRedo')"
          icon="mdi-arrow-u-right-top"
          @click="props.onRedo"
        />
      </template>
    </template>
    <template #control-zoom-in>
      <CustomVueFlowControlButton
        :disabled="getViewport().zoom >= maxZoom"
        :tooltip="$t('__actionEditorZoomIn')"
        icon="mdi-plus"
        @click="zoomIn"
      />
    </template>
    <template #control-zoom-out>
      <CustomVueFlowControlButton
        :disabled="getViewport().zoom <= minZoom"
        :tooltip="$t('__actionEditorZoomOut')"
        icon="mdi-minus"
        @click="zoomOut"
      />
    </template>
    <template #control-fit-view>
      <CustomVueFlowControlButton
        :tooltip="$t('__actionEditorFitView')"
        icon="mdi-fit-to-screen"
        @click="fitView"
      />
    </template>
    <template #control-interactive>
      <CustomVueFlowControlButton
        :tooltip="isInteractive ? $t('__actionEditorDisableOrganize') : $t('__actionEditorEnableOrganize')"
        :icon="isInteractive ? 'mdi-lock' : 'mdi-arrow-all'"
        @click="() => {
          isInteractive = !isInteractive;
          setInteractive(!isInteractive);
          if (props.onSwappableSet && !isInteractive) {
            props.onSwappableSet(false);
          }
        }"
      />
    </template>
    <template v-if="props.onSwappableSet">
      <CustomVueFlowControlButton
        :tooltip="isSwappable ? $t('__actionEditorDisableReorder') : $t('__actionEditorEnableReorder')"
        :icon="isSwappable ? 'mdi-arrow-horizontal-lock' : 'mdi-swap-horizontal'"
        :disabled="props.isSetSwappableDisabled"
        @click="() => {
          isSwappable = !isSwappable;
          props.onSwappableSet(!isSwappable);
          if (!isSwappable) {
            setInteractive(false);
            isInteractive = false;
          }
        }"
      />
    </template>
    <template v-if="props.onCollapseToggle">
      <CustomVueFlowControlButton
        :tooltip="isCollapsed ? $t('__actionEditorExpandAll') : $t('__actionEditorCollapseAll')"
        :icon="isCollapsed ? 'mdi-arrow-expand' : 'mdi-arrow-collapse'"
        @click="() => {
          isCollapsed = !isCollapsed;
          props.onCollapseToggle(isCollapsed);
        }"
      />
    </template>
    <template v-if="props.onOrganize">
      <CustomVueFlowControlButton
        :tooltip="$t('__actionEditorOrganize')"
        icon="mdi-auto-fix"
        @click="props.onOrganize"
      />
    </template>
    <template v-if="awsAccountEnv === 'dev'">
      <CustomVueFlowControlButton
        :tooltip="$t('__actionEditorDebug')"
        icon="mdi-xml"
        @click="() => {
          console.log(toObject());
        }"
      />
    </template>
  </Controls>
</template>

<style lang="scss" scoped>
.v-btn {
  &:first-of-type {
    border-top-left-radius: 8px !important;
    border-bottom-left-radius: 8px !important;
  }
  &:last-of-type {
    border-top-right-radius: 8px !important;
    border-bottom-right-radius: 8px !important;
  }
}
</style>
