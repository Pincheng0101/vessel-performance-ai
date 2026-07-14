<script setup>
import { ChatConstant, SnackbarConstant } from '~/constants';

const props = defineProps({
  item: {
    type: Object,
    default: () => {},
  },
  isPinned: {
    type: Boolean,
    default: false,
  },
  persistent: {
    type: Boolean,
    default: false,
  },
  close: {
    type: [Boolean, Number],
    default: false,
  },
  onDelete: {
    type: Function,
    default: () => {},
  },
});

const { t } = useI18n();

const dialogDeleteRef = ref(null);
const dialogEditRef = ref(null);

const model = defineModel({
  type: Boolean,
  default: false,
});

const closeMenu = () => {
  model.value = false;
};

const deleteItem = () => {
  dialogDeleteRef.value.open();
  closeMenu();
};

const renameItem = () => {
  dialogEditRef.value.open();
  closeMenu();
};

const handleDelete = async () => {
  await props.onDelete(props.item);
};

const handleRename = async (formData) => {
  const agentChatStore = useAgentChatStore();
  const snackbarStore = useSnackbarStore();
  const breadcrumbStore = useBreadcrumbStore();
  const route = useRoute();

  await agentChatStore.renameChatSession({
    agentId: props.item.agentId,
    sessionId: props.item.sessionId,
    sessionName: formData.sessionName,
  });
  if (route.params.sessionId === props.item.sessionId) {
    breadcrumbStore.setBreadcrumb(props.item.sessionId, formData.sessionName);
  }
  snackbarStore.setActionSuccess('__actionEdit');
};

const togglePin = () => {
  const agentChatStore = useAgentChatStore();
  const snackbarStore = useSnackbarStore();
  closeMenu();
  if (props.isPinned) {
    agentChatStore.unpinChatSession(props.item.sessionId);
    return;
  }
  const result = agentChatStore.pinChatSession(props.item.sessionId);
  if (result?.error === 'limit') {
    snackbarStore.setMessage({
      text: t('__messagePinLimitReached', { limit: ChatConstant.Pin.MAX_COUNT }),
      type: SnackbarConstant.Type.WARNING,
    });
  }
};

const items = computed(() => [
  {
    title: t(props.isPinned ? '__actionUnpin' : '__actionPin'),
    value: 'pin',
    icon: props.isPinned ? 'mdi-pin-off' : 'mdi-pin',
    disabled: false,
    loading: false,
    callback: togglePin,
  },
  {
    title: t('__actionEdit'),
    value: 'edit',
    icon: 'mdi-pencil',
    disabled: false,
    loading: false,
    callback: renameItem,
  },
  {
    title: t('__actionDelete'),
    value: 'delete',
    icon: 'mdi-trash-can',
    color: 'error',
    disabled: false,
    loading: false,
    callback: deleteItem,
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
    :button-size="24"
  >
    <template #dialog>
      <AppDialog
        ref="dialogEditRef"
        :on-submit="handleRename"
      >
        <template #body="{ onSubmit, onCancel, loading }">
          <ChatSessionConfigForm
            :session="props.item"
            :on-submit="onSubmit"
            :on-cancel="onCancel"
            :loading="loading"
          />
        </template>
      </AppDialog>
      <AppDialog
        ref="dialogDeleteRef"
        :on-submit="handleDelete"
      >
        <template #body="{ onSubmit, onCancel, loading }">
          <ResourceDeleteConfirmationCard
            :item="props.item"
            :item-label="t('__actionChat')"
            :on-submit="onSubmit"
            :on-cancel="onCancel"
            :loading="loading"
          />
        </template>
      </AppDialog>
    </template>
  </AppActionMenu>
</template>
