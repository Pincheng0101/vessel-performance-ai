<script setup>
const props = defineProps({
  message: {
    type: String,
    default: '',
  },
  detail: {
    type: String,
    default: '',
  },
  actionLabel: {
    type: String,
    default: '',
  },
  variant: {
    type: String,
    default: 'info',
    validator: v => ['info', 'error'].includes(v),
  },
  onAction: {
    type: Function,
    default: () => {},
  },
});

const state = reactive({
  isSubmitted: false,
});

const isError = computed(() => props.variant === 'error');

const handleAction = () => {
  if (state.isSubmitted) return;
  state.isSubmitted = true;
  props.onAction();
};
</script>

<template>
  <v-card class="pa-5 mb-6">
    <div class="d-flex flex-column ga-4">
      <div class="d-flex align-center ga-3">
        <v-icon
          :icon="isError ? 'mdi-alert-circle-outline' : 'mdi-information-outline'"
          :color="isError ? 'failed' : 'primary'"
          size="large"
        />
        <p :class="{ 'text-failed': isError }">
          {{ props.message }}
        </p>
      </div>
      <v-sheet
        v-if="props.detail"
        rounded
        border
        color="background"
        class="pa-3 text-caption text-medium-emphasis error-detail"
      >
        {{ props.detail }}
      </v-sheet>
      <template v-if="!state.isSubmitted">
        <div class="d-flex justify-end">
          <AppButton
            :text="props.actionLabel"
            color="primary"
            variant="flat"
            @click="handleAction"
          />
        </div>
      </template>
    </div>
  </v-card>
</template>

<style lang="scss" scoped>
.error-detail {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
