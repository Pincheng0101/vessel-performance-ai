<script setup>
import { UsageConstant } from '~/constants';

const props = defineProps({
  icon: {
    type: String,
    default: '',
  },
  i18nTitle: {
    type: String,
    required: true,
  },
  i18nTooltip: {
    type: String,
    default: '',
  },
  i18nLinkTitle: {
    type: String,
    default: '',
  },
  details: {
    type: Array,
    default: () => [],
  },
  secondaryI18nTitle: {
    type: String,
    default: '',
  },
  secondaryValue: {
    type: String,
    default: '',
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
  to: {
    type: [String, Object],
    default: null,
  },
  value: {
    type: String,
    default: '',
  },
  height: {
    type: Number,
    default: 128,
  },
});

const { t } = useI18n();
const { getUsageDatasetTypeColor } = useUsageChartColors();

const hasDetails = computed(() => !props.isLoading && props.details.length > 0);
const hasLink = computed(() => Boolean(!props.isLoading && props.to && props.i18nLinkTitle));
const hasSecondaryMetric = computed(() => Boolean(!props.isLoading && props.secondaryI18nTitle && props.secondaryValue));
const breakdownDetails = computed(() => props.details.find(
  detail => detail?.type === UsageConstant.KpiCardDetailsType.BREAKDOWN.value,
) ?? null);
const hasBreakdownDetails = computed(() => Boolean(breakdownDetails.value));
const breakdownValueColumns = computed(() => breakdownDetails.value?.columns?.filter(column => !column.isTotal) ?? []);
const breakdownTotalColumn = computed(() => breakdownDetails.value?.columns?.find(column => column.isTotal) ?? null);

const resolveTitle = item => item?.title || (item?.i18nTitle ? t(item.i18nTitle) : '');

const getDetailRowColor = (row, index) => {
  if (row.color) {
    return row.color;
  }

  return getUsageDatasetTypeColor(row.datasetType, index);
};
</script>

<template>
  <v-card
    class="wrapper"
    :class="{ loading: props.isLoading }"
  >
    <v-card-text>
      <div class="d-flex align-center justify-space-between ga-3 mb-2">
        <div class="d-flex align-center ga-2">
          <v-icon
            :icon="props.icon"
            size="20"
          />
          <div class="text-body-2 text-medium-emphasis">
            {{ $t(props.i18nTitle) }}
          </div>
          <AppInputTooltip
            v-if="props.i18nTooltip"
            :text="$t(props.i18nTooltip)"
          />
        </div>
        <NuxtLink
          v-if="hasLink"
          class="text-caption font-weight-medium text-primary text-no-wrap"
          :to="props.to"
        >
          {{ $t(props.i18nLinkTitle) }}
        </NuxtLink>
      </div>
      <template v-if="props.isLoading">
        <AppSkeletonLoader type="text" />
      </template>
      <template v-else>
        <v-menu
          v-if="hasDetails"
          location="bottom"
          open-on-hover
          :offset="8"
        >
          <template #activator="{ props: menuProps }">
            <div
              v-bind="menuProps"
              class="kpi-value has-details text-h5 font-weight-bold mb-1"
            >
              {{ props.value }}
            </div>
          </template>
          <v-card
            color="backgroundScale1"
            class="details"
          >
            <table
              v-if="hasBreakdownDetails"
              class="details-table breakdown-details-table"
            >
              <thead>
                <tr>
                  <th class="text-left details-header-cell details-row-label-cell">
                    {{ breakdownDetails.rowHeaderI18nTitle ? $t(breakdownDetails.rowHeaderI18nTitle) : '' }}
                  </th>
                  <th
                    v-for="(column, index) in breakdownValueColumns"
                    :key="index"
                    class="text-right details-header-cell"
                  >
                    <div>{{ resolveTitle(column) }}</div>
                    <div class="details-share">
                      {{ column.share }}
                    </div>
                  </th>
                  <th
                    v-if="breakdownTotalColumn"
                    class="text-right details-header-cell details-total-cell"
                  >
                    <div>{{ resolveTitle(breakdownTotalColumn) }}</div>
                    <div class="details-share">
                      {{ breakdownTotalColumn.share }}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, rowIndex) in breakdownDetails.rows"
                  :key="rowIndex"
                >
                  <th class="text-left details-row-label-cell">
                    <span
                      class="details-dot"
                      :style="{ backgroundColor: getDetailRowColor(row, rowIndex) }"
                    />
                    <span>{{ resolveTitle(row) }}</span>
                  </th>
                  <td
                    v-for="(cell, cellIndex) in row.cells"
                    :key="cellIndex"
                    class="text-right"
                  >
                    {{ cell }}
                  </td>
                  <td class="text-right details-total-cell">
                    {{ row.total }}
                  </td>
                </tr>
              </tbody>
              <tfoot v-if="breakdownDetails.totalRow">
                <tr>
                  <th class="text-left details-row-label-cell">
                    {{ resolveTitle(breakdownDetails.totalRow) }}
                  </th>
                  <td
                    v-for="(cell, cellIndex) in breakdownDetails.totalRow.cells"
                    :key="cellIndex"
                    class="text-right"
                  >
                    {{ cell }}
                  </td>
                  <td class="text-right details-total-cell">
                    {{ breakdownDetails.totalRow.total }}
                  </td>
                </tr>
              </tfoot>
            </table>
            <table
              v-else
              class="details-table row-details-table"
            >
              <tbody>
                <tr
                  v-for="(detail, index) in props.details"
                  :key="index"
                >
                  <th class="text-left details-row-label-cell">
                    <span
                      class="details-dot"
                      :style="{ backgroundColor: getDetailRowColor(detail, index) }"
                    />
                    <span>{{ resolveTitle(detail) }}</span>
                  </th>
                  <td class="text-right font-weight-medium">
                    {{ detail.value }}
                  </td>
                  <td class="text-right details-share">
                    {{ detail.share }}
                  </td>
                </tr>
              </tbody>
            </table>
          </v-card>
        </v-menu>
        <div
          v-else
          class="kpi-value text-h5 font-weight-bold mb-1"
        >
          {{ props.value }}
        </div>
        <template v-if="hasSecondaryMetric">
          <v-divider
            color="backgroundScale3"
            opacity="1"
            variant="dashed"
          />
          <div class="pt-2">
            <div class="kpi-secondary-metric text-caption text-medium-emphasis text-truncate">
              {{ $t(props.secondaryI18nTitle) }}
              <span class="font-weight-medium text-high-emphasis text-body-1 ml-1">
                {{ props.secondaryValue }}
              </span>
            </div>
          </div>
        </template>
      </template>
    </v-card-text>
  </v-card>
