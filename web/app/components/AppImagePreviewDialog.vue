<script setup>
const props = defineProps({
  src: {
    type: String,
    default: null,
  },
  maxHeight: {
    type: [String, Number],
    default: '80dvh',
  },
});

const model = defineModel({
  type: Boolean,
  default: false,
});

const previewSrc = ref(null);

watch(() => props.src, (src) => {
  if (src) {
    previewSrc.value = src;
  }
}, {
  immediate: true,
});

const close = () => {
  model.value = false;
};
</script>

<template>
  <AppDialog
    v-model="model"
    color="backgroundScale2"
    :persistent="false"
    :width="1000"
  >
    <template #body>
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          {{ $t('__fieldPreviewImage') }}
          <AppIconButton
            icon="mdi-close"
            :tooltip="$t('__actionClose')"
            variant="text"
            @click="close"
          />
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-5">
          <v-img
            v-if="previewSrc"
            :src="previewSrc"
            :max-height="props.maxHeight"
            contain
          />
        </v-card-text>
      </v-card>
    </template>
  </AppDialog>
</template>
