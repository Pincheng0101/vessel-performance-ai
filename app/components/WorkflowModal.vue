<script setup>
const props = defineProps({
  target: {
    type: [Object, String],
    default: null,
  },
  width: {
    type: Number,
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
  onOpen: {
    type: Function,
    default: () => {},
  },
});

const state = reactive({
  isEnabled: false,
});

const cancel = () => {
  props.onCancel();
  state.isEnabled = false;
};

const open = async () => {
  await props.onOpen();
  state.isEnabled = true;
};

const submit = async (v) => {
  try {
    await props.onSubmit(v);
    await delay(); // Add a delay to avoid slot dependency issues
    state.isEnabled = false;
  } catch {
    // Do nothing
  }
};
</script>

<template>
  <v-menu
    v-model="state.isEnabled"
    :close-on-content-click="false"
    :target="props.target"
    :offset="16"
    location="start"
    no-click-animation
    persistent
  >
    <template #activator="{ props: p }">
      <slot
        name="activator"
        v-bind="p"
        :toggle="state.isEnabled ? cancel : open"
      />
    </template>
    <v-sheet
      :width="props.width"
      aria-label="Workflow Modal"
    >
      <slot
        name="body"
        :on-cancel="cancel"
        :on-submit="submit"
      />
    </v-sheet>
  </v-menu>
</template>

<style lang="scss" scoped>
:deep() {
  .v-card-text {
    // 100dvh - dialog margin - card title - divider
    max-height: calc(100dvh - 48px - 72px - 1px);
    overflow-y: auto;
  }
}
</style>
