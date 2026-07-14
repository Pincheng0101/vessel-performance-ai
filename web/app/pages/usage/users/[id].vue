<script setup>
import { ChartConstant, DateConstant, IconConstant, ResourceConstant, UsageConstant } from '~/constants';
import { UsageChartConfig, UsageDataHelper, UsageKpiDetailsHelper, UsageResourceDataHelper, UsageUserDataHelper } from '~/models/ui/usage';

definePageMeta({
  layout: 'fluid',
});

const authStore = useAuthStore();
const breadcrumbStore = useBreadcrumbStore();
const dayjs = useDayjs();
const route = useRoute();
const { fetchModelPricingTable, fetchUsageData } = useMetering();
const { t } = useI18n();
const { getUsageModelColorMap } = useUsageChartColors();
const { startDate, endDate } = useUsageDateRange();
const { getUserDisplayName, loadUserDisplayNames } = useUsageUserDisplayName();
const server = useServer();
const {
  getResourceLink,
  getResourceName,
  loadResourceMap,
} = useUsageResourceMap();

const userTokenUsagePreset = UsageConstant.Preset.USER_TOKEN_USAGE;
const userSearchEngineUsagePreset = UsageConstant.Preset.USER_SEARCH_ENGINE_USAGE;

const DAILY_USER_USAGE_CHART_HEIGHT = 300;

const state = reactive({
  pricingTable: {},
  isLoading: false,
  isUserDisplayNameLoading: true,
  refreshBreadcrumbRequest: 0,
  refreshRequest: 0,
  dailyUsageChartVariant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
  modelDistributionChartVariant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
  userUsageRows: null,
  userSearchEngineUsageRows: null,
  isUserDeleted: false,
});

const userId = computed(() => String(route.params.id));
const userDetailPath = computed(() => `/users/${userId.value}`);
const userDisplayName = computed(() => getUserDisplayName(userId.value));
const isUserDetailDeleted = computed(() => state.isUserDeleted);
const deletedResourceTooltip = computed(() => (
  t('__tooltipUsageResourceDeleted', { resourceType: t('__fieldUser') })
));

watch([userId, userDisplayName], ([id, displayName]) => {
  breadcrumbStore.setBreadcrumb(id, displayName);
}, { immediate: true });

const loadUserBreadcrumb = async () => {
  const requestId = ++state.refreshBreadcrumbRequest;
  const currentUserId = userId.value;
  state.isUserDisplayNameLoading = true;
  state.isUserDeleted = false;
  breadcrumbStore.setLoading(true);
  try {
    await loadUserDisplayNames([currentUserId]);
    const { data, error } = await server.user.adminGetUsers({
      userNames: [currentUserId],
    }, { lazy: false });
    if (!error.value && requestId === state.refreshBreadcrumbRequest) {
      state.isUserDeleted = (data.value?.notFoundUserNames ?? []).includes(currentUserId);
    }
  } finally {
    if (requestId !== state.refreshBreadcrumbRequest) return;
    if (currentUserId === userId.value) {
      breadcrumbStore.setBreadcrumb(currentUserId, getUserDisplayName(currentUserId));
    }
    state.isUserDisplayNameLoading = false;
    breadcrumbStore.setLoading(false);
  }
};

const normalizedUserUsageRows = computed(() => {
  return state.userUsageRows ?? [];
});

const userUsageSummary = computed(() => (
  UsageUserDataHelper.buildUserUsageSummary({
    rows: normalizedUserUsageRows.value,
    pricingTable: state.pricingTable,
  })
));

const userUsageTokenDetails = computed(() => UsageKpiDetailsHelper.buildTokenDetails({
  metricTotals: userUsageSummary.value,
}));

const userUsageEstimatedCostDetails = computed(() => UsageKpiDetailsHelper.buildEstimatedCostDetails({
  metricTotals: userUsageSummary.value,
}));

