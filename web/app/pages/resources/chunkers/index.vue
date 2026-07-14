<script setup>
import { ChunkerConstant, ListConstant, ResourceConstant, StatusConstant } from '~/constants';

const server = useServer();
const { category, page, perPage, sortField, sortOrder, filters, filterLogic, query, nextTokenMap, initUrlParams, updateFiltersByCategory, goToPreviousPage } = usePagination({
  type: ResourceConstant.Type.CHUNKER.value,
  filterField: ResourceConstant.Type.CHUNKER.favoriteFilterField,
});
const { isChunkerDisabled } = useFeature();
const { createSignal } = useAbortController();
const snackbarStore = useSnackbarStore();

const state = reactive({
  chunkers: [],
  isLoading: false,
});

const fetchChunkers = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  const signal = createSignal();

  state.isLoading = true;
  state.chunkers = [];
  updateFiltersByCategory();
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const { data, error } = await server.chunker.list({
    nextToken,
    limit: perPage.value,
    sortField: sortField.value,
    sortOrder: sortOrder.value,
    filters: filters.value,
    filterLogic: filterLogic.value,
    query: query.value,
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
  state.chunkers = data.value.data;
  page.value = pageValue;
  state.isLoading = false;
  // Navigate to the previous page if the current page has no items
  if (state.chunkers.length === 0 && pageValue > 1) {
    goToPreviousPage();
    fetchChunkers(page.value);
  }
};

initUrlParams();
fetchChunkers(page.value);

const handleDelete = async ({ chunkerId }) => {
  const { error } = await server.chunker.destroy({ chunkerId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  fetchChunkers(page.value);
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  fetchChunkers(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchChunkers();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchChunkers();
};

const handleDuplicate = async ({ item, formData }) => {
  const { data, error } = await server.chunker.duplicate({
    chunkerId: item.id,
    newChunkerName: formData.name,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDuplicate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.CHUNKER.value, data.value.id));
};

const handleQueryChange = (value) => {
  query.value = value;
  fetchChunkers();
};

const handleFiltersChange = (filtersValue, queryValue) => {
  filters.value = filtersValue;
  query.value = queryValue;
  fetchChunkers();
};

const handleCategoryChange = (value) => {
  category.value = value;
  query.value = ListConstant.DefaultParams.QUERY;
  updateFiltersByCategory({ reset: value === ListConstant.Category.ALL.value });
  fetchChunkers();
};
</script>

<template>
  <AppNotEnabledCard
    v-if="!state.isLoading && isChunkerDisabled"
    :icon="ResourceConstant.Type.CHUNKER.icon"
    :i18n-item="$t('__fieldChunker')"
    :instruction="$t('__instructionResourceChunker')"
  />
  <AppTable
    v-else
    :title="$t('__fieldChunker', 2)"
    :icon="ResourceConstant.Type.CHUNKER.icon"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'chunker_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.CHUNKER.value, item.id) }) },
      { title: $t('__fieldId'), key: 'id' },
      { title: $t('__fieldType'), key: 'type', value: item => findField(ChunkerConstant.Type, item.type, 'title'), iconPath: item => findField(ChunkerConstant.Type, item.type, 'iconPath') },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :items="state.isLoading ? [] : state.chunkers"
    :loading="state.isLoading"
    :has-next-page="!!nextTokenMap[page]"
    :category="category"
    :page="page"
    :sort-field="sortField"
    :sort-order="sortOrder"
    :per-page="perPage"
    :query="query"
    :next-token-map="nextTokenMap"
    :filters="filters"
    :filter-logic="filterLogic"
    :filter-options="[
      { title: $t('__fieldName'), field: 'chunker_name' },
      { title: $t('__fieldId'), field: 'chunker_id' },
      { title: $t('__fieldType'), field: 'chunker_type', values: Object.values(ChunkerConstant.Type).map(item => ({ ...item, subtitle: $t(item.i18nSubtitle) })) },
      { title: $t('__fieldStatus'), field: 'status', values: Object.values(StatusConstant.Resource).map(item => ({ ...item, title: $t(item.i18nTitle) })) },
    ]"
    :on-page-change="handlePageChange"
    :on-per-page-change="handlePerPageChange"
    :on-sort-by-change="handleSortByChange"
    :on-query-change="handleQueryChange"
    :on-filters-change="handleFiltersChange"
    :on-category-change="handleCategoryChange"
    enable-add-to-favorite
  >
    <template #header-actions>
      <AppIconButton
        icon="mdi-refresh"
        variant="text"
        :tooltip="$t('__actionRefresh')"
        @click="fetchChunkers(page)"
      />
      <AppIconButton
        icon="mdi-plus"
        class="primary-gradient"
        :tooltip="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t('__fieldChunker') })"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.CHUNKER.value)}/create`)"
      />
    </template>
    <template #row-menu="{ item, isHovering }">
      <ResourceActionMenu
        :item="item"
        :module="ResourceConstant.Type.CHUNKER.module"
        :persistent="isHovering"
        :item-label="$t('__fieldChunker')"
        :allow-delete-recursively="ResourceConstant.Type.CHUNKER.allowDeleteRecursively"
        :on-delete="handleDelete"
        :on-duplicate="handleDuplicate"
        :on-edit="item => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.CHUNKER.value, item.id)}/edit`)"
        :on-resources-fetch="() => fetchChunkers(page)"
      />
    </template>
    <template
      v-if="filters === ListConstant.DefaultParams.FILTERS"
      #no-data
    >
      <ResourceInitCard
        :icon="ResourceConstant.Type.CHUNKER.icon"
        :resource-label="$t('__fieldChunker')"
        :instruction="$t('__instructionResourceChunker')"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.CHUNKER.value)}/create`)"
      />
    </template>
  </AppTable>
</template>
