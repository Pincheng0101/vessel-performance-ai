<script setup>
const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
});
</script>

<template>
  <v-treeview :items="props.items">
    <template #title="{ item }">
      <slot
        name="title"
        :item="item"
      />
    </template>
  </v-treeview>
</template>
