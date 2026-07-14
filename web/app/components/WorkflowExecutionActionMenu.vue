<script setup>
import { StatusConstant } from '~/constants';
import { WorkflowExecution } from '~/models/server/workflowExecution';

const props = defineProps({
  item: {
    type: Object,
    default: () => {},
  },
  persistent: {
    type: Boolean,
    default: false,
  },
  close: {
    type: [Boolean, Number],
    default: false,
  },
  onEdit: {
    type: Function,
    default: () => {},
  },
  onStop: {
    type: Function,
    default: () => {},
  },
});

const snackbarStore = useSnackbarStore();
const server = useServer();
const { t } = useI18n();

const dialogEditRef = ref(null);

const state = reactive({
  isStopping: false,
});

const model = defineModel({
  type: Boolean,
  default: false,
});

const closeMenu = () => {
  model.value = false;
};

const stopItem = async () => {
  state.isStopping = true;
  const { error } = await server.workflowExecution.stop({ executionArn: props.item.executionArn });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionStop');
  await props.onStop(new WorkflowExecution({ ...props.item, status: StatusConstant.Runtime.ABORTED.value }));
  state.isStopping = false;
  closeMenu();
};

const editItem = () => {
  if (dialogEditRef.value) {
    openEditDialog();
  }
  closeMenu();
};

const openEditDialog = () => {
  if (dialogEditRef.value) {
    dialogEditRef.value.open();
  }
};

const handleEdit = async (formData) => {
  const { error } = await server.workflowExecution.update({ executionArn: props.item.executionArn, displayName: formData.displayName });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionEdit');
  props.onEdit(new WorkflowExecution({ ...props.item, displayName: formData.displayName }));
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
  {
    title: t('__actionStop'),
    value: 'stop',
    icon: 'mdi-stop-circle',
    disabled: state.isStopping || props.item.status !== StatusConstant.Runtime.RUNNING.value,
    loading: state.isStopping,
    callback: stopItem,
  },
]);

watch(() => props.close, () => {
  closeMenu();
});
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
        :on-submit="handleEdit"
      >
        <template #body="{ onSubmit, onCancel }">
          <WorkflowExecutionConfigForm
            :execution="props.item"
            :on-submit="onSubmit"
            :on-cancel="onCancel"
          />
        </template>
      </AppDialog>
    </template>
  </AppActionMenu>
</template>
