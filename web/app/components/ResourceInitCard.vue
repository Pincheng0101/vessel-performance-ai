<script setup>
const props = defineProps({
  actionLabel: {
    type: String,
    default: null,
  },
  resourceLabel: {
    type: String,
    default: null,
  },
  title: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: '',
  },
  iconPath: {
    type: String,
    default: '',
  },
  instruction: {
    type: String,
    default: '',
  },
  showActions: {
    type: Boolean,
    default: true,
  },
  onClick: {
    type: Function,
    default: () => {},
  },
});

const state = reactive({
  isLoading: false,
});

const handleClick = async (...args) => {
  state.isLoading = true;
  await props.onClick(...args);
  state.isLoading = false;
};
</script>

<template>
  <AppInfoCard
    :icon="props.icon"
    :icon-path="props.iconPath"
    :title="props.title || $t('__titleModifyItem', { action: props.actionLabel || $t('__actionCreate'), item: props.resourceLabel })"
    :instruction="props.instruction"
  >
    <template
      v-if="props.showActions"
      #actions
    >
      <template v-if="$slots.actions">
        <slot
          name="actions"
          :on-click="props.onClick"
        />
      </template>
      <template v-else>
        <AppButton
          :width="160"
          :text="props.actionLabel || $t('__actionCreate')"
          :loading="state.isLoading"
          size="large"
          color="primary"
          prepend-icon="mdi-plus"
          @click="handleClick"
        />
      </template>
    </template>
  </AppInfoCard>
</template>
