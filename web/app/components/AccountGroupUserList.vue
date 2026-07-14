<script setup>
import { AccountConstant, ListConstant } from '~/constants';

const PER_PAGE_OPTIONS = [10, 20, 50];

/**
 * @import { ErrorResponse } from '~/models/server'
 */

const snackbarStore = useSnackbarStore();
const route = useRoute();
const server = useServer();
const { page, perPage, sortField, sortOrder, filters, filterLogic, query, nextTokenMap, initUrlParams, goToPreviousPage } = usePagination({
  type: AccountConstant.Base.ADMIN_MANAGED_USER.value,
  filterField: AccountConstant.Base.ADMIN_MANAGED_USER.favoriteFilterField,
  perPageOptions: PER_PAGE_OPTIONS,
});

const props = defineProps({
  isAdmin: {
    type: Boolean,
    default: false,
  },
});

const dialogRef = ref(null);
const dialogDeleteRef = ref(null);

const state = reactive({
  users: [],
  groupUsers: [],
  isLoading: false,
  /**
   * @type {ErrorResponse}
   */
  error: {},
  selectedItems: [],
});

const selectedIdSet = computed(() => new Set(state.selectedItems.map(i => i.id)));
const selectedOnPageCount = computed(() => state.users.reduce((count, user) => count + selectedIdSet.value.has(user.id), 0));
const isAllSelectedOnPage = computed(() => state.users.length > 0 && selectedOnPageCount.value === state.users.length);
const isAllSelectIndeterminate = computed(() => state.selectedItems.length > 0 && !isAllSelectedOnPage.value);

if (props.isAdmin) {
  const { data: users } = await server.user.adminList();
  state.groupUsers = users;
}

const fetchUsers = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  state.isLoading = true;
  state.users = [];
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const { data, error } = await server.user[props.isAdmin ? 'adminList' : 'listUsersInGroup']({
    groupName: route.params.id,
    nextToken,
    limit: perPage.value,
    sortField: sortField.value,
    sortOrder: sortOrder.value,
    filters: filters.value,
    filterLogic: filterLogic.value,
    query: query.value,
  }, {
    lazy: false,
  });
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

const addUsersToGroup = async ({ userNames }) => {
  const { error } = await server.group.adminAddUsers({ groupName: route.params.id, userNames });
  if (error.value) {
    state.error = error.value.data;
    return;
  }
  state.selectedItems = [];
  snackbarStore.setActionSuccess('__actionAdd');
  fetchUsers(page.value);
};

