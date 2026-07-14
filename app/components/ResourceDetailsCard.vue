<script setup>
const props = defineProps({
  item: {
    type: Object,
    default: () => {},
  },
  module: {
    type: String,
    default: null,
  },
  itemLabel: {
    type: String,
    default: null,
  },
  editPath: {
    type: String,
    default: '',
  },
  allowDeleteRecursively: {
    type: Boolean,
    default: false,
  },
  allowValidate: {
    type: Boolean,
    default: false,
  },
  allowAwsCredential: {
    type: Boolean,
    default: false,
  },
  validateButtonTooltip: {
    type: String,
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
});

const snackbarStore = useSnackbarStore();
const server = useServer();
const {
  canDownloadWorkflowDefinition,
  canPublishTemplate,
  downloadWorkflowDefinition,
} = useWorkflowTemplate();
const {
  isDefaultResource,
  hasAwsCredential,
  isValidating,
  validate,
} = useResource();

const dialogDeleteRecursivelyResultRef = ref(null);

const state = reactive({
  deleteRecursively: false,
  deleteRecursivelySuccessDependencies: [],
  deleteRecursivelyFailedDependencies: [],
});

const openDeleteRecursivelyResultDialog = () => {
  if (dialogDeleteRecursivelyResultRef.value) {
    dialogDeleteRecursivelyResultRef.value.open();
  }
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
  if (props.onDelete) {
    props.onDelete(props.item, state.deleteRecursively);
  }
};
</script>

<template>
  <AppDetailsCard :display-fields="props.item.displayFields">
    <template #prepend-actions>
      <slot name="prepend-actions" />
    </template>
    <template #actions>
      <AppIconButton
        v-if="props.editPath && !isDefaultResource(props.item)"
        :aria-label="$t('__actionEdit')"
        icon="mdi-pencil"
        variant="text"
        :tooltip="$t('__actionEdit')"
        :on-click="() => navigateTo(props.editPath)"
      />
      <ResourceDuplicateButton
        v-if="props.onDuplicate"
        :aria-label="$t('__actionCopy')"
        :item="props.item"
        :item-label="props.itemLabel"
        :module="props.module"
        :on-duplicate="props.onDuplicate"
      />
      <WorkflowTemplatePublishDialog
        v-if="canPublishTemplate(props.item.resourceType)"
        :resource="props.item"
      >
        <template #activator="{ onOpen }">
          <AppIconButton
            :aria-label="$t('__actionPublishTemplate')"
            icon="mdi-package-up"
            variant="text"
            :tooltip="$t('__actionPublishTemplate')"
            @click="onOpen"
          />
        </template>
      </WorkflowTemplatePublishDialog>
      <AppIconButton
        v-if="canDownloadWorkflowDefinition(props.item.resourceType)"
        :aria-label="$t('__actionDownloadDefinition')"
        icon="mdi-file-download"
        variant="text"
        :tooltip="$t('__actionDownloadDefinition')"
        :on-click="() => downloadWorkflowDefinition(props.item)"
      />
      <AppIconButton
        v-if="props.allowValidate"
        :aria-label="props.validateButtonTooltip || $t('__actionValidate')"
        icon="mdi-key-wireless"
        variant="text"
        :tooltip="props.validateButtonTooltip || $t('__actionValidate')"
        :loading="isValidating"
        :disabled="props.allowAwsCredential && !hasAwsCredential(props.item)"
        :on-click="() => validate(props.module, props.item)"
      >
        <template #loader>
          <AppProgressCircular
            :size="14"
            :width="2"
          />
        </template>
      </AppIconButton>
    </template>
    <template #append-actions>
      <slot name="before-delete-actions" />
      <ResourceDeleteButton
        v-if="props.onDelete && !isDefaultResource(props.item)"
        v-model:delete-recursively="state.deleteRecursively"
        :item="props.item"
        :item-label="props.itemLabel"
        :allow-delete-recursively="props.allowDeleteRecursively"
        :on-delete="handleDelete"
      />
    </template>
    <template #append-display-fields>
      <slot name="append-display-fields" />
    </template>
  </AppDetailsCard>
  <AppDialog
    ref="dialogDeleteRecursivelyResultRef"
    :on-submit="() => navigateTo(resourceUtils.getUrl(props.item.resourceType), { replace: true })"
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
</template>

<style lang="scss" scoped>
:deep() {
  .v-expansion-panels {
    margin-top: 16px;
  }
}
</style>
