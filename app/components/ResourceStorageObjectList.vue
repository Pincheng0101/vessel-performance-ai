<script setup>
import { ResourceConstant, RuntimeConstant, StorageConstant } from '~/constants';
import { CommonPrefix } from '~/models/server/storageObject';

/**
 * @import { Storage } from '~/models/server/storage'
 * @import { StorageObjectResponse, CommonPrefixResponse } from '~/models/server/storageObject'
 */

const server = useServer();
const snackbarStore = useSnackbarStore();
const route = useRoute();
const { sortField, sortOrder, query, initUrlParams } = usePagination();
const { enableConfirmation, disableConfirmation } = useLeaveConfirmation();

/**
 * @type {{ storage: Storage, initialCommonPrefix: string }}
 */
const props = defineProps({
  storage: {
    type: Object,
    default: null,
  },
  initialCommonPrefix: {
    type: String,
    default: null,
  },
  linkTarget: {
    type: String,
    default: null,
  },
  onMutate: {
    type: Function,
    default: () => {},
  },
});

const abortController = new AbortController();

const state = reactive({
  /**
   * @type {StorageObject}
   */
  storageObjects: [],
  isLoading: false,
  isDownloading: false,
  commonPrefix: props.initialCommonPrefix ?? decodeURIComponent(pathUtils.extractAfter(route.path, 'files/')),
  selectedObjects: [],
  currentItems: [],
});

const MULTI_DOWNLOAD_MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

const hiddenSelectableIdMap = computed(() => {
  return state.storageObjects.reduce((map, obj) => {
    if (obj.commonPrefix) {
      map[obj.commonPrefix] = obj.commonPrefix;
    }
    return map;
  }, {});
});

const selectableObjects = computed(() => state.storageObjects.filter(obj => !obj.commonPrefix));

const currentPageFiles = computed(() => state.currentItems.filter(obj => !obj.commonPrefix));

const isSelectAllRowVisible = computed(() => {
  if (state.selectedObjects.length === 0) return false;
  const isCurrentPageAllSelected = currentPageFiles.value.every(pageObj => state.selectedObjects.some(selectedItem => selectedItem.id === pageObj.id));
  const isFolderAllSelected = state.selectedObjects.length === selectableObjects.value.length;
  return isCurrentPageAllSelected || isFolderAllSelected;
});

const isAllSelectIndeterminate = computed(() => state.selectedObjects?.some(item => pathUtils.isParentOf(state.commonPrefix, item.id)));

const fetchStorageObject = async (commonPrefix) => {
  const { data, error } = await server.storageObject.get({ storageId: props.storage.storageId, objectPath: commonPrefix });
  if (error.value) return;
  return data.value;
};

const fetchStorageObjects = async () => {
  state.isLoading = true;
  state.storageObjects = [];
  const commonPrefixes = [];
  let nextToken = null;
  do {
    const { data, error } = await server.storageObject.list({
      storageId: props.storage.storageId,
      sortField: sortField.value,
      sortOrder: sortOrder.value,
      query: query.value,
      prefix: state.commonPrefix ? `${state.commonPrefix}/` : '',
      nextToken,
    }, {
      lazy: false,
    });
    if (error.value) {
      state.isLoading = false;
      return;
    }
    const objects = data.value?.data.filter(item => pathUtils.extractLast(item.objectPath) !== StorageConstant.PLACEHOLDER_OBJECT_NAME);
    if (objects) {
      state.storageObjects.unshift(...objects);
    }
    if (data.value?.commonPrefixes) {
      commonPrefixes.push(...data.value.commonPrefixes.toReversed());
    }
    nextToken = data.value?.nextToken;
  } while (nextToken);
  state.storageObjects.unshift(...commonPrefixes);
  state.isLoading = false;
};