const removeUsersFromGroup = async ({ groupName, userNames }) => {
  const { error } = await server.group.adminRemoveUsers({ groupName, userNames });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionRemove');
  await fetchUsers(page.value);
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

const handleDelete = async () => {
  await removeUsersFromGroup({ groupName: route.params.id, userNames: state.selectedItems.map(item => item.id) });
  state.selectedItems = [];
};

const handleSelect = (items) => {
  state.selectedItems = items;
};

const handleAllSelect = (items) => {
  state.selectedItems = items;
};
</script>

<template>
  <AppTable
    :title="$t('__fieldUser', 2)"
    :icon="AccountConstant.Base.ADMIN_MANAGED_USER.icon"
    :headers="[
      { title: $t('__fieldName'), key: 'name', link: item => (props.isAdmin ? { href: `/users/${item.id}` } : null) },
      { title: $t('__fieldEmail'), key: 'email' },
      { title: $t('__fieldRole'), key: 'isAdmin', value: item => item.isAdmin ? $t('__fieldAdmin') : $t('__fieldUser'), isChip: true, chipOptions: item => ({ color: item.isAdmin ? 'primary' : null }) },
      { title: $t('__fieldConfirmationStatus'), key: 'status', value: item => findField(AccountConstant.UserStatus, item.status, 'title') },
      { title: $t('__fieldEnabled'), key: 'enabled', value: item => item.enabled ? $t('__fieldYes') : $t('__fieldNo'), isChip: true, chipOptions: item => ({ color: item.enabled ? 'success' : null }) },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :items="state.isLoading ? [] : state.users"
    :loading="state.isLoading"
    :has-next-page="!!nextTokenMap[page]"
    :page="page"
    :sort-field="sortField"
    :sort-order="sortOrder"
    :per-page="perPage"
    :per-page-options="PER_PAGE_OPTIONS"
    :query="query"
    :next-token-map="nextTokenMap"
    :multiple-select="props.isAdmin"
    :selected-ids="state.selectedItems.map(item => item.id)"
    :filters="filters"
    :filter-logic="filterLogic"
    :filter-options="[
      { title: $t('__fieldName'), field: 'username' },
      { title: $t('__fieldEmail'), field: 'email' },
      { title: $t('__fieldRole'), field: 'is_admin', values: [{ title: $t('__fieldAdmin'), value: true }, { title: $t('__fieldUser'), value: false }] },
      { title: $t('__fieldEnabled'), field: 'enabled', values: [{ title: $t('__fieldYes'), value: true }, { title: $t('__fieldNo'), value: false }] },
    ]"
    :is-all-select-indeterminate="isAllSelectIndeterminate"
    :on-page-change="handlePageChange"
    :on-per-page-change="handlePerPageChange"
    :on-sort-by-change="handleSortByChange"
    :on-query-change="handleQueryChange"
    :on-filters-change="handleFiltersChange"
    :on-select="props.isAdmin ? handleSelect : null"
    :on-all-select="props.isAdmin ? handleAllSelect : null"
  >
    <template #header-actions>
      <AppIconButton
        icon="mdi-refresh"
        variant="text"
        :tooltip="$t('__actionRefresh')"
        @click="fetchUsers(page)"
      />
      <AppIconButton
        icon="mdi-trash-can"
        variant="text"
        :disabled="state.selectedItems.length === 0 || state.selectedItems.length > AccountConstant.MAX_USERS_PER_BATCH"
        :tooltip="state.selectedItems.length > AccountConstant.MAX_USERS_PER_BATCH ? $t('__tooltipUserDeleteLimitReached', { maxItems: AccountConstant.MAX_USERS_PER_BATCH }) : $t('__actionDelete')"
        @click="() => dialogDeleteRef.open()"
      />
      <template v-if="props.isAdmin">
        <AppDialog
          ref="dialogRef"
          :on-submit="addUsersToGroup"
        >
          <template #activator="{ onOpen }">
            <AppIconButton
              icon="mdi-plus"
              class="primary-gradient"
              :tooltip="$t('__titleModifyItem', { action: $t('__actionAdd'), item: $t('__fieldUser') })"
              @click="onOpen"
            />
          </template>
          <template #body="{ onSubmit, onCancel }">
            <AccountGroupUserAddForm
              :users="state.groupUsers"
              :not-found-resource="state.error.notFoundResource"
              :on-submit="onSubmit"
              :on-discard="onCancel"
            />
          </template>
        </AppDialog>
      </template>
    </template>
    <template
      v-if="props.isAdmin"
      #row-menu="{ item, isHovering }"
    >
      <ResourceActionMenu
        :item="item"
        :persistent="isHovering"
        :item-label="$t('__fieldUser')"
        :delete-action-label="$t('__actionRemove')"
        :on-delete="(item) => removeUsersFromGroup({ groupName: route.params.id, userNames: [item.name] })"
      />
    </template>
    <template
      v-if="props.isAdmin && filters === ListConstant.DefaultParams.FILTERS"
      #no-data
    >
      <ResourceInitCard
        :action-label="$t('__actionAdd')"
        :icon="AccountConstant.Base.ADMIN_MANAGED_USER.icon"
        :instruction="$t('__instructionAccountJoinGroupForUser')"
        :title="$t('__titleNoUsersAdded')"
        :on-click="dialogRef.open"
      />
    </template>
  </AppTable>
  <AppDialog
    ref="dialogDeleteRef"
    :on-submit="handleDelete"
  >
    <template #body="{ onSubmit, onCancel, loading }">
      <ResourceDeleteConfirmationCard
        :items="state.selectedItems"
        :item-label="props.itemLabel || $t('__fieldUser', 2)"
        :action-label="$t('__actionRemove')"
        :instruction="$t('__instructionRemoveUsersFromGroup', { count: state.selectedItems.length, group: route.params.id }, state.selectedItems.length)"
        :on-submit="onSubmit"
        :on-cancel="onCancel"
        :loading="loading"
      />
    </template>
  </AppDialog>
</template>
