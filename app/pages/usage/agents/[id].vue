<script setup>
import { AgentConstant, ChartConstant, DateConstant, IconConstant, ResourceConstant, UsageConstant } from '~/constants';
import { UsageAgentDataHelper, UsageChartConfig, UsageDataHelper, UsageKpiDetailsHelper, UsageResourceDataHelper } from '~/models/ui/usage';

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
  currentResource: agent,
  getResourceLink,
  getResourceName,
  loadCurrentResource,
  loadResourceMap,
} = useUsageResourceMap();

const AGENT_RESOURCE_TYPE = ResourceConstant.Type.AGENT.value;
const AGENT_ID_KEY = UsageResourceDataHelper.getUsageResourceIdKey(AGENT_RESOURCE_TYPE);
const ORIGINAL_AGENT_ID_KEY = UsageResourceDataHelper.getUsageOriginalResourceIdKey(AGENT_RESOURCE_TYPE);

const agentOriginalTokenUsagePreset = UsageConstant.Preset.AGENT_ORIGINAL_TOKEN_USAGE;
const agentTokenUsagePreset = UsageConstant.Preset.AGENT_TOKEN_USAGE;
const agentOriginalSearchEngineUsagePreset = UsageConstant.Preset.AGENT_ORIGINAL_SEARCH_ENGINE_USAGE;
const agentSearchEngineUsagePreset = UsageConstant.Preset.AGENT_SEARCH_ENGINE_USAGE;

const KPI_CARD_HEIGHT = 100;
const DAILY_CHART_HEIGHT = 300;
const DONUT_CHART_MIN_HEIGHT = 240;

const state = reactive({
  pricingTable: {},
  isLoading: false,
  refreshRequest: 0,
  dailyUsageChartVariant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
  modelDistributionChartVariant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
  directRunModelDistributionChartVariant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
  directRunResourceDistributionChartVariant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
  callerModelDistributionChartVariant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
  agentOriginalUsageRows: null,
  agentUsageRows: null,
  agentOriginalSearchEngineUsageRows: null,
  agentSearchEngineUsageRows: null,
  isAgentDeleted: false,
});

const agentId = computed(() => String(route.params.id));
const agentDetailPath = computed(() => `/agents/${agentId.value}`);
const agentDisplayName = computed(() => agent.value?.name || agentId.value);
const deletedResourceTooltip = computed(() => (
  t('__tooltipUsageResourceDeleted', { resourceType: t(ResourceConstant.Type.AGENT.i18nTitle) })
));
const isCopilotAgent = computed(() => agentId.value === AgentConstant.CopilotAgentId);
const isAgentDetailDisabled = computed(() => state.isAgentDeleted || isCopilotAgent.value);
const agentDetailDisabledTooltip = computed(() => (
  isCopilotAgent.value
    ? t('__tooltipUsageBuiltInAgentDetailUnavailable')
    : deletedResourceTooltip.value
));

watch([agentId, agentDisplayName], ([id, displayName]) => {
  breadcrumbStore.setBreadcrumb(id, displayName);
}, { immediate: true });

const agentUsageData = computed(() => UsageAgentDataHelper.buildAgentUsageData({
  agentId: agentId.value,
  agentOriginalUsageRows: state.agentOriginalUsageRows,
  agentUsageRows: state.agentUsageRows,
  pricingTable: state.pricingTable,
}));

const searchEngineUsageRows = computed(() => UsageResourceDataHelper.buildDetailSearchEngineUsageRows({
  currentEntityId: agentId.value,
  entityType: AGENT_RESOURCE_TYPE,
  originalRows: state.agentOriginalSearchEngineUsageRows,
  ownRows: state.agentSearchEngineUsageRows,
}));

const overviewSearchEngineItem = computed(() => (
  UsageResourceDataHelper.buildSearchEngineItemWithInstances({
    getResourceLink,
    getResourceName,
    rows: searchEngineUsageRows.value.overviewRows,
  })
));

const directRunSearchEngineItem = computed(() => (
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
    currentEntityId: agentId.value,
    entityType: AGENT_RESOURCE_TYPE,
    getResourceLink,
    getResourceName,
    isCaller: false,
    rows: searchEngineUsageRows.value.sourceBreakdownRows,
  })
));

