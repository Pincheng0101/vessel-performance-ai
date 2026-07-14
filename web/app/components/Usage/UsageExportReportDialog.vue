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

const model = defineModel({
  type: Boolean,
  default: false,
});

const { exportMeteringReport } = useMetering();

const state = reactive({
  localStartDate: null,
  localEndDate: null,
});

watch(model, (isOpen) => {
  if (isOpen) {
    state.localStartDate = props.startDate;
    state.localEndDate = props.endDate;
  }
});

const canExport = computed(() => !!state.localStartDate && !!state.localEndDate);

const handleExport = () => exportMeteringReport({
  startDate: state.localStartDate,
  endDate: state.localEndDate,
});
</script>

<template>
  <AppDialog
    v-model="model"
    :on-submit="handleExport"
  >
    <template #body="{ onSubmit, onCancel, loading }">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between pt-4">
          <span class="text-h6">{{ $t('__actionExportDetailedReport') }}</span>
          <AppIconButton
            icon="mdi-close"
            variant="text"
            :disabled="loading"
            :on-click="onCancel"
          />
        </v-card-title>
        <v-divider />
        <v-card-text class="py-6">
          <AppInputGroup
            v-slot="{ id }"
            :label="$t('__fieldUsageDateRange')"
            required
          >
            <AppDateRangePicker
              :id="id"
              v-model:start-date="state.localStartDate"
              v-model:end-date="state.localEndDate"
              :on-apply="() => {}"
            />
          </AppInputGroup>
        </v-card-text>
        <v-divider />
        <v-card-actions class="justify-end ga-2 pa-4">
          <AppButton
            :text="$t('__actionCancel')"
            color="actionButton"
            width="100"
            :disabled="loading"
            :on-click="onCancel"
          />
          <AppButton
            :disabled="!canExport"
            :loading="loading"
            :text="$t('__actionExport')"
            color="primary"
            width="100"
            :on-click="onSubmit"
          />
        </v-card-actions>
      </v-card>
    </template>
  </AppDialog>
</template>
