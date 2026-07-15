<script setup>
// Notification bell (top-right, persistent across every tab, mounted in the layout like
// DashboardChatButton). Surfaces the two "needs attention now" datasets the Fleet Alerts and
// Maintenance Planner tabs already compute on their own — high-severity open alerts, overdue
// maintenance actions — so they're visible without opening either tab.
//
// Reuses those tabs' exact same fixture fetches (server.datalake.factAlert /
// factMaintenanceRecommendation, same empty params): useAsyncData's key dedupes them, so this
// costs nothing extra once either tab has also loaded, and is otherwise just three small JSON
// reads — not useFleetDaily's per-ship daily fan-out, which this bell doesn't need.
const server = useServer();
const router = useRouter();
const route = useRoute();

const { data: alerts } = await server.datalake.factAlert({}, { lazy: false });
const { data: recs } = await server.datalake.factMaintenanceRecommendation({}, { lazy: false });
const { data: overview } = await server.datalake.aggFleetDaily({}, { lazy: false });

// Mirrors DashboardFleetAlerts.vue / DashboardMaintenancePlanner.vue's own label + icon maps —
// kept local (not shared) for the same reason those two don't share theirs: each caller stays
// self-contained rather than depending on another tab's module.
const METRIC_ZH = {
  speed_loss: '速度損失',
  sfoc: '主機油耗 (SFOC)',
  slip: '螺槳滑失',
  excess_foc: '超額油耗',
};
const METRIC_ICON = {
  speed_loss: 'mdi-speedometer-slow',
  sfoc: 'mdi-engine',
  slip: 'mdi-fan',
  excess_foc: 'mdi-gas-station',
};
const ACTION_LABEL = {
  hull_cleaning: '船體清潔',
  propeller_polishing: '螺旋槳拋光',
  propeller_repair: '螺旋槳修理',
  coating_renewal: '船體塗層更新',
  engine_inspection: '主機檢查',
};
const ACTION_ICON = {
  hull_cleaning: 'mdi-spray-bottle',
  propeller_polishing: 'mdi-fan',
  propeller_repair: 'mdi-fan',
  coating_renewal: 'mdi-format-paint',
  engine_inspection: 'mdi-engine',
};

// The fleet's own most recent reporting day — the same reference every other "N 天前"/"N 天後"
// read on this dashboard now uses instead of the reader's real-world clock (see
// DashboardVesselDeepDiveDetail.vue's shipLastDay). due_day is clamped to a ship's own last
// reported day once its forecast has already passed it, so "due_day <= fleetLastDay" is the
// fleet-wide equivalent of "overdue as of the data we have".
const fleetLastDay = computed(() => overview.value?.at(-1)?.noon_utc ?? null);

const fmtOpenFor = (openedDay) => {
  const n = fleetLastDay.value - openedDay;
  return n <= 0 ? '今天開啟' : `已開啟 ${n} 天`;
};
const fmtOverdueBy = (dueDay) => {
  const n = fleetLastDay.value - dueDay;
  return n <= 0 ? '今天到期' : `已到期 ${n} 天`;
};

const highSeverityAlerts = computed(() => {
  if (fleetLastDay.value == null) return [];
  return (alerts.value ?? [])
    .filter(a => a.status === 'open' && a.severity === 'high')
    .sort((a, b) => (a.opened_day ?? 0) - (b.opened_day ?? 0))
    .map(a => ({
      shipId: a.ship_id,
      icon: METRIC_ICON[a.driver_metric] || 'mdi-alert-circle-outline',
      text: METRIC_ZH[a.driver_metric] || a.driver_metric,
      detail: fmtOpenFor(a.opened_day),
    }));
});

const overdueMaintenance = computed(() => {
  if (fleetLastDay.value == null) return [];
  return (recs.value ?? [])
    .filter(r => r.due_day != null && r.due_day <= fleetLastDay.value)
    .sort((a, b) => (a.due_day ?? 0) - (b.due_day ?? 0))
    .map(r => ({
      shipId: r.ship_id,
      icon: ACTION_ICON[r.action_type] || 'mdi-wrench-outline',
      text: ACTION_LABEL[r.action_type] || r.action_type,
      detail: fmtOverdueBy(r.due_day),
    }));
});

const totalCount = computed(() => highSeverityAlerts.value.length + overdueMaintenance.value.length);

// Same navigation pattern as every row-click across the dashboard (Fleet Overview, Fleet
// Alerts, Maintenance Planner): drill into the ship's own deep-dive rather than either tab
// this data came from.
const openShip = async (shipId) => {
  if (!shipId) return;
  await router.push({ query: { ...route.query, tab: 'vessel', ship: shipId } });
  await delay(0);
  scrollUtils.scrollTo();
};
</script>

<template>
  <v-menu
    location="bottom end"
    :offset="8"
  >
    <template #activator="{ props: activatorProps }">
      <v-btn
        v-bind="activatorProps"
        icon
        variant="text"
        size="small"
        aria-label="通知"
      >
        <v-badge
          :model-value="totalCount > 0"
          dot
          color="error"
          offset-x="2"
          offset-y="2"
        >
          <v-icon icon="mdi-bell-outline" />
        </v-badge>
      </v-btn>
    </template>
    <v-card
      rounded="lg"
      :elevation="1"
      min-width="320"
      max-width="360"
      class="notification-card"
    >
      <v-list
        density="compact"
        class="py-1"
      >
        <v-list-item v-if="totalCount === 0">
          <span class="text-body-2 text-medium-emphasis">目前沒有需要注意的事項</span>
        </v-list-item>
        <template v-else>
          <v-list-subheader v-if="highSeverityAlerts.length">
            高嚴重度預警（{{ highSeverityAlerts.length }}）
          </v-list-subheader>
          <v-list-item
            v-for="(a, i) in highSeverityAlerts"
            :key="`alert-${i}`"
            @click="openShip(a.shipId)"
          >
            <template #prepend>
              <v-icon
                :icon="a.icon"
                size="20"
                class="text-medium-emphasis"
              />
            </template>
            <template #title>
              <span class="text-body-2"><b>{{ a.shipId }}</b> · {{ a.text }}</span>
            </template>
            <template #subtitle>
              <span class="text-caption text-medium-emphasis">{{ a.detail }}</span>
            </template>
          </v-list-item>

          <v-divider
            v-if="highSeverityAlerts.length && overdueMaintenance.length"
            class="my-1"
          />

          <v-list-subheader v-if="overdueMaintenance.length">
            已到期維修（{{ overdueMaintenance.length }}）
          </v-list-subheader>
          <v-list-item
            v-for="(r, i) in overdueMaintenance"
            :key="`due-${i}`"
            @click="openShip(r.shipId)"
          >
            <template #prepend>
              <v-icon
                :icon="r.icon"
                size="20"
                class="text-medium-emphasis"
              />
            </template>
            <template #title>
              <span class="text-body-2"><b>{{ r.shipId }}</b> · {{ r.text }}</span>
            </template>
            <template #subtitle>
              <span class="text-caption text-medium-emphasis">{{ r.detail }}</span>
            </template>
          </v-list-item>
        </template>
      </v-list>
    </v-card>
  </v-menu>
</template>

<style lang="scss" scoped>
.notification-card {
  max-height: 420px;
  overflow-y: auto;
}
</style>