const kpiCards = computed(() => ([
  {
    icon: UsageConstant.Kpi.TOTAL_TOKENS.icon,
    i18nTitle: UsageConstant.Kpi.TOTAL_TOKENS.i18nTitle,
    isLoading: state.isLoading,
    value: numUtils.format(userUsageSummary.value.totalTokens),
    details: userUsageTokenDetails.value,
  },
  {
    icon: UsageConstant.Kpi.ESTIMATED_COST.icon,
    i18nTitle: UsageConstant.Kpi.ESTIMATED_COST.i18nTitle,
    i18nTooltip: UsageConstant.Kpi.ESTIMATED_COST.i18nTooltip,
    isLoading: state.isLoading,
    value: `$${numUtils.format(userUsageSummary.value.estimatedCost, 2)}`,
    details: userUsageEstimatedCostDetails.value,
  },
  {
    icon: UsageConstant.Kpi.AGENTS.icon,
    i18nTitle: UsageConstant.Kpi.SESSIONS.i18nTitle,
    isLoading: state.isLoading,
    value: numUtils.format(userUsageSummary.value.sessionCount),
    secondaryI18nTitle: UsageConstant.Kpi.AGENTS.i18nTitle,
    secondaryValue: numUtils.format(userUsageSummary.value.agentCount),
  },
  {
    icon: UsageConstant.Kpi.WORKFLOWS.icon,
    i18nTitle: UsageConstant.Kpi.EXECUTIONS.i18nTitle,
    isLoading: state.isLoading,
    value: numUtils.format(userUsageSummary.value.executionCount),
    secondaryI18nTitle: UsageConstant.Kpi.WORKFLOWS.i18nTitle,
    secondaryValue: numUtils.format(userUsageSummary.value.workflowCount),
  },
]));

const getAgentResource = agentId => ({
  resourceId: agentId,
  resourceType: ResourceConstant.Type.AGENT.value,
});

const getWorkflowResource = workflowId => ({
  resourceId: workflowId,
  resourceType: ResourceConstant.Type.WORKFLOW.value,
});

const agentBreakdownItems = computed(() => {
  return UsageUserDataHelper.buildUserUsageBreakdownItems({
    rows: normalizedUserUsageRows.value,
    pricingTable: state.pricingTable,
    distinctKey: 'sessionId',
    groupKey: 'agentId',
  }).map(item => ({
    agentId: item.id,
    agentName: getResourceName(getAgentResource(item.id)),
    avgCostPerSession: item.averageCost,
    estimatedCost: item.estimatedCost,
    sessions: item.uniqueCount,
    totalTokens: item.totalTokens,
    usageRows: item.usageRows,
  }));
});

const workflowBreakdownItems = computed(() => {
  return UsageUserDataHelper.buildUserUsageBreakdownItems({
    rows: normalizedUserUsageRows.value,
    pricingTable: state.pricingTable,
    distinctKey: 'executionId',
    groupKey: 'workflowId',
  }).map(item => ({
    avgCostPerRun: item.averageCost,
    estimatedCost: item.estimatedCost,
    totalTokens: item.totalTokens,
    workflowId: item.id,
    workflowName: getResourceName(getWorkflowResource(item.id)),
    workflowRuns: item.uniqueCount,
    usageRows: item.usageRows,
  }));
});

const modelBreakdownRows = computed(() => {
  return UsageUserDataHelper.buildUserModelBreakdownRows({
    rows: normalizedUserUsageRows.value,
    pricingTable: state.pricingTable,
  });
});

const modelTokenDistributionColorMap = computed(() => (
  getUsageModelColorMap({
    rows: modelBreakdownRows.value,
  })
));

const getUsageSourceDisplayName = (source) => {
  const i18nTitle = findField(UsageConstant.SourceType, source, 'i18nTitle');

  if (i18nTitle) {
    return t(i18nTitle);
  }

  return source ? strUtils.toTitleCase(source) : t('__fieldUnknown');
};

const othersBreakdownItems = computed(() => {
  return UsageUserDataHelper.buildUserOthersBreakdownItems({
    rows: normalizedUserUsageRows.value,
    pricingTable: state.pricingTable,
  }).map(item => ({
    ...item,
    sourceName: getUsageSourceDisplayName(item.source),
  }));
});

