<script setup>
import { ChartConstant, DateConstant, IconConstant, ResourceConstant, UsageConstant } from '~/constants';
import { BarChartScaleHelper } from '~/models/ui/chart';
import { UsageChartConfig, UsageDataHelper, UsageKpiDetailsHelper, UsageResourceDataHelper, UsageWorkflowDataHelper } from '~/models/ui/usage';

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
  resourceTypes: [ResourceConstant.Type.WORKFLOW.value],
});

const dailyWorkflowTokenUsagePreset = UsageConstant.Preset.DAILY_WORKFLOW_TOKEN_USAGE;
const dailyExecutionsPreset = UsageConstant.Preset.DAILY_EXECUTIONS;
const workflowsExecutionsAndUsersPreset = UsageConstant.Preset.WORKFLOWS_EXECUTIONS_AND_USERS;
const workflowsSearchEngineUsagePreset = UsageConstant.Preset.WORKFLOWS_SEARCH_ENGINE_USAGE;

const DAILY_WORKFLOW_CHART_HEIGHT = 300;
const WORKFLOWS_USAGE_CHART_HEIGHT = 500;
const WORKFLOWS_USAGE_CHART_BAR_LIMIT = 20;

const state = reactive({
  pricingTable: {},
  isLoading: false,
  refreshRequest: 0,
  dailyUsageChartVariant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
  modelDistributionChartVariant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
  workflowsUsageChartVariant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
  workflowsUsageChartUseLogarithmicScale: false,
  dailyWorkflowUsageRows: null,
  dailyExecutionsRows: null,
  workflowsExecutionsAndUsersRows: null,
  workflowsSearchEngineUsageRows: null,
});

const filteredDailyWorkflowUsageRows = computed(() => (
  (state.dailyWorkflowUsageRows ?? []).filter(row => row.workflowId)
));

const dailyWorkflowExecutionChartRows = computed(() => (
  UsageWorkflowDataHelper.buildDailyExecutionChartRows({
    dailyExecutionsRows: state.dailyExecutionsRows,
    startDate: startDate.value,
    endDate: endDate.value,
  })
));

const getWorkflowResource = workflowId => ({
  resourceId: workflowId,
  resourceType: ResourceConstant.Type.WORKFLOW.value,
});

const getWorkflowDisplayName = workflowId => getResourceName(getWorkflowResource(workflowId));
const getWorkflowUsagePagePath = workflowId => `/usage/workflows/${workflowId}`;

const workflowsModelBreakdownRows = computed(() => (
  UsageWorkflowDataHelper.buildWorkflowsModelBreakdownRows({
    dailyWorkflowUsageRows: filteredDailyWorkflowUsageRows.value,
    pricingTable: state.pricingTable,
  })
));

const workflowsUsageTableItems = computed(() => (
  UsageWorkflowDataHelper.buildWorkflowsUsageTableItems({
    dailyWorkflowUsageRows: filteredDailyWorkflowUsageRows.value,
    workflowsExecutionsAndUsersRows: state.workflowsExecutionsAndUsersRows ?? [],
    pricingTable: state.pricingTable,
    getWorkflowDisplayName,
  })
));

const workflowsUsageSummary = computed(() => (
  UsageWorkflowDataHelper.buildWorkflowsUsageSummary({
    dailyWorkflowUsageRows: filteredDailyWorkflowUsageRows.value,
    workflowsExecutionsAndUsersRows: state.workflowsExecutionsAndUsersRows ?? [],
    pricingTable: state.pricingTable,
  })
));

const workflowsUsageTokenDetails = computed(() => UsageKpiDetailsHelper.buildTokenDetails({
  metricTotals: workflowsUsageSummary.value,
}));

const workflowsUsageEstimatedCostDetails = computed(() => UsageKpiDetailsHelper.buildEstimatedCostDetails({
  metricTotals: workflowsUsageSummary.value,
}));

const limitedWorkflowsUsageChartRows = computed(() => (
  workflowsUsageTableItems.value.slice(0, WORKFLOWS_USAGE_CHART_BAR_LIMIT)
));

