<script setup>
const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  appendQuery: {
    type: Boolean,
    default: true,
  },
  showDivider: {
    type: Boolean,
    default: false,
  },
  dividerClass: {
    type: String,
    default: 'mb-4',
  },
  contentClass: {
    type: String,
    default: '',
  },
  height: {
    type: Number,
    default: 48,
  },
  grow: {
    type: Boolean,
    default: false,
  },
  preloadTabs: {
    type: Array,
    default: () => [],
  },
});

const route = useRoute();

const state = reactive({
  tab: null,
  loadedTabs: {},
});

props.preloadTabs.forEach((tab) => {
  if (!state.loadedTabs[tab]) {
    state.loadedTabs[tab] = true;
  }
});

const initializeState = () => {
  // Check if there are any items to display
  if (!props.items.length) return;
  // Check if the current route has a query parameter for the tab
  if (route.query.tab) {
    // Find the corresponding tab based on the query parameter
    const initialTab = props.items.find(item => item.value === route.query.tab);
    if (initialTab) {
      // Set the initial tab based on the query parameter
      state.tab = initialTab.value;
      state.loadedTabs[state.tab] = true;
      return;
    }
  }
  // Set the initial tab to the active tab or the first item
  const activeIndex = props.items.findIndex(item => item.active);
  state.tab = activeIndex === -1 ? props.items[0].value : activeIndex;
  state.loadedTabs[state.tab] = true;
};

initializeState();

const showTabContent = async (tab) => {
  state.loadedTabs[tab] = true;
  if (!props.appendQuery) return;
  // Wait for the tab to be loaded before navigating
  await delay(0);
  navigateTo(tab === props.items[0].value ? { query: null } : { query: { tab } });
};

watch(() => route.query.tab, (after) => {
  state.tab = after || props.items[0].value || 0;
  state.loadedTabs[state.tab] = true;
});
</script>

<template>
  <v-card
    variant="flat"
    class="w-100"
    :class="{
      'd-flex align-center justify-space-between': !props.grow,
    }"
  >
    <v-tabs
      v-model="state.tab"
      :height="props.height"
      :items="props.items.filter(item => !item.hidden)"
      bg-color="transparent"
      color="primary"
      slider-color="primary"
      fixed-tabs
    >
      <template #tab="{ item }">
        <v-tab
          v-if="!item.isHidden"
          :text="item.title"
          :value="item.value"
          :prepend-icon="item.icon"
          class="text-none"
          @click="() => {
            if (item.to) {
              navigateTo(item.to);
              return;
            }
            showTabContent(item.value);
          }"
        />
        <template v-if="props.items.length > 0">
          <div
            v-if="item.value !== props.items[props.items.length - 1].value"
            class="py-2"
          >
            <v-divider vertical />
          </div>
        </template>
      </template>
    </v-tabs>
    <slot name="append" />
  </v-card>
  <v-divider v-if="props.showDivider" />
  <div :class="props.dividerClass" />
  <template
    v-for="item in props.items"
    :key="item.value"
  >
    <div
      v-if="state.loadedTabs[item.value]"
      v-show="state.tab === item.value"
      :class="props.contentClass"
    >
      <slot :name="item.value" />
    </div>
  </template>
</template>

<style lang="scss" scoped>
.v-card {
  width: fit-content;
  background-color: transparent !important;
  border-radius: 8px  8px 0 0 !important;
}
.v-divider[aria-orientation="horizontal"] {
  color: rgba(var(--v-theme-inputBorder));
  opacity: 1
}
</style>
