<script setup>
import * as TableConstant from '~/constants/TableConstant';

const props = defineProps({
  columnCount: {
    type: Number,
    default: 0,
  },
  columns: {
    type: Array,
    default: () => [],
  },
  internalItem: {
    type: Object,
    default: () => ({}),
  },
  internalItems: {
    type: Array,
    default: () => [],
  },
  item: {
    type: Object,
    default: () => ({}),
  },
  disabledIdMap: {
    type: Object,
    default: () => ({}),
  },
  disabledTooltip: {
    type: String,
    default: '',
  },
  clickableForDisabledItem: {
    type: Boolean,
    default: false,
  },
  dragging: {
    type: Boolean,
    default: false,
  },
  isExpanded: {
    type: Function,
    default: () => false,
  },
  multipleSelect: {
    type: Boolean,
    default: false,
  },
  rowExpanded: {
    type: Boolean,
    default: false,
  },
  rowMaxHeight: {
    type: Number,
    default: null,
  },
  onRowSelect: {
    type: Function,
    default: null,
  },
  onSelect: {
    type: Function,
    default: null,
  },
  onItemClick: {
    type: Function,
    default: () => {},
  },
  onRowClick: {
    type: Function,
    default: null,
  },
  selectedId: {
    type: String,
    default: null,
  },
  selectedIds: {
    type: Array,
    default: () => [],
  },
  hiddenSelectableIdMap: {
    type: Object,
    default: () => ({}),
  },
  toggleExpand: {
    type: Function,
    default: () => {},
  },
  isExpandedRowVisible: {
    type: Function,
    default: null,
  },
  isClickable: {
    type: Boolean,
    default: false,
  },
  indeterminateIdSet: {
    type: Set,
    default: () => new Set(),
  },
});

const slots = useSlots();

const selectedId = computed(() => props.selectedId);
const selectedIds = computed(() => props.selectedIds ?? []);
const isExpandedRowVisible = computed(() => !props.isExpandedRowVisible || props.isExpandedRowVisible(props.item));

const getColumnValue = (column, item) => typeof column.value === 'function' ? column.value(item) : item[column.key];
const getColumnSlotName = column => `item.${column.key}`;
const isRowClickable = computed(() =>
  props.isClickable && !props.disabledIdMap[props.item.id] && (!!props.onRowClick || (!!props.onRowSelect && !!props.onSelect)),
);
const handleRowClick = () => {
  if (!isRowClickable.value) return;
  if (props.onRowClick) {
    props.onRowClick(props.item);
    return;
  }
  props.onRowSelect(props.item.id);
};

watch(isExpandedRowVisible, (after) => {
  if (!after && props.isExpanded(props.internalItem)) {
    props.toggleExpand(props.internalItem);
  }
});
</script>

