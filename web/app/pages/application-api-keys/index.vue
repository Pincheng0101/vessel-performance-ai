<script setup>
import { AccountConstant, ListConstant } from '~/constants';

const snackbarStore = useSnackbarStore();
const server = useServer();
const { category, page, perPage, sortField, sortOrder, filters, filterLogic, query, nextTokenMap, initUrlParams, updateFiltersByCategory, goToPreviousPage } = usePagination({
  type: AccountConstant.Base.APPLICATION_API_KEY.value,
  filterField: AccountConstant.Base.APPLICATION_API_KEY.favoriteFilterField,
});

const state = reactive({
  items: [],
  isLoading: false,
});

const { createSignal } = useAbortController();

const fetchItems = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  const signal = createSignal();

  state.isLoading = true;
  state.items = [];
  updateFiltersByCategory();
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const { data, error } = await server.applicationApiKey.adminList({
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
  state.items = data.value.data;
  page.value = pageValue;
  state.isLoading = false;
  if (state.items.length === 0 && pageValue > 1) {
    goToPreviousPage();
    fetchItems(page.value);
  }
};

initUrlParams();
fetchItems(page.value);

const handleDelete = async ({ applicationApiKeyId }) => {
  const { error } = await server.applicationApiKey.adminDestroy({ applicationApiKeyId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  fetchItems(page.value);
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  fetchItems(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchItems();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchItems();
};

const handleQueryChange = (value) => {
  query.value = value;
  fetchItems();
};

const handleFiltersChange = (filtersValue, queryValue) => {
  filters.value = filtersValue;
  query.value = queryValue;
  fetchItems();
};

const handleCategoryChange = (value) => {
  category.value = value;
  query.value = ListConstant.DefaultParams.QUERY;
  updateFiltersByCategory({ reset: value === ListConstant.Category.ALL.value });
  fetchItems();
};
</script>

<template>
  <AppTable
    :title="$t('__fieldApplicationApiKey', 2)"
    :icon="AccountConstant.Base.APPLICATION_API_KEY.icon"
    :headers="[
      { title: $t('__fieldName'), key: 'name', link: item => ({ href: `/application-api-keys/${item.id}` }) },
      { title: $t('__fieldEnabled'), key: 'isActive', value: item => item.isActive ? $t('__fieldYes') : $t('__fieldNo'), isChip: true, chipOptions: item => ({ color: item.isActive ? 'success' : null }) },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :items="state.isLoading ? [] : state.items"
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
      { title: $t('__fieldId'), field: 'application_api_key_id' },
      { title: $t('__fieldName'), field: 'application_api_key_name' },
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
        @click="fetchItems(page)"
      />
      <AppIconButton
        icon="mdi-plus"
        class="primary-gradient"
        :tooltip="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t('__fieldApplicationApiKey') })"
        :on-click="() => navigateTo('/application-api-keys/create')"
      />
    </template>
    <template #row-menu="{ item, isHovering }">
      <ResourceActionMenu
        :item="item"
        :persistent="isHovering"
        :item-label="$t('__fieldApplicationApiKey')"
        :on-delete="handleDelete"
        :on-edit="item => navigateTo(`/application-api-keys/${item.id}/edit`)"
      />
    </template>
    <template
      v-if="filters === ListConstant.DefaultParams.FILTERS"
      #no-data
    >
      <ResourceInitCard
        :icon="AccountConstant.Base.APPLICATION_API_KEY.icon"
        :resource-label="$t('__fieldApplicationApiKey')"
        :instruction="$t('__instructionAccountApplicationApiKey')"
        :on-click="() => navigateTo('/application-api-keys/create')"
      />
    </template>
  </AppTable>
</template>
