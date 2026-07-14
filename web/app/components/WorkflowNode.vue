<script setup>
import { Handle, Position, useVueFlow } from '@vue-flow/core';
import { IconConstant, KeyboardConstant, StateConstant, WorkflowConstant } from '~/constants';

const { findNode } = useVueFlow();

const {
  dragPreviewNode,
  duplicateNode,
  editorMode,
  handleNodeMouseDown,
  hoveredNodeId,
  isNodeMouseDown,
  removeNode,
  selectedNode,
} = useWorkflow();

const { registerKeyboardShortcuts } = useKeyboardShortcuts();

const { disabledNodeTypes } = useFeature();

const nodeMenuRef = ref(null);
const menuOpenRef = ref(false);

const props = defineProps({
  id: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: '',
  },
  iconBackground: {
    type: String,
    default: IconConstant.Color.ACTION,
  },
  iconPath: {
    type: String,
    default: '',
  },
  iconPathMaskColor: {
    type: String,
    default: '',
  },
  hideLeftHandle: {
    type: Boolean,
    default: false,
  },
  hideRightHandle: {
    type: Boolean,
    default: false,
  },
  isParent: {
    type: Boolean,
    default: false,
  },
  isChild: {
    type: Boolean,
    default: false,
  },
  width: {
    type: Number,
    default: 200,
  },
  height: {
    type: Number,
    default: null,
  },
  isStateDefinitionValid: {
    type: Boolean,
    default: false,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  nodeData: {
    type: Object,
    default: () => {},
  },
  nodesCollapseStatus: {
    type: String,
    default: WorkflowConstant.NodesCollapseStatus.ALL_EXPANDED,
  },
  onNodeCollapseSet: {
    type: Function,
    default: null,
  },
});

const state = reactive({
  isHovering: false,
  isCollapsed: props.nodeData.isCollapsed || false,
});

const selected = computed(() => findNode(props.id).class?.includes(WorkflowConstant.ClassName.HIGHLIGHTED) || false);
const errorHandlingCatches = computed(() => props.nodeData.stateDefinition?.errorHandling?.catches || []);
const hasNodeMenu = computed(() => !props.readonly && !(Object.values(StateConstant.PseudoType).map(v => v.value).includes(props.type)));
const disabled = computed(() => disabledNodeTypes.value.map(type => type.value).includes(props.type));
const isHandleHighlighted = computed(() => state.isHovering && !isNodeMouseDown.value);
const isDraggable = computed(() => findField(StateConstant.Type, props.type, 'draggable') || findField(StateConstant.ActionType, props.type, 'draggable'));

const handleNodeHover = (isHovering) => {
  hoveredNodeId.value = isHovering && !isNodeMouseDown.value ? props.id : null;
};

watch(() => nodeMenuRef.value?.open, (v) => {
  menuOpenRef.value = v;
});

watch(() => props.nodeData.isCollapsed, (v) => {
  state.isCollapsed = v;
});

watch(() => props.nodesCollapseStatus, (v) => {
  switch (v) {
    case WorkflowConstant.NodesCollapseStatus.ALL_COLLAPSED:
      state.isCollapsed = true;
      break;
    case WorkflowConstant.NodesCollapseStatus.ALL_EXPANDED:
      state.isCollapsed = false;
      break;
    case WorkflowConstant.NodesCollapseStatus.MIXED:
      // Do nothing, keep the current state
      break;
  }
});

onMounted(() => {
  registerKeyboardShortcuts([
    {
      bindings: KeyboardConstant.Bindings.DUPLICATE.value,
      enabled: computed(() => props.id === selectedNode.value?.id),
      callback: () => duplicateNode(props.id),
    },
  ]);
});
</script>