const shouldShowWorkflowsUsageChartLimitNote = computed(() => (
  workflowsUsageTableItems.value.length > WORKFLOWS_USAGE_CHART_BAR_LIMIT
));

const {
  hasResourceItems: hasWorkflowResourceItems,
  getResourceItems: getWorkflowResourceItems,
  getResourceChipItems: getWorkflowResourceChipItems,
} = useUsageResourceBreakdown({
  entityKey: ResourceConstant.Type.WORKFLOW.id,
  entityIdGetter: item => item.workflowId,
  rows: computed(() => state.workflowsSearchEngineUsageRows),
});

const navigateToWorkflow = (workflowId) => {
  if (!workflowId) {
    return;
  }

  navigateTo(getWorkflowUsagePagePath(workflowId));
};

const handleWorkflowsUsageBarClick = ({ dataIndex }) => {
  navigateToWorkflow(limitedWorkflowsUsageChartRows.value[dataIndex]?.workflowId);
};

const workflowsModelTokenDistributionChart = computed(() => UsageChartConfig.buildModelDistribution({
  rows: workflowsModelBreakdownRows.value,
  variant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
}));

const workflowsModelEstimatedCostDistributionChart = computed(() => UsageChartConfig.buildModelDistribution({
  rows: workflowsModelBreakdownRows.value,
  variant: UsageConstant.ChartVariant.ESTIMATED_COST.value,
}));

const dailyWorkflowExecutionsChart = computed(() => {
  const rows = dailyWorkflowExecutionChartRows.value;

  return new UsageChartConfig({
    type: ChartConstant.Type.BAR.value,
    direction: ChartConstant.Direction.VERTICAL.value,
    i18nTitle: '__titleUsageDailyExecutions',
    height: DAILY_WORKFLOW_CHART_HEIGHT,
    showTooltipTotal: false,
    valueFormat: UsageConstant.ValueFormat.NUMBER.value,
    datasets: [
      {
        data: rows.map(row => row.executionCount),
        label: t('__fieldUsageExecutions'),
      },
    ],
    labels: rows.map(row => dayjs(row.date).format(DateConstant.Format.MONTH_DATE)),
  });
});

const dailyWorkflowUsageChartRows = computed(() => (
  UsageDataHelper.buildDailyUsageChartRows({
    rows: filteredDailyWorkflowUsageRows.value,
    pricingTable: state.pricingTable,
    startDate: startDate.value,
    endDate: endDate.value,
  })
));

const dailyWorkflowTokenChart = computed(() => {
  const rows = dailyWorkflowUsageChartRows.value;

  return new UsageChartConfig({
    type: ChartConstant.Type.BAR.value,
    direction: ChartConstant.Direction.VERTICAL.value,
    i18nTitle: '__titleUsageDailyTokens',
    height: DAILY_WORKFLOW_CHART_HEIGHT,
    valueFormat: UsageConstant.ValueFormat.NUMBER.value,
    datasets: UsageDataHelper.buildTokenStackDatasets({
      rows,
    }),
    labels: rows.map(row => dayjs(row.date).format(DateConstant.Format.MONTH_DATE)),
  });
});

const dailyWorkflowEstimatedCostChart = computed(() => {
  const rows = dailyWorkflowUsageChartRows.value;

  return new UsageChartConfig({
    type: ChartConstant.Type.BAR.value,
    direction: ChartConstant.Direction.VERTICAL.value,
    i18nTitle: '__titleUsageDailyEstimatedCost',
    i18nTooltip: '__tooltipUsageEstimatedCost',
    height: DAILY_WORKFLOW_CHART_HEIGHT,
    valueFormat: UsageConstant.ValueFormat.CURRENCY.value,
    datasets: UsageDataHelper.buildEstimatedCostStackDatasets({
      rows,
    }),
    labels: rows.map(row => dayjs(row.date).format(DateConstant.Format.MONTH_DATE)),
  });
});

