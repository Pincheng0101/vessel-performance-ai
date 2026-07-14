<script setup>
// Per-vessel deep-dive detail (up to cause diagnostics): header (coverage + speed-loss gauge +
// CII), the alert feed, the speed-loss trend main visual, and the speed–power scatter +
// anomaly timeline pair. Keyed by ship_id in the parent, so it fully reloads per vessel.
//
// v2 has no cost, CII, or UWI-detail data (see doc/api_v2.md §4). Sections that need those stay
// on v1, sourced from `fallbackImo` — a stable (but not physically corresponding) v1 vessel for
// the currently selected v2 ship, since the two rosters don't overlap (see
// useDashboardVesselSelection). Everything else here uses v2, keyed by `shipId`.
import { FleetChartConstant, FleetGlossaryConstant } from '~/constants';

const props = defineProps({
  vessel: {
    type: Object,
    default: () => ({}),
  },
  vesselOptions: {
    type: Array,
    default: () => [],
  },
  fallbackImo: {
    type: [String, Number],
    default: null,
  },
});

const shipId = defineModel('shipId', {
  type: String,
  default: null,
});

const server = useServer();
const { themeColors } = useCustomTheme();
const T = FleetGlossaryConstant.Term;
const THRESHOLD = FleetChartConstant.SpeedLossThreshold;

const fmtNum = (v, d = 1) => (v == null ? '–' : v.toFixed(d));
const fmtUsd = v => (v == null ? '–' : `$${Math.round(v).toLocaleString()}`);
const ciiColor = c => FleetChartConstant.CiiColor[c] || FleetChartConstant.FallbackColor;

// Floors the Suspense fallback at 1s — without it, a cache-warm reload (or switching back to
// an already-fetched vessel) can resolve fast enough that the loading illustration flashes
// for a single frame.
const [fetched] = await Promise.all([
  Promise.all([
    server.datalake.v2VesselMetrics({ shipId: shipId.value }, { lazy: false }),
    server.datalake.v2VesselSpeedLoss({ shipId: shipId.value }, { lazy: false }),
    server.datalake.v2VesselSpeedPower({ shipId: shipId.value }, { lazy: false }),
    server.datalake.v2VesselAlerts({ shipId: shipId.value }, { lazy: false }),
    server.datalake.v2VesselAnomalies({ shipId: shipId.value }, { lazy: false }),
    server.datalake.v2VesselMaintenanceEffect({ shipId: shipId.value }, { lazy: false }),
    server.datalake.v2VesselMaintenanceRecommendation({ shipId: shipId.value }, { lazy: false }),
    server.datalake.v1VesselMetrics({ imoNumber: props.fallbackImo }, { lazy: false }),
    server.datalake.v1VesselUwi({ imoNumber: props.fallbackImo }, { lazy: false }),
  ]),
  delay(1000),
]);
const [
  { data: metrics },
  { data: speedLoss },
  { data: speedPower },
  { data: alerts },
  { data: anomalies },
  { data: events },
  { data: maintRecs },
  { data: v1Metrics },
  { data: uwi },
] = fetched;

// The hull_cleaning recommendation row (if any) carries the same trigger/rate fields v1's
// vesselRecommendation used for the trend chart's prediction line.
const rec = computed(() => (maintRecs.value ?? []).find(r => r.action_type === 'hull_cleaning') ?? {});
// Latest condition = the newest valid speed-loss row (fallback to the newest row).
const latest = computed(() => {
  const rows = speedLoss.value ?? [];
  return [...rows].reverse().find(r => r.valid_flag) ?? rows.at(-1) ?? {};
});
// CII has no v2 source at all — read from the v1 fallback vessel's latest valid metrics row.
const v1Latest = computed(() => {
  const rows = v1Metrics.value ?? [];
  return [...rows].reverse().find(r => r.valid_flag) ?? rows.at(-1) ?? {};
});

// --- Header: data coverage (v2 has no vessel particulars — dimensions/build year/dry-dock date
// are v1-only fields that don't exist for the real ships at all) ---
const specs = computed(() => {
  const v = props.vessel;
  const kind = /^S2[1-3]$/.test(v.ship_id || '') ? '預測船' : '訓練船';
  return [
    { label: 'Type', value: kind },
    { label: 'Data range', value: v.first_day == null ? '–' : `第 ${v.first_day}–${v.last_day} 天` },
    { label: 'Rows', value: v.n_rows == null ? '–' : v.n_rows.toLocaleString() },
    { label: 'Predict cells', value: v.n_predict == null ? '–' : v.n_predict.toLocaleString() },
    { label: 'Masked cells', value: v.n_masked == null ? '–' : v.n_masked.toLocaleString() },
  ];
});