<template>
  <div class="wrapper">
    <!-- Put default handles on top to make sure edge correctly connected-->
    <template v-if="!props.hideLeftHandle">
      <Handle
        :class="isHandleHighlighted ? WorkflowConstant.ClassName.HIGHLIGHTED : ''"
        type="target"
        :position="Position.Left"
      />
    </template>
    <template v-if="!props.hideRightHandle">
      <Handle
        :class="isHandleHighlighted ? WorkflowConstant.ClassName.HIGHLIGHTED : ''"
        type="source"
        :position="Position.Right"
      />
    </template>
    <template v-if="props.isChild">
      <v-card class="child d-flex justify-center align-center h-100">
        <slot
          name="body"
          :is-hovering="state.isHovering"
        />
      </v-card>
    </template>
    <template v-else>
      <v-hover
        v-slot="{ props: p }"
        v-model="state.isHovering"
        @update:model-value="handleNodeHover"
      >
        <div
          v-bind="p"
          class="h-100"
        >
          <v-card
            :elevation="3"
            class="h-100 w-100"
            :class="{ disabled, parent: props.isParent, readonly: props.readonly }"
            @mousedown="(e) => {
              if (props.readonly) return;
              handleNodeMouseDown(e, props.id, props.type)
            }"
          >
            <div
              v-if="hasNodeMenu && (selected || state.isHovering || menuOpenRef)"
              class="menu-button-wrapper h-100 w-100 d-flex justify-end position-absolute"
            >
              <v-hover
                v-if="editorMode === WorkflowConstant.EditorMode.DESIGN.value"
                v-slot="{ props: p }"
                v-model="state.isHovering"
                @update:model-value="handleNodeHover"
              >
                <WorkflowNodeMenu
                  v-bind="p"
                  ref="nodeMenuRef"
                  :type="props.type"
                  :on-delete="() => removeNode(props.id)"
                  :on-duplicate="() => duplicateNode(props.id)"
                />
              </v-hover>
            </div>
            <v-card-text class="pa-3">
              <AppTitle
                v-if="props.icon || props.iconPath"
                :font-size="14"
                :icon-background="props.iconBackground"
                :icon="props.icon"
                :icon-path="props.iconPath"
                :icon-path-mask-color="props.iconPathMaskColor"
                :text="props.title"
                font-weight="bold"
                class="mb-2"
              >
                <template #append>
                  <template v-if="disabled">
                    <v-icon
                      icon="mdi-cancel"
                      size="x-small"
                      color="error"
                      class="ml-2"
                    />
                  </template>
                  <template v-else-if="!props.isStateDefinitionValid">
                    <v-icon
                      icon="mdi-alert"
                      size="x-small"
                      color="warning"
                      class="ml-2"
                    />
                  </template>
                </template>
              </AppTitle>
              <slot
                name="body"
                :is-hovering="state.isHovering"
              />
              <div
                v-for="(catchItem, i) in errorHandlingCatches"
                :key="catchItem.id"
                class="position-relative catcher-wrapper"
              >
                <WorkflowNodeDetailsGroup>
                  <WorkflowNodeDetails :text="`${$t('__fieldErrorCatcher')} #${i + 1}`" />
                </WorkflowNodeDetailsGroup>
                <Handle
                  :id="catchItem.id"
                  class="fallback"
                  :class="isHandleHighlighted ? WorkflowConstant.ClassName.HIGHLIGHTED : ''"
                  type="source"
                  :position="Position.Right"
                />
              </div>
            </v-card-text>
            <AppIconButton
              v-if="props.isParent"
              :icon="state.isCollapsed ? 'mdi-arrow-expand' : 'mdi-arrow-collapse'"
              :icon-size="16"
              variant="text"
              class="position-absolute right-0 top-0 ma-1"
              @click.stop="() => {
                state.isCollapsed = !state.isCollapsed;
                props.onNodeCollapseSet(props.id, state.isCollapsed)
              }"
              @mousedown.stop
            />
          </v-card>
        </div>
      </v-hover>
      <Teleport
        v-if="!props.readonly"
        to="body"
      >
        <div
          v-if="dragPreviewNode.id === props.id"
          class="drag-preview-node-wrapper"
          :style="{
            top: `${dragPreviewNode.top}px`,
            left: `${dragPreviewNode.left}px`,
            width: `${dragPreviewNode.width}px`,
          }"
        >
          <template v-if="!isDraggable">
            <div class="d-flex align-center mb-2">
              <v-icon
                icon="mdi-cancel"
                size="16"
                color="error"
              />
              <p class="text-caption text-error ml-2">
                {{ $t('__instructionNotAllowDrag', { item: props.title }) }}
              </p>
            </div>
          </template>
          <v-card>
            <v-card-text class="pa-3">
              <AppTitle
                :icon="props.icon"
                :icon-background="props.iconBackground"
                :icon-path="props.iconPath"
                :icon-path-mask-color="props.iconPathMaskColor"
                :text="props.title"
                font-weight="bold"
                :font-size="14"
              />
              <p class="pt-2">
                {{ props.nodeData.stateDefinition.name }}
              </p>
            </v-card-text>
          </v-card>
        </div>
      </Teleport>
      <AppTooltip
        v-if="disabled && !props.readonly"
        :text="$t('__tooltipStateNotEnabled', { item: props.title })"
        activator="parent"
        location="bottom"
        :width="200"
      />
    </template>
  </div>
</template>

<style lang="scss" scoped>
.wrapper {
  width: v-bind('props.isChild ? "16px" : `${props.width}px`');
  height: v-bind('props.isChild ? "16px" : (props.height ? `${props.height}px` : "auto")');
}
.v-card {
  overflow: visible;
  &.disabled {
    background-color: rgba(var(--v-theme-disabled));
  }
  &.parent {
    background-color: rgba(var(--v-theme-backgroundScale1));
  }
  &.child {
    border-radius: 50% !important;
    background-color: rgba(var(--v-theme-backgroundScale3));
  }
  .v-card-text {
    // Remove margin-bottom for every last div element and the div in last catcher-wrapper
    :deep(div:last-of-type),
    .catcher-wrapper:last-of-type div {
      margin-bottom: 0 !important;
    }
  }
  .readonly {
    background: rgba(var(--v-theme-backgroundScale5));
    &.parent {
      background-color: rgba(var(--v-theme-backgroundScale1));
    }
  }
}
.menu-button-wrapper {
  top: calc(-20px - 4px); // Hover zone height + margin
  right: 0;
}
.catcher-wrapper {
  > div:first-child {
    visibility: v-bind('props.isParent ? "hidden" : "visible"');
  }
}
.drag-preview-node-wrapper {
  position: fixed;
  z-index: 999;
  pointer-events: none;
  opacity: 0.8;
}
</style>
