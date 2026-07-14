<script setup>
import { AccountConstant, ListConstant } from '~/constants';

const snackbarStore = useSnackbarStore();
const server = useServer();
const authStore = useAuthStore();
const { category, page, perPage, sortField, sortOrder, filters, filterLogic, query, nextTokenMap, initUrlParams, updateFiltersByCategory, goToPreviousPage } = usePagination({
  type: AccountConstant.Base.API_KEY.value,
  filterField: AccountConstant.Base.API_KEY.favoriteFilterField,
});

const state = reactive({
  apiKeys: [],
  isLoading: false,
});

const { createSignal } = useAbortController();

const fetchApiKeys = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  const signal = createSignal();

  state.isLoading = true;
  state.apiKeys = [];
  updateFiltersByCategory();
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const { data, error } = await server.apiKey.list({
    userName: authStore.parsedToken.username,
    nextToken,
    outputFields: null,
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
  state.apiKeys = data.value.data;
  page.value = pageValue;
  state.isLoading = false;
  // Navigate to the previous page if the current page has no items
  if (state.apiKeys.length === 0 && pageValue > 1) {
    goToPreviousPage();
    fetchApiKeys(page.value);
  }
};

initUrlParams();
fetchApiKeys(page.value);

const removeUserApiKey = async ({ apiKeyId, userName }) => {
  const { error } = await server.apiKey.destroy({ apiKeyId, userName });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  fetchApiKeys(page.value);
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  fetchApiKeys(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchApiKeys();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchApiKeys();
};

const handleQueryChange = (value) => {
  query.value = value;
  fetchApiKeys();
};

const handleFiltersChange = (filtersValue, queryValue) => {
  filters.value = filtersValue;
  query.value = queryValue;
  fetchApiKeys();
};

const handleCategoryChange = (value) => {
  category.value = value;
  query.value = ListConstant.DefaultParams.QUERY;
  updateFiltersByCategory({ reset: value === ListConstant.Category.ALL.value });
  fetchApiKeys();
};
</script>

<template>
  <AppTable
    :title="$t(AccountConstant.Base.API_KEY.i18nTitle, 2)"
    :icon="AccountConstant.Base.API_KEY.icon"
    :headers="[
      { title: $t('__fieldName'), key: 'name', link: item => ({ href: `/user/api-keys/${item.id}` }) },
      { title: $t('__fieldDescription'), key: 'description' },
      { title: $t('__fieldStatus'), key: 'isActive', isStatus: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :items="state.isLoading ? [] : state.apiKeys"
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
      { title: $t('__fieldName'), field: 'api_key_name' },
      { title: $t('__fieldDescription'), field: 'description' },
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
        @click="fetchApiKeys(page)"
      />
      <AppIconButton
        icon="mdi-plus"
        class="primary-gradient"
        :tooltip="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t(AccountConstant.Base.API_KEY.i18nTitle) })"
        @click="() => navigateTo('/user/api-keys/create')"
      />
    </template>
    <template #row-menu="{ item, isHovering }">
      <ResourceActionMenu
        :item="item"
        :persistent="isHovering"
        :item-label="$t(AccountConstant.Base.API_KEY.i18nTitle)"
        :delete-action-label="$t('__actionDelete')"
        :on-delete="item => removeUserApiKey({ apiKeyId: item.id, userName: authStore.parsedToken.username })"
        :on-edit="item => navigateTo(`/user/api-keys/${item.id}/edit`)"
      />
    </template>
    <template
      v-if="filters === ListConstant.DefaultParams.FILTERS"
      #no-data
    >
      <ResourceInitCard
        :action-label="$t('__actionAdd')"
        :icon="AccountConstant.Base.API_KEY.icon"
        :resource-label="$t(AccountConstant.Base.API_KEY.i18nTitle)"
        :instruction="$t('__instructionAccountApiKey')"
        :on-click="() => navigateTo('/user/api-keys/create')"
      />
    </template>
  </AppTable>
</template>