// --- Speed-loss value + 30-day delta (header) ---
// Latest value colored by threshold band, plus a current-vs-previous 30-day delta chip
// (Executive style). Speed loss is up-bad, so a rising delta reads red / ↑.
const slLatest = computed(() => latest.value?.speed_loss_pct ?? null);
const slColor = computed(() => {
  const v = slLatest.value;
  if (v == null) return FleetChartConstant.FallbackColor;
  if (v < 6) return FleetChartConstant.SemanticRamp.good;
  if (v < THRESHOLD) return FleetChartConstant.SemanticRamp.warning;
  return FleetChartConstant.SemanticRamp.critical;
});
const mean = arr => (arr.length ? arr.reduce((sum, v) => sum + v, 0) / arr.length : null);
const fmtMag = v => (v == null ? '–' : `${Math.abs(v).toFixed(1)}%`);
const slDelta = computed(() => {
  const vals = (speedLoss.value ?? []).filter(d => d.valid_flag && d.speed_loss_pct != null).map(d => d.speed_loss_pct);
  const cur = mean(vals.slice(-30));
  const prev = mean(vals.slice(-60, -30));
  return cur != null && prev != null ? cur - prev : null;
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

// Maintenance action code → Chinese label (for the trend event markers). vessel_maintenance_effect's
// event_type values (doc/api_v2.md §3.5): PP / UWI+PP / UWC / UWC+PP / DD / UWI.
const MAINT_ZH = {
  'PP': '螺旋槳拋光',
  'UWI': '水下檢查',
  'UWI+PP': '水下檢查＋拋光',
  'UWC': '水下清潔',
  'UWC+PP': '水下清潔＋拋光',
  'DD': '乾塢',
};
// Only used by the v1-fallback CII/cost sections below, which carry real calendar dates
// (report_date), unlike v2's relative-day fields.
const fmtDate = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// --- Speed-loss trend (main visual) ---
// v2's noon_utc/event_day/trigger_eta_day are already plain relative-day integers (no calendar
// dates in v2 — see doc/api_v2.md), so this axis is a day count, not a time axis.
const speedLossTrendOption = computed(() => {
  const pts = (speedLoss.value ?? [])
    .map(d => ({ day: d.noon_utc, sl: d.speed_loss_pct, valid: d.valid_flag, daysSinceCleaning: d.days_since_cleaning }))
    .filter(d => d.day != null && d.sl != null)
    .sort((a, b) => a.day - b.day);
  if (!pts.length) return {};

  // Floor negative outliers at the 1st percentile so they don't stretch the axis; the upper
  // tail (high speed loss) is the signal we want visible, so it stays intact.
  const floor = quantileSorted(pts.map(d => d.sl).sort((a, b) => a - b), 0.01);
  pts.forEach((d) => {
    d.sl = Math.max(d.sl, floor);
  });

  const valid = pts.filter(d => d.valid);
  const drawPts = valid.length ? valid : pts;
  const maxSl = Math.max(...pts.map(d => d.sl));

  // hull_cleaning recommendation row (rec, from useVesselMaintenanceRecommendation above) carries
  // the trigger/rate fields v1's vesselRecommendation used for the prediction line.
  const r = rec.value;
  const triggerDay = r.trigger_eta_day ?? null;
  // Last cleaning day = the latest valid row's day minus its own days_since_cleaning.
  const lastRow = valid.at(-1);
  const lastCleanDay = lastRow?.daysSinceCleaning == null ? null : lastRow.day - lastRow.daysSinceCleaning;

  // Theil-Sen fit over the segment since the last cleaning, plus a dashed extrapolation to
  // the predicted trigger day using the engineered fouling rate.
  const seg = (lastCleanDay == null ? valid : valid.filter(d => d.day >= lastCleanDay));
  const fit = theilSen(seg.map(d => ({ x: d.day, y: d.sl })));
  const fitSeries = [];
  if (fit && seg.length > 1) {
    const yAt = day => fit.slope * day + fit.intercept;
    const x0 = seg[0].day;
    const x1 = seg.at(-1).day;
    fitSeries.push({
      name: '趨勢', type: 'line', showSymbol: false, symbol: 'none', silent: true,
      lineStyle: { color: FleetChartConstant.SemanticRamp.warning, width: 1.8 },
      // Legend icon uses the series color (itemStyle), not lineStyle — set it so the icon
      // matches the amber line instead of falling back to the auto palette.
      itemStyle: { color: FleetChartConstant.SemanticRamp.warning },
      data: [[x0, yAt(x0)], [x1, yAt(x1)]],
    });
    if (triggerDay != null && r.rate_per_day != null) {
      const y1 = seg.at(-1).sl;
      const yEnd = y1 + r.rate_per_day * (triggerDay - x1);
      fitSeries.push({
        name: '預測', type: 'line', showSymbol: false, symbol: 'none', silent: true,
        lineStyle: { color: FleetChartConstant.SemanticRamp.warning, width: 1.8, type: [5, 4] },
        itemStyle: { color: FleetChartConstant.SemanticRamp.warning },
        data: [[x1, y1], [triggerDay, yEnd]],
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
    guides.push({ xAxis: day, lineStyle: { color: 'rgba(71, 85, 105, 0.3)', type: 'dashed', width: 1 } });
    const label = MAINT_ZH[e.event_type] || e.event_type;
    maintMarks.push({
      value: [day, yMax],
      tip: `${label} · 第 ${day} 天`,
    });
  });
  const triggerMarks = [];
  if (triggerDay != null) {
    guides.push({ xAxis: triggerDay, lineStyle: { color: 'rgba(190, 64, 55, 0.35)', type: 'dashed', width: 1 } }); // SemanticRamp.critical at 35% opacity
    triggerMarks.push({ value: [triggerDay, yMax], tip: `預測觸發 · 第 ${triggerDay} 天` });
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
          return `第 ${p.value[0]} 天 · 速度損失 ${p.value[1] == null ? '–' : `${(+p.value[1]).toFixed(1)}%`}`;
        }
        return '';
      },
    },
    xAxis: { type: 'value', name: 'day' },
    yAxis: { type: 'value', name: 'speed loss %', nameLocation: 'middle', nameGap: 36, min: yMin, max: yMax, axisLabel: { formatter: '{value}%' } },
    series: [
      {
        name: '速度損失', type: 'line', smooth: true, showSymbol: false,
        symbol: 'circle',
        lineStyle: { color: FleetChartConstant.SpeedLossColor, width: 1.5 },
        itemStyle: { color: FleetChartConstant.SpeedLossColor },
        data: drawPts.map(d => [d.day, d.sl]),
        markLine: {
          symbol: 'none', silent: true,
          // Guide lines carry no label (their meaning is the top marker); only the threshold
          // rule is labeled. markLine defaults label.show to true, so disable it at series level.
          label: { show: false },
          data: [
            { yAxis: THRESHOLD, lineStyle: { color: FleetChartConstant.SemanticRamp.critical, type: 'dashed', width: 1 }, label: { show: true, formatter: `threshold ${THRESHOLD}%`, position: 'insideStartTop', fontSize: 10, color: FleetChartConstant.SemanticRamp.critical } },
            ...guides,
          ],
        },
      },
      {
        // Invisible hit area (shares the legend name): near-transparent symbols over the line so
        // hovering anywhere near it fires an item tooltip. The visible 1.5px stroke is too thin
        // to hover, and `triggerLineEvent` fires zrender events without opening the tooltip. A
        // fully transparent fill is skipped by hit-testing, so opacity is a hair above zero.
        name: '速度損失', type: 'scatter', symbolSize: 22, z: 3,
        itemStyle: { color: FleetChartConstant.SpeedLossColor, opacity: 0.01 },
        emphasis: { disabled: true },
        data: drawPts.map(d => [d.day, d.sl]),
      },
      {
        name: '排除資料', type: 'scatter', symbolSize: 3, silent: true,
        itemStyle: { color: '#cbd5e1' },
        data: pts.filter(d => !d.valid).map(d => [d.day, d.sl]),
      },
      ...fitSeries,
      // One shape (▼) for all top markers; color carries the meaning (slate = performed, red = predicted).
      topMark('已執行維修', maintMarks, '#475569'),
      topMark('預測觸發', triggerMarks, FleetChartConstant.SemanticRamp.critical),
    ],
  };
});

// --- Excess fuel cost composition (fouling / weather / operational) ---
// The daily excess fuel cost — extra fuel burned vs a clean hull in calm water, × price — splits
// into three drivers that sum to the total: hull fouling (excess_cost_usd == excess_cost_fouling_usd),
// weather, and operational. This mirrors the PoC / executive tab, which report excess cost as a
// per-day figure (fleet_overview.total_excess_cost_usd); fouling is the largest and the only one a
// cleaning can reset, so it is the controllable lever.
const COST_PARTS = [
  { key: 'f', col: 'excess_cost_fouling_usd', title: '船體汙損', color: FleetChartConstant.CauseColor.hull_biofouling },
  { key: 'w', col: 'excess_cost_weather_usd', title: '天氣／海況', color: FleetChartConstant.CauseColor.weather },
  // Light warm neutral (not slate) so this reads as a plain "other" bucket. Lighter again
  // than the weather blue below it — the lightness step is what separates the bands, so it
  // needs to keep climbing layer over layer, not just differ in hue.
  { key: 'o', col: 'excess_cost_operational_usd', title: '操作', color: '#d6d3d1' },
];
const COST_AVG_WINDOW = 30;
// No v2 cost data at all (doc/api_v2.md §4) — sourced from the v1 fallback vessel.
const costDaily = computed(() =>
  (v1Metrics.value ?? [])
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
        return `${ts == null ? '' : fmtDate(ts)}<br/>${body}<br/>合計: ${fmtUsd(total)}/day`;
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
// No v2 CII data at all (doc/api_v2.md §4) — sourced from the v1 fallback vessel.
const ciiRows = computed(() =>
  (v1Metrics.value ?? [])
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
  return `最新一日 ${fmtDate(last.ts)}：AER ${fmtNum(last.cii_aer, 2)}（${last.cii_rating_aer || '–'} 級）、IMO ${fmtNum(last.cii_imo, 2)}（${last.cii_rating_imo || '–'} 級）—— ${risk}。`;
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
        return `${fmtDate(ts)}<br/>${body}`;
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
        triggerLineEvent: true,
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
// v2's vessel_maintenance_recommendation (doc/api_v2.md §3.11) is a trigger/ETA heuristic — no
// net saving or service-type window (no cost data in v2 at all), so those columns are dropped
// rather than backfilled from v1 (would misattribute a fallback vessel's dollar figure to this
// real ship's recommendation). The metric unit differs by action (speed-loss %, slip pp, SFOC %).
const MAINT_ACTION = {
  hull_cleaning: { title: '船體清潔', icon: 'mdi-spray-bottle', unit: '%' },
  propeller_polishing: { title: '螺旋槳拋光', icon: 'mdi-fan', unit: 'pp' },
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
  if (unit === 'pp') return `${v.toFixed(1)}pp`;
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
  return `共 ${list.length} 項維修建議 —— 最高優先：${top.title}（建議第 ${top.dueDay} 天前處理）。`;
});

// --- Underwater inspection (physical ground-truth for the fouling story) ---
// vessel_uwi is the diver/ROV inspection log: hull fouling rating (0–100) + coverage, propeller
// Rubert grade (A best → E worst) + roughness, coating breakdown + condition, and the recommended
// action. It corroborates the statistical diagnostics and backs the maintenance recommendations.
const UWI_TYPE_ZH = { diver: '潛水員', ROV: 'ROV', UWI: '水下檢查' };
const UWI_COND_ZH = { good: '良好', fair: '尚可', poor: '不佳' };
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
const foulColor = r => (r == null ? undefined : r < 30 ? 'success' : r < 60 ? 'warning' : 'error');
const propColor = c => (['A', 'B'].includes(c) ? 'success' : c === 'C' ? 'warning' : 'error');
const coatColor = c => ({ good: 'success', fair: 'warning', poor: 'error' }[c]);
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
  return `最新一次水下檢查（${r.inspection_date}）：船體汙損 ${Math.round(r.hull_fouling_rating)}/100、螺旋槳 ${r.propeller_condition} 級、塗層劣化 ${Math.round(r.coating_breakdown_pct)}%，建議${act}。`;
});
// History table stays collapsed by default — the latest inspection summary is enough at a glance.
const uwiExpanded = ref(false);