const dailyUserUsageChartRows = computed(() => (
  UsageDataHelper.buildDailyUsageChartRows({
    rows: normalizedUserUsageRows.value,
    pricingTable: state.pricingTable,
    startDate: startDate.value,
    endDate: endDate.value,
  })
));

const dailyUserTokenChart = computed(() => {
  const rows = dailyUserUsageChartRows.value;

  return new UsageChartConfig({
    type: ChartConstant.Type.BAR.value,
    direction: ChartConstant.Direction.VERTICAL.value,
    i18nTitle: '__titleUsageDailyTokens',
    height: DAILY_USER_USAGE_CHART_HEIGHT,
    valueFormat: UsageConstant.ValueFormat.NUMBER.value,
    datasets: UsageDataHelper.buildTokenStackDatasets({
      rows,
    }),
    labels: rows.map(row => dayjs(row.date).format(DateConstant.Format.MONTH_DATE)),
  });
});

const dailyUserEstimatedCostChart = computed(() => {
  const rows = dailyUserUsageChartRows.value;

  return new UsageChartConfig({
    type: ChartConstant.Type.BAR.value,
    direction: ChartConstant.Direction.VERTICAL.value,
    i18nTitle: '__titleUsageDailyEstimatedCost',
    i18nTooltip: '__tooltipUsageEstimatedCost',
    height: DAILY_USER_USAGE_CHART_HEIGHT,
    valueFormat: UsageConstant.ValueFormat.CURRENCY.value,
    datasets: UsageDataHelper.buildEstimatedCostStackDatasets({
      rows,
    }),
    labels: rows.map(row => dayjs(row.date).format(DateConstant.Format.MONTH_DATE)),
  });
});

const modelTokenDistributionChart = computed(() => UsageChartConfig.buildModelDistribution({
  rows: modelBreakdownRows.value,
  variant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
}));

const modelEstimatedCostDistributionChart = computed(() => UsageChartConfig.buildModelDistribution({
  rows: modelBreakdownRows.value,
  variant: UsageConstant.ChartVariant.ESTIMATED_COST.value,
}));

const userSearchEngineUsageRows = computed(() => state.userSearchEngineUsageRows);
const userResourceUsage = useUsageResourceBreakdown({
  getResourceLink,
  getResourceName,
  rows: userSearchEngineUsageRows,
  withInstances: true,
});
const agentResourceUsage = useUsageResourceBreakdown({
  entityKey: ResourceConstant.Type.AGENT.id,
  entityIdGetter: item => item?.agentId,
  getResourceLink,
  getResourceName,
  rows: userSearchEngineUsageRows,
  withInstances: true,
});
const workflowResourceUsage = useUsageResourceBreakdown({
  entityKey: ResourceConstant.Type.WORKFLOW.id,
  entityIdGetter: item => item?.workflowId,
  getResourceLink,
  getResourceName,
  rows: userSearchEngineUsageRows,
  withInstances: true,
});
const { totalResourceItems } = userResourceUsage;
const getAgentResourceItems = agentResourceUsage.getResourceItems;
const getAgentResourceChipItems = agentResourceUsage.getResourceChipItems;
const getWorkflowResourceItems = workflowResourceUsage.getResourceItems;
const getWorkflowResourceChipItems = workflowResourceUsage.getResourceChipItems;
const isAgentExpandedRowVisible = item => item.usageRows?.length > 0 || agentResourceUsage.hasResourceItems(item);
const isWorkflowExpandedRowVisible = item => item.usageRows?.length > 0 || workflowResourceUsage.hasResourceItems(item);

