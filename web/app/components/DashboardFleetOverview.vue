<script setup>
// Fleet overview tab (all-fleet, no fleet filter): KPIs, per-vessel table, CII rating
// distribution + speed-loss distribution. Self-contained; loads when its tab is opened.
import { FleetChartConstant, FleetGlossaryConstant } from '~/constants';

const server = useServer();
const route = useRoute();
const router = useRouter();
// One source of truth for the action line — re-typing the literal here is how it drifts.
const THRESHOLD = FleetChartConstant.SpeedLossThreshold;
const SLOPE_EPS = 0.0015;

const fmtPct = v => (v == null ? '–' : `${v.toFixed(1)}%`);
const fmtInt = v => (v == null ? '–' : Math.round(v).toLocaleString());
const fmtUsdCompact = (v) => {
  if (v == null) return '–';
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}k`;
  return `$${Math.round(v)}`;
};

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
// Only ISO 19030-valid days carry a meaningful speed loss — an unfiltered "latest" reading would
// be reporting the weather on that ship's last day, not its hull condition.
const avgSpeedLossLatest = computed(() => {
  const vals = roster.map((v) => {
    const rows = performanceByShip.value[v.ship_id] ?? [];
    return rows.filter(r => r.valid_flag).at(-1)?.speed_loss_pct ?? null;
  }).filter(v => v != null);
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
    value: fmtPct(avgSpeedLossLatest.value),
    sub: 'each ship’s own latest reading',
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
    out[v.ship_id] = { day: earliest, type: windowRows[0].action_type, count: windowRows.length };
  });
  return out;
});
// The fouling clocks (days_since_dry_dock / days_since_cleaning) are carried on every daily row,
// already reset by the maintenance events — read them off the ship's last day rather than
// re-deriving them from the event log. Speed loss reads off the last *valid* day (ISO 19030).
const tableRows = computed(() => roster.map((v) => {
  const daily = performanceByShip.value[v.ship_id] ?? [];
  const valid = daily.filter(r => r.valid_flag);
  const last = daily.at(-1) ?? {};
  const lastValid = valid.at(-1) ?? {};
  const next = nextByShip.value[v.ship_id] ?? null;
  return {
    id: v.ship_id,
    shipId: v.ship_id,
    name: v.ship_id,
    sl: lastValid.speed_loss_pct ?? null,
    slope: slopeOf(valid.slice(-30).map(r => r.speed_loss_pct).filter(x => x != null)),
    daysDryDock: last.days_since_dry_dock ?? null,
    daysInWater: last.days_since_cleaning ?? null,
    alerts30: (anomaliesByShip.value[v.ship_id] ?? []).filter(r => r.noon_utc > (last.noon_utc ?? 0) - 30).length,
    nextDay: next?.day ?? null,
    serviceType: next?.type ?? null,
    nextCount: next?.count ?? 0,
  };
}));

const T = FleetGlossaryConstant.Term;
const tableHeaders = [
  { title: 'Ship', key: 'name', sortable: true, minWidth: 100 },
  { title: 'Speed loss', key: 'sl', sortable: true, minWidth: 120, tooltip: T.speedLoss },
  { title: 'Days since dry-dock', key: 'daysDryDock', sortable: true, minWidth: 110, tooltip: T.daysSinceDryDock },
  { title: 'Days since in-water', key: 'daysInWater', sortable: true, minWidth: 110, tooltip: T.daysSinceInWater },
  { title: 'Alerts (30d)', key: 'alerts30', sortable: true, width: 96, minWidth: 96, tooltip: T.anomaly },
  { title: 'Next maintenance', key: 'nextDay', sortable: true, minWidth: 170, tooltip: T.nextMaintenance },
];
const SERVICE_LABEL = {
  hull_cleaning: '船體清洗',
  propeller_polishing: '螺槳拋光',
  propeller_repair: '螺槳修理',
  coating_renewal: '塗層更新',
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
    yAxis: { type: 'value', minInterval: 1, name: 'vessels', nameGap: 18 },
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

// --- Speed-loss distribution (histogram of each vessel's current speed loss) ---
const speedLossHistOption = computed(() => {
  const vals = tableRows.value.map(r => r.sl).filter(v => v != null);
  if (!vals.length) return {};
  const total = vals.length;
  const min = Math.floor(Math.min(...vals));
  const max = Math.ceil(Math.max(...vals));
  const step = Math.max(1, Math.ceil((max - min) / 8));
  const bins = [];
  for (let lo = min; lo < Math.max(max, min + 1); lo += step) bins.push({ lo, hi: lo + step, count: 0 });
  vals.forEach((v) => {
    const bin = bins.find(b => v >= b.lo && v < b.hi) ?? bins.at(-1);
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
    xAxis: { type: 'category', data: bins.map(b => `${b.lo}–${b.hi}%`), name: 'speed loss', nameLocation: 'middle', nameGap: 26 },
    yAxis: { type: 'value', minInterval: 1, name: 'vessels', nameGap: 18 },
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
              <span>第 {{ item.nextDay }} 天</span>
              <AppChip
                v-if="item.serviceType"
                variant="outlined"
                class="mx-2"
                :text="SERVICE_LABEL[item.serviceType] || item.serviceType"
                :color="serviceColor(item.serviceType)"
                :dot-color="serviceColor(item.serviceType)"
                dot
              />
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

</style>
