<script setup>
const props = defineProps({
  version: {
    type: String,
    required: true,
    validator: value => ['v1', 'v2'].includes(value),
  },
});

const isV2 = computed(() => props.version === 'v2');
const label = computed(() => (isV2.value ? 'v2 · 真實數據' : 'v1 · 示範數據'));
const tooltipText = computed(() => (isV2.value
  ? '本圖表數據來自 v2 API（真實船舶量測數據）。'
  : '本圖表數據來自 v1 API（合成示範數據），v2 尚無對應欄位可產生此圖表。'));
</script>

<template>
  <span class="d-inline-block">
    <v-chip
      :color="isV2 ? 'success' : 'warning'"
      density="compact"
      size="small"
      variant="tonal"
    >
      {{ label }}
    </v-chip>
    <AppTooltip
      :text="tooltipText"
      activator="parent"
      location="top"
    />
  </span>
</template>
