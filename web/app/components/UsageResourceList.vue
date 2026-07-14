<script setup>
/**
 * @import { UsageResourceItem } from '~/models/ui/usage/UsageResource.d'
 */

/**
 * @type {{ defaultOpenPanels: string[], items: UsageResourceItem[] }}
 */
const props = defineProps({
  defaultOpenPanels: {
    type: Array,
    default: () => [],
  },
  items: {
    type: Array,
    default: () => [],
  },
});

const openedPanels = ref([...props.defaultOpenPanels]);
const {
  formatResourceCallCount,
  formatResourceInstanceCount,
} = useUsageFormatters();

watch(() => props.defaultOpenPanels, (value) => {
  openedPanels.value = [...value];
});

const hasDetails = item => item.detailRows?.length > 0;
const getDetailTitle = detail => detail.name || detail.type || detail.id;
const getDetailSubtitle = detail => (detail.name ? detail.type : '');
</script>

<template>
  <v-card
    class="usage-resource-list pa-4"
    variant="text"
  >
    <v-expansion-panels
      v-model="openedPanels"
      flat
      multiple
    >
      <v-expansion-panel
        v-for="item in props.items"
        :key="item.resourceType"
        class="resource-panel"
        bg-color="transparent"
        :readonly="!hasDetails(item)"
        :value="item.resourceType"
      >
        <v-expansion-panel-title class="px-3 py-4">
          <div class="w-100 d-flex align-center justify-space-between">
            <div class="d-flex align-center ga-2">
              <v-icon
                :icon="item.icon"
                :color="item.color"
                size="small"
              />
              <div>
                <div class="font-weight-medium">
                  {{ $t(item.i18nTitle) }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ formatResourceInstanceCount(item.instanceCount) }}
                </div>
              </div>
            </div>
            <div class="text-right font-weight-bold">
              {{ formatResourceCallCount(item.resourceType, item.totalCallCount) }}
            </div>
          </div>
        </v-expansion-panel-title>
        <v-expansion-panel-text v-if="hasDetails(item)">
          <div class="px-3 pt-2">
            <div
              v-for="detail in item.detailRows"
              :key="detail.id"
              class="d-flex align-start ga-3 py-2"
            >
              <AppImageIcon
                v-if="detail.iconPath"
                :src="detail.iconPath"
                :width="20"
                :height="20"
                class="mt-1 mr-0 flex-shrink-0"
                :show-shadow="false"
              />
              <div class="flex-grow-1">
                <div class="d-flex align-center ga-3">
                  <div class="resource-detail-row__text flex-grow-1">
                    <NuxtLink
                      v-if="detail.link"
                      :href="detail.link.href"
                      :target="detail.link.target"
                      class="resource-detail-row__link text-body-2 font-weight-medium text-decoration-none"
                    >
                      <span class="text-truncate">
                        {{ getDetailTitle(detail) }}
                      </span>
                      <v-icon
                        v-if="detail.link.target === '_blank'"
                        icon="mdi-open-in-new"
                        size="x-small"
                      />
                    </NuxtLink>
                    <div
                      v-else
                      class="text-body-2 text-truncate"
                    >
                      {{ getDetailTitle(detail) }}
                    </div>
                  </div>
                  <div class="resource-detail-row__value text-body-2 text-right">
                    {{ formatResourceCallCount(item.resourceType, detail.callCount) }}
                  </div>
                </div>
                <div class="d-flex align-center ga-3 mt-1">
                  <div
                    v-if="getDetailSubtitle(detail)"
                    class="resource-detail-row__subtitle text-caption text-medium-emphasis"
                  >
                    {{ getDetailSubtitle(detail) }}
                  </div>
                  <div class="resource-detail-row__stats d-flex align-center ga-3">
                    <div class="resource-detail-row__meter">
                      <v-progress-linear
                        :model-value="detail.share"
                        :color="detail.color"
                        bg-color="surface-variant"
                        height="6"
                        rounded
                      />
                    </div>
                    <div class="resource-detail-row__share text-caption text-medium-emphasis text-right">
                      {{ numUtils.formatPercentageLabel(detail.share) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>
  </v-card>
</template>

<style lang="scss" scoped>
.usage-resource-list {
  border-radius: 4px;
  border: 1px solid rgba(var(--v-theme-inputBorder));
  transition: border 0.25s;

  &:hover {
    border: 1px solid #000000;
  }
}
.resource-panel {
  border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));

  &:last-child {
    border-bottom: 0;
  }
}
.resource-detail-row__text {
  min-width: 0;
}
.resource-detail-row__link {
  align-items: center;
  color: rgb(var(--v-theme-primary));
  display: inline-flex;
  gap: 4px;
  max-width: 100%;
}
.resource-detail-row__subtitle {
  flex: 1 1 auto;
}
.resource-detail-row__stats {
  flex-shrink: 0;
  margin-left: auto;
}
.resource-detail-row__share {
  flex-basis: 36px;
  flex-shrink: 0;
}
.resource-detail-row__meter {
  flex: 0 0 100px;
  width: 100px;
}
.resource-detail-row__value {
  flex-basis: max-content;
  flex-shrink: 0;
  min-width: max-content;
  white-space: nowrap;
}
:deep() {
  .v-expansion-panel-title__overlay {
    opacity: 0;
  }
  .v-expansion-panel-text__wrapper {
    padding: 0 !important;
  }
  .v-expansion-panel-title__icon {
    margin-inline-start: 16px;
  }
}
@at-root .v-theme--dark .usage-resource-list:hover {
  border: 1px solid #ffffff;
}
</style>
