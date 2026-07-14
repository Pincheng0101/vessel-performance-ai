<script setup>
import Cropper from 'cropperjs';

const props = defineProps({
  fallbackIcon: {
    type: String,
    default: 'mdi-image',
  },
});

const OUTPUT_SIZE = 256;
const MAX_OUTPUT_BYTES = 60000;
const AVATAR_EXPORT_QUALITIES = [0.85, 0.75, 0.65, 0.55];
const CROPPER_VIEWPORT_SIZE = 280;
const CROPPER_TEMPLATE = `
  <cropper-canvas>
    <cropper-image rotatable scalable skewable translatable></cropper-image>
    <cropper-shade hidden></cropper-shade>
    <cropper-selection initial-coverage="1" aspect-ratio="1">
      <cropper-grid role="grid" covered></cropper-grid>
    </cropper-selection>
  </cropper-canvas>
`;

const encoded = defineModel('encoded', {
  type: String,
  default: null,
});

const fileInputRef = ref(null);
const cropperImageRef = ref(null);
const cropperContainerRef = ref(null);
const cropper = shallowRef(null);

const state = reactive({
  cropperDialog: false,
  pendingFile: null,
  sourceUrl: null,
  zoom: 0,
  appliedZoom: 0,
  dragging: false,
  lastPointerX: 0,
  lastPointerY: 0,
});

const hasImage = computed(() => !!encoded.value);

const getDataUrlBytes = (dataUrl) => {
  const base64 = dataUrl.split(',')[1] ?? '';
  const padding = (base64.match(/=*$/)?.[0].length) ?? 0;
  // Base64 uses 4 chars to encode 3 bytes, minus any trailing padding
  return Math.floor(base64.length * 3 / 4) - padding;
};

const exportCompressedAvatar = (canvas) => {
  const formats = [
    { type: 'image/webp', qualities: AVATAR_EXPORT_QUALITIES },
    { type: 'image/jpeg', qualities: AVATAR_EXPORT_QUALITIES },
  ];

  let fallbackDataUrl = canvas.toDataURL('image/png');

  for (const format of formats) {
    for (const quality of format.qualities) {
      const dataUrl = canvas.toDataURL(format.type, quality);
      fallbackDataUrl = dataUrl;
      if (getDataUrlBytes(dataUrl) <= MAX_OUTPUT_BYTES) {
        return dataUrl;
      }
    }
  }

  return fallbackDataUrl;
};

const cleanupSourceUrl = () => {
  if (state.sourceUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(state.sourceUrl);
  }
  state.sourceUrl = null;
};

const createCropper = async () => {
  await nextTick();
  destroyCropper();
  if (!cropperImageRef.value || !cropperContainerRef.value) return;
  cropper.value = new Cropper(cropperImageRef.value, {
    container: cropperContainerRef.value,
    template: CROPPER_TEMPLATE,
  });
  await nextTick();
  const cropperImage = cropper.value.getCropperImage();
  const selection = cropper.value.getCropperSelection();
  await cropperImage?.$ready();
  cropperImage?.$center('contain');
  selection?.$center?.();
  selection?.$change?.(0, 0, CROPPER_VIEWPORT_SIZE, CROPPER_VIEWPORT_SIZE, 1);
  syncZoomFromCropper();
};

const destroyCropper = () => {
  if (cropper.value) {
    cropper.value.destroy();
    cropper.value = null;
  }
};

const syncZoomFromCropper = () => {
  const cropperImage = cropper.value?.getCropperImage();
  if (!cropperImage) return;
  const transform = cropperImage.$getTransform();
  state.zoom = transform?.[0] ? Math.max(0, transform[0] - 1) : 0;
  state.appliedZoom = state.zoom;
};

const stopDragging = () => {
  state.dragging = false;
};

