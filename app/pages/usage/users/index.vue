<script setup>
import { ChartConstant, DateConstant, IconConstant, UsageConstant } from '~/constants';
import { BarChartScaleHelper } from '~/models/ui/chart';
import { UsageChartConfig, UsageDataHelper, UsageKpiDetailsHelper, UsageUserDataHelper } from '~/models/ui/usage';

definePageMeta({
  layout: 'fluid',
});

const dayjs = useDayjs();
const authStore = useAuthStore();
const { fetchModelPricingTable, fetchUsageData } = useMetering();
const { t } = useI18n();
const { startDate, endDate } = useUsageDateRange();
const { getUserDisplayName, loadUserDisplayNames } = useUsageUserDisplayName();

const dailyUsersPreset = UsageConstant.Preset.DAILY_USERS;
const usersUsagePreset = UsageConstant.Preset.USERS_TOKEN_USAGE;

const USERS_KPI_CARD_HEIGHT = 100;
const DAILY_USERS_CHART_HEIGHT = 300;
const USERS_USAGE_CHART_HEIGHT = 500;
const USERS_USAGE_CHART_BAR_LIMIT = 20;

const state = reactive({
  pricingTable: {},
  isLoading: false,
  refreshRequest: 0,
  usersUsageChartVariant: UsageConstant.ChartVariant.TOKEN_COUNT.value,
  usersUsageChartUseLogarithmicScale: false,
  dailyUsersRows: null,
  usersUsageRows: null,
});

const getUserUsagePagePath = userId => `/usage/users/${userId}`;
const getUsersFromUsageRows = rows => rows.map(row => row.user).filter(Boolean);
const withUserDisplayName = row => ({
  ...row,
  userDisplayName: getUserDisplayName(row.user),
});

const tableHeaders = computed(() => ([
  {
    key: 'userDisplayName',
    link: item => ({ href: getUserUsagePagePath(item.user) }),
    title: t('__fieldUser'),
  },
  {
    key: 'totalTokens',
    title: t('__fieldUsageTotalTokens'),
    sortable: true,
    isNumber: true,
  },
  {
    key: 'estimatedCost',
    title: t('__fieldUsageEstimatedCost'),
    sortable: true,
    isCurrency: true,
    numberOptions: {
      decimalPlaces: 4,
    },
  },
  {
    key: 'sessionTokens',
    title: t('__fieldUsageAgentSessionTokens'),
    sortable: true,
    isNumber: true,
  },
  {
    key: 'runTokens',
    title: t('__fieldUsageWorkflowExecutionTokens'),
    sortable: true,
    isNumber: true,
  },
  {
    key: 'otherTokens',
    title: t('__fieldUsageOtherTokens'),
    sortable: true,
    isNumber: true,
  },
]));

const dailyUsersChartRows = computed(() => {
  const rowsByDate = new Map(
    (state.dailyUsersRows ?? []).map(row => [
      row.date,
      Number(row.userCount ?? 0),
    ]),
  );

  return UsageDataHelper.fillMissingDateRows({
    startDate: startDate.value,
    endDate: endDate.value,
    rowsByDate,
    createRow(date, userCount) {
      return {
        userCount: Number(userCount ?? 0),
        date,
      };
    },
  });
});

const dailyUsersChart = computed(() => {
  const chartRows = dailyUsersChartRows.value;

  return new UsageChartConfig({
    type: ChartConstant.Type.BAR.value,
    direction: ChartConstant.Direction.VERTICAL.value,
    i18nTitle: '__titleUsageDailyUsers',
    height: DAILY_USERS_CHART_HEIGHT,
    showTooltipTotal: false,
    valueFormat: UsageConstant.ValueFormat.NUMBER.value,
    datasets: [
      {
        data: chartRows.map(row => row.userCount),
        label: t('__fieldUsageUsers'),
      },
    ],
    labels: chartRows.map(row => dayjs(row.date).format(DateConstant.Format.MONTH_DATE)),
  });
});

const usersUsageChartRows = computed(() => {
  return UsageUserDataHelper.buildUsersUsageChartRows({
    rows: state.usersUsageRows,
    pricingTable: state.pricingTable,
  }).map(withUserDisplayName);
});

