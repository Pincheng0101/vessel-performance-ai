<script setup>
import { ListConstant, ResourceConstant } from '~/constants';

/**
 * @import { DatasetItem, DatasetItemResponse } from '~/models/server/datasetItem'
 */

const props = defineProps({
  dataset: {
    type: Object,
    default: null,
  },
  executionOutputMap: {
    type: Object,
    default: () => ({}),
  },
  loadingMap: {
    type: Object,
    default: () => ({}),
  },
  onEvaluate: {
    type: Function,
    default: null,
  },
  onLoadingChange: {
    type: Function,
    default: null,
  },
  onColumnsDelete: {
    type: Function,
    default: null,
  },
  onColumnsAdd: {
    type: Function,
    default: null,
  },
  onColumnsEdit: {
    type: Function,
    default: null,
  },
  onDatasetItemFromStorageReplace: {
    type: Function,
    default: null,
  },
  onDatasetItemsGenerate: {
    type: Function,
    default: null,
  },
  onGenerationConfigSave: {
    type: Function,
    default: null,
  },
});

const server = useServer();
const route = useRoute();
const router = useRouter();
const { createSignal } = useAbortController();
const { page, perPage, sortOrder, sortField, query, nextTokenMap, initUrlParams, encodePageTokens } = usePagination({
  type: ResourceConstant.Type.DATASET.value,
});
const snackbarStore = useSnackbarStore();

const dialogActionResultFromStorageConfirmCardRef = ref(null);

const state = reactive({
  /**
   * @type {DatasetItem[]}
   */
  datasetItems: [],
  dataset: null,
  isLoading: false,
  filters: query.value ? query.value.split(',') : null,
  selectedItems: [],
  actionResult: null,
  actionResultLabel: '',
  expandedRowId: null,
});

const DEFAULT_MAX_CHARS = 30;

state.dataset = props.dataset;

const inputFieldNames = computed(() => (state.dataset?.inputFields || []).map(field => field?.name).filter(Boolean));
const outputFieldNames = computed(() => (state.dataset?.outputFields || []).map(field => field?.name).filter(Boolean));

const createFieldDescriptionMap = fields => Object.fromEntries((fields || []).filter(({ name, description }) => name && description).map(({ name, description }) => [name, description]));
const inputFieldDescriptionMap = computed(() => createFieldDescriptionMap(state.dataset?.inputFields));
const outputFieldDescriptionMap = computed(() => createFieldDescriptionMap(state.dataset?.outputFields));

const combinedFieldNames = computed(() => arrUtils.deduplicate([...(inputFieldNames.value || []), ...(outputFieldNames.value || [])]));
const tableKey = computed(() => [...(inputFieldNames.value || []), ...(outputFieldNames.value || [])].join('|'));

const headers = computed(() => {
  const lastInputFieldName = inputFieldNames.value[inputFieldNames.value.length - 1];

  const inputChildren = inputFieldNames.value.length > 0
    ? inputFieldNames.value.map((fieldName) => {
        const isSeparator = fieldName === lastInputFieldName;
        const baseClass = [
          isSeparator && 'input-output-separator',
          'field-center',
        ];
        return {
          title: fieldName,
          key: `dataset-item-input-${fieldName}`,
          value: item => item.datasetItemData?.inputFields?.[fieldName] ?? item.datasetItemData?.[fieldName],
          sortable: false,
          isSingleLine: item => state.expandedRowId !== item.id,
          maxChars: item => (state.expandedRowId === item.id ? null : 20),
          forceText: true,
          headerProps: { class: [...baseClass, 'text-no-wrap'] },
          cellProps: () => ({ class: baseClass }),
        };
      })
    : [{ title: '-', key: 'dataset-item-input-empty', sortable: false, value: () => '-' }];

  const outputChildren = outputFieldNames.value.length > 0
    ? outputFieldNames.value.map(fieldName => ({
        title: fieldName,
        key: `dataset-item-output-${fieldName}`,
        value: item => item.datasetItemData?.outputFields?.[fieldName] ?? item.datasetItemData?.[fieldName],
        sortable: false,
        isSingleLine: item => state.expandedRowId !== item.id,
        maxChars: item => (state.expandedRowId === item.id ? null : 20),
        forceText: true,
        headerProps: { class: 'field-center text-no-wrap' },
        cellProps: () => ({ class: 'field-center' }),
      }))
    : [{ title: '-', key: 'dataset-item-output-empty', sortable: false, value: () => '-' }];

  return [
    {
      title: $t('__fieldInputField'),
      align: 'center',
      children: inputChildren,
    },
    {
      title: $t('__fieldOutputField'),
      align: 'center',
      children: outputChildren,
    },
  ];
});

