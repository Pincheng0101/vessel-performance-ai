<script setup>
import { AgentConstant, ChartConstant, DateConstant, IconConstant, ResourceConstant, UsageConstant } from '~/constants';
import { BarChartScaleHelper } from '~/models/ui/chart';
import { UsageAgentDataHelper, UsageChartConfig, UsageDataHelper, UsageKpiDetailsHelper, UsageResourceDataHelper } from '~/models/ui/usage';

definePageMeta({
  layout: 'fluid',
});

const authStore = useAuthStore();
const dayjs = useDayjs();
const { fetchModelPricingTable, fetchUsageData } = useMetering();
const { t } = useI18n();
const { startDate, endDate } = useUsageDateRange();
const {
  getResourceName,
  loadResourceMap,
} = useUsageResourceMap({
  resourceTypes: [ResourceConstant.Type.AGENT.value],
});

const dailyAgentTokenUsagePreset = UsageConstant.Preset.DAILY_AGENT_TOKEN_USAGE;
const dailySessionsPreset = UsageConstant.Preset.DAILY_SESSIONS;
const agentsSessionsAndUsersPreset = UsageConstant.Preset.AGENTS_SESSIONS_AND_USERS;
const agentsSearchEngineUsagePreset = UsageConstant.Preset.AGENTS_SEARCH_ENGINE_USAGE;

const DAILY_AGENT_CHART_HEIGHT = 300;
const AGENTS_USAGE_CHART_HEIGHT = 500;
const AGENTS_USAGE_CHART_BAR_LIMIT = 20;

const state = reactive({
  pricingTable: {},
  isLoading: false,
  refreshRequest: 0,
  dailyUsageChartVariant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
  modelDistributionChartVariant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
  agentsUsageChartVariant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
  agentsUsageChartUseLogarithmicScale: false,
  dailyAgentUsageRows: null,
  dailySessionsRows: null,
  agentsSessionsAndUsersRows: null,
  agentsSearchEngineUsageRows: null,
});

const filteredDailyAgentUsageRows = computed(() => (
  (state.dailyAgentUsageRows ?? []).filter(row => row.agentId)
));

const normalizedAgentsSessionsAndUsersRows = computed(() => (
  state.agentsSessionsAndUsersRows ?? []
));

const dailyAgentSessionChartRows = computed(() => (
  UsageAgentDataHelper.buildDailySessionChartRows({
    dailySessionsRows: state.dailySessionsRows,
    startDate: startDate.value,
    endDate: endDate.value,
  })
));

const getAgentResource = agentId => ({
  resourceId: agentId,
  resourceType: ResourceConstant.Type.AGENT.value,
});

const getAgentDisplayName = agentId => getResourceName(getAgentResource(agentId));
const getAgentUsagePagePath = agentId => `/usage/agents/${agentId}`;

const agentsModelBreakdownRows = computed(() => (
  UsageAgentDataHelper.buildAgentsModelBreakdownRows({
    dailyAgentUsageRows: filteredDailyAgentUsageRows.value,
    pricingTable: state.pricingTable,
  })
));

const agentsUsageTableItems = computed(() => (
  UsageAgentDataHelper.buildAgentsUsageTableItems({
    dailyAgentUsageRows: filteredDailyAgentUsageRows.value,
    pricingTable: state.pricingTable,
    agentsSessionsAndUsersRows: normalizedAgentsSessionsAndUsersRows.value,
    getAgentDisplayName,
    reservedAgentIds: [AgentConstant.CopilotAgentId],
  })
));

const agentsUsageSummary = computed(() => (
  UsageAgentDataHelper.buildAgentsUsageSummary({
    dailyAgentUsageRows: filteredDailyAgentUsageRows.value,
    pricingTable: state.pricingTable,
    agentsSessionsAndUsersRows: normalizedAgentsSessionsAndUsersRows.value,
  })
));

const agentsUsageTokenDetails = computed(() => UsageKpiDetailsHelper.buildTokenDetails({
  metricTotals: agentsUsageSummary.value,
}));

const agentsUsageEstimatedCostDetails = computed(() => UsageKpiDetailsHelper.buildEstimatedCostDetails({
  metricTotals: agentsUsageSummary.value,
}));

const limitedAgentsUsageChartRows = computed(() => (
  agentsUsageTableItems.value.slice(0, AGENTS_USAGE_CHART_BAR_LIMIT)
));

const shouldShowAgentsUsageChartLimitNote = computed(() => (
  agentsUsageTableItems.value.length > AGENTS_USAGE_CHART_BAR_LIMIT
));

