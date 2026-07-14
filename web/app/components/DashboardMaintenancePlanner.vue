<script setup>
// Fleet-wide maintenance planner: a Gantt of per-ship service windows, net saving by quarter
// (stacked by service type), and a saving-ranked action backlog. Not vessel-scoped (unlike the
// vessel deep-dive / speed optimizer tabs) — mirrors DashboardFleetOverview's structure (KPI
// grid + AppTable, no vessel selector). Row click opens that ship's deep-dive.
//
// fact_maintenance_recommendation carries the *saving* of an action (net_saving_usd), not its
// cost — so this tab answers "what will this earn back", not "what will this cost", and there is
// no ROI ratio to compute. Non-economic actions (e.g. engine_inspection) carry no saving at all.
import { FleetChartConstant, FleetGlossaryConstant } from '~/constants';

const server = useServer();
const route = useRoute();
const router = useRouter();
const { themeColors } = useCustomTheme();
const T = FleetGlossaryConstant.Term;

const fmtUsd = v => (v == null ? '–' : `$${Math.round(v).toLocaleString()}`);
const fmtUsdCompact = (v) => {
  if (v == null) return '–';
  const n = Math.abs(v);
  if (n >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${Math.round(v / 1e3)}k`;
  return `$${Math.round(v)}`;
};

// Floors the Suspense fallback at 1s — without it, a cache-warm reload can resolve fast enough
// that the loading illustration flashes for a single frame.
const [{ data: plans }] = await Promise.all([
  server.datalake.factMaintenanceRecommendation({}, { lazy: false }),
  delay(1000),
]);

const ACTION_LABEL = {
  hull_cleaning: '船體清潔',
  propeller_polishing: '螺旋槳拋光',
  propeller_repair: '螺旋槳修理',
  coating_renewal: '船體塗層更新',
  engine_inspection: '主機檢查',
};
// Same icon choices as the vessel tab's own maintenance-recommendation list — one action, one
// icon, fleet-wide.
const ACTION_ICON = {
  hull_cleaning: 'mdi-spray-bottle',
  propeller_polishing: 'mdi-fan',
  propeller_repair: 'mdi-fan',
  coating_renewal: 'mdi-format-paint',
  engine_inspection: 'mdi-engine',
};
const actionIcon = a => ACTION_ICON[a] || 'mdi-wrench-outline';
const SERVICE_LABEL = { dry_dock: '乾塢', in_water: '水下' };
const PRIORITY_LABEL = { high: '高', medium: '中', low: '低' };
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
const serviceColor = t => FleetChartConstant.ServiceTypeColor[t] || FleetChartConstant.FallbackColor;
const priorityColor = p => FleetChartConstant.SeverityColor[p] || FleetChartConstant.FallbackColor;

// --- Saving-ranked backlog (one row per recommended action) ---
// A ship can have several rows (one per action), so `shipId` alone isn't a unique row key —
// needed once the table paginates/sorts and Vue has to track row identity across re-renders.
const backlog = computed(() => (plans.value ?? []).map((r, i) => ({
  id: `${r.ship_id}-${r.action_type}-${r.plan_date}-${i}`,
  shipId: r.ship_id,
  action: r.action_type,
  priority: r.priority,
  serviceType: r.plan_service_type,
  planDate: r.plan_date,
  dueDay: r.due_day,
  netSaving: r.net_saving_usd ?? null,
  rationale: r.rationale,
})));

// --- Service windows (Gantt + quarterly saving): actions sharing (ship, plan date, service type)
// merge into one call — the batching the recommendation engine already applies, so a single port
// stop isn't fragmented into several bars/lines.
const windows = computed(() => {
  const groups = new Map();
  (plans.value ?? []).forEach((r) => {
    if (!r.plan_date) return;
    const key = `${r.ship_id}|${r.plan_date}|${r.plan_service_type}`;
    let w = groups.get(key);
    if (!w) {
      w = {
        shipId: r.ship_id,
        planDate: r.plan_date,
        serviceType: r.plan_service_type,
        actions: [],
        netSaving: 0,
        priority: 'low',
      };
      groups.set(key, w);
    }
    w.actions.push(r.action_type);
    w.netSaving += r.net_saving_usd || 0;
    if ((PRIORITY_RANK[r.priority] ?? 9) < (PRIORITY_RANK[w.priority] ?? 9)) w.priority = r.priority;
  });
  return [...groups.values()];
});

// --- KPIs ---
const totalNetSaving = computed(() => backlog.value.reduce((s, r) => s + Math.max(0, r.netSaving || 0), 0));
const highPriorityCount = computed(() => backlog.value.filter(r => r.priority === 'high').length);
const dryDockCount = computed(() => windows.value.filter(w => w.serviceType === 'dry_dock').length);
const nextWindowDate = computed(() => {
  const dates = windows.value.map(w => w.planDate).filter(Boolean);
  return dates.length ? dates.reduce((mn, d) => (d < mn ? d : mn)) : null;
});

const kpis = computed(() => [
  { label: 'Open actions', value: `${backlog.value.length}`, sub: 'backlog total', tooltip: T.maintenanceAction },
  {
    label: 'High priority', value: `${highPriorityCount.value}`, sub: 'need priority attention',
    color: highPriorityCount.value > 0 ? FleetChartConstant.SemanticRamp.critical : undefined,
  },
  {
    label: 'Net saving', value: fmtUsdCompact(totalNetSaving.value), sub: 'backlog total', tooltip: T.netSaving, color: FleetChartConstant.SemanticRamp.good,
  },
  { label: 'Dry-dock windows', value: `${dryDockCount.value}`, sub: 'haul-out service windows', tooltip: T.dryDockWindow },
  { label: 'Next window', value: nextWindowDate.value || '–', sub: 'earliest plan date', tooltip: T.nextMaintenance },
]);

const openShipDetail = async (item) => {
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

// --- Backlog table ---
// AppTable's field-filter search box (AppFilterInput) and pagination only wire up in
// `server-side` mode — with it off, filter/query changes never reach the caller at all. This
// dataset has no real backend, so `server-side` is left on and the on-*-change callbacks below
// implement a small local "fake server": filter + sort + paginate the in-memory backlog
// ourselves and hand AppTable only the current page, exactly as a real backend response would.
const tableHeaders = [
  { title: 'Ship', key: 'shipId', sortable: true, minWidth: 90 },
  { title: 'Action', key: 'action', sortable: true, minWidth: 160, tooltip: T.maintenanceAction },
  { title: 'Priority', key: 'priority', sortable: true, width: 90, minWidth: 90 },
  { title: 'Service', key: 'serviceType', sortable: true, minWidth: 110, tooltip: T.serviceType },
  { title: 'Plan date', key: 'planDate', sortable: true, minWidth: 110 },
  { title: 'Due (ETA)', key: 'dueDay', sortable: true, minWidth: 110, tooltip: T.nextMaintenance },
  { title: 'Net saving', key: 'netSaving', sortable: true, minWidth: 110, tooltip: T.netSaving },
  { title: 'Rationale', key: 'rationale', sortable: false, minWidth: 220 },
];
const filterOptions = [
  { title: 'Ship', field: 'shipId' },
  { title: 'Action', field: 'action', values: Object.entries(ACTION_LABEL).map(([value, title]) => ({ title, value })) },
  { title: 'Priority', field: 'priority', values: Object.entries(PRIORITY_LABEL).map(([value, title]) => ({ title, value })) },
  { title: 'Service', field: 'serviceType', values: Object.entries(SERVICE_LABEL).map(([value, title]) => ({ title, value })) },
];

const tableState = reactive({
  page: 1,
  perPage: 10,
  query: '',
  filters: [],
  sortField: 'netSaving',
  sortOrder: 'DESC',
});
const matchesQuery = (row, q) => {
  if (!q) return true;
  const needle = q.toLowerCase();
  return [row.shipId, ACTION_LABEL[row.action] || row.action, PRIORITY_LABEL[row.priority], SERVICE_LABEL[row.serviceType], row.planDate, row.rationale]
    .some(v => String(v ?? '').toLowerCase().includes(needle));
};
const matchesFilters = (row, filters) => filters.every((f) => {
  const rowVal = String(row[f.field] ?? '').toLowerCase();
  const filterVal = String(f.value ?? '').toLowerCase();
  if (f.operator === '!=') return rowVal !== filterVal;
  if (f.operator === '*=') return rowVal.includes(filterVal);
  return rowVal === filterVal;
});
const filteredBacklog = computed(() => backlog.value.filter(r => matchesQuery(r, tableState.query) && matchesFilters(r, tableState.filters)));
const sortedBacklog = computed(() => {
  const rows = [...filteredBacklog.value];
  const { sortField, sortOrder } = tableState;
  if (!sortField) return rows;
  rows.sort((a, b) => {
    const av = a[sortField];
    const bv = b[sortField];
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === 'string' ? av.localeCompare(bv) : av - bv;
    return sortOrder === 'DESC' ? -cmp : cmp;
  });
  return rows;
});
const pagedBacklog = computed(() => {
  const start = (tableState.page - 1) * tableState.perPage;
  return sortedBacklog.value.slice(start, start + tableState.perPage);
});
const hasNextPage = computed(() => tableState.page * tableState.perPage < sortedBacklog.value.length);
// AppTable renders AppFilterInput (not a plain search box) once filterOptions is set, and its
// onUpdate is wired to AppTable's own internal handler, which forwards BOTH the field-scoped
// filters and the free-text query through this single callback — onQueryChange is never invoked
// in this mode, so the query has to be read from the second argument here instead.
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

// --- Maintenance Gantt (swim lanes by ship) ---
// Same custom-series technique as the vessel tab's anomaly-episode timeline: a silent
// alternating-band series for lane chrome, plus a bar series with a renderItem that draws a
// floating [start, end] rect per window (a plain 'bar' series can't float on a time axis).
// Fixed order (dry-dock first) so this chart's legend always matches the capex chart's —
// a Set-derived order would otherwise vary with whichever service type appears first in the data.
const SERVICE_ORDER = ['dry_dock', 'in_water'];
const DURATION_DAYS = { dry_dock: 12, in_water: 2 };
const PRIORITY_STYLE = {
  high: { opacity: 0.92, stroke: '#0f172a', strokeWidth: 1.6 },
  medium: { opacity: 0.78, stroke: '#475569', strokeWidth: 1.1 },
  low: { opacity: 0.6, stroke: '#94a3b8', strokeWidth: 0.8 },
};
const styleForPriority = p => PRIORITY_STYLE[p] || PRIORITY_STYLE.low;
const renderLaneBand = (params, api) => {
  const laneIndex = api.value(0);
  const start = api.coord([api.value(1), laneIndex]);
  const end = api.coord([api.value(2), laneIndex]);
  const laneHeight = api.size([0, 1])[1];
  const minX = params.coordSys.x;
  const maxX = params.coordSys.x + params.coordSys.width;
  const x = Math.max(Math.min(start[0], end[0]), minX);
  const width = Math.min(Math.max(start[0], end[0]), maxX) - x;
  if (width <= 0) return null;
  return {
    type: 'rect',
    shape: { x, y: start[1] - laneHeight / 2, width, height: laneHeight },
    style: api.style(),
  };
};
const renderWindowBar = (params, api) => {
  const laneIndex = api.value(0);
  const start = api.coord([api.value(1), laneIndex]);
  const end = api.coord([api.value(2), laneIndex]);
  const laneHeight = api.size([0, 1])[1];
  const height = Math.min(20, Math.max(10, laneHeight * 0.5));
  const minX = params.coordSys.x;
  const maxX = params.coordSys.x + params.coordSys.width;
  const rawX = Math.min(start[0], end[0]);
  const rawWidth = Math.max(Math.abs(end[0] - start[0]), 4);
  const x = Math.max(rawX, minX);
  const width = Math.min(rawX + rawWidth, maxX) - x;
  if (width <= 0) return null;
  return {
    type: 'rect',
    shape: { x, y: start[1] - height / 2, width, height, r: 3 },
    style: { ...api.style(), stroke: '#ffffff', lineWidth: 0.6 },
  };
};
const DAY = 86_400_000;
const maintenanceGanttOption = computed(() => {
  const list = windows.value
    .map(w => ({ ...w, startTs: Date.parse(w.planDate) }))
    .filter(w => !Number.isNaN(w.startTs));
  if (!list.length) return {};
  list.forEach((w) => {
    w.endTs = w.startTs + (DURATION_DAYS[w.serviceType] ?? DURATION_DAYS.in_water) * DAY;
  });

  // Lane order: earliest window first, so the chart reads top-to-bottom like a schedule.
  const firstByShip = new Map();
  list.forEach((w) => {
    const cur = firstByShip.get(w.shipId);
    if (cur == null || w.startTs < cur) firstByShip.set(w.shipId, w.startTs);
  });
  const lanes = [...firstByShip.keys()].sort((a, b) => firstByShip.get(a) - firstByShip.get(b));
  const laneIndex = new Map(lanes.map((shipId, i) => [shipId, i]));

  const minTs = Math.min(...list.map(w => w.startTs));
  const maxTs = Math.max(...list.map(w => w.endTs));
  const xPad = Math.max(10 * DAY, (maxTs - minTs) * 0.06);
  const xMin = minTs - xPad;
  const xMax = maxTs + xPad;
  const c = themeColors.value;
  const laneBandColors = [c.backgroundScale1, c.backgroundScale2];
  const serviceTypes = SERVICE_ORDER.filter(t => list.some(w => w.serviceType === t));

  return {
    grid: { left: 72, right: 20, top: 40, bottom: 40 },
    legend: {
      top: 8, left: 'center', itemGap: 16, itemWidth: 18, itemHeight: 9,
      textStyle: { fontSize: 11 },
      data: serviceTypes.map(t => SERVICE_LABEL[t] || t),
    },
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        const w = p.data.row;
        const acts = (w.actions || []).map(a => ACTION_LABEL[a] || a).join('、');
        return `${w.shipId} · ${w.planDate}<br/>${SERVICE_LABEL[w.serviceType] || w.serviceType} · 優先度${PRIORITY_LABEL[w.priority] || w.priority}<br/>${acts}<br/>淨節省 ${fmtUsd(w.netSaving)}`;
      },
    },
    xAxis: { type: 'time', min: xMin, max: xMax },
    yAxis: {
      type: 'category', data: lanes, boundaryGap: true, inverse: true,
      axisTick: { show: false },
    },
    series: [
      {
        type: 'custom', renderItem: renderLaneBand, silent: true, encode: { x: [1, 2], y: 0 }, z: 0,
        data: lanes.map((_, i) => ({ value: [i, xMin, xMax], itemStyle: { color: laneBandColors[i % 2] } })),
      },
      ...serviceTypes.map(type => ({
        name: SERVICE_LABEL[type] || type,
        type: 'custom', renderItem: renderWindowBar, encode: { x: [1, 2], y: 0 },
        itemStyle: { color: serviceColor(type) },
        z: 2,
        data: list
          .filter(w => w.serviceType === type)
          .map(w => ({
            value: [laneIndex.get(w.shipId), w.startTs, w.endTs],
            itemStyle: { opacity: styleForPriority(w.priority).opacity, borderColor: styleForPriority(w.priority).stroke, borderWidth: styleForPriority(w.priority).strokeWidth },
            row: w,
          })),
      })),
    ],
  };
});

// --- Net saving by quarter (stacked bar, dry_dock / in_water) ---
const quarterOf = (planDate) => {
  const [y, m] = planDate.split('-');
  return `${y}-Q${Math.floor((Number(m) - 1) / 3) + 1}`;
};
const savingByQuarter = computed(() => {
  const byQ = new Map();
  (plans.value ?? []).forEach((r) => {
    if (!r.plan_date) return;
    const q = quarterOf(r.plan_date);
    const rec = byQ.get(q) ?? { quarter: q, dry_dock: 0, in_water: 0 };
    // Non-economic actions (engine_inspection) have no net_saving_usd — they still occupy a
    // service window, they just add nothing to the bar.
    rec[r.plan_service_type] = (rec[r.plan_service_type] || 0) + (r.net_saving_usd || 0);
    byQ.set(q, rec);
  });
  return [...byQ.values()].sort((a, b) => a.quarter.localeCompare(b.quarter));
});
const savingByQuarterOption = computed(() => {
  const rows = savingByQuarter.value;
  if (!rows.length) return {};
  return {
    grid: { left: 64, right: 20, top: 40, bottom: 40 },
    legend: {
      top: 8, left: 'center', itemGap: 16, itemWidth: 20, itemHeight: 10,
      textStyle: { fontSize: 11 },
      data: ['乾塢', '水下'],
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const list = Array.isArray(params) ? params : [params];
        const total = list.reduce((sum, p) => sum + (p.value || 0), 0);
        const body = list.map(p => `${p.marker}${p.seriesName}: ${fmtUsd(p.value)}`).join('<br/>');
        return `${list[0]?.name}<br/>${body}<br/>合計: ${fmtUsd(total)}`;
      },
    },
    xAxis: { type: 'category', data: rows.map(r => r.quarter) },
    yAxis: { type: 'value', name: 'USD', nameGap: 14, axisLabel: { formatter: fmtUsdCompact } },
    series: [
      { name: '乾塢', type: 'bar', stack: 'saving', itemStyle: { color: serviceColor('dry_dock') }, data: rows.map(r => Math.round(r.dry_dock)) },
      { name: '水下', type: 'bar', stack: 'saving', itemStyle: { color: serviceColor('in_water') }, data: rows.map(r => Math.round(r.in_water)) },
    ],
  };
});
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
      :title="FleetGlossaryConstant.Title.maintenanceGantt"
      :tooltip="T.maintenanceGantt"
    >
      <UsageResultCard>
        <AppEChart
          :option="maintenanceGanttOption"
          :height="320"
        />
      </UsageResultCard>
    </UsageResultCardFrame>

    <UsageResultCardFrame
      :title="FleetGlossaryConstant.Title.savingByQuarter"
      :tooltip="T.savingByQuarter"
    >
      <UsageResultCard>
        <AppEChart
          :option="savingByQuarterOption"
          :height="260"
        />
      </UsageResultCard>
    </UsageResultCardFrame>

    <UsageResultCardFrame
      :title="FleetGlossaryConstant.Title.maintenanceBacklog"
      :tooltip="T.maintenanceBacklog"
    >
      <UsageResultCard>
        <!-- enable-url-params defaults on and would sync filter/sort/page into the shared page
             query string — this table never reads them back on mount, so it would only pollute
             the URL. -->
        <AppTable
          :headers="tableHeaders"
          :items="pagedBacklog"
          item-value="id"
          :enable-url-params="false"
          :filter-options="filterOptions"
          :page="tableState.page"
          :per-page="tableState.perPage"
          :has-next-page="hasNextPage"
          :sort-field="tableState.sortField"
          :sort-order="tableState.sortOrder"
          :on-row-click="openShipDetail"
          :on-filters-change="handleFiltersChange"
          :on-sort-by-change="handleSortByChange"
          :on-page-change="handlePageChange"
          :on-per-page-change="handlePerPageChange"
          is-row-selectable
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
          <template #item.shipId="{ item }">
            <span class="font-weight-medium">{{ item.shipId }}</span>
          </template>
          <template #item.action="{ item }">
            <div class="d-flex align-center ga-2">
              <v-icon
                :icon="actionIcon(item.action)"
                size="18"
                class="text-medium-emphasis"
              />
              <span>{{ ACTION_LABEL[item.action] || item.action }}</span>
            </div>
          </template>
          <template #item.priority="{ item }">
            <AppChip
              variant="outlined"
              :text="PRIORITY_LABEL[item.priority] || item.priority"
              :color="priorityColor(item.priority)"
            />
          </template>
          <template #item.serviceType="{ item }">
            <AppChip
              v-if="item.serviceType"
              variant="outlined"
              :text="SERVICE_LABEL[item.serviceType] || item.serviceType"
              :color="serviceColor(item.serviceType)"
            />
            <span
              v-else
              class="text-medium-emphasis"
            >–</span>
          </template>
          <template #item.dueDay="{ item }">
            {{ item.dueDay == null ? '–' : `第 ${item.dueDay} 天` }}
          </template>
          <template #item.netSaving="{ item }">
            <span :class="item.netSaving > 0 ? 'text-success font-weight-medium' : 'text-medium-emphasis'">
              {{ fmtUsd(item.netSaving) }}
            </span>
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
