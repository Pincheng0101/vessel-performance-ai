<script setup>
// Fleet-wide alerts: fleet_alerts is one row per anomaly episode (already opened→closed-window
// dedup'd upstream), across all vessels. Not vessel-scoped — mirrors DashboardFleetOverview /
// DashboardMaintenancePlanner (KPI grid + AppTable, no vessel selector). Row click opens that
// vessel's deep-dive, matching those two tabs' own navigation.
import * as FleetChartConstant from '~/constants/FleetChartConstant';
import * as FleetGlossaryConstant from '~/constants/FleetGlossaryConstant';

const server = useServer();
const route = useRoute();
const router = useRouter();
const T = FleetGlossaryConstant.Term;

// fact_alert is one row per alert episode across the whole fleet, open and closed alike; the
// roster is only needed for the "of N ships" denominator. agg_fleet_daily supplies the fleet's
// last day, which anchors the 30-day window below — it is the same `agg_fleet_daily:{}` the
// dashboard page itself loads, so useAsyncData serves it from cache rather than refetching.
//
// Floors the Suspense fallback at 1s — without it, a cache-warm reload can resolve fast enough
// that the loading illustration flashes for a single frame.
const [fetched] = await Promise.all([
  Promise.all([
    server.datalake.factAlert({}, { lazy: false }),
    server.datalake.dimVessel({ lazy: false }),
    server.datalake.aggFleetDaily({}, { lazy: false }),
  ]),
  delay(1000),
]);
const [{ data: alerts }, { data: ships }, { data: overviewRows }] = fetched;

// driver_metric — the raw signal whose deviation opened the episode.
const METRIC_ZH = {
  speed_loss: '速度損失',
  sfoc: '主機油耗 (SFOC)',
  slip: '螺槳滑失',
  excess_foc: '超額油耗',
};
const METRIC_ICON = {
  speed_loss: 'mdi-speedometer-slow',
  sfoc: 'mdi-engine',
  slip: 'mdi-fan',
  excess_foc: 'mdi-gas-station',
};
const METRIC_ORDER = ['speed_loss', 'sfoc', 'slip', 'excess_foc'];
const SEVERITY_LABEL = { low: '低', medium: '中', high: '高' };
const SEVERITY_ORDER = ['high', 'medium', 'low'];
const STATUS_LABEL = { open: '開啟', closed: '已關閉' };
const metricTitle = m => METRIC_ZH[m] || m;
const metricIcon = m => METRIC_ICON[m] || 'mdi-alert-circle-outline';
const severityColor = s => FleetChartConstant.SeverityColor[s] || FleetChartConstant.FallbackColor;

const rows = computed(() => (alerts.value ?? []).map((r, i) => ({
  id: r.alert_id || `${r.ship_id}-${r.driver_metric}-${r.opened_day}-${i}`,
  shipId: r.ship_id,
  metric: r.driver_metric,
  severity: r.severity,
  status: r.status,
  openedDay: r.opened_day,
  lastSeenDay: r.last_seen_day,
  message: r.message_zh,
})));

// --- KPIs ---
// The backlog is the *open* episodes; the closed ones stay in the table (and the total tile) as
// history. Alongside it, how much of that backlog is *new*: opened_day is a day index into the
// fleet's shared window (day 0 = 2021-07-01 for every ship), so a fleet-wide 30-day cutoff is
// simply the last day the fleet reported, less 30.
//
// "Recently seen" would say nothing here — every open episode's last_seen_day already falls
// inside that window, because the upstream closer is what ends an episode that stops recurring.
// Newly *opened* is the figure the status flag doesn't already carry.
const ALERT_WINDOW_DAYS = 30;
const fleetLastDay = computed(() => overviewRows.value?.at(-1)?.noon_utc ?? null);
const openRows = computed(() => rows.value.filter(r => r.status === 'open'));
const highSeverityCount = computed(() => openRows.value.filter(r => r.severity === 'high').length);
const vesselsAffected = computed(() => new Set(openRows.value.map(r => r.shipId)).size);
const recentRows = computed(() => {
  const lastDay = fleetLastDay.value;
  if (lastDay == null) return [];
  return rows.value.filter(r => r.openedDay != null && lastDay - r.openedDay <= ALERT_WINDOW_DAYS);
});
// The cutoff day carries a report_date, and a date is what a reader can place.
const windowStartDate = computed(() => {
  if (fleetLastDay.value == null) return '';
  const cutoff = fleetLastDay.value - ALERT_WINDOW_DAYS;
  return (overviewRows.value ?? []).find(r => r.noon_utc === cutoff)?.report_date ?? '';
});
const kpis = computed(() => [
  { label: 'Open alerts', value: `${openRows.value.length}`, sub: 'unresolved episodes', tooltip: T.openAlertCases },
  {
    label: 'High severity', value: `${highSeverityCount.value}`, sub: 'need priority attention', tooltip: T.highSeverityAlerts,
    color: highSeverityCount.value > 0 ? FleetChartConstant.SemanticRamp.critical : undefined,
  },
  {
    label: `New alerts (${ALERT_WINDOW_DAYS}d)`,
    value: fleetLastDay.value == null ? '–' : `${recentRows.value.length}`,
    sub: windowStartDate.value ? `opened since ${windowStartDate.value}` : 'opened recently',
    tooltip: T.recentAlerts,
  },
  { label: 'Vessels affected', value: `${vesselsAffected.value}`, sub: `of ${ships.value?.length ?? 0} ships`, tooltip: T.vesselsWithAlerts },
  { label: 'Total episodes', value: `${rows.value.length}`, sub: 'incl. closed', tooltip: T.anomaly },
]);