// --- Speed–power scatter ---
// Measured points bucketed by cleaning-cycle phase (discrete colors are easier to read than
// a continuous gradient): the point cloud marching up-left away from the clean reference over
// the cycle is the fouling story. v2's vessel_speed_power has no `series`/days_since_cleaning of
// its own (measured points only, no reference curve — doc/api_v2.md §3.4 says to fit a baseline
// from early-cycle points, which this skips rather than inventing a curve fit), so
// days_since_cleaning is joined in here from vessel_speed_loss by day.
const CLEAN_PHASES = [
  { label: '清潔後 0–75 天', color: FleetChartConstant.SemanticRamp.good, min: 0, max: 75 },
  { label: '75–150 天', color: FleetChartConstant.SemanticRamp.fair, min: 75, max: 150 },
  { label: '150–250 天', color: FleetChartConstant.SemanticRamp.warning, min: 150, max: 250 },
  { label: '≥ 250 天', color: FleetChartConstant.SemanticRamp.critical, min: 250, max: Infinity },
];
const daysSinceCleaningByDay = computed(() => Object.fromEntries(
  (speedLoss.value ?? []).map(d => [d.noon_utc, d.days_since_cleaning]),
));
const speedPowerOption = computed(() => {
  const rows = speedPower.value ?? [];
  const measured = rows
    .filter(d => d.speed_through_water != null && d.horse_power != null)
    .map(d => ({ ...d, daysSinceCleaning: daysSinceCleaningByDay.value[d.noon_utc] ?? null }));
  if (!measured.length) return {};

  const phaseSeries = CLEAN_PHASES.map(p => ({
    name: p.label,
    type: 'scatter',
    symbolSize: 5,
    itemStyle: { color: p.color, opacity: 0.8 },
    data: measured
      .filter(d => d.daysSinceCleaning != null && d.daysSinceCleaning >= p.min && d.daysSinceCleaning < p.max)
      .map(d => ({ value: [d.speed_through_water, d.horse_power], day: d.daysSinceCleaning })),
  }));
  // Points with no matching speed-loss row for that day (so no cleaning-cycle phase known).
  const unphased = measured.filter(d => d.daysSinceCleaning == null);

  return {
    grid: { left: 68, right: 24, top: 44, bottom: 48 },
    legend: { top: 12, left: 'center', itemGap: 14, textStyle: { fontSize: 11 } },
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        if (!Array.isArray(p.value)) return '';
        const [s, pw] = p.value;
        const day = p.data?.day;
        return `${s.toFixed(1)} kn · ${Math.round(pw).toLocaleString()} kW${day == null ? '' : ` · 距清潔 ${day} 天`}`;
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
        data: unphased.map(d => ({ value: [d.speed_through_water, d.horse_power], day: null })),
      },
    ],
  };
});

