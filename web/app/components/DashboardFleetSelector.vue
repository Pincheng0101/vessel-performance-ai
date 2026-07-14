<script setup>
// Same clickable-title + chevron + menu pattern as DashboardVesselSelector, but for picking a
// fleet grouping rather than a vessel — no IMO-style meta line, so kept as its own small
// component instead of overloading the vessel selector's vessel-specific labels/fallbacks.
const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },
});

const model = defineModel({
  type: String,
  default: null,
});

const selectedTitle = computed(() => props.items.find(item => item.value === model.value)?.title ?? model.value ?? '');
const ariaLabel = computed(() => `切換船隊分組，目前 ${selectedTitle.value}`);
</script>

<template>
  <div class="fleet-selector">
    <v-menu
      location="bottom start"
      :offset="6"
    >
      <template #activator="{ props: activatorProps, isActive }">
        <button
          v-bind="activatorProps"
          type="button"
          class="fleet-title-trigger"
          :aria-label="ariaLabel"
        >
          <span class="fleet-title-name">{{ selectedTitle }}</span>
          <v-icon
            :icon="isActive ? 'mdi-chevron-up' : 'mdi-chevron-down'"
            size="20"
            class="fleet-title-icon"
          />
        </button>
      </template>

      <v-card
        :elevation="1"
        rounded="lg"
        min-width="200"
      >
        <v-list
          density="compact"
          class="py-1"
        >
          <v-list-item
            v-for="item in items"
            :key="item.value"
            :active="model === item.value"
            @click="model = item.value"
          >
            <template #title>
              <span class="text-body-2 font-weight-medium">{{ item.title }}</span>
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
.fleet-selector {
  display: inline-flex;
  max-width: none;
}

.fleet-title-trigger {
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

.fleet-title-name {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.35;
  white-space: nowrap;
}

.fleet-title-icon {
  flex: 0 0 auto;
  color: rgba(var(--v-theme-on-surface), 0.62);
}
</style>
