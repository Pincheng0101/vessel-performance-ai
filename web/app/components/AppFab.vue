<script setup>
const props = defineProps({
  onClick: {
    type: Function,
    default: null,
  },
});

const model = defineModel({
  type: Boolean,
  default: false,
});

const handleClick = () => {
  if (props.onClick) {
    props.onClick();
    return;
  }
  model.value = !model.value;
};
</script>

<template>
  <v-fab
    color="primary"
    :size="40"
    @click="handleClick"
  />
</template>
