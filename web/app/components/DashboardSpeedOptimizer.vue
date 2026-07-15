<script setup>
const { options, shipId, selectedVessel } = await useDashboardVesselSelection();

// DashboardSpeedOptimizerDetail is keyed by shipId, so picking a different ship (from the
// selector below, or from a cross-tab link like the notification bell) destroys and remounts
// it. Suspense only shows #fallback on its very first resolve — on this later remount it
// silently keeps the OUTGOING ship's content on screen until the new one is ready, so a ship
// switch looked like nothing had happened for over a second. Track pending/resolve ourselves
// and swap to the loading screen explicitly instead of relying on that behavior. (Mirrors
// DashboardVesselDeepDive.vue.)
const isSwitchingShip = ref(false);
</script>

<template>
  <div class="d-flex flex-column ga-4">
    <DashboardLoadingShip v-if="isSwitchingShip" />
    <!-- v-show goes on this wrapper div, not directly on <Suspense> — Suspense's resolved
         content isn't a plain element Vue can toggle display on reliably; a wrapping element
         is. -->
    <div v-show="!isSwitchingShip">
      <Suspense
        @pending="isSwitchingShip = true"
        @resolve="isSwitchingShip = false"
      >
        <DashboardSpeedOptimizerDetail
          :key="shipId"
          v-model:ship-id="shipId"
          :vessel="selectedVessel"
          :vessel-options="options"
        />
        <template #fallback>
          <DashboardLoadingShip />
        </template>
      </Suspense>
    </div>
  </div>
</template>
