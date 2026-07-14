import { AgentConstant, StorageConstant } from '~/constants';
import { AgentConfigStorageItem } from '~/models/ui/agent';

export function useAgentConfigStorage({ uploadFilesToStorage }) {
  const { t } = useI18n();
  const server = useServer();

  const state = reactive({
    storageId: null,
    storage: null,
    storageObjects: [],
    pendingUploadFiles: [],
    pendingDeleteObjectPaths: [],
    pendingCreateCommonPrefixes: [],
    isLoadingStorageObjects: false,
    currentPrefix: '',
  });

  const getFilePath = file => file.webkitRelativePath || file.name;
  const getPendingUploadPath = entry => entry.objectPath || getFilePath(entry.file || entry);
  const isPathUnderPrefix = (path, prefix) => path === prefix || path.startsWith(`${prefix}/`);

  const normalizeFileName = (name) => {
    // Pattern is built from the hardcoded StorageConstant.INVALID_SYMBOLS constant, not user input
    // False positive — flagged only because the RegExp argument is non-literal
    // nosemgrep: eslint.detect-non-literal-regexp
    const invalidChars = new RegExp(`[${StorageConstant.INVALID_SYMBOLS.join('')}]`, 'g');
    return name.replace(invalidChars, '_');
  };

  const isUnderPrefix = (path, prefix) => {
    if (!prefix) return true;
    return path.startsWith(`${prefix}/`);
  };

  const getRelativePath = (path, prefix) => {
    if (!prefix) return path;
    return path.slice(prefix.length + 1);
  };

  const normalizeStatus = item => (state.pendingDeleteObjectPaths.includes(item.objectPath) ? AgentConstant.StorageItemStatus.PENDING_DELETE.value : item.status);

  const normalizedExistingItems = computed(() => {
    return state.storageObjects.map(item => AgentConfigStorageItem.createFile({
      status: AgentConstant.StorageItemStatus.EXISTING.value,
      objectPath: item.objectPath,
      name: item.name,
      contentType: item.contentType,
      size: item.size,
    }));
  });

  const normalizedPendingUploadItems = computed(() => {
    return state.pendingUploadFiles.map((entry) => {
      const file = entry.file || entry;
      const objectPath = getPendingUploadPath(entry);
      return AgentConfigStorageItem.createFile({
        status: AgentConstant.StorageItemStatus.PENDING_UPLOAD.value,
        objectPath,
        name: pathUtils.extractLast(objectPath),
        contentType: entry.contentType || file.type,
        size: entry.size || file.size,
        file,
      });
    });
  });

  const storageTableItems = computed(() => {
    const currentPrefix = state.currentPrefix;
    const fileItems = [...normalizedExistingItems.value, ...normalizedPendingUploadItems.value]
      .map(item => ({ ...item, status: normalizeStatus(item) }));

    const folderMap = new Map();
    const currentFiles = [];

    fileItems.forEach((item) => {
      if (!isUnderPrefix(item.objectPath, currentPrefix)) return;
      const relativePath = getRelativePath(item.objectPath, currentPrefix);
      const pathSegments = relativePath.split('/').filter(Boolean);
      if (pathSegments.length > 1) {
        const folderName = pathSegments[0];
        const commonPrefix = currentPrefix ? `${currentPrefix}/${folderName}` : folderName;
        const folderState = folderMap.get(commonPrefix) || AgentConfigStorageItem.createFolder({
          status: AgentConstant.StorageItemStatus.EXISTING.value,
          commonPrefix,
          name: folderName,
          children: [],
        });
        folderState.children.push(item);
        folderMap.set(commonPrefix, folderState);
        return;
      }

      currentFiles.push(item);
    });

    const folders = Array.from(folderMap.values()).map((folder) => {
      const hasPendingUpload = folder.children.some(child => child.status === AgentConstant.StorageItemStatus.PENDING_UPLOAD.value);
      const allPendingDelete = folder.children.every(child => child.status === AgentConstant.StorageItemStatus.PENDING_DELETE.value);
      let status = AgentConstant.StorageItemStatus.EXISTING.value;
      if (hasPendingUpload) {
        status = AgentConstant.StorageItemStatus.PENDING_UPLOAD.value;
      } else if (allPendingDelete) {
        status = AgentConstant.StorageItemStatus.PENDING_DELETE.value;
      }
      folder.status = status;
      return folder;
    });

    state.pendingCreateCommonPrefixes.forEach((pendingPrefix) => {
      if (!isUnderPrefix(pendingPrefix, currentPrefix)) return;
      const relativePath = getRelativePath(pendingPrefix, currentPrefix);
      const pathSegments = relativePath.split('/').filter(Boolean);
      if (pathSegments.length < 1) return;

      const folderName = pathSegments[0];
      const commonPrefix = currentPrefix ? `${currentPrefix}/${folderName}` : folderName;
      const existingFolder = folders.find(folder => folder.commonPrefix === commonPrefix);
      if (existingFolder) {
        if (existingFolder.status === AgentConstant.StorageItemStatus.EXISTING.value) {
          existingFolder.status = AgentConstant.StorageItemStatus.PENDING_UPLOAD.value;
        }
        return;
      }

      folders.push(AgentConfigStorageItem.createFolder({
        status: AgentConstant.StorageItemStatus.PENDING_UPLOAD.value,
        commonPrefix,
        name: folderName,
        children: [],
      }));
    });

    const sortedFolders = folders.toSorted((a, b) => a.name.localeCompare(b.name));
    const sortedFiles = currentFiles.toSorted((a, b) => {
      const aIsPendingUpload = a.status === AgentConstant.StorageItemStatus.PENDING_UPLOAD.value;
      const bIsPendingUpload = b.status === AgentConstant.StorageItemStatus.PENDING_UPLOAD.value;
      if (aIsPendingUpload && !bIsPendingUpload) return -1;
      if (!aIsPendingUpload && bIsPendingUpload) return 1;
      return a.name.localeCompare(b.name);
    });

    return [...sortedFolders, ...sortedFiles];
  });

  const setStorageId = (storageId) => {
    state.storageId = storageId;
  };

  const fetchStorageMetadata = async () => {
    if (!state.storageId) {
      state.storage = null;
      return;
    }
    const { data, error } = await server.storage.get({ storageId: state.storageId });
    if (!error.value) {
      state.storage = data.value;
    }
  };

  const fetchStorageObjects = async () => {
    if (!state.storageId) {
      state.storageObjects = [];
      return;
    }

    state.isLoadingStorageObjects = true;
    state.storageObjects = [];
    const objects = [];
    let nextToken = null;

    do {
      const { data, error } = await server.storageObject.list({
        storageId: state.storageId,
        delimiter: '',
        prefix: '',
        nextToken,
      }, {
        lazy: false,
      });

      if (error.value) {
        state.isLoadingStorageObjects = false;
        return;
      }

      const files = data.value.data.filter(item => pathUtils.extractLast(item.objectPath) !== StorageConstant.PLACEHOLDER_OBJECT_NAME);
      objects.push(...files);
      nextToken = data.value.nextToken;
    } while (nextToken);

    state.storageObjects = objects;
    state.isLoadingStorageObjects = false;
  };

  const initializeStorage = async (storageId) => {
    setStorageId(storageId);
    await fetchStorageMetadata();
    await fetchStorageObjects();
  };

  const handleFilesSelect = (files) => {
    const normalizedFiles = files.map((rawFile) => {
      const file = fileUtils.rename(rawFile, normalizeFileName(rawFile.name));
      const relativePath = file.webkitRelativePath || file.name;
      const objectPath = state.currentPrefix ? `${state.currentPrefix}/${relativePath}` : relativePath;
      return {
        file,
        objectPath,
        contentType: file.type,
        size: file.size,
      };
    });

    const existingPathSet = new Set([
      ...state.storageObjects.map(item => item.objectPath),
      ...state.pendingUploadFiles.map(item => getPendingUploadPath(item)),
    ]);

    const filesToAdd = normalizedFiles.filter(item => !existingPathSet.has(item.objectPath));
    state.pendingUploadFiles = [...state.pendingUploadFiles, ...filesToAdd];
  };

  const createPendingFolder = (name) => {
    const normalizedName = normalizeFileName((name || '').trim());
    if (!normalizedName) return;
    const commonPrefix = state.currentPrefix ? `${state.currentPrefix}/${normalizedName}` : normalizedName;
    if (!state.pendingCreateCommonPrefixes.includes(commonPrefix)) {
      state.pendingCreateCommonPrefixes.push(commonPrefix);
    }
  };

  const handleStorageItemClick = (item) => {
    if (!item?.isFolder) return;
    state.currentPrefix = item.commonPrefix;
  };

  const handleDeleteStorageObject = (item) => {
    if (item?.isFolder) {
      const prefix = item.commonPrefix;
      if (!prefix) return;

      state.pendingUploadFiles = state.pendingUploadFiles.filter(file => !isPathUnderPrefix(getPendingUploadPath(file), prefix));
      state.pendingCreateCommonPrefixes = state.pendingCreateCommonPrefixes.filter(commonPrefix => !isPathUnderPrefix(commonPrefix, prefix));

      const existingObjectPaths = state.storageObjects
        .filter(storageObject => isPathUnderPrefix(storageObject.objectPath, prefix))
        .map(storageObject => storageObject.objectPath);
      state.pendingDeleteObjectPaths = [...new Set([...state.pendingDeleteObjectPaths, ...existingObjectPaths])];
      return;
    }

    if (item.status === AgentConstant.StorageItemStatus.PENDING_UPLOAD.value) {
      state.pendingUploadFiles = state.pendingUploadFiles.filter(file => getPendingUploadPath(file) !== item.objectPath);
      return;
    }
    if (!state.pendingDeleteObjectPaths.includes(item.objectPath)) {
      state.pendingDeleteObjectPaths.push(item.objectPath);
    }
  };

  const handleRestoreStorageObject = (item) => {
    if (item?.isFolder) {
      const prefix = item.commonPrefix;
      if (!prefix) return;
      state.pendingDeleteObjectPaths = state.pendingDeleteObjectPaths.filter(objectPath => !isPathUnderPrefix(objectPath, prefix));
      return;
    }
    state.pendingDeleteObjectPaths = state.pendingDeleteObjectPaths.filter(objectPath => objectPath !== item.objectPath);
  };

  const handleDownloadStorageObject = async (item) => {
    if (item.status === AgentConstant.StorageItemStatus.PENDING_UPLOAD.value && item.file) {
      fileUtils.download({
        data: item.file,
        fileName: item.name,
        type: item.contentType,
      });
      return;
    }

    const { data, error } = await server.storageObject.download({
      storageId: state.storageId,
      objectPath: item.objectPath,
    });
    if (error.value) return;

    fileUtils.download({
      url: data.value.presignedUrl,
      fileName: item.name,
    });
  };

  const applyStorageDatasetChanges = async () => {
    if (!state.storageId) return false;

    let hasChanges = false;

    if (state.pendingUploadFiles.length > 0) {
      await uploadFilesToStorage({
        files: state.pendingUploadFiles,
        storageId: state.storageId,
      });
      hasChanges = true;
    }

    for (const objectPath of state.pendingDeleteObjectPaths) {
      const { error } = await server.storageObject.destroy({
        storageId: state.storageId,
        objectPath,
      });
      if (error.value) {
        throw new Error(t('__titleModifyFailed', { action: t('__actionDelete') }).toLowerCase());
      }
      hasChanges = true;
    }

    for (const commonPrefix of state.pendingCreateCommonPrefixes) {
      const { data, error } = await server.storageObject.createCommonPrefix({
        storageId: state.storageId,
        objectPath: commonPrefix,
      });
      if (error.value) {
        throw new Error(t('__titleModifyFailed', { action: t('__actionNew') }).toLowerCase());
      }
      await server.storageObject.uploadToS3({
        presignedUrl: data.value.presignedUrl,
        file: new File([], StorageConstant.PLACEHOLDER_OBJECT_NAME, { type: 'text/plain' }),
      });
      hasChanges = true;
    }

    return hasChanges;
  };

  return {
    state,
    storageTableItems,
    setStorageId,
    fetchStorageMetadata,
    fetchStorageObjects,
    initializeStorage,
    handleFilesSelect,
    createPendingFolder,
    handleStorageItemClick,
    handleDeleteStorageObject,
    handleRestoreStorageObject,
    handleDownloadStorageObject,
    applyStorageDatasetChanges,
  };
}
