<script setup>
const props = defineProps({
  icon: {
    type: String,
    required: true,
  },
  iconColor: {
    type: String,
    default: '',
  },
  size: {
    type: [Number, String],
    default: 'x-small',
  },
  iconSize: {
    type: [Number, String],
    default: 'x-large',
  },
  onClick: {
    type: Function,
    default: () => {},
  },
  tooltip: {
    type: String,
    default: '',
  },
});
</script>

<template>
  <v-btn
    :size="props.size"
    icon
    @click.stop.prevent="props.onClick"
  >
    <v-icon
      :color="props.iconColor"
      :size="props.iconSize"
    >
      {{ props.icon }}
    </v-icon>
    <slot name="menu" />
    <template
      v-if="$slots.loader"
      #loader
    >
      <slot name="loader" />
    </template>
    <AppTooltip
      v-if="props.tooltip"
      :text="props.tooltip"
      activator="parent"
    />
  </v-btn>
</template>

<style lang="scss" scoped>
.v-btn--variant-text:hover {
  background-color: rgba(var(--v-theme-primaryLight), 0.25);
}
</style>
