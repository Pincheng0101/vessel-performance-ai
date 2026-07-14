<script setup>
import { ChartConstant, DateConstant, IconConstant, ResourceConstant, UsageConstant } from '~/constants';
import { UsageChartConfig, UsageDataHelper, UsageKpiDetailsHelper, UsageResourceDataHelper, UsageWorkflowDataHelper } from '~/models/ui/usage';

definePageMeta({
  layout: 'fluid',
});

const authStore = useAuthStore();
const breadcrumbStore = useBreadcrumbStore();
const dayjs = useDayjs();
const route = useRoute();
const { fetchModelPricingTable, fetchUsageData } = useMetering();
const { t } = useI18n();
const { startDate, endDate } = useUsageDateRange();
const { getPrimaryColor, getSecondaryColor } = useChartColors();
const { getUsageModelColorMap } = useUsageChartColors();
const {
  currentResource: workflow,
  getResourceLink,
  getResourceName,
  loadCurrentResource,
  loadResourceMap,
} = useUsageResourceMap();

const WORKFLOW_RESOURCE_TYPE = ResourceConstant.Type.WORKFLOW.value;
const WORKFLOW_ID_KEY = UsageResourceDataHelper.getUsageResourceIdKey(WORKFLOW_RESOURCE_TYPE);
const ORIGINAL_WORKFLOW_ID_KEY = UsageResourceDataHelper.getUsageOriginalResourceIdKey(WORKFLOW_RESOURCE_TYPE);

const workflowOriginalTokenUsagePreset = UsageConstant.Preset.WORKFLOW_ORIGINAL_TOKEN_USAGE;
const workflowTokenUsagePreset = UsageConstant.Preset.WORKFLOW_TOKEN_USAGE;
const workflowOriginalSearchEngineUsagePreset = UsageConstant.Preset.WORKFLOW_ORIGINAL_SEARCH_ENGINE_USAGE;
const workflowSearchEngineUsagePreset = UsageConstant.Preset.WORKFLOW_SEARCH_ENGINE_USAGE;

const KPI_CARD_HEIGHT = 100;
const DAILY_CHART_HEIGHT = 300;
const DONUT_CHART_MIN_HEIGHT = 240;

const state = reactive({
  pricingTable: {},
  isLoading: false,
  refreshRequest: 0,
  dailyUsageChartVariant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
  modelDistributionChartVariant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
  directExecutionModelDistributionChartVariant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
  directExecutionResourceDistributionChartVariant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
  callerModelDistributionChartVariant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
  workflowOriginalUsageRows: null,
  workflowUsageRows: null,
  workflowOriginalSearchEngineUsageRows: null,
  workflowSearchEngineUsageRows: null,
  isWorkflowDeleted: false,
});

const workflowId = computed(() => String(route.params.id));
const workflowDetailPath = computed(() => resourceUtils.getUrl(ResourceConstant.Type.WORKFLOW.value, workflowId.value));
const workflowDisplayName = computed(() => workflow.value?.name || workflowId.value);
const deletedResourceTooltip = computed(() => (
  t('__tooltipUsageResourceDeleted', { resourceType: t(ResourceConstant.Type.WORKFLOW.i18nTitle) })
));

watch([workflowId, workflowDisplayName], ([id, displayName]) => {
  breadcrumbStore.setBreadcrumb(id, displayName);
}, { immediate: true });

const workflowUsageData = computed(() => UsageWorkflowDataHelper.buildWorkflowUsageData({
  workflowId: workflowId.value,
  workflowOriginalUsageRows: state.workflowOriginalUsageRows,
  workflowUsageRows: state.workflowUsageRows,
  pricingTable: state.pricingTable,
}));

const usageTabs = computed(() => ([
  { title: t('__titleUsageOverview'), value: 'overview' },
  { title: t('__titleUsageDirectExecutionsTab'), value: 'direct-executions' },
  { title: t('__titleUsageCallerTab'), value: 'caller' },
]));

const getUsageBreakdownLabel = (item) => {
  if (item.rowType === UsageConstant.RowType.SELF_WORKFLOW.value) {
    return `${t('__fieldUsageSelfWorkflow')} - ${workflowDisplayName.value}`;
  }

  if (item.i18nLabel) {
    return t(item.i18nLabel);
  }

  return getResourceName(item);
};

const workflowOverviewUsageData = computed(() => (
  UsageWorkflowDataHelper.buildWorkflowOverviewUsageData({
    workflowUsageData: workflowUsageData.value,
    startDate: startDate.value,
    endDate: endDate.value,
  })
));

const overviewSummary = computed(() => workflowOverviewUsageData.value.summary);
const overviewDailyUsageRows = computed(() => workflowOverviewUsageData.value.dailyUsageRows);
const overviewModelUsageRows = computed(() => workflowOverviewUsageData.value.modelBreakdownRows);

const directExecutionResourceBreakdown = computed(() => (
  UsageWorkflowDataHelper.buildWorkflowDirectExecutionResourceBreakdown(workflowUsageData.value)
));

