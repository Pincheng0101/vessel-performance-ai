<script setup>
import { ListConstant, RuntimeConstant, StorageConstant } from '~/constants';
import { CommonPrefixResponse } from '~/models/server/storageObject';

const server = useServer();
const { sortField, sortOrder, query } = usePagination();

/**
 * @import { Storage } from '~/models/server/storage'
 */

/**
 * @type {{ storage: Storage }}
 */
const props = defineProps({
  storage: {
    type: Object,
    default: null,
  },
  commonPrefix: {
    type: String,
    default: '',
  },
  selectedId: {
    type: String,
    default: null,
  },
  selectedIds: {
    type: Array,
    default: null,
  },
  multipleSelect: {
    type: Boolean,
    default: false,
  },
  restoredObjects: {
    type: [Array, Object],
    default: null,
  },
  onSubmit: {
    type: Function,
    required: true,
  },
  onCancel: {
    type: Function,
    required: true,
  },
  disabledTooltip: {
    type: String,
    default: '',
  },
  disableCondition: {
    type: Object,
    default: null,
  },
});

const state = reactive({
  selectedItems: [],
  items: [],
  currentItems: [],
  isLoading: false,
  isSaving: false,
  commonPrefix: '',
  refreshMenu: 0,
  page: ListConstant.DefaultParams.PAGE,
  perPage: ListConstant.DefaultParams.PER_PAGE,
  allStorageObjects: [],
  indeterminateIdSet: new Set(),
  restoredObjects: [],
});

const disabledIdMap = computed(() => (
  props.disableCondition
    ? Object.fromEntries(state.items.map(item => [
        item.id,
        conditionUtils.evaluate({ ...item, contentType: fileUtils.getFileType(item) }, props.disableCondition),
      ]))
    : {}
));

const isItemDisabled = (item) => {
  if (!props.disableCondition) return false;
  const normalizedItem = { ...item, contentType: item.contentType || fileUtils.getFileType(item) };
  return conditionUtils.evaluate(normalizedItem, props.disableCondition);
};

const isAllSelectIndeterminate = computed(() => state.selectedItems.some(item => pathUtils.isParentOf(state.commonPrefix, item.id)));

const allFolder = computed(() => pathUtils.extractAllFolders(state.allStorageObjects).reverse());

const selectedIdsSet = computed(() => new Set(state.selectedItems.map(item => item.id)));

const visibleFiles = computed(() => state.allStorageObjects.filter(item => pathUtils.extractLast(item.objectPath) !== StorageConstant.PLACEHOLDER_OBJECT_NAME));

const folderContentsMap = computed(() => {
  const map = {};
  const parentOf = path => normalizePath(pathUtils.removeLastSegment(path));
  const folders = allFolder.value.map(folder => new CommonPrefixResponse({ common_prefix: folder }));
  for (const folder of folders) {
    const filesInFolder = visibleFiles.value.filter(item => parentOf(item.id) === folder.id);
    const foldersInFolder = folders.filter(item => parentOf(item.id) === folder.id);
    map[folder.id] = [...filesInFolder, ...foldersInFolder];
  }
  Object.keys(map).forEach(key => map[key] = arrUtils.deduplicateByKey(map[key]));
  return map;
});

const folderContentsMapByDepthDesc = computed(() => new Map(Object.entries(folderContentsMap.value).sort((a, b) => b[0].length - a[0].length)));

if (props.restoredObjects) {
  state.selectedItems = props.restoredObjects;
}

const normalizePath = prefix => pathUtils.appendTrailingSlash(prefix);

const initializeState = () => {
  if (!props.commonPrefix && !props.selectedId) return;
  state.commonPrefix = props.commonPrefix ?? props.selectedId;
};

const refresh = () => {
  fetchItems();
};

