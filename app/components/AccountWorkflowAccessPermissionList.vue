<script setup>
import { AccountConstant, IconConstant, ListConstant, ResourceConstant } from '~/constants';
import { WorkflowPermission } from '~/models/server/workflowPermission';

/**
 * @import { ErrorResponse } from '~/models/server'
 */

const snackbarStore = useSnackbarStore();
const serverWorkflow = useServer();
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
  onCreate: {
    type: Function,
    default: null,
  },
});

const dialogCreateRef = ref(null);
const dialogEditRef = ref(null);

const state = reactive({
  editItem: null,
  workflowPermissions: [],
  isLoading: false,
  /**
   * @type {ErrorResponse}
   */
  error: {},
});

const fetchWorkflowPermissions = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  state.isLoading = true;
  state.workflowPermissions = [];
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const { data, error } = await serverWorkflow.workflowPermission[props.isAdmin ? 'adminList' : 'listByGroup']({
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
  state.workflowPermissions = data.value.data;
  page.value = pageValue;
  state.isLoading = false;
};

initUrlParams();
fetchWorkflowPermissions(page.value);

const createWorkflowPermission = async (formData) => {
  const { error } = await serverWorkflow.workflowPermission.adminCreate({
    groupName: props.groupName,
    skipOnDuplicate: false,
    ...formData,
  });
  if (error.value) {
    state.error = error.value.data;
    return;
  }
  snackbarStore.setActionSuccess('__actionCreate');
  fetchWorkflowPermissions(page.value);
  props.onCreate();
};

const editWorkflowPermission = async (formData) => {
  const { error } = await serverWorkflow.workflowPermission.adminUpdate({
    ...formData,
    groupName: props.groupName,
  });
  if (error.value) {
    return;
  }
  state.workflowPermissions = state.workflowPermissions.map((item) => {
    if (item.id === state.editItem.id) {
      return new WorkflowPermission({
        ...item,
        ...formData,
        updatedTs: dayjs().unix(),
      });
    }
    return item;
  });
  snackbarStore.setActionSuccess('__actionEdit');
};

const handleDelete = async ({ groupName, workflowId }) => {
  const { error } = await serverWorkflow.workflowPermission.adminDestroy({
    groupName,
    workflowId,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  fetchWorkflowPermissions(page.value);
};

const handleEdit = (item) => {
  state.editItem = item;
  if (dialogEditRef.value) {
    dialogEditRef.value.open();
  }
};

const handleDependencyPermissionsGrant = async ({ permission, workflowId }) => {
  const { error } = await serverWorkflow.workflowPermission.adminCreate({
    grantDependencyPermissions: true,
    groupName: props.groupName,
    permission,
    skipOnDuplicate: true,
    workflowId,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__messageDependencyPermissionsGranted');
  props.onCreate();
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  fetchWorkflowPermissions(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchWorkflowPermissions();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchWorkflowPermissions();
};

const handleQueryChange = (value) => {
  query.value = value;
  fetchWorkflowPermissions();
};

const handleFiltersChange = (filtersValue, queryValue) => {
  filters.value = filtersValue;
  query.value = queryValue;
  fetchWorkflowPermissions();
};
</script>

<template>
  <AppTable
    :title="props.isAdmin ? $t('__fieldWorkflowAccessPermission', 2) : $t('__fieldWorkflow', 2)"
    :icon="IconConstant.Base.WORKFLOW"
    :headers="[
      { title: $t('__fieldWorkflowName'), key: 'name', link: item => ({ href: resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, item.workflowId) }) },
      { title: $t('__fieldWorkflowId'), key: 'workflowId' },
      { title: $t('__fieldPermission'), key: 'permission', value: item => findField(AccountConstant.AccessType, item.permission, 'title'), isChip: true, chipOptions: item => ({ color: item.permission === AccountConstant.AccessType.WRITE.value ? 'primary' : 'backgroundScale3' }) },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :items="state.isLoading ? [] : state.workflowPermissions"
    :loading="state.isLoading"
    :has-next-page="!!nextTokenMap[page]"
    :page="page"
    :sort-field="sortField"
    :sort-order="sortOrder"
    :per-page="perPage"
    :next-token-map="nextTokenMap"
    :filters="filters"
    :filter-options="[
      { title: $t('__fieldWorkflowName'), field: 'workflow_name' },
      { title: $t('__fieldWorkflowId'), field: 'workflow_id' },
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
        @click="fetchWorkflowPermissions(page)"
      />
      <template v-if="props.isAdmin">
        <AppDialog
          ref="dialogCreateRef"
          :width="1000"
          :on-submit="createWorkflowPermission"
        >
          <template #activator="{ onOpen }">
            <AppIconButton
              icon="mdi-plus"
              class="primary-gradient"
              :tooltip="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t('__fieldWorkflowAccessPermission') })"
              @click="onOpen"
            />
          </template>
          <template #body="{ onSubmit, onCancel }">
            <AccountWorkflowAccessPermissionForm
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
        :item-label="$t('__fieldWorkflowAccessPermission')"
        :on-delete="handleDelete"
        :on-edit="handleEdit"
        :on-dependency-permissions-grant="handleDependencyPermissionsGrant"
      />
    </template>
    <template #no-data>
      <template v-if="props.isAdmin">
        <ResourceInitCard
          :icon="IconConstant.Base.WORKFLOW"
          :resource-label="$t('__fieldWorkflowAccessPermission')"
          :instruction="$t('__instructionPermission', { resource: $t('__fieldWorkflow'), resources: $t('__fieldWorkflow', 2).toLowerCase() })"
          :on-click="dialogCreateRef.open"
        />
      </template>
      <template v-else>
        <AppInfoCard
          :title="$t('__titleNoResourcesAvailable', { resource: $t('__fieldWorkflowAccessPermission', 2) })"
          :instruction="$t('__instructionPermission', { resource: $t('__fieldWorkflow'), resources: $t('__fieldWorkflow', 2).toLowerCase() })"
          :icon="IconConstant.Base.WORKFLOW"
          min-height="400"
        />
      </template>
    </template>
    <template #dialog>
      <template v-if="props.isAdmin">
        <AppDialog
          ref="dialogEditRef"
          :on-submit="editWorkflowPermission"
        >
          <template #body="{ onSubmit, onCancel }">
            <AccountWorkflowAccessPermissionForm
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
