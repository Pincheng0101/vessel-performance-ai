<script setup>
// Executive scorecard: fleet-wide trend tiles (with sparklines) + CII rating migration +
// savings potential + fleet speed-loss trend. Trends come from the multi-year agg_fleet_daily
// series (the 'ALL' rollup); the fleet-wide *counts and sums* come from useFleetDaily, because
// an agg row only covers the ships that reported that day (see fleetUtils). Self-contained so
// it only loads when its tab is opened.
import * as FleetChartConstant from '~/constants/FleetChartConstant';
import * as FleetGlossaryConstant from '~/constants/FleetGlossaryConstant';

const server = useServer();
const { isDarkTheme, themeColors } = useCustomTheme();

const fmtPct = v => (v == null ? '–' : `${v.toFixed(1)}%`);
const fmtInt = v => (v == null ? '–' : Math.round(v).toLocaleString());
const fmtUsdCompact = (v) => {
  if (v == null) return '–';
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${Math.round(v / 1e3)}k`;
  return `$${Math.round(v)}`;
};

// agg_fleet_daily carries this tab's fleet-wide *rates* (mean speed loss, A-rated share, daily
// alert count), one row per day. useFleetDaily carries what those rows cannot: the counts and sums,
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
// per-ship readings, so it already excludes weather-spoiled days. A mean is unbiased at any n but
// its variance is not, so the ETL nulls the day out below MIN_SPEED_LOSS_SHIPS (aggregate.py) —
// a null here means too few ships cleared the gate to call it a fleet, not that nothing was
// measured. n_speed_loss_ships is the day's contributor count. noon_utc is a shared day index
// (day 0 = 2021-07-01 for every ship, 1:1 with report_date), converted to a real date by
// fleetUtils where the chart needs a coordinate.
const speedLossDaily = computed(() => (overviewRows.value ?? []).filter(r => r.avg_speed_loss_pct != null));

// Daily rows augmented with the two fleet-wide figures the raw row can't give:
//   cii_a_pct      — a *share*, so it survives partial reporting.
//   excess_fleet_usd — a sum, so it does not: scale that day's reporters up to the full roster.
//
// The D/E share would be the regulatory risk definition, but this fleet has no D or E vessel in
// the whole window: the tile would be a permanent 0.0% with a flat sparkline. The A-rated share
// carries the same story and actually moves (~80% → ~15% as the required line tightens); the D/E
// compliance trigger lives in the tooltip instead.
const series = computed(() => (overviewRows.value ?? []).map(r => ({
  ...r,
  cii_a_pct: r.n_vessels ? (r.cii_count_a || 0) / r.n_vessels * 100 : null,
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

// The arrow is the direction of the 30-day delta; the color is whether that direction is good.
// Most metrics are up-bad (more speed loss, cost, alerts), so rising is red — but `upIsGood`
// metrics like the CII A-rated share invert that.
const deltaArrow = d => (d == null ? '' : d === 0 ? '→' : d > 0 ? '↑' : '↓');
const deltaTone = (m) => {
  if (m.deltaSign == null || m.deltaSign === 0) return null;
  return (m.deltaSign > 0) === Boolean(m.upIsGood) ? 'success' : 'error';
};
const deltaColor = m => deltaTone(m) ?? undefined;
const deltaTextClass = m => (deltaTone(m) ? `text-${deltaTone(m)}` : 'text-medium-emphasis');

// Sparklines share the muted speed-loss color, matching the fleet speed-loss trend line.
const SPEED_LOSS_COLOR = FleetChartConstant.SpeedLossColor;
// `latest` overrides the tile's headline where the last daily row is not the fleet's current
// state — the excess-cost sum is folded from each ship's own latest report instead. Speed loss
// has the same problem for a different reason: a single day's fleet mean only pools whichever
// handful of ships cleared the ISO gate that day (as few as 5 of 15), so the headline uses the
// 30-day mean already computed for the delta chip, matching the glossary term and the Fleet
// Overview tab's KPI instead of the raw last row.
const METRICS = [
  {
    key: 'avg_speed_loss_pct',
    label: 'Avg speed loss',
    fmt: fmtPct,
    latest: cur => cur,
    tooltip: FleetGlossaryConstant.Term.avgSpeedLoss,
  },
  {
    key: 'excess_fleet_usd',
    label: 'Excess fuel cost',
    fmt: fmtUsdCompact,
    latest: () => snapshot.value.excessCostUsd,
    tooltip: FleetGlossaryConstant.Term.excessFuelCost,
  },
  { key: 'n_alerts', label: 'Active alerts', fmt: fmtInt, tooltip: FleetGlossaryConstant.Term.activeAlerts },
  {
    key: 'cii_a_pct',
    label: 'CII A-rated share',
    fmt: fmtPct,
    upIsGood: true,
    tooltip: FleetGlossaryConstant.Term.ciiARated,
  },
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
    latest: m.latest ? m.latest(cur) : (vals.length ? vals[vals.length - 1] : null),
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
  yAxis: { type: 'value', minInterval: 1, name: 'ships' },
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

// Fleet speed-loss trend — the 30-day mean is the line to read; a single day's fleet mean swings
// on which handful of ships happened to clear the ISO gate. The raw daily series stays on the
// chart underneath it (low opacity) so the smoothing hides no data: the dispersion, and the
// negative days, are still there to see. Negative is real, not a bug — the reference curve is
// fitted on a median intercept, so about half of a ship's genuinely clean days sit above it.
// The window matches the 30d the KPI tiles compare against.
const SPEED_LOSS_WINDOW = 30;
const ROLLING_NAME = `${SPEED_LOSS_WINDOW}-day mean`;
const RAW_NAME = 'Daily';
// The unit lives on the right axis's own name now, not repeated in the series label.
const COVERAGE_NAME = 'Coverage';
// Same two rules as the vessel deep-dive chart (FleetChartConstant.js: the 8% is the ISO
// 19030 maintenance trigger the lake itself fires on; the 10% is this dashboard's own
// cleaning-action policy). Drawn here too so the fleet-wide read carries the same reference
// lines as the per-ship one.
const ISO_TRIGGER = FleetChartConstant.SpeedLossIsoTrigger;
const ACTION_THRESHOLD = FleetChartConstant.SpeedLossThreshold;
// Theme-derived, not a fixed hex: a light-mode gray reads as a near-black smudge once alpha-
// blended over the dark theme's card background. backgroundScale3/4 are Vuetify's own
// light/dark pair for "structural, not data" chart decoration (see AppEChart's axis/gridlines),
// so these stay the same subtle contrast in both themes instead of just in light mode.
const GAP_COLOR = computed(() => themeColors.value.backgroundScale3);
// A different tone from GAP_COLOR so the "no data at all" pre-2023 rectangle and the "some
// days thin, some thick" coverage band don't read as the same kind of shading.
const COVERAGE_COLOR = computed(() => themeColors.value.backgroundScale4);
// Same nominal color, but backgroundScale3 sits much closer to the dark theme's own card
// background in relative lightness than to the light theme's — the identical alpha reads as
// a barely-there tint in light mode and a heavy, attention-grabbing block in dark mode.
const GAP_OPACITY = computed(() => (isDarkTheme.value ? 0.18 : 0.3));
const speedLossRolling = computed(
  () => fleetUtils.rollingMean(speedLossDaily.value, 'avg_speed_loss_pct', SPEED_LOSS_WINDOW),
);
// Smoothed so the ramp-up in fleet coverage reads as a trend, not the day-to-day noise of which
// handful of ships happened to report.
const coverageRolling = computed(
  () => fleetUtils.rollingMean(speedLossDaily.value, 'n_speed_loss_ships', SPEED_LOSS_WINDOW),
);
// Every ship's displacement was a draft-backfilled estimate (not measured) until ~2023-02 —
// the ISO gate rejects that as unreliable (doubles the speed-loss dispersion, per the glossary
// term), so the whole fleet fails it for the data lake's first ~19 months. Shaded so a viewer
// sees *why* the trend starts mid-window instead of asking whether data before it went missing.
const dataGapArea = computed(() => {
  const firstValidDay = speedLossDaily.value[0]?.noon_utc;
  if (!firstValidDay) return [];
  return [[{ xAxis: fleetUtils.dayToMs(0) }, { xAxis: fleetUtils.dayToMs(firstValidDay) }]];
});

const speedLossTrendOption = computed(() => ({
  legend: { top: 0, left: 'center', data: [ROLLING_NAME, RAW_NAME, COVERAGE_NAME] },
  grid: {
    left: 56, right: 68, top: 32, bottom: 28,
  },
  tooltip: {
    trigger: 'axis',
    // Not valueFormatter: the raw series carries the day's contributor count alongside its value,
    // which is the only thing that says how much of a fleet that point actually is.
    formatter: (params) => {
      const lines = params.map((p) => {
        // Coverage is a headcount, not a %, and shares no marker convention with the other
        // two — keep its line separate rather than forcing it through fmtPct.
        if (p.seriesName === COVERAGE_NAME) {
          const marker = `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${COVERAGE_COLOR.value};"></span>`;
          return `${marker}${p.seriesName} <b>${Math.round(p.value[1])}</b> / ${roster.length} ships`;
        }
        const ships = p.data?.ships;
        const shipLabel = ships == null ? '' : ` · ${ships} ${ships === 1 ? 'ship' : 'ships'}`;
        // p.marker ignores itemStyle.opacity, so the Daily dot would render fully saturated —
        // out of step with its 25%-opacity line on the chart. Bake the opacity into the color instead.
        const markerColor = p.seriesName === RAW_NAME ? `${SPEED_LOSS_COLOR}40` : SPEED_LOSS_COLOR;
        const marker = `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${markerColor};"></span>`;
        return `${marker}${p.seriesName} <b>${fmtPct(p.value[1])}</b>${shipLabel}`;
      });
      // Plain date, not fleetUtils.dayLabel's "(N days ago)" — that framing fits a due-date
      // countdown, not a point on a multi-year historical trend.
      return [fleetUtils.dayDate(fleetUtils.msToDay(params[0]?.axisValue)), ...lines].join('<br/>');
    },
  },
  // Extended back to day 0 (the data lake's actual start) rather than letting the axis
  // auto-fit to the first non-null point — otherwise the chart silently starts mid-window
  // and invites "where did 2021-2022 go?" instead of showing the answer.
  xAxis: { type: 'time', min: fleetUtils.dayToMs(0) },
  yAxis: [
    {
      type: 'value',
      name: 'speed loss %',
      nameLocation: 'middle',
      nameGap: 36,
      nameRotate: 90,
      axisLabel: { formatter: '{value}%' },
    },
    // Own scale for the coverage band — a ship headcount, not a %. Shown (not hidden) so its
    // reading doesn't only exist on hover; splitLine off so its gridlines don't cross-hatch
    // against the left axis's, which sits on an unrelated scale.
    {
      type: 'value',
      position: 'right',
      min: 0,
      max: roster.length,
      name: 'ships',
      nameLocation: 'middle',
      nameGap: 36,
      nameRotate: -90,
      splitLine: { show: false },
    },
  ],
  // Ordered to match the legend (and so the tooltip lists in the same order): 30-day mean,
  // Daily, Coverage. z pins the actual draw stacking instead, so reordering this array for the
  // tooltip doesn't flip which line paints over which.
  series: [
    {
      name: ROLLING_NAME,
      type: 'line',
      smooth: true,
      showSymbol: false,
      z: 2,
      lineStyle: { width: 2, color: SPEED_LOSS_COLOR },
      itemStyle: { color: SPEED_LOSS_COLOR },
      emphasis: { itemStyle: { color: SPEED_LOSS_COLOR } },
      data: speedLossRolling.value.map(r => [fleetUtils.dayToMs(r.noon_utc), r.value]),
      markLine: {
        symbol: 'none',
        silent: true,
        label: { show: false },
        data: [
          {
            yAxis: ISO_TRIGGER,
            lineStyle: { color: FleetChartConstant.SemanticRamp.warning, type: 'dashed', width: 1 },
            label: {
              show: true, formatter: `ISO 19030 維修觸發 ${ISO_TRIGGER}%`, position: 'insideEndBottom', fontSize: 10, color: FleetChartConstant.SemanticRamp.warning,
            },
          },
          {
            yAxis: ACTION_THRESHOLD,
            lineStyle: { color: FleetChartConstant.SemanticRamp.critical, type: 'dashed', width: 1 },
            label: {
              show: true, formatter: `清潔行動線 ${ACTION_THRESHOLD}%`, position: 'insideEndTop', fontSize: 10, color: FleetChartConstant.SemanticRamp.critical,
            },
          },
        ],
      },
    },
    {
      name: RAW_NAME,
      type: 'line',
      smooth: false,
      showSymbol: false,
      z: 1,
      lineStyle: { width: 1, color: SPEED_LOSS_COLOR, opacity: 0.25 },
      itemStyle: { color: SPEED_LOSS_COLOR, opacity: 0.25 },
      data: speedLossDaily.value.map(r => ({
        value: [fleetUtils.dayToMs(r.noon_utc), r.avg_speed_loss_pct],
        ships: r.n_speed_loss_ships,
      })),
      markArea: {
        silent: true,
        itemStyle: { color: GAP_COLOR.value, opacity: GAP_OPACITY.value },
        label: {
          show: true,
          position: 'insideTop',
          fontSize: 10,
          color: themeColors.value.text,
          formatter: 'Pre-2023: displacement backfilled — fails ISO gate',
        },
        data: dataGapArea.value,
      },
    },
    {
      name: COVERAGE_NAME,
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      showSymbol: false,
      z: 0,
      lineStyle: { width: 1, color: COVERAGE_COLOR.value, opacity: 0.6 },
      itemStyle: { color: COVERAGE_COLOR.value },
      areaStyle: { opacity: 0.18, color: COVERAGE_COLOR.value },
      data: coverageRolling.value.map(r => [fleetUtils.dayToMs(r.noon_utc), r.value]),
    },
  ],
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
            :color="deltaColor(m)"
            class="px-2"
          >
            <span :class="deltaTextClass(m)">
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
                across {{ savingsByShip.length }} of {{ roster.length }} ships
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
