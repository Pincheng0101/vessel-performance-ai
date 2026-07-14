<script setup>
const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    default: 32,
  },
});
</script>

<template>
  <v-sheet
    :height="props.size"
    :width="props.size"
    color="transparent"
    class="d-flex align-center justify-center"
  >
    <v-avatar
      :color="colorUtils.textToColorCode(props.name)"
      :size="props.size"
      class="avatar cursor-pointer"
    >
      <span
        :class="`text-${colorUtils.computeTextColor(colorUtils.textToColorCode(props.name))}`"
        :style="{ fontSize: `${props.size * 0.5}px`, lineHeight: 1 }"
      >
        {{ props.name[0].toUpperCase() }}
      </span>
    </v-avatar>
  </v-sheet>
</template>

<style lang="scss" scoped>
.avatar {
  span {
    letter-spacing: 0px !important;
  }
}
</style>
