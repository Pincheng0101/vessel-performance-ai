<script setup>
provide('isInsideDialog', true);

const props = defineProps({
  ariaLabel: {
    type: String,
    default: 'Dialog',
  },
  persistent: {
    type: Boolean,
    default: true,
  },
  preventCancel: {
    type: Boolean,
    default: false,
  },
  width: {
    type: [Number, String],
    default: 600,
  },
  color: {
    type: String,
    default: null,
  },
  onSubmit: {
    type: Function,
    default: () => {},
  },
  onCancel: {
    type: Function,
    default: () => {},
  },
});

const state = reactive({
  resolve: null,
  isLoading: false,
});

const model = defineModel({
  type: Boolean,
  default: false,
});

const open = () => {
  model.value = true;
};

const close = () => {
  model.value = false;
};

const submit = async (v) => {
  state.isLoading = true;
  try {
    await props.onSubmit(v);
  } finally {
    state.isLoading = false;
  }
  if (state.resolve) {
    state.resolve(v);
  }
  close();
};

const cancel = async () => {
  if (props.preventCancel) return;
  if (state.isLoading) return;
  await props.onCancel();
  close();
};

const onDialogKeydown = (event) => {
  if (event.key !== 'Escape') return;
  if (props.preventCancel) return;

  event.preventDefault();
  event.stopPropagation();
  cancel();
};

/**
 * Opens the dialog and returns a Promise resolved on dialog submission.
 */
const confirm = () => {
  open();
  return new Promise((resolve) => {
    state.resolve = resolve;
  });
};

defineExpose({
  open,
  close,
  confirm,
});
</script>

<template>
  <div :class="[$slots.activator ? 'd-flex align-center' : 'd-none']">
    <slot
      :on-open="open"
      name="activator"
    />
    <v-dialog
      v-model="model"
      :aria-label="props.ariaLabel"
      :persistent="props.persistent || props.preventCancel"
      :width="props.width"
      @keydown="onDialogKeydown"
      @update:model-value="cancel"
    >
      <v-sheet :color="props.color">
        <slot
          :on-submit="submit"
          :on-cancel="cancel"
          :loading="state.isLoading"
          name="body"
        />
      </v-sheet>
    </v-dialog>
  </div>
</template>
