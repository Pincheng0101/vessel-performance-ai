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
  { value: 'map', title: '船隊地圖', icon: 'mdi-map-outline' },
  { value: 'alerts', title: '異常預警', icon: 'mdi-alert-outline' },
  { value: 'planner', title: '維修規劃', icon: 'mdi-calendar-clock' },
  { value: 'vessel', title: '個船分析', icon: 'mdi-chart-line', to: getVesselTabTo('vessel') },
  { value: 'optimizer', title: '航速優化', icon: 'mdi-speedometer', to: getVesselTabTo('optimizer') },
]);

const builtSections = ['executive', 'fleet', 'map', 'alerts', 'planner', 'vessel', 'optimizer'];
const placeholderSections = computed(() => sections.value.filter(section => !builtSections.includes(section.value)));

// Dataset coverage (start–end relative day), shown beside the tabs so trends have a stated
// period. v2's noon_utc is a per-ship relative day (0 = that ship's earliest record), not a
// calendar date, so this reads as a day range rather than a month range.
const server = useServer();
const { data: overview } = await server.datalake.v2FleetOverview({}, { lazy: false });
const dataPeriod = computed(() => {
  const rows = overview.value;
  if (!rows?.length) return '';
  return `第 ${rows[0].noon_utc} – ${rows.at(-1).noon_utc} 天`;
});
</script>

<template>
  <AppTabs
    :items="sections"
    show-divider
    content-class="px-2 px-md-3"
  >
    <template #append>
      <span class="text-caption text-medium-emphasis text-no-wrap ml-4">
        資料期間 {{ dataPeriod }}
      </span>
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
</style>