const agentBreakdownHeaders = computed(() => ([
  {
    key: 'agentName',
    link: item => getResourceLink(getAgentResource(item.agentId)),
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

const workflowBreakdownHeaders = computed(() => ([
  {
    key: 'workflowName',
    link: item => getResourceLink(getWorkflowResource(item.workflowId)),
    title: t('__fieldWorkflow'),
  },
  {
    key: 'totalTokens',
    sortable: true,
    title: t('__fieldUsageTotalTokens'),
    isNumber: true,
  },
  {
    key: 'workflowRuns',
    sortable: true,
    title: t('__fieldUsageExecutions'),
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
    key: 'avgCostPerRun',
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

const othersBreakdownHeaders = computed(() => ([
  {
    key: 'sourceName',
    title: t('__fieldSource'),
  },
  {
    key: 'totalTokens',
    sortable: true,
    title: t('__fieldUsageTotalTokens'),
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
]));

const collectUsageResources = () => {
  const usageRows = normalizedUserUsageRows.value;

  return UsageResourceDataHelper.collectResourceRefsFromRows([
    { rows: usageRows, idField: 'agentId', resourceType: ResourceConstant.Type.AGENT.value },
    { rows: usageRows, idField: 'workflowId', resourceType: ResourceConstant.Type.WORKFLOW.value },
    { rows: state.userSearchEngineUsageRows, idField: 'searchEngineId', resourceType: ResourceConstant.Type.SEARCH_ENGINE.value },
  ]);
};

const loadUsageData = async () => {
  const requestId = ++state.refreshRequest;
  state.isLoading = true;

  try {
    const [
      userUsageResult,
      userSearchEngineUsageResult,
      pricingTable,
    ] = await Promise.all([
      fetchUsageData({
        preset: userTokenUsagePreset,
        startDate: startDate.value,
        endDate: endDate.value,
        requestBody: {
          user: userId.value,
        },
      }),
      fetchUsageData({
        preset: userSearchEngineUsagePreset,
        startDate: startDate.value,
        endDate: endDate.value,
        requestBody: {
          user: userId.value,
        },
      }),
      fetchModelPricingTable(),
    ]);

    if (requestId !== state.refreshRequest) {
      return;
    }

    state.pricingTable = pricingTable ?? {};
    state.userUsageRows = userUsageResult?.rows ?? [];

    if (userSearchEngineUsageResult) {
      state.userSearchEngineUsageRows = userSearchEngineUsageResult.rows;
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
  loadUserBreadcrumb();
});
</script>

<template>
  <template v-if="authStore.parsedToken.isAdmin">
    <div class="d-flex flex-wrap align-center justify-space-between ga-4">
      <div class="w-100 d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon
            :icon="UsageConstant.Kpi.USERS.icon"
            class="mr-2"
            color="primary"
            size="small"
          />
          <div class="d-flex align-baseline ga-2">
            <template v-if="state.isUserDisplayNameLoading">
              <AppSkeletonLoader
                type="text"
                width="280"
              />
            </template>
            <template v-else>
              <span class="text-h6">
                {{ strUtils.addSpacesAroundAscii($t('__titleUsageAnalysis', { item: userDisplayName })) }}
              </span>
            </template>
            <UsageResourceInfoMenu
              :title="$t('__actionViewUserDetails')"
              :path="userDetailPath"
              :disabled="isUserDetailDeleted"
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
      <v-row>
        <v-col cols="12">
          <v-row>
            <v-col
              v-for="(card, index) in kpiCards"
              :key="index"
              cols="12"
              sm="6"
              md="3"
            >
              <UsageKpiCard v-bind="card" />
            </v-col>
          </v-row>
        </v-col>
        <v-col cols="12">
          <UsageResultCardFrame
            :title="state.dailyUsageChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value ? $t(dailyUserTokenChart.i18nTitle) : $t(dailyUserEstimatedCostChart.i18nTitle)"
            :tooltip="state.dailyUsageChartVariant === UsageConstant.ChartVariant.ESTIMATED_COST.value ? $t(dailyUserEstimatedCostChart.i18nTooltip) : ''"
          >
            <template #actions>
              <UsageChartVariantButtonToggle v-model="state.dailyUsageChartVariant" />
            </template>
            <UsageResultCard
              v-if="state.dailyUsageChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value"
              :has-content="dailyUserTokenChart.labels.length > 0"
              :is-loading="state.isLoading"
            >
              <UsageBarChart :chart="dailyUserTokenChart" />
            </UsageResultCard>
            <UsageResultCard
              v-else
              :has-content="dailyUserEstimatedCostChart.labels.length > 0"
              :is-loading="state.isLoading"
            >
              <UsageBarChart :chart="dailyUserEstimatedCostChart" />
            </UsageResultCard>
          </UsageResultCardFrame>
        </v-col>
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
                :usage-rows="normalizedUserUsageRows"
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
            :has-content="totalResourceItems.length > 0"
            :is-loading="state.isLoading"
          >
            <UsageResourceList :items="totalResourceItems" />
          </UsageResultCard>
        </v-col>
        <v-col cols="12">
          <UsageResultCard
            :has-content="agentBreakdownItems.length > 0"
            :is-loading="state.isLoading"
            :title="$t('__titleUsageDetailsByAgent')"
          >
            <AppTable
              :headers="agentBreakdownHeaders"
              :items="agentBreakdownItems"
              item-value="agentId"
              :server-side="false"
              row-density="compact"
              bordered
              enable-expand
              :is-expanded-row-visible="isAgentExpandedRowVisible"
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
                  <UsageModelTokenBreakdownTable
                    v-if="item.usageRows?.length > 0"
                    :usage-rows="item.usageRows"
                    :pricing-table="state.pricingTable"
                    :model-color-map="modelTokenDistributionColorMap"
                    show-title
                  />
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
        <v-col cols="12">
          <UsageResultCard
            :has-content="workflowBreakdownItems.length > 0"
            :is-loading="state.isLoading"
            :title="$t('__titleUsageDetailsByWorkflow')"
          >
            <AppTable
              :headers="workflowBreakdownHeaders"
              :items="workflowBreakdownItems"
              item-value="workflowId"
              :server-side="false"
              row-density="compact"
              bordered
              enable-expand
              :is-expanded-row-visible="isWorkflowExpandedRowVisible"
              hide-details
            >
              <template #header.estimatedCost="slotProps">
                <AppTableColumnHeader
                  :slot-props="slotProps"
                  :title="$t('__fieldUsageEstimatedCost')"
                  :tooltip="$t('__tooltipUsageEstimatedCost')"
                />
              </template>
              <template #header.avgCostPerRun="slotProps">
                <AppTableColumnHeader
                  :slot-props="slotProps"
                  :title="$t('__fieldUsageAvgCostPerExecution')"
                  :tooltip="$t('__tooltipUsageAvgCostPerExecution')"
                />
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
                  <UsageModelTokenBreakdownTable
                    v-if="item.usageRows?.length > 0"
                    :usage-rows="item.usageRows"
                    :pricing-table="state.pricingTable"
                    :model-color-map="modelTokenDistributionColorMap"
                    show-title
                  />
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
        <v-col cols="12">
          <UsageResultCard
            :description="$t('__descriptionUsageOthersBreakdown')"
            :has-content="othersBreakdownItems.length > 0"
            :is-loading="state.isLoading"
            :title="$t('__titleUsageOthersBreakdown')"
          >
            <AppTable
              :headers="othersBreakdownHeaders"
              :items="othersBreakdownItems"
              item-value="id"
              :server-side="false"
              row-density="compact"
              bordered
              enable-expand
              :is-expanded-row-visible="item => item.usageRows?.length > 0"
              hide-details
            >
              <template #header.estimatedCost="slotProps">
                <AppTableColumnHeader
                  :slot-props="slotProps"
                  :title="$t('__fieldUsageEstimatedCost')"
                  :tooltip="$t('__tooltipUsageEstimatedCost')"
                />
              </template>
              <template #expanded-row="{ item }">
                <div class="pa-4">
                  <UsageModelTokenBreakdownTable
                    :usage-rows="item.usageRows"
                    :pricing-table="state.pricingTable"
                    :model-color-map="modelTokenDistributionColorMap"
                  />
                </div>
              </template>
            </AppTable>
          </UsageResultCard>
        </v-col>
      </v-row>
    </div>
  </template>
  <AppInfoCard
    v-else
    :title="$t('__titleForbidden')"
    :instruction="$t('__instructionForbidden')"
    :icon="IconConstant.Base.USAGE"
  />
</template>
