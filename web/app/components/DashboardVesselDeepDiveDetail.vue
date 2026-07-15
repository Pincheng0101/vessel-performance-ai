<script setup>
// Per-vessel deep-dive detail: header (particulars + speed-loss gauge + CII), the alert feed, the
// speed-loss trend main visual, excess-cost composition, CII trend, cause diagnostics, the
// speed–power scatter + anomaly timeline pair, the underwater-inspection log, and the recommended
// actions. Keyed by ship_id in the parent, so it fully reloads per vessel.
//
// fact_performance_daily is the spine: one row per (ship, day) carrying the ISO 19030 speed loss,
// the raw signals, the fouling clocks, the CII trajectory and the excess-cost split — so most of
// this file reads from that single fetch.
import * as FleetChartConstant from '~/constants/FleetChartConstant';
import * as FleetGlossaryConstant from '~/constants/FleetGlossaryConstant';

const props = defineProps({
  vessel: {
    type: Object,
    default: () => ({}),
  },
  vesselOptions: {
    type: Array,
    default: () => [],
  },
});

const shipId = defineModel('shipId', {
  type: String,
  default: null,
});

const server = useServer();
const { themeColors } = useCustomTheme();
const T = FleetGlossaryConstant.Term;
// Two different lines: the ISO 19030 maintenance trigger the ETL fires MT rows on (8%), and
// this dashboard's own cleaning-action policy (10%). See FleetChartConstant.
const ISO_TRIGGER = FleetChartConstant.SpeedLossIsoTrigger;
const THRESHOLD = FleetChartConstant.SpeedLossThreshold;
// A categorical hue, not a semantic one — the Theil-Sen fit and its extrapolation are a
// derived read on the data, not a risk-level rule like the ISO trigger, so they used to share
// warning's amber with it, which read as if the fit line WAS the trigger rule.
const TREND_COLOR = FleetChartConstant.CategoricalPalette[0];

// fact_performance_daily.reject_reason → the gate, in words. Unknown reasons fall through as
// themselves rather than being swallowed: a new gate in the ETL should show up, not vanish.
const rejectReasonLabel = reason => (
  reason == null ? '–' : FleetGlossaryConstant.RejectReason[reason] ?? reason
);

const fmtNum = (v, d = 1) => (v == null ? '–' : v.toFixed(d));
const fmtUsd = v => (v == null ? '–' : `$${Math.round(v).toLocaleString()}`);
const ciiColor = c => FleetChartConstant.CiiColor[c] || FleetChartConstant.FallbackColor;

// Floors the Suspense fallback at 1s — without it, a cache-warm reload (or switching back to
// an already-fetched vessel) can resolve fast enough that the loading illustration flashes
// for a single frame.
const [fetched] = await Promise.all([
  Promise.all([
    server.datalake.factPerformanceDaily({ shipId: shipId.value }, { lazy: false }),
    server.datalake.shipSpeedPower({ shipId: shipId.value }, { lazy: false }),
    server.datalake.factAlert({ shipId: shipId.value }, { lazy: false }),
    server.datalake.factAnomaly({ shipId: shipId.value }, { lazy: false }),
    server.datalake.factPerformanceIndicator({ shipId: shipId.value }, { lazy: false }),
    server.datalake.factMaintenanceRecommendation({ shipId: shipId.value }, { lazy: false }),
    server.datalake.factUwi({ shipId: shipId.value }, { lazy: false }),
  ]),
  delay(1000),
]);
const [
  { data: daily },
  { data: speedPower },
  { data: alerts },
  { data: anomalies },
  { data: indicators },
  { data: maintRecs },
  { data: uwi },
] = fetched;

// The hull_cleaning recommendation row (if any) carries the trigger day and fouling rate the
// trend chart's prediction line extrapolates along.
const rec = computed(() => (maintRecs.value ?? []).find(r => r.action_type === 'hull_cleaning') ?? {});
// fact_performance_indicator is long-format (ISP / DDP / ME / MT); the ME rows are the
// maintenance-effect ones, keyed to the event they measure.
const events = computed(() => (indicators.value ?? []).filter(r => r.indicator === 'ME'));
// Latest condition = the newest ISO 19030-valid row (fallback to the newest row). Speed loss on
// an invalid day is weather, not hull.
const latest = computed(() => {
  const rows = daily.value ?? [];
  return [...rows].reverse().find(r => r.valid_flag) ?? rows.at(-1) ?? {};
});

// --- Header: vessel particulars (dim_vessel) + the ship's data coverage ---
// ISO 19030 is explicit that data coverage is a FIRST-CLASS displayed metric, not a footnote:
// its filtering commonly discards 80-95% of raw data, and without the coverage number the
// indicators "look clean while actually resting on very few samples" (doc/iso-19030.md:54).
// The header used to print only a day span, which says nothing about how many of those days
// survived the gate.
const coverage = computed(() => {
  const rows = daily.value ?? [];
  const valid = rows.filter(r => r.valid_flag).length;
  return { valid, total: rows.length, pct: rows.length ? (valid / rows.length) * 100 : null };
});
// "N 天前" in this header is relative to this ship's own last reported day, not the reader's
// real-world clock — matching the fleet table's days_since_dry_dock / days_since_cleaning,
// which are anchored the same way. Falls back to dayLabel's real-clock default (undefined,
// not null) on the edge case of a ship with no daily rows at all.
const shipLastDay = computed(() => (daily.value ?? []).at(-1)?.noon_utc);
// Last in-water = the newest daily row's day minus its own days_since_cleaning. Unlike
// last_dry_dock_day, dim_vessel carries no equivalent stored field for hull cleanings — this
// has to be derived off the daily rows, the same way the trend chart derives its own
// lastCleanDay below.
const lastInWaterDay = computed(() => {
  const last = (daily.value ?? []).at(-1);
  return last?.days_since_cleaning == null || last?.noon_utc == null
    ? null
    : last.noon_utc - last.days_since_cleaning;
});
const specs = computed(() => {
  const v = props.vessel;
  const kind = v.role === 'predict' ? '預測船' : '訓練船';
  const c = coverage.value;
  const today = shipLastDay.value;
  return [
    { label: 'Type', value: `${kind} · ${v.hull_class ?? '–'}` },
    { label: 'TEU', value: v.teu_nominal == null ? '–' : v.teu_nominal.toLocaleString(), tooltip: T.teu },
    { label: 'Design speed', value: v.design_speed_kn == null ? '–' : `${v.design_speed_kn.toFixed(1)} kn` },
    { label: 'Last dry-dock', value: fleetUtils.dayLabel(v.last_dry_dock_day, today) ?? '無紀錄' },
    { label: 'Last in-water', value: fleetUtils.dayLabel(lastInWaterDay.value, today) ?? '無紀錄' },
    {
      label: 'ISO data coverage',
      value: c.pct == null ? '–' : `${c.pct.toFixed(0)}% (${c.valid.toLocaleString()}/${c.total.toLocaleString()})`,
      tooltip: T.dataCoverage,
    },
  ];
});

// --- Speed-loss value + 30-day delta (header) ---
// 30-day trailing mean of ISO-valid days, not the single latest one — this tile's own tooltip
// (T.speedLoss) already promises the 30-day mean, and a single day's fit-scatter (up to ±4pp) was
// able to flip both this tile's color band and the Cause Diagnostics hull-risk level below it.
// Matches the Fleet Overview table column and the Executive KPI fix.
const validDaily = computed(() => (daily.value ?? []).filter(d => d.valid_flag));
const slTrailing = computed(() => fleetUtils.trailingMean(validDaily.value, 'speed_loss_pct', 30));
const slColor = computed(() => {
  const v = slTrailing.value;
  if (v == null) return FleetChartConstant.FallbackColor;
  if (v < 6) return FleetChartConstant.SemanticRamp.good;
  if (v < THRESHOLD) return FleetChartConstant.SemanticRamp.warning;
  return FleetChartConstant.SemanticRamp.critical;
});
const mean = arr => (arr.length ? arr.reduce((sum, v) => sum + v, 0) / arr.length : null);
const fmtMag = v => (v == null ? '–' : `${Math.abs(v).toFixed(1)}%`);
const slDelta = computed(() => {
  const vals = validDaily.value.map(d => d.speed_loss_pct).filter(v => v != null);
  const prev = mean(vals.slice(-60, -30));
  return slTrailing.value != null && prev != null ? slTrailing.value - prev : null;
});
// Decide direction on the *displayed* magnitude: a change that rounds to 0.0% reads flat.
const slDeltaSign = computed(() => {
  const d = slDelta.value;
  if (d == null) return null;
  return fmtMag(d) === fmtMag(0) ? 0 : d;
});
const deltaArrow = d => (d == null ? '' : d === 0 ? '→' : d > 0 ? '↑' : '↓');
const deltaColor = d => (d == null || d === 0 ? undefined : d > 0 ? 'error' : 'success');
const deltaTextClass = d => (d == null || d === 0 ? 'text-medium-emphasis' : d > 0 ? 'text-error' : 'text-success');

// --- Robust regression helpers (Theil-Sen; median-based, tolerant of maintenance steps) ---
const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const quantileSorted = (sorted, q) => {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] == null ? sorted[base] : sorted[base] + rest * (sorted[base + 1] - sorted[base]);
};
const theilSen = (pts) => {
  if (pts.length < 2) return null;
  let sample = pts;
  if (pts.length > 250) {
    const step = Math.ceil(pts.length / 250);
    sample = pts.filter((_, i) => i % step === 0);
  }
  const slopes = [];
  for (let i = 0; i < sample.length; i += 1) {
    for (let j = i + 1; j < sample.length; j += 1) {
      const dx = sample[j].x - sample[i].x;
      if (dx !== 0) slopes.push((sample[j].y - sample[i].y) / dx);
    }
  }
  if (!slopes.length) return null;
  const slope = median(slopes);
  const intercept = median(sample.map(p => p.y - slope * p.x));
  return { slope, intercept };
};