const fetchAllFiles = async () => {
  const allFiles = [];
  let nextToken = null;
  do {
    const { data, error } = await server.storageObject.list({
      storageId: props.storage.storageId,
      sortField: sortField.value,
      sortOrder: sortOrder.value,
      query: query.value,
      prefix: '',
      nextToken,
      delimiter: '',
    }, {
      lazy: false,
    });
    if (error.value) {
      return;
    }
    const objects = data.value?.data;
    allFiles.push(...objects);
    nextToken = data.value.nextToken;
  } while (nextToken);
  return allFiles;
};

/**
 * @param {StorageObjectResponse | CommonPrefixResponse} v
 */
const handleDelete = async (v) => {
  const { error } = await server.storageObject.destroy({
    storageId: props.storage.storageId,
    objectPath: v.id,
    isPrefix: !!v.commonPrefix,
  });
  if (error.value) {
    state.isLoading = false;
    return error;
  }
  const index = state.storageObjects.findIndex(obj => v.commonPrefix ? obj.commonPrefix === v.commonPrefix : obj.id === v.id);
  if (index !== -1) {
    state.storageObjects.splice(index, 1);
  }
  props.onMutate();
};

/**
 * @param {StorageObjectResponse[]} items
 * @param {string|null} parentPath
 */
const fetchDownloadUrls = async (items, parentPath = null) => {
  if (!items || items.length === 0) return;
  if (items.length > 1) {
    const totalFileSize = items.reduce((sum, item) => sum + (item.size || 0), 0);
    if (totalFileSize > MULTI_DOWNLOAD_MAX_SIZE) {
      snackbarStore.setFailure($t('__messageDownloadFileTooLargeFailed'));
      return;
    }
  }
  return await Promise.all(
    items.map(async (item) => {
      const { data, error } = await server.storageObject.download({
        storageId: item.storageId,
        objectPath: item.id,
      });
      if (error.value) {
        throw new Error(`Failed to download: ${error.value}`);
      }
      // Use relative path for ZIP structure if parentPath is provided
      const zipPath = parentPath
        ? pathUtils.removeParentPath(item.id, pathUtils.appendTrailingSlash(parentPath))
        : item.id;
      return {
        url: data.value.presignedUrl,
        fileName: zipPath,
      };
    }),
  );
};

/**
 * @param {StorageObjectResponse} file
 */
const handleFileDownload = async (file) => {
  try {
    enableConfirmation($t('__instructionLeaveSiteDownload'));
    const downloadedItems = await fetchDownloadUrls([file]);
    if (!downloadedItems || downloadedItems.length === 0) return;
    // Disable confirmation first, avoid leave-page prompt when browser navigates to presigned URL
    disableConfirmation();
    fileUtils.download(downloadedItems[0]);
    snackbarStore.setActionSuccess('__actionDownload');
  } catch (error) {
    console.error(error);
    if (error.name === 'AbortError') {
      snackbarStore.setFailure($t('__messageDownloadAborted'));
      return;
    }
    snackbarStore.setActionFailure('__actionDownload');
  }
};

/**
 * @param {StorageObjectResponse[]} files
 * @param {string|null} parentPath
 */
const handleFilesDownload = async (files, parentPath = null) => {
  try {
    enableConfirmation($t('__instructionLeaveSiteDownload'));
    const downloadedItems = await fetchDownloadUrls(files, parentPath);
    if (!downloadedItems || downloadedItems.length === 0) return;
    await fileUtils.downloadAsZip(downloadedItems, abortController.signal);
    // Disable confirmation after, re-enable normal navigation after multi-file download completes
    disableConfirmation();
    snackbarStore.setActionSuccess('__actionDownload');
  } catch (error) {
    console.error(error);
    if (error.name === 'AbortError') {
      snackbarStore.setFailure($t('__messageDownloadAborted'));
      return;
    }
    snackbarStore.setActionFailure('__actionDownload');
  }
};

/**
 * @param {CommonPrefixResponse} v
 */