const submit = async () => {
  const selection = cropper.value?.getCropperSelection();
  if (!selection) return;

  const sourceCanvas = await selection.$toCanvas({
    width: OUTPUT_SIZE,
    height: OUTPUT_SIZE,
  });

  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const context = canvas.getContext('2d');
  if (!context) return;

  context.beginPath();
  context.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
  context.closePath();
  context.clip();
  context.drawImage(sourceCanvas, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  encoded.value = exportCompressedAvatar(canvas);
  cancel();
};

const cancel = () => {
  state.cropperDialog = false;
  state.pendingFile = null;
  state.zoom = 0;
  state.appliedZoom = 0;
  state.dragging = false;
  destroyCropper();
  cleanupSourceUrl();
};

const removeImage = () => encoded.value = null;

const openCropperDialog = async (file) => {
  if (!(file instanceof File) || !file.type.startsWith('image/')) return;
  cleanupSourceUrl();
  state.pendingFile = file;
  state.sourceUrl = URL.createObjectURL(file);
  state.cropperDialog = true;
  await createCropper();
};

const handleZoomUpdate = (value) => {
  const cropperImage = cropper.value?.getCropperImage();
  if (!cropperImage) return;

  const delta = value - state.appliedZoom;
  if (delta === 0) return;

  cropperImage.$zoom(delta, CROPPER_VIEWPORT_SIZE / 2, CROPPER_VIEWPORT_SIZE / 2);
  state.zoom = value;
  state.appliedZoom = value;
};

const handlePointerDown = (event) => {
  state.dragging = true;
  state.lastPointerX = event.clientX;
  state.lastPointerY = event.clientY;
};

const handlePointerMove = (event) => {
  if (!state.dragging) return;

  const cropperImage = cropper.value?.getCropperImage();
  if (!cropperImage) return;

  const deltaX = event.clientX - state.lastPointerX;
  const deltaY = event.clientY - state.lastPointerY;

  cropperImage.$move(deltaX, deltaY);
  state.lastPointerX = event.clientX;
  state.lastPointerY = event.clientY;
};

onBeforeUnmount(() => {
  destroyCropper();
  cleanupSourceUrl();
});
</script>

<template>
  <div class="d-flex flex-column ga-3">
    <AppFileInput
      ref="fileInputRef"
      v-model="state.pendingFile"
      class="d-none"
      :supported-extensions="['image/*']"
      @update:model-value="(file) => openCropperDialog(file)"
    />
    <div class="d-flex flex-column flex-sm-row ga-4 align-center">
      <v-avatar
        size="64"
        color="backgroundScale1"
      >
        <template v-if="hasImage">
          <v-img
            :src="encoded"
            cover
          />
        </template>
        <template v-else>
          <v-icon
            :icon="props.fallbackIcon"
            color="primary"
            size="x-large"
          />
        </template>
      </v-avatar>
      <div class="d-flex flex-wrap ga-2">
        <AppButton
          :text="$t('__actionUpload')"
          prepend-icon="mdi-upload"
          variant="outlined"
          color="primary"
          @click="() => fileInputRef.click()"
        />
        <AppButton
          v-if="hasImage"
          :text="$t('__actionRemove')"
          prepend-icon="mdi-trash-can"
          variant="text"
          color="error"
          @click="removeImage"
        />
      </div>
    </div>
    <AppDialog
      v-model="state.cropperDialog"
      :aria-label="$t('__titleAgentAvatarCropper')"
      :persistent="false"
      :on-cancel="cancel"
      :on-submit="submit"
    >
      <template #body="{ onSubmit, onCancel }">
        <v-card>
          <v-card-title>{{ $t('__titleAgentAvatarCropper') }}</v-card-title>
          <v-divider />
          <v-card-text class="pa-6">
            <v-sheet
              class="d-flex flex-column align-center ga-6"
              color="transparent"
            >
              <div
                ref="cropperContainerRef"
                class="cropper-container-wrapper position-relative overflow-hidden bg-backgroundScale1"
                :style="{
                  width: `${CROPPER_VIEWPORT_SIZE}px`,
                  height: `${CROPPER_VIEWPORT_SIZE}px`,
                }"
              >
                <img
                  v-if="state.sourceUrl"
                  ref="cropperImageRef"
                  :src="state.sourceUrl"
                  alt="Avatar crop preview"
                  class="source-image position-absolute opacity-0"
                >
                <div
                  class="drag-layer position-absolute"
                  @pointerdown.prevent="handlePointerDown"
                  @pointermove.prevent="handlePointerMove"
                  @pointerup="stopDragging"
                  @pointerleave="stopDragging"
                />
              </div>
              <div class="w-100">
                <AppInputGroup
                  v-slot="{ id }"
                  :label="$t('__fieldZoom')"
                >
                  <AppSlider
                    :id="id"
                    v-model="state.zoom"
                    :min="0"
                    :max="2"
                    :step="0.01"
                    :show-input="false"
                    @update:model-value="handleZoomUpdate"
                  />
                </AppInputGroup>
              </div>
            </v-sheet>
          </v-card-text>
          <v-divider />
          <v-card-actions class="px-6 py-4">
            <v-spacer />
            <AppButton
              :text="$t('__actionCancel')"
              :width="100"
              @click="onCancel"
            />
            <AppButton
              :text="$t('__actionSave')"
              color="primary"
              :width="100"
              @click="onSubmit"
            />
          </v-card-actions>
        </v-card>
      </template>
    </AppDialog>
  </div>
</template>

<style lang="scss" scoped>
.cropper-container-wrapper {
  border-radius: 50%;
  background: rgba(var(--v-theme-backgroundScale1));
  .source-image {
    width: 1px;
    height: 1px;
    pointer-events: none;
  }
  .drag-layer {
    inset: 0;
    z-index: 2;
    cursor: grab;
    touch-action: none;
    &:active {
      cursor: grabbing;
    }
  }
}

:deep(cropper-canvas) {
  height: 100%;
  width: 100%;
}

:deep(cropper-selection) {
  border-radius: 50%;
  overflow: hidden;
  pointer-events: none;
}

:deep(cropper-grid) {
  display: none;
}
</style>