// --- Alerts by metric, stacked by severity ---
const causeSeverityOption = computed(() => {
  const metrics = METRIC_ORDER.filter(m => rows.value.some(r => r.metric === m));
  if (!metrics.length) return {};
  return {
    grid: { left: 48, right: 16, top: 38, bottom: 50 },
    legend: {
      top: 8, left: 'center', itemGap: 16, itemWidth: 20, itemHeight: 10,
      textStyle: { fontSize: 11 },
      data: SEVERITY_ORDER.map(s => SEVERITY_LABEL[s]),
    },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: metrics.map(metricTitle) },
    yAxis: { type: 'value', name: 'alerts', nameGap: 18, minInterval: 1 },
    series: SEVERITY_ORDER.map(sev => ({
      name: SEVERITY_LABEL[sev],
      type: 'bar',
      stack: 'severity',
      itemStyle: { color: severityColor(sev) },
      data: metrics.map(m => rows.value.filter(r => r.metric === m && r.severity === sev).length),
    })),
  };
});

// --- Alerts table ---
// Same fake-server-side pattern as the maintenance planner's backlog table: AppFilterInput's
// field filters and pagination only reach the caller in `server-side` mode, and this dataset has
// no real backend, so filter/sort/paginate happens locally and only the current page is handed
// to AppTable.
const tableHeaders = [
  { title: 'Ship', key: 'shipId', sortable: true, minWidth: 90 },
  { title: 'Metric', key: 'metric', sortable: true, minWidth: 150, tooltip: T.cause },
  { title: 'Severity', key: 'severity', sortable: true, width: 100, minWidth: 100, tooltip: T.severity },
  { title: 'Status', key: 'status', sortable: true, width: 100, minWidth: 100 },
  { title: 'Opened', key: 'openedDay', sortable: true, minWidth: 100 },
  { title: 'Last seen', key: 'lastSeenDay', sortable: true, minWidth: 100 },
];
const filterOptions = [
  { title: 'Ship', field: 'shipId' },
  { title: 'Metric', field: 'metric', values: METRIC_ORDER.map(value => ({ title: metricTitle(value), value })) },
  { title: 'Severity', field: 'severity', values: SEVERITY_ORDER.map(value => ({ title: SEVERITY_LABEL[value], value })) },
  { title: 'Status', field: 'status', values: Object.entries(STATUS_LABEL).map(([value, title]) => ({ title, value })) },
];

const tableState = reactive({
  page: 1,
  perPage: 10,
  query: '',
  filters: [],
  sortField: 'openedDay',
  sortOrder: 'DESC',
});
// Searches the rendered dates as well as the raw day indices the cells no longer show — without
// them, "2024-01" would match nothing while every visible cell reads as a date.
const matchesQuery = (row, q) => {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [row.shipId, metricTitle(row.metric), SEVERITY_LABEL[row.severity], STATUS_LABEL[row.status],
    row.openedDay, row.lastSeenDay, fleetUtils.dayDate(row.openedDay), fleetUtils.dayDate(row.lastSeenDay), row.message]
    .some(v => String(v ?? '').toLowerCase().includes(needle));
};
const matchesFilters = (row, filters) => filters.every((f) => {
  const rowVal = String(row[f.field] ?? '').toLowerCase();
  const filterVal = String(f.value ?? '').toLowerCase();
  if (f.operator === '!=') return rowVal !== filterVal;
  if (f.operator === '*=') return rowVal.includes(filterVal);
  return rowVal === filterVal;
});
const filteredRows = computed(() => rows.value.filter(r => matchesQuery(r, tableState.query) && matchesFilters(r, tableState.filters)));
const sortedRows = computed(() => {
  const list = [...filteredRows.value];
  const { sortField, sortOrder } = tableState;
  if (!sortField) return list;
  list.sort((a, b) => {
    const av = a[sortField];
    const bv = b[sortField];
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
    return sortOrder === 'DESC' ? -cmp : cmp;
  });
  return list;
});
const pagedRows = computed(() => {
  const start = (tableState.page - 1) * tableState.perPage;
  return sortedRows.value.slice(start, start + tableState.perPage);
});
const hasNextPage = computed(() => tableState.page * tableState.perPage < sortedRows.value.length);
// AppFilterInput bundles both the field filters and the free-text query into this single
// callback (its onUpdate is wired to AppTable's own internal handler, which forwards both here
// together) — onQueryChange is never invoked once filterOptions is set.
const handleFiltersChange = (filters, query) => {
  tableState.filters = filters ?? [];
  tableState.query = query ?? '';
  tableState.page = 1;
};
// Declaring onQueryChange is what tells AppTable the caller owns the free-text query, so it stops
// handing that query to Vuetify's own row filter as well. That filter matches the RAW column
// values — openedDay/lastSeenDay are day indices — so now the cells render dates it would reject
// every date query before matchesQuery ever saw the row. matchesQuery searches what is displayed;
// it should be the only filter. (AppFilterInput routes the query through onFiltersChange, so this
// stays in sync even though AppTable never calls it while filterOptions is set.)
const handleQueryChange = (query) => {
  tableState.query = query ?? '';
  tableState.page = 1;
};
const handleSortByChange = ({ key, order }) => {
  tableState.sortField = key;
  tableState.sortOrder = (order || 'asc').toUpperCase();
};
const handlePageChange = (p) => {
  tableState.page = p;
};
const handlePerPageChange = (pp) => {
  tableState.perPage = pp;
  tableState.page = 1;
};
const openVesselDetail = async (item) => {
  if (!item?.shipId) return;
  await router.push({
    query: {
      ...route.query,
      tab: 'vessel',
      ship: item.shipId,
    },
  });
  await delay(0);
  scrollUtils.scrollTo();
};
</script>

