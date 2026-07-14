<script setup>
const props = defineProps({
  fieldNames: {
    type: Array,
    default: () => [],
  },
  items: {
    type: Array,
    default: () => [],
  },
  actionLabel: {
    type: String,
    default: null,
  },
  itemLabel: {
    type: String,
    default: null,
  },
  instruction: {
    type: String,
    default: null,
  },
  disabledIdMap: {
    type: Object,
    default: () => ({}),
  },
  disabledTooltip: {
    type: String,
    default: '',
  },
  serverSide: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  page: {
    type: Number,
    default: 1,
  },
  perPage: {
    type: Number,
    default: null,
  },
  hasNextPage: {
    type: Boolean,
    default: false,
  },
  nextTokenMap: {
    type: Object,
    default: () => ({}),
  },
  onPageChange: {
    type: Function,
    default: () => {},
  },
  onPerPageChange: {
    type: Function,
    default: () => {},
  },
  onSubmit: {
    type: Function,
    required: true,
  },
  onDiscard: {
    type: Function,
    required: true,
  },
});

const state = reactive({
  isLoading: false,
  selectedItems: [],
  expandedRowId: null,
});

const COLUMN_MAX_DISPLAY_LENGTH = 20;

const selectedIds = computed(() => state.selectedItems.map(item => item.id));

const tableHeaders = computed(() => {
  return (props.fieldNames || []).map(key => ({
    title: key,
    key,
    value: item => item?.[key],
    isSingleLine: item => state.expandedRowId !== item.id,
    maxChars: item => (state.expandedRowId === item.id ? null : COLUMN_MAX_DISPLAY_LENGTH),
    forceText: true,
  }));
});

const tableItems = computed(() => (props.items || []).map((item, index) => ({
  ...item,
  id: item?.id ?? `row-${index}`,
})));

const selectableItems = computed(() => tableItems.value.filter(item => !props.disabledIdMap[item.id]));
const isAllSelectedOnPage = computed(() => selectableItems.value.length > 0 && selectableItems.value.every(item => selectedIds.value.includes(item.id)));
const isAllSelectIndeterminate = computed(() => state.selectedItems.length > 0 && !isAllSelectedOnPage.value);

const submit = async () => {
  state.isLoading = true;
  await props.onSubmit(state.selectedItems);
  state.isLoading = false;
};

const handleSelect = (items) => {
  state.selectedItems = items;
};

const toggleRowExpand = (item) => {
  if (!item?.id) return;
  state.expandedRowId = state.expandedRowId === item.id ? null : item.id;
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleModifyItem', { action: props.actionLabel || $t('__actionSelect'), item: itemLabel || $t('__fieldDatasetItem', 2) })"
    :submit-button-text="props.actionLabel || $t('__actionAdd')"
    :on-submit="submit"
    :on-discard="props.onDiscard"
  >
    <template #body>
      <div class="my-4">
        {{ props.instruction || $t('__instructionDatasetItemsSelection') }}
      </div>
      <AppTable
        :server-side="props.serverSide"
        :headers="tableHeaders"
        :items="props.loading ? [] : tableItems"
        :loading="props.loading"
        :disabled-id-map="props.disabledIdMap"
        :disabled-tooltip="props.disabledTooltip"
        :enable-url-params="false"
        :has-next-page="props.hasNextPage"
        :page="props.page"
        :per-page="props.perPage"
        :next-token-map="props.nextTokenMap"
        :selected-ids="selectedIds"
        :is-all-select-indeterminate="isAllSelectIndeterminate"
        :on-select="handleSelect"
        :on-all-select="handleSelect"
        :on-page-change="props.onPageChange"
        :on-per-page-change="props.onPerPageChange"
        :enable-search="false"
        :show-pagination="props.serverSide"
        :multiple-select="true"
        :row-max-height="400"
        :custom-column-width="50"
        is-row-selectable
        bordered
        hide-details
        :on-row-expanded="(row) => state.expandedRowId === row.id"
      >
        <template #custom-column="{ item }">
          <AppIconButton
            :icon="state.expandedRowId === item.id ? 'mdi-chevron-up' : 'mdi-chevron-down'"
            variant="text"
            :tooltip="state.expandedRowId === item.id ? $t('__actionCollapse') : $t('__actionExpand')"
            @click="toggleRowExpand(item)"
          />
        </template>
      </AppTable>
    </template>
  </AppForm>
</template>
