<script setup>
// Fleet-wide map: fleet_positions is the latest daily row per vessel (one dot per ship).
// Ported from the PoC's FleetMap.js/charts/fleetMap.js, but rendered with ECharts' geo
// component (registered via AppEChart's `maps` prop) instead of hand-rolled D3, since this
// project has no d3/leaflet dependency. Drag-to-pan comes from `geo.roam`; zoom is handled by
// hand (fixed-size steps via the floating +/- buttons and the wheel handler below) rather than
// ECharts' own wheel-zoom, which jumps too far per scroll on a trackpad — see the comment by
// `zoomChart` further down.
// Land basemap is the same committed world.geojson the PoC ships (no external map tiles).
import { FleetChartConstant, FleetGlossaryConstant, PortConstant } from '~/constants';

const server = useServer();
const { themeColors } = useCustomTheme();
const T = FleetGlossaryConstant.Term;
const THRESHOLD = FleetChartConstant.SpeedLossThreshold;

// v2 has no lat/lon at all (doc/api_v2.md §4) — this whole tab stays v1, and its 9 vessels
// have no correspondence to the v2 ship roster used everywhere else, so clicking a dot no
// longer navigates to the vessel tab (see handleMapClick removal below).
//
// Floors the Suspense fallback at 1s — without it, a cache-warm reload can resolve fast enough
// that the loading illustration flashes for a single frame.
const [fetched] = await Promise.all([
  Promise.all([
    server.datalake.v1FleetPositions({}, { lazy: false }),
    server.datalake.v1FleetVessels({}, { lazy: false }),
    // Fetched as text and parsed by hand rather than relying on $fetch's content-type-based
    // auto-parsing — S3 serves .geojson as `binary/octet-stream` (its mime-type guesser
    // doesn't know the extension), which skips ofetch's JSON parsing and breaks the map only
    // in that deployed environment, not locally.
    $fetch('/assets/world.geojson', { responseType: 'text' }).then(text => JSON.parse(text)),
  ]),
  delay(1000),
]);
const [
  { data: positions },
  { data: vessels },
  worldGeoJson,
] = fetched;

// fleet_positions carries no fleet_id — join against the vessel roster, same trick the
// PoC uses (fleetByImo in FleetMap.js).
const fleetIdByImo = computed(() => Object.fromEntries((vessels.value ?? []).map(v => [v.imo_number, v.fleet_id])));
const fleetOptions = computed(() => {
  const seen = new Map();
  (vessels.value ?? []).forEach((v) => {
    if (v.fleet_id && !seen.has(v.fleet_id)) seen.set(v.fleet_id, v.fleet_name || v.fleet_id);
  });
  return [{ title: '全部船隊', value: 'ALL' }, ...[...seen].map(([value, title]) => ({ title, value }))];
});

const selectedFleet = ref('ALL');
const colorBy = ref('speed_loss');

const filteredPositions = computed(() => {
  const rows = positions.value ?? [];
  if (selectedFleet.value === 'ALL') return rows;
  return rows.filter(r => fleetIdByImo.value[r.imo_number] === selectedFleet.value);
});

const speedLossColor = (v) => {
  if (v == null) return FleetChartConstant.FallbackColor;
  if (v < 6) return FleetChartConstant.SemanticRamp.good;
  if (v < THRESHOLD) return FleetChartConstant.SemanticRamp.warning;
  return FleetChartConstant.SemanticRamp.critical;
};
const ciiColor = c => FleetChartConstant.CiiColor[c] || FleetChartConstant.FallbackColor;
const dotColor = row => (colorBy.value === 'cii' ? ciiColor(row.cii_rating_aer) : speedLossColor(row.speed_loss_pct));

const legend = computed(() => (colorBy.value === 'cii'
  ? ['A', 'B', 'C', 'D', 'E'].map(g => ({ label: g, color: FleetChartConstant.CiiColor[g] }))
  : [
      { label: '< 6%', color: FleetChartConstant.SemanticRamp.good },
      { label: '6–10%', color: FleetChartConstant.SemanticRamp.warning },
      { label: `≥ ${THRESHOLD}%`, color: FleetChartConstant.SemanticRamp.critical },
      { label: 'n/a', color: FleetChartConstant.FallbackColor },
    ]));

