<script setup>
const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
  vessel: {
    type: Object,
    default: () => ({}),
  },
});

const model = defineModel({
  type: [String, Number],
  default: null,
});

const title = computed(() => props.vessel.ship_id || model.value || 'Select ship');
const isPrediction = computed(() => props.vessel.isPrediction ?? /^S2[1-3]$/.test(model.value || ''));
const ariaLabel = computed(() => `切換船舶，目前 ${title.value}`);
const menuItems = computed(() => props.items.map(item => ({
  ...item,
  name: item.title,
  tag: item.isPrediction ? '預測船' : '訓練船',
})));
</script>

<template>
  <div class="vessel-selector">
    <v-menu
      location="bottom start"
      :offset="6"
    >
      <template #activator="{ props: activatorProps, isActive }">
        <button
          v-bind="activatorProps"
          type="button"
          class="vessel-title-trigger"
          :aria-label="ariaLabel"
        >
          <span class="vessel-title-copy">
            <span class="vessel-title-name">{{ title }}</span>
            <span class="vessel-title-meta">
              {{ isPrediction ? '預測船' : '訓練船' }}
            </span>
          </span>
          <v-icon
            :icon="isActive ? 'mdi-chevron-up' : 'mdi-chevron-down'"
            size="20"
            class="vessel-title-icon"
          />
        </button>
      </template>

      <v-card
        :elevation="1"
        rounded="lg"
        min-width="280"
      >
        <v-list
          density="compact"
          class="py-1"
        >
          <v-list-item
            v-for="item in menuItems"
            :key="item.value"
            :active="model === item.value"
            @click="model = item.value"
          >
            <template #title>
              <span class="vessel-menu-title">
                <span class="text-body-2 font-weight-medium">{{ item.name }}</span>
                <span class="text-caption text-medium-emphasis">{{ item.tag }}</span>
              </span>
            </template>
            <template
              v-if="model === item.value"
              #append
            >
              <v-icon
                icon="mdi-check"
                size="18"
                color="primary"
              />
            </template>
          </v-list-item>
        </v-list>
      </v-card>
    </v-menu>
  </div>
</template>

<style lang="scss" scoped>
.vessel-selector {
  display: inline-flex;
  max-width: none;
}

.vessel-title-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: none;
  padding: 4px 8px;
  margin: -4px -8px;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
  white-space: nowrap;
  transition: background-color 0.16s ease, color 0.16s ease;

  &:hover,
  &:focus-visible {
    background-color: rgba(var(--v-theme-on-surface), 0.06);
  }

  &:focus-visible {
    outline: 2px solid rgb(var(--v-theme-primary));
    outline-offset: 2px;
  }
}

.vessel-title-copy {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  white-space: nowrap;
}

.vessel-title-name {
  overflow: visible;
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: clip;
  white-space: nowrap;
}

.vessel-title-meta {
  font-size: 0.75rem;
  line-height: 1.2;
  white-space: nowrap;
  color: rgba(var(--v-theme-on-surface), 0.62);
}

.vessel-title-icon {
  flex: 0 0 auto;
  color: rgba(var(--v-theme-on-surface), 0.62);
}

.vessel-menu-title {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  white-space: nowrap;
}
</style>