const usersUsageSummary = computed(() => (
  UsageUserDataHelper.buildUsersUsageSummary({
    rows: state.usersUsageRows,
    pricingTable: state.pricingTable,
  })
));

const usersUsageTokenDetails = computed(() => UsageKpiDetailsHelper.buildTokenDetails({
  metricTotals: usersUsageSummary.value,
}));

const usersUsageEstimatedCostDetails = computed(() => UsageKpiDetailsHelper.buildEstimatedCostDetails({
  metricTotals: usersUsageSummary.value,
}));

const kpiCards = computed(() => ([
  {
    icon: UsageConstant.Kpi.USERS.icon,
    i18nTitle: UsageConstant.Kpi.USERS.i18nTitle,
    height: USERS_KPI_CARD_HEIGHT,
    isLoading: state.isLoading,
    value: numUtils.format(usersUsageSummary.value.userCount),
  },
  {
    icon: UsageConstant.Kpi.TOTAL_TOKENS.icon,
    i18nTitle: UsageConstant.Kpi.TOTAL_TOKENS.i18nTitle,
    height: USERS_KPI_CARD_HEIGHT,
    isLoading: state.isLoading,
    value: numUtils.format(usersUsageSummary.value.totalTokens),
    details: usersUsageTokenDetails.value,
  },
  {
    icon: UsageConstant.Kpi.ESTIMATED_COST.icon,
    i18nTitle: UsageConstant.Kpi.ESTIMATED_COST.i18nTitle,
    i18nTooltip: UsageConstant.Kpi.ESTIMATED_COST.i18nTooltip,
    height: USERS_KPI_CARD_HEIGHT,
    isLoading: state.isLoading,
    value: `$${numUtils.format(usersUsageSummary.value.estimatedCost, 2)}`,
    details: usersUsageEstimatedCostDetails.value,
  },
]));

const limitedUsersUsageChartRows = computed(() => (
  usersUsageChartRows.value.slice(0, USERS_USAGE_CHART_BAR_LIMIT)
));

const usersUsageTableItems = computed(() => (
  UsageUserDataHelper.buildUsersUsageTableItems({
    rows: state.usersUsageRows,
    pricingTable: state.pricingTable,
  }).map(withUserDisplayName)
));

const shouldShowUsersUsageChartLimitNote = computed(() => (
  usersUsageTableItems.value.length > USERS_USAGE_CHART_BAR_LIMIT
));

const usersUsageTokenChart = computed(() => {
  const chartRows = limitedUsersUsageChartRows.value;

  return new UsageChartConfig({
    type: ChartConstant.Type.BAR.value,
    direction: ChartConstant.Direction.HORIZONTAL.value,
    i18nTitle: '__titleUsageTokensByUser',
    height: USERS_USAGE_CHART_HEIGHT,
    valueFormat: UsageConstant.ValueFormat.NUMBER.value,
    datasets: UsageDataHelper.buildTokenStackDatasets({
      rows: chartRows,
    }),
    labels: chartRows.map(row => row.userDisplayName),
  });
});

const usersUsageEstimatedCostChart = computed(() => {
  const chartRows = limitedUsersUsageChartRows.value;

  return new UsageChartConfig({
    type: ChartConstant.Type.BAR.value,
    direction: ChartConstant.Direction.HORIZONTAL.value,
    i18nTitle: '__titleUsageEstimatedCostByUser',
    i18nTooltip: '__tooltipUsageEstimatedCost',
    height: USERS_USAGE_CHART_HEIGHT,
    valueFormat: UsageConstant.ValueFormat.CURRENCY.value,
    datasets: UsageDataHelper.buildEstimatedCostStackDatasets({
      rows: chartRows,
    }),
    labels: chartRows.map(row => row.userDisplayName),
  });
});

const navigateToUserUsageChartRow = ({ dataIndex }) => {
  const user = limitedUsersUsageChartRows.value[dataIndex]?.user;
  if (!user) return;
  navigateTo(getUserUsagePagePath(user));
};

const forceUsersUsageChartUseLogarithmicScale = computed(() => (
  [
    usersUsageTokenChart.value,
    usersUsageEstimatedCostChart.value,
  ].some(chart => BarChartScaleHelper.canUseLogarithmicScale(chart))
));

