<script setup>
// Public demo dashboard. No login required (see middleware: public). Each section tab is
// a self-contained, lazily-loaded component, so only the open tab fetches and renders.
definePageMeta({
  layout: 'dashboard',
  middleware: [
    'public',
  ],
});

useHead({
  title: '船隊節能與維修決策智慧平台',
});

const route = useRoute();
const getQueryValue = value => (Array.isArray(value) ? value[0] : value);
const getVesselTabTo = (tab) => {
  const ship = getQueryValue(route.query.ship);
  return {
    query: {
      tab,
      ...(ship ? { ship } : {}),
    },
  };
};

const sections = computed(() => [
  { value: 'executive', title: '營運總覽', icon: 'mdi-chart-box-outline' },
  { value: 'fleet', title: '船隊總覽', icon: 'mdi-ferry' },
  { value: 'vessel', title: '個船分析', icon: 'mdi-chart-line', to: getVesselTabTo('vessel') },
  { value: 'alerts', title: '異常預警', icon: 'mdi-alert-outline' },
  { value: 'planner', title: '維修規劃', icon: 'mdi-calendar-clock' },
  { value: 'optimizer', title: '航速優化', icon: 'mdi-speedometer', to: getVesselTabTo('optimizer') },
  { value: 'map', title: '船隊地圖', icon: 'mdi-map-outline' },
]);

const builtSections = ['executive', 'fleet', 'map', 'alerts', 'planner', 'vessel', 'optimizer'];
const placeholderSections = computed(() => sections.value.filter(section => !builtSections.includes(section.value)));

// Dataset coverage, shown beside the tabs so trends have a stated period. The rows carry both
// axes — noon_utc (a shared day index, day 0 = 2021-07-01) and report_date — and the dates are
// what a reader can actually place, so print those.
const server = useServer();
const { data: overview } = await server.datalake.aggFleetDaily({}, { lazy: false });
const dataPeriod = computed(() => {
  const rows = overview.value;
  if (!rows?.length) return '';
  return `${rows[0].report_date} – ${rows.at(-1).report_date}`;
});

// Cross-tab trend-chart date-range filter — lives here (not in any one tab) so picking a
// period on one tab stays in effect when switching to another. `init` reuses the agg_fleet_daily
// rows already fetched above instead of a second call.
const chartRangeStore = useChartRangeStore();
chartRangeStore.init(overview.value);

