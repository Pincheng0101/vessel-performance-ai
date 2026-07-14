<script setup>
import { ResourceConstant } from '~/constants';

/**
 * @import { Storage } from '~/models/server/storage'
 * @import { StorageObjectResponse } from '~/models/server/storageObject'
 */

/**
 * @type {{ storage: Storage }}
 */
const props = defineProps({
  storage: {
    type: Object,
    default: null,
  },
  item: {
    type: Object,
    default: () => {},
  },
  usedNames: {
    type: Array,
    default: null,
  },
  onMove: {
    type: Function,
    default: () => {},
  },
});

const route = useRoute();
const router = useRouter();
const server = useServer();
const snackbarStore = useSnackbarStore();
const { enableConfirmation, disableConfirmation } = useLeaveConfirmation();

const state = reactive({
  commonPrefix: decodeURIComponent(pathUtils.extractDirectory(pathUtils.extractAfter(route.path, 'files/'), '/')),
});

/**
 * @param {Object} v
 */
const handleEdit = async (v) => {
  if (!v) return;
  enableConfirmation();
  const { error } = await server.storageObject.copy({
    storageId: route.params.id,
    objectPath: props.item.id,
    destObjectPath: `${state.commonPrefix}${v.name}`,
  });
  if (error.value) {
    disableConfirmation();
    return;
  }
  const { error: deleteError } = await server.storageObject.destroy({
    storageId: route.params.id,
    objectPath: props.item.id,
  });
  if (deleteError.value) {
    disableConfirmation();
    return;
  }
  disableConfirmation();
  router.replace({
    path: v.name,
    query: {
      ...route.query,
      file: true,
    },
  });
  snackbarStore.setActionSuccess('__actionEdit');
};

/**
 * @param {StorageObjectResponse} v
 */
const handleDownload = async (v) => {
  if (!v) return;
  const { data, error } = await server.storageObject.download({
    storageId: v.storageId,
    objectPath: v.id,
  });
  if (error.value) {
    snackbarStore.setActionFailure('__actionDownload');
    return;
  }
  if (data.value.presignedUrl) {
    fileUtils.download({
      url: data.value.presignedUrl,
      fileName: v.name,
    });
  }
};

/**
 * @param {StorageObjectResponse} v
 */
const handleDelete = async (v) => {
  const { error } = await server.storageObject.destroy({
    storageId: route.params.id,
    objectPath: v.id,
  });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionDelete');
  navigateTo(`${resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value, route.params.id)}/files/${state.commonPrefix}`);
};
</script>

<template>
  <AppDetailsCard :display-fields="props.item.displayFields">
    <template #actions>
      <AppDialog :on-submit="handleEdit">
        <template #activator="{ onOpen }">
          <AppIconButton
            icon="mdi-pencil"
            variant="text"
            :tooltip="$t('__actionEdit')"
            @click="onOpen"
          />
        </template>
        <template #body="{ onSubmit, onCancel }">
          <ResourceStorageObjectEditForm
            :form-data="props.item"
            :used-names="props.usedNames"
            :on-submit="onSubmit"
            :on-discard="onCancel"
          />
        </template>
      </AppDialog>
      <ResourceStorageObjectMoveButton
        :storage="props.storage"
        :selected-objects="[props.item]"
        :common-prefix="state.commonPrefix"
        :on-submit="commonPrefix => props.onMove(commonPrefix)"
      />
      <AppIconButton
        icon="mdi-download"
        variant="text"
        :tooltip="$t('__actionDownload')"
        @click="() => handleDownload(props.item)"
      />
      <ResourceDeleteButton
        :item="props.item"
        :item-label="$t('__fieldFile')"
        :on-delete="() => handleDelete(props.item)"
      />
    </template>
  </AppDetailsCard>
</template>