const loadUsageData = async () => {
  const requestId = ++state.refreshRequest;
  state.isLoading = true;

  try {
    const [
      pricingTable,
      dailyUsersResult,
      usersUsageResult,
    ] = await Promise.all([
      fetchModelPricingTable(),
      fetchUsageData({
        preset: dailyUsersPreset,
        startDate: startDate.value,
        endDate: endDate.value,
      }),
      fetchUsageData({
        preset: usersUsagePreset,
        startDate: startDate.value,
        endDate: endDate.value,
      }),
    ]);

    if (requestId !== state.refreshRequest) {
      return;
    }

    state.pricingTable = pricingTable ?? {};

    if (dailyUsersResult) {
      state.dailyUsersRows = dailyUsersResult.rows;
    }

    if (usersUsageResult) {
      state.usersUsageRows = usersUsageResult.rows;
      await loadUserDisplayNames(getUsersFromUsageRows(usersUsageResult.rows));
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
          :icon="UsageConstant.Kpi.USERS.icon"
          class="mr-2"
          color="primary"
          size="small"
        />
        <span class="text-h6">
          {{ $t('__titleUsageUserAnalysis') }}
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
          <v-col cols="12">
            <UsageResultCard
              :has-content="dailyUsersChart.labels.length > 0"
              :is-loading="state.isLoading"
              :title="$t(dailyUsersChart.i18nTitle)"
            >
              <UsageBarChart :chart="dailyUsersChart" />
            </UsageResultCard>
          </v-col>
          <v-col cols="12">
            <UsageResultCardFrame
              :title="state.usersUsageChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value ? $t(usersUsageTokenChart.i18nTitle) : $t(usersUsageEstimatedCostChart.i18nTitle)"
              :tooltip="state.usersUsageChartVariant === UsageConstant.ChartVariant.ESTIMATED_COST.value ? $t(usersUsageEstimatedCostChart.i18nTooltip) : ''"
              :show-chart-limit-note="shouldShowUsersUsageChartLimitNote"
              :chart-limit="USERS_USAGE_CHART_BAR_LIMIT"
              :is-loading="state.isLoading"
            >
              <template #actions>
                <UsageChartVariantButtonToggle v-model="state.usersUsageChartVariant" />
              </template>
              <UsageResultCard
                v-if="state.usersUsageChartVariant === UsageConstant.ChartVariant.TOKEN_COUNT.value"
                :has-content="usersUsageTokenChart.labels.length > 0"
                :is-loading="state.isLoading"
              >
                <UsageBarChart
                  v-model:use-logarithmic-scale="state.usersUsageChartUseLogarithmicScale"
                  :chart="usersUsageTokenChart"
                  enable-logarithmic-scale
                  :force-use-logarithmic-scale="forceUsersUsageChartUseLogarithmicScale"
                  :on-bar-click="navigateToUserUsageChartRow"
                />
              </UsageResultCard>
              <UsageResultCard
                v-else
                :has-content="usersUsageEstimatedCostChart.labels.length > 0"
                :is-loading="state.isLoading"
              >
                <UsageBarChart
                  v-model:use-logarithmic-scale="state.usersUsageChartUseLogarithmicScale"
                  :chart="usersUsageEstimatedCostChart"
                  enable-logarithmic-scale
                  :force-use-logarithmic-scale="forceUsersUsageChartUseLogarithmicScale"
                  :on-bar-click="navigateToUserUsageChartRow"
                />
              </UsageResultCard>
            </UsageResultCardFrame>
          </v-col>
          <v-col cols="12">
            <UsageResultCard
              :has-content="usersUsageTableItems.length > 0"
              :is-loading="state.isLoading"
              :title="$t('__titleUsageDetailsByUser')"
            >
              <AppTable
                :headers="tableHeaders"
                :items="usersUsageTableItems"
                item-value="user"
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
                <template #header.otherTokens="slotProps">
                  <AppTableColumnHeader
                    :slot-props="slotProps"
                    :title="$t('__fieldUsageOtherTokens')"
                    :tooltip="$t('__tooltipUsageOtherTokens')"
                  />
                </template>
              </AppTable>
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