const workflowsUsageTokenChart = computed(() => {
  const rows = limitedWorkflowsUsageChartRows.value;

  return new UsageChartConfig({
    type: ChartConstant.Type.BAR.value,
    direction: ChartConstant.Direction.HORIZONTAL.value,
    i18nTitle: '__titleUsageTokensByWorkflow',
    height: WORKFLOWS_USAGE_CHART_HEIGHT,
    valueFormat: UsageConstant.ValueFormat.NUMBER.value,
    datasets: UsageDataHelper.buildTokenStackDatasets({
      rows,
    }),
    resourceType: ResourceConstant.Type.WORKFLOW.value,
    labels: rows.map(row => row.workflowName),
    labelsMetadata: rows.map(row => ({
      isDeleted: row.isDeleted ?? false,
      resourceId: row.workflowId,
    })),
  });
});

const workflowsUsageEstimatedCostChart = computed(() => {
  const rows = limitedWorkflowsUsageChartRows.value;

  return new UsageChartConfig({
    type: ChartConstant.Type.BAR.value,
    direction: ChartConstant.Direction.HORIZONTAL.value,
    i18nTitle: '__titleUsageEstimatedCostByWorkflow',
    i18nTooltip: '__tooltipUsageEstimatedCost',
    height: WORKFLOWS_USAGE_CHART_HEIGHT,
    valueFormat: UsageConstant.ValueFormat.CURRENCY.value,
    datasets: UsageDataHelper.buildEstimatedCostStackDatasets({
      rows,
    }),
    resourceType: ResourceConstant.Type.WORKFLOW.value,
    labels: rows.map(row => row.workflowName),
    labelsMetadata: rows.map(row => ({
      isDeleted: row.isDeleted ?? false,
      resourceId: row.workflowId,
    })),
  });
});

const forceWorkflowsUsageChartUseLogarithmicScale = computed(() => (
  [
    workflowsUsageTokenChart.value,
    workflowsUsageEstimatedCostChart.value,
  ].some(chart => BarChartScaleHelper.canUseLogarithmicScale(chart))
));

const workflowsUsageTableHeaders = computed(() => ([
  {
    key: 'workflowName',
    link: item => item.workflowId ? ({ href: getWorkflowUsagePagePath(item.workflowId) }) : null,
    title: t('__fieldWorkflow'),
  },
  {
    key: 'totalTokens',
    sortable: true,
    title: t('__fieldUsageTotalTokens'),
    isNumber: true,
  },
  {
    key: 'executions',
    sortable: true,
    title: t('__fieldUsageExecutions'),
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
    key: 'avgCostPerExecution',
    sortable: true,
    title: t('__fieldUsageAvgCostPerExecution'),
    isCurrency: true,
    numberOptions: {
      decimalPlaces: 4,
    },
  },
  {
    key: 'resources',
    title: t('__fieldResource', 2),
    value: getWorkflowResourceChipItems,
  },
]));

const kpiCards = computed(() => ([
  {
    icon: UsageConstant.Kpi.WORKFLOWS.icon,
    i18nTitle: UsageConstant.Kpi.EXECUTIONS.i18nTitle,
    isLoading: state.isLoading,
    value: numUtils.format(workflowsUsageSummary.value.totalExecutions),
    secondaryI18nTitle: UsageConstant.Kpi.WORKFLOWS.i18nTitle,
    secondaryValue: numUtils.format(workflowsUsageSummary.value.workflowCount),
  },
  {
    icon: UsageConstant.Kpi.TOTAL_TOKENS.icon,
    i18nTitle: UsageConstant.Kpi.TOTAL_TOKENS.i18nTitle,
    isLoading: state.isLoading,
    value: numUtils.format(workflowsUsageSummary.value.totalTokens),
    details: workflowsUsageTokenDetails.value,
  },
  {
    icon: UsageConstant.Kpi.ESTIMATED_COST.icon,
    i18nTitle: UsageConstant.Kpi.ESTIMATED_COST.i18nTitle,
    i18nTooltip: UsageConstant.Kpi.ESTIMATED_COST.i18nTooltip,
    isLoading: state.isLoading,
    value: `$${numUtils.format(workflowsUsageSummary.value.estimatedCost, 2)}`,
    details: workflowsUsageEstimatedCostDetails.value,
  },
]));