const {
  hasResourceItems: hasAgentResourceItems,
  getResourceItems: getAgentResourceItems,
  getResourceChipItems: getAgentResourceChipItems,
} = useUsageResourceBreakdown({
  entityKey: ResourceConstant.Type.AGENT.id,
  entityIdGetter: item => item.agentId,
  rows: computed(() => state.agentsSearchEngineUsageRows),
});

const navigateToAgentUsage = (agentId) => {
  if (!agentId) {
    return;
  }

  navigateTo(getAgentUsagePagePath(agentId));
};

const handleAgentsUsageBarClick = ({ dataIndex }) => {
  navigateToAgentUsage(limitedAgentsUsageChartRows.value[dataIndex]?.agentId);
};

const agentsModelTokenDistributionChart = computed(() => UsageChartConfig.buildModelDistribution({
  rows: agentsModelBreakdownRows.value,
  variant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
}));

const agentsModelEstimatedCostDistributionChart = computed(() => UsageChartConfig.buildModelDistribution({
  rows: agentsModelBreakdownRows.value,
  variant: UsageConstant.ChartVariant.ESTIMATED_COST.value,
}));

const dailyAgentSessionsChart = computed(() => {
  const rows = dailyAgentSessionChartRows.value;

  return new UsageChartConfig({
    type: ChartConstant.Type.BAR.value,
    direction: ChartConstant.Direction.VERTICAL.value,
    i18nTitle: '__titleUsageDailySessions',
    height: DAILY_AGENT_CHART_HEIGHT,
    showTooltipTotal: false,
    valueFormat: UsageConstant.ValueFormat.NUMBER.value,
    datasets: [
      {
        data: rows.map(row => row.sessionCount),
        label: t('__fieldUsageSessions'),
      },
    ],
    labels: rows.map(row => dayjs(row.date).format(DateConstant.Format.MONTH_DATE)),
  });
});

const dailyAgentUsageChartRows = computed(() => (
  UsageDataHelper.buildDailyUsageChartRows({
    rows: filteredDailyAgentUsageRows.value,
    pricingTable: state.pricingTable,
    startDate: startDate.value,
    endDate: endDate.value,
  })
));

const dailyAgentTokenChart = computed(() => {
  const rows = dailyAgentUsageChartRows.value;

  return new UsageChartConfig({
    type: ChartConstant.Type.BAR.value,
    direction: ChartConstant.Direction.VERTICAL.value,
    i18nTitle: '__titleUsageDailyTokens',
    height: DAILY_AGENT_CHART_HEIGHT,
    valueFormat: UsageConstant.ValueFormat.NUMBER.value,
    datasets: UsageDataHelper.buildTokenStackDatasets({
      rows,
    }),
    labels: rows.map(row => dayjs(row.date).format(DateConstant.Format.MONTH_DATE)),
  });
});

const dailyAgentEstimatedCostChart = computed(() => {
  const rows = dailyAgentUsageChartRows.value;

  return new UsageChartConfig({
    type: ChartConstant.Type.BAR.value,
    direction: ChartConstant.Direction.VERTICAL.value,
    i18nTitle: '__titleUsageDailyEstimatedCost',
    i18nTooltip: '__tooltipUsageEstimatedCost',
    height: DAILY_AGENT_CHART_HEIGHT,
    valueFormat: UsageConstant.ValueFormat.CURRENCY.value,
    datasets: UsageDataHelper.buildEstimatedCostStackDatasets({
      rows,
    }),
    labels: rows.map(row => dayjs(row.date).format(DateConstant.Format.MONTH_DATE)),
  });
});

const agentsUsageTokenChart = computed(() => {
  const rows = limitedAgentsUsageChartRows.value;

  return new UsageChartConfig({
    type: ChartConstant.Type.BAR.value,
    direction: ChartConstant.Direction.HORIZONTAL.value,
    i18nTitle: '__titleUsageTokensByAgent',
    height: AGENTS_USAGE_CHART_HEIGHT,
    valueFormat: UsageConstant.ValueFormat.NUMBER.value,
    datasets: UsageDataHelper.buildTokenStackDatasets({
      rows,
    }),
    resourceType: ResourceConstant.Type.AGENT.value,
    labels: rows.map(row => row.agentName),
    labelsMetadata: rows.map(row => ({
      isDeleted: row.isDeleted ?? false,
      resourceId: row.agentId,
    })),
  });
});

