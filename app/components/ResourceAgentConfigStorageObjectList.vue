<script setup>
import { AgentConstant, RuntimeConstant } from '~/constants';

const props = defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  items: {
    type: Array,
    default: () => [],
  },
  storage: {
    type: Object,
    default: null,
  },
  storageObjects: {
    type: Array,
    default: () => [],
  },
  supportedExtensions: {
    type: Array,
    default: () => [],
  },
  onStorageRefresh: {
    type: Function,
    required: true,
  },
  onStorageItemClick: {
    type: Function,
    required: true,
  },
  onStorageObjectDelete: {
    type: Function,
    required: true,
  },
  onStorageObjectRestore: {
    type: Function,
    required: true,
  },
  onStorageObjectDownload: {
    type: Function,
    required: true,
  },
  onFilesSelect: {
    type: Function,
    required: true,
  },
  onPendingFolderCreate: {
    type: Function,
    required: true,
  },
});

const commonPrefix = defineModel('commonPrefix', {
  type: String,
  default: '',
});
</script>

<template>
  <AppTable
    :server-side="false"
    :items="props.loading ? [] : props.items"
    :loading="props.loading"
    :headers="[
      {
        title: $t('__fieldName'),
        key: 'name',
        icon: item => item.isFolder ? RuntimeConstant.Type.COMMON_PREFIX.icon : RuntimeConstant.Type.STORAGE_OBJECT.icon,
        iconColor: 'text',
        isClickable: item => item.isFolder,
      },
      { title: $t('__fieldType'), key: 'contentType' },
      { title: $t('__fieldSize'), key: 'size', isFileSize: true },
      {
        title: $t('__fieldStatus'),
        key: 'status',
        value: item => $t(findField(AgentConstant.StorageItemStatus, item.status, 'i18nKey')),
        isChip: true,
        chipOptions: item => ({ color: findField(AgentConstant.StorageItemStatus, item.status, 'color') }),
      },
    ]"
    bordered
    variant="flat"
    :on-item-click="props.onStorageItemClick"
  >
    <template #search-top>
      <ResourceStorageObjectListBreadcrumbs
        v-if="props.storage"
        v-model:common-prefix="commonPrefix"
        :storage="props.storage"
      />
    </template>
    <template #header-actions>
      <AppIconButton
        icon="mdi-refresh"
        variant="text"
        :tooltip="$t('__actionRefresh')"
        @click="props.onStorageRefresh"
      />
      <ResourceAgentConfigStorageObjectHeaderMenu
        :storage-objects="props.storageObjects"
        :supported-extensions="props.supportedExtensions"
        :on-storage-objects-upload="props.onFilesSelect"
        :on-common-prefix-create="props.onPendingFolderCreate"
      />
    </template>
    <template #row-menu="{ item, isHovering }">
      <ResourceStorageObjectActionMenu
        :item="item"
        :persistent="isHovering"
        :item-label="item.isFolder ? $t('__fieldFolder') : $t('__fieldFile')"
        :storage-objects="[]"
        :on-delete="item.status === AgentConstant.StorageItemStatus.PENDING_DELETE.value ? null : props.onStorageObjectDelete"
        :on-restore="item.status === AgentConstant.StorageItemStatus.PENDING_DELETE.value ? props.onStorageObjectRestore : null"
        :on-download="item.isFolder ? null : props.onStorageObjectDownload"
      />
    </template>
  </AppTable>
</template>
