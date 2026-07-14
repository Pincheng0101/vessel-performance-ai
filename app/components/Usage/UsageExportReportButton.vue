<script setup>
const props = defineProps({
  startDate: {
    type: Date,
    default: null,
  },
  endDate: {
    type: Date,
    default: null,
  },
});

const state = reactive({
  isDialogOpen: false,
});
</script>

<template>
  <UsageExportReportDialog
    v-model="state.isDialogOpen"
    :start-date="props.startDate"
    :end-date="props.endDate"
  />
  <AppIconButton
    icon="mdi-download"
    color="primary"
    variant="text"
    :tooltip="$t('__actionExportDetailedReport')"
    :on-click="() => state.isDialogOpen = true"
  />
</template>