const agentsUsageEstimatedCostChart = computed(() => {
  const rows = limitedAgentsUsageChartRows.value;

  return new UsageChartConfig({
    type: ChartConstant.Type.BAR.value,
    direction: ChartConstant.Direction.HORIZONTAL.value,
    i18nTitle: '__titleUsageEstimatedCostByAgent',
    i18nTooltip: '__tooltipUsageEstimatedCost',
    height: AGENTS_USAGE_CHART_HEIGHT,
    valueFormat: UsageConstant.ValueFormat.CURRENCY.value,
    datasets: UsageDataHelper.buildEstimatedCostStackDatasets({
      rows,
    }),
    resourceType: ResourceConstant.Type.AGENT.value,
    labels: rows.map(row => row.agentName),
    labelsMetadata: rows.map(row => ({
      isDeleted: row.isDeleted ?? false,
      resourceId: row.agentId,
    })),
  });
});

const forceAgentsUsageChartUseLogarithmicScale = computed(() => (
  [
    agentsUsageTokenChart.value,
    agentsUsageEstimatedCostChart.value,
  ].some(chart => BarChartScaleHelper.canUseLogarithmicScale(chart))
));

const agentsUsageTableHeaders = computed(() => ([
  {
    key: 'agentName',
    link: item => item.agentId ? ({ href: getAgentUsagePagePath(item.agentId) }) : null,
    title: t('__fieldAgent'),
  },
  {
    key: 'totalTokens',
    sortable: true,
    title: t('__fieldUsageTotalTokens'),
    isNumber: true,
  },
  {
    key: 'sessions',
    sortable: true,
    title: t('__fieldUsageSessions'),
    isNumber: true,
  },
  {
    key: 'users',
    sortable: true,
    title: t('__fieldUsageUsers'),
    isNumber: true,
  },
  {
    key: 'estimatedCost',
    sortable: true,
    title: t('__fieldUsageEstimatedCost'),
    isCurrency: true,
    numberOptions: {
      decimalPlaces: 4,
    },
  },
  {
    key: 'avgCostPerSession',
    sortable: true,
    title: t('__fieldUsageAvgCostPerSession'),
    isCurrency: true,
    numberOptions: {
      decimalPlaces: 4,
    },
  },
  {
    key: 'resources',
    title: t('__fieldResource', 2),
    value: getAgentResourceChipItems,
  },
]));

const kpiCards = computed(() => ([
  {
    icon: UsageConstant.Kpi.AGENTS.icon,
    i18nTitle: UsageConstant.Kpi.SESSIONS.i18nTitle,
    isLoading: state.isLoading,
    value: numUtils.format(agentsUsageSummary.value.totalSessions),
    secondaryI18nTitle: UsageConstant.Kpi.AGENTS.i18nTitle,
    secondaryValue: numUtils.format(agentsUsageSummary.value.agentCount),
  },
  {
    icon: UsageConstant.Kpi.TOTAL_TOKENS.icon,
    i18nTitle: UsageConstant.Kpi.TOTAL_TOKENS.i18nTitle,
    isLoading: state.isLoading,
    value: numUtils.format(agentsUsageSummary.value.totalTokens),
    details: agentsUsageTokenDetails.value,
  },
  {
    icon: UsageConstant.Kpi.ESTIMATED_COST.icon,
    i18nTitle: UsageConstant.Kpi.ESTIMATED_COST.i18nTitle,
    i18nTooltip: UsageConstant.Kpi.ESTIMATED_COST.i18nTooltip,
    isLoading: state.isLoading,
    value: `$${numUtils.format(agentsUsageSummary.value.estimatedCost, 2)}`,
    details: agentsUsageEstimatedCostDetails.value,
  },
]));

const collectUsageResources = () => (
  UsageResourceDataHelper.collectResourceRefsFromRows([
    { rows: agentsUsageTableItems.value, idField: 'agentId', resourceType: ResourceConstant.Type.AGENT.value },
  ])
);

