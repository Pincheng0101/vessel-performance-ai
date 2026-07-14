<script setup>
// Executive scorecard: fleet-wide trend tiles (with sparklines) + CII rating migration +
// savings potential + fleet speed-loss trend. Trends come from the multi-year agg_fleet_daily
// series (the 'ALL' rollup); the fleet-wide *counts and sums* come from useFleetDaily, because
// an agg row only covers the ships that reported that day (see fleetUtils). Self-contained so
// it only loads when its tab is opened.
import { FleetChartConstant, FleetGlossaryConstant } from '~/constants';

const server = useServer();

const fmtPct = v => (v == null ? '–' : `${v.toFixed(1)}%`);
const fmtInt = v => (v == null ? '–' : Math.round(v).toLocaleString());
const fmtUsdCompact = (v) => {
  if (v == null) return '–';
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}k`;
  return `$${Math.round(v)}`;
};

// agg_fleet_daily carries this tab's fleet-wide *rates* (mean speed loss, D/E share, daily alert
// count), one row per day. useFleetDaily carries what those rows cannot: the counts and sums,
// folded from each ship's own latest report. fact_recommendation is one row per ship (15 rows,
// no ship_id filter) — the savings-potential total.
//
// Floors the Suspense fallback at 1s — without it, a cache-warm reload can resolve fast enough
// that the loading illustration flashes for a single frame.
const [fleet, fetched] = await Promise.all([
  useFleetDaily(),
  Promise.all([
    server.datalake.aggFleetDaily({}, { lazy: false }),
    server.datalake.factRecommendation({ lazy: false }),
  ]),
  delay(1000),
]);
const { roster, snapshot, monthly: fleetMonthly, latestDate } = fleet;
const [{ data: overviewRows }, { data: recommendations }] = fetched;

// Fleet speed-loss trend: avg_speed_loss_pct is the mean of that day's *valid* (ISO 19030-gated)
// per-ship readings, so it already excludes weather-spoiled days — and being a mean, it is
// unaffected by how many ships reported. noon_utc is a shared calendar index (day 0 = 2021-07-01
// for every ship, 1:1 with report_date), so the axis is calendar-aligned.
const speedLossDaily = computed(() => (overviewRows.value ?? []).filter(r => r.avg_speed_loss_pct != null));

// Daily rows augmented with the two fleet-wide figures the raw row can't give:
//   cii_risk_pct   — a *share*, so it survives partial reporting.
//   excess_fleet_usd — a sum, so it does not: scale that day's reporters up to the full roster.
const series = computed(() => (overviewRows.value ?? []).map(r => ({
  ...r,
  cii_risk_pct: r.n_vessels ? ((r.cii_count_d || 0) + (r.cii_count_e || 0)) / r.n_vessels * 100 : null,
  excess_fleet_usd: r.n_vessels && r.total_excess_cost_usd != null
    ? r.total_excess_cost_usd / r.n_vessels * roster.length
    : null,
})));
// One row per month — light enough for sparklines.
const monthly = computed(() => {
  const map = new Map();
  series.value.forEach(r => map.set(r.report_date.slice(0, 7), r));
  return [...map.values()];
});

const mean = (rows, key) => {
  const xs = rows.map(r => r[key]).filter(v => v != null);
  return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null;
};

// All metrics are up-bad, so a rising 30-day delta is a worsening signal (↑ / red).
const deltaArrow = d => (d == null ? '' : d === 0 ? '→' : d > 0 ? '↑' : '↓');
const deltaColor = d => (d == null || d === 0 ? undefined : d > 0 ? 'error' : 'success');
const deltaTextClass = d => (d == null || d === 0 ? 'text-medium-emphasis' : d > 0 ? 'text-error' : 'text-success');

// Sparklines share the muted speed-loss color, matching the fleet speed-loss trend line.
const SPEED_LOSS_COLOR = FleetChartConstant.SpeedLossColor;
// `latest` overrides the tile's headline where the last daily row is not the fleet's current
// state — the excess-cost sum is folded from each ship's own latest report instead.
const METRICS = [
  { key: 'avg_speed_loss_pct', label: 'Avg speed loss', fmt: fmtPct, tooltip: FleetGlossaryConstant.Term.avgSpeedLoss },
  {
    key: 'excess_fleet_usd',
    label: 'Excess fuel cost',
    fmt: fmtUsdCompact,
    latest: () => snapshot.value.excessCostUsd,
    tooltip: FleetGlossaryConstant.Term.excessFuelCost,
  },
  { key: 'n_alerts', label: 'Active alerts', fmt: fmtInt, tooltip: FleetGlossaryConstant.Term.activeAlerts },
  { key: 'cii_risk_pct', label: 'CII risk (D/E share)', fmt: fmtPct, tooltip: FleetGlossaryConstant.Term.ciiRisk },
];

const buildTile = (dailyRows, sparkRows, m) => {
  const vals = dailyRows.map(r => r[m.key]).filter(v => v != null);
  const cur = mean(dailyRows.slice(-30), m.key);
  const prev = mean(dailyRows.slice(-60, -30), m.key);
  const delta = cur != null && prev != null ? cur - prev : null;
  // Direction is decided on the *displayed* magnitude: if it rounds to zero at the
  // metric's format (e.g. +0.23 alerts → "0"), treat it as flat, not up.
  const deltaSign = delta == null ? null : (m.fmt(Math.abs(delta)) === m.fmt(0) ? 0 : delta);
  return {
    ...m,
    latest: m.latest ? m.latest() : (vals.length ? vals[vals.length - 1] : null),
    delta,
    deltaSign,
    sparkOption: {
      grid: { left: 2, right: 2, top: 4, bottom: 2 },
      xAxis: { type: 'category', show: false, data: sparkRows.map((_, i) => i) },
      yAxis: { type: 'value', show: false, scale: true },
      tooltip: { show: false },
      series: [{
        type: 'line',
        data: sparkRows.map(r => r[m.key]),
        showSymbol: false,
        lineStyle: { width: 1.5, color: SPEED_LOSS_COLOR },
        areaStyle: { opacity: 0.12, color: SPEED_LOSS_COLOR },
      }],
    },
  };
};

const tiles = computed(() => METRICS.map(m => buildTile(series.value, monthly.value, m)));
const fmtDeltaMag = m => (m.delta == null ? '–' : m.fmt(Math.abs(m.delta)));

// CII rating migration — monthly stacked area (annual rating broadcast daily reads as
// year-over-year steps; smooth off so bands don't misrepresent the counts). Counts are folded
// from every ship's last report of the month, so the band totals the whole fleet: it steps down
// only when a ship genuinely leaves (S9 ends 2025-07), never because a ship skipped a report.
const CII_RATINGS = ['A', 'B', 'C', 'D', 'E'];
const ciiTrendOption = computed(() => ({
  legend: { top: 8, right: 8, data: CII_RATINGS },
  grid: { left: 36, right: 16, top: 40, bottom: 28 },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: fleetMonthly.value.map(r => r.month), axisLabel: { interval: 11 } },
  yAxis: { type: 'value', minInterval: 1, name: 'vessels' },
  series: CII_RATINGS.map(r => ({
    name: r,
    type: 'line',
    stack: 'cii',
    smooth: false,
    showSymbol: false,
    lineStyle: { width: 0 },
    areaStyle: { opacity: 0.92 },
    itemStyle: { color: FleetChartConstant.CiiColor[r] },
    data: fleetMonthly.value.map(row => row.ciiCounts[r] ?? 0),
  })),
}));

// Fleet speed-loss trend — daily fleet mean over the shared day index (see speedLossDaily above).
const speedLossTrendOption = computed(() => ({
  grid: { left: 44, right: 16, top: 16, bottom: 28 },
  tooltip: { trigger: 'axis', valueFormatter: v => (v == null ? '–' : `${(+v).toFixed(1)}%`) },
  xAxis: { type: 'value', name: 'day' },
  yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
  series: [{
    name: 'Avg speed loss',
    type: 'line',
    smooth: true,
    showSymbol: false,
    lineStyle: { width: 1.5, color: SPEED_LOSS_COLOR },
    itemStyle: { color: SPEED_LOSS_COLOR },
    emphasis: { itemStyle: { color: SPEED_LOSS_COLOR } },
    data: speedLossDaily.value.map(r => [r.noon_utc, r.avg_speed_loss_pct]),
  }],
}));

// Savings potential — Σ of the open cleaning recommendations, broken down by ship. There is no
// "realized savings" counterpart: fleet excess cost *rises* across the window (fouling outpaces
// the 23 cleanings in it), so any peak-to-latest or baseline-to-recent drop is either zero or an
// artifact of the day the fleet happened to be sampled on.
const savingsByShip = computed(() => fleetUtils.savingsByShip(recommendations.value));
const potential = computed(() => savingsByShip.value.reduce((sum, rec) => sum + rec.savingUsd, 0));
const savingsByShipOption = computed(() => {
  // ECharts stacks a category axis bottom-up, so reverse to put the largest saving on top.
  const rows = [...savingsByShip.value].reverse();
  return {
    grid: {
      left: 8, right: 56, top: 8, bottom: 8, containLabel: true,
    },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: v => fmtUsdCompact(v) },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      data: rows.map(r => r.shipId),
      axisTick: { show: false },
      axisLine: { show: false },
    },
    series: [{
      type: 'bar',
      barWidth: '60%',
      label: { show: true, position: 'right', formatter: p => fmtUsdCompact(p.value) },
      itemStyle: { color: FleetChartConstant.SemanticRamp.good, borderRadius: [0, 3, 3, 0] },
      data: rows.map(r => r.savingUsd),
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
        v-for="m in tiles"
        :key="m.key"
        :label="m.label"
        :value="m.fmt(m.latest)"
        :tooltip="m.tooltip"
      >
        <div class="d-flex align-center ga-2 mt-1">
          <v-chip
            size="x-small"
            variant="tonal"
            :color="deltaColor(m.deltaSign)"
            class="px-2"
          >
            <span :class="deltaTextClass(m.deltaSign)">
              <template v-if="deltaArrow(m.deltaSign)">{{ deltaArrow(m.deltaSign) }} </template>{{ fmtDeltaMag(m) }}
            </span>
          </v-chip>
          <span class="text-caption text-medium-emphasis">vs prev 30d</span>
        </div>
        <AppEChart
          :option="m.sparkOption"
          :height="40"
          :bordered="false"
          class="mt-2"
        />
      </DashboardKpiCard>
    </div>

    <div class="exec-grid">
      <UsageResultCardFrame
        :title="FleetGlossaryConstant.Title.ciiTrend"
        :tooltip="FleetGlossaryConstant.Term.cii"
      >
        <UsageResultCard>
          <AppEChart
            :option="ciiTrendOption"
            :height="280"
          />
        </UsageResultCard>
      </UsageResultCardFrame>

      <UsageResultCardFrame
        :title="FleetGlossaryConstant.Title.savingsPotential"
        :tooltip="FleetGlossaryConstant.Term.savingsPotential"
      >
        <UsageResultCard>
          <div class="pa-2 d-flex flex-column ga-2">
            <div class="d-flex align-baseline ga-2">
              <span class="text-h4 font-weight-bold">{{ fmtUsdCompact(potential) }}</span>
              <span class="d-flex align-center ga-1 text-body-2 text-medium-emphasis">
                across {{ savingsByShip.length }} of {{ roster.length }} vessels
                <AppInputTooltip :text="FleetGlossaryConstant.Term.savingsByShip" />
              </span>
            </div>
            <AppEChart
              :option="savingsByShipOption"
              :height="228"
              :bordered="false"
            />
          </div>
        </UsageResultCard>
      </UsageResultCardFrame>
    </div>

    <UsageResultCardFrame
      :title="FleetGlossaryConstant.Title.fleetSpeedLossTrend"
      :tooltip="FleetGlossaryConstant.Term.speedLoss"
    >
      <UsageResultCard>
        <AppEChart
          :option="speedLossTrendOption"
          :height="240"
        />
      </UsageResultCard>
    </UsageResultCardFrame>
  </div>
</template>

<style lang="scss" scoped>
.kpi-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, 1fr);

  @media (min-width: 960px) {
    grid-template-columns: repeat(4, 1fr);
  }
}

.exec-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;

  @media (min-width: 1280px) {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