const severityColor = s => FleetChartConstant.SeverityColor[s] || FleetChartConstant.FallbackColor;
// v2's anomaly-triggering metric, standing in for v1's rule-based cause taxonomy (same mapping
// used in DashboardFleetAlerts.vue for consistency across the app).
const METRIC_ORDER = ['speed_loss_pct', 'sfoc', 'me_slip', 'total_consump'];
const METRIC_ZH = {
  speed_loss_pct: '速度損失',
  sfoc: '主機油耗 (SFOC)',
  me_slip: '螺槳滑失',
  total_consump: '總油耗',
};
const metricTitle = m => METRIC_ZH[m] || m;
const METRIC_ICON = {
  speed_loss_pct: 'mdi-speedometer-slow',
  sfoc: 'mdi-engine',
  me_slip: 'mdi-fan',
  total_consump: 'mdi-gas-station',
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
    style: api.style(),
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
      ...api.style(),
      stroke: '#ffffff',
      lineWidth: 0.6,
    },
  };
};
const anomalyTimelineOption = computed(() => {
  const episodes = (alerts.value ?? [])
    .map((d) => {
      if (d.opened_day == null || d.last_seen_day == null) return null;
      return {
        ...d,
        metric: d.metric || 'unknown',
        severity: d.severity || 'unknown',
        start: d.opened_day,
        end: Math.max(d.opened_day, d.last_seen_day),
        durationDays: d.n_days ?? Math.max(1, d.last_seen_day - d.opened_day + 1),
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
  const xMin = minDay - xPad;
  const xMax = maxDay + xPad;
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
        return `${metricTitle(d.metric)} · ${SEVERITY_LABEL[d.severity] || d.severity}<br/>第 ${d.opened_day}–${d.last_seen_day} 天 · ${d.durationDays} 天${peak}<br/>${d.message || ''}`;
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
    xAxis: { type: 'value', name: 'day', min: xMin, max: xMax },
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
            value: [laneIndex.get(d.metric), d.start, d.end],
            row: d,
          })),
      })),
    ],
  };
});

