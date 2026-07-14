<script setup>
import { CreateResourcePermissionConstant, ResourceConstant } from '~/constants';
import { CreateResourcePermission } from '~/models/server/createResourcePermission';

/**
 * @import { ErrorResponse } from '~/models/server'
 */

const props = defineProps({
  groupName: {
    type: String,
    required: true,
  },
});

const snackbarStore = useSnackbarStore();
const server = useServer();
const { t } = useI18n();

const state = reactive({
  isCreateDialogOpen: false,
  isLoading: false,
  permissionData: {},
  /**
   * @type {ErrorResponse}
   */
  error: {},
});

const resourceTypes = Object.values(ResourceConstant.Type);
const subTypeMap = CreateResourcePermissionConstant.SubTypeMap;
const resourceTypeMap = Object.fromEntries(resourceTypes.map(resourceType => [resourceType.value, resourceType]));

const getDisplayMaskColor = (maskColor) => {
  return maskColor === 'white' ? 'primary' : maskColor;
};

const getSubTypeItems = resourceType => subTypeMap[resourceType] || [];

const getSupportedSubTypes = resourceType => getSubTypeItems(resourceType).map(subType => subType.value);

const hasSupportedSubTypes = resourceType => getSubTypeItems(resourceType).length > 0;

const normalizePermissionData = (data = {}) => {
  return resourceTypes.reduce((acc, resourceType) => {
    const rawValue = data?.[resourceType.value];
    const supportedSubTypes = getSupportedSubTypes(resourceType.value);

    if (rawValue === true) {
      acc[resourceType.value] = { default: true };
      return acc;
    }

    if (!rawValue || typeof rawValue !== 'object') {
      return acc;
    }

    if (supportedSubTypes.length === 0) {
      if (Object.values(rawValue).some(value => value === true)) {
        acc[resourceType.value] = { default: true };
      }
      return acc;
    }

    const normalizedValue = {};

    if (rawValue.default === true && supportedSubTypes.length === 0) {
      normalizedValue.default = true;
    }

    if (rawValue.default === true && supportedSubTypes.length > 0) {
      supportedSubTypes.forEach((subType) => {
        normalizedValue[subType] = true;
      });
    }

    supportedSubTypes.forEach((subType) => {
      if (rawValue[subType] === true) {
        normalizedValue[subType] = true;
      }
    });

    if (Object.keys(normalizedValue).length > 0) {
      acc[resourceType.value] = normalizedValue;
    }

    return acc;
  }, {});
};

const getSubType = (resourceType, subType) => {
  if (subType === CreateResourcePermissionConstant.DefaultSubType) {
    const resourceTypeItem = resourceTypeMap[resourceType];

    return {
      title: t(resourceTypeItem.i18nTitle),
      icon: resourceTypeItem?.icon,
      iconPath: resourceTypeItem?.iconPath,
      iconPathMaskColor: getDisplayMaskColor(resourceTypeItem?.iconPathMaskColor),
    };
  }

  const subTypeItem = getSubTypeItems(resourceType).find(item => item.value === subType) || null;

  if (!subTypeItem) {
    return null;
  }

  return {
    ...subTypeItem,
    iconPathMaskColor: getDisplayMaskColor(subTypeItem.iconPathMaskColor),
  };
};

const createResourcePermissionItems = computed(() => {
  return resourceTypes.flatMap((resourceType) => {
    const entry = state.permissionData?.[resourceType.value] || {};
    const subTypes = Object.keys(entry);
    const supportsSubTypes = hasSupportedSubTypes(resourceType.value);
    const resourceTypeTitle = t(resourceType.i18nTitle);
    const resourceTypeIconPathMaskColor = getDisplayMaskColor(resourceType.iconPathMaskColor);

    if (subTypes.length === 0) {
      return [];
    }

    return subTypes.map((subType) => {
      const subTypeItem = getSubType(resourceType.value, subType);
      const subTypeTitle = supportsSubTypes ? subTypeItem.title : '-';

      return {
        id: `${resourceType.value}-${subType}`,
        resourceType: resourceType.value,
        resourceTypeTitle,
        resourceTypeIcon: resourceType.icon,
        resourceTypeIconPath: resourceType.iconPath,
        resourceTypeIconPathMaskColor,
        subType,
        subTypeTitle,
        subTypeIcon: supportsSubTypes ? subTypeItem?.icon : null,
        subTypeIconPath: supportsSubTypes ? subTypeItem?.iconPath : null,
        subTypeIconPathMaskColor: supportsSubTypes ? subTypeItem?.iconPathMaskColor : null,
      };
    });
  });
});

