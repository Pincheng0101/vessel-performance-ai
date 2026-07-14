<script setup>
import { ChartConstant, DateConstant, IconConstant, UsageConstant } from '~/constants';
import { UsageChartConfig, UsageDataHelper, UsageKpiDetailsHelper, UsageResourceDataHelper } from '~/models/ui/usage';

definePageMeta({
  layout: 'fluid',
});

const dayjs = useDayjs();
const authStore = useAuthStore();
const { fetchModelPricingTable, fetchUsageData } = useMetering();
const { getSecondaryColor } = useChartColors();
const { startDate, endDate } = useUsageDateRange();

const tokenKpiPreset = UsageConstant.Preset.TOKEN_KPI;
const dailyTokenUsagePreset = UsageConstant.Preset.DAILY_TOKEN_USAGE;
const searchEngineUsagePreset = UsageConstant.Preset.SEARCH_ENGINE_USAGE;

const OVERALL_KPI_CARD_HEIGHT = 100;
const DAILY_USAGE_CHART_HEIGHT = 300;

const state = reactive({
  pricingTable: {},
  isLoading: false,
  refreshRequest: 0,
  dailyUsageChartVariant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
  modelDistributionChartVariant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
  kpiRows: null,
  dailyUsageRows: null,
  searchEngineUsageRows: null,
});

const kpiRow = computed(() => state.kpiRows?.[0] ?? {});
const dailyChartRows = computed(() => UsageDataHelper.buildDailyUsageChartRows({
  rows: state.dailyUsageRows,
  pricingTable: state.pricingTable,
  startDate: startDate.value,
  endDate: endDate.value,
}));
const modelUsageRows = computed(() => UsageDataHelper.buildModelBreakdownRows({
  rows: UsageDataHelper.buildUsageMetricRows({
    rows: state.dailyUsageRows,
    pricingTable: state.pricingTable,
  }),
}));
const dailyUsageMetricTotals = computed(() => UsageDataHelper.sumUsageMetricTotals(dailyChartRows.value));
const kpiTokenBreakdown = computed(() => ({
  totalCacheReadInputTokens: Number(kpiRow.value.sumCacheReadInputTokens ?? 0),
  totalCacheWriteInputTokens: Number(kpiRow.value.sumCacheWriteInputTokens ?? 0),
  totalInputTokens: Number(kpiRow.value.sumInputTokens ?? 0),
  totalOutputTokens: Number(kpiRow.value.sumOutputTokens ?? 0),
}));
const inputTokenKpiSummary = computed(() => {
  const inputTokenDatasetTypes = [
    UsageConstant.DatasetType.INPUT.value,
    UsageConstant.DatasetType.CACHE_WRITE_INPUT.value,
    UsageConstant.DatasetType.CACHE_READ_INPUT.value,
  ];
  const inputTokenCount = inputTokenDatasetTypes.reduce((sum, datasetType) => {
    switch (datasetType) {
      case UsageConstant.DatasetType.INPUT.value:
        return sum + kpiTokenBreakdown.value.totalInputTokens;
      case UsageConstant.DatasetType.CACHE_WRITE_INPUT.value:
        return sum + kpiTokenBreakdown.value.totalCacheWriteInputTokens;
      case UsageConstant.DatasetType.CACHE_READ_INPUT.value:
        return sum + kpiTokenBreakdown.value.totalCacheReadInputTokens;
      default:
        return sum;
    }
  }, 0);

  return {
    details: UsageKpiDetailsHelper.buildTokenDetails({
      datasetTypes: inputTokenDatasetTypes,
      metricTotals: kpiTokenBreakdown.value,
    }),
    totalTokens: inputTokenCount,
  };
});

const estimatedCostDetails = computed(() => UsageKpiDetailsHelper.buildEstimatedCostDetails({
  metricTotals: dailyUsageMetricTotals.value,
}));

const overallKpiCards = computed(() => ([
  {
    icon: UsageConstant.Kpi.INPUT_TOKENS.icon,
    height: OVERALL_KPI_CARD_HEIGHT,
    i18nTitle: UsageConstant.Kpi.INPUT_TOKENS.i18nTitle,
    isLoading: state.isLoading,
    value: numUtils.format(inputTokenKpiSummary.value.totalTokens),
    details: inputTokenKpiSummary.value.details,
  },
  {
    icon: UsageConstant.Kpi.OUTPUT_TOKENS.icon,
    height: OVERALL_KPI_CARD_HEIGHT,
    i18nTitle: UsageConstant.Kpi.OUTPUT_TOKENS.i18nTitle,
    isLoading: state.isLoading,
    value: numUtils.format(kpiRow.value.sumOutputTokens ?? 0),
  },
  {
    icon: UsageConstant.Kpi.ESTIMATED_COST.icon,
    height: OVERALL_KPI_CARD_HEIGHT,
    i18nTitle: UsageConstant.Kpi.ESTIMATED_COST.i18nTitle,
    i18nTooltip: UsageConstant.Kpi.ESTIMATED_COST.i18nTooltip,
    isLoading: state.isLoading,
    value: `$${numUtils.format(dailyUsageMetricTotals.value.estimatedCost, 2)}`,
    details: estimatedCostDetails.value,
  },
  {
    icon: UsageConstant.Kpi.USERS.icon,
    height: OVERALL_KPI_CARD_HEIGHT,
    i18nTitle: UsageConstant.Kpi.USERS.i18nTitle,
    i18nLinkTitle: UsageConstant.Kpi.USERS.i18nLinkTitle,
    isLoading: state.isLoading,
    to: UsageConstant.Kpi.USERS.to,
    value: numUtils.format(kpiRow.value.userCount ?? 0),
  },
]));