<template>
  <div class="d-flex flex-column ga-6">
    <div class="kpi-grid">
      <DashboardKpiCard
        v-for="k in kpis"
        :key="k.label"
        :label="k.label"
        :value="k.value"
        :tooltip="k.tooltip"
        :value-color="k.color"
      >
        <div class="text-caption text-medium-emphasis mt-1">
          {{ k.sub }}
        </div>
      </DashboardKpiCard>
    </div>

    <UsageResultCardFrame
      :title="FleetGlossaryConstant.Title.alertsBySeverity"
      :tooltip="T.alertsBySeverity"
    >
      <UsageResultCard>
        <AppEChart
          :option="causeSeverityOption"
          :height="260"
        />
      </UsageResultCard>
    </UsageResultCardFrame>

    <UsageResultCardFrame
      :title="FleetGlossaryConstant.Title.fleetAlertsTable"
      :tooltip="T.fleetAlertsTable"
    >
      <UsageResultCard>
        <!-- enable-url-params defaults on and would sync filter/sort/page into the shared page
             query string — this table never reads them back on mount, so it would only pollute
             the URL (and leak into the tab/ship params a row click writes next). -->
        <AppTable
          :headers="tableHeaders"
          :items="pagedRows"
          item-value="id"
          :enable-url-params="false"
          :filter-options="filterOptions"
          :page="tableState.page"
          :per-page="tableState.perPage"
          :has-next-page="hasNextPage"
          :sort-field="tableState.sortField"
          :sort-order="tableState.sortOrder"
          :on-row-click="openVesselDetail"
          :on-filters-change="handleFiltersChange"
          :on-query-change="handleQueryChange"
          :on-sort-by-change="handleSortByChange"
          :on-page-change="handlePageChange"
          :on-per-page-change="handlePerPageChange"
          is-row-selectable
          enable-expand
          bordered
        >
          <template
            v-for="h in tableHeaders"
            :key="h.key"
            #[`header.${h.key}`]="slotProps"
          >
            <AppTableColumnHeader
              :slot-props="slotProps"
              :title="h.title"
              :tooltip="h.tooltip"
            />
          </template>
          <template #expanded-row="{ item }">
            <div class="py-2">
              <div>{{ item.message }}</div>
            </div>
          </template>
          <template #item.shipId="{ item }">
            <span class="font-weight-medium">{{ item.shipId }}</span>
          </template>
          <template #item.metric="{ item }">
            <div class="d-flex align-center ga-2">
              <v-icon
                :icon="metricIcon(item.metric)"
                size="18"
                class="text-medium-emphasis"
              />
              <span>{{ metricTitle(item.metric) }}</span>
            </div>
          </template>
          <template #item.severity="{ item }">
            <AppChip
              variant="outlined"
              :text="SEVERITY_LABEL[item.severity] || item.severity"
              :color="severityColor(item.severity)"
            />
          </template>
          <template #item.status="{ item }">
            <span :class="item.status === 'open' ? '' : 'text-medium-emphasis'">
              {{ STATUS_LABEL[item.status] || item.status }}
            </span>
          </template>
          <template #item.openedDay="{ item }">
            {{ fleetUtils.dayLabel(item.openedDay) ?? '–' }}
          </template>
          <template #item.lastSeenDay="{ item }">
            {{ fleetUtils.dayLabel(item.lastSeenDay) ?? '–' }}
          </template>
        </AppTable>
      </UsageResultCard>
    </UsageResultCardFrame>
  </div>
</template>

<style lang="scss" scoped>
.kpi-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, 1fr);

  @media (min-width: 600px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: 1280px) {
    grid-template-columns: repeat(5, 1fr);
  }
}
</style>