// Maintenance events are atomic in the catalog (a source "UWC+PP" row is split into two), so
// event_type is always one of these four.
const MAINT_ZH = {
  PP: '螺旋槳拋光',
  UWI: '水下檢查',
  UWC: '水下清潔',
  DD: '乾塢',
};
// --- Speed-loss trend (main visual) ---
// noon_utc / event_day / trigger_eta_day are day indices into the fleet's shared window (day 0 =
// 2021-07-01 for every ship, 1:1 with report_date). Everything below — the Theil-Sen fit, the
// degradation-rate extrapolation (a %/day rate), the pad math — stays in DAY space; the indices
// are converted to milliseconds only where a coordinate is handed to ECharts.
const speedLossTrendOption = computed(() => {
  const pts = (daily.value ?? [])
    .map(d => ({
      day: d.noon_utc,
      sl: d.speed_loss_pct,
      valid: d.valid_flag,
      // Why the ISO gate dropped this day. The grey scatter used to be silent — a cloud of
      // excluded points with no way to ask what excluded them.
      reason: d.reject_reason,
      daysSinceCleaning: d.days_since_cleaning,
    }))
    .filter(d => d.day != null && d.sl != null)
    .sort((a, b) => a.day - b.day);
  if (!pts.length) return {};

  // Floor negative outliers at the 1st percentile so they don't stretch the axis; the upper
  // tail (high speed loss) is the signal we want visible, so it stays intact.
  //
  // The floor is for AXIS SCALING ONLY, so it is applied to a display copy. Flooring `pts` in
  // place — as this used to — fed the clipped values straight into `valid` → `seg` → theilSen,
  // so the trend line and the trigger-date prediction were fitted on data that had been
  // truncated for cosmetic reasons. `plotSl` is what the chart draws; `sl` stays measured.
  const floor = quantileSorted(pts.map(d => d.sl).sort((a, b) => a - b), 0.01);
  const drawn = pts.map(d => ({ ...d, plotSl: Math.max(d.sl, floor) }));

  const valid = drawn.filter(d => d.valid);
  const drawPts = valid.length ? valid : drawn;
  // Scale the axis on the points the chart is ABOUT — the ISO-valid series — not on the
  // excluded ones. An excluded day can report a physically impossible speed loss (that is
  // *why* it was excluded: S4 day 131 claims 17.7 kn on 2,103 kW), and letting those set the
  // bound stretched the axis to ~100 % and squashed the 8 % and 10 % rules into the same pixel
  // row, illegible on top of each other. Excluded points are clamped to the bound rather than
  // dropped, so they stay visible and hoverable at the edge without dictating the scale — the
  // mirror image of what the 1st-percentile floor already does at the bottom.
  const maxSl = Math.max(...drawPts.map(d => d.plotSl));

  const r = rec.value;
  const triggerDay = r.trigger_eta_day ?? null;
  // Last cleaning day = the latest valid row's day minus its own days_since_cleaning.
  const lastRow = valid.at(-1);
  const lastCleanDay = lastRow?.daysSinceCleaning == null ? null : lastRow.day - lastRow.daysSinceCleaning;

  // Theil-Sen fit over the segment since the last cleaning, plus a dashed extrapolation to
  // the predicted trigger day using the engineered fouling rate. Fitted on the MEASURED `sl`,
  // never the floored `plotSl` — a slope is a claim about the hull, not about the axis.
  const seg = (lastCleanDay == null ? valid : valid.filter(d => d.day >= lastCleanDay));
  const fit = theilSen(seg.map(d => ({ x: d.day, y: d.sl })));
  const fitSeries = [];
  if (fit && seg.length > 1) {
    const yAt = day => fit.slope * day + fit.intercept;
    const x0 = seg[0].day;
    const x1 = seg.at(-1).day;
    fitSeries.push({
      name: '趨勢', type: 'line', showSymbol: false, symbol: 'none', silent: true,
      lineStyle: { color: TREND_COLOR, width: 1.8 },
      // Legend icon uses the series color (itemStyle), not lineStyle — set it so the icon
      // matches the line instead of falling back to the auto palette.
      itemStyle: { color: TREND_COLOR },
      data: [[fleetUtils.dayToMs(x0), yAt(x0)], [fleetUtils.dayToMs(x1), yAt(x1)]],
    });
    if (triggerDay != null && r.degradation_rate != null) {
      const y1 = seg.at(-1).sl;
      // degradation_rate is a %/DAY rate, so it multiplies a span of days. Extrapolating over a
      // span of milliseconds would scale the slope by 86.4M and flatten the line to nothing.
      const yEnd = y1 + r.degradation_rate * (triggerDay - x1);
      fitSeries.push({
        name: '預測', type: 'line', showSymbol: false, symbol: 'none', silent: true,
        lineStyle: { color: TREND_COLOR, width: 1.8, type: [5, 4] },
        itemStyle: { color: TREND_COLOR },
        data: [[fleetUtils.dayToMs(x1), y1], [fleetUtils.dayToMs(triggerDay), yEnd]],
      });
    }
  }

  // Top-of-chart markers carry the meaning; a faint guide line drops to the trend for date
  // reference. All ▼, distinguished by color: performed maintenance (slate), predicted trigger
  // (red). Details in the tooltip / legend.
  // Round the axis bounds to whole percents so ECharts doesn't print the raw float min/max
  // (e.g. 12.8788…% / -0.862275%) as edge labels. Markers sit at the top bound.
  const yMax = Math.ceil(Math.max(THRESHOLD * 1.15, maxSl * 1.1));
  const yMin = Math.min(0, Math.floor(floor));
  const guides = [];
  const maintMarks = [];
  (events.value ?? []).forEach((e) => {
    const day = e.event_day;
    if (day == null) return;
    guides.push({ xAxis: fleetUtils.dayToMs(day), lineStyle: { color: 'rgba(71, 85, 105, 0.3)', type: 'dashed', width: 1 } });
    const label = MAINT_ZH[e.event_type] || e.event_type;
    maintMarks.push({
      value: [fleetUtils.dayToMs(day), yMax],
      tip: `${label} · ${fleetUtils.dayDate(day)}`,
    });
  });
  const triggerMarks = [];
  if (triggerDay != null) {
    guides.push({ xAxis: fleetUtils.dayToMs(triggerDay), lineStyle: { color: 'rgba(190, 64, 55, 0.35)', type: 'dashed', width: 1 } }); // SemanticRamp.critical at 35% opacity
    triggerMarks.push({ value: [fleetUtils.dayToMs(triggerDay), yMax], tip: `預測觸發 · ${fleetUtils.dayDate(triggerDay)}` });
  }
  // Downward-triangle path so the legend icon matches the ▼ drawn on the chart (built-in
  // 'triangle' points up and legend ignores symbolRotate).
  const DOWN_TRIANGLE = 'path://M0,0 L20,0 L10,16 Z';
  const topMark = (name, data, color) => ({
    name, type: 'scatter', data, symbol: DOWN_TRIANGLE, symbolSize: 11,
    itemStyle: { color }, z: 5,
  });

  return {
    grid: { left: 54, right: 20, top: 52, bottom: 32 },
    legend: {
      top: 8, left: 'center', itemGap: 14, itemWidth: 24, itemHeight: 10,
      textStyle: { fontSize: 11 },
      data: ['速度損失', '排除資料', '趨勢', '預測', '已執行維修', '預測觸發'],
    },
    // Item trigger so a marker's tooltip shows only while the cursor is on the ▼ itself (an axis
    // trigger is x-only and would claim the marker across several days). The thin visible line is
    // hard to hover, so an invisible hit-area scatter overlay (below) carries the line tooltip.
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        if (p.data?.tip) return p.data.tip;
        if (Array.isArray(p.value)) {
          const label = fleetUtils.dayDate(fleetUtils.msToDay(p.value[0]));
          return `${label} · 速度損失 ${p.value[1] == null ? '–' : `${(+p.value[1]).toFixed(1)}%`}`;
        }
        return '';
      },
    },
    xAxis: { type: 'time' },
    yAxis: { type: 'value', name: 'speed loss %', nameLocation: 'middle', nameGap: 36, min: yMin, max: yMax, axisLabel: { formatter: '{value}%' } },
    series: [
      {
        name: '速度損失', type: 'line', smooth: true, showSymbol: false,
        symbol: 'circle',
        lineStyle: { color: FleetChartConstant.SpeedLossColor, width: 1.5 },
        itemStyle: { color: FleetChartConstant.SpeedLossColor },
        data: drawPts.map(d => [fleetUtils.dayToMs(d.day), d.plotSl]),
        markLine: {
          symbol: 'none', silent: true,
          // Guide lines carry no label (their meaning is the top marker); the two rules are
          // labeled. markLine defaults label.show to true, so disable it at series level.
          label: { show: false },
          data: [
            // TWO lines, each named for what it is. The 8% is the ISO 19030 maintenance
            // trigger the lake itself fires on (indicators.MT_TRIGGER_PCT); the 10% is this
            // dashboard's own cleaning-action policy. Only the 10% used to be drawn, labeled
            // the bare word "threshold" — which read as though ISO had set it.
            // Hangs BELOW its line ('insideEndBottom'), unlike the 10% rule above it: only
            // 2 percentage points separate the two, so two top-anchored labels overlap.
            { yAxis: ISO_TRIGGER, lineStyle: { color: FleetChartConstant.SemanticRamp.warning, type: 'dashed', width: 1 }, label: { show: true, formatter: `ISO 19030 維修觸發 ${ISO_TRIGGER}%`, position: 'insideEndBottom', fontSize: 10, color: FleetChartConstant.SemanticRamp.warning } },
            { yAxis: THRESHOLD, lineStyle: { color: FleetChartConstant.SemanticRamp.critical, type: 'dashed', width: 1 }, label: { show: true, formatter: `清潔行動線 ${THRESHOLD}%`, position: 'insideEndTop', fontSize: 10, color: FleetChartConstant.SemanticRamp.critical } },
            ...guides,
          ],
        },
      },
      {
        // Invisible hit area (shares the legend name): near-transparent symbols over the line so
        // hovering anywhere near it fires an item tooltip. The visible 1.5px stroke is too thin
        // to hover, and `triggerEvent: 'line'` fires zrender events without opening the tooltip.
        // A fully transparent fill is skipped by hit-testing, so opacity is a hair above zero.
        name: '速度損失', type: 'scatter', symbolSize: 22, z: 3,
        itemStyle: { color: FleetChartConstant.SpeedLossColor, opacity: 0.01 },
        emphasis: { disabled: true },
        data: drawPts.map(d => [fleetUtils.dayToMs(d.day), d.plotSl]),
      },
      {
        // Not silent any more: 78% of days fail the ISO gate, and the user is entitled to ask
        // *which* gate dropped any one of them. That drill-down is the point of the standard
        // (doc/iso-19030.md:110-116), and this scatter is where it surfaces.
        // symbolSize 5, not 3: at 3px the dots are effectively impossible to hover, which would
        // make the rejection reason below unreachable — a drill-down nobody can open is not one.
        name: '排除資料', type: 'scatter', symbolSize: 5,
        // Theme-derived, not a fixed hex: a light-mode gray reads as a bright, attention-
        // grabbing dot once alpha-free-drawn over the dark theme's card background.
        // backgroundScale3 is Vuetify's own light/dark pair for exactly this "structural, not
        // data" decoration (see AppEChart's axis/gridlines), so it stays equally muted in both.
        itemStyle: { color: themeColors.value.backgroundScale3 },
        emphasis: { scale: 2 },
        // Clamped to the axis so an impossible reading stays visible at the edge instead of
        // stretching the scale; the tooltip always reports the value the row actually carries.
        data: drawn.filter(d => !d.valid).map(d => ({
          value: [fleetUtils.dayToMs(d.day), clamp(d.plotSl, yMin, yMax)],
          tip: `${fleetUtils.dayDate(d.day)} · 速度損失 ${d.sl.toFixed(1)}%<br/><b>未通過 ISO 19030 篩選</b><br/>原因：${rejectReasonLabel(d.reason)}`,
        })),
      },
      ...fitSeries,
      // One shape (▼) for all top markers; color carries the meaning (slate = performed, red = predicted).
      topMark('已執行維修', maintMarks, '#475569'),
      topMark('預測觸發', triggerMarks, FleetChartConstant.SemanticRamp.critical),
    ],
  };
});

