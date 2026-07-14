<script setup>
import { StorageConstant } from '~/constants';

/**
 * @import { StorageObject } from '~/models/server/storageObject'
 */

const props = defineProps({
  storageId: {
    type: String,
    default: null,
  },
  commonPrefix: {
    type: String,
    default: null,
  },
  storageObjects: {
    type: Object,
    default: null,
  },
  onCommonPrefixCreate: {
    type: Function,
    default: null,
  },
  onStorageObjectsUpload: {
    type: Function,
    default: null,
  },
});

const { t } = useI18n();
const route = useRoute();
const server = useServer();
const { enableConfirmation, disableConfirmation } = useLeaveConfirmation();

const dialogUploadRef = ref(null);
const dialogCreateRef = ref(null);

const state = reactive({
  progressMap: {},
  commonPrefix: props.commonPrefix || decodeURIComponent(pathUtils.extractAfter(route.fullPath, 'files/')),
  isLoading: false,
});

const model = defineModel({
  type: Boolean,
  default: false,
});

const progress = computed(() => {
  const values = Object.values(state.progressMap);
  return values.length > 0 ? Math.floor(mathUtils.average(values)) : 0;
});

const items = computed(() => [
  {
    title: t('__actionUpload'),
    value: 'upload',
    icon: 'mdi-upload',
    enabled: !!props.onStorageObjectsUpload,
    callback: uploadStorageObject,
  },
  {
    title: t('__titleModifyItem', { action: t('__actionNew'), item: t('__fieldFolder') }),
    value: 'createCommonPrefix',
    icon: 'mdi-folder-plus',
    enabled: !!props.onCommonPrefixCreate,
    callback: createCommonPrefix,
  },
]);

const closeMenu = () => {
  model.value = false;
};

const createCommonPrefix = () => {
  dialogCreateRef.value.open();
};

const uploadStorageObject = () => {
  dialogUploadRef.value.open();
};

/**
 * @param {File[]} v
 */
const handleStorageObjectsUpload = async (v) => {
  if (v.length === 0) return;
  state.isLoading = true;
  enableConfirmation();
  const uploadRequests = v.map((formData) => {
    const path = formData.webkitRelativePath || formData.name;
    return server.storageObject.upload({
      storageId: props.storageId,
      objectPath: state.commonPrefix ? `${state.commonPrefix}/${path}` : path,
      contentType: formData.type,
    });
  });
  const uploadResponses = await Promise.allSettled(uploadRequests);

  const uploadToS3Requests = uploadResponses.map(async (formData, index) => {
    try {
      await server.storageObject.uploadToS3({
        presignedUrl: formData.value.data.value.presignedUrl,
        file: v[index],
        onProgress: (progress) => {
          state.progressMap[index] = progress;
        },
      });
    } catch (error) {
      console.error(error);
    }
  });
  await Promise.allSettled(uploadToS3Requests);

  state.progressMap = {};
  props.onStorageObjectsUpload();
  state.isLoading = false;
  disableConfirmation();
  closeMenu();
};

const handleCommonPrefixCreate = async (v) => {
  const uploadRequest = await server.storageObject.createCommonPrefix({
    storageId: props.storageId,
    objectPath: state.commonPrefix ? `${state.commonPrefix}/${v}` : v,
  });
  try {
    await server.storageObject.uploadToS3({
      presignedUrl: uploadRequest.data.value.presignedUrl,
      file: new File([], StorageConstant.PLACEHOLDER_OBJECT_NAME, { type: 'text/plain' }),
    });
  } catch (error) {
    console.error(error);
  }
  props.onCommonPrefixCreate(v);
  closeMenu();
};

watch(() => props.commonPrefix, (after) => {
  state.commonPrefix = after;
});
</script>

<template>
  <v-menu
    v-model="model"
    :close-on-content-click="false"
    :offset="4"
  >
    <template #activator="{ props: p }">
      <AppIconButton
        v-bind="p"
        icon="mdi-plus"
        class="primary-gradient"
      />
    </template>
    <v-card
      :elevation="1"
      :width="160"
      rounded="lg"
    >
      <v-list
        density="compact"
        class="py-0"
      >
        <template
          v-for="item in items"
          :key="item.title"
        >
          <v-list-item
            class="text-body-2"
            :class="{ 'd-none': !item.enabled }"
            @click="item.callback"
          >
            <template #prepend>
              <v-icon
                :icon="item.icon"
                size="small"
                color="primary"
              />
            </template>
            {{ item.title }}
          </v-list-item>
        </template>
      </v-list>
    </v-card>
  </v-menu>
  <AppDialog
    ref="dialogUploadRef"
    :width="1000"
    :on-submit="handleStorageObjectsUpload"
  >
    <template #body="{ onSubmit, onCancel }">
      <ResourceStorageObjectUploadForm
        :loading="state.isLoading"
        :progress="progress"
        :storage-objects="props.storageObjects"
        :on-submit="onSubmit"
        :on-discard="onCancel"
      />
    </template>
  </AppDialog>
  <AppDialog
    ref="dialogCreateRef"
    :on-submit="handleCommonPrefixCreate"
  >
    <template #body="{ onSubmit, onCancel }">
      <ResourceStorageCommonPrefixForm
        :on-submit="onSubmit"
        :on-discard="onCancel"
      />
    </template>
  </AppDialog>
</template>
