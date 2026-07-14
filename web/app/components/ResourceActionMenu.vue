<script setup>
import { IconConstant } from '~/constants';

const props = defineProps({
  item: {
    type: Object,
    default: () => {},
  },
  module: {
    type: String,
    default: null,
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
  deleteInstruction: {
    type: String,
    default: null,
  },
  deleteInstructionKeypath: {
    type: String,
    default: null,
  },
  allowDeleteRecursively: {
    type: Boolean,
    default: false,
  },
  onAdd: {
    type: Function,
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
  onDuplicate: {
    type: Function,
    default: null,
  },
  onResourcesFetch: {
    type: Function,
    default: null,
  },
  onTemporaryPasswordReset: {
    type: Function,
    default: null,
  },
  onUsageAnalysisOpen: {
    type: Function,
    default: null,
  },
});

const { t } = useI18n();
const snackbarStore = useSnackbarStore();
const server = useServer();
const { isDefaultResource } = useResource();
const {
  canDownloadWorkflowDefinition,
  canPublishTemplate,
  downloadWorkflowDefinition,
} = useWorkflowTemplate();

const dialogDeleteRef = ref(null);
const dialogDeleteRecursivelyResultRef = ref(null);
const dialogDuplicateRef = ref(null);
const dialogTemplatePublishRef = ref(null);
const dialogSetTemporaryPasswordRef = ref(null);

const model = defineModel({
  type: Boolean,
  default: false,
});

const state = reactive({
  deleteRecursively: false,
  deleteRecursivelySuccessDependencies: [],
  deleteRecursivelyFailedDependencies: [],
});

const closeMenu = () => {
  model.value = false;
};

const addItem = () => {
  props.onAdd(props.item);
  closeMenu();
};

const deleteItem = () => {
  if (dialogDeleteRef.value) {
    dialogDeleteRef.value.open();
  }
  closeMenu();
};

const handleDelete = async () => {
  if (state.deleteRecursively) {
    const { data, error } = await server.resourceDependency.deleteRecursively({
      resources: [
        {
          resourceId: props.item.id,
          resourceType: props.item.resourceType,
        },
      ],
    });
    if (error.value) {
      return;
    }
    snackbarStore.setActionSuccess('__actionDelete');
    state.deleteRecursivelySuccessDependencies = data.value.success;
    state.deleteRecursivelyFailedDependencies = data.value.failed;
    if (state.deleteRecursivelySuccessDependencies.length === 0 && state.deleteRecursivelyFailedDependencies.length === 0) return;
    openDeleteRecursivelyResultDialog();
    return;
  }
  await props.onDelete(props.item);
};

const duplicateItem = () => {
  if (dialogDuplicateRef.value) {
    dialogDuplicateRef.value.open();
  }
  closeMenu();
};

const handleDuplicate = async (formData) => {
  await props.onDuplicate({ item: props.item, formData });
};

const editItem = () => {
  props.onEdit(props.item);
  closeMenu();
};

const publishItem = () => {
  if (dialogTemplatePublishRef.value) {
    dialogTemplatePublishRef.value.open();
  }
  closeMenu();
};

const resetTemporaryPassword = () => {
  if (dialogSetTemporaryPasswordRef.value) {
    dialogSetTemporaryPasswordRef.value.open();
  }
  closeMenu();
};

const viewUsageAnalysis = () => {
  props.onUsageAnalysisOpen(props.item);
  closeMenu();
};

const handleTemporaryPasswordReset = async (formData) => {
  await props.onTemporaryPasswordReset(formData);
};

const openDeleteRecursivelyResultDialog = () => {
  if (dialogDeleteRecursivelyResultRef.value) {
    dialogDeleteRecursivelyResultRef.value.open();
  }
};

const items = computed(() => [
  {
    title: t('__actionEdit'),
    value: 'edit',
    icon: 'mdi-pencil',
    disabled: false,
    enabled: !!props.onEdit && !isDefaultResource(props.item),
    loading: false,
    callback: editItem,
  },
  {
    title: t('__actionDuplicate'),
    value: 'duplicate',
    icon: 'mdi-content-duplicate',
    disabled: false,
    enabled: !!props.onDuplicate,
    loading: false,
    callback: duplicateItem,
  },
  {
    title: t('__actionResetTemporaryPassword'),
    value: 'resetTemporaryPassword',
    icon: 'mdi-lock-reset',
    disabled: false,
    enabled: !!props.onTemporaryPasswordReset,
    loading: false,
    callback: () => resetTemporaryPassword(props.item),
  },
  {
    title: t('__actionPublishTemplate'),
    value: 'publishTemplate',
    icon: 'mdi-package-up',
    disabled: false,
    enabled: canPublishTemplate(props.item.resourceType),
    loading: false,
    callback: publishItem,
  },
  {
    title: t('__actionDownloadDefinition'),
    value: 'downloadWorkflowDefinition',
    icon: 'mdi-file-download',
    disabled: false,
    enabled: canDownloadWorkflowDefinition(props.item.resourceType),
    loading: false,
    callback: () => downloadWorkflowDefinition(props.item),
  },
  {
    title: t('__actionAdd'),
    value: 'add',
    icon: 'mdi-account-plus',
    disabled: false,
    enabled: !!props.onAdd,
    loading: false,
    callback: addItem,
  },
  {
    title: t('__actionViewUsageAnalysis'),
    value: 'viewUsageAnalysis',
    icon: IconConstant.Base.USAGE,
    disabled: false,
    enabled: !!props.onUsageAnalysisOpen,
    loading: false,
    callback: viewUsageAnalysis,
  },
  {
    title: props.deleteActionLabel || t('__actionDelete'),
    value: 'delete',
    icon: 'mdi-trash-can',
    color: 'error',
    disabled: false,
    enabled: !!props.onDelete && !isDefaultResource(props.item),
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
      <WorkflowTemplatePublishDialog
        ref="dialogTemplatePublishRef"
        :resource="props.item"
      />
      <AppDialog
        ref="dialogDuplicateRef"
        :on-submit="handleDuplicate"
      >
        <template #body="{ onSubmit, onCancel }">
          <ResourceDuplicateForm
            :item="props.item"
            :item-label="props.itemLabel"
            :module="props.module"
            :on-submit="onSubmit"
            :on-cancel="onCancel"
          />
        </template>
      </AppDialog>
      <AppDialog
        ref="dialogDeleteRef"
        :on-submit="handleDelete"
        :width="props.allowDeleteRecursively ? 1000 : undefined"
      >
        <template #body="{ onSubmit, onCancel, loading }">
          <ResourceDeleteConfirmationCard
            v-model:delete-recursively="state.deleteRecursively"
            :item="props.item"
            :item-label="props.itemLabel"
            :action-label="props.deleteActionLabel"
            :instruction="props.deleteInstruction"
            :instruction-keypath="props.deleteInstructionKeypath"
            :allow-delete-recursively="props.allowDeleteRecursively"
            :on-submit="onSubmit"
            :on-cancel="onCancel"
            :loading="loading"
          />
        </template>
      </AppDialog>
      <AppDialog
        ref="dialogDeleteRecursivelyResultRef"
        :width="1000"
        :on-submit="props.onResourcesFetch"
      >
        <template #body="{ onSubmit }">
          <ResourceDeleteRecursivelyResultCard
            :item="props.item"
            :item-label="props.itemLabel"
            :success-dependencies="state.deleteRecursivelySuccessDependencies"
            :failed-dependencies="state.deleteRecursivelyFailedDependencies"
            :on-close="onSubmit"
          />
        </template>
      </AppDialog>
      <AppDialog
        ref="dialogSetTemporaryPasswordRef"
        :on-submit="handleTemporaryPasswordReset"
      >
        <template #body="{ onSubmit, onCancel }">
          <AccountUserTemporaryPasswordForm
            :resource="props.item"
            :on-submit="onSubmit"
            :on-discard="onCancel"
          />
        </template>
      </AppDialog>
    </template>
  </AppActionMenu>
</template>
