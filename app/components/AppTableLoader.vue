<script setup>
const props = defineProps({
  rows: {
    type: Number,
    default: 10,
  },
});
</script>
<template>
  <AppSkeletonLoader
    :type="`heading, divider, table-row-divider@${props.rows}`"
    class="pb-4"
  />
</template>
