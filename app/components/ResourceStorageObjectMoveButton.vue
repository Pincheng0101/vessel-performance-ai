<script setup>
/**
 * @import { Storage } from '~/models/server/storage'
 */

const snackbarStore = useSnackbarStore();
const server = useServer();
const { enableConfirmation, disableConfirmation } = useLeaveConfirmation();

/**
 * @type {{ storage: Storage }}
 */
const props = defineProps({
  storage: {
    type: Object,
    default: null,
  },
  selectedObjects: {
    type: Array,
    default: () => [],
  },
  commonPrefix: {
    type: String,
    default: '',
  },
  onSubmit: {
    type: Function,
    default: () => {},
  },
});

const dialogFolderSelectRef = ref(null);
const dialogFolderReviewRef = ref(null);

const state = reactive({
  isLoading: false,
  commonPrefix: '',
});

const disabledIdMap = computed(() => {
  const map = {};
  if (state.commonPrefix) {
    map[`${pathUtils.appendTrailingSlash(state.commonPrefix)}`] = `${pathUtils.appendTrailingSlash(state.commonPrefix)}`;
  }
  return map;
});

const handleFolderSelect = async (v) => {
  state.commonPrefix = v;
  await dialogFolderReviewRef.value.confirm();
};

const handleFolderMove = async () => {
  state.isLoading = true;
  enableConfirmation();
  try {
    const copyResults = await Promise.all(
      props.selectedObjects.map(async (object) => {
        const { error } = await server.storageObject.copy({
          storageId: props.storage.storageId,
          objectPath: object.objectPath,
          destObjectPath: `${state.commonPrefix}${pathUtils.extractLast(object.objectPath)}`,
        });
        if (error.value) {
          throw new Error(`Failed to copy: ${error.value}`);
        }
        return object;
      }),
    );
    await Promise.all(
      copyResults.map(async (object) => {
        const { error } = await server.storageObject.destroy({
          storageId: props.storage.storageId,
          objectPath: object.objectPath,
        });
        if (error.value) {
          throw new Error(`Failed to delete: ${error.value}`);
        }
      }),
    );
  } catch (error) {
    console.error(error);
  } finally {
    disableConfirmation();
    state.isLoading = false;
  }
  snackbarStore.setActionSuccess('__actionMove');
  props.onSubmit(state.commonPrefix);
};
</script>

<template>
  <AppDialog
    ref="dialogFolderSelectRef"
    :width="1000"
    :on-submit="handleFolderSelect"
  >
    <template #activator="{ onOpen }">
      <AppIconButton
        icon="mdi-folder-move"
        :disabled="props.selectedObjects.length < 1"
        variant="text"
        :tooltip="$t('__actionMove')"
        @click="onOpen"
      />
    </template>
    <template #body="{ onSubmit, onCancel }">
      <ResourceStorageCommonPrefixSelectList
        :storage="props.storage"
        :disabled-id-map="disabledIdMap"
        :disabled-tooltip="$t('__tooltipResourceStorageObjectMoveToSameFolder')"
        :common-prefix="props.commonPrefix"
        :on-submit="onSubmit"
        :on-cancel="onCancel"
      />
    </template>
  </AppDialog>
  <AppDialog
    ref="dialogFolderReviewRef"
    :on-submit="handleFolderMove"
  >
    <template #body="{ onSubmit, onCancel }">
      <ResourceStorageObjectMoveReviewCard
        :storage="props.storage"
        :common-prefix="state.commonPrefix"
        :storage-objects="props.selectedObjects"
        :on-submit="onSubmit"
        :on-cancel="onCancel"
      />
    </template>
  </AppDialog>
</template>