const isAllSelectIndeterminate = computed(() => state.selectedItems?.length !== 0 && (state.selectedItems?.length < state.datasetItems?.length));

watch(() => props.dataset, (after) => {
  state.dataset = after;
});

const fetchDatasetItems = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  const signal = createSignal();

  state.isLoading = true;
  state.datasetItems = [];
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const datasetItemIds = state.filters?.length > 0 ? state.filters : (query.value ? query.value.split(',') : undefined);
  const { data, error } = await server.datasetItem.list({
    nextToken,
    datasetId: route.params.id,
    limit: perPage.value,
    sortField: sortField.value,
    sortOrder: sortOrder.value,
    datasetItemIds,
  }, {
    lazy: false,
    signal,
  });
  if (signal.aborted) return;

  if (error.value) {
    state.isLoading = false;
    return;
  }
  nextTokenMap.value[pageValue] = data.value.nextToken;
  state.datasetItems = data.value.data;
  page.value = pageValue;
  state.isLoading = false;
  // Navigate to the previous page if the current page has no items
  if (state.datasetItems.length === 0 && pageValue > 1) {
    goToPreviousPage();
    fetchDatasetItems(page.value);
  }
};

const openActionResultDialog = (result, actionLabel) => {
  state.actionResult = result;
  state.actionResultLabel = actionLabel;
  dialogActionResultFromStorageConfirmCardRef.value.open();
};

/**
 * @param {DatasetItemResponse} v
 */
const handleDelete = async (v) => {
  const { data, error } = await server.datasetItem.destroy({
    datasetId: route.params.id,
    datasetItemIds: [v.id],
  });
  if (error.value) {
    state.isLoading = false;
    snackbarStore.setActionFailure('__actionDelete');
    return;
  }
  if (data.value.failures.length > 0) {
    snackbarStore.setFailure(data.value.failures[0].errorMessage || '');
    return;
  }
  const index = state.datasetItems.findIndex(obj => obj.id === v.id);
  if (index !== -1) {
    state.datasetItems.splice(index, 1);
  }
  snackbarStore.setActionSuccess('__actionDelete');
};

/**
 * @param {DatasetItemResponse} v
 * @param {Object<string, any>} formData
 */
const handleEdit = async (v, formData) => {
  const { data, error } = await server.datasetItem.update({
    datasetId: route.params.id,
    datasetItems: [
      {
        datasetItemId: v.id,
        datasetItemData: formData,
      },
    ],
  });
  if (error.value) {
    state.error = error.value.data;
    snackbarStore.setActionFailure('__actionUpdate');
    return;
  }
  if (data.value.failures.length > 0) {
    snackbarStore.setFailure(data.value.failures[0].errorMessage || '');
    return;
  }
  const target = state.datasetItems.find(obj => obj.id === v.id);
  if (target) {
    Object.assign(target.datasetItemData, formData);
  }
  snackbarStore.setActionSuccess('__actionUpdate');
};