const entityKpiCards = computed(() => ([
  {
    icon: UsageConstant.Kpi.AGENTS.icon,
    i18nTitle: UsageConstant.Kpi.SESSIONS.i18nTitle,
    i18nLinkTitle: UsageConstant.Kpi.AGENTS.i18nLinkTitle,
    isLoading: state.isLoading,
    to: UsageConstant.Kpi.AGENTS.to,
    value: numUtils.format(kpiRow.value.sessionCount ?? 0),
    secondaryI18nTitle: UsageConstant.Kpi.AGENTS.i18nTitle,
    secondaryValue: numUtils.format(kpiRow.value.agentCount ?? 0),
  },
  {
    icon: UsageConstant.Kpi.WORKFLOWS.icon,
    i18nTitle: UsageConstant.Kpi.EXECUTIONS.i18nTitle,
    i18nLinkTitle: UsageConstant.Kpi.WORKFLOWS.i18nLinkTitle,
    isLoading: state.isLoading,
    to: UsageConstant.Kpi.WORKFLOWS.to,
    value: numUtils.format(kpiRow.value.executionCount ?? 0),
    secondaryI18nTitle: UsageConstant.Kpi.WORKFLOWS.i18nTitle,
    secondaryValue: numUtils.format(kpiRow.value.workflowCount ?? 0),
  },
]));

const dailyTokensChart = computed(() => {
  const chartRows = dailyChartRows.value;

  return new UsageChartConfig({
    type: ChartConstant.Type.BAR.value,
    direction: ChartConstant.Direction.VERTICAL.value,
    i18nTitle: '__titleUsageDailyTokens',
    height: DAILY_USAGE_CHART_HEIGHT,
    valueFormat: UsageConstant.ValueFormat.NUMBER.value,
    datasets: UsageDataHelper.buildTokenStackDatasets({
      rows: chartRows,
    }),
    labels: chartRows.map(row => dayjs(row.date).format(DateConstant.Format.MONTH_DATE)),
  });
});

const dailyEstimatedCostChart = computed(() => {
  const chartRows = dailyChartRows.value;

  return new UsageChartConfig({
    type: ChartConstant.Type.BAR.value,
    direction: ChartConstant.Direction.VERTICAL.value,
    i18nTitle: '__titleUsageDailyEstimatedCost',
    i18nTooltip: '__tooltipUsageEstimatedCost',
    height: DAILY_USAGE_CHART_HEIGHT,
    valueFormat: UsageConstant.ValueFormat.CURRENCY.value,
    datasets: UsageDataHelper.buildEstimatedCostStackDatasets({
      rows: chartRows,
    }),
    labels: chartRows.map(row => dayjs(row.date).format(DateConstant.Format.MONTH_DATE)),
  });
});

const modelTokenDistributionChart = computed(() => UsageChartConfig.buildModelDistribution({
  rows: modelUsageRows.value,
  variant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
}));

const modelEstimatedCostDistributionChart = computed(() => UsageChartConfig.buildModelDistribution({
  rows: modelUsageRows.value,
  variant: UsageConstant.ChartVariant.ESTIMATED_COST.value,
}));

const resourceItems = computed(() => UsageResourceDataHelper.buildResourceItems({
  getColor: getSecondaryColor,
  items: [
    UsageResourceDataHelper.buildSearchEngineItem({
      rows: state.searchEngineUsageRows,
    }),
  ],
}));

const loadUsageData = async () => {
  const requestId = ++state.refreshRequest;
  state.isLoading = true;

  try {
    const [
      pricingTable,
      dailyUsageResult,
      kpiResult,
      searchEngineUsageResult,
    ] = await Promise.all([
      fetchModelPricingTable(),
      fetchUsageData({
        preset: dailyTokenUsagePreset,
        startDate: startDate.value,
        endDate: endDate.value,
      }),
      fetchUsageData({
        preset: tokenKpiPreset,
        startDate: startDate.value,
        endDate: endDate.value,
      }),
      fetchUsageData({
        preset: searchEngineUsagePreset,
        startDate: startDate.value,
        endDate: endDate.value,
      }),
    ]);

    if (requestId !== state.refreshRequest) {
      return;
    }

    state.pricingTable = pricingTable ?? {};

    if (dailyUsageResult) {
      state.dailyUsageRows = dailyUsageResult.rows;
    }

    state.kpiRows = kpiResult?.rows ?? [];

    if (searchEngineUsageResult) {
      state.searchEngineUsageRows = searchEngineUsageResult.rows;
    }
  } finally {
    if (requestId === state.refreshRequest) {
      state.isLoading = false;
    }
  }
};