const callerBreakdown = computed(() => (
  UsageWorkflowDataHelper.buildWorkflowCallerBreakdown(workflowUsageData.value)
));

const searchEngineUsageRows = computed(() => UsageResourceDataHelper.buildDetailSearchEngineUsageRows({
  currentEntityId: workflowId.value,
  entityType: WORKFLOW_RESOURCE_TYPE,
  originalRows: state.workflowOriginalSearchEngineUsageRows,
  ownRows: state.workflowSearchEngineUsageRows,
}));

const overviewSearchEngineItem = computed(() => (
  UsageResourceDataHelper.buildSearchEngineItemWithInstances({
    getResourceLink,
    getResourceName,
    rows: searchEngineUsageRows.value.overviewRows,
  })
));

const directExecutionSearchEngineItem = computed(() => (
  UsageResourceDataHelper.buildSearchEngineItemWithInstances({
    getResourceLink,
    getResourceName,
    rows: searchEngineUsageRows.value.asRootRows,
  })
));

const callerSearchEngineItem = computed(() => (
  UsageResourceDataHelper.buildSearchEngineItemWithInstances({
    getResourceLink,
    getResourceName,
    rows: searchEngineUsageRows.value.callerRows,
  })
));

const sourceBreakdownSearchEngineMap = computed(() => (
  UsageResourceDataHelper.mapSearchEngineByBreakdownRow({
    currentEntityId: workflowId.value,
    entityType: WORKFLOW_RESOURCE_TYPE,
    getResourceLink,
    getResourceName,
    isCaller: false,
    rows: searchEngineUsageRows.value.sourceBreakdownRows,
  })
));

const callerBreakdownSearchEngineMap = computed(() => (
  UsageResourceDataHelper.mapSearchEngineByBreakdownRow({
    currentEntityId: workflowId.value,
    entityType: WORKFLOW_RESOURCE_TYPE,
    getResourceLink,
    getResourceName,
    isCaller: true,
    rows: searchEngineUsageRows.value.callerRows,
  })
));

const overviewResourceItems = computed(() => UsageResourceDataHelper.buildResourceItems({
  getColor: getSecondaryColor,
  items: [overviewSearchEngineItem.value],
}));

const directExecutionResourceItems = computed(() => UsageResourceDataHelper.buildResourceItems({
  getColor: getSecondaryColor,
  items: [directExecutionSearchEngineItem.value],
}));

const callerResourceItems = computed(() => UsageResourceDataHelper.buildResourceItems({
  getColor: getSecondaryColor,
  items: [callerSearchEngineItem.value],
}));

const directExecutionModelUsageRows = computed(() => [
  ...(workflowUsageData.value.workflowDirectExecutionRows ?? []),
  ...(workflowUsageData.value.workflowDelegatedResourceRows ?? []),
]);

const callerModelUsageRows = computed(() => [
  ...(workflowUsageData.value.workflowCallerRows ?? []),
]);

const directExecutionModelUsageBreakdownRows = computed(() => (
  UsageDataHelper.buildModelBreakdownRows({
    rows: directExecutionModelUsageRows.value,
  })
));

const callerModelUsageBreakdownRows = computed(() => (
  UsageDataHelper.buildModelBreakdownRows({
    rows: callerModelUsageRows.value,
  })
));

const directExecutionModelDistributionColorMap = computed(() => (
  getUsageModelColorMap({
    rows: directExecutionModelUsageBreakdownRows.value,
  })
));

const callerModelDistributionColorMap = computed(() => (
  getUsageModelColorMap({
    rows: callerModelUsageBreakdownRows.value,
  })
));

const getDirectExecutionResourceDonutColors = (rows) => {
  let resourceIndex = 0;

  return rows.map((row) => {
    if (row.rowType === UsageConstant.RowType.SELF_WORKFLOW.value) {
      return getPrimaryColor();
    }

    const color = getSecondaryColor(resourceIndex);
    resourceIndex += 1;
    return color;
  });
};

const buildModelTokenChart = rows => UsageChartConfig.buildModelDistribution({
  rows,
  variant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
});

const buildModelEstimatedCostChart = rows => UsageChartConfig.buildModelDistribution({
  rows,
  variant: UsageConstant.ChartVariant.ESTIMATED_COST.value,
});

const formatKpiNumber = value => numUtils.format(Number(value ?? 0));
const formatKpiCurrency = value => `$${numUtils.format(Number(value ?? 0), 2)}`;
const buildKpiTokenBreakdownDetails = ({ columns, percentageTotal }) => UsageKpiDetailsHelper.buildTokenBreakdownDetails({
  columns,
  percentageTotal,
  valueFormatter: formatKpiNumber,
});
const buildKpiEstimatedCostBreakdownDetails = ({ columns, percentageTotal }) => UsageKpiDetailsHelper.buildEstimatedCostBreakdownDetails({
  columns,
  percentageTotal,
  valueFormatter: formatKpiCurrency,
});

