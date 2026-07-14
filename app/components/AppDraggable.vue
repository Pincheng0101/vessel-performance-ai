<script setup>
const props = defineProps({
  enabled: {
    type: Boolean,
    default: true,
  },
  tag: {
    type: String,
    default: 'div',
  },
});

const model = defineModel({
  type: Array,
  default: [],
});

const dragging = defineModel('dragging', {
  type: Boolean,
  default: false,
});

// Defer vue-draggable-plus off the entry chunk: load it only when a draggable list is
// actually enabled. defineAsyncComponent lets Vue mount the slot straight into the resolved
// component, instead of mounting it under a plain tag first and swapping (which unmounts the
// live slot subtree and crashes).
const VueDraggable = defineAsyncComponent(() =>
  import('vue-draggable-plus').then(module => module.VueDraggable),
);
</script>

<template>
  <VueDraggable
    v-if="props.enabled"
    v-model="model"
    :animation="250"
    :tag="props.tag"
    handle=".handle"
    @start="() => dragging = true"
    @end="() => dragging = false"
  >
    <slot />
  </VueDraggable>
  <component
    :is="props.tag"
    v-else
  >
    <slot />
  </component>
</template>