onMounted(() => {
  if (!authStore.parsedToken.isAdmin) {
    return;
  }

  loadUsageData();
});
</script>

<template>
  <template v-if="authStore.parsedToken.isAdmin">
    <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-6">
      <div class="d-flex align-center">
        <v-icon
          :icon="IconConstant.Base.USAGE"
          class="mr-2"
          color="primary"
          size="small"
        />
        <span class="text-h6">
          {{ $t('__titleUsagePlatformOverview') }}
        </span>
      </div>
      <div class="d-flex align-center ga-2">
        <AppDateRangePicker
          v-model:start-date="startDate"
          v-model:end-date="endDate"
          :on-apply="loadUsageData"
        />
        <UsageExportReportButton
          :start-date="startDate"
          :end-date="endDate"
        />
      </div>
    </div>
    <v-row>
      <v-col cols="12">
        <v-row>
          <v-col
            v-for="(card, index) in overallKpiCards"
            :key="index"
            cols="12"
            sm="6"
            md="4"
            lg="3"
          >
            <UsageKpiCard v-bind="card" />
          </v-col>
        </v-row>
        <v-row>
          <v-col
            v-for="(card, index) in entityKpiCards"
            :key="`entity-${index}`"
            cols="12"
            md="6"
          >
            <UsageKpiCard v-bind="card" />
          </v-col>
        </v-row>
      </v-col>
      <v-col cols="12">
        <v-row>
          <v-col cols="12">
            <UsageResultCardFrame
              :title="state.dailyUsageChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value ? $t(dailyTokensChart.i18nTitle) : $t(dailyEstimatedCostChart.i18nTitle)"
              :tooltip="state.dailyUsageChartVariant === UsageConstant.ChartVariant.ESTIMATED_COST.value ? $t(dailyEstimatedCostChart.i18nTooltip) : ''"
            >
              <template #actions>
                <UsageChartVariantButtonToggle v-model="state.dailyUsageChartVariant" />
              </template>
              <UsageResultCard
                v-if="state.dailyUsageChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value"
                :has-content="dailyTokensChart.labels.length > 0"
                :is-loading="state.isLoading"
              >
                <UsageBarChart :chart="dailyTokensChart" />
              </UsageResultCard>
              <UsageResultCard
                v-else
                :has-content="dailyEstimatedCostChart.labels.length > 0"
                :is-loading="state.isLoading"
              >
                <UsageBarChart :chart="dailyEstimatedCostChart" />
              </UsageResultCard>
            </UsageResultCardFrame>
          </v-col>
        </v-row>
        <v-row>
          <v-col
            cols="12"
            md="6"
          >
            <UsageResultCardFrame
              :title="state.modelDistributionChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value ? $t(modelTokenDistributionChart.i18nTitle) : $t(modelEstimatedCostDistributionChart.i18nTitle)"
              :tooltip="state.modelDistributionChartVariant === UsageConstant.ChartVariant.ESTIMATED_COST.value ? $t(modelEstimatedCostDistributionChart.i18nTooltip) : ''"
            >
              <template #actions>
                <UsageModelTokenBreakdownDialog
                  :usage-rows="state.dailyUsageRows"
                  :pricing-table="state.pricingTable"
                  :loading="state.isLoading"
                />
                <UsageChartVariantButtonToggle v-model="state.modelDistributionChartVariant" />
              </template>
              <UsageResultCard
                v-if="state.modelDistributionChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value"
                :has-content="modelTokenDistributionChart.labels.length > 0"
                :is-loading="state.isLoading"
              >
                <UsageDonutChart :chart="modelTokenDistributionChart" />
              </UsageResultCard>
              <UsageResultCard
                v-else
                :has-content="modelEstimatedCostDistributionChart.labels.length > 0"
                :is-loading="state.isLoading"
              >
                <UsageDonutChart :chart="modelEstimatedCostDistributionChart" />
              </UsageResultCard>
            </UsageResultCardFrame>
          </v-col>
          <v-col
            cols="12"
            md="6"
          >
            <UsageResultCard
              :title="$t('__titleUsageResourceByType')"
              :tooltip="$t('__tooltipUsageResourceByType')"
              :has-content="resourceItems.length > 0"
              :is-loading="state.isLoading"
            >
              <UsageResourceList :items="resourceItems" />
            </UsageResultCard>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </template>
  <AppInfoCard
    v-else
    :title="$t('__titleForbidden')"
    :instruction="$t('__instructionForbidden')"
    :icon="IconConstant.Base.USAGE"
  />
</template>