const collectUsageResources = () => (
  UsageResourceDataHelper.collectResourceRefsFromRows([
    { rows: workflowsUsageTableItems.value, idField: 'workflowId', resourceType: ResourceConstant.Type.WORKFLOW.value },
  ])
);

const loadUsageData = async () => {
  const requestId = ++state.refreshRequest;
  state.isLoading = true;

  try {
    const [
      pricingTable,
      dailyWorkflowUsageResult,
      dailyExecutionsResult,
      workflowsExecutionsAndUsersResult,
      workflowsSearchEngineUsageResult,
    ] = await Promise.all([
      fetchModelPricingTable(),
      fetchUsageData({
        preset: dailyWorkflowTokenUsagePreset,
        startDate: startDate.value,
        endDate: endDate.value,
      }),
      fetchUsageData({
        preset: dailyExecutionsPreset,
        startDate: startDate.value,
        endDate: endDate.value,
      }),
      fetchUsageData({
        preset: workflowsExecutionsAndUsersPreset,
        startDate: startDate.value,
        endDate: endDate.value,
      }),
      fetchUsageData({
        preset: workflowsSearchEngineUsagePreset,
        startDate: startDate.value,
        endDate: endDate.value,
      }),
    ]);

    if (requestId !== state.refreshRequest) {
      return;
    }

    state.pricingTable = pricingTable ?? {};

    if (dailyWorkflowUsageResult) {
      state.dailyWorkflowUsageRows = dailyWorkflowUsageResult.rows;
    }

    if (dailyExecutionsResult) {
      state.dailyExecutionsRows = dailyExecutionsResult.rows;
    }

    if (workflowsExecutionsAndUsersResult) {
      state.workflowsExecutionsAndUsersRows = workflowsExecutionsAndUsersResult.rows;
    }

    if (workflowsSearchEngineUsageResult) {
      state.workflowsSearchEngineUsageRows = workflowsSearchEngineUsageResult.rows;
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
          :icon="UsageConstant.Kpi.WORKFLOWS.icon"
          class="mr-2"
          color="primary"
          size="small"
        />
        <span class="text-h6">
          {{ $t('__titleUsageWorkflowAnalysis') }}
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
          :has-content="dailyWorkflowExecutionsChart.labels.length > 0"
          :is-loading="state.isLoading"
          :title="$t(dailyWorkflowExecutionsChart.i18nTitle)"
        >
          <UsageBarChart :chart="dailyWorkflowExecutionsChart" />
        </UsageResultCard>
      </v-col>
      <v-col cols="12">
        <UsageResultCardFrame
          :title="state.dailyUsageChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value ? $t(dailyWorkflowTokenChart.i18nTitle) : $t(dailyWorkflowEstimatedCostChart.i18nTitle)"
          :tooltip="state.dailyUsageChartVariant === UsageConstant.ChartVariant.ESTIMATED_COST.value ? $t(dailyWorkflowEstimatedCostChart.i18nTooltip) : ''"
        >
          <template #actions>
            <UsageChartVariantButtonToggle v-model="state.dailyUsageChartVariant" />
          </template>
          <UsageResultCard
            v-if="state.dailyUsageChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value"
            :has-content="dailyWorkflowTokenChart.labels.length > 0"
            :is-loading="state.isLoading"
          >
            <UsageBarChart :chart="dailyWorkflowTokenChart" />
          </UsageResultCard>
          <UsageResultCard
            v-else
            :has-content="dailyWorkflowEstimatedCostChart.labels.length > 0"
            :is-loading="state.isLoading"
          >
            <UsageBarChart :chart="dailyWorkflowEstimatedCostChart" />
          </UsageResultCard>
        </UsageResultCardFrame>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <UsageResultCardFrame
          :title="state.modelDistributionChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value ? $t(workflowsModelTokenDistributionChart.i18nTitle) : $t(workflowsModelEstimatedCostDistributionChart.i18nTitle)"
          :tooltip="state.modelDistributionChartVariant === UsageConstant.ChartVariant.ESTIMATED_COST.value ? $t(workflowsModelEstimatedCostDistributionChart.i18nTooltip) : ''"
        >
          <template #actions>
            <UsageModelTokenBreakdownDialog
              :usage-rows="filteredDailyWorkflowUsageRows"
              :pricing-table="state.pricingTable"
              :loading="state.isLoading"
            />
            <UsageChartVariantButtonToggle v-model="state.modelDistributionChartVariant" />
          </template>
          <UsageResultCard
            v-if="state.modelDistributionChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value"
            :has-content="workflowsModelTokenDistributionChart.labels.length > 0"
            :is-loading="state.isLoading"
          >
            <UsageDonutChart :chart="workflowsModelTokenDistributionChart" />
          </UsageResultCard>
          <UsageResultCard
            v-else
            :has-content="workflowsModelEstimatedCostDistributionChart.labels.length > 0"
            :is-loading="state.isLoading"
          >
            <UsageDonutChart :chart="workflowsModelEstimatedCostDistributionChart" />
          </UsageResultCard>
        </UsageResultCardFrame>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <UsageResultCardFrame
          :title="state.workflowsUsageChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value ? $t(workflowsUsageTokenChart.i18nTitle) : $t(workflowsUsageEstimatedCostChart.i18nTitle)"
          :tooltip="state.workflowsUsageChartVariant === UsageConstant.ChartVariant.ESTIMATED_COST.value ? $t(workflowsUsageEstimatedCostChart.i18nTooltip) : ''"
          :show-chart-limit-note="shouldShowWorkflowsUsageChartLimitNote"
          :chart-limit="WORKFLOWS_USAGE_CHART_BAR_LIMIT"
          :is-loading="state.isLoading"
        >
          <template #actions>
            <UsageChartVariantButtonToggle v-model="state.workflowsUsageChartVariant" />
          </template>
          <UsageResultCard
            v-if="state.workflowsUsageChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value"
            :has-content="workflowsUsageTokenChart.labels.length > 0"
            :is-loading="state.isLoading"
          >
            <UsageBarChart
              v-model:use-logarithmic-scale="state.workflowsUsageChartUseLogarithmicScale"
              :chart="workflowsUsageTokenChart"
              enable-logarithmic-scale
              :force-use-logarithmic-scale="forceWorkflowsUsageChartUseLogarithmicScale"
              :on-bar-click="handleWorkflowsUsageBarClick"
            />
          </UsageResultCard>
          <UsageResultCard
            v-else
            :has-content="workflowsUsageEstimatedCostChart.labels.length > 0"
            :is-loading="state.isLoading"
          >
            <UsageBarChart
              v-model:use-logarithmic-scale="state.workflowsUsageChartUseLogarithmicScale"
              :chart="workflowsUsageEstimatedCostChart"
              enable-logarithmic-scale
              :force-use-logarithmic-scale="forceWorkflowsUsageChartUseLogarithmicScale"
              :on-bar-click="handleWorkflowsUsageBarClick"
            />
          </UsageResultCard>
        </UsageResultCardFrame>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <UsageResultCard
          :has-content="workflowsUsageTableItems.length > 0"
          :is-loading="state.isLoading"
          :title="$t('__titleUsageDetailsByWorkflow')"
        >
          <AppTable
            :headers="workflowsUsageTableHeaders"
            :items="workflowsUsageTableItems"
            item-value="workflowId"
            enable-expand
            :is-expanded-row-visible="hasWorkflowResourceItems"
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
            <template #header.avgCostPerExecution="slotProps">
              <AppTableColumnHeader
                :slot-props="slotProps"
                :title="$t('__fieldUsageAvgCostPerExecution')"
                :tooltip="$t('__tooltipUsageAvgCostPerExecution')"
              />
            </template>
            <template #item.workflowName="{ item, column }">
              <div class="d-flex align-center ga-2 py-2">
                <AppDisplayField
                  :item="{
                    ...column,
                    value: item.workflowName,
                    link: column.link ? column.link(item) : null,
                  }"
                />
                <AppTooltip
                  v-if="item.isDeleted"
                  :text="$t('__tooltipUsageResourceDeleted', { resourceType: $t('__fieldWorkflow') })"
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
                  v-for="resourceItem in getWorkflowResourceItems(item)"
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
