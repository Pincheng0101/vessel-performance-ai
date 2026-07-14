<script setup>
import { AccountConstant, ListConstant } from '~/constants';

const snackbarStore = useSnackbarStore();
const server = useServer();
const { category, page, perPage, sortField, sortOrder, filters, filterLogic, query, nextTokenMap, initUrlParams, updateFiltersByCategory, goToPreviousPage } = usePagination({
  type: AccountConstant.Base.ADMIN_MANAGED_USER.value,
  filterField: AccountConstant.Base.ADMIN_MANAGED_USER.favoriteFilterField,
});

const state = reactive({
  users: [],
  isLoading: false,
});

const { createSignal } = useAbortController();

const fetchUsers = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  const signal = createSignal();

  state.isLoading = true;
  state.users = [];
  updateFiltersByCategory();
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const { data, error } = await server.user.adminList({
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
  state.users = data.value.data;
  page.value = pageValue;
  state.isLoading = false;
  // Navigate to the previous page if the current page has no items
  if (state.users.length === 0 && pageValue > 1) {
    goToPreviousPage();
    fetchUsers(page.value);
  }
};

initUrlParams();
fetchUsers(page.value);

const handleDelete = async ({ userName }) => {
  const { error } = await server.user.adminDestroy({ userName });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  fetchUsers(page.value);
};

const handleTemporaryPasswordSet = async (item, formData) => {
  if (formData.messageAction === AccountConstant.MessageAction.RESEND) {
    const { error } = await server.user.adminCreate({
      ...item,
      messageAction: AccountConstant.MessageAction.RESEND,
      temporaryPassword: formData.temporaryPassword,
    });
    if (error.value) {
      snackbarStore.setActionFailure('__messageTemporaryPasswordReset');
      return;
    }
    fetchUsers(page.value);
    snackbarStore.setActionSuccess('__messageTemporaryPasswordReset');
    return;
  }
  const { error } = await server.user.adminResetUserPassword({ userName: item.userName, temporaryPassword: formData.temporaryPassword });
  if (error.value) {
    snackbarStore.setActionFailure('__messageTemporaryPasswordReset');
    return;
  }
  fetchUsers(page.value);
  snackbarStore.setActionSuccess('__messageTemporaryPasswordReset');
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  fetchUsers(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchUsers();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchUsers();
};

const handleQueryChange = (value) => {
  query.value = value;
  fetchUsers();
};

const handleFiltersChange = (filtersValue, queryValue) => {
  filters.value = filtersValue;
  query.value = queryValue;
  fetchUsers();
};

const handleCategoryChange = (value) => {
  category.value = value;
  query.value = ListConstant.DefaultParams.QUERY;
  updateFiltersByCategory({ reset: value === ListConstant.Category.ALL.value });
  fetchUsers();
};
</script>

<template>
  <AppTable
    :title="$t('__fieldUser', 2)"
    :icon="AccountConstant.Base.ADMIN_MANAGED_USER.icon"
    :headers="[
      { title: $t('__fieldName'), key: 'name', link: item => ({ href: `/users/${item.id}` }) },
      { title: $t('__fieldEmail'), key: 'email' },
      { title: $t('__fieldRole'), key: 'isAdmin', value: item => item.isAdmin ? $t('__fieldAdmin') : $t('__fieldUser'), isChip: true, chipOptions: (item) => ({ color: item.isAdmin ? 'primary' : null }) },
      { title: $t('__fieldConfirmationStatus'), key: 'status', value: item => findField(AccountConstant.UserStatus, item.status, 'title') },
      { title: $t('__fieldEnabled'), key: 'enabled', value: item => item.enabled ? $t('__fieldYes') : $t('__fieldNo'), isChip: true, chipOptions: (item) => ({ color: item.enabled ? 'success' : null }) },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :items="state.isLoading ? [] : state.users"
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
      { title: $t('__fieldName'), field: 'username' },
      { title: $t('__fieldEmail'), field: 'email' },
      { title: $t('__fieldRole'), field: 'is_admin', values: [{ title: $t('__fieldAdmin'), value: true }, { title: $t('__fieldUser'), value: false }] },
      { title: $t('__fieldEnabled'), field: 'enabled', values: [{ title: $t('__fieldYes'), value: true }, { title: $t('__fieldNo'), value: false }] },
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
        @click="fetchUsers(page)"
      />
      <AppIconButton
        icon="mdi-plus"
        class="primary-gradient"
        :tooltip="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t('__fieldUser') })"
        :on-click="() => navigateTo('/users/create')"
      />
    </template>
    <template #row-menu="{ item, isHovering }">
      <ResourceActionMenu
        :item="item"
        :persistent="isHovering"
        :item-label="$t('__fieldUser')"
        :on-delete="handleDelete"
        :on-edit="item => navigateTo(`/users/${item.userName}/edit`)"
        :on-temporary-password-reset="formData => handleTemporaryPasswordSet(item, formData)"
        :on-usage-analysis-open="item => navigateTo(`/usage/users/${item.id}`)"
      />
    </template>
    <template
      v-if="filters === ListConstant.DefaultParams.FILTERS"
      #no-data
    >
      <ResourceInitCard
        :icon="AccountConstant.Base.ADMIN_MANAGED_USER.icon"
        :resource-label="$t('__fieldUser')"
        :instruction="$t('__instructionResourceUser')"
        :on-click="() => navigateTo('/users/create')"
      />
    </template>
  </AppTable>
</template>
