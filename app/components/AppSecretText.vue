<script setup>
const props = defineProps({
  value: {
    type: String,
    default: '',
  },
  enableToggle: {
    type: Boolean,
    default: false,
  },
});

const model = defineModel({
  type: Boolean,
  default: true,
});
</script>

<template>
  <div class="d-flex ga-1">
    <div class="d-flex align-center">
      <template v-if="model">
        {{ '•'.repeat(8) }}
      </template>
      <template v-else>
        {{ props.value }}
      </template>
    </div>
    <AppIconButton
      v-if="props.enableToggle"
      :icon="model ? 'mdi-eye-outline' : 'mdi-eye-off-outline'"
      icon-size="default"
      variant="text"
      :on-click="() => { model = !model }"
    />
  </div>
</template>