// Dashed planned-route arcs — one per distinct (port_from, port_to) pair currently on the map,
// bent through the shared waypoints so a route doesn't cut straight across land.
const routeLines = computed(() => {
  const seen = new Set();
  const lines = [];
  filteredPositions.value.forEach((r) => {
    if (!r.port_from || !r.port_to || r.port_from === r.port_to) return;
    const key = [r.port_from, r.port_to].sort().join('|');
    if (seen.has(key)) return;
    seen.add(key);
    const coords = PortConstant.routePath(r.port_from, r.port_to);
    if (coords) lines.push({ coords });
  });
  return lines;
});

const portDots = computed(() => Object.entries(PortConstant.Port).map(([locode, p]) => ({
  name: p.isEu ? `${p.name} (${locode}) · EU` : `${p.name} (${locode})`,
  value: [p.lon, p.lat],
  symbol: p.isEu ? 'rect' : 'circle',
  symbolSize: p.isEu ? 11 : 9,
})));

const vesselDots = computed(() => filteredPositions.value.map(r => ({
  name: r.vessel_name || r.imo_number,
  value: [r.longitude, r.latitude],
  imo: r.imo_number,
  itemStyle: { color: dotColor(r) },
  slPct: r.speed_loss_pct,
  cii: r.cii_rating_aer,
  portFrom: r.port_from,
  portTo: r.port_to,
  phase: r.voyage_phase,
})));

// Custom, fixed-size zoom steps (both the floating +/- buttons and the wheel handler below) —
// ECharts' own wheel-zoom scales the step with the wheel event's delta, which on a trackpad
// (many small events per gesture, each with a larger delta than a physical mouse notch) makes
// a light scroll jump much further than intended. roam is 'move'-only (pan) so this is the
// only zoom path, and every step is the same size regardless of input device. Buttons are
// plain Vuetify (not ECharts' toolbox) — toolbox features other than the handful ECharts
// ships (restore/saveAsImage/...) require registering a full feature class, not just an
// icon+onclick object, so custom zoom buttons are floated over the chart instead.
const zoomChart = (chart, factor, originX, originY) => chart?.dispatchAction({
  type: 'geoRoam',
  componentType: 'geo',
  zoom: factor,
  originX: originX ?? chart.getWidth() / 2,
  originY: originY ?? chart.getHeight() / 2,
});

const mapOption = computed(() => {
  const c = themeColors.value;
  return {
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        if (p.seriesType === 'lines') return '';
        if (p.data?.imo) {
          const phaseZh = p.data.phase === 'in_port' ? '在港' : '航行中';
          const sl = p.data.slPct == null ? '–' : `${(+p.data.slPct).toFixed(1)}%`;
          return `<b>${p.data.name}</b><br/>${p.data.portFrom} → ${p.data.portTo} · ${phaseZh}<br/>速度損失 ${sl} · CII ${p.data.cii || '–'}`;
        }
        return p.data?.name || '';
      },
    },
    // Centered on the midpoint of the fleet's lon/lat *range* (Mediterranean to mid-Pacific),
    // not the mean — the mean gets pulled east by the dense Asia cluster, and at this zoom
    // that pushes the visible window past +180° (the world geojson doesn't wrap), leaving the
    // map looking shoved into the left side of the frame with blank ocean on the right.
    geo: {
      map: 'world',
      roam: 'move',
      zoom: 1.8,
      center: [93, 24],
      scaleLimit: { min: 1, max: 15 },
      silent: true,
      itemStyle: { areaColor: c.backgroundScale3, borderColor: c.backgroundScale4, borderWidth: 0.6 },
    },
    series: [
      {
        name: '規劃航線',
        type: 'lines',
        coordinateSystem: 'geo',
        polyline: true,
        silent: true,
        lineStyle: { type: 'dashed', color: FleetChartConstant.FallbackColor, opacity: 0.55, width: 1 },
        data: routeLines.value,
      },
      {
        name: '港口',
        type: 'scatter',
        coordinateSystem: 'geo',
        itemStyle: { color: c.backgroundScale2, borderColor: c.text, borderWidth: 1.2 },
        data: portDots.value,
        z: 5,
      },
      {
        name: '船舶',
        type: 'scatter',
        coordinateSystem: 'geo',
        symbolSize: 20,
        itemStyle: { borderColor: '#ffffff', borderWidth: 1.6 },
        emphasis: { scale: 1.25 },
        data: vesselDots.value,
        z: 10,
      },
    ],
  };
});