const fetchItems = async () => {
  if (!props.storage) return;
  state.isLoading = true;
  state.items = [];
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
    state.items.unshift(...objects);
    if (data.value.commonPrefixes) {
      commonPrefixes.push(...data.value.commonPrefixes.toReversed());
    }
    nextToken = data.value.nextToken;
  } while (nextToken);
  state.items.unshift(...commonPrefixes);
  state.isLoading = false;
};

const fetchAllItems = async () => {
  state.isLoading = true;
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
      state.isLoading = false;
      return;
    }
    const objects = data.value?.data;
    state.allStorageObjects.push(...objects);
    nextToken = data.value.nextToken;
  } while (nextToken);
  state.isLoading = false;
};

const findSelectionChange = ({ prevItems, nextItems, isMultiple = false }) => {
  const prevIds = new Set(prevItems.length > 0 ? prevItems.map(item => item.id) : []);
  const nextIds = new Set(nextItems.length > 0 ? nextItems.map(item => item.id) : []);
  if (isMultiple) {
    const addedItems = nextItems.filter(item => !prevIds.has(item.id));
    const removedItems = prevItems.filter(item => !nextIds.has(item.id));
    return { addedItems, removedItems };
  }
  const addedItem = nextItems.find(item => !prevIds.has(item.id));
  const removedItem = prevItems.find(item => !nextIds.has(item.id));
  return { addedItem, removedItem };
};

const handleItemSelect = (items) => {
  if (!props.multipleSelect) {
    state.selectedItems = items;
    return;
  }
  const isFolder = item => !!item?.commonPrefix;
  const { addedItem, removedItem } = findSelectionChange({ prevItems: state.selectedItems, nextItems: items });
  const folder = isFolder(addedItem) ? addedItem : (isFolder(removedItem) ? removedItem : null);
  if (folder) {
    state.selectedItems = [...items];
    handleFolderSelect(folder, !!addedItem);
    updateFolderStates(folder.id);
    return;
  }
  state.selectedItems = items;
  updateFolderStates(state.commonPrefix);
};

const handleFolderSelect = (item, isAdd) => {
  if (isAdd) {
    const collectAllItems = (folderId) => {
      const folderItems = folderContentsMap.value[folderId] || [];
      const collectedItems = [];
      for (const item of folderItems) {
        if (item.commonPrefix) {
          collectedItems.push(item);
          collectedItems.push(...collectAllItems(item.id));
          continue;
        }
        if (!isItemDisabled(item)) {
          collectedItems.push(item);
        }
      }
      return collectedItems;
    };
    const allContents = collectAllItems(item.id);
    state.selectedItems.push(...allContents.filter(content => !selectedIdsSet.value.has(content.id)));
    state.indeterminateIdSet = new Set([...state.indeterminateIdSet].filter(prefix => !pathUtils.isParentOf(item.id, prefix)));
    return;
  }
  state.selectedItems = state.selectedItems.filter((selectedItem) => {
    const isDescendant = selectedItem.id.startsWith(item.id);
    const isParentFolder = pathUtils.isParentOf(item.id, selectedItem.id);
    return !isDescendant && !isParentFolder;
  });
};

const handleItemClick = (item) => {
  if (!item.commonPrefix) return;
  state.commonPrefix = pathUtils.removeTrailingSlash(item.commonPrefix);
  state.refreshMenu += 1;
  fetchItems();
};

const handleSortByChange = ({ key, order }) => {
  sortField.value = key;
  sortOrder.value = order;
  fetchItems();
};

const handleFilterChange = (value) => {
  query.value = value;
  fetchItems();
};

const handleCommonPrefixCreate = async () => {
  await fetchItems();
  await fetchAllItems();
  updateFolderStates(state.commonPrefix);
};

const handleStorageObjectsUpload = async () => {
  await fetchItems();
  await fetchAllItems();
  updateFolderStates(state.commonPrefix);
};