const loadUsageData = async () => {
  const requestId = ++state.refreshRequest;
  state.isLoading = true;

  try {
    const [
      pricingTable,
      dailyAgentUsageResult,
      dailySessionsResult,
      agentsSessionsAndUsersResult,
      agentsSearchEngineUsageResult,
    ] = await Promise.all([
      fetchModelPricingTable(),
      fetchUsageData({
        preset: dailyAgentTokenUsagePreset,
        startDate: startDate.value,
        endDate: endDate.value,
      }),
      fetchUsageData({
        preset: dailySessionsPreset,
        startDate: startDate.value,
        endDate: endDate.value,
      }),
      fetchUsageData({
        preset: agentsSessionsAndUsersPreset,
        startDate: startDate.value,
        endDate: endDate.value,
      }),
      fetchUsageData({
        preset: agentsSearchEngineUsagePreset,
        startDate: startDate.value,
        endDate: endDate.value,
      }),
    ]);

    if (requestId !== state.refreshRequest) {
      return;
    }

    state.pricingTable = pricingTable ?? {};

    if (dailyAgentUsageResult) {
      state.dailyAgentUsageRows = dailyAgentUsageResult.rows;
    }

    if (dailySessionsResult) {
      state.dailySessionsRows = dailySessionsResult.rows;
    }

    if (agentsSessionsAndUsersResult) {
      state.agentsSessionsAndUsersRows = agentsSessionsAndUsersResult.rows;
    }

    if (agentsSearchEngineUsageResult) {
      state.agentsSearchEngineUsageRows = agentsSearchEngineUsageResult.rows;
    }

    await loadResourceMap(collectUsageResources());
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
          :icon="UsageConstant.Kpi.AGENTS.icon"
          class="mr-2"
          color="primary"
          size="small"
        />
        <span class="text-h6">
          {{ $t('__titleUsageAgentAnalysis') }}
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
            v-for="(card, index) in kpiCards"
            :key="index"
            cols="12"
            sm="6"
            md="4"
          >
            <UsageKpiCard v-bind="card" />
          </v-col>
        </v-row>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <UsageResultCard
          :has-content="dailyAgentSessionsChart.labels.length > 0"
          :is-loading="state.isLoading"
          :title="$t(dailyAgentSessionsChart.i18nTitle)"
        >
          <UsageBarChart :chart="dailyAgentSessionsChart" />
        </UsageResultCard>
      </v-col>
      <v-col cols="12">
        <UsageResultCardFrame
          :title="state.dailyUsageChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value ? $t(dailyAgentTokenChart.i18nTitle) : $t(dailyAgentEstimatedCostChart.i18nTitle)"
          :tooltip="state.dailyUsageChartVariant === UsageConstant.ChartVariant.ESTIMATED_COST.value ? $t(dailyAgentEstimatedCostChart.i18nTooltip) : ''"
        >
          <template #actions>
            <UsageChartVariantButtonToggle v-model="state.dailyUsageChartVariant" />
          </template>
          <UsageResultCard
            v-if="state.dailyUsageChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value"
            :has-content="dailyAgentTokenChart.labels.length > 0"
            :is-loading="state.isLoading"
          >
            <UsageBarChart :chart="dailyAgentTokenChart" />
          </UsageResultCard>
          <UsageResultCard
            v-else
            :has-content="dailyAgentEstimatedCostChart.labels.length > 0"
            :is-loading="state.isLoading"
          >
            <UsageBarChart :chart="dailyAgentEstimatedCostChart" />
          </UsageResultCard>
        </UsageResultCardFrame>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <UsageResultCardFrame
          :title="state.modelDistributionChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value ? $t(agentsModelTokenDistributionChart.i18nTitle) : $t(agentsModelEstimatedCostDistributionChart.i18nTitle)"
          :tooltip="state.modelDistributionChartVariant === UsageConstant.ChartVariant.ESTIMATED_COST.value ? $t(agentsModelEstimatedCostDistributionChart.i18nTooltip) : ''"
        >
          <template #actions>
            <UsageModelTokenBreakdownDialog
              :usage-rows="filteredDailyAgentUsageRows"
              :pricing-table="state.pricingTable"
              :loading="state.isLoading"
            />
            <UsageChartVariantButtonToggle v-model="state.modelDistributionChartVariant" />
          </template>
          <UsageResultCard
            v-if="state.modelDistributionChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value"
            :has-content="agentsModelTokenDistributionChart.labels.length > 0"
            :is-loading="state.isLoading"
          >
            <UsageDonutChart :chart="agentsModelTokenDistributionChart" />
          </UsageResultCard>
          <UsageResultCard
            v-else
            :has-content="agentsModelEstimatedCostDistributionChart.labels.length > 0"
            :is-loading="state.isLoading"
          >
            <UsageDonutChart :chart="agentsModelEstimatedCostDistributionChart" />
          </UsageResultCard>
        </UsageResultCardFrame>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <UsageResultCardFrame
          :title="state.agentsUsageChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value ? $t(agentsUsageTokenChart.i18nTitle) : $t(agentsUsageEstimatedCostChart.i18nTitle)"
          :tooltip="state.agentsUsageChartVariant === UsageConstant.ChartVariant.ESTIMATED_COST.value ? $t(agentsUsageEstimatedCostChart.i18nTooltip) : ''"
          :show-chart-limit-note="shouldShowAgentsUsageChartLimitNote"
          :chart-limit="AGENTS_USAGE_CHART_BAR_LIMIT"
          :is-loading="state.isLoading"
        >
          <template #actions>
            <UsageChartVariantButtonToggle v-model="state.agentsUsageChartVariant" />
          </template>
          <UsageResultCard
            v-if="state.agentsUsageChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value"
            :has-content="agentsUsageTokenChart.labels.length > 0"
            :is-loading="state.isLoading"
          >
            <UsageBarChart
              v-model:use-logarithmic-scale="state.agentsUsageChartUseLogarithmicScale"
              :chart="agentsUsageTokenChart"
              enable-logarithmic-scale
              :force-use-logarithmic-scale="forceAgentsUsageChartUseLogarithmicScale"
              :on-bar-click="handleAgentsUsageBarClick"
            />
          </UsageResultCard>
          <UsageResultCard
            v-else
            :has-content="agentsUsageEstimatedCostChart.labels.length > 0"
            :is-loading="state.isLoading"
          >
            <UsageBarChart
              v-model:use-logarithmic-scale="state.agentsUsageChartUseLogarithmicScale"
              :chart="agentsUsageEstimatedCostChart"
              enable-logarithmic-scale
              :force-use-logarithmic-scale="forceAgentsUsageChartUseLogarithmicScale"
              :on-bar-click="handleAgentsUsageBarClick"
            />
          </UsageResultCard>
        </UsageResultCardFrame>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <UsageResultCard
          :has-content="agentsUsageTableItems.length > 0"
          :is-loading="state.isLoading"
          :title="$t('__titleUsageDetailsByAgent')"
        >
          <AppTable
            :headers="agentsUsageTableHeaders"
            :items="agentsUsageTableItems"
            item-value="agentId"
            enable-expand
            :is-expanded-row-visible="hasAgentResourceItems"
            :server-side="false"
            density="compact"
            bordered
            hide-details
          >
            <template #header.estimatedCost="slotProps">
              <AppTableColumnHeader
                :slot-props="slotProps"
                :title="$t('__fieldUsageEstimatedCost')"
                :tooltip="$t('__tooltipUsageEstimatedCost')"
              />
            </template>
            <template #header.avgCostPerSession="slotProps">
              <AppTableColumnHeader
                :slot-props="slotProps"
                :title="$t('__fieldUsageAvgCostPerSession')"
                :tooltip="$t('__tooltipUsageAvgCostPerSession')"
              />
            </template>
            <template #item.agentName="{ item, column }">
              <div class="d-flex align-center ga-2 py-2">
                <AppDisplayField
                  :item="{
                    ...column,
                    value: item.agentName,
                    link: column.link ? column.link(item) : null,
                  }"
                />
                <AppTooltip
                  v-if="item.isDeleted"
                  :text="$t('__tooltipUsageResourceDeleted', { resourceType: $t('__fieldAgent') })"
                  location="top"
                >
                  <template #default="{ props: tooltipProps }">
                    <v-icon
                      v-bind="tooltipProps"
                      :icon="IconConstant.Base.INFO"
                      size="x-small"
                      color="disabled"
                    />
                  </template>
                </AppTooltip>
              </div>
            </template>
            <template #item.resources="{ value }">
              <div
                v-if="value.length > 0"
                class="d-flex flex-wrap ga-1"
              >
                <AppChip
                  v-for="resource in value"
                  :key="resource.id"
                  :icon="resource.icon"
                  :icon-path="resource.iconPath"
                  :icon-path-mask-color="resource.iconPathMaskColor"
                  :text="resource.title"
                />
              </div>
              <template v-else>
                -
              </template>
            </template>
            <template #expanded-row="{ item }">
              <div class="d-flex flex-column ga-4 pa-4">
                <UsageResourceDetailTable
                  v-for="resourceItem in getAgentResourceItems(item)"
                  :key="resourceItem.resourceType"
                  :i18n-title="resourceItem.i18nTitle"
                  :resource-type="resourceItem.resourceType"
                  :rows="resourceItem.detailRows"
                  :total-call-count="resourceItem.totalCallCount"
                />
              </div>
            </template>
          </AppTable>
        </UsageResultCard>
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
