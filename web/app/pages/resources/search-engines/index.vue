<script setup>
import { ListConstant, ResourceConstant, SearchEngineConstant, StatusConstant } from '~/constants';

const server = useServer();
const { isDefaultResource } = useResource();
const { category, page, perPage, sortField, sortOrder, filters, filterLogic, query, nextTokenMap, initUrlParams, updateFiltersByCategory, goToPreviousPage } = usePagination({
  type: ResourceConstant.Type.SEARCH_ENGINE.value,
  filterField: ResourceConstant.Type.SEARCH_ENGINE.favoriteFilterField,
});
const { createSignal } = useAbortController();
const snackbarStore = useSnackbarStore();

const state = reactive({
  searchEngines: [],
  isLoading: false,
});

const fetchSearchEngines = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  const signal = createSignal();

  state.isLoading = true;
  state.searchEngines = [];
  updateFiltersByCategory();
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const { data, error } = await server.searchEngine.list({
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
  state.searchEngines = data.value.data;
  page.value = pageValue;
  state.isLoading = false;
  // Navigate to the previous page if the current page has no items
  if (state.searchEngines.length === 0 && pageValue > 1) {
    goToPreviousPage();
    fetchSearchEngines(page.value);
  }
};

initUrlParams();
fetchSearchEngines(page.value);

const handleDelete = async ({ searchEngineId }) => {
  const { error } = await server.searchEngine.destroy({ searchEngineId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  fetchSearchEngines(page.value);
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  fetchSearchEngines(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchSearchEngines();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchSearchEngines();
};

const handleDuplicate = async ({ item, formData }) => {
  const { data, error } = await server.searchEngine.duplicate({
    searchEngineId: item.id,
    newSearchEngineName: formData.name,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDuplicate');
  navigateTo(resourceUtils.getUrl(ResourceConstant.Type.SEARCH_ENGINE.value, data.value.id));
};

const handleQueryChange = (value) => {
  query.value = value;
  fetchSearchEngines();
};

const handleFiltersChange = (filtersValue, queryValue) => {
  filters.value = filtersValue;
  query.value = queryValue;
  fetchSearchEngines();
};

const handleCategoryChange = (value) => {
  category.value = value;
  query.value = ListConstant.DefaultParams.QUERY;
  updateFiltersByCategory({ reset: value === ListConstant.Category.ALL.value });
  fetchSearchEngines();
};
</script>

<template>
  <AppTable
    :title="$t('__fieldSearchEngine', 2)"
    :icon="ResourceConstant.Type.SEARCH_ENGINE.icon"
    :headers="[
      { title: $t('__fieldName'), key: 'name', sortable: true, sortKey: 'search_engine_name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.SEARCH_ENGINE.value, item.id) }) },
      { title: $t('__fieldId'), key: 'id' },
      { title: $t('__fieldType'), key: 'type', value: item => findField(SearchEngineConstant.Type, item.type, 'title'), iconPath: item => findField(SearchEngineConstant.Type, item.type, 'iconPath') },
      { title: $t('__fieldStatus'), key: 'status', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :items="state.isLoading ? [] : state.searchEngines"
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
    :filter-options="[
      { title: $t('__fieldName'), field: 'search_engine_name' },
      { title: $t('__fieldId'), field: 'search_engine_id' },
      { title: $t('__fieldType'), field: 'search_engine_type', values: Object.values(SearchEngineConstant.Type).map(item => ({ ...item, subtitle: $t(item.i18nSubtitle) })) },
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
        @click="fetchSearchEngines(page)"
      />
      <AppIconButton
        icon="mdi-plus"
        class="primary-gradient"
        :tooltip="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t('__fieldSearchEngine') })"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.SEARCH_ENGINE.value)}/create`)"
      />
    </template>
    <template #row-menu="{ item, isHovering }">
      <template v-if="!isDefaultResource(item)">
        <ResourceActionMenu
          :item="item"
          :module="ResourceConstant.Type.SEARCH_ENGINE.module"
          :persistent="isHovering"
          :item-label="$t('__fieldSearchEngine')"
          :allow-delete-recursively="ResourceConstant.Type.SEARCH_ENGINE.allowDeleteRecursively"
          :on-delete="handleDelete"
          :on-duplicate="handleDuplicate"
          :on-edit="item => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.SEARCH_ENGINE.value, item.id)}/edit`)"
          :on-resources-fetch="() => fetchSearchEngines(page)"
        />
      </template>
    </template>
    <template
      v-if="filters === ListConstant.DefaultParams.FILTERS"
      #no-data
    >
      <ResourceInitCard
        :icon="ResourceConstant.Type.SEARCH_ENGINE.icon"
        :resource-label="$t('__fieldSearchEngine')"
        :instruction="$t('__instructionResourceSearchEngine')"
        :on-click="() => navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.SEARCH_ENGINE.value)}/create`)"
      />
    </template>
  </AppTable>
</template>
