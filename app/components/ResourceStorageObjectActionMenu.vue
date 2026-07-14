<script setup>
const props = defineProps({
  item: {
    type: Object,
    default: () => {},
  },
  persistent: {
    type: Boolean,
    default: false,
  },
  itemLabel: {
    type: String,
    default: null,
  },
  storageObjects: {
    type: Array,
    default: () => [],
  },
  onDelete: {
    type: Function,
    default: null,
  },
  onRestore: {
    type: Function,
    default: null,
  },
  onDownload: {
    type: Function,
    default: null,
  },
  onEdit: {
    type: Function,
    default: null,
  },
});

const { t } = useI18n();

const model = defineModel({
  type: Boolean,
  default: false,
});

const dialogDeleteRef = ref(null);
const dialogEditRef = ref(null);

const state = reactive({
  loading: false,
});

const closeMenu = () => {
  model.value = false;
};

const deleteItem = () => {
  if (dialogDeleteRef.value) {
    dialogDeleteRef.value.open();
  }
};

const handleDelete = async () => {
  await props.onDelete(props.item);
  closeMenu();
};

const restoreItem = async () => {
  await props.onRestore(props.item);
  closeMenu();
};

const downloadItem = async () => {
  state.loading = true;
  await props.onDownload(props.item);
  state.loading = false;

  closeMenu();
};

const editItem = () => {
  if (dialogEditRef.value) {
    dialogEditRef.value.open();
  }
};

const handleEdit = async (v) => {
  await props.onEdit(props.item, v);
  closeMenu();
};

const items = computed(() => [
  {
    title: t('__actionEdit'),
    value: 'edit',
    icon: 'mdi-pencil',
    disabled: false,
    enabled: !!props.onEdit,
    loading: false,
    callback: editItem,
  },
  {
    title: t('__actionDownload'),
    value: 'download',
    icon: 'mdi-download',
    disabled: false,
    enabled: !!props.onDownload,
    loading: state.loading,
    callback: downloadItem,
  },
  {
    title: t('__actionCancelDelete'),
    value: 'restore',
    icon: 'mdi-restore',
    disabled: false,
    enabled: !!props.onRestore,
    loading: false,
    callback: restoreItem,
  },
  {
    title: t('__actionDelete'),
    value: 'delete',
    icon: 'mdi-trash-can',
    color: 'error',
    disabled: false,
    enabled: !!props.onDelete,
    loading: false,
    callback: deleteItem,
  },
]);

const enabledItems = computed(() => items.value.filter(item => item.enabled));
</script>

<template>
  <AppActionMenu
    v-model="model"
    :items="enabledItems"
    :persistent="props.persistent"
  >
    <template #dialog>
      <AppDialog
        ref="dialogDeleteRef"
        :on-submit="handleDelete"
      >
        <template #body="{ onSubmit, onCancel, loading }">
          <ResourceDeleteConfirmationCard
            :item="props.item"
            :item-label="props.itemLabel || $t('__fieldFile')"
            :on-submit="onSubmit"
            :on-cancel="onCancel"
            :loading="loading"
          />
        </template>
      </AppDialog>
      <AppDialog
        ref="dialogEditRef"
        :on-submit="handleEdit"
      >
        <template #body="{ onSubmit, onCancel }">
          <ResourceStorageObjectEditForm
            :form-data="props.item"
            :item-label="props.itemLabel || $t('__fieldFile')"
            :used-names="props.storageObjects.filter(v => props.item.commonPrefix ? v.commonPrefix : v.objectPath).map(v => v.name)"
            :on-submit="onSubmit"
            :on-discard="onCancel"
          />
        </template>
      </AppDialog>
    </template>
  </AppActionMenu>
</template>
