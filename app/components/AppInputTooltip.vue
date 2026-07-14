<script setup>
const props = defineProps({
  text: {
    type: String,
    required: true,
  },
});
</script>

<template>
  <div class="d-flex align-center">
    <v-icon
      size="small"
      icon="mdi-information-outline"
      class="cursor-pointer text-medium-emphasis"
    />
    <AppTooltip
      :text="props.text"
      activator="parent"
      location="top"
    />
  </div>
</template>