const handleFolderDownload = async (v) => {
  const files = await fetchAllFiles();
  const filesInFolder = files.filter(file => pathUtils.isParentOf(v.commonPrefix, file.objectPath));
  // Skip download if folder is empty
  const downloadableFiles = filesInFolder.filter(file => pathUtils.extractLast(file.objectPath) !== StorageConstant.PLACEHOLDER_OBJECT_NAME);
  if (downloadableFiles.length === 0) {
    snackbarStore.setFailure($t('__messageDownloadEmptyFolderFailed'));
    return;
  }
  // Keep original structure for folder download
  await handleFilesDownload(filesInFolder, pathUtils.appendTrailingSlash(state.commonPrefix));
};

/**
 * @param {StorageObjectResponse} v
 * @param {Object} formData
 */
const handleFileEdit = async (v, formData) => {
  if (!v) return;
  enableConfirmation();
  const { error } = await server.storageObject.copy({
    storageId: props.storage.storageId,
    objectPath: v.id,
    destObjectPath: `${pathUtils.extractDirectory(v.id, '/')}${formData.name}`,
  });
  if (error.value) {
    state.isLoading = false;
    disableConfirmation();
    snackbarStore.setActionFailure('__actionEdit');
    return;
  }
  const { error: deleteError } = await server.storageObject.destroy({
    storageId: props.storage.storageId,
    objectPath: v.id,
    isPrefix: !!v.commonPrefix,
  });
  if (deleteError.value) {
    state.isLoading = false;
    await handleDelete({ ...v, objectPath: `${pathUtils.extractDirectory(v.id, '/')}${formData.name}` });
    disableConfirmation();
    snackbarStore.setActionFailure('__actionEdit');
    return;
  }
  const storageObject = await fetchStorageObject(`${pathUtils.extractDirectory(v.id, '/')}${formData.name}`);
  const target = state.storageObjects.find(obj => obj.id === v.id);
  if (target) {
    Object.assign(target, storageObject);
  }
  disableConfirmation();
  snackbarStore.setActionSuccess('__actionEdit');
  props.onMutate();
};

/**
 * @param {StorageObjectResponse} v
 * @param {Object} formData
 */
const handleFolderEdit = async (v, formData) => {
  if (!v) return;
  enableConfirmation();
  const allFiles = await fetchAllFiles();
  const filesInFolder = allFiles.filter(file => pathUtils.isParentOf(v.commonPrefix, file.objectPath));
  try {
    await Promise.all(
      filesInFolder.map(async (object) => {
        const { error } = await server.storageObject.copy({
          storageId: props.storage.storageId,
          objectPath: object.objectPath,
          destObjectPath: pathUtils.replacePathSegment(object.objectPath, v.commonPrefix, formData.name),
        });
        if (error.value) {
          throw new Error(`Failed to copy: ${error.value}`);
        }
      }),
    );
  } catch (error) {
    console.error(error);
    await handleDelete(new CommonPrefix({ commonPrefix: pathUtils.replacePathSegment(v.commonPrefix, v.commonPrefix, formData.name) }));
    disableConfirmation();
    snackbarStore.setActionFailure('__actionEdit');
    return;
  }
  await handleDelete(v);
  await fetchStorageObjects();
  disableConfirmation();
  snackbarStore.setActionSuccess('__actionEdit');
  props.onMutate();
};

const handleStorageObjectsUpload = () => {
  fetchStorageObjects();
  props.onMutate();
};

const handleCommonPrefixCreate = (v) => {
  state.storageObjects.unshift(new CommonPrefix({ commonPrefix: state.commonPrefix ? `${state.commonPrefix}/${v}` : v }));
  props.onMutate();
};

const handleFilesSelect = (objects) => {
  state.selectedObjects = objects;
};

const handleFilesDelete = async () => {
  enableConfirmation();
  try {
    await Promise.all(state.selectedObjects.map(async obj => await handleDelete(obj)));
    snackbarStore.setActionSuccess('__actionDelete');
    await fetchStorageObjects();
  } catch (error) {
    console.error(error.value);
  }
  disableConfirmation();
  state.selectedObjects = [];
  props.onMutate();
};

const handleAllSelect = (v) => {
  state.selectedObjects = v;
};

const selectOrDeselectAllInFolder = (isDeselected) => {
  state.selectedObjects = isDeselected ? [] : selectableObjects.value;
};