const handleSubmit = () => {
  state.isSaving = true;
  if (!props.multipleSelect) {
    props.onSubmit(state.selectedItems);
    state.isSaving = false;
    return;
  }
  const selectedFolders = state.selectedItems.filter(item => item.commonPrefix).map(item => item.commonPrefix);
  const filesInSelectedFolder = pathUtils.extractRoots(selectedFolders).map((item) => {
    return visibleFiles.value
      .filter(obj => pathUtils.isParentOf(item, obj.id))
      .filter(obj => !isItemDisabled(obj));
  }).flat();
  const extractFiles = arr => arr.filter(item => !item.commonPrefix && item?.id);
  state.selectedItems = arrUtils.deduplicateByKey([
    ...extractFiles(state.selectedItems),
    ...filesInSelectedFolder,
  ]);
  props.onSubmit(state.selectedItems);
  state.isSaving = false;
};

const handleAllSelect = (v) => {
  const { addedItems, removedItems } = findSelectionChange({ prevItems: state.selectedItems, nextItems: v, isMultiple: true });
  state.selectedItems = v;
  const changedItems = addedItems.length > 0 ? addedItems : removedItems;
  if (!changedItems.length) return;
  const isAdd = addedItems.length > 0;
  const folders = changedItems.filter(item => item.commonPrefix);
  folders.forEach(folder => handleFolderSelect(folder, isAdd));
  updateFolderStates(state.commonPrefix);
};

const restoreFolderSelection = () => {
  state.isRestoring = true;
  for (const [key, value] of folderContentsMapByDepthDesc.value) {
    const selectedItems = state.selectedItems.filter(item => key === pathUtils.removeLastSegment(item.id));
    if (value.length === 0) continue;
    if (selectedItems.length === value.length) {
      state.selectedItems.push(new CommonPrefixResponse({ common_prefix: normalizePath(key) }));
      continue;
    }
    if (selectedItems.length > 0 && selectedItems.length < value.length) {
      state.indeterminateIdSet.add(key);
    }
  }
  state.restoredObjects = [...state.selectedItems];
  state.isRestoring = false;
};

const updateFolderStates = (commonPrefix) => {
  if (state.selectedItems.length === 0) {
    state.indeterminateIdSet.forEach((_, key) => state.indeterminateIdSet.delete(key));
    state.restoredObjects = [];
    return;
  }
  const path = normalizePath(commonPrefix);
  const isAllUnselected = state.items.every(item => !selectedIdsSet.value.has(item.id));
  const isAllSelected = state.items.every(item => selectedIdsSet.value.has(item.id));
  if (isAllUnselected) {
    state.selectedItems = state.selectedItems.filter((item) => {
      if (!item.commonPrefix) return true;
      return !path.startsWith(normalizePath(item.id));
    });
    const hasIndeterminateChild = commonPrefix => [...state.indeterminateIdSet].some(childPrefix => childPrefix.startsWith(commonPrefix) && childPrefix !== commonPrefix);
    if (hasIndeterminateChild(path)) {
      state.indeterminateIdSet.add(path);
    }
    state.indeterminateIdSet.delete(path);
  }
  if (isAllSelected) {
    const currentPath = normalizePath(state.commonPrefix);
    state.selectedItems.push(new CommonPrefixResponse({ common_prefix: currentPath }));
    if (folderContentsMap.value[currentPath]) {
      state.indeterminateIdSet.delete(currentPath);
    }
  }
  for (const [key, value] of folderContentsMapByDepthDesc.value) {
    state.selectedItems = [...new Map(state.selectedItems.map(item => [item.id, item])).values()];
    const selectedItems = state.selectedItems.filter(item => key === pathUtils.removeLastSegment(item.id));
    if (value.length === 0) continue;
    if (selectedItems.length === value.length) {
      if (!state.selectedItems.includes(key)) {
        state.selectedItems.push(new CommonPrefixResponse({ common_prefix: normalizePath(key) }));
      }
      state.indeterminateIdSet.delete(key);
      continue;
    }
    if (selectedItems.length > 0 && selectedItems.length < value.length) {
      state.selectedItems = state.selectedItems.filter(item => item.id !== normalizePath(key));
      state.indeterminateIdSet.add(key);
      continue;
    }
  }
  state.restoredObjects = [...state.selectedItems];
};

