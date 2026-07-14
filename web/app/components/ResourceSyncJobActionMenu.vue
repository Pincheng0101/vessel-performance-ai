<script setup>
import { StatusConstant } from '~/constants';

const props = defineProps({
  item: {
    type: Object,
    default: () => {},
  },
  persistent: {
    type: Boolean,
    default: false,
  },
  onStop: {
    type: Function,
    default: () => {},
  },
});

const { t } = useI18n();
const snackbarStore = useSnackbarStore();
const server = useServer();

const model = defineModel({
  type: Boolean,
  default: false,
});

const state = reactive({
  isStopping: false,
});

const closeMenu = () => {
  model.value = false;
};

const stopItem = async () => {
  state.isStopping = true;
  const { error } = await server.syncJob.stop({ syncJobId: props.item.syncJobId });
  if (error.value) {
    return;
  }
  snackbarStore.setActionSuccess('__actionStop');
  await props.onStop(props.item);
  state.isStopping = false;
  closeMenu();
};

const items = computed(() => [
  {
    title: t('__actionStop'),
    value: 'stop',
    icon: 'mdi-stop-circle',
    disabled: state.isStopping || props.item.status !== StatusConstant.Runtime.RUNNING.value,
    loading: state.isStopping,
    callback: stopItem,
  },
]);
</script>

<template>
  <AppActionMenu
    v-model="model"
    :items="items"
    :persistent="props.persistent"
  />
</template>
