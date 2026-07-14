<script setup>
import { ChartConstant, LlmConstant } from '~/constants';
import { UsageDataHelper } from '~/models/ui/usage';

const props = defineProps({
  usageRows: {
    type: Array,
    default: () => [],
  },
  pricingTable: {
    type: Object,
    default: () => ({}),
  },
  loading: {
    type: Boolean,
    default: false,
  },
  segmentLimit: {
    type: Number,
    default: ChartConstant.Donut.SEGMENT_LIMIT,
  },
  modelColorMap: {
    type: Object,
    default: () => ({}),
  },
  bordered: {
    type: Boolean,
    default: false,
  },
  showTitle: {
    type: Boolean,
    default: false,
  },
});

const ColumnKey = Object.freeze({
  MODEL: 'model',
  INPUT: 'input',
  OUTPUT: 'output',
  CACHE_WRITE: 'cacheWrite',
  CACHE_READ: 'cacheRead',
  TOTAL_TOKENS: 'totalTokens',
  SHARE: 'share',
});
const MetricColumnKeys = Object.freeze([
  ColumnKey.INPUT,
  ColumnKey.OUTPUT,
  ColumnKey.CACHE_WRITE,
  ColumnKey.CACHE_READ,
  ColumnKey.TOTAL_TOKENS,
]);
const TokenTypeColumnKeys = Object.freeze([
  ColumnKey.INPUT,
  ColumnKey.OUTPUT,
  ColumnKey.CACHE_WRITE,
  ColumnKey.CACHE_READ,
]);
const RightAlignedHeaderKeys = Object.freeze([
  ...MetricColumnKeys,
  ColumnKey.SHARE,
]);
const TOTAL_ROW_ID = 'usage-model-token-breakdown-total';
const TOTAL_ROW_CELL_STYLE = 'background-color: rgba(var(--v-theme-backgroundScale1)) !important;';

const { t } = useI18n();
const { getSecondaryColor } = useChartColors();
const { getUsageModelColorMap } = useUsageChartColors();

const getModelConfig = model => LlmConstant.Model[model] ?? {};
const getModelDisplayName = model => getModelConfig(model).title || model;
const getModelProvider = model => getModelConfig(model).provider || '';
const isTotalRow = item => item?.id === TOTAL_ROW_ID;
const getTotalRowCellStyle = item => (isTotalRow(item) ? TOTAL_ROW_CELL_STYLE : undefined);
const getBaseCellProps = (item, className = {}) => ({
  class: className,
  style: getTotalRowCellStyle(item),
});
const formatTokenCount = value => numUtils.format(Number(value ?? 0));
const formatCurrency = value => `$${numUtils.format(Number(value ?? 0), 4)}`;

/**
 * Token and estimated-cost values for one table metric cell.
 *
 * @typedef {Object} TokenCostCell
 * @property {number} cost
 * @property {number} intensity
 * @property {number} tokens
 */

/**
 * Creates a table-local token/cost cell.
 *
 * @param {Object} options
 * @param {number} [options.cost=0] - Estimated cost for the cell.
 * @param {number} [options.tokens=0] - Token count for the cell.
 * @returns {TokenCostCell} The normalized table cell values.
 */
const createTokenCostCell = ({
  tokens = 0,
  cost = 0,
} = {}) => ({
  tokens: Number(tokens ?? 0),
  cost: Number(cost ?? 0),
  intensity: 0,
});
const createTotalTokenCostCell = (rows, key) => createTokenCostCell({
  tokens: rows.reduce((sum, row) => sum + Number(row[key].tokens ?? 0), 0),
  cost: rows.reduce((sum, row) => sum + Number(row[key].cost ?? 0), 0),
});
const buildModelRowColorMap = rows => getUsageModelColorMap({
  rows,
  keyField: ColumnKey.MODEL,
  segmentLimit: props.segmentLimit,
  valueGetter: row => row[ColumnKey.TOTAL_TOKENS].tokens,
});

const metricRows = computed(() => UsageDataHelper.buildUsageMetricRows({
  rows: props.usageRows,
  pricingTable: props.pricingTable,
}));