onBeforeRouteLeave(() => {
  abortController.abort();
});

initUrlParams();
fetchStorageObjects();
</script>

<template>
  <AppTable
    :title="$t('__fieldFile', 2)"
    :server-side="false"
    :icon="RuntimeConstant.Type.STORAGE_OBJECT.icon"
    :headers="[
      {
        title: $t('__fieldName'),
        key: 'name',
        icon: item => item.commonPrefix ? RuntimeConstant.Type.COMMON_PREFIX.icon : RuntimeConstant.Type.STORAGE_OBJECT.icon,
        iconColor: 'text',
        sortable: true,
        link: item => ({ href: `${resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value, props.storage.storageId)}/files/${item.id}${item.commonPrefix ? '' : '?file=true'}`, target: props.linkTarget }),
      },
      { title: $t('__fieldType'), key: 'contentType', sortable: true, value: (item) => fileUtils.getFileType(item) },
      { title: $t('__fieldSize'), key: 'size', isFileSize: true, sortable: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :enabled-row-select="false"
    :hidden-selectable-id-map="hiddenSelectableIdMap"
    :is-all-select-indeterminate="isAllSelectIndeterminate"
    :items="state.isLoading ? [] : state.storageObjects"
    :loading="state.isLoading"
    :on-all-select="handleAllSelect"
    :on-client-side-current-items-change="(v) => state.currentItems = v"
    :on-select="handleFilesSelect"
    :selected-ids="state.selectedObjects.map(obj => obj.objectPath)"
    multiple-select
  >
    <template #header-actions>
      <AppIconButton
        icon="mdi-refresh"
        variant="text"
        :tooltip="$t('__actionRefresh')"
        @click="fetchStorageObjects"
      />
      <AppIconButton
        icon="mdi-download"
        variant="text"
        :disabled="state.selectedObjects.length === 0"
        :tooltip="$t('__actionDownload')"
        :loading="state.isDownloading"
        @click="async () => {
          state.isDownloading = true;
          if (state.selectedObjects.length === 1) {
            await handleFileDownload(state.selectedObjects[0]);
          }
          if (state.selectedObjects.length > 1) {
            await handleFilesDownload(state.selectedObjects);
          }
          state.isDownloading = false;
        }"
      />
      <ResourceStorageObjectMoveButton
        :storage="props.storage"
        :selected-objects="state.selectedObjects"
        :common-prefix="state.commonPrefix"
        :on-submit="() => {
          fetchStorageObjects();
          state.selectedObjects = [];
          props.onMutate();
        }"
      />
      <ResourceDeleteButton
        :items="state.selectedObjects"
        :item-label="$t('__fieldFile', 2)"
        :on-delete="handleFilesDelete"
      />
      <ResourceStorageObjectHeaderMenu
        :storage-id="props.storage.storageId"
        :storage-objects="state.storageObjects"
        :on-storage-objects-upload="handleStorageObjectsUpload"
        :on-common-prefix-create="handleCommonPrefixCreate"
      />
    </template>
    <!-- TODO: Remove this once folder selection is supported -->
    <template #body.prepend>
      <ResourceStorageObjectListAllSelectRow
        v-model:is-visible="isSelectAllRowVisible"
        :selectable-objects="selectableObjects"
        :selected-objects="state.selectedObjects"
        :current-objects="currentPageFiles"
        :on-click="selectOrDeselectAllInFolder"
      />
    </template>
    <template #row-menu="{ item, isHovering }">
      <ResourceStorageObjectActionMenu
        :item="item"
        :persistent="isHovering"
        :item-label="item.objectPath ? $t('__fieldFile') : $t('__fieldFolder')"
        :storage-objects="state.storageObjects"
        :on-delete="async (v) => {
          await handleDelete(v);
          snackbarStore.setActionSuccess('__actionDelete');
        }"
        :on-download="item.objectPath ? handleFileDownload : handleFolderDownload"
        :on-edit="item.objectPath ? handleFileEdit : handleFolderEdit"
      />
    </template>
  </AppTable>
</template>
