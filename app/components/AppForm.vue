<script setup>
const form = ref(null);

const props = defineProps({
  formTitle: {
    type: String,
    default: '',
  },
  formSubtitle: {
    type: String,
    default: '',
  },
  icon: {
    type: String,
    default: null,
  },
  iconPath: {
    type: String,
    default: null,
  },
  panels: {
    type: Array,
    default: null,
  },
  data: {
    type: Object,
    default: null,
  },
  submitButtonText: {
    type: String,
    default: null,
  },
  onSubmit: {
    type: Function,
    default: null,
  },
  onDiscard: {
    type: Function,
    default: null,
  },
  onValidate: {
    type: Function,
    default: null,
  },
  isValidating: {
    type: Boolean,
    default: false,
  },
  isValidateButtonDisabled: {
    type: Boolean,
    default: false,
  },
  validateButtonText: {
    type: String,
    default: null,
  },
  validateButtonLoadingText: {
    type: String,
    default: null,
  },
  showSubmitLoading: {
    type: Boolean,
    default: true,
  },
});

const isInsideDialog = inject('isInsideDialog', false);

const {
  enableConfirmation,
  disableConfirmation,
} = useLeaveConfirmation({ enabled: !isInsideDialog });

const state = reactive({
  isLoading: false,
});

const submit = async () => {
  if (!(await form.value.validate()).valid) return;
  disableConfirmation();
  if (props.showSubmitLoading) {
    state.isLoading = true;
  }
  try {
    await props.onSubmit();
    if (props.showSubmitLoading) {
      // Prevent double click
      await delay(500);
    }
  } finally {
    if (props.showSubmitLoading) {
      state.isLoading = false;
    }
  }
};

const discard = () => {
  disableConfirmation();
  props.onDiscard?.();
};

watch(() => props.data, () => enableConfirmation(), { deep: true });

defineExpose({
  getForm() {
    return form.value;
  },
});
</script>

<template>
  <v-form
    ref="form"
    @submit.prevent=""
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <template v-if="props.icon">
          <v-icon
            color="primary"
            size="small"
            class="mr-2"
          >
            {{ props.icon }}
          </v-icon>
        </template>
        <template v-else-if="props.iconPath">
          <AppImageIcon
            :src="props.iconPath"
            mask-color="primary"
          />
        </template>
        <span class="text-truncate">
          {{ strUtils.addSpacesAroundAscii(strUtils.toTitleCase(props.formTitle)) }}
        </span>
        <v-spacer />
        <div class="d-flex align-center ga-2">
          <template v-if="$slots.actions">
            <slot
              name="actions"
              :loading="state.isLoading"
              :on-submit="submit"
              :on-discard="discard"
            />
          </template>
          <AppButton
            v-if="props.onValidate"
            :aria-label="props.validateButtonText || $t('__actionValidate')"
            color="primary"
            variant="outlined"
            :text="props.validateButtonText || $t('__actionValidate')"
            :loading-text="props.validateButtonLoadingText || $t('__actionValidating')"
            :loading="props.isValidating"
            :disabled="props.isValidateButtonDisabled"
            @click="props.onValidate"
          />
          <AppDiscardButton
            v-if="props.onDiscard"
            :disabled="state.isLoading"
            :on-discard="discard"
          />
          <AppButton
            v-if="props.onSubmit"
            color="primary"
            :aria-label="props.submitButtonText || $t('__actionSave')"
            :text="props.submitButtonText || $t('__actionSave')"
            :width="100"
            :loading="state.isLoading"
            @click="submit"
          />
        </div>
      </v-card-title>
      <v-divider />
      <v-card-text>
        <div
          v-if="props.formSubtitle"
          class="text-body-2 text-medium-emphasis mb-4"
        >
          {{ props.formSubtitle }}
        </div>
        <slot name="body" />
      </v-card-text>
    </v-card>
  </v-form>
</template>

<style lang="scss" scoped>
.v-dialog {
  .v-card-text {
    // 100dvh - dialog margin - card title - divider
    max-height: calc(100dvh - 48px - 72px - 1px);
    overflow-y: auto;
  }
}
</style>
