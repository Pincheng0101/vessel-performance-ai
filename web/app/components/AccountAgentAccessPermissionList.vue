<script setup>
import { AccountConstant, IconConstant, ListConstant, ResourceConstant } from '~/constants';
import { AgentPermission } from '~/models/server/agentPermission';

/**
 * @import { ErrorResponse } from '~/models/server'
 */

const snackbarStore = useSnackbarStore();
const server = useServer();
const dayjs = useDayjs();
const { page, perPage, sortField, sortOrder, filters, query, nextTokenMap, initUrlParams } = usePagination();

const props = defineProps({
  groupName: {
    type: String,
    required: true,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
});

const dialogCreateRef = ref(null);
const dialogEditRef = ref(null);

const state = reactive({
  editItem: null,
  agentPermissions: [],
  isLoading: false,
  /**
   * @type {ErrorResponse}
   */
  error: {},
});

const fetchAgentPermissions = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  state.isLoading = true;
  state.agentPermissions = [];
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const { data, error } = await server.agentPermission[props.isAdmin ? 'adminList' : 'listByGroup']({
    groupName: props.groupName,
    nextToken,
    limit: perPage.value,
    sortField: sortField.value,
    sortOrder: sortOrder.value,
    filters: filters.value,
    query: query.value,
  }, {
    lazy: false,
  });
  if (error.value) {
    state.isLoading = false;
    return;
  }
  nextTokenMap.value[pageValue] = data.value.nextToken;
  state.agentPermissions = data.value.data;
  page.value = pageValue;
  state.isLoading = false;
};

initUrlParams();
fetchAgentPermissions(page.value);

const createAgentPermission = async (formData) => {
  const { error } = await server.agentPermission.adminCreate({
    groupName: props.groupName,
    skipOnDuplicate: false,
    ...formData,
  });
  if (error.value) {
    state.error = error.value.data;
    return;
  }
  snackbarStore.setActionSuccess('__actionCreate');
  fetchAgentPermissions(page.value);
};

const editAgentPermission = async (formData) => {
  const { error } = await server.agentPermission.adminUpdate({
    ...formData,
    groupName: props.groupName,
  });
  if (error.value) {
    return;
  }
  state.agentPermissions = state.agentPermissions.map((item) => {
    if (item.id === state.editItem.id) {
      return new AgentPermission({
        ...item,
        ...formData,
        updatedTs: dayjs().unix(),
      });
    }
    return item;
  });
  snackbarStore.setActionSuccess('__actionEdit');
};

const handleDelete = async ({ groupName, agentId }) => {
  const { error } = await server.agentPermission.adminDestroy({
    groupName,
    agentId,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  fetchAgentPermissions(page.value);
};

const handleEdit = (item) => {
  state.editItem = item;
  if (dialogEditRef.value) {
    dialogEditRef.value.open();
  }
};

const handleDependencyPermissionsGrant = async ({ permission, agentId }) => {
  const { error } = await server.agentPermission.adminCreate({
    grantDependencyPermissions: true,
    groupName: props.groupName,
    permission,
    skipOnDuplicate: true,
    agentId,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__messageDependencyPermissionsGranted');
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  fetchAgentPermissions(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchAgentPermissions();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchAgentPermissions();
};

const handleQueryChange = (value) => {
  query.value = value;
  fetchAgentPermissions();
};

const handleFiltersChange = (filtersValue, queryValue) => {
  filters.value = filtersValue;
  query.value = queryValue;
  fetchAgentPermissions();
};
</script>

<template>
  <AppTable
    :title="props.isAdmin ? $t('__fieldAgentAccessPermission', 2) : $t('__fieldAgent', 2)"
    :icon="IconConstant.Base.AGENT"
    :headers="[
      { title: $t('__fieldAgentName'), key: 'name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.AGENT.value, item.agentId) }) },
      { title: $t('__fieldAgentId'), key: 'agentId' },
      { title: $t('__fieldPermission'), key: 'permission', value: item => findField(AccountConstant.AccessType, item.permission, 'title'), isChip: true, chipOptions: item => ({ color: item.permission === AccountConstant.AccessType.WRITE.value ? 'primary' : 'backgroundScale3' }) },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :items="state.isLoading ? [] : state.agentPermissions"
    :loading="state.isLoading"
    :has-next-page="!!nextTokenMap[page]"
    :page="page"
    :sort-field="sortField"
    :sort-order="sortOrder"
    :per-page="perPage"
    :next-token-map="nextTokenMap"
    :filters="filters"
    :filter-options="[
      { title: $t('__fieldAgentName'), field: 'agent_name' },
      { title: $t('__fieldAgentId'), field: 'agent_id' },
      { title: $t('__fieldPermission'), field: 'permission', values: Object.values(AccountConstant.AccessType) },
    ]"
    :on-page-change="handlePageChange"
    :on-per-page-change="handlePerPageChange"
    :on-sort-by-change="handleSortByChange"
    :on-query-change="handleQueryChange"
    :on-filters-change="handleFiltersChange"
  >
    <template #header-actions>
      <AppIconButton
        icon="mdi-refresh"
        variant="text"
        :tooltip="$t('__actionRefresh')"
        @click="fetchAgentPermissions(page)"
      />
      <template v-if="props.isAdmin">
        <AppDialog
          ref="dialogCreateRef"
          :width="1000"
          :on-submit="createAgentPermission"
        >
          <template #activator="{ onOpen }">
            <AppIconButton
              icon="mdi-plus"
              class="primary-gradient"
              :tooltip="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t('__fieldAgentAccessPermission') })"
              @click="onOpen"
            />
          </template>
          <template #body="{ onSubmit, onCancel }">
            <AccountAgentAccessPermissionForm
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
      <AccountPermissionActionMenu
        :item="item"
        :persistent="isHovering"
        :item-label="$t('__fieldAgentAccessPermission')"
        :on-delete="handleDelete"
        :on-edit="handleEdit"
        :on-dependency-permissions-grant="handleDependencyPermissionsGrant"
      />
    </template>
    <template #no-data>
      <template v-if="props.isAdmin">
        <ResourceInitCard
          :icon="IconConstant.Base.AGENT"
          :resource-label="$t('__fieldAgentAccessPermission')"
          :instruction="$t('__instructionPermission', { resource: $t('__fieldAgent'), resources: $t('__fieldAgent', 2).toLowerCase() })"
          :on-click="dialogCreateRef.open"
        />
      </template>
      <template v-else>
        <AppInfoCard
          :title="$t('__titleNoResourcesAvailable', { resource: $t('__fieldAgentAccessPermission', 2) })"
          :instruction="$t('__instructionPermission', { resource: $t('__fieldAgent'), resources: $t('__fieldAgent', 2).toLowerCase() })"
          :icon="IconConstant.Base.AGENT"
          min-height="400"
        />
      </template>
    </template>
    <template #dialog>
      <template v-if="props.isAdmin">
        <AppDialog
          ref="dialogEditRef"
          :on-submit="editAgentPermission"
        >
          <template #body="{ onSubmit, onCancel }">
            <AccountAgentAccessPermissionForm
              :resource="state.editItem"
              :on-submit="onSubmit"
              :on-discard="onCancel"
            />
          </template>
        </AppDialog>
      </template>
    </template>
  </AppTable>
</template>