const callerBreakdownSearchEngineMap = computed(() => (
  UsageResourceDataHelper.mapSearchEngineByBreakdownRow({
    currentEntityId: agentId.value,
    entityType: AGENT_RESOURCE_TYPE,
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

const directRunResourceItems = computed(() => UsageResourceDataHelper.buildResourceItems({
  getColor: getSecondaryColor,
  items: [directRunSearchEngineItem.value],
}));

const callerResourceItems = computed(() => UsageResourceDataHelper.buildResourceItems({
  getColor: getSecondaryColor,
  items: [callerSearchEngineItem.value],
}));

const usageTabs = computed(() => ([
  { title: t('__titleUsageOverview'), value: 'overview' },
  { title: t('__titleUsageDirectRunsTab'), value: 'direct-runs' },
  { title: t('__titleUsageCallerTab'), value: 'caller' },
]));

const getUsageBreakdownLabel = (item) => {
  if (item.rowType === UsageConstant.RowType.SELF_AGENT.value) {
    return `${t('__fieldUsageSelfAgent')} - ${agentDisplayName.value}`;
  }

  if (item.i18nLabel) {
    return t(item.i18nLabel);
  }

  return getResourceName(item);
};

const agentOverviewUsageData = computed(() => (
  UsageAgentDataHelper.buildAgentOverviewUsageData({
    agentUsageData: agentUsageData.value,
    startDate: startDate.value,
    endDate: endDate.value,
  })
));

const overviewSummary = computed(() => agentOverviewUsageData.value.summary);
const overviewDailyUsageRows = computed(() => agentOverviewUsageData.value.dailyUsageRows);
const overviewModelUsageRows = computed(() => agentOverviewUsageData.value.modelBreakdownRows);

const directRunResourceBreakdown = computed(() => (
  UsageAgentDataHelper.buildAgentDirectRunResourceBreakdown(agentUsageData.value)
));

const callerBreakdown = computed(() => (
  UsageAgentDataHelper.buildAgentCallerBreakdown(agentUsageData.value)
));

const directRunModelUsageRows = computed(() => [
  ...(agentUsageData.value.agentDirectRunRows ?? []),
  ...(agentUsageData.value.sessionNamingDirectRunRows ?? []),
  ...(agentUsageData.value.agentDelegatedResourceRows ?? []),
]);

const callerModelUsageRows = computed(() => [
  ...(agentUsageData.value.agentCallerRows ?? []),
  ...(agentUsageData.value.sessionNamingCallerRows ?? []),
]);

const directRunModelUsageBreakdownRows = computed(() => (
  UsageDataHelper.buildModelBreakdownRows({
    rows: directRunModelUsageRows.value,
  })
));

const callerModelUsageBreakdownRows = computed(() => (
  UsageDataHelper.buildModelBreakdownRows({
    rows: callerModelUsageRows.value,
  })
));

const directRunModelDistributionColorMap = computed(() => (
  getUsageModelColorMap({
    rows: directRunModelUsageBreakdownRows.value,
  })
));

const callerModelDistributionColorMap = computed(() => (
  getUsageModelColorMap({
    rows: callerModelUsageBreakdownRows.value,
  })
));

const getDirectRunResourceDonutColors = (rows) => {
  let resourceIndex = 0;

  return rows.map((row) => {
    if (row.rowType === UsageConstant.RowType.SELF_AGENT.value) {
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
    icon: UsageConstant.Kpi.SESSIONS.icon,
    i18nTitle: '__titleUsageSessions',
    isLoading: state.isLoading,
    value: numUtils.format(overviewSummary.value.sessions),
  },
  {
    height: KPI_CARD_HEIGHT,
    icon: UsageConstant.Kpi.TOTAL_TOKENS.icon,
    details: buildKpiTokenBreakdownDetails({
      percentageTotal: overviewSummary.value.totalTokens,
      columns: [
        {
          i18nTitle: '__titleUsageDirectRunsTab',
          metricTotals: directRunResourceBreakdown.value.selfAgentRow,
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
          i18nTitle: '__titleUsageDirectRunsTab',
          metricTotals: directRunResourceBreakdown.value.selfAgentRow,
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

const directRunKpiCards = computed(() => ([
  {
    icon: UsageConstant.Kpi.SESSIONS.icon,
    i18nTitle: '__titleUsageDirectRuns',
    isLoading: state.isLoading,
    value: numUtils.format(directRunResourceBreakdown.value.directRuns),
  },
  {
    icon: UsageConstant.Kpi.TOTAL_TOKENS.icon,
    details: buildKpiTokenBreakdownDetails({
      percentageTotal: directRunResourceBreakdown.value.fullFlowTotalTokens,
      columns: [
        {
          i18nTitle: '__fieldUsageSelfAgent',
          metricTotals: directRunResourceBreakdown.value.selfAgentRow,
        },
        {
          i18nTitle: '__fieldUsageDelegated',
          metricTotals: directRunResourceBreakdown.value.calledResourcesSubtotalRow,
        },
      ],
    }),
    i18nTitle: '__titleUsageFullFlowTotalTokens',
    isLoading: state.isLoading,
    value: formatKpiNumber(directRunResourceBreakdown.value.fullFlowTotalTokens),
  },
  {
    icon: UsageConstant.Kpi.ESTIMATED_COST.icon,
    details: buildKpiEstimatedCostBreakdownDetails({
      percentageTotal: directRunResourceBreakdown.value.fullFlowEstimatedCost,
      columns: [
        {
          i18nTitle: '__fieldUsageSelfAgent',
          metricTotals: directRunResourceBreakdown.value.selfAgentRow,
        },
        {
          i18nTitle: '__fieldUsageDelegated',
          metricTotals: directRunResourceBreakdown.value.calledResourcesSubtotalRow,
        },
      ],
    }),
    i18nTitle: '__titleUsageFullFlowEstimatedCost',
    i18nTooltip: UsageConstant.Kpi.ESTIMATED_COST.i18nTooltip,
    isLoading: state.isLoading,
    secondaryI18nTitle: '__fieldUsageAvgFullFlowEstimatedCostPerDirectRun',
    secondaryValue: formatKpiCurrency(directRunResourceBreakdown.value.averageFullFlowEstimatedCost),
    value: formatKpiCurrency(directRunResourceBreakdown.value.fullFlowEstimatedCost),
  },
]));

const callerKpiCards = computed(() => ([
  {
    icon: UsageConstant.Kpi.SESSIONS.icon,
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

const overviewDailySessionsChart = computed(() => {
  const rows = overviewDailyUsageRows.value;

  return new UsageChartConfig({
    type: ChartConstant.Type.BAR.value,
    direction: ChartConstant.Direction.VERTICAL.value,
    i18nTitle: '__titleUsageDailySessions',
    height: DAILY_CHART_HEIGHT,
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

const overviewModelTokenChart = computed(() => buildModelTokenChart(overviewModelUsageRows.value));

const overviewModelEstimatedCostChart = computed(() => buildModelEstimatedCostChart(overviewModelUsageRows.value));

const directRunModelTokenChart = computed(() => buildModelTokenChart(directRunModelUsageBreakdownRows.value));

const directRunModelEstimatedCostChart = computed(() => buildModelEstimatedCostChart(directRunModelUsageBreakdownRows.value));

const callerModelTokenChart = computed(() => buildModelTokenChart(callerModelUsageBreakdownRows.value));

const callerModelEstimatedCostChart = computed(() => buildModelEstimatedCostChart(callerModelUsageBreakdownRows.value));

const directRunResourceTokenChart = computed(() => {
  const rows = directRunResourceBreakdown.value.tokenDonutRows;

  return new UsageChartConfig({
    type: ChartConstant.Type.DOUGHNUT.value,
    minHeight: DONUT_CHART_MIN_HEIGHT,
    i18nTitle: '__titleUsageSourceTokensDistribution',
    labels: rows.map(row => getUsageBreakdownLabel(row)),
    showTooltipTotal: false,
    valueFormat: UsageConstant.ValueFormat.NUMBER.value,
    datasets: [
      {
        backgroundColor: getDirectRunResourceDonutColors(rows),
        data: rows.map(row => row.totalTokens),
      },
    ],
  });
});

const directRunResourceEstimatedCostChart = computed(() => {
  const rows = directRunResourceBreakdown.value.estimatedCostDonutRows;

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
        backgroundColor: getDirectRunResourceDonutColors(rows),
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

const directRunResourceBreakdownHeaders = computed(() => ([
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
    ...directRunResourceBreakdown.value.calledResourceRows,
    ...callerBreakdown.value.callerRows,
  ],
  searchEngineItems: [
    overviewSearchEngineItem.value,
    directRunSearchEngineItem.value,
    callerSearchEngineItem.value,
    ...sourceBreakdownSearchEngineMap.value.values(),
    ...callerBreakdownSearchEngineMap.value.values(),
  ],
});

const loadAgent = async () => {
  const currentAgentId = agentId.value;
  state.isAgentDeleted = false;

  // Skip fetching agent data for special agents like HQ Copilot
  if (currentAgentId === AgentConstant.CopilotAgentId) {
    breadcrumbStore.setBreadcrumb(currentAgentId, currentAgentId);
    return;
  }

  await loadCurrentResource({
    resourceId: currentAgentId,
    resourceType: ResourceConstant.Type.AGENT.value,
  });
  state.isAgentDeleted = !agent.value;
};

const loadUsageData = async () => {
  const requestId = ++state.refreshRequest;
  state.isLoading = true;

  try {
    const [
      pricingTable,
      agentOriginalUsageResult,
      agentUsageResult,
      agentOriginalSearchEngineUsageResult,
      agentSearchEngineUsageResult,
    ] = await Promise.all([
      fetchModelPricingTable(),
      fetchUsageData({
        preset: agentOriginalTokenUsagePreset,
        startDate: startDate.value,
        endDate: endDate.value,
        requestBody: {
          [ORIGINAL_AGENT_ID_KEY]: agentId.value,
        },
      }),
      fetchUsageData({
        preset: agentTokenUsagePreset,
        startDate: startDate.value,
        endDate: endDate.value,
        requestBody: {
          [AGENT_ID_KEY]: agentId.value,
        },
      }),
      fetchUsageData({
        preset: agentOriginalSearchEngineUsagePreset,
        startDate: startDate.value,
        endDate: endDate.value,
        requestBody: {
          [ORIGINAL_AGENT_ID_KEY]: agentId.value,
        },
      }),
      fetchUsageData({
        preset: agentSearchEngineUsagePreset,
        startDate: startDate.value,
        endDate: endDate.value,
        requestBody: {
          [AGENT_ID_KEY]: agentId.value,
        },
      }),
    ]);

    if (requestId !== state.refreshRequest) {
      return;
    }

    state.pricingTable = pricingTable ?? {};

    if (agentOriginalUsageResult) {
      state.agentOriginalUsageRows = agentOriginalUsageResult.rows;
    }

    if (agentUsageResult) {
      state.agentUsageRows = agentUsageResult.rows;
    }

    if (agentOriginalSearchEngineUsageResult) {
      state.agentOriginalSearchEngineUsageRows = agentOriginalSearchEngineUsageResult.rows;
    }

    if (agentSearchEngineUsageResult) {
      state.agentSearchEngineUsageRows = agentSearchEngineUsageResult.rows;
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

  loadAgent();
  loadUsageData();
});
</script>

<template>
  <template v-if="authStore.parsedToken.isAdmin">
    <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-4">
      <div class="w-100 d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon
            :icon="UsageConstant.Kpi.AGENTS.icon"
            class="mr-2"
            color="primary"
            size="small"
          />
          <div class="d-flex align-baseline ga-2">
            <span class="text-h6">
              {{ strUtils.addSpacesAroundAscii($t('__titleUsageAnalysis', { item: agentDisplayName })) }}
            </span>
            <UsageResourceInfoMenu
              :title="$t('__actionViewAgentDetails')"
              :path="agentDetailPath"
              :disabled="isAgentDetailDisabled"
              :disabled-tooltip="agentDetailDisabledTooltip"
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
          {{ $t('__descriptionUsageAgentOverview') }}
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
              :has-content="overviewDailySessionsChart.labels.length > 0"
              :is-loading="state.isLoading"
              :title="$t(overviewDailySessionsChart.i18nTitle)"
            >
              <UsageBarChart :chart="overviewDailySessionsChart" />
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
                  :usage-rows="agentUsageData.agentSelfRows"
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
      <template #direct-runs>
        <div class="text-caption text-medium-emphasis mb-4">
          {{ $t('__descriptionUsageAgentDirectRuns') }}
        </div>
        <v-row>
          <v-col
            v-for="(card, index) in directRunKpiCards"
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
              :title="state.directRunModelDistributionChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value ? $t(directRunModelTokenChart.i18nTitle) : $t(directRunModelEstimatedCostChart.i18nTitle)"
              :tooltip="state.directRunModelDistributionChartVariant === UsageConstant.ChartVariant.ESTIMATED_COST.value ? $t(directRunModelEstimatedCostChart.i18nTooltip) : ''"
            >
              <template #actions>
                <UsageModelTokenBreakdownDialog
                  :usage-rows="directRunModelUsageRows"
                  :pricing-table="state.pricingTable"
                  :loading="state.isLoading"
                />
                <UsageChartVariantButtonToggle v-model="state.directRunModelDistributionChartVariant" />
              </template>
              <UsageResultCard
                v-if="state.directRunModelDistributionChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value"
                :has-content="directRunModelTokenChart.labels.length > 0"
                :is-loading="state.isLoading"
              >
                <UsageDonutChart :chart="directRunModelTokenChart" />
              </UsageResultCard>
              <UsageResultCard
                v-else
                :has-content="directRunModelEstimatedCostChart.labels.length > 0"
                :is-loading="state.isLoading"
              >
                <UsageDonutChart :chart="directRunModelEstimatedCostChart" />
              </UsageResultCard>
            </UsageResultCardFrame>
          </v-col>
          <v-col
            cols="12"
            md="6"
          >
            <UsageResultCardFrame
              :title="state.directRunResourceDistributionChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value ? $t(directRunResourceTokenChart.i18nTitle) : $t(directRunResourceEstimatedCostChart.i18nTitle)"
              :tooltip="state.directRunResourceDistributionChartVariant === UsageConstant.ChartVariant.ESTIMATED_COST.value ? $t(directRunResourceEstimatedCostChart.i18nTooltip) : ''"
            >
              <template #actions>
                <UsageChartVariantButtonToggle v-model="state.directRunResourceDistributionChartVariant" />
              </template>
              <UsageResultCard
                v-if="state.directRunResourceDistributionChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value"
                :has-content="directRunResourceTokenChart.labels.length > 0"
                :is-loading="state.isLoading"
              >
                <UsageDonutChart :chart="directRunResourceTokenChart" />
              </UsageResultCard>
              <UsageResultCard
                v-else
                :has-content="directRunResourceEstimatedCostChart.labels.length > 0"
                :is-loading="state.isLoading"
              >
                <UsageDonutChart :chart="directRunResourceEstimatedCostChart" />
              </UsageResultCard>
            </UsageResultCardFrame>
          </v-col>
          <v-col cols="12">
            <UsageResultCard
              :title="$t('__titleUsageResourceByType')"
              :tooltip="$t('__tooltipUsageResourceByType')"
              :has-content="directRunResourceItems.length > 0"
              :is-loading="state.isLoading"
            >
              <UsageResourceList :items="directRunResourceItems" />
            </UsageResultCard>
          </v-col>
          <v-col cols="12">
            <UsageResultCard
              :has-content="directRunResourceBreakdown.fullFlowTotalTokens > 0 || directRunResourceBreakdown.fullFlowEstimatedCost > 0"
              :is-loading="state.isLoading"
              :title="$t('__titleUsageSourceBreakdown')"
            >
              <AppTable
                :headers="directRunResourceBreakdownHeaders"
                :items="directRunResourceBreakdown.tableRows"
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
                      :model-color-map="directRunModelDistributionColorMap"
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
          {{ $t('__descriptionUsageAgentCaller') }}
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
