<script setup>
const props = defineProps({
  storageObjects: {
    type: Array,
    default: () => [],
  },
  supportedExtensions: {
    type: Array,
    default: () => [],
  },
  onStorageObjectsUpload: {
    type: Function,
    default: null,
  },
  onCommonPrefixCreate: {
    type: Function,
    default: null,
  },
});

const { t } = useI18n();

const dialogUploadRef = ref(null);
const dialogCreateRef = ref(null);

const model = defineModel({
  type: Boolean,
  default: false,
});

const state = reactive({
  isLoading: false,
  progress: 0,
});

const items = computed(() => [
  {
    title: t('__actionUpload'),
    value: 'upload',
    icon: 'mdi-upload',
    enabled: !!props.onStorageObjectsUpload,
    callback: () => dialogUploadRef.value?.open(),
  },
  {
    title: t('__titleModifyItem', { action: t('__actionNew'), item: t('__fieldFolder') }),
    value: 'createCommonPrefix',
    icon: 'mdi-folder-plus',
    enabled: !!props.onCommonPrefixCreate,
    callback: () => dialogCreateRef.value?.open(),
  },
]);

const enabledItems = computed(() => items.value.filter(item => item.enabled));

const closeMenu = () => {
  model.value = false;
};

const handleStorageObjectsUpload = async (files) => {
  if (!props.onStorageObjectsUpload) return;
  state.isLoading = true;
  await props.onStorageObjectsUpload(files);
  state.isLoading = false;
  closeMenu();
};

const handleCommonPrefixCreate = async (name) => {
  if (!props.onCommonPrefixCreate) return;
  await props.onCommonPrefixCreate(name);
  closeMenu();
};
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
      :width="180"
      rounded="lg"
    >
      <v-list
        density="compact"
        class="py-0"
      >
        <v-list-item
          v-for="item in enabledItems"
          :key="item.value"
          class="text-body-2"
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
      </v-list>
    </v-card>
  </v-menu>
  <AppDialog
    ref="dialogUploadRef"
    :on-submit="handleStorageObjectsUpload"
    :width="1000"
  >
    <template #body="{ onSubmit, onCancel }">
      <ResourceStorageObjectUploadForm
        :loading="state.isLoading"
        :progress="state.progress"
        :storage-objects="props.storageObjects"
        :supported-extensions="props.supportedExtensions"
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