</template>

<style lang="scss" scoped>
.wrapper {
  height: v-bind('props.height ? `${props.height}px` : "auto"');
  border-radius: 4px;
}

.details {
  max-width: calc(100vw - 32px);
  overflow-x: auto;
  border: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
}

.details-table {
  border-collapse: collapse;
  min-width: 280px;

  th,
  td {
    padding: 8px 10px;
    border-bottom: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
    font-size: 0.875rem;
    line-height: 1.2;
    white-space: nowrap;
  }

  tbody tr:last-child th,
  tbody tr:last-child td {
    border-bottom: 0;
  }

  tfoot th,
  tfoot td {
    border-top: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
    border-bottom: 0;
    font-weight: 700;
  }
}

.breakdown-details-table {
  min-width: 420px;
}

.details-header-cell {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.75rem !important;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.details-row-label-cell {
  min-width: 132px;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-weight: 500;
}

.details-total-cell {
  background: rgb(var(--v-theme-backgroundScale2));
  color: rgba(var(--v-theme-on-surface), 1);
  font-weight: 700;
}

.details-share {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.75rem;
  font-weight: 500;
}

.details-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 6px;
  border-radius: 50%;
  vertical-align: 1px;
}

.row-details-table {
  th {
    min-width: 132px;
    color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
    font-weight: 500;
  }

  td {
    min-width: 72px;
  }
}

.loading {
  pointer-events: none;
}

.kpi-value.has-details {
  display: inline-block;
  max-width: 100%;
  cursor: default;
  text-decoration-line: underline;
  text-decoration-style: dashed;
  text-decoration-thickness: 1px;
  text-underline-offset: 4px;
}

:deep() {
  .v-skeleton-loader__text {
    margin-left: 0;
    margin-right: 0;
  }
}
</style>