const overviewKpiCards = computed(() => ([
  {
    height: KPI_CARD_HEIGHT,
    icon: UsageConstant.Kpi.EXECUTIONS.icon,
    i18nTitle: '__fieldUsageExecutions',
    isLoading: state.isLoading,
    value: numUtils.format(overviewSummary.value.executions),
  },
  {
    height: KPI_CARD_HEIGHT,
    icon: UsageConstant.Kpi.TOTAL_TOKENS.icon,
    details: buildKpiTokenBreakdownDetails({
      percentageTotal: overviewSummary.value.totalTokens,
      columns: [
        {
          i18nTitle: '__titleUsageDirectExecutionsTab',
          metricTotals: directExecutionResourceBreakdown.value.selfWorkflowRow,
        },
        {
          i18nTitle: '__titleUsageCallerTab',
          metricTotals: callerBreakdown.value.totalRow,
        },
      ],
    }),
    i18nTitle: UsageConstant.Kpi.TOTAL_TOKENS.i18nTitle,
    isLoading: state.isLoading,
    value: formatKpiNumber(overviewSummary.value.totalTokens),
  },
  {
    height: KPI_CARD_HEIGHT,
    icon: UsageConstant.Kpi.ESTIMATED_COST.icon,
    details: buildKpiEstimatedCostBreakdownDetails({
      percentageTotal: overviewSummary.value.estimatedCost,
      columns: [
        {
          i18nTitle: '__titleUsageDirectExecutionsTab',
          metricTotals: directExecutionResourceBreakdown.value.selfWorkflowRow,
        },
        {
          i18nTitle: '__titleUsageCallerTab',
          metricTotals: callerBreakdown.value.totalRow,
        },
      ],
    }),
    i18nTitle: UsageConstant.Kpi.ESTIMATED_COST.i18nTitle,
    i18nTooltip: UsageConstant.Kpi.ESTIMATED_COST.i18nTooltip,
    isLoading: state.isLoading,
    value: formatKpiCurrency(overviewSummary.value.estimatedCost),
  },
]));

const directExecutionKpiCards = computed(() => ([
  {
    icon: UsageConstant.Kpi.EXECUTIONS.icon,
    i18nTitle: '__titleUsageDirectExecutions',
    isLoading: state.isLoading,
    value: numUtils.format(directExecutionResourceBreakdown.value.directExecutions),
  },
  {
    icon: UsageConstant.Kpi.TOTAL_TOKENS.icon,
    details: buildKpiTokenBreakdownDetails({
      percentageTotal: directExecutionResourceBreakdown.value.fullFlowTotalTokens,
      columns: [
        {
          i18nTitle: '__fieldUsageSelfWorkflow',
          metricTotals: directExecutionResourceBreakdown.value.selfWorkflowRow,
        },
        {
          i18nTitle: '__fieldUsageDelegated',
          metricTotals: directExecutionResourceBreakdown.value.calledResourcesSubtotalRow,
        },
      ],
    }),
    i18nTitle: '__titleUsageFullFlowTotalTokens',
    isLoading: state.isLoading,
    value: formatKpiNumber(directExecutionResourceBreakdown.value.fullFlowTotalTokens),
  },
  {
    icon: UsageConstant.Kpi.ESTIMATED_COST.icon,
    details: buildKpiEstimatedCostBreakdownDetails({
      percentageTotal: directExecutionResourceBreakdown.value.fullFlowEstimatedCost,
      columns: [
        {
          i18nTitle: '__fieldUsageSelfWorkflow',
          metricTotals: directExecutionResourceBreakdown.value.selfWorkflowRow,
        },
        {
          i18nTitle: '__fieldUsageDelegated',
          metricTotals: directExecutionResourceBreakdown.value.calledResourcesSubtotalRow,
        },
      ],
    }),
    i18nTitle: '__titleUsageFullFlowEstimatedCost',
    i18nTooltip: UsageConstant.Kpi.ESTIMATED_COST.i18nTooltip,
    isLoading: state.isLoading,
    secondaryI18nTitle: '__fieldUsageAvgFullFlowEstimatedCostPerDirectExecution',
    secondaryValue: formatKpiCurrency(directExecutionResourceBreakdown.value.averageFullFlowEstimatedCost),
    value: formatKpiCurrency(directExecutionResourceBreakdown.value.fullFlowEstimatedCost),
  },
]));

const callerKpiCards = computed(() => ([
  {
    icon: UsageConstant.Kpi.EXECUTIONS.icon,
    i18nTitle: '__titleUsageCalls',
    isLoading: state.isLoading,
    value: numUtils.format(callerBreakdown.value.calls),
  },
  {
    icon: UsageConstant.Kpi.TOTAL_TOKENS.icon,
    i18nTitle: '__titleUsageTokensFromCalls',
    isLoading: state.isLoading,
    value: numUtils.format(callerBreakdown.value.totalTokens),
  },
  {
    icon: UsageConstant.Kpi.ESTIMATED_COST.icon,
    i18nTitle: '__titleUsageEstimatedCostFromCalls',
    i18nTooltip: UsageConstant.Kpi.ESTIMATED_COST.i18nTooltip,
    isLoading: state.isLoading,
    secondaryI18nTitle: '__fieldUsageAvgEstimatedCostPerCall',
    secondaryValue: formatKpiCurrency(callerBreakdown.value.averageEstimatedCostPerCall),
    value: formatKpiCurrency(callerBreakdown.value.estimatedCost),
  },
]));

