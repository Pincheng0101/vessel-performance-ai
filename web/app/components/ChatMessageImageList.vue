<script setup>
const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  height: {
    type: [String, Number],
    default: 180,
  },
});

const state = reactive({
  isPreviewOpen: false,
  selectedItem: null,
});

const resolvedItems = computed(() => {
  return props.items
    .map((item, index) => {
      const src = item?.url || (typeof item?.data === 'string' ? item.data : null);
      if (!src) return null;
      return {
        key: `${item.contentBlockName || item.contentBlockType || 'image'}-${index}`,
        src,
      };
    })
    .filter(Boolean);
});

const openPreview = (item) => {
  state.selectedItem = item;
  state.isPreviewOpen = true;
};

const closePreview = () => {
  state.isPreviewOpen = false;
  state.selectedItem = null;
};
</script>

<template>
  <div class="d-flex flex-wrap ga-3">
    <v-sheet
      v-for="item in resolvedItems"
      :key="item.key"
      rounded="xl"
      color="background"
      class="border overflow-hidden cursor-pointer"
      max-width="100%"
      @click="openPreview(item)"
      @keydown.enter.prevent="openPreview(item)"
      @keydown.space.prevent="openPreview(item)"
    >
      <v-img
        :src="item.src"
        :height="props.height"
        :width="props.height"
        class="bg-backgroundScale2"
        cover
      />
    </v-sheet>
    <AppImagePreviewDialog
      v-model="state.isPreviewOpen"
      :src="state.selectedItem?.src"
      @update:model-value="(value) => {
        if (!value) closePreview();
      }"
    />
  </div>
</template>

<style lang="scss" scoped>
.border {
  border: 1px solid rgba(var(--v-theme-backgroundScale4), 0.4);
}
</style>
