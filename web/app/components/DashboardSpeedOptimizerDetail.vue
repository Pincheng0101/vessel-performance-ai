<script setup>
// Per-vessel speed optimizer: fact_speed_profile is a 24-point speed sweep (fuel, power, cost at
// each speed). usd_per_nm — (fuel + charter) per day, divided by daily distance — is the cost to
// cover a fixed annual distance at a constant speed; its minimum is the "economic speed" the
// model recommends (recommended_speed_kn always sits exactly at the curve's lowest usd_per_nm
// point). recommended_speed_kn / current_speed_kn / annual_distance_nm are repeated on all 24
// rows of a ship — read them off the first row, never aggregate.
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

const fmtUsd = v => (v == null ? '–' : `$${Math.round(v).toLocaleString()}`);
const fmtUsdPerNm = v => (v == null ? '–' : `$${v.toFixed(1)}/nm`);
const fmtNum = (v, d = 1) => (v == null ? '–' : v.toFixed(d));
const fmtUsdCompact = (v) => {
  const n = Math.abs(v);
  if (n >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${Math.round(v / 1e3)}k`;
  return `$${Math.round(v)}`;
};

// Floors the Suspense fallback at 1s — without it, a cache-warm reload (or switching back to
// an already-fetched vessel) can resolve fast enough that the loading illustration flashes
// for a single frame.
const [{ data: profile }] = await Promise.all([
  server.datalake.factSpeedProfile({ shipId: shipId.value }, { lazy: false }),
  delay(1000),
]);

const rows = computed(() =>
  [...(profile.value ?? [])]
    .filter(r => r.speed_kn != null && r.usd_per_nm != null)
    .sort((a, b) => a.speed_kn - b.speed_kn),
);
const meta = computed(() => rows.value[0] ?? {});
// The sampled grid only spans the vessel's realistic speed range (e.g. 9–18kn); defaulting the
// axis to 0 would waste most of the chart width and flatten the curve's visible shape.
const xRange = computed(() => {
  const list = rows.value;
  return list.length ? { min: list[0].speed_kn, max: list.at(-1).speed_kn } : {};
});
// Linear interpolation between the 24 sampled rows — matches the PoC's own `interp()` /
// speedOptimizer.js `at()` exactly, so every displayed number (KPI tiles, tooltips) is the
// mathematically exact value at a given speed, not just the nearest of the 24 samples.
const interpAt = (list, key, x) => {
  if (!list.length) return null;
  if (x <= list[0].speed_kn) return list[0][key];
  if (x >= list.at(-1).speed_kn) return list.at(-1)[key];
  for (let i = 0; i < list.length - 1; i += 1) {
    const a = list[i];
    const b = list[i + 1];
    if (x >= a.speed_kn && x <= b.speed_kn) {
      const t = (x - a.speed_kn) / (b.speed_kn - a.speed_kn);
      return a[key] + t * (b[key] - a[key]);
    }
  }
  return list.at(-1)[key];
};
const valueAt = (key, speed) => interpAt(rows.value, key, speed);
// The 24 sampled speeds are spaced far enough apart (on a wide chart) that discrete hit-area dots
// at just those points leave dead zones between them; densify to ~1px-scale steps so hovering
// anywhere along the curve — not just near a sampled point — still resolves accurately.
const DENSE_STEPS = 150;
const denseSpeeds = computed(() => {
  const { min, max } = xRange.value;
  if (min == null || max == null || min === max) return [];
  // Inset slightly from the exact axis bounds — a hit-area point sitting right on the grid edge
  // can get clipped by the plot's hit-test region even though it paints fine.
  const margin = (max - min) * 0.01;
  const lo = min + margin;
  const hi = max - margin;
  return Array.from({ length: DENSE_STEPS + 1 }, (_, i) => lo + ((hi - lo) * i) / DENSE_STEPS);
});
const denseHitData = key => denseSpeeds.value.map(x => [x, interpAt(rows.value, key, x)]);

// Annual saving/CO2 figures scale usd_per_nm (resp. co2 per nm) by the vessel's annual distance —
// the delta is the extra fuel+charter cost (resp. emissions) of running at the current speed
// instead of the economic one, over a year of sailing that same distance. Clamped to >= 0 (matches
// the PoC): if current is already at or below economical, there is no "saving" to report.
const stats = computed(() => {
  const curSpeed = meta.value.current_speed_kn;
  const recSpeed = meta.value.recommended_speed_kn;
  const dist = meta.value.annual_distance_nm;
  if (!rows.value.length || dist == null || curSpeed == null || recSpeed == null) return null;
  const curNm = valueAt('usd_per_nm', curSpeed);
  const recNm = valueAt('usd_per_nm', recSpeed);
  const curCo2PerNm = valueAt('co2_mt_per_day', curSpeed) / (curSpeed * 24);
  const recCo2PerNm = valueAt('co2_mt_per_day', recSpeed) / (recSpeed * 24);
  return {
    curSpeed,
    recSpeed,
    curNm,
    recNm,
    annualSavingUsd: Math.max(0, curNm - recNm) * dist,
    annualCo2SavingMt: Math.max(0, curCo2PerNm - recCo2PerNm) * dist,
    speedReductionPct: curSpeed ? ((curSpeed - recSpeed) / curSpeed) * 100 : null,
    daysAtCurrent: dist / (curSpeed * 24),
    daysAtRecommended: dist / (recSpeed * 24),
  };
});

// --- Schedule what-if (排程試算): live "what speed does this distance/days commitment demand?" ---
// Mirrors the PoC's Optimizer.js exactly: scheduleSpeed = distance / (days * 24); feasible when it
// doesn't exceed the vessel's sampled speed grid. distanceNm/days are one related input group, so
// they're grouped in a single reactive() rather than separate refs.
const scheduleInput = reactive({
  distanceNm: 5000,
  days: 14,
});
const scheduleSpeed = computed(() => (scheduleInput.days > 0 ? scheduleInput.distanceNm / (scheduleInput.days * 24) : null));
const scheduleFeasible = computed(() => {
  const sp = scheduleSpeed.value;
  const hi = xRange.value.max;
  return sp != null && hi != null && sp <= hi + 1e-9;
});
const scheduleMessage = computed(() => {
  const sp = scheduleSpeed.value;
  const rec = meta.value.recommended_speed_kn;
  if (sp == null) return '';
  if (!scheduleFeasible.value) return '超過此船的速度範圍，需安排更多天數。';
  if (rec != null && sp <= rec) return '排程餘裕充足，可採經濟航速或更慢。';
  return '排程較緊，航速需高於經濟航速。';
});
const scheduleNm = computed(() => valueAt('usd_per_nm', scheduleSpeed.value));
// This voyage's saving is current speed vs the schedule speed actually being planned for it — the
// realistic, actionable figure (headline). A secondary economical-speed comparison at the same
// distance is also shown — it's a different number from "本船年省" above (which uses the annual
// distance, not this voyage's), so it's not redundant: it's the theoretical upper bound against
// which the schedule-constrained figure can fall short. Both floor at 0.
const savingsVoyage = computed(() => {
  const s = stats.value;
  const schedNm = scheduleNm.value;
  if (!s || schedNm == null) return null;
  return Math.max(0, s.curNm - schedNm) * scheduleInput.distanceNm;
});
const savingsVoyageEconomic = computed(() => {
  const s = stats.value;
  if (!s) return null;
  return Math.max(0, s.curNm - s.recNm) * scheduleInput.distanceNm;
});
const summary = computed(() => {
  const s = stats.value;
  if (!s) return '目前沒有足夠的航速優化資料。';
  return `目前航速 ${fmtNum(s.curSpeed)} kn，經濟航速為 ${fmtNum(s.recSpeed)} kn（低 ${Math.round(s.speedReductionPct)}%）—— 調整後預估每年可省 ${fmtUsd(s.annualSavingUsd)}、減少 CO₂ ${Math.round(s.annualCo2SavingMt).toLocaleString()} 公噸；但完成相同年航程所需天數將由 ${Math.round(s.daysAtCurrent)} 天增至 ${Math.round(s.daysAtRecommended)} 天，須配合排班評估可行性。`;
});

const tiles = computed(() => {
  const s = stats.value;
  if (!s) return [];
  return [
    {
      // Matches the PoC's "current" marker color (speedOptimizer.js MARKS.current) — also
      // reads clearly in dark mode, unlike the dark-slate tone this tile used before.
      key: 'current', title: '目前航速', color: CURRENT_SPEED_COLOR, tooltip: T.currentSpeed,
      value: `${fmtNum(s.curSpeed)} kn`, sub: `每海里成本 ${fmtUsdPerNm(s.curNm)}`,
    },
    {
      key: 'economic', title: '經濟航速', color: FleetChartConstant.SemanticRamp.good, tooltip: T.economicSpeed,
      value: `${fmtNum(s.recSpeed)} kn`, sub: `每海里成本 ${fmtUsdPerNm(s.recNm)}（最低）`,
    },
    {
      // Title matches the PoC's exact label ("本船年省 / Vessel savings / yr") so this figure is
      // recognizable as the same metric, not confused with the maintenance model's "淨節省".
      key: 'saving', title: '本船年省', color: FleetChartConstant.SemanticRamp.good, tooltip: T.speedOptimizerSaving,
      value: fmtUsd(s.annualSavingUsd), sub: `較目前降速 ${Math.round(s.speedReductionPct)}%`,
    },
    {
      // Same green as 本船年省 — both are "the payoff" of switching to economical speed.
      key: 'co2', title: 'CO₂ 減量', color: FleetChartConstant.SemanticRamp.good, tooltip: T.speedOptimizerCo2,
      value: `${Math.round(s.annualCo2SavingMt).toLocaleString()} mt`, sub: '每年',
    },
  ];
});

// Shared vertical guides (current = blue, economic = green, schedule = the app's primary purple)
// so every chart in this tab reads against the same reference speeds. markLine rotates its label
// to match a vertical line's direction by default (renders sideways), so rotate is forced back to
// horizontal.
const SCHEDULE_COLOR = computed(() => themeColors.value.primary);
const CURRENT_SPEED_COLOR = FleetChartConstant.CategoricalPalette[1];
const speedGuides = () => {
  const s = stats.value;
  if (!s) return [];
  const guides = [
    { xAxis: s.curSpeed, lineStyle: { color: CURRENT_SPEED_COLOR, type: 'dashed', width: 1 }, label: { show: true, formatter: '目前', fontSize: 10, color: CURRENT_SPEED_COLOR, position: 'insideEndTop', rotate: 0 } },
    { xAxis: s.recSpeed, lineStyle: { color: FleetChartConstant.SemanticRamp.good, type: 'dashed', width: 1 }, label: { show: true, formatter: '經濟', fontSize: 10, color: FleetChartConstant.SemanticRamp.good, position: 'insideStartTop', rotate: 0 } },
  ];
  // Schedule speed is user-driven (distance/days sliders), so unlike current/economical it can
  // easily fall outside the vessel's sampled speed range — a short distance over many days pushes
  // it well below the x-axis min. Pin the marker to whichever edge it overshoots, with an arrow
  // showing there's more beyond it, instead of letting it silently render off-chart.
  const sp = scheduleSpeed.value;
  if (Number.isFinite(sp)) {
    const { min, max } = xRange.value;
    let plotSp = sp;
    let label = '排程';
    if (min != null && sp < min) {
      plotSp = min;
      label = '◀排程';
    } else if (max != null && sp > max) {
      plotSp = max;
      label = '排程▶';
    }
    guides.push({ xAxis: plotSp, lineStyle: { color: SCHEDULE_COLOR.value, type: 'dashed', width: 1.5 }, label: { show: true, formatter: label, fontSize: 10, color: SCHEDULE_COLOR.value, position: 'insideEndBottom', rotate: 0 } });
  }
  return guides;
};

// All three charts share one hover technique: a smooth visible line (or stacked area) plus an
// invisible wide-symbol scatter overlay carrying the tooltip — item trigger fires reliably on the
// scatter symbols, which a bare line stroke does not (see the speed-loss trend tooltip fix).
const speedCostCurveOption = computed(() => {
  const list = rows.value;
  if (!list.length) return {};
  return {
    grid: { left: 56, right: 20, top: 20, bottom: 40 },
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        if (!Array.isArray(p.value)) return '';
        const sp = p.value[0];
        return `航速 ${fmtNum(sp)} kn<br/>每海里成本 ${fmtUsdPerNm(valueAt('usd_per_nm', sp))}<br/>每日成本 ${fmtUsd(valueAt('usd_per_day', sp))}`;
      },
    },
    xAxis: { type: 'value', name: 'speed (kn)', nameLocation: 'middle', nameGap: 28, min: xRange.value.min, max: xRange.value.max },
    yAxis: { type: 'value', name: 'USD / nm', nameLocation: 'middle', nameGap: 46, axisLabel: { formatter: v => `$${v}` } },
    series: [
      {
        name: '每海里成本', type: 'line', smooth: true, showSymbol: false, symbol: 'none',
        lineStyle: { color: '#334155', width: 2 },
        data: list.map(r => [r.speed_kn, r.usd_per_nm]),
        markLine: { symbol: 'none', silent: true, label: { show: false }, data: speedGuides() },
      },
      {
        name: '每海里成本', type: 'scatter', symbolSize: 18, z: 3,
        itemStyle: { color: '#334155', opacity: 0.01 }, emphasis: { disabled: true },
        data: denseHitData('usd_per_nm'),
      },
    ],
  };
});

const dailyCostBreakdownOption = computed(() => {
  const list = rows.value;
  if (!list.length) return {};
  return {
    grid: { left: 56, right: 20, top: 40, bottom: 40 },
    legend: {
      top: 8, left: 'center', itemGap: 16, itemWidth: 20, itemHeight: 10,
      textStyle: { fontSize: 11 },
      data: ['燃油', '租金'],
    },
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        if (!Array.isArray(p.value)) return '';
        const sp = p.value[0];
        return `航速 ${fmtNum(sp)} kn<br/>燃油 ${fmtUsd(valueAt('fuel_usd_per_day', sp))}/day<br/>租金 ${fmtUsd(valueAt('charter_usd_per_day', sp))}/day<br/>合計 ${fmtUsd(valueAt('usd_per_day', sp))}/day`;
      },
    },
    xAxis: { type: 'value', name: 'speed (kn)', nameLocation: 'middle', nameGap: 28, min: xRange.value.min, max: xRange.value.max },
    yAxis: { type: 'value', name: 'USD / day', nameLocation: 'middle', nameGap: 50, axisLabel: { formatter: fmtUsdCompact } },
    series: [
      {
        name: '燃油', type: 'line', stack: 'cost', showSymbol: false, symbol: 'none',
        lineStyle: { width: 0 }, areaStyle: { color: FleetChartConstant.CategoricalPalette[4], opacity: 0.85 }, itemStyle: { color: FleetChartConstant.CategoricalPalette[4] },
        data: list.map(r => [r.speed_kn, Math.round(r.fuel_usd_per_day)]),
        markLine: { symbol: 'none', silent: true, label: { show: false }, data: speedGuides() },
      },
      {
        name: '租金', type: 'line', stack: 'cost', showSymbol: false, symbol: 'none',
        lineStyle: { width: 0 }, areaStyle: { color: '#64748b', opacity: 0.85 }, itemStyle: { color: '#64748b' },
        data: list.map(r => [r.speed_kn, Math.round(r.charter_usd_per_day)]),
      },
      {
        name: '燃油', type: 'scatter', symbolSize: 18, z: 3,
        itemStyle: { color: '#000', opacity: 0.01 }, emphasis: { disabled: true },
        data: denseHitData('usd_per_day'),
      },
    ],
  };
});

const fuelEmissionCurveOption = computed(() => {
  const list = rows.value;
  if (!list.length) return {};
  return {
    grid: { left: 56, right: 20, top: 20, bottom: 40 },
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        if (!Array.isArray(p.value)) return '';
        const sp = p.value[0];
        return `航速 ${fmtNum(sp)} kn<br/>CO₂ ${fmtNum(valueAt('co2_mt_per_day', sp))} mt/day<br/>燃油 ${fmtNum(valueAt('foc_mt_per_day', sp))} mt/day`;
      },
    },
    xAxis: { type: 'value', name: 'speed (kn)', nameLocation: 'middle', nameGap: 28, min: xRange.value.min, max: xRange.value.max },
    yAxis: { type: 'value', name: 'CO₂ mt/day', nameLocation: 'middle', nameGap: 46 },
    series: [
      {
        name: 'CO₂', type: 'line', smooth: true, showSymbol: false, symbol: 'none',
        lineStyle: { color: FleetChartConstant.CategoricalPalette[2], width: 2 },
        data: list.map(r => [r.speed_kn, r.co2_mt_per_day]),
        markLine: { symbol: 'none', silent: true, label: { show: false }, data: speedGuides() },
      },
      {
        name: 'CO₂', type: 'scatter', symbolSize: 18, z: 3,
        itemStyle: { color: FleetChartConstant.CategoricalPalette[2], opacity: 0.01 }, emphasis: { disabled: true },
        data: denseHitData('co2_mt_per_day'),
      },
    ],
  };
});
</script>

<template>
  <div class="d-flex flex-column ga-4">
    <DashboardVesselSelector
      v-model="shipId"
      :items="props.vesselOptions"
      :vessel="props.vessel"
    />

    <UsageResultCardFrame
      :title="FleetGlossaryConstant.Title.speedCostCurve"
      :tooltip="T.speedCostCurve"
    >
      <UsageResultCard>
        <div class="diagnostic-panel">
          <div class="diagnostic-lead pa-3 d-flex flex-wrap align-center ga-3">
            <v-icon
              icon="mdi-speedometer"
              size="20"
              class="text-medium-emphasis"
            />
            <div class="text-body-2 font-weight-medium flex-grow-1">
              {{ summary }}
            </div>
          </div>

          <div class="diagnostic-grid">
            <div
              v-for="tile in tiles"
              :key="tile.key"
              class="diagnostic-tile"
            >
              <div class="d-flex align-center ga-1">
                <span
                  v-if="tile.color"
                  class="tile-swatch"
                  :style="{ backgroundColor: tile.color }"
                />
                <span class="text-body-2 font-weight-medium text-truncate">{{ tile.title }}</span>
                <AppInputTooltip
                  v-if="tile.tooltip"
                  :text="tile.tooltip"
                />
              </div>
              <div
                class="diagnostic-value mt-2"
                :style="tile.color ? { color: tile.color } : undefined"
              >
                {{ tile.value }}
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                {{ tile.sub }}
              </div>
            </div>
          </div>

          <AppEChart
            :option="speedCostCurveOption"
            :height="300"
          />
        </div>
      </UsageResultCard>
    </UsageResultCardFrame>

    <!-- Schedule what-if: live "what speed does this distance/days commitment demand?" calculator.
         One card, inputs and result together — current/economical figures already sit in the KPI
         tiles above, so only the genuinely new numbers (schedule speed, this-voyage saving) appear
         here, as two halves of one result tile rather than a repeated summary sentence. -->
    <UsageResultCardFrame
      :title="FleetGlossaryConstant.Title.scheduleWhatIf"
      :tooltip="T.scheduleSpeed"
    >
      <UsageResultCard>
        <div class="schedule-frame pa-3">
          <div class="schedule-sliders">
            <div>
              <div class="d-flex align-center justify-space-between text-caption text-medium-emphasis">
                <span>航距</span>
                <span class="text-body-2 font-weight-medium">{{ scheduleInput.distanceNm.toLocaleString() }} nm</span>
              </div>
              <AppSlider
                v-model.integer="scheduleInput.distanceNm"
                :color="SCHEDULE_COLOR"
                :min="500"
                :max="15000"
                :step="100"
                :show-input="false"
                hide-details
              />
            </div>
            <div>
              <div class="d-flex align-center justify-space-between text-caption text-medium-emphasis">
                <span>天數</span>
                <span class="text-body-2 font-weight-medium">{{ scheduleInput.days }} 天</span>
              </div>
              <AppSlider
                v-model.integer="scheduleInput.days"
                :color="SCHEDULE_COLOR"
                :min="2"
                :max="40"
                :step="1"
                :show-input="false"
                hide-details
              />
            </div>
          </div>

          <div class="schedule-result-tile">
            <div class="schedule-result-half">
              <div class="text-body-2 font-weight-medium">
                排程航速
              </div>
              <div
                class="diagnostic-value mt-2"
                :style="{ color: scheduleFeasible ? SCHEDULE_COLOR : FleetChartConstant.SemanticRamp.critical }"
              >
                {{ fmtNum(scheduleSpeed) }} kn
              </div>
              <div
                class="text-caption mt-1"
                :class="scheduleFeasible ? 'text-medium-emphasis' : 'text-error'"
              >
                {{ fmtUsdPerNm(scheduleNm) }} · {{ scheduleMessage }}
              </div>
            </div>
            <div class="schedule-result-divider" />
            <div class="schedule-result-half">
              <div class="d-flex align-center ga-1">
                <span class="text-body-2 font-weight-medium">此航程可省</span>
                <AppInputTooltip :text="T.scheduleVoyageSaving" />
              </div>
              <div
                class="diagnostic-value mt-2"
                :style="{ color: SCHEDULE_COLOR }"
              >
                {{ fmtUsd(savingsVoyage) }}
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                較目前降速至排程航速 · {{ scheduleInput.distanceNm.toLocaleString() }} nm
              </div>
              <div class="mt-2">
                <span
                  class="text-h6 font-weight-bold"
                  :style="{ color: FleetChartConstant.SemanticRamp.good }"
                >{{ fmtUsd(savingsVoyageEconomic) }}</span>
                <span class="text-caption text-medium-emphasis"> 若改採經濟航速可省（同樣此航程距離）</span>
              </div>
            </div>
          </div>
        </div>
      </UsageResultCard>
    </UsageResultCardFrame>

    <div class="pair-grid">
      <UsageResultCardFrame
        :title="FleetGlossaryConstant.Title.dailyCostBreakdown"
        :tooltip="T.dailyCostBreakdown"
      >
        <UsageResultCard>
          <AppEChart
            :option="dailyCostBreakdownOption"
            :height="280"
          />
        </UsageResultCard>
      </UsageResultCardFrame>

      <UsageResultCardFrame
        :title="FleetGlossaryConstant.Title.fuelEmissionCurve"
        :tooltip="T.fuelEmissionCurve"
      >
        <UsageResultCard>
          <AppEChart
            :option="fuelEmissionCurveOption"
            :height="280"
          />
        </UsageResultCard>
      </UsageResultCardFrame>
    </div>
  </div>
</template>

<style lang="scss" scoped>
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

.tile-swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.pair-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;

  @media (min-width: 1280px) {
    grid-template-columns: 1fr 1fr;
  }
}

// Wraps the sliders + result together so the whole calculator reads as one bordered unit
// (matches the .diagnostic-lead border/radius/background tokens used elsewhere in this tab).
.schedule-frame {
  display: flex;
  flex-direction: column;
  gap: 20px;
  border: 1px solid rgba(var(--v-theme-inputBorder));
  border-radius: 4px;
  background-color: rgba(var(--v-theme-backgroundScale1));
}

.schedule-sliders {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;

  @media (min-width: 700px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.schedule-result-tile {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity, 0.12));

  @media (min-width: 700px) {
    flex-direction: row;
    align-items: stretch;
  }
}

.schedule-result-half {
  flex: 1 1 0;
  min-width: 0;
}

.schedule-result-divider {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity, 0.12));

  @media (min-width: 700px) {
    border-top: none;
    border-left: 1px solid rgba(var(--v-border-color), var(--v-border-opacity, 0.12));
  }
}
</style>
