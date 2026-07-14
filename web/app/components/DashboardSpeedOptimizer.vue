<script setup>
const { options, shipId, fallbackImo, selectedVessel } = await useDashboardVesselSelection();
</script>

<template>
  <div class="d-flex flex-column ga-4">
    <Suspense>
      <DashboardSpeedOptimizerDetail
        :key="shipId"
        v-model:ship-id="shipId"
        :fallback-imo="fallbackImo"
        :vessel="selectedVessel"
        :vessel-options="options"
      />
      <template #fallback>
        <DashboardLoadingShip />
      </template>
    </Suspense>
  </div>
</template>
