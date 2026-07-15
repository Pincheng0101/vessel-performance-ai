<script setup>
// Fleet overview tab (all-fleet, no fleet filter): KPIs, per-vessel table, CII rating
// distribution + speed-loss distribution. Self-contained; loads when its tab is opened.
import * as FleetChartConstant from '~/constants/FleetChartConstant';
import * as FleetGlossaryConstant from '~/constants/FleetGlossaryConstant';

const server = useServer();
const route = useRoute();
const router = useRouter();
// One source of truth for the action line — re-typing the literal here is how it drifts.
const THRESHOLD = FleetChartConstant.SpeedLossThreshold;
const SLOPE_EPS = 0.0015;
// The window every other tab already reads speed loss over (營運總覽's fleet trend, the vessel
// deep-dive). A single ISO-valid day carries ~4.4 pp of fit scatter — enough to read negative on
// a clean hull — so the hull condition only shows up in the mean.
const SPEED_LOSS_WINDOW = 30;

const fmtPct = v => (v == null ? '–' : `${v.toFixed(1)}%`);
const fmtInt = v => (v == null ? '–' : Math.round(v).toLocaleString());
const fmtUsdCompact = (v) => {
  if (v == null) return '–';
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}k`;
  return `$${Math.round(v)}`;
};
const fmtDate = d => (d ? d.replaceAll('-', '/') : '–');
// ETL clamps an overdue action's due_day to the ship's last reported day, so a zero-day
// horizon means already due, not due today.
const fmtDueIn = n => (n <= 0 ? '已到期' : `${n}天後`);

// useFleetDaily carries the roster and the per-ship daily fan-out (speed loss + fouling clocks
// for the table, folded into the fleet snapshot for the KPIs). The alerts / recommendations are
// one fleet-wide call each; only the anomaly points need a second fan-out.
//
// Floors the Suspense fallback at 1s — without it, a cache-warm reload can resolve fast enough
// that the loading illustration flashes for a single frame.
const [fleet, fetched] = await Promise.all([
  useFleetDaily(),
  Promise.all([
    server.datalake.factAlert({}, { lazy: false }),
    server.datalake.factRecommendation({ lazy: false }),
    server.datalake.factMaintenanceRecommendation({}, { lazy: false }),
  ]),
  delay(1000),
]);
const { roster, dailyByShip: performanceByShip, snapshot, latestDate } = fleet;
const [{ data: alerts }, { data: recommendations }, { data: maintenanceRecs }] = fetched;

const anomalyData = await Promise.all(
  roster.map(v => server.datalake.factAnomaly({ shipId: v.ship_id }, { lazy: false })),
);
const anomaliesByShip = computed(() => Object.fromEntries(
  roster.map((v, i) => [v.ship_id, anomalyData[i].data.value ?? []]),
));
const maintenanceRecByShip = computed(() => {
  const out = {};
  (maintenanceRecs.value ?? []).forEach((r) => {
    (out[r.ship_id] ??= []).push(r);
  });
  return out;
});

// --- KPIs ---
// fact_alert holds closed episodes too — the backlog is the open ones.
const openAlertCount = computed(() => (alerts.value ?? []).filter(a => a.status === 'open').length);
const savingsPotential = computed(() =>
  (recommendations.value ?? []).reduce((sum, rec) => sum + Math.max(0, rec.net_saving_usd ?? 0), 0),
);
// Off tableRows, so the KPI, the table column and the histogram all read the same number —
// re-walking performanceByShip here is how the tiles drift from the table below them.
const avgSpeedLoss30d = computed(() => {
  const vals = tableRows.value.map(r => r.sl).filter(v => v != null);
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
});
const kpis = computed(() => [
  {
    label: 'Fleet size',
    value: fmtInt(roster.length),
    sub: 'ships',
    tooltip: FleetGlossaryConstant.Term.fleetSize,
  },
  {
    label: 'Avg speed loss',
    value: fmtPct(avgSpeedLoss30d.value),
    sub: 'each ship’s own 30-day mean',
    tooltip: FleetGlossaryConstant.Term.avgSpeedLoss,
  },
  {
    label: 'Open alert cases',
    value: fmtInt(openAlertCount.value),
    sub: 'unresolved episodes',
    tooltip: FleetGlossaryConstant.Term.openAlertCases,
  },
  {
    label: 'Excess fuel cost',
    value: fmtUsdCompact(snapshot.value.excessCostUsd),
    sub: 'each ship’s own latest day',
    tooltip: FleetGlossaryConstant.Term.excessFuelCost,
  },
  {
    label: 'Savings potential',
    value: fmtUsdCompact(savingsPotential.value),
    sub: 'sum of recommendations',
    tooltip: FleetGlossaryConstant.Term.savingsPotential,
  },
]);

// --- Fleet table ---
const slopeOf = (arr) => {
  const n = arr.length;
  if (n < 2) return null;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  arr.forEach((y, i) => {
    sx += i;
    sy += y;
    sxx += i * i;
    sxy += i * y;
  });
  const denom = n * sxx - sx * sx;
  return denom === 0 ? null : (n * sxy - sx * sy) / denom;
};
// Next maintenance = the earliest-due recommendation per ship (a trigger/ETA forecast, not the
// batched plan window — that is what the maintenance planner tab schedules).
const nextByShip = computed(() => {
  const out = {};
  roster.forEach((v) => {
    const rows = maintenanceRecByShip.value[v.ship_id] ?? [];
    if (!rows.length) return;
    const earliest = rows.reduce((min, r) => (r.due_day < min ? r.due_day : min), rows[0].due_day);
    const windowRows = rows.filter(r => r.due_day === earliest);
    out[v.ship_id] = {
      day: earliest,
      date: windowRows[0].due_date,
      service: windowRows[0].plan_service_type,
      actions: windowRows.map(r => r.action_type),
    };
  });
  return out;
});
// dim_vessel comes back string-sorted (S1, S10, S11, S12, S2, ...) — sort numerically by the
// digits after "S" instead, both for the default table order and (via the Ship header's
// sortComparator below) for when a user clicks the column to sort it themselves.
const shipIdCompare = (a, b) => a.localeCompare(b, undefined, { numeric: true });
const rosterByShipNumber = [...roster].sort((a, b) => shipIdCompare(a.ship_id, b.ship_id));
// The fouling clocks (days_since_dry_dock / days_since_cleaning) are carried on every daily row,
// already reset by the maintenance events — read them off the ship's last day rather than
// re-deriving them from the event log. Speed loss is the mean over the ship's last 30 ISO
// 19030-valid days, the same window the trend arrow beside it is fitted on.
const tableRows = computed(() => rosterByShipNumber.map((v) => {
  const daily = performanceByShip.value[v.ship_id] ?? [];
  const valid = daily.filter(r => r.valid_flag);
  const last = daily.at(-1) ?? {};
  const next = nextByShip.value[v.ship_id] ?? null;
  return {
    id: v.ship_id,
    shipId: v.ship_id,
    name: v.ship_id,
    sl: fleetUtils.trailingMean(valid, 'speed_loss_pct', SPEED_LOSS_WINDOW),
    slope: slopeOf(valid.slice(-SPEED_LOSS_WINDOW).map(r => r.speed_loss_pct).filter(x => x != null)),
    daysDryDock: last.days_since_dry_dock ?? null,
    daysInWater: last.days_since_cleaning ?? null,
    alerts30: (anomaliesByShip.value[v.ship_id] ?? []).filter(r => r.noon_utc > (last.noon_utc ?? 0) - 30).length,
    nextDay: next?.day ?? null,
    nextDate: next ? fmtDate(next.date) : null,
    // Days-to-due is relative to this ship's own last reported day — the fleet-wide latest
    // date would read as overdue for any ship whose data stops early.
    nextIn: next && last.noon_utc != null ? next.day - last.noon_utc : null,
    serviceType: next?.service ?? null,
    nextItems: next ? next.actions.map(a => ACTION_LABEL[a] || a).join('、') : '',
    nextCount: next?.actions.length ?? 0,
  };
}));

const T = FleetGlossaryConstant.Term;
const tableHeaders = [
  {
    title: 'Ship', key: 'name', sortable: true, minWidth: 100, sortComparator: shipIdCompare,
  },
  { title: 'Speed loss', key: 'sl', sortable: true, minWidth: 120, tooltip: T.speedLoss },
  { title: 'Days since dry-dock', key: 'daysDryDock', sortable: true, minWidth: 110, tooltip: T.daysSinceDryDock },
  { title: 'Days since in-water', key: 'daysInWater', sortable: true, minWidth: 110, tooltip: T.daysSinceInWater },
  { title: 'Alerts (30d)', key: 'alerts30', sortable: true, width: 96, minWidth: 96, tooltip: T.anomaly },
  { title: 'Next maintenance', key: 'nextDay', sortable: true, minWidth: 260, tooltip: T.nextMaintenance },
];
const SERVICE_LABEL = { dry_dock: '乾塢', in_water: '水下' };
const ACTION_LABEL = {
  hull_cleaning: '船體清潔',
  propeller_polishing: '螺旋槳拋光',
  propeller_repair: '螺旋槳修理',
  coating_renewal: '船體塗層更新',
  engine_inspection: '主機檢查',
};
const trendIcon = s => (s == null ? 'mdi-minus' : s > SLOPE_EPS ? 'mdi-arrow-up-bold' : s < -SLOPE_EPS ? 'mdi-arrow-down-bold' : 'mdi-arrow-right-bold');
const trendClass = s => (s == null || Math.abs(s) <= SLOPE_EPS ? 'text-medium-emphasis' : s > 0 ? 'text-error' : 'text-success');
const serviceColor = t => FleetChartConstant.ServiceTypeColor[t] || FleetChartConstant.FallbackColor;
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

// --- CII rating distribution (vessel count per rating) ---
// Same grammar as the speed-loss histogram (vertical count bars, shared "vessels" y-axis) so
// the two panels read as a matched pair. With only 15 vessels, counts are clearer and more
// actionable than percentages; the share is offered in the tooltip. Counts come from the
// snapshot, so the bars total the whole fleet and agree with the Fleet-size KPI beside them.
const CII_RATINGS = ['A', 'B', 'C', 'D', 'E'];
const ciiCountOption = computed(() => {
  const counts = CII_RATINGS.map(r => snapshot.value.ciiCounts[r] ?? 0);
  const total = counts.reduce((sum, c) => sum + c, 0) || 1;
  return {
    grid: { left: 48, right: 16, top: 38, bottom: 40 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const p = params[0];
        return `CII ${p.name}: ${(p.value / total * 100).toFixed(0)}%`;
      },
    },
    xAxis: { type: 'category', data: CII_RATINGS, name: 'CII rating', nameLocation: 'middle', nameGap: 26 },
    yAxis: { type: 'value', minInterval: 1, name: 'ships', nameGap: 18 },
    series: [{
      type: 'bar',
      barWidth: '55%',
      label: { show: true, position: 'top', formatter: p => (p.value ? p.value : '') },
      data: CII_RATINGS.map((r, i) => ({
        value: counts[i],
        itemStyle: { color: FleetChartConstant.CiiColor[r], borderRadius: [3, 3, 0, 0] },
      })),
    }],
  };
});

// --- Speed-loss distribution (histogram of each vessel's 30-day mean speed loss) ---
// A ship whose mean is not positive is at its clean-hull baseline — it has no measurable loss,
// not a negative one. The ships below MIN_SHIP_FIT_POINTS borrow the pool's curve scale and carry
// a constant offset of unknown sign (doc/iso-19030-conformance.md), so a mean can legitimately sit
// just under zero. Folding those into a single "≤ 0%" bin tells the truth without clamping them
// away or putting a minus sign on the axis; the dynamic bins then span the positive range only.
const NON_POSITIVE_LABEL = '≤ 0%';
const speedLossHistOption = computed(() => {
  const vals = tableRows.value.map(r => r.sl).filter(v => v != null);
  if (!vals.length) return {};
  const total = vals.length;
  const positives = vals.filter(v => v > 0);
  const bins = [{ label: NON_POSITIVE_LABEL, count: total - positives.length }];
  const max = Math.ceil(Math.max(...positives, 1));
  const step = Math.max(1, Math.ceil(max / 7));
  for (let lo = 0; lo < max; lo += step) bins.push({ lo, hi: lo + step, label: `${lo}–${lo + step}%`, count: 0 });
  positives.forEach((v) => {
    const bin = bins.slice(1).find(b => v >= b.lo && v < b.hi) ?? bins.at(-1);
    bin.count += 1;
  });
  return {
    grid: { left: 48, right: 16, top: 38, bottom: 40 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const p = params[0];
        return `${p.name}: ${(p.value / total * 100).toFixed(0)}%`;
      },
    },
    xAxis: { type: 'category', data: bins.map(b => b.label), name: 'speed loss', nameLocation: 'middle', nameGap: 26 },
    yAxis: { type: 'value', minInterval: 1, name: 'ships', nameGap: 18 },
    series: [{
      type: 'bar',
      barWidth: '55%',
      label: { show: true, position: 'top', formatter: p => (p.value ? p.value : '') },
      data: bins.map(b => ({
        value: b.count,
        itemStyle: { color: FleetChartConstant.SpeedLossColor, borderRadius: [3, 3, 0, 0] },
      })),
    }],
  };
});
</script>

<template>
  <div class="d-flex flex-column ga-6">
    <div class="text-caption text-medium-emphasis mb-n4">
      最新一日 · {{ latestDate }}
    </div>

    <div class="kpi-grid">
      <DashboardKpiCard
        v-for="k in kpis"
        :key="k.label"
        :label="k.label"
        :value="k.value"
        :tooltip="k.tooltip"
      >
        <div class="text-caption text-medium-emphasis mt-1">
          {{ k.sub }}
        </div>
      </DashboardKpiCard>
    </div>

    <UsageResultCardFrame
      :title="FleetGlossaryConstant.Title.fleetTable"
      :tooltip="FleetGlossaryConstant.Term.fleetTable"
    >
      <UsageResultCard>
        <AppTable
          :headers="tableHeaders"
          :items="tableRows"
          item-value="shipId"
          :server-side="false"
          :enable-search="false"
          :show-pagination="false"
          :on-row-click="openVesselDetail"
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
          <template #item.sl="{ item }">
            <span :class="{ 'text-error font-weight-bold': item.sl != null && item.sl >= THRESHOLD }">
              {{ fmtPct(item.sl) }}
            </span>
            <v-icon
              class="ml-1"
              :class="trendClass(item.slope)"
              :icon="trendIcon(item.slope)"
              size="small"
            />
          </template>
          <template #item.daysDryDock="{ item }">
            {{ fmtInt(item.daysDryDock) }}
          </template>
          <template #item.daysInWater="{ item }">
            {{ fmtInt(item.daysInWater) }}
          </template>
          <template #item.alerts30="{ item }">
            <span :class="item.alerts30 > 0 ? 'text-error font-weight-bold' : 'text-medium-emphasis'">
              {{ item.alerts30 }}
            </span>
          </template>
          <template #item.nextDay="{ item }">
            <span
              v-if="item.nextDay == null"
              class="text-medium-emphasis"
            >–</span>
            <template v-else>
              <span>{{ item.nextDate }}</span>
              <span
                v-if="item.nextIn != null"
                class="text-caption text-medium-emphasis ml-1 due-in"
              >{{ fmtDueIn(item.nextIn) }}</span>
              <span
                v-if="item.serviceType"
                class="d-inline-block"
              >
                <AppChip
                  variant="outlined"
                  class="mx-2"
                  :text="SERVICE_LABEL[item.serviceType] || item.serviceType"
                  :color="serviceColor(item.serviceType)"
                  :dot-color="serviceColor(item.serviceType)"
                  dot
                />
                <AppTooltip
                  :text="item.nextItems"
                  activator="parent"
                  location="top"
                />
              </span>
              <span>{{ item.nextCount }} 項</span>
            </template>
          </template>
        </AppTable>
      </UsageResultCard>
    </UsageResultCardFrame>

    <div class="fleet-grid">
      <UsageResultCardFrame
        :title="FleetGlossaryConstant.Title.ciiDistribution"
        :tooltip="FleetGlossaryConstant.Term.cii"
      >
        <UsageResultCard>
          <AppEChart
            :option="ciiCountOption"
            :height="260"
          />
        </UsageResultCard>
      </UsageResultCardFrame>

      <UsageResultCardFrame
        :title="FleetGlossaryConstant.Title.speedLossDistribution"
        :tooltip="FleetGlossaryConstant.Term.speedLossDistribution"
      >
        <UsageResultCard>
          <AppEChart
            :option="speedLossHistOption"
            :height="260"
          />
        </UsageResultCard>
      </UsageResultCardFrame>
    </div>
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

.fleet-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;

  @media (min-width: 1280px) {
    grid-template-columns: 1fr 1fr;
  }
}

.due-in {
  display: inline-block;
  vertical-align: bottom;
  margin-bottom: 2px;
}

</style>
