<script setup>
const props = defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
  text: {
    type: String,
    default: null,
  },
  enablePreview: {
    type: Boolean,
    default: false,
  },
  previewUrl: {
    type: String,
    default: null,
  },
  dataTypes: {
    type: Array,
    default: null,
  },
  onClick: {
    type: Function,
    default: null,
  },
  onDrop: {
    type: Function,
    default: () => {},
  },
});

const dropZoneRef = ref(null);

const handleDrop = async (_, event) => {
  const files = await fileUtils.extractFilesFromDataTransferItems(event.dataTransfer.items);
  props.onDrop(files);
};

const { isOverDropZone } = useDropZone(dropZoneRef, {
  onDrop: handleDrop,
  dataTypes: props.dataTypes,
});
</script>

<template>
  <AppInput :disabled="props.disabled">
    <v-sheet
      ref="dropZoneRef"
      color="transparent"
      class="bordered d-flex justify-center align-center"
      :class="{ 'over': isOverDropZone, 'opacity-50': props.disabled, 'cursor-pointer': !props.disabled }"
      height="180"
      width="100%"
      @click="props.onClick"
    >
      <v-img
        v-if="props.enablePreview && props.previewUrl"
        :src="props.previewUrl"
        contain
      />
      <div
        v-else
        class="d-flex flex-column align-center justify-center ga-2"
      >
        <v-icon
          icon="mdi-cloud-upload"
          size="x-large"
          color="primary"
        />
        {{ props.text || $t('__instructionDragFileHere', { type: $t('__titleFileAndFolder').toLowerCase() }) }}
      </div>
    </v-sheet>
  </AppInput>
</template>

<style lang="scss" scoped>
.bordered {
  border-radius: 4px;
  border: 1px dashed rgb(var(--v-theme-inputBorder));
  transition: border 0.25s;
  .focused & {
    border-color: rgb(var(--v-theme-primary));
    transition: none;
  }
  &:hover {
    border-color: #000000;
  }
  @at-root .v-theme--dark & {
    &:hover {
      border-color: #ffffff;
    }
  }
  &.over {
    border-color: rgb(var(--v-theme-primary));
    background-color: color-mix(in srgb, rgb(var(--v-theme-primary)) 10%, transparent) !important;
  }
}
</style>