onMounted(async () => {
  initializeState();
  await fetchItems();
  await fetchAllItems();
  if (state.selectedItems.length > 0) {
    restoreFolderSelection();
  }
});
</script>

<template>
  <AppTable
    :title="$t('__titleModifyItem', { action: $t('__actionSelect'), item: $t('__fieldFile', 2) })"
    :server-side="false"
    :headers="[
      {
        title: $t('__fieldName'),
        key: 'name',
        icon: item => item.commonPrefix ? RuntimeConstant.Type.COMMON_PREFIX.icon : RuntimeConstant.Type.STORAGE_OBJECT.icon,
        iconColor: 'text',
        isClickable: item => !!item.commonPrefix,
      },
      { title: $t('__fieldType'), key: 'contentType', value: (item) => fileUtils.getFileType(item) },
      { title: $t('__fieldSize'), key: 'size', isFileSize: true },
      { title: $t('__fieldLastUpdated'), key: 'updatedTs', isTimestamp: true, sortable: true },
    ]"
    :enable-url-params="false"
    :disabled-id-map="disabledIdMap"
    :disabled-tooltip="props.disabledTooltip"
    :is-all-select-indeterminate="props.multipleSelect ? isAllSelectIndeterminate : null"
    :indeterminate-id-set="state.indeterminateIdSet"
    :items="state.isLoading ? [] : state.items"
    :loading="state.isLoading"
    :multiple-select="props.multipleSelect"
    :on-all-select="handleAllSelect"
    :on-client-side-current-items-change="(v) => state.currentItems = v"
    :on-filters-change="handleFilterChange"
    :on-item-click="handleItemClick"
    :on-select="handleItemSelect"
    :on-sort-by-change="handleSortByChange"
    :restored-objects="state.restoredObjects"
    :selected-id="props.selectedId"
    :selected-ids="props.multipleSelect ? state.selectedItems.map(item => item.id) : null"
    :sort-field="sortField"
    :sort-order="sortOrder"
    hide-details
    is-row-selectable
  >
    <template #header-actions>
      <AppIconButton
        icon="mdi-refresh"
        variant="text"
        :tooltip="$t('__actionRefresh')"
        @click="refresh"
      />
      <ResourceStorageObjectHeaderMenu
        :key="state.refreshMenu"
        :storage-objects="state.items"
        :storage-id="props.storage?.storageId"
        :common-prefix="state.commonPrefix"
        :on-storage-objects-upload="handleStorageObjectsUpload"
        :on-common-prefix-create="handleCommonPrefixCreate"
      />
    </template>
    <template #title-actions>
      <AppButton
        :text="$t('__actionCancel')"
        :width="100"
        color="actionButton"
        :disabled="state.isSaving"
        @click="props.onCancel"
      />
      <AppButton
        :aria-label="$t('__actionSave')"
        :text="$t('__actionSave')"
        color="primary"
        :loading="state.isSaving"
        :disabled="state.isSaving"
        :width="100"
        @click="handleSubmit"
      />
    </template>
    <template #search-top>
      <ResourceStorageObjectListBreadcrumbs
        v-model:common-prefix="state.commonPrefix"
        :storage="props.storage"
        :on-click="fetchItems"
      />
    </template>
  </AppTable>
</template>

<style lang="scss" scoped>
:deep() {
  .v-table {
    // 100dvh - dialog margin - card title - divider - card title - divider - toolbar
    max-height: calc(100dvh - 48px - 72px - 1px - 80px - 1px - 36px);
    overflow-y: auto;
  }
}
</style>
