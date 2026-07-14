<script setup>
const model = defineModel({
  type: Number,
  default: null,
});
</script>

<template>
  <v-expansion-panels
    v-model="model"
    flat
  >
    <slot />
  </v-expansion-panels>
</template>
