<script setup>
import { AccountConstant, IconConstant, ListConstant, ResourceConstant } from '~/constants';
import { ResourcePermission } from '~/models/server/resourcePermission';

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

const snackbarStore = useSnackbarStore();
const server = useServer();
const dayjs = useDayjs();
const { t } = useI18n();
const { page, perPage, sortField, sortOrder, filters, query, nextTokenMap, initUrlParams } = usePagination();

const dialogCreateRef = ref(null);
const dialogEditRef = ref(null);

const state = reactive({
  editItem: null,
  resourcePermissions: [],
  isLoading: false,
});

const fetchResourcePermissions = async (pageValue = ListConstant.DefaultParams.PAGE) => {
  state.isLoading = true;
  state.resourcePermissions = [];
  const nextToken = pageValue === 1 ? null : nextTokenMap.value[pageValue - 1];
  const { data, error } = await server.resourcePermission[props.isAdmin ? 'adminList' : 'listByGroup']({
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
  state.resourcePermissions = data.value.data;
  page.value = pageValue;
  state.isLoading = false;
};

initUrlParams();
fetchResourcePermissions(page.value);

const createResourcePermission = async (formData) => {
  const { error } = await server.resourcePermission.adminCreate({
    groupName: props.groupName,
    skipOnDuplicate: false,
    ...formData,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionCreate');
  fetchResourcePermissions(page.value);
};

const editResourcePermission = async (formData) => {
  const { error } = await server.resourcePermission.adminUpdate({
    ...formData,
    groupName: props.groupName,
  });
  if (error.value) {
    return;
  }
  state.resourcePermissions = state.resourcePermissions.map((item) => {
    if (item.id === state.editItem.id) {
      return new ResourcePermission({
        ...item,
        ...formData,
        updatedTs: dayjs().unix(),
      });
    }
    return item;
  });
  snackbarStore.setActionSuccess('__actionEdit');
};

const handleDelete = async ({ groupName, resourceId, resourceType }) => {
  const { error } = await server.resourcePermission.adminDestroy({
    groupName,
    resourceId,
    resourceType,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  fetchResourcePermissions(page.value);
};

const handleEdit = (item) => {
  state.editItem = item;
  if (dialogEditRef.value) {
    dialogEditRef.value.open();
  }
};

const handleDependencyPermissionsGrant = async ({ permission, resourceType, resourceId }) => {
  const { error } = await server.resourcePermission.adminCreate({
    grantDependencyPermissions: true,
    groupName: props.groupName,
    permission,
    skipOnDuplicate: true,
    resourceType,
    resourceId,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__messageDependencyPermissionsGranted');
  fetchResourcePermissions(page.value);
};

const handlePageChange = (pageValue, pageToken) => {
  if (pageToken) {
    nextTokenMap.value[pageValue - 1] = pageToken;
  }
  fetchResourcePermissions(pageValue);
};

const handlePerPageChange = (value) => {
  perPage.value = value;
  fetchResourcePermissions();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchResourcePermissions();
};

const handleQueryChange = (value) => {
  query.value = value;
  fetchResourcePermissions();
};

const handleFiltersChange = (filtersValue, queryValue) => {
  filters.value = filtersValue;
  query.value = queryValue;
  fetchResourcePermissions();
};
</script>

<template>
  <AppTable
    :title="props.isAdmin ? $t('__fieldResourceAccessPermission', 2) : $t('__fieldResource', 2)"
    :icon="IconConstant.Base.RESOURCE"
    :headers="[
      { title: $t('__fieldResourceName'), key: 'name', link: item => ({ href: resourceUtils.getUrl(item.type, item.resourceId) }) },
      { title: $t('__fieldResourceId'), key: 'resourceId' },
      { title: $t('__fieldResourceType'), key: 'resourceType', value: item => t(findField(ResourceConstant.Type, item.resourceType, 'i18nTitle')), icon: item => findField(ResourceConstant.Type, item.resourceType, 'icon'), iconColor: 'primary', iconPath: item => findField(ResourceConstant.Type, item.resourceType, 'iconPath'), iconPathMaskColor: 'primary' },
      { title: $t('__fieldPermission'), key: 'permission', value: item => findField(AccountConstant.AccessType, item.permission, 'title'), isChip: true, chipOptions: item => ({ color: item.permission === AccountConstant.AccessType.WRITE.value ? 'primary' : null }) },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :items="state.isLoading ? [] : state.resourcePermissions"
    :loading="state.isLoading"
    :has-next-page="!!nextTokenMap[page]"
    :page="page"
    :sort-field="sortField"
    :sort-order="sortOrder"
    :per-page="perPage"
    :next-token-map="nextTokenMap"
    :filters="filters"
    :filter-options="[
      { title: $t('__fieldResourceName'), field: 'resource_name' },
      { title: $t('__fieldResourceId'), field: 'resource_id' },
      { title: $t('__fieldResourceType'), field: 'resource_type', values: Object.values(ResourceConstant.Type).map(type => ({ ...type, title: $t(type.i18nTitle), iconPathMaskColor: type.iconPathMaskColor ? 'primary' : type.iconPathMaskColor })) },
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
        @click="fetchResourcePermissions(page)"
      />
      <template v-if="props.isAdmin">
        <AppDialog
          ref="dialogCreateRef"
          :width="1000"
          :on-submit="createResourcePermission"
        >
          <template #activator="{ onOpen }">
            <AppIconButton
              icon="mdi-plus"
              class="primary-gradient"
              :tooltip="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t('__fieldResourceAccessPermission') })"
              @click="onOpen"
            />
          </template>
          <template #body="{ onSubmit, onCancel }">
            <AccountResourceAccessPermissionForm
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
        :item-label="$t('__fieldResourceAccessPermission')"
        :on-delete="handleDelete"
        :on-edit="handleEdit"
        :on-dependency-permissions-grant="handleDependencyPermissionsGrant"
      />
    </template>
    <template #no-data>
      <template v-if="props.isAdmin">
        <ResourceInitCard
          :icon="IconConstant.Base.RESOURCE"
          :resource-label="$t('__fieldResourceAccessPermission')"
          :instruction="$t('__instructionPermission', { resource: $t('__fieldResource'), resources: $t('__fieldResource', 2).toLowerCase() })"
          :on-click="dialogCreateRef.open"
        />
      </template>
      <template v-else>
        <AppInfoCard
          :title="$t('__titleNoResourcesAvailable', { resource: $t('__fieldResourceAccessPermission', 2) })"
          :instruction="$t('__instructionPermission', { resource: $t('__fieldResource'), resources: $t('__fieldResource', 2).toLowerCase() })"
          :icon="IconConstant.Base.RESOURCE"
          min-height="400"
        />
      </template>
    </template>
    <template #dialog>
      <template v-if="props.isAdmin">
        <AppDialog
          ref="dialogEditRef"
          :on-submit="editResourcePermission"
        >
          <template #body="{ onSubmit, onCancel }">
            <AccountResourceAccessPermissionForm
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
