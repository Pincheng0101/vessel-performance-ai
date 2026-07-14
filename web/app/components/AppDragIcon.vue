<script setup>
const props = defineProps({
  dragging: {
    type: Boolean,
    default: false,
  },
  dragClass: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  disabledTooltip: {
    type: String,
    default: '',
  },
});

const iconClass = computed(() => {
  if (props.disabled) return 'cursor-not-allowed';
  return props.dragging ? 'cursor-grabbing' : 'cursor-grab';
});
</script>

<template>
  <div :class="{ [props.dragClass]: !props.disabled }">
    <v-icon
      icon="mdi-drag-vertical"
      color="backgroundScale4"
      :size="20"
      :class="iconClass"
    />
    <template v-if="props.disabled && props.disabledTooltip">
      <AppTooltip
        :text="props.disabledTooltip"
        activator="parent"
        location="top"
        width="160"
      />
    </template>
  </div>
</template>