// A calendar click hands back a local-midnight JS Date; reproject its Y/M/D onto the UTC
// day-index grid every other date in the lake lives on — the same technique fleetUtils.todayDay()
// already uses for "the reader's day."
const toDayIndex = date => fleetUtils.msToDay(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
// v-date-input's own model, bound directly (not derived) — picking a range is two clicks, and
// after the first one the component emits a single-element array while it waits for the second.
// A computed getter here would re-synthesize a full pair from the *old* end date on that first
// click and hand it straight back, reading to the component as "the range is already complete,"
// so the second click would start a new range instead of finishing this one.
const pickerModel = ref([
  new Date(fleetUtils.dayToMs(chartRangeStore.startDay)),
  new Date(fleetUtils.dayToMs(chartRangeStore.endDay)),
]);
watch(pickerModel, (val) => {
  // `multiple="range"` doesn't emit a [start, end] pair — it expands to EVERY date the range
  // spans, always in ascending order. The boundaries are val[0] and val.at(-1).
  if (!Array.isArray(val) || val.length < 2) return;
  const start = val[0];
  const end = val.at(-1);
  if (!start || !end) return;
  chartRangeStore.setRange(toDayIndex(start), toDayIndex(end));
});
const chartRangeBounds = computed(() => ({
  min: new Date(fleetUtils.dayToMs(chartRangeStore.boundsStartDay)),
  max: new Date(fleetUtils.dayToMs(chartRangeStore.boundsEndDay)),
}));
const resetChartRange = () => {
  chartRangeStore.reset();
  pickerModel.value = [
    new Date(fleetUtils.dayToMs(chartRangeStore.startDay)),
    new Date(fleetUtils.dayToMs(chartRangeStore.endDay)),
  ];
};
// No standalone "資料期間" label any more — the calendar's own min/max already teaches the
// bound by refusing to open past it, so it's stated here once, on demand, instead of as a
// second permanent line next to the picker that just repeated the same fact in different words.
const chartRangeTooltip = computed(
  () => `資料庫涵蓋 ${dataPeriod.value}。套用於各分頁裡隨時間變化的趨勢圖（受影響的圖表會顯示已篩選的提示），不影響任何「即時狀態」指標。`,
);
</script>

<template>
  <AppTabs
    :items="sections"
    show-divider
    content-class="px-2 px-md-3"
  >
    <template #append>
      <div class="d-flex align-center ga-1 ml-4">
        <v-date-input
          v-model="pickerModel"
          multiple="range"
          density="compact"
          variant="plain"
          prepend-icon=""
          hide-details
          :min="chartRangeBounds.min"
          :max="chartRangeBounds.max"
          class="chart-range-input"
        />
        <AppInputTooltip
          size="x-small"
          :text="chartRangeTooltip"
        />
        <AppIconButton
          v-if="!chartRangeStore.isFull"
          icon="mdi-restore"
          tooltip="重設為完整期間"
          size="small"
          icon-size="small"
          variant="text"
          :on-click="resetChartRange"
        />
      </div>
    </template>

    <template #executive>
      <Suspense>
        <LazyDashboardExecutive />
        <template #fallback>
          <DashboardLoadingShip />
        </template>
      </Suspense>
    </template>

    <template #fleet>
      <Suspense>
        <LazyDashboardFleetOverview />
        <template #fallback>
          <DashboardLoadingShip />
        </template>
      </Suspense>
    </template>

    <template #map>
      <Suspense>
        <LazyDashboardFleetMap />
        <template #fallback>
          <DashboardLoadingShip />
        </template>
      </Suspense>
    </template>

    <template #alerts>
      <Suspense>
        <LazyDashboardFleetAlerts />
        <template #fallback>
          <DashboardLoadingShip />
        </template>
      </Suspense>
    </template>

    <template #planner>
      <Suspense>
        <LazyDashboardMaintenancePlanner />
        <template #fallback>
          <DashboardLoadingShip />
        </template>
      </Suspense>
    </template>

    <template #vessel>
      <Suspense>
        <LazyDashboardVesselDeepDive />
        <template #fallback>
          <DashboardLoadingShip />
        </template>
      </Suspense>
    </template>

    <template #optimizer>
      <Suspense>
        <LazyDashboardSpeedOptimizer />
        <template #fallback>
          <DashboardLoadingShip />
        </template>
      </Suspense>
    </template>

    <template
      v-for="section in placeholderSections"
      #[section.value]
      :key="section.value"
    >
      <div class="section-placeholder text-medium-emphasis">
        {{ section.title }} · 建置中
      </div>
    </template>
  </AppTabs>
</template>

<style lang="scss" scoped>
.section-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  border: 1px dashed rgb(var(--v-border-color));
  border-radius: 8px;
}

.chart-range-input {
  // AppTabs' fixed-tabs bar claims flex width first; without a floor this shrinks to an
  // unreadable sliver (the text field has no intrinsic min-width of its own). Sized to the
  // rendered text (measured ~137px for "MM/DD/YYYY - MM/DD/YYYY" at 12px) plus a small margin —
  // wider than that left a blank gap between the text and the tooltip icon next to it.
  flex: 0 0 145px;
  max-width: 150px;

  :deep(.v-field__input) {
    font-size: 12px;
    // The field's own default min-height is taller than the icon buttons beside it, so the row
    // reads as misaligned even with align-center on the parent flex — match their height instead.
    min-height: 28px;
    padding-top: 0;
    padding-bottom: 0;
  }

  // The field opens a calendar on click rather than accepting typed text, so it should read as
  // clickable, not as a text field to type into.
  :deep(.v-field),
  :deep(input) {
    cursor: pointer;
  }

  :deep(.v-field) {
    --v-field-padding-top: 0px;
  }
}
</style>
