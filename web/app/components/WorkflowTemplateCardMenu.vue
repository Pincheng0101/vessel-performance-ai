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
  deleteActionLabel: {
    type: String,
    default: null,
  },
  onDelete: {
    type: Function,
    default: null,
  },
});

const { t } = useI18n();

const dialogDeleteRef = ref(null);

const model = defineModel({
  type: Boolean,
  default: false,
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

const items = computed(() => [
  {
    title: props.deleteActionLabel || t('__actionDelete'),
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
            :item-label="props.itemLabel"
            :action-label="props.deleteActionLabel"
            :on-submit="onSubmit"
            :on-cancel="onCancel"
            :loading="loading"
          />
        </template>
      </AppDialog>
    </template>
  </AppActionMenu>
</template>
