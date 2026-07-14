<script setup>
// Executive scorecard: fleet-wide trend tiles (with sparklines) + CII rating migration +
// savings captured + fleet speed-loss trend. Consumes the full multi-year agg_fleet_daily
// series (the 'ALL' rollup — every KPI on this tab is already aggregated there, so no per-ship
// fan-out is needed). Self-contained so it only loads when its tab is opened.
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

// agg_fleet_daily already carries every fleet-wide figure this tab shows (speed loss, excess
// cost, alert count, CII counts), one row per day. fact_recommendation is one row per ship
// (15 rows, no ship_id filter) — the savings-potential total.
//
// Floors the Suspense fallback at 1s — without it, a cache-warm reload can resolve fast enough
// that the loading illustration flashes for a single frame.
const [fetched] = await Promise.all([
  Promise.all([
    server.datalake.aggFleetDaily({}, { lazy: false }),
    server.datalake.factRecommendation({ lazy: false }),
  ]),
  delay(1000),
]);
const [{ data: overviewRows }, { data: recommendations }] = fetched;
const latestDate = computed(() => overviewRows.value?.at(-1)?.report_date ?? '');

// Fleet speed-loss trend: avg_speed_loss_pct is the mean of that day's *valid* (ISO 19030-gated)
// per-ship readings, so it already excludes weather-spoiled days. The noon_utc axis is a relative
// day — each ship's day 0 is a different real calendar date — so this is an approximate fleet
// overview, not a calendar-aligned trend.
const speedLossDaily = computed(() => (overviewRows.value ?? []).filter(r => r.avg_speed_loss_pct != null));

// Daily rows augmented with fleet CII risk (share of vessels rated D or E).
const series = computed(() => (overviewRows.value ?? []).map(r => ({
  ...r,
  cii_risk_pct: r.n_vessels ? ((r.cii_count_d || 0) + (r.cii_count_e || 0)) / r.n_vessels * 100 : null,
})));
// One row per month — light enough for sparklines and the migration area.
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
const METRICS = [
  { key: 'avg_speed_loss_pct', label: 'Avg speed loss', fmt: fmtPct, tooltip: FleetGlossaryConstant.Term.avgSpeedLoss },
  { key: 'total_excess_cost_usd', label: 'Excess fuel cost', fmt: fmtUsdCompact, tooltip: FleetGlossaryConstant.Term.excessFuelCost },
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
    latest: vals.length ? vals[vals.length - 1] : null,
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
// year-over-year steps; smooth off so bands don't misrepresent the counts).
const CII_RATINGS = ['A', 'B', 'C', 'D', 'E'];
const ciiTrendOption = computed(() => ({
  legend: { top: 8, right: 8, data: CII_RATINGS },
  grid: { left: 36, right: 16, top: 40, bottom: 28 },
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: monthly.value.map(r => r.report_date.slice(0, 7)), axisLabel: { interval: 11 } },
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
    data: monthly.value.map(row => row[`cii_count_${r.toLowerCase()}`] ?? 0),
  })),
}));

// Fleet speed-loss trend — daily fleet mean over relative day (see speedLossDaily above).
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

// Savings captured: realized (peak-to-latest drop of excess cost) vs potential (Σ recommendations).
const potential = computed(() =>
  (recommendations.value ?? []).reduce((sum, rec) => sum + Math.max(0, rec.net_saving_usd ?? 0), 0),
);
const realized = computed(() => {
  const vals = (overviewRows.value ?? []).map(r => r.total_excess_cost_usd).filter(v => v != null);
  if (!vals.length) return 0;
  return Math.max(0, Math.max(...vals) - vals[vals.length - 1]);
});
const capturedPct = computed(() => (potential.value > 0 ? realized.value / potential.value * 100 : null));
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
        :title="FleetGlossaryConstant.Title.savingsCaptured"
        :tooltip="FleetGlossaryConstant.Term.savingsPotential"
      >
        <UsageResultCard>
          <div class="pa-2 d-flex flex-column ga-3">
            <div class="d-flex align-baseline ga-2">
              <span class="text-h4 font-weight-bold">{{ capturedPct == null ? '–' : `${capturedPct.toFixed(1)}%` }}</span>
              <span class="text-body-2 text-medium-emphasis">of potential captured</span>
            </div>
            <v-progress-linear
              :model-value="capturedPct ?? 0"
              color="success"
              height="10"
              rounded
            />
            <div class="d-flex justify-space-between text-caption">
              <div>
                <div class="d-flex align-center ga-1 text-medium-emphasis">
                  Realized
                  <AppInputTooltip :text="FleetGlossaryConstant.Term.savingsRealized" />
                </div>
                <div class="font-weight-bold">
                  {{ fmtUsdCompact(realized) }}
                </div>
              </div>
              <div class="text-right">
                <div class="text-medium-emphasis">
                  Potential
                </div>
                <div class="font-weight-bold">
                  {{ fmtUsdCompact(potential) }}
                </div>
              </div>
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ fmtUsdCompact(potential - realized) }} remaining opportunity
            </div>
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
