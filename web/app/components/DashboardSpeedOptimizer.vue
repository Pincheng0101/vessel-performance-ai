<script setup>
const { options, shipId, selectedVessel } = await useDashboardVesselSelection();
</script>

<template>
  <div class="d-flex flex-column ga-4">
    <Suspense>
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
</template>
