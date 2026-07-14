<script setup>
const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
  persistent: {
    type: Boolean,
    default: false,
  },
  onEdit: {
    type: Function,
    required: true,
  },
});

const { t } = useI18n();

const model = defineModel({
  type: Boolean,
  default: false,
});

const dialogEditRef = ref(null);

const closeMenu = () => {
  model.value = false;
};

const editItem = () => {
  closeMenu();
  dialogEditRef.value?.open();
};

const handleEdit = async (value) => {
  await props.onEdit(props.item, value);
  closeMenu();
};

const items = computed(() => [
  {
    title: t('__actionEdit'),
    value: 'edit',
    icon: 'mdi-pencil',
    disabled: false,
    callback: editItem,
  },
]);
</script>

<template>
  <AppActionMenu
    v-model="model"
    :items="items"
    :persistent="props.persistent"
  >
    <template #dialog>
      <AppDialog
        ref="dialogEditRef"
        :width="1000"
        :on-submit="handleEdit"
      >
        <template #body="{ onSubmit, onCancel }">
          <ResourceAgentBuiltInToolForm
            :tool="props.item"
            :on-submit="onSubmit"
            :on-discard="onCancel"
          />
        </template>
      </AppDialog>
    </template>
  </AppActionMenu>
</template>