const overviewDailyTokenChart = computed(() => {
  const rows = overviewDailyUsageRows.value;

  return new UsageChartConfig({
    type: ChartConstant.Type.BAR.value,
    direction: ChartConstant.Direction.VERTICAL.value,
    i18nTitle: '__titleUsageDailyTokens',
    height: DAILY_CHART_HEIGHT,
    valueFormat: UsageConstant.ValueFormat.NUMBER.value,
    datasets: UsageDataHelper.buildTokenStackDatasets({
      rows,
    }),
    labels: rows.map(row => dayjs(row.date).format(DateConstant.Format.MONTH_DATE)),
  });
});

const overviewDailyEstimatedCostChart = computed(() => {
  const rows = overviewDailyUsageRows.value;

  return new UsageChartConfig({
    type: ChartConstant.Type.BAR.value,
    direction: ChartConstant.Direction.VERTICAL.value,
    i18nTitle: '__titleUsageDailyEstimatedCost',
    i18nTooltip: '__tooltipUsageEstimatedCost',
    height: DAILY_CHART_HEIGHT,
    valueFormat: UsageConstant.ValueFormat.CURRENCY.value,
    datasets: UsageDataHelper.buildEstimatedCostStackDatasets({
      rows,
    }),
    labels: rows.map(row => dayjs(row.date).format(DateConstant.Format.MONTH_DATE)),
  });
});

