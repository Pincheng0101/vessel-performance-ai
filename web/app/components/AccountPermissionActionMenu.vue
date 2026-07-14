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
  onEdit: {
    type: Function,
    default: null,
  },
  onDelete: {
    type: Function,
    default: null,
  },
  onDependencyPermissionsGrant: {
    type: Function,
    default: null,
  },
});

const { t } = useI18n();

const dialogDeleteRef = ref(null);
const dialogGrantDependencyPermissionsRef = ref(null);

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
  closeMenu();
};

const handleDelete = async () => {
  await props.onDelete(props.item);
};

const editItem = () => {
  props.onEdit(props.item);
  closeMenu();
};

const grantDependencyPermissions = () => {
  if (dialogGrantDependencyPermissionsRef.value) {
    dialogGrantDependencyPermissionsRef.value.open();
  }
  closeMenu();
};

const handleDependencyPermissionsGrant = async (item) => {
  await props.onDependencyPermissionsGrant(item);
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
    title: t('__actionGrantDependencyPermissions'),
    value: 'grant-dependency-permissions',
    icon: 'mdi-graph',
    disabled: false,
    enabled: !!props.onDependencyPermissionsGrant,
    loading: false,
    callback: grantDependencyPermissions,
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
            :item-label="props.itemLabel"
            :on-submit="onSubmit"
            :on-cancel="onCancel"
            :loading="loading"
          />
        </template>
      </AppDialog>
      <AppDialog
        ref="dialogGrantDependencyPermissionsRef"
        :on-submit="handleDependencyPermissionsGrant"
      >
        <template #body="{ onSubmit, onCancel, loading }">
          <ResourceDependencyPermissionsGrantConfirmationCard
            :item="props.item"
            :on-submit="onSubmit"
            :on-cancel="onCancel"
            :loading="loading"
          />
        </template>
      </AppDialog>
    </template>
  </AppActionMenu>
</template>