const tableRows = computed(() => {
  const rowsByModel = new Map();

  metricRows.value.forEach((row) => {
    if (!row.model) {
      return;
    }

    const item = rowsByModel.get(row.model) ?? {
      id: row.model,
      [ColumnKey.MODEL]: row.model,
      modelName: getModelDisplayName(row.model),
      provider: getModelProvider(row.model),
      [ColumnKey.INPUT]: createTokenCostCell(),
      [ColumnKey.OUTPUT]: createTokenCostCell(),
      [ColumnKey.CACHE_WRITE]: createTokenCostCell(),
      [ColumnKey.CACHE_READ]: createTokenCostCell(),
      [ColumnKey.TOTAL_TOKENS]: createTokenCostCell(),
    };

    item[ColumnKey.INPUT].tokens += Number(row.totalInputTokens ?? 0);
    item[ColumnKey.INPUT].cost += Number(row.estimatedInputCost ?? 0);
    item[ColumnKey.OUTPUT].tokens += Number(row.totalOutputTokens ?? 0);
    item[ColumnKey.OUTPUT].cost += Number(row.estimatedOutputCost ?? 0);
    item[ColumnKey.CACHE_WRITE].tokens += Number(row.totalCacheWriteInputTokens ?? 0);
    item[ColumnKey.CACHE_WRITE].cost += Number(row.estimatedCacheWriteInputCost ?? 0);
    item[ColumnKey.CACHE_READ].tokens += Number(row.totalCacheReadInputTokens ?? 0);
    item[ColumnKey.CACHE_READ].cost += Number(row.estimatedCacheReadInputCost ?? 0);
    item[ColumnKey.TOTAL_TOKENS].tokens += Number(row.totalTokens ?? 0);
    item[ColumnKey.TOTAL_TOKENS].cost += Number(row.estimatedCost ?? 0);

    rowsByModel.set(row.model, item);
  });

  const rows = [...rowsByModel.values()]
    .sort((left, right) => right[ColumnKey.TOTAL_TOKENS].tokens - left[ColumnKey.TOTAL_TOKENS].tokens);
  const grandTotalTokens = rows.reduce((sum, row) => sum + row[ColumnKey.TOTAL_TOKENS].tokens, 0);
  const maxTokensByTokenType = Object.fromEntries(
    TokenTypeColumnKeys.map(key => [
      key,
      Math.max(0, ...rows.map(row => row[key].tokens)),
    ]),
  );

  const modelRows = rows.map((row, index) => {
    TokenTypeColumnKeys.forEach((key) => {
      const maxTokens = maxTokensByTokenType[key];

      row[key].intensity = maxTokens > 0 ? row[key].tokens / maxTokens : 0;
    });

    return {
      ...row,
      index,
      [ColumnKey.SHARE]: grandTotalTokens > 0 ? (row[ColumnKey.TOTAL_TOKENS].tokens / grandTotalTokens) * 100 : 0,
    };
  });

  if (modelRows.length === 0) {
    return modelRows;
  }

  const modelRowColorMap = buildModelRowColorMap(modelRows);

  const totalRow = {
    id: TOTAL_ROW_ID,
    [ColumnKey.MODEL]: TOTAL_ROW_ID,
    isTotalRow: true,
    modelName: t('__fieldTotal'),
    provider: '',
    [ColumnKey.SHARE]: grandTotalTokens > 0 ? 100 : 0,
  };

  MetricColumnKeys.forEach((key) => {
    totalRow[key] = createTotalTokenCostCell(rows, key);
  });

  return [
    ...modelRows.map(row => ({
      ...row,
      color: modelRowColorMap[row[ColumnKey.MODEL]],
    })),
    totalRow,
  ];
});

const getMetricCellProps = (item, key) => ({
  class: {
    'usage-model-token-breakdown-table__heat-cell': !isTotalRow(item) && TokenTypeColumnKeys.includes(key),
    'usage-model-token-breakdown-table__total-cell': key === ColumnKey.TOTAL_TOKENS,
    'text-end': true,
  },
  style: (() => {
    const totalRowCellStyle = getTotalRowCellStyle(item);

    if (totalRowCellStyle) {
      return totalRowCellStyle;
    }

    if (TokenTypeColumnKeys.includes(key)) {
      // Start at 0.02 for a visible tint, add up to 0.26 by relative weight, and cap at 0.8 as a safety bound
      const opacity = Math.min(0.8, 0.02 + item[key].intensity * 0.26).toFixed(3);

      return `background-color: rgba(var(--v-theme-primary), ${opacity}) !important;`;
    }

    if (key === ColumnKey.TOTAL_TOKENS) {
      return 'background-color: rgba(var(--v-theme-background)) !important;';
    }

    return undefined;
  })(),
});
const metricHeaderProps = { class: 'text-end' };

