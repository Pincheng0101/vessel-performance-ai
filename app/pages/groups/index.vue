<script setup>
import { AccountConstant, ListConstant } from '~/constants';

const snackbarStore = useSnackbarStore();
const server = useServer();
const { category, page, perPage, sortField, sortOrder, filters, filterLogic, query, nextTokenMap, initUrlParams, updateFiltersByCategory, goToPreviousPage } = usePagination({
  type: AccountConstant.Base.ADMIN_MANAGED_GROUP.value,
  filterField: AccountConstant.Base.ADMIN_MANAGED_GROUP.favoriteFilterField,
});

const state = reactive({
  groups: [],
  isLoading: false,
});

const { createSignal } = useAbortController();

const fetchGroups = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  const signal = createSignal();

  state.isLoading = true;
  state.groups = [];
  updateFiltersByCategory();
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const { data, error } = await server.group.adminList({
    nextToken,
    limit: perPage.value,
    sortField: sortField.value,
    sortOrder: sortOrder.value,
    filterLogic: filterLogic.value,
    filters: filters.value,
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
  state.groups = data.value.data;
  page.value = pageValue;
  state.isLoading = false;
  // Navigate to the previous page if the current page has no items
  if (state.groups.length === 0 && pageValue > 1) {
    goToPreviousPage();
    fetchGroups(page.value);
  }
};

initUrlParams();
fetchGroups(page.value);

const handleDelete = async ({ groupName }) => {
  const { error } = await server.group.adminDestroy({ groupName });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  fetchGroups(page.value);
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  fetchGroups(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchGroups();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchGroups();
};

const handleQueryChange = (value) => {
  query.value = value;
  fetchGroups();
};

const handleFiltersChange = (filtersValue, queryValue) => {
  filters.value = filtersValue;
  query.value = queryValue;
  fetchGroups();
};

const handleCategoryChange = (value) => {
  category.value = value;
  query.value = ListConstant.DefaultParams.QUERY;
  updateFiltersByCategory({ reset: value === ListConstant.Category.ALL.value });
  fetchGroups();
};
</script>

<template>
  <AppTable
    :title="$t('__fieldGroup', 2)"
    :icon="AccountConstant.Base.ADMIN_MANAGED_GROUP.icon"
    :headers="[
      { title: $t('__fieldName'), key: 'name', link: item => ({ href: `/groups/${item.id}` }) },
      { title: $t('__fieldDescription'), key: 'description' },
      { title: $t('__fieldRoleArn'), key: 'roleArn' },
      { title: $t('__fieldPrecedence'), key: 'precedence' },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :items="state.isLoading ? [] : state.groups"
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
      { title: $t('__fieldName'), field: 'group_name' },
      { title: $t('__fieldDescription'), field: 'description' },
      { title: $t('__fieldRoleArn'), field: 'role_arn' },
      { title: $t('__fieldPrecedence'), field: 'precedence' },
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
        @click="fetchGroups(page)"
      />
      <AppIconButton
        icon="mdi-plus"
        class="primary-gradient"
        :tooltip="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t('__fieldGroup') })"
        :on-click="() => navigateTo('/groups/create')"
      />
    </template>
    <template #row-menu="{ item, isHovering }">
      <ResourceActionMenu
        :item="item"
        :persistent="isHovering"
        :item-label="$t('__fieldGroup')"
        :on-delete="handleDelete"
        :on-edit="item => navigateTo(`/groups/${item.name}/edit`)"
      />
    </template>
    <template
      v-if="filters === ListConstant.DefaultParams.FILTERS"
      #no-data
    >
      <ResourceInitCard
        :icon="AccountConstant.Base.ADMIN_MANAGED_GROUP.icon"
        :resource-label="$t('__fieldGroup')"
        :instruction="$t('__instructionResourceGroup')"
        :on-click="() => navigateTo('/groups/create')"
      />
    </template>
  </AppTable>
</template>