const handleDatasetItemsDelete = async () => {
  const { data, error } = await server.datasetItem.destroy({
    datasetId: route.params.id,
    datasetItemIds: state.selectedItems.map(item => item.id),
  });
  if (error.value) {
    state.isLoading = false;
    snackbarStore.setActionFailure('__actionDelete');
    return;
  }
  state.selectedItems = [];
  fetchDatasetItems();
  if (data.value.failures.length > 0) {
    openActionResultDialog(data.value, '__actionDelete');
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
};

const handleDatasetItemAdd = async () => {
  await fetchDatasetItems();
};

const handleDatasetItemFromStorageReplace = async () => {
  state.selectedItems = [];
  await props.onDatasetItemFromStorageReplace();
  await fetchDatasetItems();
};

const handleColumnsDelete = async () => {
  await props.onColumnsDelete();
  await fetchDatasetItems();
};

const handleColumnsAdd = async () => {
  await props.onColumnsAdd();
  await fetchDatasetItems();
};

const handleColumnsEdit = async () => {
  await props.onColumnsEdit();
  await fetchDatasetItems();
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  const encodedPageToken = encodePageTokens(nextTokenMap.value, pageValue);
  router.replace({
    query: {
      ...route.query,
      page: pageValue > 1 ? pageValue : undefined,
      pageToken: encodedPageToken,
    },
  });
  fetchDatasetItems(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchDatasetItems();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchDatasetItems();
};

const handleFiltersChange = (value) => {
  state.filters = value;
  handleQueryChange(value);
  fetchDatasetItems();
};

const handleQueryChange = (value) => {
  const queryValue = Array.isArray(value) ? value.join(',') : value;
  query.value = queryValue;
  router.replace({
    query: {
      ...route.query,
      q: query.value || undefined,
      page: undefined,
      pageToken: undefined,
    },
  });
};

const handleSelect = (items) => {
  state.selectedItems = items;
};

const handleAllSelect = (items) => {
  state.selectedItems = items;
};

const evaluate = (item) => {
  if (!props.onEvaluate) return;
  props.onEvaluate(item);
};

const isRowLoading = item => !!props.loadingMap?.[item.id];

const toggleRowExpand = (item) => {
  if (!item?.id) return;
  state.expandedRowId = state.expandedRowId === item.id ? null : item.id;
};

const handleDatasetItemsGenerate = () => {
  props.onDatasetItemsGenerate();
};

const handleGenerationConfigSave = () => {
  props.onGenerationConfigSave();
};

initUrlParams();
fetchDatasetItems(page.value);
</script>

<template>
  <AppTable
    :key="tableKey"
    :title="$t('__fieldDatasetItem', 2)"
    :icon="ResourceConstant.Type.DATASET.icon"
    :headers="headers"
    :items="state.isLoading ? [] : state.datasetItems"
    :loading="state.isLoading"
    :has-next-page="!!nextTokenMap[page]"
    :page="page"
    :sort-order="sortOrder"
    :per-page="perPage"
    :next-token-map="nextTokenMap"
    :query="query"
    :filter-options="[
      { title: $t('__fieldDatasetItemId'), field: 'id' },
    ]"
    multiple-select
    enable-url-params
    show-row-menu-header-line
    :is-all-select-indeterminate="isAllSelectIndeterminate"
    :selected-ids="state.selectedItems?.map(item => item.id)"
    :row-menu-min-width="160"
    :row-max-height="400"
    :custom-column-header="$t('__fieldExecutionOutput')"
    :on-all-select="handleAllSelect"
    :on-filters-change="handleFiltersChange"
    :on-page-change="handlePageChange"
    :on-per-page-change="handlePerPageChange"
    :on-query-change="handleQueryChange"
    :on-select="handleSelect"
    :on-sort-by-change="handleSortByChange"
    :on-row-expanded="(row) => state.expandedRowId === row.id"
  >
    <template
      v-for="fieldName in inputFieldNames"
      :key="`header-input-${fieldName}`"
      #[`header.dataset-item-input-${fieldName}`]
    >
      <div class="d-flex align-center justify-center text-no-wrap ga-1">
        <span>{{ fieldName }}</span>
        <AppInputTooltip
          v-if="inputFieldDescriptionMap[fieldName]"
          :text="inputFieldDescriptionMap[fieldName]"
        />
      </div>
    </template>
    <template
      v-for="fieldName in outputFieldNames"
      :key="`header-output-${fieldName}`"
      #[`header.dataset-item-output-${fieldName}`]
    >
      <div class="d-flex align-center justify-center text-no-wrap ga-1">
        <span>{{ fieldName }}</span>
        <AppInputTooltip
          v-if="outputFieldDescriptionMap[fieldName]"
          :text="outputFieldDescriptionMap[fieldName]"
        />
      </div>
    </template>
    <template #search>
      <AppCombobox
        v-model="state.filters"
        :label="$t('__titleModifyItem', { action: $t('__actionSearch'), item: $t('__fieldDatasetItemId') })"
        prepend-inner-icon="mdi-magnify"
        hide-details
        clearable
        multiple
        chips
        class="search"
        @click:clear="() => { state.filters = [] }"
        @update:model-value="handleFiltersChange"
      />
    </template>
    <template #header-actions>
      <AppIconButton
        icon="mdi-refresh"
        variant="text"
        :tooltip="$t('__actionRefresh')"
        @click="fetchDatasetItems"
      />
      <ResourceDeleteButton
        :items="state.selectedItems"
        :item-label="$t('__fieldDatasetItem', 2)"
        :on-delete="handleDatasetItemsDelete"
      />
      <ResourceDatasetItemColumnHeaderMenu
        :dataset="state.dataset"
        :on-columns-add="handleColumnsAdd"
        :on-columns-delete="handleColumnsDelete"
        :on-columns-edit="handleColumnsEdit"
      />
      <ResourceDatasetItemHeaderMenu
        :dataset="state.dataset"
        :on-add-dataset-item="handleDatasetItemAdd"
        :on-replace-from-storage="handleDatasetItemFromStorageReplace"
        :on-dataset-items-generate="handleDatasetItemsGenerate"
        :on-generation-config-save="handleGenerationConfigSave"
      />
    </template>
    <template #row-menu="{ item, isHovering }">
      <div class="d-flex align-center justify-end ga-2">
        <div
          class="hover-button"
          :class="{ visible: isHovering || isRowLoading(item) }"
        >
          <AppIconButton
            icon="mdi-play"
            variant="text"
            :tooltip="isRowLoading(item) ? $t('__actionEvaluating') : $t('__actionEvaluate')"
            :loading="isRowLoading(item)"
            :disabled="isRowLoading(item)"
            @click="() => evaluate(item)"
          >
            <template #loader>
              <AppProgressCircular
                :size="18"
                :width="2"
              />
            </template>
          </AppIconButton>
        </div>
        <ResourceDatasetItemActionMenu
          :item="item"
          :persistent="isHovering || isRowLoading(item)"
          :dataset-items="state.datasetItems"
          :field-names="combinedFieldNames"
          :on-delete="handleDelete"
          :on-edit="handleEdit"
        />
      </div>
    </template>
    <template #custom-column="{ item, isHovering }">
      <div
        class="d-flex align-center justify-space-between ga-2 h-100 w-100"
        :class="{ 'py-2': state.expandedRowId === item.id }"
      >
        <AppDisplayField
          class="flex-grow-1"
          :item="{
            value: props.executionOutputMap?.[item.id] ?? '-',
            isSingleLine: state.expandedRowId !== item.id,
            maxChars: state.expandedRowId === item.id ? null : DEFAULT_MAX_CHARS,
            forceText: true,
          }"
        />
        <AppIconButton
          :icon="state.expandedRowId === item.id ? 'mdi-chevron-up' : 'mdi-chevron-down'"
          variant="text"
          :tooltip="state.expandedRowId === item.id ? $t('__actionCollapse') : $t('__actionExpand')"
          class="hover-button"
          :class="{ visible: isHovering || state.expandedRowId === item.id }"
          @click="toggleRowExpand(item)"
        />
      </div>
    </template>
  </AppTable>
  <AppDialog ref="dialogActionResultFromStorageConfirmCardRef">
    <template #body="{ onSubmit, onCancel }">
      <ResourceDatasetItemActionResultConfirmationCard
        :success-count="state.actionResult?.successCount"
        :failures="state.actionResult?.failures"
        :action-label="$t(state.actionResultLabel)"
        :on-submit="onSubmit"
        :on-cancel="onCancel"
      />
    </template>
  </AppDialog>
</template>

<style lang="scss" scoped>
:deep(.input-output-separator) {
  border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
}

:deep(.custom-column) {
  border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity)) !important;
}

.hover-button {
  opacity: 0;
  pointer-events: none;
  &.visible {
    opacity: 1;
    pointer-events: auto;
  }
}
</style>