// --- Cause diagnostics (baseline-index view over v2's raw signals — speed_loss_pct, me_slip,
// sfoc, total_consump — corroborated by v2's own robust-z anomaly detection for the same
// metric, doc/api_v2.md §3.8). v1's admiralty_coef and the slip_apparent/slip_real split have
// no v2 counterpart (v2 has a single me_slip); dropped rather than approximated.
const DIAGNOSTIC_BASELINE_WINDOW = 30;
const DIAGNOSTIC_ALERT_WINDOW_DAYS = 30;
const DIAGNOSTIC_GRIDS = [
  { top: 46, height: 56, name: '%', decimals: 1 },
  { top: 130, height: 56, name: 'slip', decimals: 3 },
  { top: 214, height: 56, name: 'g/kWh', decimals: 1 },
  { top: 298, height: 56, name: 'mt', decimals: 0 },
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
  if (key === 'me_slip') return `${(value * 100).toFixed(1)}%`;
  if (key === 'sfoc') return `${value.toFixed(1)} g/kWh`;
  if (key === 'speed_loss_pct') return `${value.toFixed(1)}%`;
  return value.toFixed(0);
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
// Merge each day's raw signal (vessel_metrics) with its speed-loss reading (vessel_speed_loss)
// so all four diagnostic metrics share one day-indexed row set.
const diagnosticRows = computed(() => {
  const slByDay = Object.fromEntries((speedLoss.value ?? []).map(d => [d.noon_utc, d.speed_loss_pct]));
  return (metrics.value ?? [])
    .filter(d => d.noon_utc != null && !d.masked_flag)
    .map(d => ({
      day: d.noon_utc, sfoc: d.sfoc, me_slip: d.me_slip, total_consump: d.total_consump,
      speed_loss_pct: slByDay[d.noon_utc] ?? null,
    }))
    .sort((a, b) => a.day - b.day);
});
const buildMetricStat = (rows, key) => {
  const points = rows
    .map(d => ({ day: d.day, value: toFinite(d[key]) }))
    .filter(d => d.value != null);
  const baseline = median(points.slice(0, Math.min(DIAGNOSTIC_BASELINE_WINDOW, points.length)).map(d => d.value));
  const latestPoint = points.at(-1);

  return {
    baseline,
    latestIndex: toBaselineIndex(latestPoint?.value, baseline),
    latestValue: latestPoint?.value ?? null,
    points,
  };
};
const diagnosticStats = computed(() => {
  const rows = diagnosticRows.value;

  return {
    speedLoss: buildMetricStat(rows, 'speed_loss_pct'),
    sfoc: buildMetricStat(rows, 'sfoc'),
    meSlip: buildMetricStat(rows, 'me_slip'),
    totalConsump: buildMetricStat(rows, 'total_consump'),
  };
});
const diagnosticLevel = (high, medium) => (high ? 'high' : medium ? 'medium' : 'low');
const diagnosticColor = level => ({ high: 'error', medium: 'warning', low: 'success' }[level]);
const diagnosticStatus = level => ({ high: '需優先確認', medium: '持續觀察', low: '穩定' }[level]);
// Recent anomaly count for a metric — v2's own robust-z detection (vessel_anomalies), within the
// last 30 days of this ship's own data (single ship, so no cross-ship day-alignment issue).
const recentAnomalyCount = (metric) => {
  const lastDay = diagnosticRows.value.at(-1)?.day;
  if (lastDay == null) return 0;
  return (anomalies.value ?? []).filter(a => a.metric === metric && a.noon_utc != null && lastDay - a.noon_utc <= DIAGNOSTIC_ALERT_WINDOW_DAYS).length;
};
const causeDiagnostics = computed(() => {
  const stats = diagnosticStats.value;
  const slipDelta = stats.meSlip.latestIndex == null ? null : stats.meSlip.latestIndex - 100;
  const sfocDelta = stats.sfoc.latestIndex == null ? null : stats.sfoc.latestIndex - 100;
  const consumpDelta = stats.totalConsump.latestIndex == null ? null : stats.totalConsump.latestIndex - 100;
  const speedLossAnomalies = recentAnomalyCount('speed_loss_pct');
  const slipAnomalies = recentAnomalyCount('me_slip');
  const sfocAnomalies = recentAnomalyCount('sfoc');
  const consumpAnomalies = recentAnomalyCount('total_consump');

  const hullLevel = diagnosticLevel(
    (slLatest.value ?? 0) >= THRESHOLD || speedLossAnomalies >= 2,
    (slLatest.value ?? 0) >= 6 || speedLossAnomalies >= 1,
  );
  const propellerLevel = diagnosticLevel(
    (slipDelta != null && slipDelta >= 15) || slipAnomalies >= 2,
    (slipDelta != null && slipDelta >= 8) || slipAnomalies >= 1,
  );
  const engineLevel = diagnosticLevel(
    (sfocDelta != null && sfocDelta >= 5) || sfocAnomalies >= 2,
    (sfocDelta != null && sfocDelta >= 2) || sfocAnomalies >= 1,
  );
  const consumpLevel = diagnosticLevel(
    (consumpDelta != null && consumpDelta >= 8) || consumpAnomalies >= 2,
    (consumpDelta != null && consumpDelta >= 3) || consumpAnomalies >= 1,
  );

  return [
    {
      key: 'speed_loss_pct',
      title: '船體／速度損失',
      icon: metricIcon('speed_loss_pct'),
      level: hullLevel,
      score: Math.max(slLatest.value ?? 0, speedLossAnomalies * 4),
      value: slLatest.value == null ? '–' : `${slLatest.value.toFixed(1)}%`,
      label: '速度損失',
      detail: `近 ${DIAGNOSTIC_ALERT_WINDOW_DAYS} 天 ${speedLossAnomalies} 件異常`,
      summary: `速度損失 ${slLatest.value == null ? '–' : `${slLatest.value.toFixed(1)}%`}，近 ${DIAGNOSTIC_ALERT_WINDOW_DAYS} 天 ${speedLossAnomalies} 件異常`,
    },
    {
      key: 'me_slip',
      title: '螺旋槳滑失',
      icon: metricIcon('me_slip'),
      level: propellerLevel,
      score: Math.max(slipDelta ?? 0, slipAnomalies * 4),
      value: fmtIndexDelta(stats.meSlip.latestIndex),
      label: '滑失 vs 基準',
      detail: `目前 ${fmtMetricRaw('me_slip', stats.meSlip.latestValue)} · 近 ${DIAGNOSTIC_ALERT_WINDOW_DAYS} 天 ${slipAnomalies} 件異常`,
      summary: `滑失 ${fmtIndexDelta(stats.meSlip.latestIndex)}，近 ${DIAGNOSTIC_ALERT_WINDOW_DAYS} 天 ${slipAnomalies} 件異常`,
    },
    {
      key: 'sfoc',
      title: '主機油耗 (SFOC)',
      icon: metricIcon('sfoc'),
      level: engineLevel,
      score: Math.max(sfocDelta ?? 0, sfocAnomalies * 4),
      value: fmtIndexDelta(stats.sfoc.latestIndex),
      label: 'SFOC vs 基準',
      detail: `目前 ${fmtMetricRaw('sfoc', stats.sfoc.latestValue)}`,
      summary: `SFOC ${fmtIndexDelta(stats.sfoc.latestIndex)}，目前 ${fmtMetricRaw('sfoc', stats.sfoc.latestValue)}`,
    },
    {
      key: 'total_consump',
      title: '總油耗',
      icon: metricIcon('total_consump'),
      level: consumpLevel,
      score: Math.max(consumpDelta ?? 0, consumpAnomalies * 4),
      value: fmtIndexDelta(stats.totalConsump.latestIndex),
      label: '總油耗 vs 基準',
      detail: `近 ${DIAGNOSTIC_ALERT_WINDOW_DAYS} 天 ${consumpAnomalies} 件異常`,
      summary: `總油耗 ${fmtIndexDelta(stats.totalConsump.latestIndex)}，近 ${DIAGNOSTIC_ALERT_WINDOW_DAYS} 天 ${consumpAnomalies} 件異常`,
    },
  ].map(item => ({
    ...item,
    color: diagnosticColor(item.level),
    status: diagnosticStatus(item.level),
  }));
});
const dominantDiagnostic = computed(() => {
  const [top] = [...causeDiagnostics.value].sort((a, b) => b.score - a.score);
  return top ?? null;
});
const causeDiagnosticSummary = computed(() => {
  const item = dominantDiagnostic.value;
  if (!item || item.level === 'low') return '目前診斷訊號未顯示明顯偏離基準。';
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
    return p.value == null
      ? null
      : { value: [p.day, clamp(p.value, extent.min, extent.max), p.value, stat.baseline, index] };
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
    metricExtent([stats.meSlip]),
    metricExtent([stats.sfoc]),
    metricExtent([stats.totalConsump]),
  ];
  const series = [
    diagnosticLineSeries({ name: '速度損失', key: 'speed_loss_pct', color: FleetChartConstant.SpeedLossColor, extent: extents[0], gridIndex: 0, stat: stats.speedLoss }),
    diagnosticLineSeries({ name: '滑失', key: 'me_slip', color: FleetChartConstant.CategoricalPalette[1], extent: extents[1], gridIndex: 1, stat: stats.meSlip }),
    diagnosticLineSeries({ name: 'SFOC', key: 'sfoc', color: FleetChartConstant.CategoricalPalette[4], extent: extents[2], gridIndex: 2, stat: stats.sfoc }),
    diagnosticLineSeries({ name: '總油耗', key: 'total_consump', color: FleetChartConstant.CategoricalPalette[2], extent: extents[3], gridIndex: 3, stat: stats.totalConsump }),
  ];

  if (!series.some(s => s.data.length)) return {};

  const xMin = diagnosticRows.value.at(0)?.day;
  const xMax = diagnosticRows.value.at(-1)?.day;

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
        const day = list[0]?.value?.[0];
        const rows = list
          .filter(p => Array.isArray(p.value))
          .map((p) => {
            const raw = fmtMetricRaw(p.data?.diagnosticKey, p.value[2]);
            const delta = fmtIndexDelta(p.value[4]);
            return `${p.marker}${p.seriesName}: ${raw}（vs 基準 ${delta}）`;
          })
          .join('<br/>');
        return `${day == null ? '' : `第 ${day} 天`}<br/>${rows}`;
      },
    },
    axisPointer: { link: [{ xAxisIndex: [0, 1, 2, 3] }] },
    xAxis: DIAGNOSTIC_GRIDS.map((_, i) => ({
      type: 'value',
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
// v2 has no calendar dates (relative day per ship, doc/api_v2.md) — the v1 date-range picker
// (AppDateRangePicker) has nothing meaningful to filter against here, so this drops the range
// filter and just paginates every alert, newest last-seen-day first.
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
          :value="slLatest == null ? '–' : `${slLatest.toFixed(1)}%`"
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
          <AppDataSourceBadge
            version="v2"
            class="mt-2"
          />
        </DashboardKpiCard>
        <DashboardKpiCard
          label="CII"
          :tooltip="T.cii"
          :value="v1Latest?.cii_rating_aer || '–'"
          :value-color="v1Latest?.cii_rating_aer ? ciiColor(v1Latest.cii_rating_aer) : ''"
        >
          <div class="text-caption text-medium-emphasis mt-1">
            {{ `AER ${fmtNum(v1Latest?.cii_aer, 2)}` }}
          </div>
          <AppDataSourceBadge
            version="v1"
            class="mt-2"
          />
        </DashboardKpiCard>
      </div>
    </div>

    <!-- Alerts feed -->
    <UsageResultCardFrame
      :title="FleetGlossaryConstant.Title.alerts"
      :tooltip="T.alertsFeed"
    >
      <template #actions>
        <AppDataSourceBadge version="v2" />
      </template>
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
                  :icon="metricIcon(a.metric)"
                  size="20"
                  class="mt-1 text-medium-emphasis"
                />
                <div class="flex-grow-1">
                  <div class="d-flex flex-wrap align-center ga-2">
                    <span class="text-body-2 font-weight-medium">{{ metricTitle(a.metric) }}</span>
                    <AppChip
                      variant="outlined"
                      :text="SEVERITY_LABEL[a.severity] || a.severity"
                      :color="severityColor(a.severity)"
                    />
                    <span class="text-caption text-medium-emphasis">第 {{ a.opened_day }}–{{ a.last_seen_day }} 天</span>
                  </div>
                  <div class="text-caption mt-1">
                    {{ a.message }}
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
      <template #actions>
        <AppDataSourceBadge version="v2" />
      </template>
      <UsageResultCard>
        <AppEChart
          :option="speedLossTrendOption"
          :height="320"
        />
      </UsageResultCard>
    </UsageResultCardFrame>

    <!-- Excess fuel cost: total broken into its three drivers (fouling / weather / operational) -->
    <UsageResultCardFrame
      :title="FleetGlossaryConstant.Title.excessCost"
      :tooltip="T.excessCost"
    >
      <template #actions>
        <AppDataSourceBadge version="v1" />
      </template>
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
      <template #actions>
        <AppDataSourceBadge version="v1" />
      </template>
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
      <template #actions>
        <AppDataSourceBadge version="v2" />
      </template>
      <UsageResultCard>
        <div class="diagnostic-panel">
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
        <template #actions>
          <AppDataSourceBadge version="v2" />
        </template>
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
        <template #actions>
          <AppDataSourceBadge version="v2" />
        </template>
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
      <template #actions>
        <AppDataSourceBadge version="v1" />
      </template>
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
                <span :class="textClass(propColor(item.propeller_condition))">{{ item.propeller_condition }} 級</span>
                <span class="text-medium-emphasis"> · {{ Math.round(item.propeller_roughness_um) }}µm</span>
              </span>
            </template>
            <template #item.coating_breakdown_pct="{ item }">
              <span class="text-no-wrap">
                <span :class="textClass(coatColor(item.coating_condition))">{{ Math.round(item.coating_breakdown_pct) }}%</span>
                <span class="text-medium-emphasis"> · {{ UWI_COND_ZH[item.coating_condition] || item.coating_condition }}</span>
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
      <template #actions>
        <AppDataSourceBadge version="v2" />
      </template>
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
                    <span class="text-caption text-medium-emphasis">
                      建議第 {{ r.dueDay }} 天前處理
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
