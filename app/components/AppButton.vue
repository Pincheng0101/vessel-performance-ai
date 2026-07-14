<script setup>
const props = defineProps({
  text: {
    type: String,
    default: '',
  },
  color: {
    type: String,
    default: 'backgroundScale1',
  },
  loadingText: {
    type: String,
    default: '',
  },
  loadingSize: {
    type: Number,
    default: 20,
  },
  rounded: {
    type: [String, Boolean, Number],
    default: 'xl',
  },
  onClick: {
    type: Function,
    default: () => {},
  },
});
</script>

<template>
  <v-btn
    class="text-none"
    variant="elevated"
    :rounded="props.rounded"
    :color="props.color"
    @click="props.onClick"
  >
    {{ props.text }}
    <template #loader>
      <div class="d-flex align-center ga-1">
        <AppProgressCircular
          :size="props.loadingSize"
          :width="2"
        />
        <template v-if="props.loadingText">
          <span>
            {{ props.loadingText }}
          </span>
        </template>
      </div>
    </template>
    <template
      v-if="$slots.prepend"
      #prepend
    >
      <slot name="prepend" />
    </template>
  </v-btn>
</template>

<style lang="scss" scoped>
:deep(.v-btn__content),
:deep(.v-btn__prepend),
:deep(.v-btn__loader),
:deep(.v-btn__loader span) {
  color: inherit;
}
</style>