const fetchCreateResourcePermissions = async () => {
  state.isLoading = true;

  const { data, error } = await server.createResourcePermission.adminGet({
    groupName: props.groupName,
  }, {
    lazy: false,
  });

  if (error.value) {
    state.isLoading = false;
    return;
  }

  state.permissionData = normalizePermissionData(data.value.data);
  state.isLoading = false;
};

const updatePermissionData = async (nextData, action) => {
  const payload = normalizePermissionData(nextData);

  const { error } = await server.createResourcePermission.adminUpdate(new CreateResourcePermission({
    groupName: props.groupName,
    data: payload,
  }));

  if (error.value) {
    return;
  }

  state.permissionData = payload;
  snackbarStore.setActionSuccess(action);
};

const openCreateDialog = () => {
  state.isCreateDialogOpen = true;
};

const createResourcePermission = async (formData) => {
  const resourceType = formData.resourceType;

  if (!resourceType) {
    return;
  }

  const subTypeOptions = getSubTypeItems(resourceType);
  const subTypes = subTypeOptions.length > 0 ? formData.subTypes : [CreateResourcePermissionConstant.DefaultSubType];

  if (subTypes.length === 0) {
    return;
  }

  const nextData = { ...state.permissionData };
  nextData[resourceType] = subTypes.reduce((acc, subType) => ({
    ...acc,
    [subType || CreateResourcePermissionConstant.DefaultSubType]: true,
  }), {
    ...(nextData[resourceType] || {}),
  });

  await updatePermissionData(nextData, '__actionCreate');
};

const deleteResourcePermission = async (item) => {
  const nextData = { ...state.permissionData };
  const nextEntry = {
    ...(nextData[item.resourceType] || {}),
  };

  delete nextEntry[item.subType];

  if (Object.keys(nextEntry).length === 0) {
    delete nextData[item.resourceType];
  } else {
    nextData[item.resourceType] = nextEntry;
  }

  await updatePermissionData(nextData, '__actionDelete');
};

fetchCreateResourcePermissions();
</script>

<template>
  <AppTable
    :title="$t('__fieldResourceCreationPermission', 2)"
    :server-side="false"
    icon="mdi-shield-plus"
    :headers="[
      { title: $t('__fieldResourceType'), key: 'resourceTypeTitle', icon: item => item.resourceTypeIcon, iconPath: item => item.resourceTypeIconPath, iconPathMaskColor: item => item.resourceTypeIconPathMaskColor },
      { title: $t('__fieldType'), key: 'subTypeTitle', icon: item => item.subTypeIcon, iconPath: item => item.subTypeIconPath, iconPathMaskColor: item => item.subTypeIconPathMaskColor },
    ]"
    :items="state.isLoading ? [] : createResourcePermissionItems"
    :loading="state.isLoading"
  >
    <template #header-actions>
      <AppIconButton
        icon="mdi-refresh"
        variant="text"
        :tooltip="$t('__actionRefresh')"
        @click="fetchCreateResourcePermissions"
      />
      <AppDialog
        v-model="state.isCreateDialogOpen"
        :width="1000"
        :on-submit="createResourcePermission"
      >
        <template #activator>
          <AppIconButton
            icon="mdi-plus"
            class="primary-gradient"
            :tooltip="$t('__titleModifyItem', { action: $t('__actionCreate'), item: $t('__fieldResourceCreationPermission') })"
            @click="openCreateDialog"
          />
        </template>
        <template #body="{ onSubmit, onCancel }">
          <AccountResourceCreatePermissionForm
            v-if="state.isCreateDialogOpen"
            :permission-data="state.permissionData"
            :on-submit="onSubmit"
            :on-discard="onCancel"
          />
        </template>
      </AppDialog>
    </template>
    <template #row-menu="{ item }">
      <AppIconButton
        icon="mdi-trash-can"
        variant="text"
        :tooltip="$t('__actionDelete')"
        @click="deleteResourcePermission(item)"
      />
    </template>
    <template #no-data>
      <ResourceInitCard
        icon="mdi-shield-plus"
        :resource-label="$t('__fieldResourceCreationPermission')"
        :instruction="$t('__instructionCreateResourcePermission')"
        :on-click="openCreateDialog"
      />
    </template>
  </AppTable>
</template>
