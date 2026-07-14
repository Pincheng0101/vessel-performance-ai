<script setup>
const props = defineProps({
  draggable: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  hasQuery: {
    type: Boolean,
    default: false,
  },
  columnCount: {
    type: Number,
    default: 0,
  },
  hideNoData: {
    type: Boolean,
    default: false,
  },
  enableScrollButton: {
    type: Boolean,
    default: false,
  },
  onClientSideCurrentItemsChange: {
    type: Function,
    default: null,
  },
});

const model = defineModel({
  type: Array,
  default: [],
});

const tableRef = ref(null);
const slots = useSlots();

const headerSlotNames = computed(() => Object.keys(slots).filter(name => name.startsWith('header.')));
const tableElement = computed(() => tableRef.value?.$el);
const tableWrapperElement = computed(() => tableElement.value?.querySelector(':scope > .v-table__wrapper'));

const state = reactive({
  isDragging: false,
  tableResizeObserver: null,
  tableWrapperWidth: 0,
});

const getHeaderSlotProps = slotProps => ({
  ...slotProps,
  onSort: slotProps.column?.sortable && typeof slotProps.toggleSort === 'function'
    ? column => slotProps.toggleSort(column)
    : null,
  sortIcon: typeof slotProps.getSortIcon === 'function'
    ? slotProps.getSortIcon(slotProps.column)
    : null,
});

const getItemKey = (item) => {
  if (item.id) return item.id;
  if (item instanceof File) return `${item.name}_${item.size}_${item.lastModified}`;
  return JSON.stringify(item);
};

// Prevent frequent currentItems triggers by debouncing the calls
const handleCurrentItemsChange = useDebounceFn((v) => {
  if (props.onClientSideCurrentItemsChange) {
    props.onClientSideCurrentItemsChange(v.map(item => item.raw));
  }
}, 100);

const updateTableWrapperWidth = () => {
  state.tableWrapperWidth = tableWrapperElement.value?.clientWidth ?? 0;
};

onMounted(async () => {
  await nextTick();
  if (!tableWrapperElement.value) return;

  state.tableResizeObserver = new ResizeObserver(updateTableWrapperWidth);
  state.tableResizeObserver.observe(tableWrapperElement.value);
  updateTableWrapperWidth();
});

onBeforeUnmount(() => {
  state.tableResizeObserver?.disconnect();
});
</script>

<template>
  <v-data-table
    ref="tableRef"
    :items="model ?? []"
    :loading="props.loading"
    :class="{
      'persistent-scrollbar': !props.enableScrollButton,
    }"
    :style="{
      '--app-table-wrapper-width': state.tableWrapperWidth ? `${state.tableWrapperWidth}px` : '100%',
    }"
    @update:current-items="handleCurrentItemsChange"
  >
    <template
      v-for="slotName in headerSlotNames"
      :key="slotName"
      #[slotName]="slotProps"
    >
      <slot
        :name="slotName"
        v-bind="getHeaderSlotProps(slotProps)"
      />
    </template>
    <template #header.select>
      <slot name="header.select" />
    </template>
    <template
      v-if="!props.loading"
      #tbody="{ columns, items, internalItems, isExpanded, toggleExpand }"
    >
      <slot name="body.prepend" />
      <AppDraggable
        v-model="model"
        v-model:dragging="state.isDragging"
        :enabled="props.draggable"
        tag="tbody"
      >
        <template
          v-for="(item, i) in items"
          :key="getItemKey(item)"
        >
          <slot
            name="item"
            :columns="columns"
            :index="i"
            :internal-item="internalItems[i]"
            :internal-items="internalItems"
            :is-dragging="state.isDragging"
            :is-expanded="isExpanded"
            :item="item"
            :toggle-expand="toggleExpand"
          />
        </template>
        <template v-if="!props.loading && items.length < 1 && !props.hideNoData">
          <AppTableNoData :column-count="props.columnCount">
            <template
              v-if="$slots['no-data'] && !props.hasQuery"
              #no-data
            >
              <slot name="no-data" />
            </template>
          </AppTableNoData>
        </template>
        <template v-if="props.enableScrollButton">
          <AppTableScrollButton
            v-if="tableRef"
            :table-element="tableRef.$el"
          />
        </template>
      </AppDraggable>
    </template>
    <template #tfoot="{ items }">
      <slot
        name="tfoot"
        :items="items"
      />
    </template>
    <template #bottom>
      <slot name="bottom" />
    </template>
    <template #loading>
      <slot name="loading" />
    </template>
  </v-data-table>
</template>

<style lang="scss" scoped>
@use '@/assets/vuetify.scss';

.persistent-scrollbar {
  :deep(> .v-table__wrapper) {
    @extend %persistent-scrollbar;
  }
}

.v-table {
  border-radius: 0 !important;
  :deep() {
    &, th, td, .v-data-table-rows-loading {
      background-color: rgba(var(--v-theme-backgroundScale2)) !important;
    }
    td {
      border-top: none !important;
    }
    .v-btn--disabled .v-btn__content {
      color: rgba(var(--v-theme-backgroundScale4));
    }
  }
}
</style>
