<script setup>
const state = reactive({
  isFocused: false,
});

const inputRef = ref(null);

onClickOutside(inputRef, () => {
  state.isFocused = false;
});
</script>

<template>
  <v-input
    ref="inputRef"
    :class="{
      focused: state.isFocused,
    }"
    @click="state.isFocused = true"
    @dragstart="state.isFocused = true"
  >
    <slot />
  </v-input>
</template>
