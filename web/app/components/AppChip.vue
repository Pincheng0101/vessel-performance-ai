<script setup>
const props = defineProps({
  text: {
    type: String,
    default: '',
  },
  color: {
    type: String,
    default: 'primary',
  },
  icon: {
    type: String,
    default: '',
  },
  iconPath: {
    type: String,
    default: '',
  },
  iconPathMaskColor: {
    type: String,
    default: '',
  },
  iconSize: {
    type: [Number, String],
    default: 16,
  },
  textColor: {
    type: String,
    default: '',
  },
});
</script>

<template>
  <v-chip
    :color="props.color"
    density="compact"
  >
    <AppImageIcon
      v-if="props.iconPath"
      :src="props.iconPath"
      :width="props.iconSize"
      :height="props.iconSize"
      :mask-color="props.iconPathMaskColor"
      class="mr-1"
    />
    <v-icon
      v-else-if="props.icon"
      :icon="props.icon"
      class="mr-1"
      :size="props.iconSize"
    />
    <div
      class="text-truncate"
      :style="props.textColor ? { color: props.textColor } : undefined"
    >
      {{ props.text }}
    </div>
  </v-chip>
</template>
