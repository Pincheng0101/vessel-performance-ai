<script setup>
import * as ListConstant from '~/constants/ListConstant';
import * as TableConstant from '~/constants/TableConstant';

const isInsideDialog = inject('isInsideDialog', false);

const { encodePageTokens } = usePagination();

const props = defineProps({
  title: {
    type: String,
    default: null,
  },
  icon: {
    type: String,
    default: null,
  },
  iconPath: {
    type: String,
    default: null,
  },
  serverSide: {
    type: Boolean,
    default: true,
  },
  headers: {
    type: Array,
    required: true,
  },
  items: {
    type: Array,
    default: () => [],
  },
  itemValue: {
    type: String,
    default: 'id',
  },
  disabledIdMap: {
    type: Object,
    default: () => ({}),
  },
  disabledTooltip: {
    type: String,
    default: '',
  },
  showPagination: {
    type: Boolean,
    default: true,
  },
  draggable: {
    type: Boolean,
    default: false,
  },
  enableSearch: {
    type: Boolean,
    default: true,
  },
  enableAddToFavorite: {
    type: Boolean,
    default: false,
  },
  enableExpand: {
    type: Boolean,
    default: false,
  },
  isExpandedRowVisible: {
    type: Function,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  loadingRows: {
    type: Number,
    default: 10,
  },
  hideNoData: {
    type: Boolean,
    default: false,
  },
  enableUrlParams: {
    type: Boolean,
    default: null,
  },
  enableScrollButton: {
    type: Boolean,
    default: false,
  },
  multipleSelect: {
    type: Boolean,
    default: false,
  },
  restoredObjects: {
    type: Array,
    default: null,
  },
  density: {
    type: String,
    default: 'default',
  },
  headerDensity: {
    type: String,
    default: null,
  },
  rowDensity: {
    type: String,
    default: null,
  },
  hideDetails: {
    type: Boolean,
    default: false,
  },
  bordered: {
    type: Boolean,
    default: false,
  },
  rounded: {
    type: Boolean,
    default: true,
  },
  variant: {
    type: String,
    default: 'elevated',
  },
  hint: {
    type: String,
    default: null,
  },
  rules: {
    type: Array,
    default: () => [],
  },
  category: {
    type: String,
    default: null,
  },
  customColumnHeader: {
    type: String,
    default: null,
  },
  customColumnWidth: {
    type: Number,
    default: null,
  },
  page: {
    type: Number,
    default: 1,
  },
  perPage: {
    type: Number,
    default: null,
  },
  perPageOptions: {
    type: Array,
    default: () => ListConstant.ItemsPerPageOption.LIST,
  },
  hasNextPage: {
    type: Boolean,
    default: false,
  },
  selectedId: {
    type: String,
    default: null,
  },
  selectedIds: {
    type: Array,
    default: () => [],
  },
  sortField: {
    type: String,
    default: null,
  },
  sortOrder: {
    type: String,
    default: null,
  },
  showProgress: {
    type: Boolean,
    default: false,
  },
  query: {
    type: String,
    default: '',
  },
  nextTokenMap: {
    type: Object,
    default: () => ({}),
  },
  filters: {
    type: Array,
    default: () => [],
  },
  filterOptions: {
    type: Array,
    default: () => [],
  },
  enabledRowSelect: {
    type: Boolean,
    default: true,
  },
  onRowExpanded: {
    type: Function,
    default: null,
  },
  onSelect: {
    type: Function,
    default: null,
  },
  onAllSelect: {
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
  onPageChange: {
    type: Function,
    default: () => {},
  },
  onPerPageChange: {
    type: Function,
    default: () => {},
  },
  onSortByChange: {
    type: Function,
    default: () => {},
  },
  onFiltersChange: {
    type: Function,
    default: () => {},
  },
  onQueryChange: {
    type: Function,
    default: null,
  },
  onCategoryChange: {
    type: Function,
    default: () => {},
  },
  hiddenSelectableIdMap: {
    type: Object,
    default: () => ({}),
  },
  isRowSelectable: {
    type: Boolean,
    default: false,
  },
  isAllSelectIndeterminate: {
    type: Boolean,
    default: false,
  },
  indeterminateIdSet: {
    type: Set,
    default: () => new Set(),
  },
  showActionMenuHeaderLine: {
    type: Boolean,
    default: false,
  },
  rowMenuMinWidth: {
    type: Number,
    default: null,
  },
  rowMaxHeight: {
    type: Number,
    default: null,
  },
  onClientSidePageChange: {
    type: Function,
    default: () => {},
  },
  onClientSidePerPageChange: {
    type: Function,
    default: () => {},
  },
  onClientSideCurrentItemsChange: {
    type: Function,
    default: () => {},
  },
});

const model = defineModel({
  type: [Array, Object],
  default: [],
});

const slots = useSlots();
const route = useRoute();
const router = useRouter();

const enableUrlParams = computed(() => props.enableUrlParams ?? !isInsideDialog);

const resolveInitialSortKey = (sortField) => {
  const header = props.headers.find(headerItem => headerItem.sortKey === sortField);
  return header?.key ?? strUtils.toCamelCase(sortField);
};

const state = reactive({
  currentItems: [],
  query: props.query,
  selectedId: null,
  selectedIds: [],
  selectedObjectMap: {},
  category: props.category || ListConstant.DefaultParams.CATEGORY,
  page: props.page || ListConstant.DefaultParams.PAGE,
  perPage: props.perPage || ListConstant.DefaultParams.PER_PAGE,
  sortBy: props.sortOrder && props.sortField ? [{ key: resolveInitialSortKey(props.sortField), order: props.sortOrder.toLowerCase() }] : [],
  filters: props.filters || ListConstant.DefaultParams.FILTERS,
  filterLogic: props.filterLogic || ListConstant.DefaultParams.FILTER_LOGIC,
});

const SELECT_COLUMN_WIDTH = 100;
const HEADERS_COLUMN_MIN_WIDTH = 160;
const ROW_MENU_COLUMN_MIN_WIDTH = 220;
const CUSTOM_COLUMN_MIN_WIDTH = 400;
const CUSTOM_COLUMN_MAX_WIDTH = 400;
const DENSITY_HEIGHTS = Object.freeze({
  default: {
    header: '56px',
    row: '52px',
  },
  comfortable: {
    header: '48px',
    row: '44px',
  },
  compact: {
    header: '40px',
    row: '36px',
  },
});

const headerSlotNames = computed(() => Object.keys(slots).filter(name => name.startsWith('header.')));
const itemSlotNames = computed(() => Object.keys(slots).filter(name => name.startsWith('item.')));

if (props.items.length > 0) {
  model.value = props.items;
  if (props.serverSide) {
    state.currentItems = props.items;
  }
}

if (props.selectedId) {
  state.selectedId = props.selectedId;
}

if (props.selectedIds) {
  state.selectedIds = props.selectedIds;
}

if (props.restoredObjects) {
  // Use an object map to retain user-selected data, as only the current page's data is retrieved when paginating.
  state.selectedObjectMap = Object.fromEntries(
    props.restoredObjects.map(item => [item.id, item]),
  );
}

const columnCount = computed(() => {
  return props.headers.length
    + Number(props.draggable)
    + Number(props.enableAddToFavorite)
    + Number(props.enableExpand)
    + Number(!!props.onSelect)
    + Number(!!slots.actions)
    + Number(!!slots['row-menu']);
});
const headersByKey = computed(() => new Map(
  props.headers.map(header => [header.key ?? header.value, header]),
));
// In server-side mode the backend owns ordering. Give each sortable column an
// identity comparator so VDataTable keeps the server's order (stable sort)
// instead of re-sorting the current page client-side, which would diverge from
// the backend collation (e.g. mixed CJK/ASCII names).
//
// In client-side mode, a header can opt into its own comparator via `sortComparator` — e.g. a
// "S1"/"S2"/"S10" column, where VDataTable's default string compare would sort "S10" before
// "S2". Columns without one keep VDataTable's default.
const customKeySort = computed(() => {
  const entries = props.headers.reduce((acc, header) => {
    if (!header.sortable || !header.key) return acc;
    if (props.serverSide) {
      acc[header.key] = () => 0;
    } else if (header.sortComparator) {
      acc[header.key] = header.sortComparator;
    }
    return acc;
  }, {});
  return Object.keys(entries).length ? entries : undefined;
});
const getRowColumns = columns => columns.map((column) => {
  const header = headersByKey.value.get(column.key ?? column.value);

  if (!header) {
    return column;
  }

  return {
    ...column,
    cellProps: column.cellProps ?? header.cellProps,
  };
});
const getDensityHeight = (density, type) => DENSITY_HEIGHTS[density]?.[type];
const getDensityStyle = (variableName, density, type) => {
  const height = getDensityHeight(density, type);

  return height ? { [variableName]: height } : {};
};
const tableDensityStyles = computed(() => ({
  ...getDensityStyle('--v-table-header-height', props.headerDensity, 'header'),
  ...getDensityStyle('--v-table-row-height', props.rowDensity, 'row'),
}));

const selectableItems = computed(() => {
  return state.currentItems.filter(item => !props.disabledIdMap[item.id] && !props.hiddenSelectableIdMap[item.id]);
});

const isAllSelected = computed(() => {
  if (!props.multipleSelect) return false;
  return selectableItems.value.length > 0 && selectableItems.value.every(item => state.selectedIds.includes(item.id));
});

watch(() => props.items, (after) => {
  model.value = after;
  if (props.serverSide) {
    state.currentItems = after;
  }
});

// Sync local state when the prop changes externally
watch(() => props.page, (after) => {
  state.page = after;
});

// Sync local state when the prop changes externally
watch(() => props.selectedId, (after) => {
  state.selectedId = after;
});

// Sync local state when the prop changes externally
watch(() => props.selectedIds, (after) => {
  const ids = after ?? [];
  state.selectedIds = ids;
  state.selectedObjectMap = ids.reduce((acc, id) => {
    const value = state.selectedObjectMap[id] ?? props.items.find(i => i.id === id);
    if (value) acc[id] = value;
    return acc;
  }, {});
});

// Sync local state when the prop changes externally
watch(() => props.restoredObjects, (after) => {
  state.selectedObjectMap = Object.fromEntries(
    after.map(item => [item.id, item]),
  );
});

const addItem = (value) => {
  model.value = [...model.value, ...(Array.isArray(value) ? value : [value])];
};

const updateItem = (index, item) => {
  model.value = model.value.map((value, i) => (i === index ? item : value));
};

const removeItem = (index) => {
  model.value = model.value.filter((_, i) => i !== index);
};

const handleNextPage = () => {
  state.page += 1;
};

const handlePreviousPage = () => {
  state.page -= 1;
};

const handleSelect = (id) => {
  const item = props.items.find(item => item.id === id);
  if (props.multipleSelect) {
    const isSelected = state.selectedIds.includes(id);
    state.selectedIds = isSelected ? state.selectedIds.filter(selectedId => selectedId !== id) : [...state.selectedIds, id];
    if (isSelected) {
      delete state.selectedObjectMap[id];
    }
    if (!isSelected && !state.selectedObjectMap[id]) {
      const selectedItem = props.items.find(item => item.id === id);
      if (selectedItem) {
        state.selectedObjectMap[id] = selectedItem;
      }
    }
    props.onSelect(Object.values(state.selectedObjectMap));
    return;
  }
  state.selectedId = id;
  props.onSelect(item);
};

const toggleSelectAll = () => {
  if (!props.multipleSelect || !props.onSelect) return;
  const selectedItemMap = new Map(state.selectedIds.filter(Boolean).map(id => [id, state.selectedObjectMap[id]]));
  if (isAllSelected.value) {
    selectableItems.value.forEach((item) => {
      selectedItemMap.delete(item.id);
      delete state.selectedObjectMap[item.id];
    });
  } else {
    selectableItems.value.forEach((item) => {
      selectedItemMap.set(item.id, item);
      state.selectedObjectMap[item.id] ??= item;
    });
  }
  state.selectedIds = Array.from(selectedItemMap.keys());
  props.onAllSelect(Object.values(state.selectedObjectMap));
};

const handleQueryChange = useDebounceFn(() => {
  if (!props.onQueryChange || !props.serverSide) return;
  if (enableUrlParams.value) {
    router.replace({
      query: {
        ...route.query,
        q: state.query || undefined,
        page: undefined,
        pageToken: undefined,
      },
    });
  }
  state.page = ListConstant.DefaultParams.PAGE;
  props.onQueryChange(state.query);
}, 500);

const handlePerPageChange = () => {
  if (!props.onPerPageChange || !props.serverSide) return;
  if (enableUrlParams.value) {
    router.replace({
      query: {
        ...route.query,
        perPage: state.perPage,
        page: undefined,
        pageToken: undefined,
      },
    });
  }
  localStorage.setItem('per_page', state.perPage);
  state.page = ListConstant.DefaultParams.PAGE;
  props.onPerPageChange(state.perPage);
};

const handlePageChange = () => {
  if (!props.onPageChange || !props.serverSide) return;
  if (enableUrlParams.value) {
    const pageToken = encodePageTokens(props.nextTokenMap, state.page);
    router.replace({
      query: {
        ...route.query,
        page: state.page,
        pageToken,
      },
    });
  }
  props.onPageChange(state.page, props.nextTokenMap[state.page - 1]);
};

const handleSortByChange = (items) => {
  if (!props.onSortByChange || !props.serverSide) return;
  if (items.length < 1) return;
  const [item] = items;
  const { key, order } = item;
  const header = props.headers.find(headerItem => headerItem.key === key);
  const sortField = header?.sortKey ?? strUtils.toSnakeCase(key);
  const sortOrder = order.toUpperCase();
  if (enableUrlParams.value) {
    router.replace({
      query: {
        ...route.query,
        order: sortOrder,
        sort: sortField,
        page: undefined,
        pageToken: undefined,
      },
    });
  }
  state.page = ListConstant.DefaultParams.PAGE;
  props.onSortByChange({ key: sortField, order: sortOrder });
};

const handleFiltersChange = () => {
  if (!props.onFiltersChange || !props.serverSide) return;
  if (enableUrlParams.value) {
    router.replace({
      query: {
        ...route.query,
        q: state.query || undefined,
        filters: state.filters.length > 0 ? encodeURIComponent(JSON.stringify(state.filters)) : undefined,
        page: undefined,
        pageToken: undefined,
      },
    });
  }
  state.page = ListConstant.DefaultParams.PAGE;
  props.onFiltersChange(state.filters, state.query);
};

const handleCategoryChange = (value) => {
  router.replace({
    query: {
      ...route.query,
      category: value === ListConstant.DefaultParams.CATEGORY ? undefined : value,
      q: undefined,
      filters: undefined,
      page: undefined,
      pageToken: undefined,
    },
  });
  state.page = ListConstant.DefaultParams.PAGE;
  state.query = ListConstant.DefaultParams.QUERY;
  state.filters = [];
  props.onCategoryChange(value);
};

const handleClientSideCurrentItemsChange = (v) => {
  state.currentItems = v;
  props.onClientSideCurrentItemsChange(v);
};
</script>

<template>
  <AppInput
    v-model="model"
    :hint="props.hint"
    :rules="props.rules"
    :hide-details="props.hideDetails"
  >
    <v-card
      :flat="props.bordered"
      :rounded="props.rounded"
      :variant="props.variant"
      :class="{ bordered: props.bordered }"
    >
      <template v-if="props.title || $slots.title">
        <v-card-title class="d-flex align-center justify-space-between">
          <div class="d-flex align-center">
            <template v-if="props.icon">
              <v-icon
                color="primary"
                class="mr-2"
                size="small"
              >
                {{ props.icon }}
              </v-icon>
            </template>
            <template v-else-if="props.iconPath">
              <AppImageIcon
                :src="props.iconPath"
                mask-color="primary"
              />
            </template>
            <template v-if="$slots.title">
              <slot name="title" />
            </template>
            <template v-else>
              {{ props.title }}
            </template>
          </div>
          <div class="d-flex align-center ga-2">
            <slot name="title-actions" />
          </div>
        </v-card-title>
        <v-divider />
      </template>
      <template v-if="$slots['search-top']">
        <slot name="search-top" />
      </template>
      <template v-if="props.enableSearch || $slots['header-actions']">
        <v-card-text class="d-flex align-center justify-space-between">
          <v-row>
            <v-col>
              <template v-if="$slots.search">
                <slot name="search" />
              </template>
              <template v-else-if="props.filterOptions.length > 0 && state.category === ListConstant.DefaultParams.CATEGORY">
                <AppFilterInput
                  v-model:filters="state.filters"
                  v-model:query="state.query"
                  :filter-options="props.filterOptions"
                  :on-update="handleFiltersChange"
                />
              </template>
              <template v-else>
                <AppTextField
                  v-model="state.query"
                  :label="$t('__actionSearch')"
                  prepend-inner-icon="mdi-magnify"
                  hide-details
                  clearable
                  class="search"
                  @click:clear="() => { state.query = '' }"
                  @update:model-value="handleQueryChange"
                />
              </template>
            </v-col>
            <template v-if="$slots['header-actions']">
              <v-col
                :cols="12"
                sm="auto"
                class="d-flex align-center ga-2"
              >
                <template v-if="props.enableAddToFavorite">
                  <AppTableCategorySelect
                    v-model="state.category"
                    @update:model-value="handleCategoryChange"
                  />
                </template>
                <slot name="header-actions" />
              </v-col>
            </template>
          </v-row>
        </v-card-text>
        <v-divider />
      </template>
      <template v-if="props.showProgress">
        <AppProgressLinear
          :height="2"
          indeterminate
          :rounded="false"
        />
      </template>
      <AppTableBase
        v-model="model"
        v-model:sort-by="state.sortBy"
        :custom-key-sort="customKeySort"
        :draggable="props.draggable"
        :headers="[
          ...(props.draggable ? [{ text: '', value: TableConstant.ColumnKey.DRAG }] : []),
          ...(props.enableAddToFavorite ? [{ text: '', value: TableConstant.ColumnKey.ADD_TO_FAVORITES }] : []),
          ...(props.enableExpand ? [{ text: '', value: TableConstant.ColumnKey.EXPAND }] : []),
          ...(props.onSelect ? [{ text: '', value: TableConstant.ColumnKey.SELECT, width: SELECT_COLUMN_WIDTH }] : []),
          ...props.headers.map(header => ({
            ...header,
            sortable: header.sortable ?? false,
            minWidth: header.minWidth ?? HEADERS_COLUMN_MIN_WIDTH,
          })).filter(header => !header.isHidden),
          ...($slots.actions ? [{ text: '', value: TableConstant.ColumnKey.ACTIONS }] : []),
          ...($slots['row-menu'] ? [{
            text: '',
            value: TableConstant.ColumnKey.MENU,
            minWidth: props.rowMenuMinWidth ?? ROW_MENU_COLUMN_MIN_WIDTH,
            width: 240,
            headerProps: {
              class: props.showActionMenuHeaderLine ? 'row-menu-header-line' : '',
            },
          }] : []),
          ...($slots['custom-column'] ? [{
            title: props.customColumnHeader ?? '',
            value: TableConstant.ColumnKey.CUSTOM,
            minWidth: props.customColumnWidth ?? CUSTOM_COLUMN_MIN_WIDTH,
            maxWidth: props.customColumnWidth ?? CUSTOM_COLUMN_MAX_WIDTH,
            headerProps: { class: 'custom-column' },
            cellProps: () => ({ class: 'custom-column' }),
          }] : []),
        ]"
        :column-count="columnCount"
        :density="props.density"
        :style="tableDensityStyles"
        :hide-default-header="props.loading"
        :hide-default-body="!props.loading"
        hide-default-footer
        :hide-no-data="props.hideNoData"
        hover
        :item-value="props.itemValue"
        :items-per-page="props.showPagination ? state.perPage : -1"
        :loading="props.loading"
        :search="props.onQueryChange ? null : state.query"
        :has-query="!!state.query || state.filters.length > 0"
        :enable-scroll-button="props.enableScrollButton"
        :on-client-side-current-items-change="props.serverSide ? null : handleClientSideCurrentItemsChange"
        @update:sort-by="handleSortByChange"
      >
        <template
          v-for="slotName in headerSlotNames"
          :key="slotName"
          #[slotName]="slotProps"
        >
          <slot
            :name="slotName"
            v-bind="slotProps"
          />
        </template>
        <template
          v-if="props.onSelect && props.multipleSelect && props.onAllSelect && selectableItems.length > 0"
          #header.select
        >
          <div class="d-flex align-center justify-center">
            <AppCheckbox
              :model-value="isAllSelected"
              hide-details
              :indeterminate="props.isAllSelectIndeterminate && !isAllSelected"
              :tooltip="isAllSelected ? $t('__titleDeselectAll') : $t('__titleSelectAll')"
              @update:model-value="toggleSelectAll"
            />
          </div>
        </template>
        <template
          v-if="$slots['body.prepend']"
          #body.prepend
        >
          <tr>
            <td
              :colspan="columnCount"
              class="pa-0"
            >
              <slot name="body.prepend" />
              <v-divider />
            </td>
          </tr>
        </template>
        <template #item="{ columns, item, internalItem, internalItems, isExpanded, toggleExpand, isDragging }">
          <AppTableRow
            :columns="getRowColumns(columns)"
            :internal-item="internalItem"
            :internal-items="internalItems"
            :item="item"
            :disabled-id-map="props.disabledIdMap"
            :disabled-tooltip="props.disabledTooltip"
            :is-expanded="isExpanded"
            :toggle-expand="toggleExpand"
            :column-count="columnCount"
            :dragging="isDragging"
            :multiple-select="props.multipleSelect"
            :on-row-select="(!props.disabledIdMap[item.id] && !props.hiddenSelectableIdMap[item.id] && props.onSelect) ? handleSelect : null"
            :on-select="props.onSelect ? handleSelect : null"
            :on-item-click="props.onItemClick"
            :on-row-click="props.onRowClick"
            :selected-id="state.selectedId"
            :selected-ids="state.selectedIds"
            :hidden-selectable-id-map="props.hiddenSelectableIdMap"
            :is-clickable="props.isRowSelectable"
            :indeterminate-id-set="props.indeterminateIdSet"
            :row-expanded="props.onRowExpanded ? props.onRowExpanded(item) : false"
            :row-max-height="props.rowMaxHeight"
            :is-expanded-row-visible="props.isExpandedRowVisible"
          >
            <template #menu="{ item, isHovering }">
              <slot
                name="row-menu"
                :index="internalItem.index"
                :item="item"
                :is-hovering="isHovering"
              />
            </template>
            <template #custom-column="{ item, isHovering }">
              <slot
                name="custom-column"
                :item="item"
                :is-hovering="isHovering"
              />
            </template>
            <template #expanded-row="item">
              <slot
                name="expanded-row"
                v-bind="item"
              />
            </template>
            <template #actions="{ item }">
              <slot
                name="actions"
                :item="item"
                :index="internalItem.index"
                :on-item-add="addItem"
                :on-item-update="(item) => updateItem(internalItem.index, item)"
                :on-item-remove="() => removeItem(internalItem.index)"
              />
            </template>
            <template
              v-for="slotName in itemSlotNames"
              :key="slotName"
              #[slotName]="slotProps"
            >
              <slot
                :name="slotName"
                v-bind="slotProps"
              />
            </template>
          </AppTableRow>
        </template>
        <template
          v-if="$slots['no-data']"
          #no-data
        >
          <slot name="no-data" />
        </template>
        <template #bottom>
          <template v-if="$slots.bottom">
            <div class="py-3">
              <slot
                name="bottom"
                :on-item-add="addItem"
              />
            </div>
          </template>
          <template v-if="props.showPagination && Array.isArray(model) && model.length > 0">
            <template v-if="props.serverSide">
              <v-divider />
              <div class="w-100 d-flex flex-row-reverse flex-wrap align-center justify-start pa-4">
                <div class="d-flex align-center pl-4">
                  <span class="pr-2">{{ $t('__titleRowsPerPage') }}</span>
                  <AppSelect
                    v-model="state.perPage"
                    :items="props.perPageOptions"
                    :max-width="108"
                    class="d-flex justify-center align-center"
                    hide-details
                    @update:model-value="handlePerPageChange"
                  />
                </div>
                <div>
                  <AppIconButton
                    :disabled="state.page <= 1 || props.loading"
                    icon="mdi-chevron-left"
                    variant="text"
                    size="small"
                    @click="() => {
                      handlePreviousPage();
                      handlePageChange();
                    }"
                  />
                  <span class="text-body-1 mx-4">
                    {{ state.page }}
                  </span>
                  <AppIconButton
                    :disabled="!props.hasNextPage || props.loading"
                    icon="mdi-chevron-right"
                    variant="text"
                    size="small"
                    @click="() => {
                      handleNextPage();
                      handlePageChange();
                    }"
                  />
                </div>
              </div>
            </template>
            <template v-else-if="Array.isArray(model) && model.length > state.perPage || state.perPage !== ListConstant.DefaultParams.PER_PAGE">
              <v-divider />
              <v-data-table-footer
                class="w-100 d-flex flex-row-reverse align-center justify-start pa-4"
                show-current-page
                :items-per-page-options="props.perPageOptions"
              />
            </template>
          </template>
        </template>
        <template #loading>
          <AppTableLoader :rows="props.loadingRows" />
        </template>
      </AppTableBase>
    </v-card>
    <slot name="dialog" />
  </AppInput>
</template>

<style lang="scss" scoped>
.v-input {
  .v-card {
    height: fit-content;
    width: 100%;
  }
}
.v-card-text {
  background-color: rgba(var(--v-theme-backgroundScale1));
  min-height: 60px;
}
.bordered {
  border-radius: 4px;
  border: 1px solid rgba(var(--v-theme-inputBorder));
  transition: border 0.25s;
  .focused & {
    border: 1px solid rgba(var(--v-theme-primary)) !important;
    transition: none;
  }
  &:hover {
    border: 1px solid #000000;
  }
  @at-root .v-theme--dark & {
    &:hover {
      border: 1px solid #ffffff;
    }
  }
  .v-input--error &,
  .v-input--error &:hover {
    border: 1px solid rgba(var(--v-theme-error));
  }
  :deep(.v-table) {
    th {
      background-color: rgba(var(--v-theme-background)) !important;
    }
  }
}
.search {
  :deep(.v-field) {
    height: 36px !important;
    display: flex;
    align-items: center;
  }
}

:deep(th.row-menu-header-line) {
  position: relative;
}

:deep(th.row-menu-header-line::after) {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  transform: translateY(-0.5px);
}

</style>