// AppEChart's exposed getChart() is how the zoom buttons and wheel handler below reach
// dispatchAction — there's no other way in from outside the option object.
const chartRef = ref(null);
const chartApi = computed(() => chartRef.value?.getChart?.() ?? null);
const handleWheel = (e) => {
  e.preventDefault();
  const chart = chartApi.value;
  if (!chart) return;
  const rect = e.currentTarget.getBoundingClientRect();
  zoomChart(chart, e.deltaY < 0 ? 1.06 : 1 / 1.06, e.clientX - rect.left, e.clientY - rect.top);
};
const zoomIn = () => zoomChart(chartApi.value, 1.2);
const zoomOut = () => zoomChart(chartApi.value, 1 / 1.2);
const resetView = () => chartApi.value?.dispatchAction({ type: 'restore' });
</script>

<template>
  <div class="d-flex flex-column ga-6">
    <UsageResultCardFrame>
      <template #title>
        <DashboardFleetSelector
          v-model="selectedFleet"
          :items="fleetOptions"
        />
        <div class="text-caption text-medium-emphasis mt-1">
          {{ T.fleetMap }}
        </div>
      </template>
      <template #actions>
        <div class="color-by-toggle">
          <AppButtonToggle
            v-model="colorBy"
            :button-width="100"
            :elevation="0"
            :items="[
              { title: '速度損失', value: 'speed_loss' },
              { title: 'CII', value: 'cii' },
            ]"
          />
        </div>
        <AppDataSourceBadge version="v1" />
      </template>
      <UsageResultCard>
        <div class="map-chart-wrap">
          <AppEChart
            ref="chartRef"
            :option="mapOption"
            :maps="[{ name: 'world', geoJson: worldGeoJson }]"
            :height="520"
            @wheel="handleWheel"
          />
          <div class="map-zoom-controls d-flex flex-column">
            <v-btn
              icon="mdi-plus"
              size="small"
              variant="flat"
              aria-label="放大"
              @click="zoomIn"
            />
            <v-btn
              icon="mdi-minus"
              size="small"
              variant="flat"
              aria-label="縮小"
              @click="zoomOut"
            />
            <v-btn
              icon="mdi-restore"
              size="small"
              variant="flat"
              aria-label="重置檢視"
              @click="resetView"
            />
          </div>
        </div>
        <div class="map-legend d-flex align-center flex-wrap ga-4 mt-3">
          <span
            v-for="item in legend"
            :key="item.label"
            class="d-flex align-center ga-2 text-caption text-medium-emphasis"
          >
            <span
              class="legend-dot"
              :style="{ background: item.color }"
            />
            {{ item.label }}
          </span>
          <span class="legend-sep" />
          <span class="d-flex align-center ga-2 text-caption text-medium-emphasis">
            <span class="legend-port" />
            港口
          </span>
          <span class="d-flex align-center ga-2 text-caption text-medium-emphasis">
            <span class="legend-port legend-port--eu" />
            EU 港口
          </span>
          <span class="d-flex align-center ga-2 text-caption text-medium-emphasis">
            <span class="legend-route" />
            規劃航線
          </span>
        </div>
      </UsageResultCard>
    </UsageResultCardFrame>
  </div>
</template>

<style lang="scss" scoped>
// The actions row sits right above the map, so it needs a bit more daylight than the default
// header spacing gives — otherwise the chart reads as crowded against the fleet select.
.map-chart-wrap {
  position: relative;
  margin-top: 16px;
}

// Floated over the top-right corner of the chart rather than an ECharts toolbox — a custom
// toolbox icon needs a registered feature class in this echarts version, not just an
// icon+onclick object, so a plain Vuetify button cluster is the simpler path here.
.map-zoom-controls {
  position: absolute;
  top: 8px;
  right: 8px;
  gap: 2px;
  z-index: 1;

  .v-btn {
    background: rgba(var(--v-theme-backgroundScale2), 0.92);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  }
}

.legend-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-sep {
  width: 1px;
  height: 14px;
  background: rgba(var(--v-theme-on-surface), 0.16);
}

.legend-port {
  display: inline-block;
  width: 8px;
  height: 8px;
  border: 1.2px solid rgba(var(--v-theme-on-surface), 0.62);
  border-radius: 50%;

  &--eu {
    border-radius: 2px;
  }
}

.legend-route {
  display: inline-block;
  width: 16px;
  height: 0;
  border-top: 1.5px dashed rgba(var(--v-theme-on-surface), 0.4);
}

// AppButtonToggle's v-btn defaults to full-emphasis text when inactive, which reads as two
// equally-weighted options — the rest of the app treats the non-active option as muted.
.color-by-toggle :deep(.v-btn:not(.v-btn--active) .v-btn__content) {
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