// --- Excluded-data breakdown (ISO gate rejection reasons) ---
// The trend chart's grey scatter only answers "why was THIS one day excluded" one point at a
// time. This rolls every excluded day up by reject_reason, so which gates actually drop this
// ship's data — and how often — is visible without hovering the whole cloud. Counted over every
// daily row (not just the ones the chart plots, which drop rows with no speed_loss_pct at all),
// so the total matches the header's own "ISO data coverage" denominator.
const rejectionBreakdown = computed(() => {
  const rows = (daily.value ?? []).filter(d => !d.valid_flag && d.reject_reason != null);
  const total = rows.length;
  if (!total) return [];
  const counts = new Map();
  rows.forEach((d) => {
    counts.set(d.reject_reason, (counts.get(d.reject_reason) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([reason, count]) => ({
      reason,
      label: rejectReasonLabel(reason),
      count,
      pct: (count / total) * 100,
    }))
    .sort((a, b) => b.count - a.count);
});
const rejectionHeaders = [
  { title: '排除原因', key: 'label', minWidth: 220 },
  { title: '天數', key: 'count', minWidth: 80, sortable: true },
  { title: '佔比', key: 'pct', minWidth: 90, sortable: true },
];
const rejectionExpanded = ref(false);
const rejectionSummary = computed(() => {
  const rows = rejectionBreakdown.value;
  if (!rows.length) return '目前沒有被排除的資料。';
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const top = rows[0];
  return `共 ${total} 天未通過 ISO 19030 篩選 —— 最大原因為「${top.label}」（${top.count} 天，${top.pct.toFixed(0)}%）。`;
});

// --- Excess fuel cost composition (fouling / weather / operational) ---
// The daily excess fuel cost — extra fuel burned vs a clean hull in calm water, × price — splits
// into three drivers that sum to the total: hull fouling (excess_cost_usd == excess_cost_fouling_usd),
// weather, and operational. This mirrors the PoC / executive tab, which report excess cost as a
// per-day figure (fleet_overview.total_excess_cost_usd); fouling is the largest and the only one a
// cleaning can reset, so it is the controllable lever.
const COST_PARTS = [
  // "船體＋螺槳汙損", not "船體汙損": this channel is excess_cost_usd, which is derived from
  // speed_loss_pct — the COMBINED hull-and-propeller effect. ISO 19030 does not split them.
  { key: 'f', col: 'excess_cost_fouling_usd', title: '船體＋螺槳汙損', color: FleetChartConstant.CauseColor.hull_biofouling },
  { key: 'w', col: 'excess_cost_weather_usd', title: '天氣／海況', color: FleetChartConstant.CauseColor.weather },
  // Light warm neutral (not slate) so this reads as a plain "other" bucket. Lighter again
  // than the weather blue below it — the lightness step is what separates the bands, so it
  // needs to keep climbing layer over layer, not just differ in hue.
  { key: 'o', col: 'excess_cost_operational_usd', title: '操作', color: '#d6d3d1' },
];
const COST_AVG_WINDOW = 30;
const costDaily = computed(() =>
  (daily.value ?? [])
    .filter(d => d.excess_cost_fouling_usd != null && typeof d.report_date === 'string')
    .map(d => ({
      ts: Date.parse(d.report_date),
      f: d.excess_cost_fouling_usd ?? 0,
      w: d.excess_cost_weather_usd ?? 0,
      o: d.excess_cost_operational_usd ?? 0,
    }))
    .filter(d => !Number.isNaN(d.ts))
    .sort((a, b) => a.ts - b.ts),
);
// Recent daily rate (window average) — the PoC-style "current excess cost per day".
const costRecent = computed(() => {
  const rows = costDaily.value.slice(-COST_AVG_WINDOW);
  if (!rows.length) return null;
  const avg = key => rows.reduce((sum, r) => sum + r[key], 0) / rows.length;
  const f = avg('f');
  const w = avg('w');
  const o = avg('o');
  const r = rec.value;
  return { f, w, o, total: f + w + o, netSaving: r.net_saving_usd ?? null };
});
const costPct = part => (costRecent.value?.total ? Math.round((part / costRecent.value.total) * 100) : null);
const costSummary = computed(() => {
  const t = costRecent.value;
  if (!t?.total) return '目前沒有足夠的成本資料。';
  const save = t.netSaving == null ? '' : `；準時清潔淨省 ${fmtUsd(t.netSaving)}`;
  return `目前每日超額燃油成本約 ${fmtUsd(t.total)}（近 ${COST_AVG_WINDOW} 天平均）—— 船體汙損佔 ${costPct(t.f)}% 為最大且可改善來源，天氣 ${costPct(t.w)}%、操作 ${costPct(t.o)}%${save}。`;
});
const costTiles = computed(() => {
  const t = costRecent.value;
  if (!t?.total) return [];
  const subs = {
    f: t.netSaving == null ? '最大且可控來源' : `最大且可控 · 準時清潔淨省 ${fmtUsd(t.netSaving)}`,
    w: '季節性、多不可控',
    o: '航速／裝載等操作',
  };
  return COST_PARTS.map(p => ({
    key: p.key, title: p.title, color: p.color, sub: subs[p.key],
    value: `${fmtUsd(t[p.key])}/day`, share: costPct(t[p.key]),
  }));
});
const fmtUsdCompact = (v) => {
  const n = Math.abs(v);
  if (n >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${Math.round(v / 1e3)}k`;
  return `$${Math.round(v)}`;
};
const excessCostOption = computed(() => {
  const rows = costDaily.value;
  if (!rows.length) return {};

  // Trailing window-average per component so the stacked daily-rate series reads as a trend
  // rather than day-to-day noise (same window as the headline figure).
  const smoothed = (key) => {
    let sum = 0;
    return rows.map((r, i) => {
      sum += r[key];
      if (i >= COST_AVG_WINDOW) sum -= rows[i - COST_AVG_WINDOW][key];
      return Math.round(sum / Math.min(i + 1, COST_AVG_WINDOW));
    });
  };
  const series = COST_PARTS.map(p => ({ ...p, values: smoothed(p.key) }));

  return {
    grid: { left: 68, right: 20, top: 40, bottom: 32 },
    legend: {
      top: 8, left: 'center', itemGap: 16, itemWidth: 20, itemHeight: 10,
      textStyle: { fontSize: 11 },
      data: COST_PARTS.map(p => p.title),
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const list = Array.isArray(params) ? params : [params];
        const ts = list[0]?.value?.[0];
        const total = list.reduce((sum, p) => sum + (Array.isArray(p.value) ? p.value[1] : 0), 0);
        const body = list.map(p => `${p.marker}${p.seriesName}: ${fmtUsd(p.value[1])}/day`).join('<br/>');
        return `${fleetUtils.formatDate(ts) ?? ''}<br/>${body}<br/>合計: ${fmtUsd(total)}/day`;
      },
    },
    xAxis: { type: 'time' },
    yAxis: { type: 'value', name: 'USD / 日', nameLocation: 'middle', nameGap: 46, axisLabel: { formatter: fmtUsdCompact } },
    series: series.map(p => ({
      name: p.title, type: 'line', stack: 'cost', showSymbol: false, symbol: 'none',
      lineStyle: { width: 0 },
      // Fully opaque — adjacent bands are told apart by a deliberately large lightness step
      // between their colors (see CategoricalPalette), not by a border or transparency.
      areaStyle: { color: p.color, opacity: 1 },
      itemStyle: { color: p.color },
      emphasis: { focus: 'series' },
      data: rows.map((r, i) => [r.ts, p.values[i]]),
    })),
  };
});

// --- CII trend (AER / IMO value trajectory + readable rating markers) ---
// The PoC shows the CII AER and IMO numeric paths; keep that analytical signal, but lift the
// current/worst ratings into compact summary tiles so the chart can stay focused on values.
const CII_RANK = { A: 5, B: 4, C: 3, D: 2, E: 1 };
const CII_SERIES = [
  { key: 'cii_aer', label: 'CII AER', color: '#64748b', ratingKey: 'cii_rating_aer', markerOffset: -12 },
  { key: 'cii_imo', label: 'CII IMO', color: FleetChartConstant.CategoricalPalette[0], ratingKey: 'cii_rating_imo', markerOffset: 12 },
];
const toCiiValue = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const ciiRows = computed(() =>
  (daily.value ?? [])
    .filter(d => typeof d.report_date === 'string')
    .map(d => ({
      ts: Date.parse(d.report_date),
      cii_aer: toCiiValue(d.cii_aer),
      cii_imo: toCiiValue(d.cii_imo),
      cii_rating_aer: d.cii_rating_aer || null,
      cii_rating_imo: d.cii_rating_imo || null,
    }))
    .filter(d => !Number.isNaN(d.ts) && CII_SERIES.some(s => d[s.key] != null))
    .sort((a, b) => a.ts - b.ts),
);
const ciiRowsForSeries = (rows, series) => rows.filter(row => row[series.key] != null);
const ciiRatingRuns = (rows, series) => {
  const runs = [];
  ciiRowsForSeries(rows, series).forEach((d) => {
    const rating = d[series.ratingKey];
    const prev = runs.at(-1);
    if (prev && prev.rating === rating) prev.items.push(d);
    else runs.push({ rating, items: [d] });
  });
  return runs;
};
const worstCiiRatingInfo = (rows, series) => {
  const runs = ciiRatingRuns(rows, series).filter(run => CII_RANK[run.rating] != null);
  if (!runs.length) return null;
  return runs.reduce((worst, run) => (CII_RANK[run.rating] < CII_RANK[worst.rating] ? run : worst), runs[0]);
};
const ciiTrendSummary = computed(() => {
  const rows = ciiRows.value;
  if (!rows.length) return '尚無 CII 資料。';
  const last = rows.at(-1);
  const worstRatings = CII_SERIES.map(s => worstCiiRatingInfo(rows, s)?.rating).filter(Boolean);
  const worst = worstRatings.length
    ? worstRatings.reduce((w, r) => (CII_RANK[r] < CII_RANK[w] ? r : w), worstRatings[0])
    : null;
  const risk = worst && CII_RANK[worst] <= 2
    ? `期間曾掉至 ${worst} 級，須留意合規風險`
    : worst ? '期間維持 C 級以上，合規良好' : '尚無評級資料';
  return `最新一日 ${fleetUtils.formatDate(last.ts)}：AER ${fmtNum(last.cii_aer, 2)}（${last.cii_rating_aer || '–'} 級）、IMO ${fmtNum(last.cii_imo, 2)}（${last.cii_rating_imo || '–'} 級）—— ${risk}。`;
});
const nearestCiiRow = (rows, ts) => {
  let lo = 0;
  let hi = rows.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (rows[mid].ts < ts) lo = mid + 1;
    else hi = mid;
  }
  return rows[lo];
};
const ciiRatingMarkers = (rows, series) => {
  const runs = ciiRatingRuns(rows, series);
  return runs.map((run) => {
    const mid = run.items[Math.floor(run.items.length / 2)];
    return {
      value: [mid.ts, mid[series.key]],
      rating: run.rating || '–',
      itemStyle: {
        color: ciiColor(run.rating),
        borderColor: series.color,
        borderWidth: 2.5,
        opacity: 0.82,
      },
      label: {
        color: '#ffffff',
      },
    };
  });
};
const ciiTrendOption = computed(() => {
  const rows = ciiRows.value;
  if (!rows.length) return {};

  const values = rows.flatMap(row => CII_SERIES.map(s => row[s.key])).filter(v => v != null);

  return {
    grid: { left: 74, right: 22, top: 48, bottom: 34 },
    legend: {
      top: 12, left: 'center', itemGap: 18, itemWidth: 22, itemHeight: 10,
      textStyle: { fontSize: 11 },
      data: CII_SERIES.map(s => s.label),
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const list = Array.isArray(params) ? params : [params];
        const ts = list[0]?.axisValue ?? list.find(p => Array.isArray(p.value))?.value?.[0];
        const row = ts == null ? null : nearestCiiRow(rows, ts);
        if (!row) return '';
        const body = CII_SERIES
          .filter(s => row[s.key] != null)
          .map(s => `${s.label}: ${fmtNum(row[s.key], 2)} · rating ${row[s.ratingKey] || '–'}`)
          .join('<br/>');
        return `${fleetUtils.formatDate(ts)}<br/>${body}`;
      },
    },
    xAxis: { type: 'time' },
    yAxis: {
      type: 'value',
      name: 'gCO₂ / dwt·nm',
      nameLocation: 'middle',
      nameGap: 52,
      scale: true,
      min: Math.min(...values) * 0.98,
      max: Math.max(...values) * 1.02,
      axisLabel: {
        formatter: value => Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 }),
      },
    },
    series: [
      ...CII_SERIES.map(s => ({
        name: s.label,
        type: 'line',
        smooth: true,
        showSymbol: false,
        symbol: 'none',
        triggerEvent: 'line',
        lineStyle: { width: 1.6, color: s.color },
        itemStyle: { color: s.color },
        data: rows.map(row => [row.ts, row[s.key]]),
      })),
      ...CII_SERIES.map(s => ({
        name: s.label,
        type: 'scatter',
        silent: true,
        legendHoverLink: false,
        z: 6,
        symbol: 'circle',
        symbolSize: 16,
        symbolOffset: [0, s.markerOffset],
        data: ciiRatingMarkers(rows, s),
        label: {
          show: true,
          position: 'inside',
          formatter: p => p.data.rating,
          fontSize: 9,
          fontWeight: 700,
        },
      })),
    ],
  };
});

// --- Maintenance recommendations (the decision: what to do, when) ---
// The tracked signal's unit differs by action: speed loss and coating breakdown are percentages,
// propeller work tracks roughness in µm. net_saving_usd is only populated for the economic
// actions (hull cleaning / polishing) — engine inspection has no saving model.
const MAINT_ACTION = {
  hull_cleaning: { title: '船體清潔', icon: 'mdi-spray-bottle', unit: '%' },
  propeller_polishing: { title: '螺旋槳拋光', icon: 'mdi-fan', unit: 'µm' },
  propeller_repair: { title: '螺旋槳修理', icon: 'mdi-fan-alert', unit: 'µm' },
  coating_renewal: { title: '船體塗層更新', icon: 'mdi-format-paint', unit: '%' },
  engine_inspection: { title: '主機檢查', icon: 'mdi-engine', unit: '%' },
};
const PRIORITY_META = {
  high: { label: '高', color: 'error', rank: 0 },
  medium: { label: '中', color: 'warning', rank: 1 },
  low: { label: '低', color: 'success', rank: 2 },
};
const fmtMetricVal = (v, unit) => {
  if (v == null) return '–';
  if (unit === '%') return `${v.toFixed(1)}%`;
  if (unit === 'µm') return `${Math.round(v)}µm`;
  return Number.isInteger(v) ? `${v}` : v.toFixed(1);
};
const maintenanceRecommendations = computed(() =>
  (maintRecs.value ?? [])
    .map((r) => {
      const action = MAINT_ACTION[r.action_type] ?? { title: r.action_type, icon: 'mdi-wrench-outline', unit: '' };
      const prio = PRIORITY_META[r.priority] ?? { label: r.priority, color: undefined, rank: 9 };
      return {
        key: `${r.action_type}-${r.due_day}`,
        title: action.title,
        icon: action.icon,
        priority: prio.label,
        priorityColor: prio.color,
        rank: prio.rank,
        dueDay: r.due_day,
        netSaving: r.net_saving_usd ?? null,
        metric: r.current_value == null
          ? null
          : `目前 ${fmtMetricVal(r.current_value, action.unit)} / 門檻 ${fmtMetricVal(r.threshold_value, action.unit)}`,
        rationale: r.rationale ?? '',
      };
    })
    .sort((a, b) => a.rank - b.rank || (a.dueDay ?? Infinity) - (b.dueDay ?? Infinity)),
);
const maintenanceSummary = computed(() => {
  const list = maintenanceRecommendations.value;
  if (!list.length) return '目前沒有待處理的維修建議。';
  const top = list[0];
  // Composed from the parts, not dayLabel: this reads "handle BEFORE day N", so a date-plus-
  // parenthetical substituted whole would garble to `…（76 天後）天前處理`.
  return `共 ${list.length} 項維修建議 —— 最高優先：${top.title}（建議於 ${fleetUtils.dayDate(top.dueDay)} 前處理，${fleetUtils.relativeDay(top.dueDay)}）。`;
});

// --- Underwater inspection (physical ground-truth for the fouling story) ---
// fact_uwi is the inspection log: hull fouling rating (0–100) + coverage, propeller condition
// (Good/Fair/Poor) + roughness, coating breakdown + condition, and the recommended action. It
// corroborates the statistical diagnostics and backs the maintenance recommendations. The grades
// are real; the numeric signals beside them are synthesized from those grades.
const UWI_TYPE_ZH = { UWI: '水下檢查', DD: '乾塢' };
const UWI_COND_ZH = { Good: '良好', Fair: '尚可', Poor: '不佳' };
const UWI_ACTION = {
  none: { label: '無需處理', color: undefined },
  polish: { label: '拋光', color: 'warning' },
  clean: { label: '清潔', color: 'error' },
};
const uwiHeaders = [
  { title: '檢查日期', key: 'inspection_date', minWidth: 120, sortable: true },
  { title: '方式', key: 'inspection_type', minWidth: 100, sortable: true },
  { title: '船體汙損', key: 'hull_fouling_rating', minWidth: 140, sortable: true },
  { title: '螺旋槳', key: 'propeller_condition', minWidth: 140, sortable: true },
  { title: '塗層', key: 'coating_breakdown_pct', minWidth: 140, sortable: true },
  { title: '建議', key: 'recommended_action', minWidth: 110, sortable: true },
];
const CONDITION_COLOR = { Good: 'success', Fair: 'warning', Poor: 'error' };
const foulColor = r => (r == null ? undefined : r < 30 ? 'success' : r < 60 ? 'warning' : 'error');
const condColor = c => CONDITION_COLOR[c];
const condLabel = c => UWI_COND_ZH[c] || c || '–';
const textClass = c => (c ? `text-${c} font-weight-medium` : '');
const uwiRows = computed(() =>
  [...(uwi.value ?? [])]
    .filter(r => typeof r.inspection_date === 'string')
    .sort((a, b) => (a.inspection_date < b.inspection_date ? 1 : -1)),
);
const uwiSummary = computed(() => {
  const r = uwiRows.value[0];
  if (!r) return '尚無水下檢查紀錄。';
  const act = UWI_ACTION[r.recommended_action]?.label ?? r.recommended_action;
  return `最新一次水下檢查（${r.inspection_date}）：船體汙損 ${Math.round(r.hull_fouling_rating)}/100、螺旋槳${condLabel(r.propeller_condition)}、塗層劣化 ${Math.round(r.coating_breakdown_pct)}%，建議${act}。`;
});
// History table stays collapsed by default — the latest inspection summary is enough at a glance.
const uwiExpanded = ref(false);

// --- Speed–power scatter ---
// ship_speed_power aligns two series on (speed_kn, power_kw): the ship's ISO-corrected, valid-gated
// measured points (each carrying its own days_since_cleaning) and its fitted clean-hull reference
// curve. Measured points are bucketed by cleaning-cycle phase — discrete colors read better than a
// continuous gradient — and the cloud marching up-left away from the reference over the cycle is
// the fouling story.
const CLEAN_PHASES = [
  { label: '清潔後 0–75 天', color: FleetChartConstant.SemanticRamp.good, min: 0, max: 75 },
  { label: '75–150 天', color: FleetChartConstant.SemanticRamp.fair, min: 75, max: 150 },
  { label: '150–250 天', color: FleetChartConstant.SemanticRamp.warning, min: 150, max: 250 },
  { label: '≥ 250 天', color: FleetChartConstant.SemanticRamp.critical, min: 250, max: Infinity },
];
const REFERENCE_LABEL = '乾淨船體基準';
const speedPowerOption = computed(() => {
  const rows = (speedPower.value ?? []).filter(d => d.speed_kn != null && d.power_kw != null);
  const measured = rows.filter(d => d.series === 'measured');
  const reference = rows.filter(d => d.series === 'reference').sort((a, b) => a.speed_kn - b.speed_kn);
  if (!measured.length && !reference.length) return {};

  const phaseSeries = CLEAN_PHASES.map(p => ({
    name: p.label,
    type: 'scatter',
    symbolSize: 5,
    itemStyle: { color: p.color, opacity: 0.8 },
    data: measured
      .filter(d => d.days_since_cleaning != null && d.days_since_cleaning >= p.min && d.days_since_cleaning < p.max)
      .map(d => ({ value: [d.speed_kn, d.power_kw], day: d.days_since_cleaning })),
  }));
  // Ships with no cleaning event on record have no cycle clock to bucket by.
  const unphased = measured.filter(d => d.days_since_cleaning == null);

  return {
    grid: { left: 68, right: 24, top: 44, bottom: 48 },
    legend: { top: 12, left: 'center', itemGap: 14, textStyle: { fontSize: 11 } },
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        if (!Array.isArray(p.value)) return '';
        const [s, pw] = p.value;
        const day = p.data?.day;
        const head = p.seriesName === REFERENCE_LABEL ? `${REFERENCE_LABEL}<br/>` : '';
        return `${head}${s.toFixed(1)} kn · ${Math.round(pw).toLocaleString()} kW${day == null ? '' : ` · 距清潔 ${day} 天`}`;
      },
    },
    // Both axis names centered (y rotated on the left, x below), so the top clears the legend
    // and the x unit doesn't collide with the last tick / right border.
    xAxis: { type: 'value', name: 'speed (kn)', nameLocation: 'middle', nameGap: 28, scale: true },
    yAxis: { type: 'value', name: 'power (kW)', nameLocation: 'middle', nameGap: 46, scale: true },
    series: [
      ...phaseSeries,
      {
        name: '未知階段',
        type: 'scatter',
        symbolSize: 5,
        itemStyle: { color: FleetChartConstant.FallbackColor, opacity: 0.5 },
        data: unphased.map(d => ({ value: [d.speed_kn, d.power_kw], day: null })),
      },
      {
        name: REFERENCE_LABEL,
        type: 'line',
        smooth: true,
        showSymbol: false,
        symbol: 'none',
        z: 4,
        lineStyle: { color: '#334155', width: 2 },
        itemStyle: { color: '#334155' },
        data: reference.map(d => [d.speed_kn, d.power_kw]),
      },
    ],
  };
});

const severityColor = s => FleetChartConstant.SeverityColor[s] || FleetChartConstant.FallbackColor;
// The driver metric behind an alert episode (fact_alert.driver_metric) or an anomaly point
// (fact_anomaly.metric) — the same four names in both (mirrored in DashboardFleetAlerts.vue).
const METRIC_ORDER = ['speed_loss', 'sfoc', 'slip', 'excess_foc'];
const METRIC_ZH = {
  speed_loss: '速度損失',
  sfoc: '主機油耗 (SFOC)',
  slip: '螺槳滑失',
  excess_foc: '超額油耗',
};
const metricTitle = m => METRIC_ZH[m] || m;
const METRIC_ICON = {
  speed_loss: 'mdi-speedometer-slow',
  sfoc: 'mdi-engine',
  slip: 'mdi-fan',
  excess_foc: 'mdi-gas-station',
};
const metricIcon = m => METRIC_ICON[m] || 'mdi-alert-circle-outline';

// --- Anomaly episode timeline (swim lanes by metric) ---
const SEVERITY_ORDER = ['low', 'medium', 'high'];
const SEVERITY_LABEL = { low: '低', medium: '中', high: '高' };
const MIN_EPISODE_BAR_WIDTH = 4;
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
    shape: {
      x,
      y: start[1] - laneHeight / 2,
      width,
      height: laneHeight,
    },
    // api.style() is deprecated in v5+ — read the item's designated visuals instead
    style: { fill: api.visual('color') },
  };
};
const renderEpisodeBar = (params, api) => {
  const laneIndex = api.value(0);
  const start = api.coord([api.value(1), laneIndex]);
  const end = api.coord([api.value(2), laneIndex]);
  const laneHeight = api.size([0, 1])[1];
  const height = Math.min(18, Math.max(7, laneHeight * 0.46));
  const rawX = Math.min(start[0], end[0]);
  const rawWidth = Math.max(Math.abs(end[0] - start[0]), MIN_EPISODE_BAR_WIDTH);
  const minX = params.coordSys.x;
  const maxX = params.coordSys.x + params.coordSys.width;
  const x = Math.max(rawX, minX);
  const width = Math.min(rawX + rawWidth, maxX) - x;

  if (width <= 0) return null;

  return {
    type: 'rect',
    shape: {
      x,
      y: start[1] - height / 2,
      width,
      height,
      r: 3,
    },
    style: {
      fill: api.visual('color'),
      opacity: api.visual('opacity'),
      stroke: '#ffffff',
      lineWidth: 0.6,
    },
  };
};
const anomalyTimelineOption = computed(() => {
  const episodes = (alerts.value ?? [])
    .map((d) => {
      if (d.opened_day == null || d.last_seen_day == null) return null;
      const start = d.opened_day;
      const end = Math.max(d.opened_day, d.last_seen_day);
      return {
        ...d,
        metric: d.driver_metric || 'unknown',
        severity: d.severity || 'unknown',
        start,
        end,
        startTs: fleetUtils.dayToMs(start),
        endTs: fleetUtils.dayToMs(end),
        durationDays: Math.max(1, d.last_seen_day - d.opened_day + 1),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start);
  if (!episodes.length) return {};

  const present = new Set(episodes.map(d => d.metric));
  const lanes = [
    ...METRIC_ORDER.filter(m => present.has(m)),
    ...[...present].filter(m => !METRIC_ORDER.includes(m)),
  ];
  const laneIndex = new Map(lanes.map((m, i) => [m, i]));
  const laneLabels = lanes.map(m => metricTitle(m));
  const severities = [
    ...SEVERITY_ORDER.filter(s => episodes.some(d => d.severity === s)),
    ...[...new Set(episodes.map(d => d.severity))].filter(s => !SEVERITY_ORDER.includes(s)),
  ];
  const minDay = Math.min(...episodes.map(d => d.start));
  const maxDay = Math.max(...episodes.map(d => d.end));
  const xPad = Math.max(14, (maxDay - minDay) * 0.02);
  const c = themeColors.value;
  const xMin = fleetUtils.dayToMs(minDay - xPad);
  const xMax = fleetUtils.dayToMs(maxDay + xPad);
  const laneBandColors = [c.backgroundScale1, c.backgroundScale2];

  return {
    grid: { left: 104, right: 20, top: 46, bottom: 64 },
    legend: {
      top: 10, left: 'center', itemGap: 14, itemWidth: 18, itemHeight: 9,
      textStyle: { fontSize: 11 },
      data: severities.map(s => SEVERITY_LABEL[s] || s),
    },
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        const d = p.data.row;
        const peak = d.peak_z == null ? '' : `<br/>峰值 z=${d.peak_z.toFixed(1)}`;
        // "持續" prefixes the duration: the range beside it is now a pair of dates, and a bare
        // `N 天` next to them would read as a fourth date rather than as how long the episode ran.
        const span = `${fleetUtils.dayRangeLabel(d.opened_day, d.last_seen_day)} · 持續 ${d.durationDays} 天`;
        return `${metricTitle(d.metric)} · ${SEVERITY_LABEL[d.severity] || d.severity}<br/>${span}${peak}<br/>${d.message_zh || ''}`;
      },
    },
    dataZoom: [
      {
        type: 'slider',
        xAxisIndex: 0,
        filterMode: 'weakFilter',
        bottom: 8,
        height: 18,
        brushSelect: false,
        showDetail: false,
        borderColor: c.backgroundScale3,
        backgroundColor: c.backgroundScale1,
        fillerColor: c.backgroundScale3,
        handleSize: '80%',
        handleStyle: {
          color: c.backgroundScale2,
          borderColor: c.backgroundScale4,
          borderWidth: 1,
        },
        moveHandleStyle: {
          color: c.backgroundScale4,
        },
      },
    ],
    xAxis: { type: 'time', min: xMin, max: xMax },
    yAxis: {
      type: 'category', data: laneLabels, boundaryGap: true, inverse: true,
      axisTick: { show: false },
    },
    series: [
      {
        type: 'custom',
        renderItem: renderLaneBand,
        silent: true,
        encode: { x: [1, 2], y: 0 },
        z: 0,
        data: lanes.map((_, i) => ({
          value: [i, xMin, xMax],
          itemStyle: { color: laneBandColors[i % 2] },
        })),
      },
      ...severities.map(severity => ({
        name: SEVERITY_LABEL[severity] || severity,
        type: 'custom',
        renderItem: renderEpisodeBar,
        encode: { x: [1, 2], y: 0 },
        itemStyle: { color: severityColor(severity), opacity: 0.86 },
        emphasis: { itemStyle: { opacity: 1 } },
        z: 2,
        data: episodes
          .filter(d => d.severity === severity)
          .map(d => ({
            value: [laneIndex.get(d.metric), d.startTs, d.endTs],
            row: d,
          })),
      })),
    ],
  };
});

// --- Cause diagnostics: a baseline-index view over the four signals the anomaly detector itself
// keys off (speed_loss / slip / sfoc / excess_foc), so each tile's deviation can be corroborated
// by that same metric's robust-z anomaly count.
const DIAGNOSTIC_BASELINE_WINDOW = 30;
const DIAGNOSTIC_ALERT_WINDOW_DAYS = 30;
const DIAGNOSTIC_GRIDS = [
  { top: 46, height: 56, name: '%', decimals: 1 },
  { top: 130, height: 56, name: 'slip', decimals: 3 },
  { top: 214, height: 56, name: 'g/kWh', decimals: 1 },
  { top: 298, height: 56, name: 'mt', decimals: 1 },
];
const toFinite = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const toBaselineIndex = (value, baseline) => (
  value != null && baseline != null && baseline !== 0 ? (value / baseline) * 100 : null
);
const fmtSignedPct = v => (v == null ? '–' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`);
const fmtIndexDelta = index => fmtSignedPct(index == null ? null : index - 100);
const fmtMetricRaw = (key, value) => {
  if (value == null) return '–';
  if (key === 'slip') return `${(value * 100).toFixed(1)}%`;
  if (key === 'sfoc') return `${value.toFixed(1)} g/kWh`;
  if (key === 'speed_loss') return `${value.toFixed(1)}%`;
  if (key === 'excess_foc') return `${value.toFixed(1)} mt`;
  return value.toFixed(1);
};
const fmtAxisLabel = (value, decimals) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals });
};
const clamp = (value, min, max) => {
  if (value == null || min == null || max == null) return value;
  return Math.max(min, Math.min(max, value));
};
// All four signals live on the same daily row. speed_loss is only meaningful on an ISO 19030-valid
// day (elsewhere it is measuring the weather), so it is gated; the other three are raw readings
// that stand on their own.
const diagnosticRows = computed(() => (daily.value ?? [])
  .filter(d => d.noon_utc != null && !d.masked_flag)
  .map(d => ({
    day: d.noon_utc,
    speed_loss: d.valid_flag ? d.speed_loss_pct : null,
    slip: d.slip_real,
    sfoc: d.sfoc_g_kwh,
    excess_foc: d.excess_foc_mt,
  }))
  .sort((a, b) => a.day - b.day));
const buildMetricStat = (rows, key) => {
  const points = rows
    .map(d => ({ day: d.day, value: toFinite(d[key]) }))
    .filter(d => d.value != null);
  const baseline = median(points.slice(0, Math.min(DIAGNOSTIC_BASELINE_WINDOW, points.length)).map(d => d.value));
  const latestPoint = points.at(-1);
  // excess_foc is DERIVED from speed_loss_pct (physics.excess_foc_mt), so a single day carries
  // the same ISO curve-fit scatter that made the hull tile noise-dominated — trailing-mean it
  // for the same reason, over the same window this file already uses for speed loss.
  const trailingValue = mean(points.slice(-DIAGNOSTIC_BASELINE_WINDOW).map(d => d.value));

  return {
    baseline,
    latestIndex: toBaselineIndex(latestPoint?.value, baseline),
    latestValue: latestPoint?.value ?? null,
    trailingIndex: toBaselineIndex(trailingValue, baseline),
    trailingValue,
    points,
  };
};
const diagnosticStats = computed(() => {
  const rows = diagnosticRows.value;

  return {
    speedLoss: buildMetricStat(rows, 'speed_loss'),
    sfoc: buildMetricStat(rows, 'sfoc'),
    slip: buildMetricStat(rows, 'slip'),
    excessFoc: buildMetricStat(rows, 'excess_foc'),
  };
});
const diagnosticLevel = (high, medium) => (high ? 'high' : medium ? 'medium' : 'low');
const diagnosticColor = level => ({ high: 'error', medium: 'warning', low: 'success' }[level]);
const diagnosticStatus = level => ({ high: '需優先確認', medium: '持續觀察', low: '穩定' }[level]);
// Recent anomaly count for a metric — the lake's own robust-z detection (fact_anomaly), within the
// last 30 days of this ship's own data (single ship, so no cross-ship day-alignment issue).
const recentAnomalyCount = (metric) => {
  const lastDay = diagnosticRows.value.at(-1)?.day;
  if (lastDay == null) return 0;
  return (anomalies.value ?? []).filter(a => a.metric === metric && a.noon_utc != null && lastDay - a.noon_utc <= DIAGNOSTIC_ALERT_WINDOW_DAYS).length;
};
// The deviation at which each metric turns `high`. Named because dominantDiagnostic divides by
// them to put four different units (% speed loss, % of SFOC baseline, % slip, % excess FOC) on
// one comparable scale.
const DIAGNOSTIC_HIGH = { speedLoss: THRESHOLD, slip: 15, sfoc: 5, excessFoc: 8 };

// --- Confidence: what each tile's inference actually rests on ---
//
// ISO 19030 measures the COMBINED hull-plus-propeller change and offers no method to separate
// the two. Attribution is therefore an inference layer on top of ISO, and the standard's own
// guidance is that it must carry a confidence level and never be presented as a direct ISO
// output — "this matters a great deal once the output reaches owners/charterers and enters
// contractual dispute" (doc/iso-19030.md:83-89).
//
// `corroborator` names the one OTHER signal that is physically independent of this one.
// excess_foc is nobody's corroborator on purpose: it is DERIVED from speed_loss
// (physics.excess_foc_mt computes it *from* the speed loss), so excess_foc agreeing with
// speed_loss is speed loss agreeing with itself. For the same reason it can never itself
// reach high confidence.
const DIAGNOSTIC_EVIDENCE = {
  speed_loss: { corroborator: 'slip', reset: 'days_since_cleaning' },
  slip: { corroborator: 'speed_loss', reset: 'days_since_polish' },
  sfoc: { corroborator: null, reset: null },
  excess_foc: { corroborator: null, reset: 'days_since_cleaning', derived: true },
};
const CONFIDENCE_MIN_POINTS = 10;
const CONFIDENCE_HIGH_POINTS = 30;
// A reading taken days after a hull clean / propeller polish has almost no history behind it,
// so it cannot support a claim about degradation yet — however clean the arithmetic looks.
const CONFIDENCE_MIN_DAYS_SINCE_RESET = 14;
const CONFIDENCE_LABEL = { high: '信心高', medium: '信心中', low: '信心低' };
const CONFIDENCE_COLOR = { high: 'success', medium: 'warning', low: 'error' };

const causeDiagnostics = computed(() => {
  const stats = diagnosticStats.value;
  const slipDelta = stats.slip.latestIndex == null ? null : stats.slip.latestIndex - 100;
  const sfocDelta = stats.sfoc.latestIndex == null ? null : stats.sfoc.latestIndex - 100;
  const excessDelta = stats.excessFoc.trailingIndex == null ? null : stats.excessFoc.trailingIndex - 100;
  const speedLossAnomalies = recentAnomalyCount('speed_loss');
  const slipAnomalies = recentAnomalyCount('slip');
  const sfocAnomalies = recentAnomalyCount('sfoc');
  const excessAnomalies = recentAnomalyCount('excess_foc');

  const hullLevel = diagnosticLevel(
    (slTrailing.value ?? 0) >= DIAGNOSTIC_HIGH.speedLoss || speedLossAnomalies >= 2,
    (slTrailing.value ?? 0) >= 6 || speedLossAnomalies >= 1,
  );
  const propellerLevel = diagnosticLevel(
    (slipDelta != null && slipDelta >= DIAGNOSTIC_HIGH.slip) || slipAnomalies >= 2,
    (slipDelta != null && slipDelta >= 8) || slipAnomalies >= 1,
  );
  const engineLevel = diagnosticLevel(
    (sfocDelta != null && sfocDelta >= DIAGNOSTIC_HIGH.sfoc) || sfocAnomalies >= 2,
    (sfocDelta != null && sfocDelta >= 2) || sfocAnomalies >= 1,
  );
  const excessLevel = diagnosticLevel(
    (excessDelta != null && excessDelta >= DIAGNOSTIC_HIGH.excessFoc) || excessAnomalies >= 2,
    (excessDelta != null && excessDelta >= 3) || excessAnomalies >= 1,
  );

  const levelByKey = { speed_loss: hullLevel, slip: propellerLevel, sfoc: engineLevel, excess_foc: excessLevel };
  const nByKey = {
    speed_loss: stats.speedLoss.points.length,
    slip: stats.slip.points.length,
    sfoc: stats.sfoc.points.length,
    excess_foc: stats.excessFoc.points.length,
  };
  const confidenceOf = (key) => {
    const { corroborator, derived, reset } = DIAGNOSTIC_EVIDENCE[key];
    const n = nByKey[key];
    const daysSinceReset = reset == null ? null : latest.value?.[reset] ?? null;

    // Too few measured days, or too soon after the reset this signal is measured against.
    if (n < CONFIDENCE_MIN_POINTS) return { level: 'low', basis: `僅 ${n} 個有效樣本` };
    if (daysSinceReset != null && daysSinceReset < CONFIDENCE_MIN_DAYS_SINCE_RESET) {
      return { level: 'low', basis: `距上次重置僅 ${daysSinceReset} 天，尚無足夠歷史` };
    }
    // A signal derived from another cannot corroborate it, so it never reaches high confidence.
    if (derived) return { level: 'medium', basis: `${n} 個樣本 · 由速度損失導出，非獨立訊號` };

    const agrees = corroborator != null && levelByKey[corroborator] !== 'low';
    if (n >= CONFIDENCE_HIGH_POINTS && agrees) {
      return { level: 'high', basis: `${n} 個樣本 · 獨立訊號（${metricTitle(corroborator)}）一致` };
    }
    return {
      level: 'medium',
      basis: agrees ? `${n} 個樣本` : `${n} 個樣本 · 無獨立訊號佐證`,
    };
  };

  return [
    {
      key: 'speed_loss',
      // NOT "hull". speed_loss_pct is the COMBINED hull-plus-propeller effect — ISO 19030
      // provides no method to split them, so a tile calling it the hull is a claim the
      // standard explicitly declines to make.
      title: '船體＋螺槳／速度損失',
      icon: metricIcon('speed_loss'),
      level: hullLevel,
      score: Math.max(slTrailing.value ?? 0, speedLossAnomalies * 4),
      highThreshold: DIAGNOSTIC_HIGH.speedLoss,
      value: slTrailing.value == null ? '–' : `${slTrailing.value.toFixed(1)}%`,
      label: '速度損失',
      detail: `近 ${DIAGNOSTIC_ALERT_WINDOW_DAYS} 天 ${speedLossAnomalies} 件異常`,
      summary: `速度損失 ${slTrailing.value == null ? '–' : `${slTrailing.value.toFixed(1)}%`}，近 ${DIAGNOSTIC_ALERT_WINDOW_DAYS} 天 ${speedLossAnomalies} 件異常`,
    },
    {
      key: 'slip',
      title: '螺旋槳滑失',
      icon: metricIcon('slip'),
      level: propellerLevel,
      score: Math.max(slipDelta ?? 0, slipAnomalies * 4),
      highThreshold: DIAGNOSTIC_HIGH.slip,
      value: fmtIndexDelta(stats.slip.latestIndex),
      label: '滑失 vs 基準',
      detail: `目前 ${fmtMetricRaw('slip', stats.slip.latestValue)} · 近 ${DIAGNOSTIC_ALERT_WINDOW_DAYS} 天 ${slipAnomalies} 件異常`,
      summary: `滑失 ${fmtIndexDelta(stats.slip.latestIndex)}，近 ${DIAGNOSTIC_ALERT_WINDOW_DAYS} 天 ${slipAnomalies} 件異常`,
    },
    {
      key: 'sfoc',
      title: '主機油耗 (SFOC)',
      icon: metricIcon('sfoc'),
      level: engineLevel,
      score: Math.max(sfocDelta ?? 0, sfocAnomalies * 4),
      highThreshold: DIAGNOSTIC_HIGH.sfoc,
      value: fmtIndexDelta(stats.sfoc.latestIndex),
      label: 'SFOC vs 基準',
      detail: `目前 ${fmtMetricRaw('sfoc', stats.sfoc.latestValue)}`,
      summary: `SFOC ${fmtIndexDelta(stats.sfoc.latestIndex)}，目前 ${fmtMetricRaw('sfoc', stats.sfoc.latestValue)}`,
    },
    {
      key: 'excess_foc',
      title: '超額油耗',
      icon: metricIcon('excess_foc'),
      level: excessLevel,
      score: Math.max(excessDelta ?? 0, excessAnomalies * 4),
      highThreshold: DIAGNOSTIC_HIGH.excessFoc,
      value: fmtIndexDelta(stats.excessFoc.trailingIndex),
      label: '超額油耗 vs 基準',
      detail: `近 30 天平均 ${fmtMetricRaw('excess_foc', stats.excessFoc.trailingValue)} · 近 ${DIAGNOSTIC_ALERT_WINDOW_DAYS} 天 ${excessAnomalies} 件異常`,
      summary: `超額油耗 ${fmtIndexDelta(stats.excessFoc.trailingIndex)}（近 30 天平均），近 ${DIAGNOSTIC_ALERT_WINDOW_DAYS} 天 ${excessAnomalies} 件異常`,
    },
  ].map((item) => {
    const confidence = confidenceOf(item.key);
    return {
      ...item,
      color: diagnosticColor(item.level),
      status: diagnosticStatus(item.level),
      confidence: confidence.level,
      confidenceLabel: CONFIDENCE_LABEL[confidence.level],
      confidenceColor: CONFIDENCE_COLOR[confidence.level],
      confidenceBasis: confidence.basis,
    };
  });
});
// Severity first, then how far past its own "high" bar the metric sits. The raw scores are not
// comparable across metrics — a 5.5% speed loss (low) and a +5.2% SFOC (high) are different
// units with different bars — so ranking on score alone can crown a `low` item over a `high` one
// and make the summary below claim "no deviation" while a tile beside it reads 需優先確認.
const DIAGNOSTIC_LEVEL_RANK = { high: 2, medium: 1, low: 0 };
const dominantDiagnostic = computed(() => {
  const [top] = [...causeDiagnostics.value].sort((a, b) =>
    (DIAGNOSTIC_LEVEL_RANK[b.level] - DIAGNOSTIC_LEVEL_RANK[a.level])
    || (b.score / b.highThreshold - a.score / a.highThreshold));
  return top ?? null;
});
const causeDiagnosticSummary = computed(() => {
  const item = dominantDiagnostic.value;
  if (!item || causeDiagnostics.value.every(d => d.level === 'low')) return '目前診斷訊號未顯示明顯偏離基準。';
  return `目前較明顯的證據集中在${item.title}：${item.summary}`;
});
const metricExtent = (stats) => {
  const values = stats.flatMap(stat => stat.points.map(p => p.value)).filter(v => v != null).sort((a, b) => a - b);
  if (!values.length) return {};
  const min = quantileSorted(values, 0.01);
  const max = quantileSorted(values, 0.99);
  if (min !== max) return { min, max };

  const pad = Math.abs(min) * 0.05 || 1;
  return { min: min - pad, max: max + pad };
};
const metricRawData = (stat, extent) => stat.points
  .map((p) => {
    const index = toBaselineIndex(p.value, stat.baseline);
    // Slot 0 is the chart coordinate, so it converts; slots 2-4 stay raw for the tooltip to read.
    return p.value == null
      ? null
      : { value: [fleetUtils.dayToMs(p.day), clamp(p.value, extent.min, extent.max), p.value, stat.baseline, index] };
  })
  .filter(Boolean);
const diagnosticLineSeries = ({ color, extent, gridIndex, key, name, stat }) => ({
  name,
  type: 'line',
  xAxisIndex: gridIndex,
  yAxisIndex: gridIndex,
  smooth: true,
  showSymbol: false,
  symbol: 'none',
  lineStyle: { color, width: 0.8 },
  itemStyle: { color },
  data: metricRawData(stat, extent).map(d => ({ ...d, diagnosticKey: key })),
});
const causeDiagnosticsOption = computed(() => {
  const stats = diagnosticStats.value;
  const extents = [
    metricExtent([stats.speedLoss]),
    metricExtent([stats.slip]),
    metricExtent([stats.sfoc]),
    metricExtent([stats.excessFoc]),
  ];
  const series = [
    diagnosticLineSeries({ name: '速度損失', key: 'speed_loss', color: FleetChartConstant.SpeedLossColor, extent: extents[0], gridIndex: 0, stat: stats.speedLoss }),
    diagnosticLineSeries({ name: '滑失', key: 'slip', color: FleetChartConstant.CategoricalPalette[1], extent: extents[1], gridIndex: 1, stat: stats.slip }),
    diagnosticLineSeries({ name: 'SFOC', key: 'sfoc', color: FleetChartConstant.CategoricalPalette[4], extent: extents[2], gridIndex: 2, stat: stats.sfoc }),
    diagnosticLineSeries({ name: '超額油耗', key: 'excess_foc', color: FleetChartConstant.CategoricalPalette[2], extent: extents[3], gridIndex: 3, stat: stats.excessFoc }),
  ];

  if (!series.some(s => s.data.length)) return {};

  const xMin = fleetUtils.dayToMs(diagnosticRows.value.at(0)?.day);
  const xMax = fleetUtils.dayToMs(diagnosticRows.value.at(-1)?.day);

  return {
    grid: DIAGNOSTIC_GRIDS.map(g => ({ left: 86, right: 24, top: g.top, height: g.height })),
    legend: {
      top: 10, left: 'center', itemGap: 16, itemWidth: 20, itemHeight: 10,
      textStyle: { fontSize: 11 },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      formatter: (params) => {
        const list = Array.isArray(params) ? params : [params];
        const ts = list[0]?.value?.[0];
        const rows = list
          .filter(p => Array.isArray(p.value))
          .map((p) => {
            const raw = fmtMetricRaw(p.data?.diagnosticKey, p.value[2]);
            const delta = fmtIndexDelta(p.value[4]);
            return `${p.marker}${p.seriesName}: ${raw}（vs 基準 ${delta}）`;
          })
          .join('<br/>');
        return `${fleetUtils.dayLabel(fleetUtils.msToDay(ts)) ?? ''}<br/>${rows}`;
      },
    },
    axisPointer: { link: [{ xAxisIndex: [0, 1, 2, 3] }] },
    xAxis: DIAGNOSTIC_GRIDS.map((_, i) => ({
      type: 'time',
      gridIndex: i,
      min: xMin,
      max: xMax,
      axisLabel: { show: i === DIAGNOSTIC_GRIDS.length - 1 },
      axisTick: { show: i === DIAGNOSTIC_GRIDS.length - 1 },
      splitLine: { show: false },
    })),
    yAxis: DIAGNOSTIC_GRIDS.map((g, i) => ({
      type: 'value',
      gridIndex: i,
      name: g.name,
      nameLocation: 'middle',
      nameGap: 50,
      min: extents[i].min,
      max: extents[i].max,
      scale: true,
      splitNumber: 3,
      axisLabel: { formatter: value => fmtAxisLabel(value, g.decimals) },
    })),
    series,
  };
});

// --- Alert feed (newest first, paged) ---
// Sorting stays on the raw day index — it is the same order as the dates the rows render, and it
// needs no conversion. This just paginates every alert, newest last-seen-day first.
const sortedAlerts = computed(() =>
  [...(alerts.value ?? [])].sort((a, b) => (b.last_seen_day ?? 0) - (a.last_seen_day ?? 0)),
);
const ALERT_PAGE_SIZE = 10;
const alertPage = ref(1);
const alertPageCount = computed(() => Math.max(1, Math.ceil(sortedAlerts.value.length / ALERT_PAGE_SIZE)));
const pagedAlerts = computed(() =>
  sortedAlerts.value.slice((alertPage.value - 1) * ALERT_PAGE_SIZE, alertPage.value * ALERT_PAGE_SIZE),
);
watch(alertPageCount, (n) => {
  if (alertPage.value > n) alertPage.value = n;
});
</script>

<template>
  <div class="d-flex flex-column ga-4">
    <!-- Header: identity + data coverage on the left, the two headline stats
         (speed loss + CII) as prominent KPI tiles on the right. -->
    <div class="header-grid">
      <div>
        <DashboardVesselSelector
          v-model="shipId"
          :items="props.vesselOptions"
          :vessel="props.vessel"
        />
        <div class="specs-grid mt-3">
          <div
            v-for="s in specs"
            :key="s.label"
          >
            <div class="d-flex align-center ga-1 text-caption text-medium-emphasis">
              <span>{{ s.label }}</span>
              <AppInputTooltip
                v-if="s.tooltip"
                :text="s.tooltip"
              />
            </div>
            <div class="text-body-2 font-weight-medium">
              {{ s.value }}
            </div>
          </div>
        </div>
      </div>

      <div class="stat-tiles">
        <DashboardKpiCard
          label="Speed loss"
          :tooltip="T.speedLoss"
          :value="slTrailing == null ? '–' : `${slTrailing.toFixed(1)}%`"
          :value-color="slColor"
        >
          <div class="d-flex align-center ga-2 mt-1">
            <v-chip
              size="x-small"
              variant="tonal"
              :color="deltaColor(slDeltaSign)"
              class="px-2"
            >
              <span :class="deltaTextClass(slDeltaSign)">
                <template v-if="deltaArrow(slDeltaSign)">{{ deltaArrow(slDeltaSign) }} </template>{{ fmtMag(slDelta) }}
              </span>
            </v-chip>
            <span class="text-caption text-medium-emphasis">vs prev 30d</span>
          </div>
        </DashboardKpiCard>
        <!-- cii_rating_imo, NOT cii_rating_aer: the tooltip promises the regulatory grade
             (scored against the year's reduced required line) and every other CII surface in
             the dashboard uses it. aer scores against the un-reduced 2019 base line, which
             flatters the ship — S1 on 2026-06-30 is an 'A' by aer and a 'B' by imo. -->
        <DashboardKpiCard
          label="CII"
          :tooltip="T.cii"
          :value="latest?.cii_rating_imo || '–'"
          :value-color="latest?.cii_rating_imo ? ciiColor(latest.cii_rating_imo) : ''"
        >
          <div class="text-caption text-medium-emphasis mt-1">
            {{ `AER ${fmtNum(latest?.cii_aer, 2)}` }}
          </div>
        </DashboardKpiCard>
      </div>
    </div>

    <!-- Alerts feed -->
    <UsageResultCardFrame
      :title="FleetGlossaryConstant.Title.alerts"
      :tooltip="T.alertsFeed"
    >
      <UsageResultCard>
        <div class="alert-card">
          <div class="alert-header pa-3 d-flex flex-wrap align-center justify-end ga-3">
            <div class="text-caption text-medium-emphasis">
              {{ sortedAlerts.length }} total
            </div>
          </div>
          <div class="alert-body">
            <template v-if="pagedAlerts.length">
              <div
                v-for="a in pagedAlerts"
                :key="a.alert_id"
                class="d-flex ga-2 pa-3 alert-row"
              >
                <v-icon
                  :icon="metricIcon(a.driver_metric)"
                  size="20"
                  class="mt-1 text-medium-emphasis"
                />
                <div class="flex-grow-1">
                  <div class="d-flex flex-wrap align-center ga-2">
                    <span class="text-body-2 font-weight-medium">{{ metricTitle(a.driver_metric) }}</span>
                    <AppChip
                      variant="outlined"
                      :text="SEVERITY_LABEL[a.severity] || a.severity"
                      :color="severityColor(a.severity)"
                    />
                    <span class="text-caption text-medium-emphasis">{{ fleetUtils.dayRangeLabel(a.opened_day, a.last_seen_day) ?? '–' }}</span>
                  </div>
                  <div class="text-caption mt-1">
                    {{ a.message_zh }}
                  </div>
                </div>
              </div>
            </template>
            <div
              v-else
              class="text-body-2 text-medium-emphasis pa-4 text-center"
            >
              無預警
            </div>
          </div>
        </div>
        <div
          v-if="alertPageCount > 1"
          class="d-flex justify-center mt-2"
        >
          <v-pagination
            v-model="alertPage"
            :length="alertPageCount"
            density="comfortable"
            :total-visible="5"
          />
        </div>
      </UsageResultCard>
    </UsageResultCardFrame>

    <!-- Speed-loss trend (main visual) -->
    <UsageResultCardFrame
      :title="FleetGlossaryConstant.Title.vesselSpeedLossTrend"
      :tooltip="T.vesselSpeedLossTrend"
    >
      <UsageResultCard>
        <AppEChart
          :option="speedLossTrendOption"
          :height="320"
        />
        <div class="diagnostic-panel mt-4">
          <div class="diagnostic-lead pa-3 d-flex flex-wrap align-center ga-3">
            <v-icon
              icon="mdi-filter-remove-outline"
              size="20"
              class="text-medium-emphasis"
            />
            <div class="text-body-2 font-weight-medium flex-grow-1">
              {{ rejectionSummary }}
            </div>
            <v-btn
              v-if="rejectionBreakdown.length"
              variant="text"
              size="small"
              class="flex-shrink-0"
              :append-icon="rejectionExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
              @click="rejectionExpanded = !rejectionExpanded"
            >
              {{ rejectionExpanded ? '收合' : `依原因分類（${rejectionBreakdown.length}）` }}
            </v-btn>
          </div>

          <AppTable
            v-if="rejectionBreakdown.length && rejectionExpanded"
            :headers="rejectionHeaders"
            :items="rejectionBreakdown"
            item-value="reason"
            :server-side="false"
            :enable-search="false"
            :show-pagination="false"
            bordered
            density="compact"
            hide-details
          >
            <template #item.pct="{ item }">
              {{ item.pct.toFixed(1) }}%
            </template>
          </AppTable>
        </div>
      </UsageResultCard>
    </UsageResultCardFrame>

    <!-- Excess fuel cost: total broken into its three drivers (fouling / weather / operational) -->
    <UsageResultCardFrame
      :title="FleetGlossaryConstant.Title.excessCost"
      :tooltip="T.excessCost"
    >
      <UsageResultCard>
        <div class="diagnostic-panel">
          <div class="diagnostic-lead pa-3 d-flex flex-wrap align-center ga-3">
            <v-icon
              icon="mdi-cash-multiple"
              size="20"
              class="text-medium-emphasis"
            />
            <div class="text-body-2 font-weight-medium flex-grow-1">
              {{ costSummary }}
            </div>
          </div>

          <div class="cost-grid">
            <div
              v-for="tile in costTiles"
              :key="tile.key"
              class="diagnostic-tile"
            >
              <div class="d-flex align-center ga-2">
                <span
                  class="cost-swatch"
                  :style="{ backgroundColor: tile.color }"
                />
                <span class="text-body-2 font-weight-medium text-truncate">{{ tile.title }}</span>
              </div>
              <div class="d-flex align-baseline ga-2 mt-2">
                <span
                  class="diagnostic-value"
                  :style="{ color: tile.color }"
                >{{ tile.value }}</span>
                <span class="text-body-2 font-weight-medium text-medium-emphasis">{{ tile.share }}%</span>
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                {{ tile.sub }}
              </div>
            </div>
          </div>

          <AppEChart
            :option="excessCostOption"
            :height="300"
          />
        </div>
      </UsageResultCard>
    </UsageResultCardFrame>

    <!-- CII AER / IMO value trend with rating markers -->
    <UsageResultCardFrame
      :title="FleetGlossaryConstant.Title.vesselCiiTrend"
      :tooltip="T.ciiTrend"
    >
      <UsageResultCard>
        <div class="diagnostic-panel">
          <div class="diagnostic-lead pa-3 d-flex flex-wrap align-center ga-3">
            <v-icon
              icon="mdi-leaf"
              size="20"
              class="text-medium-emphasis"
            />
            <div class="text-body-2 font-weight-medium flex-grow-1">
              {{ ciiTrendSummary }}
            </div>
          </div>

          <AppEChart
            :option="ciiTrendOption"
            :height="260"
          />
        </div>
      </UsageResultCard>
    </UsageResultCardFrame>

    <!-- Cause diagnostics: summary evidence + one shared-time-axis chart -->
    <UsageResultCardFrame
      :title="FleetGlossaryConstant.Title.causeDiagnostics"
      :tooltip="T.causeDiagnostics"
    >
      <UsageResultCard>
        <div class="diagnostic-panel">
          <!-- ISO 19030 measures the COMBINED hull+propeller change and provides no method to
               separate them. Everything below is an inference layer on top of ISO, and the
               standard is explicit that it must be labelled as one, carry a confidence level,
               and never be quoted as a direct ISO output — it lands in contractual disputes
               between owners and charterers (doc/iso-19030.md:83-89). Hence the banner, the
               dashed border, and the per-tile confidence chips. -->
          <div class="inference-banner pa-3 d-flex flex-wrap align-center ga-2">
            <v-chip
              size="x-small"
              variant="flat"
              color="secondary"
              class="flex-shrink-0"
            >
              推論層
            </v-chip>
            <div class="text-caption text-medium-emphasis flex-grow-1">
              ISO 19030 量測的是船體與螺槳的<strong>合併</strong>效應，本身不提供拆分兩者的方法。以下為在 ISO 之上疊加的推論，非 ISO 19030 的直接輸出，每格附信心水準。
            </div>
          </div>

          <div class="diagnostic-lead pa-3 d-flex flex-wrap align-center ga-3">
            <v-icon
              v-if="dominantDiagnostic"
              :icon="dominantDiagnostic.icon"
              size="20"
              class="text-medium-emphasis"
            />
            <div class="text-body-2 font-weight-medium flex-grow-1">
              {{ causeDiagnosticSummary }}
            </div>
            <v-chip
              v-if="dominantDiagnostic"
              size="x-small"
              variant="outlined"
              :color="dominantDiagnostic.color"
            >
              {{ dominantDiagnostic.status }}
            </v-chip>
          </div>

          <div class="diagnostic-grid">
            <div
              v-for="item in causeDiagnostics"
              :key="item.key"
              class="diagnostic-tile"
            >
              <div class="d-flex align-start justify-space-between ga-3">
                <div class="d-flex align-center ga-2 min-w-0">
                  <v-icon
                    :icon="item.icon"
                    size="18"
                    class="text-medium-emphasis flex-shrink-0"
                  />
                  <div class="text-body-2 font-weight-medium text-truncate">
                    {{ item.title }}
                  </div>
                </div>
                <v-chip
                  size="x-small"
                  variant="outlined"
                  :color="item.color"
                  class="flex-shrink-0"
                >
                  {{ item.status }}
                </v-chip>
              </div>
              <div class="diagnostic-value mt-3">
                {{ item.value }}
              </div>
              <div class="text-caption">
                {{ item.label }}
              </div>
              <div class="diagnostic-detail text-caption text-medium-emphasis mt-2">
                {{ item.detail }}
              </div>
              <div class="d-flex align-center ga-2 mt-2">
                <v-chip
                  size="x-small"
                  variant="tonal"
                  :color="item.confidenceColor"
                  class="flex-shrink-0"
                >
                  {{ item.confidenceLabel }}
                </v-chip>
                <span class="text-caption text-medium-emphasis text-truncate">{{ item.confidenceBasis }}</span>
              </div>
            </div>
          </div>

          <AppEChart
            :option="causeDiagnosticsOption"
            :height="420"
          />
        </div>
      </UsageResultCard>
    </UsageResultCardFrame>

    <!-- Speed–power scatter + anomaly episode timeline -->
    <div class="pair-grid">
      <UsageResultCardFrame
        :title="FleetGlossaryConstant.Title.speedPower"
        :tooltip="T.speedPowerScatter"
      >
        <UsageResultCard>
          <AppEChart
            :option="speedPowerOption"
            :height="300"
          />
        </UsageResultCard>
      </UsageResultCardFrame>

      <UsageResultCardFrame
        :title="FleetGlossaryConstant.Title.anomalyTimeline"
        :tooltip="T.anomalyTimeline"
      >
        <UsageResultCard>
          <AppEChart
            :option="anomalyTimelineOption"
            :height="300"
          />
        </UsageResultCard>
      </UsageResultCardFrame>
    </div>

    <!-- Underwater inspection: physical ground-truth backing the diagnostics + recommendations -->
    <UsageResultCardFrame
      :title="FleetGlossaryConstant.Title.uwiInspection"
      :tooltip="T.uwiInspection"
    >
      <UsageResultCard>
        <div class="diagnostic-panel">
          <div class="diagnostic-lead pa-3 d-flex flex-wrap align-center ga-3">
            <v-icon
              icon="mdi-diving-scuba"
              size="20"
              class="text-medium-emphasis"
            />
            <div class="text-body-2 font-weight-medium flex-grow-1">
              {{ uwiSummary }}
            </div>
            <v-btn
              v-if="uwiRows.length"
              variant="text"
              size="small"
              class="flex-shrink-0"
              :append-icon="uwiExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
              @click="uwiExpanded = !uwiExpanded"
            >
              {{ uwiExpanded ? '收合' : `歷史紀錄（${uwiRows.length}）` }}
            </v-btn>
          </div>

          <AppTable
            v-if="uwiRows.length && uwiExpanded"
            :headers="uwiHeaders"
            :items="uwiRows"
            item-value="inspection_date"
            :server-side="false"
            :enable-search="false"
            :show-pagination="false"
            bordered
            density="compact"
            hide-details
          >
            <template #item.inspection_type="{ item }">
              {{ UWI_TYPE_ZH[item.inspection_type] || item.inspection_type }}
            </template>
            <template #item.hull_fouling_rating="{ item }">
              <span class="text-no-wrap">
                <span :class="textClass(foulColor(item.hull_fouling_rating))">{{ Math.round(item.hull_fouling_rating) }}/100</span>
                <span class="text-medium-emphasis"> · {{ Math.round(item.hull_fouling_coverage_pct) }}%</span>
              </span>
            </template>
            <template #item.propeller_condition="{ item }">
              <span class="text-no-wrap">
                <span :class="textClass(condColor(item.propeller_condition))">{{ condLabel(item.propeller_condition) }}</span>
                <span class="text-medium-emphasis"> · {{ Math.round(item.propeller_roughness_um) }}µm</span>
              </span>
            </template>
            <template #item.coating_breakdown_pct="{ item }">
              <span class="text-no-wrap">
                <span :class="textClass(condColor(item.hull_coating_condition))">{{ Math.round(item.coating_breakdown_pct) }}%</span>
                <span class="text-medium-emphasis"> · {{ condLabel(item.hull_coating_condition) }}</span>
              </span>
            </template>
            <template #item.recommended_action="{ item }">
              <v-chip
                size="x-small"
                variant="outlined"
                :color="UWI_ACTION[item.recommended_action]?.color"
              >
                {{ UWI_ACTION[item.recommended_action]?.label || item.recommended_action }}
              </v-chip>
            </template>
          </AppTable>
        </div>
      </UsageResultCard>
    </UsageResultCardFrame>

    <!-- Recommended actions: the decision — what to do, by when -->
    <UsageResultCardFrame
      :title="FleetGlossaryConstant.Title.maintenanceRec"
      :tooltip="T.maintenanceRec"
    >
      <UsageResultCard>
        <div class="diagnostic-panel">
          <div class="diagnostic-lead pa-3 d-flex flex-wrap align-center ga-3">
            <v-icon
              icon="mdi-clipboard-check-outline"
              size="20"
              class="text-medium-emphasis"
            />
            <div class="text-body-2 font-weight-medium flex-grow-1">
              {{ maintenanceSummary }}
            </div>
          </div>

          <div
            v-if="maintenanceRecommendations.length"
            class="alert-card"
          >
            <div class="alert-body">
              <div
                v-for="r in maintenanceRecommendations"
                :key="r.key"
                class="d-flex ga-2 pa-3 alert-row"
              >
                <v-icon
                  :icon="r.icon"
                  size="20"
                  class="mt-1 text-medium-emphasis"
                />
                <div class="flex-grow-1">
                  <div class="d-flex flex-wrap align-center ga-2">
                    <span class="text-body-2 font-weight-medium">{{ r.title }}</span>
                    <v-chip
                      size="x-small"
                      variant="outlined"
                      :color="r.priorityColor"
                    >
                      {{ r.priority }}
                    </v-chip>
                    <span
                      v-if="r.dueDay != null"
                      class="text-caption text-medium-emphasis"
                    >
                      建議於 {{ fleetUtils.dayDate(r.dueDay) }} 前處理（{{ fleetUtils.relativeDay(r.dueDay) }}）
                    </span>
                    <span
                      v-if="r.netSaving != null"
                      class="text-caption text-success font-weight-medium"
                    >
                      淨節省 {{ fmtUsd(r.netSaving) }}
                    </span>
                  </div>
                  <div
                    v-if="r.metric"
                    class="text-caption mt-1"
                  >
                    {{ r.metric }}
                  </div>
                  <div class="text-caption text-medium-emphasis mt-1">
                    {{ r.rationale }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UsageResultCard>
    </UsageResultCardFrame>
  </div>
</template>

<style lang="scss" scoped>
.header-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;
  align-items: start;

  @media (min-width: 960px) {
    // Basic info takes the remaining width; the two headline stats sit in a fixed column.
    grid-template-columns: 1fr 360px;
  }
}

.specs-grid {
  display: grid;
  gap: 8px 24px;
  grid-template-columns: repeat(2, 1fr);

  @media (min-width: 600px) {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-tiles {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, 1fr);
}

// Mirror AppTable: outer inputBorder frame (radius 4px), header cells on the base
// background, body rows on backgroundScale2, hairline separators between rows.
.alert-card {
  border: 1px solid rgba(var(--v-theme-inputBorder));
  border-radius: 4px;
  overflow: hidden;
}

.alert-header {
  background-color: rgba(var(--v-theme-background));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity, 0.12));
}

.alert-body {
  background-color: rgba(var(--v-theme-backgroundScale2));
}

.alert-row + .alert-row {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity, 0.12));
}

.diagnostic-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

// Dashed border, not the solid one every other card uses: this panel is an inference layer,
// not a measurement, and it has to be visually distinct from the ISO speed-loss chart above it.
.inference-banner {
  border: 1px dashed rgba(var(--v-theme-inputBorder));
  border-radius: 4px;
  background-color: rgba(var(--v-theme-backgroundScale1));
}

.diagnostic-lead {
  border: 1px solid rgba(var(--v-theme-inputBorder));
  border-radius: 4px;
  background-color: rgba(var(--v-theme-backgroundScale1));
}

.diagnostic-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr;

  @media (min-width: 700px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1280px) {
    grid-template-columns: repeat(4, 1fr);
  }
}

.diagnostic-tile {
  min-width: 0;
  padding: 12px;
  border-radius: 4px;
  background-color: rgba(var(--v-theme-backgroundScale2));
}

.diagnostic-value {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}

.diagnostic-detail {
  min-height: 34px;
}

.cost-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr;

  @media (min-width: 700px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.cost-swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.min-w-0 {
  min-width: 0;
}

.pair-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;

  @media (min-width: 1280px) {
    grid-template-columns: 1fr 1fr;
  }
}

</style>