<template>
  <v-hover v-slot="{ isHovering, props: p }">
    <tr
      v-bind="props.columns.some(column => column.key === 'menu') ? p : undefined"
      :aria-label="props.item.name"
      :class="{
        'cursor-pointer': isRowClickable,
      }"
      @click="handleRowClick"
    >
      <td
        v-for="column in props.columns"
        :key="column.key"
        v-bind="column.cellProps?.(item)"
        :class="{ expanded: props.rowExpanded }"
      >
        <div :class="{ 'row-max-height': props.rowMaxHeight }">
          <template v-if="column.key === TableConstant.ColumnKey.DRAG">
            <div class="d-flex align-center justify-center">
              <AppDragIcon
                :dragging="props.dragging"
                :disabled="props.internalItems.some(props.isExpanded)"
                :disabled-tooltip="$t('__tooltipCloseExpandedRowsToDrag')"
                drag-class="handle"
              />
            </div>
          </template>
          <template v-else-if="column.key === TableConstant.ColumnKey.SELECT">
            <div
              class="d-flex justify-center align-center opacity-1 transition-opacity"
              :class="{
                'opacity-30': !props.hiddenSelectableIdMap[props.item.id] && !props.indeterminateIdSet.has(props.item.id) && !selectedIds.includes(props.item.id) && selectedId !== props.item.id && !isHovering,
                'cursor-not-allowed': props.disabledIdMap[props.item.id],
              }"
            >
              <template v-if="!props.hiddenSelectableIdMap[props.item.id]">
                <template v-if="props.multipleSelect">
                  <AppCheckbox
                    :model-value="selectedIds"
                    :value="props.item.id"
                    :disabled="props.disabledIdMap[props.item.id]"
                    :indeterminate="props.indeterminateIdSet.has(props.item.id)"
                    class="d-flex justify-center"
                    hide-details
                    multiple
                    @click.stop
                    @update:model-value="props.onSelect ? props.onSelect(props.item.id) : () => {}"
                  />
                </template>
                <template v-else>
                  <AppRadioGroup
                    :model-value="selectedId"
                    :items="[
                      { value: props.item.id, disabled: !!props.disabledIdMap[props.item.id] },
                    ]"
                    class="d-flex justify-center"
                    @click.stop
                    @update:model-value="props.onSelect ? props.onSelect(props.item.id) : () => {}"
                  />
                </template>
              </template>
            </div>
          </template>
          <template v-else-if="column.key === TableConstant.ColumnKey.EXPAND">
            <template v-if="!props.isExpandedRowVisible || props.isExpandedRowVisible(props.item)">
              <AppIconButton
                :icon="props.isExpanded(props.internalItem) ? 'mdi-chevron-up' : 'mdi-chevron-down'"
                variant="text"
                @click="props.toggleExpand(props.internalItem)"
              />
            </template>
          </template>
          <template v-else-if="column.key === TableConstant.ColumnKey.ACTIONS">
            <div class="d-flex align-center justify-center ga-2">
              <slot
                name="actions"
                :item="props.item"
              />
            </div>
          </template>
          <template v-else-if="column.key === TableConstant.ColumnKey.MENU">
            <div class="d-flex align-center justify-start ga-2">
              <slot
                name="menu"
                :item="props.item"
                :is-hovering="isHovering"
              />
            </div>
          </template>
          <template v-else-if="column.key === TableConstant.ColumnKey.CUSTOM">
            <div class="d-flex align-center ga-2 w-100">
              <slot
                name="custom-column"
                :item="props.item"
                :is-hovering="isHovering"
              />
            </div>
          </template>
          <template v-else-if="slots[getColumnSlotName(column)]">
            <slot
              :name="getColumnSlotName(column)"
              :item="props.item"
              :value="getColumnValue(column, props.item)"
              :column="column"
              :is-hovering="isHovering"
            />
          </template>
          <template v-else>
            <AppDisplayField
              :item="{
                ...column,
                value: getColumnValue(column, props.item),
                link: column.link ? column.link(props.item) : null,
                icon: typeof column.icon === 'function' ? column.icon(props.item) : column.icon,
                iconPath: typeof column.iconPath === 'function' ? column.iconPath(props.item) : column.iconPath,
                iconColor: typeof column.iconColor === 'function' ? column.iconColor(props.item) : column.iconColor,
                iconPathMaskColor: typeof column.iconPathMaskColor === 'function' ? column.iconPathMaskColor(props.item) : column.iconPathMaskColor,
                isChip: column.isChip === undefined ? Array.isArray(getColumnValue(column, props.item)) : column.isChip,
                chipOptions: typeof column.chipOptions === 'function' ? column.chipOptions(props.item) : column.chipOptions,
                isClickable: typeof column.isClickable === 'function' ? column.isClickable(props.item) : column.isClickable,
                isSecret: typeof column.isSecret === 'function' ? column.isSecret(props.item) : column.isSecret,
                isSingleLine: typeof column.isSingleLine === 'function' ? column.isSingleLine(props.item) : column.isSingleLine,
                maxChars: typeof column.maxChars === 'function' ? column.maxChars(props.item) : column.maxChars,
              }"
              class="py-2"
              :on-text-click="() => props.onItemClick(props.item)"
            />
          </template>
        </div>
      </td>
      <template v-if="props.disabledIdMap[props.item.id] && props.disabledTooltip">
        <AppTooltip
          :offset="[-12, -20]"
          :text="props.disabledTooltip"
          activator="parent"
          location="bottom start"
        />
      </template>
    </tr>
  </v-hover>
  <tr
    v-if="isExpandedRowVisible && props.isExpanded(props.internalItem)"
    class="app-table-row__expanded-row"
  >
    <td :colspan="props.columnCount">
      <div class="app-table-row__expanded-content">
        <slot
          name="expanded-row"
          :item="item"
        />
      </div>
    </td>
  </tr>
</template>

<style lang="scss" scoped>
.cursor-not-allowed td {
  color: rgba(var(--v-theme-disabled));
}
:deep(.display-field) {
  max-width: var(--dynamic-max-width);
}
.row-max-height {
  max-height: v-bind('props.rowMaxHeight ? "400px" : "auto"');
  overflow: v-bind('props.rowMaxHeight ? "auto" : "hidden"');
}
.v-table td.expanded {
  background-color: rgba(var(--v-theme-primary), 0.1) !important;
}
.app-table-row__expanded-content {
  left: 0;
  width: var(--app-table-wrapper-width, 100%);
  max-width: var(--app-table-wrapper-width, 100%);
  overflow: hidden;
  position: sticky;
}
:deep(.table-breakdown-cell--child-label) {
  padding-left: 28px !important;
}
:deep(.table-breakdown-cell--summary-label) {
  font-weight: 600;
}
:deep(.table-breakdown-cell--subtotal) {
  background-color: rgba(var(--v-theme-backgroundScale1), 0.75);
  font-weight: 500;
}
:deep(.table-breakdown-cell--total) {
  background-color: rgba(var(--v-theme-primary), 0.1);
  font-weight: 700;
}
:deep(.table-breakdown-cell--average) {
  color: rgba(var(--v-theme-text), 0.72);
  font-size: 0.8125rem;
}
</style>