const overviewDailyExecutionsChart = computed(() => {
  const rows = overviewDailyUsageRows.value;

  return new UsageChartConfig({
    type: ChartConstant.Type.BAR.value,
    direction: ChartConstant.Direction.VERTICAL.value,
    i18nTitle: '__titleUsageDailyExecutions',
    height: DAILY_CHART_HEIGHT,
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

const overviewModelTokenChart = computed(() => buildModelTokenChart(overviewModelUsageRows.value));

const overviewModelEstimatedCostChart = computed(() => buildModelEstimatedCostChart(overviewModelUsageRows.value));

const directExecutionModelTokenChart = computed(() => buildModelTokenChart(directExecutionModelUsageBreakdownRows.value));

const directExecutionModelEstimatedCostChart = computed(() => buildModelEstimatedCostChart(directExecutionModelUsageBreakdownRows.value));

const callerModelTokenChart = computed(() => buildModelTokenChart(callerModelUsageBreakdownRows.value));

const callerModelEstimatedCostChart = computed(() => buildModelEstimatedCostChart(callerModelUsageBreakdownRows.value));

const directExecutionResourceTokenChart = computed(() => {
  const rows = directExecutionResourceBreakdown.value.tokenDonutRows;

  return new UsageChartConfig({
    type: ChartConstant.Type.DOUGHNUT.value,
    minHeight: DONUT_CHART_MIN_HEIGHT,
    i18nTitle: '__titleUsageSourceTokensDistribution',
    labels: rows.map(row => getUsageBreakdownLabel(row)),
    showTooltipTotal: false,
    valueFormat: UsageConstant.ValueFormat.NUMBER.value,
    datasets: [
      {
        backgroundColor: getDirectExecutionResourceDonutColors(rows),
        data: rows.map(row => row.totalTokens),
      },
    ],
  });
});

const directExecutionResourceEstimatedCostChart = computed(() => {
  const rows = directExecutionResourceBreakdown.value.estimatedCostDonutRows;

  return new UsageChartConfig({
    type: ChartConstant.Type.DOUGHNUT.value,
    minHeight: DONUT_CHART_MIN_HEIGHT,
    i18nTitle: '__titleUsageSourceEstimatedCostDistribution',
    i18nTooltip: '__tooltipUsageEstimatedCost',
    labels: rows.map(row => getUsageBreakdownLabel(row)),
    showTooltipTotal: false,
    valueFormat: UsageConstant.ValueFormat.CURRENCY.value,
    datasets: [
      {
        backgroundColor: getDirectExecutionResourceDonutColors(rows),
        data: rows.map(row => row.estimatedCost),
      },
    ],
  });
});

const getUsageBreakdownCellProps = (item, { isLabel = false } = {}) => {
  const rowType = item.rowType;

  return {
    class: {
      'table-breakdown-cell--child-label': isLabel && rowType === UsageConstant.RowType.CALLED_RESOURCE.value,
      'table-breakdown-cell--summary-label': isLabel && [
        UsageConstant.RowType.SUBTOTAL.value,
        UsageConstant.RowType.TOTAL.value,
      ].includes(rowType),
      'table-breakdown-cell--subtotal': rowType === UsageConstant.RowType.SUBTOTAL.value,
      'table-breakdown-cell--total': rowType === UsageConstant.RowType.TOTAL.value,
    },
  };
};

const directExecutionResourceBreakdownHeaders = computed(() => ([
  {
    cellProps: item => getUsageBreakdownCellProps(item, { isLabel: true }),
    key: 'label',
    value: getUsageBreakdownLabel,
    link: getResourceLink,
  },
  {
    cellProps: getUsageBreakdownCellProps,
    key: 'invocations',
    title: t('__fieldUsageInvocations'),
    isNumber: true,
  },
  {
    cellProps: getUsageBreakdownCellProps,
    key: 'totalTokens',
    title: t('__fieldUsageTotalTokens'),
    isNumber: true,
  },
  {
    cellProps: getUsageBreakdownCellProps,
    key: 'estimatedCost',
    title: t('__fieldUsageEstimatedCost'),
    isCurrency: true,
    numberOptions: {
      decimalPlaces: 4,
    },
  },
  {
    cellProps: getUsageBreakdownCellProps,
    key: 'resources',
    title: t('__fieldResource', 2),
    minWidth: 120,
  },
]));

const callerHeaders = computed(() => ([
  {
    cellProps: item => getUsageBreakdownCellProps(item, { isLabel: true }),
    key: 'label',
    value: getUsageBreakdownLabel,
    link: getResourceLink,
  },
  {
    cellProps: getUsageBreakdownCellProps,
    key: 'invocations',
    title: t('__fieldUsageInvocations'),
    isNumber: true,
  },
  {
    cellProps: getUsageBreakdownCellProps,
    key: 'totalTokens',
    title: t('__fieldUsageTotalTokens'),
    isNumber: true,
  },
  {
    cellProps: getUsageBreakdownCellProps,
    key: 'estimatedCost',
    title: t('__fieldUsageEstimatedCost'),
    isCurrency: true,
    numberOptions: {
      decimalPlaces: 4,
    },
  },
  {
    cellProps: getUsageBreakdownCellProps,
    key: 'resources',
    title: t('__fieldResource', 2),
    minWidth: 120,
  },
]));

const collectUsageResources = () => UsageResourceDataHelper.collectResourceRefs({
  resourceRows: [
    ...directExecutionResourceBreakdown.value.calledResourceRows,
    ...callerBreakdown.value.callerRows,
  ],
  searchEngineItems: [
    overviewSearchEngineItem.value,
    directExecutionSearchEngineItem.value,
    callerSearchEngineItem.value,
    ...sourceBreakdownSearchEngineMap.value.values(),
    ...callerBreakdownSearchEngineMap.value.values(),
  ],
});

const loadWorkflow = async () => {
  state.isWorkflowDeleted = false;
  await loadCurrentResource({
    resourceId: workflowId.value,
    resourceType: ResourceConstant.Type.WORKFLOW.value,
  });
  state.isWorkflowDeleted = !workflow.value;
};

const loadUsageData = async () => {
  const requestId = ++state.refreshRequest;
  state.isLoading = true;

  try {
    const [
      pricingTable,
      workflowOriginalUsageResult,
      workflowUsageResult,
      workflowOriginalSearchEngineUsageResult,
      workflowSearchEngineUsageResult,
    ] = await Promise.all([
      fetchModelPricingTable(),
      fetchUsageData({
        preset: workflowOriginalTokenUsagePreset,
        startDate: startDate.value,
        endDate: endDate.value,
        requestBody: {
          [ORIGINAL_WORKFLOW_ID_KEY]: workflowId.value,
        },
      }),
      fetchUsageData({
        preset: workflowTokenUsagePreset,
        startDate: startDate.value,
        endDate: endDate.value,
        requestBody: {
          [WORKFLOW_ID_KEY]: workflowId.value,
        },
      }),
      fetchUsageData({
        preset: workflowOriginalSearchEngineUsagePreset,
        startDate: startDate.value,
        endDate: endDate.value,
        requestBody: {
          [ORIGINAL_WORKFLOW_ID_KEY]: workflowId.value,
        },
      }),
      fetchUsageData({
        preset: workflowSearchEngineUsagePreset,
        startDate: startDate.value,
        endDate: endDate.value,
        requestBody: {
          [WORKFLOW_ID_KEY]: workflowId.value,
        },
      }),
    ]);

    if (requestId !== state.refreshRequest) {
      return;
    }

    state.pricingTable = pricingTable ?? {};

    if (workflowOriginalUsageResult) {
      state.workflowOriginalUsageRows = workflowOriginalUsageResult.rows;
    }

    if (workflowUsageResult) {
      state.workflowUsageRows = workflowUsageResult.rows;
    }

    if (workflowOriginalSearchEngineUsageResult) {
      state.workflowOriginalSearchEngineUsageRows = workflowOriginalSearchEngineUsageResult.rows;
    }

    if (workflowSearchEngineUsageResult) {
      state.workflowSearchEngineUsageRows = workflowSearchEngineUsageResult.rows;
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

  loadWorkflow();
  loadUsageData();
});
</script>

<template>
  <template v-if="authStore.parsedToken.isAdmin">
    <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-4">
      <div class="w-100 d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon
            :icon="UsageConstant.Kpi.WORKFLOWS.icon"
            class="mr-2"
            color="primary"
            size="small"
          />
          <div class="d-flex align-baseline ga-2">
            <span class="text-h6">
              {{ strUtils.addSpacesAroundAscii($t('__titleUsageAnalysis', { item: workflowDisplayName })) }}
            </span>
            <UsageResourceInfoMenu
              :title="$t('__actionViewWorkflowDetails')"
              :path="workflowDetailPath"
              :disabled="state.isWorkflowDeleted"
              :disabled-tooltip="deletedResourceTooltip"
            />
          </div>
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
    </div>
    <AppTabs
      :items="usageTabs"
      show-divider
    >
      <template #overview>
        <div class="text-caption text-medium-emphasis mb-4">
          {{ $t('__descriptionUsageWorkflowOverview') }}
        </div>
        <v-row>
          <v-col
            v-for="(card, index) in overviewKpiCards"
            :key="index"
            cols="12"
            md="4"
          >
            <UsageKpiCard v-bind="card" />
          </v-col>
        </v-row>
        <v-row>
          <v-col
            cols="12"
            md="12"
          >
            <UsageResultCard
              :has-content="overviewDailyExecutionsChart.labels.length > 0"
              :is-loading="state.isLoading"
              :title="$t(overviewDailyExecutionsChart.i18nTitle)"
            >
              <UsageBarChart :chart="overviewDailyExecutionsChart" />
            </UsageResultCard>
          </v-col>
          <v-col cols="12">
            <UsageResultCardFrame
              :title="state.dailyUsageChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value ? $t(overviewDailyTokenChart.i18nTitle) : $t(overviewDailyEstimatedCostChart.i18nTitle)"
              :tooltip="state.dailyUsageChartVariant === UsageConstant.ChartVariant.ESTIMATED_COST.value ? $t(overviewDailyEstimatedCostChart.i18nTooltip) : ''"
            >
              <template #actions>
                <UsageChartVariantButtonToggle v-model="state.dailyUsageChartVariant" />
              </template>
              <UsageResultCard
                v-if="state.dailyUsageChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value"
                :has-content="overviewDailyTokenChart.labels.length > 0"
                :is-loading="state.isLoading"
              >
                <UsageBarChart :chart="overviewDailyTokenChart" />
              </UsageResultCard>
              <UsageResultCard
                v-else
                :has-content="overviewDailyEstimatedCostChart.labels.length > 0"
                :is-loading="state.isLoading"
              >
                <UsageBarChart :chart="overviewDailyEstimatedCostChart" />
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
              :title="state.modelDistributionChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value ? $t(overviewModelTokenChart.i18nTitle) : $t(overviewModelEstimatedCostChart.i18nTitle)"
              :tooltip="state.modelDistributionChartVariant === UsageConstant.ChartVariant.ESTIMATED_COST.value ? $t(overviewModelEstimatedCostChart.i18nTooltip) : ''"
            >
              <template #actions>
                <UsageModelTokenBreakdownDialog
                  :usage-rows="workflowUsageData.workflowSelfRows"
                  :pricing-table="state.pricingTable"
                  :loading="state.isLoading"
                />
                <UsageChartVariantButtonToggle v-model="state.modelDistributionChartVariant" />
              </template>
              <UsageResultCard
                v-if="state.modelDistributionChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value"
                :has-content="overviewModelTokenChart.labels.length > 0"
                :is-loading="state.isLoading"
              >
                <UsageDonutChart :chart="overviewModelTokenChart" />
              </UsageResultCard>
              <UsageResultCard
                v-else
                :has-content="overviewModelEstimatedCostChart.labels.length > 0"
                :is-loading="state.isLoading"
              >
                <UsageDonutChart :chart="overviewModelEstimatedCostChart" />
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
              :has-content="overviewResourceItems.length > 0"
              :is-loading="state.isLoading"
            >
              <UsageResourceList :items="overviewResourceItems" />
            </UsageResultCard>
          </v-col>
        </v-row>
      </template>
      <template #direct-executions>
        <div class="text-caption text-medium-emphasis mb-4">
          {{ $t('__descriptionUsageWorkflowDirectExecutions') }}
        </div>
        <v-row>
          <v-col
            v-for="(card, index) in directExecutionKpiCards"
            :key="index"
            cols="12"
            md="4"
          >
            <UsageKpiCard v-bind="card" />
          </v-col>
        </v-row>
        <v-row>
          <v-col
            cols="12"
            md="6"
          >
            <UsageResultCardFrame
              :title="state.directExecutionModelDistributionChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value ? $t(directExecutionModelTokenChart.i18nTitle) : $t(directExecutionModelEstimatedCostChart.i18nTitle)"
              :tooltip="state.directExecutionModelDistributionChartVariant === UsageConstant.ChartVariant.ESTIMATED_COST.value ? $t(directExecutionModelEstimatedCostChart.i18nTooltip) : ''"
            >
              <template #actions>
                <UsageModelTokenBreakdownDialog
                  :usage-rows="directExecutionModelUsageRows"
                  :pricing-table="state.pricingTable"
                  :loading="state.isLoading"
                />
                <UsageChartVariantButtonToggle v-model="state.directExecutionModelDistributionChartVariant" />
              </template>
              <UsageResultCard
                v-if="state.directExecutionModelDistributionChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value"
                :has-content="directExecutionModelTokenChart.labels.length > 0"
                :is-loading="state.isLoading"
              >
                <UsageDonutChart :chart="directExecutionModelTokenChart" />
              </UsageResultCard>
              <UsageResultCard
                v-else
                :has-content="directExecutionModelEstimatedCostChart.labels.length > 0"
                :is-loading="state.isLoading"
              >
                <UsageDonutChart :chart="directExecutionModelEstimatedCostChart" />
              </UsageResultCard>
            </UsageResultCardFrame>
          </v-col>
          <v-col
            cols="12"
            md="6"
          >
            <UsageResultCardFrame
              :title="state.directExecutionResourceDistributionChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value ? $t(directExecutionResourceTokenChart.i18nTitle) : $t(directExecutionResourceEstimatedCostChart.i18nTitle)"
              :tooltip="state.directExecutionResourceDistributionChartVariant === UsageConstant.ChartVariant.ESTIMATED_COST.value ? $t(directExecutionResourceEstimatedCostChart.i18nTooltip) : ''"
            >
              <template #actions>
                <UsageChartVariantButtonToggle v-model="state.directExecutionResourceDistributionChartVariant" />
              </template>
              <UsageResultCard
                v-if="state.directExecutionResourceDistributionChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value"
                :has-content="directExecutionResourceTokenChart.labels.length > 0"
                :is-loading="state.isLoading"
              >
                <UsageDonutChart :chart="directExecutionResourceTokenChart" />
              </UsageResultCard>
              <UsageResultCard
                v-else
                :has-content="directExecutionResourceEstimatedCostChart.labels.length > 0"
                :is-loading="state.isLoading"
              >
                <UsageDonutChart :chart="directExecutionResourceEstimatedCostChart" />
              </UsageResultCard>
            </UsageResultCardFrame>
          </v-col>
          <v-col cols="12">
            <UsageResultCard
              :title="$t('__titleUsageResourceByType')"
              :tooltip="$t('__tooltipUsageResourceByType')"
              :has-content="directExecutionResourceItems.length > 0"
              :is-loading="state.isLoading"
            >
              <UsageResourceList :items="directExecutionResourceItems" />
            </UsageResultCard>
          </v-col>
          <v-col cols="12">
            <UsageResultCard
              :has-content="directExecutionResourceBreakdown.fullFlowTotalTokens > 0 || directExecutionResourceBreakdown.fullFlowEstimatedCost > 0"
              :is-loading="state.isLoading"
              :title="$t('__titleUsageSourceBreakdown')"
            >
              <AppTable
                :headers="directExecutionResourceBreakdownHeaders"
                :items="directExecutionResourceBreakdown.tableRows"
                item-value="id"
                :server-side="false"
                density="compact"
                bordered
                enable-expand
                :is-expanded-row-visible="item => item.usageRows?.length > 0 || sourceBreakdownSearchEngineMap.has(item.id)"
                hide-details
              >
                <template #header.estimatedCost="slotProps">
                  <AppTableColumnHeader
                    :slot-props="slotProps"
                    :title="$t('__fieldUsageEstimatedCost')"
                    :tooltip="$t('__tooltipUsageEstimatedCost')"
                  />
                </template>
                <template #item.resources="{ item }">
                  <div
                    v-if="sourceBreakdownSearchEngineMap.has(item.id)"
                    class="d-flex align-center ga-1"
                  >
                    <AppChip
                      :icon="ResourceConstant.Type.SEARCH_ENGINE.icon"
                      :text="$t(ResourceConstant.Type.SEARCH_ENGINE.i18nTitle)"
                    />
                  </div>
                </template>
                <template #expanded-row="{ item }">
                  <div class="d-flex flex-column ga-4 pa-4">
                    <UsageModelTokenBreakdownTable
                      v-if="item.usageRows?.length > 0"
                      :usage-rows="item.usageRows"
                      :pricing-table="state.pricingTable"
                      :model-color-map="directExecutionModelDistributionColorMap"
                    />
                    <UsageResourceDetailTable
                      v-if="sourceBreakdownSearchEngineMap.has(item.id)"
                      :i18n-title="ResourceConstant.Type.SEARCH_ENGINE.i18nTitle"
                      :resource-type="ResourceConstant.Type.SEARCH_ENGINE.value"
                      :rows="sourceBreakdownSearchEngineMap.get(item.id).detailRows"
                      :total-call-count="sourceBreakdownSearchEngineMap.get(item.id).totalCallCount"
                    />
                  </div>
                </template>
              </AppTable>
            </UsageResultCard>
          </v-col>
        </v-row>
      </template>
      <template #caller>
        <div class="text-caption text-medium-emphasis mb-4">
          {{ $t('__descriptionUsageWorkflowCaller') }}
        </div>
        <v-row>
          <v-col
            v-for="(card, index) in callerKpiCards"
            :key="index"
            cols="12"
            md="4"
          >
            <UsageKpiCard v-bind="card" />
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12">
            <UsageResultCardFrame
              :title="state.callerModelDistributionChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value ? $t(callerModelTokenChart.i18nTitle) : $t(callerModelEstimatedCostChart.i18nTitle)"
              :tooltip="state.callerModelDistributionChartVariant === UsageConstant.ChartVariant.ESTIMATED_COST.value ? $t(callerModelEstimatedCostChart.i18nTooltip) : ''"
            >
              <template #actions>
                <UsageModelTokenBreakdownDialog
                  :usage-rows="callerModelUsageRows"
                  :pricing-table="state.pricingTable"
                  :loading="state.isLoading"
                />
                <UsageChartVariantButtonToggle v-model="state.callerModelDistributionChartVariant" />
              </template>
              <UsageResultCard
                v-if="state.callerModelDistributionChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value"
                :has-content="callerModelTokenChart.labels.length > 0"
                :is-loading="state.isLoading"
              >
                <UsageDonutChart :chart="callerModelTokenChart" />
              </UsageResultCard>
              <UsageResultCard
                v-else
                :has-content="callerModelEstimatedCostChart.labels.length > 0"
                :is-loading="state.isLoading"
              >
                <UsageDonutChart :chart="callerModelEstimatedCostChart" />
              </UsageResultCard>
            </UsageResultCardFrame>
          </v-col>
          <v-col cols="12">
            <UsageResultCard
              :title="$t('__titleUsageResourceByType')"
              :tooltip="$t('__tooltipUsageResourceByType')"
              :has-content="callerResourceItems.length > 0"
              :is-loading="state.isLoading"
            >
              <UsageResourceList :items="callerResourceItems" />
            </UsageResultCard>
          </v-col>
          <v-col cols="12">
            <UsageResultCard
              :has-content="callerBreakdown.callerRows.length > 0"
              :is-loading="state.isLoading"
              :title="$t('__titleUsageCallerBreakdown')"
            >
              <AppTable
                :headers="callerHeaders"
                :items="callerBreakdown.tableRows"
                item-value="id"
                :server-side="false"
                density="compact"
                bordered
                enable-expand
                :is-expanded-row-visible="item => item.usageRows?.length > 0 || callerBreakdownSearchEngineMap.has(item.id)"
                hide-details
              >
                <template #header.estimatedCost="slotProps">
                  <AppTableColumnHeader
                    :slot-props="slotProps"
                    :title="$t('__fieldUsageEstimatedCost')"
                    :tooltip="$t('__tooltipUsageEstimatedCost')"
                  />
                </template>
                <template #item.resources="{ item }">
                  <div
                    v-if="callerBreakdownSearchEngineMap.has(item.id)"
                    class="d-flex align-center ga-1"
                  >
                    <AppChip
                      :icon="ResourceConstant.Type.SEARCH_ENGINE.icon"
                      :text="$t(ResourceConstant.Type.SEARCH_ENGINE.i18nTitle)"
                    />
                  </div>
                </template>
                <template #expanded-row="{ item }">
                  <div class="d-flex flex-column ga-4 pa-4">
                    <UsageModelTokenBreakdownTable
                      v-if="item.usageRows?.length > 0"
                      :usage-rows="item.usageRows"
                      :pricing-table="state.pricingTable"
                      :model-color-map="callerModelDistributionColorMap"
                    />
                    <UsageResourceDetailTable
                      v-if="callerBreakdownSearchEngineMap.has(item.id)"
                      :i18n-title="ResourceConstant.Type.SEARCH_ENGINE.i18nTitle"
                      :resource-type="ResourceConstant.Type.SEARCH_ENGINE.value"
                      :rows="callerBreakdownSearchEngineMap.get(item.id).detailRows"
                      :total-call-count="callerBreakdownSearchEngineMap.get(item.id).totalCallCount"
                    />
                  </div>
                </template>
              </AppTable>
            </UsageResultCard>
          </v-col>
        </v-row>
      </template>
    </AppTabs>
  </template>
  <AppInfoCard
    v-else
    :title="$t('__titleForbidden')"
    :instruction="$t('__instructionForbidden')"
    :icon="IconConstant.Base.USAGE"
  />
</template>

<style lang="scss" scoped>

</style>
