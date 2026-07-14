<script setup>
// Fleet-wide alerts: fleet_alerts is one row per anomaly episode (already opened→closed-window
// dedup'd upstream), across all vessels. Not vessel-scoped — mirrors DashboardFleetOverview /
// DashboardMaintenancePlanner (KPI grid + AppTable, no vessel selector). Row click opens that
// vessel's deep-dive, matching those two tabs' own navigation.
import { FleetChartConstant, FleetGlossaryConstant } from '~/constants';

const server = useServer();
const route = useRoute();
const router = useRouter();
const T = FleetGlossaryConstant.Term;

// v2's fleet_alerts is metric-based (which raw signal triggered the anomaly) rather than v1's
// rule-based "cause" attribution, and drops cost/recommended-action/localized message (doc/api_v2.md
// §4) — but is otherwise a direct, real-ship equivalent, so this whole tab moves to v2 rather than
// falling back. The "Excess cost" column has no v2 source and is dropped rather than backfilled
// from v1 (excess cost already has its own v1-badged home in the Executive/Fleet Overview KPIs).
//
// Floors the Suspense fallback at 1s — without it, a cache-warm reload can resolve fast enough
// that the loading illustration flashes for a single frame.
const [fetched] = await Promise.all([
  Promise.all([
    server.datalake.v2FleetAlerts({ lazy: false }),
    server.datalake.v2FleetVessels({ lazy: false }),
  ]),
  delay(1000),
]);
const [{ data: alerts }, { data: ships }] = fetched;

const lastDayByShip = computed(() => Object.fromEntries((ships.value ?? []).map(v => [v.ship_id, v.last_day])));

// v2's anomaly-triggering metric, standing in for v1's rule-based cause taxonomy.
const METRIC_ZH = {
  speed_loss_pct: '速度損失',
  sfoc: '主機油耗 (SFOC)',
  me_slip: '螺槳滑失',
  total_consump: '總油耗',
};
const METRIC_ICON = {
  speed_loss_pct: 'mdi-speedometer-slow',
  sfoc: 'mdi-engine',
  me_slip: 'mdi-fan',
  total_consump: 'mdi-gas-station',
};
const METRIC_ORDER = ['speed_loss_pct', 'sfoc', 'me_slip', 'total_consump'];
const SEVERITY_LABEL = { low: '低', medium: '中', high: '高' };
const SEVERITY_ORDER = ['high', 'medium', 'low'];
const metricTitle = m => METRIC_ZH[m] || m;
const metricIcon = m => METRIC_ICON[m] || 'mdi-alert-circle-outline';
const severityColor = s => FleetChartConstant.SeverityColor[s] || FleetChartConstant.FallbackColor;

const rows = computed(() => (alerts.value ?? []).map((r, i) => ({
  id: r.alert_id || `${r.ship_id}-${r.metric}-${r.opened_day}-${i}`,
  shipId: r.ship_id,
  metric: r.metric,
  severity: r.severity,
  openedDay: r.opened_day,
  lastSeenDay: r.last_seen_day,
  message: r.message,
})));

// --- KPIs ---
const highSeverityCount = computed(() => rows.value.filter(r => r.severity === 'high').length);
const vesselsAffected = computed(() => new Set(rows.value.map(r => r.shipId)).size);
// "Recent" is per-ship: each ship's own relative-day axis is independent (day 0 is a different
// real calendar date per ship), so "opened in the last 30 days" means within 30 days of that
// specific ship's own latest data day, not a shared cutoff.
const recentCount = computed(() => rows.value.filter((r) => {
  const shipLastDay = lastDayByShip.value[r.shipId];
  return shipLastDay != null && r.openedDay != null && shipLastDay - r.openedDay <= 30;
}).length);
const kpis = computed(() => [
  { label: 'Open alerts', value: `${rows.value.length}`, sub: 'open episodes', tooltip: T.openAlertCases },
  {
    label: 'High severity', value: `${highSeverityCount.value}`, sub: 'need priority attention', tooltip: T.highSeverityAlerts,
    color: highSeverityCount.value > 0 ? FleetChartConstant.SemanticRamp.critical : undefined,
  },
  { label: 'Vessels affected', value: `${vesselsAffected.value}`, sub: `of ${ships.value?.length ?? 0} ships`, tooltip: T.vesselsWithAlerts },
  { label: 'Opened last 30d', value: `${recentCount.value}`, sub: 'new episodes', tooltip: T.recentAlerts },
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
  { title: 'Opened', key: 'openedDay', sortable: true, minWidth: 100 },
  { title: 'Last seen', key: 'lastSeenDay', sortable: true, minWidth: 100 },
];
const filterOptions = [
  { title: 'Ship', field: 'shipId' },
  { title: 'Metric', field: 'metric', values: METRIC_ORDER.map(value => ({ title: metricTitle(value), value })) },
  { title: 'Severity', field: 'severity', values: SEVERITY_ORDER.map(value => ({ title: SEVERITY_LABEL[value], value })) },
];

const tableState = reactive({
  page: 1,
  perPage: 10,
  query: '',
  filters: [],
  sortField: 'openedDay',
  sortOrder: 'DESC',
});
const matchesQuery = (row, q) => {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [row.shipId, metricTitle(row.metric), SEVERITY_LABEL[row.severity], row.openedDay, row.lastSeenDay, row.message]
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
        <AppDataSourceBadge
          version="v2"
          class="mt-2"
        />
      </DashboardKpiCard>
    </div>

    <UsageResultCardFrame
      :title="FleetGlossaryConstant.Title.alertsBySeverity"
      :tooltip="T.alertsBySeverity"
    >
      <template #actions>
        <AppDataSourceBadge version="v2" />
      </template>
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
      <template #actions>
        <AppDataSourceBadge version="v2" />
      </template>
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
          <template #item.openedDay="{ item }">
            第 {{ item.openedDay }} 天
          </template>
          <template #item.lastSeenDay="{ item }">
            第 {{ item.lastSeenDay }} 天
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
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
