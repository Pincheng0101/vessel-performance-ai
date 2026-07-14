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
  fieldNames: {
    type: Array,
    default: () => [],
  },
  onDelete: {
    type: Function,
    default: null,
  },
  onEdit: {
    type: Function,
    default: null,
  },
});

const { t } = useI18n();
const { openInNewTab } = useNavigation();

const model = defineModel({
  type: Boolean,
  default: false,
});

const dialogDeleteRef = ref(null);
const dialogEditRef = ref(null);

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

const editItem = () => {
  if (dialogEditRef.value) {
    dialogEditRef.value.open();
  }
};

const handleEdit = async (v) => {
  await props.onEdit(props.item, v);
  closeMenu();
};

const goToInfoPage = () => {
  openInNewTab(`dataset-items/${props.item.id}`, { replace: true });
};

const items = computed(() => [
  {
    title: t('__fieldDetail'),
    value: 'detail',
    icon: 'mdi-information-outline',
    disabled: false,
    enabled: true,
    loading: false,
    callback: goToInfoPage,
  },
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
            :item-label="$t('__fieldDatasetItem')"
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
          <ResourceDatasetItemDataForm
            :item="props.item.datasetItemData"
            :field-names="props.fieldNames"
            :action-label="$t('__actionEdit')"
            :on-submit="onSubmit"
            :on-discard="onCancel"
          />
        </template>
      </AppDialog>
    </template>
  </AppActionMenu>
</template>