const headers = computed(() => [
  {
    key: ColumnKey.MODEL,
    title: t('__fieldModel'),
    minWidth: 250,
    cellProps: item => getBaseCellProps(item),
  },
  {
    key: ColumnKey.INPUT,
    title: t('__fieldUsageInput'),
    minWidth: 120,
    headerProps: metricHeaderProps,
    cellProps: item => getMetricCellProps(item, ColumnKey.INPUT),
  },
  {
    key: ColumnKey.OUTPUT,
    title: t('__fieldUsageOutput'),
    minWidth: 120,
    headerProps: metricHeaderProps,
    cellProps: item => getMetricCellProps(item, ColumnKey.OUTPUT),
  },
  {
    key: ColumnKey.CACHE_WRITE,
    title: t('__fieldUsageCacheWriteInput'),
    minWidth: 140,
    headerProps: metricHeaderProps,
    cellProps: item => getMetricCellProps(item, ColumnKey.CACHE_WRITE),
  },
  {
    key: ColumnKey.CACHE_READ,
    title: t('__fieldUsageCacheReadInput'),
    minWidth: 140,
    headerProps: metricHeaderProps,
    cellProps: item => getMetricCellProps(item, ColumnKey.CACHE_READ),
  },
  {
    key: ColumnKey.TOTAL_TOKENS,
    title: t('__fieldUsageTotalTokens'),
    minWidth: 140,
    headerProps: metricHeaderProps,
    cellProps: item => getMetricCellProps(item, ColumnKey.TOTAL_TOKENS),
  },
  {
    key: ColumnKey.SHARE,
    title: t('__fieldShare'),
    minWidth: 90,
    headerProps: metricHeaderProps,
    cellProps: item => getBaseCellProps(item, 'text-end'),
  },
]);

const getHeaderTitle = key => headers.value.find(header => header.key === key)?.title ?? '';
const getRowColor = item => props.modelColorMap[item[ColumnKey.MODEL]] || item.color || getSecondaryColor(item.index);
</script>

<template>
  <div class="d-flex flex-column ga-2">
    <div
      v-if="props.showTitle"
      class="d-flex align-center justify-space-between ga-3 px-1"
    >
      <span class="text-subtitle-2 font-weight-bold">
        {{ $t('__titleUsageModelTokenBreakdown') }}
      </span>
    </div>
    <AppTable
      :headers="headers"
      :items="tableRows"
      :loading="props.loading"
      item-value="id"
      :server-side="false"
      :show-pagination="false"
      enable-scroll-button
      :enable-search="false"
      variant="flat"
      :bordered="props.bordered"
      hide-details
      hide-no-data
    >
      <template
        v-for="columnKey in RightAlignedHeaderKeys"
        :key="columnKey"
        #[`header.${columnKey}`]
      >
        <div class="usage-model-token-breakdown-table__header-cell">
          {{ getHeaderTitle(columnKey) }}
        </div>
      </template>
      <template #[`item.${ColumnKey.MODEL}`]="{ item }">
        <div
          v-if="isTotalRow(item)"
          class="font-weight-bold"
        >
          {{ item.modelName }}
        </div>
        <div
          v-else
          class="d-flex align-center ga-3"
        >
          <div
            class="usage-model-token-breakdown-table__swatch"
            :style="{ backgroundColor: getRowColor(item) }"
          />
          <div class="overflow-hidden">
            <div class="font-weight-medium text-truncate">
              {{ item.modelName }}
            </div>
            <div class="text-caption text-medium-emphasis text-truncate">
              {{ item.provider || item.model }}
            </div>
          </div>
        </div>
      </template>
      <template
        v-for="columnKey in MetricColumnKeys"
        :key="columnKey"
        #[`item.${columnKey}`]="{ item, value }"
      >
        <div class="usage-model-token-breakdown-table__metric">
          <div :class="isTotalRow(item) ? 'font-weight-bold' : 'font-weight-medium'">
            {{ formatTokenCount(value.tokens) }}
          </div>
          <div
            class="text-caption text-medium-emphasis"
            :class="{ 'font-weight-medium': isTotalRow(item) }"
          >
            {{ formatCurrency(value.cost) }}
          </div>
        </div>
      </template>
      <template #[`item.${ColumnKey.SHARE}`]="{ item, value }">
        <span
          class="text-medium-emphasis"
          :class="{ 'font-weight-bold': isTotalRow(item) }"
        >
          {{ isTotalRow(item) ? '-' : numUtils.formatPercentageLabel(value) }}
        </span>
      </template>
    </AppTable>
  </div>
</template>

<style lang="scss" scoped>
.usage-model-token-breakdown-table__swatch {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: 0 0 auto;
}

.usage-model-token-breakdown-table__metric {
  min-width: 96px;
}

.usage-model-token-breakdown-table__header-cell {
  width: 100%;
  text-align: right;
}
</style>
