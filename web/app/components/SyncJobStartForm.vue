<script setup>
/**
 * @import { SyncJob } from '~/models/server/syncJob
 */

const props = defineProps({
  onSubmit: {
    type: Function,
    required: true,
  },
  onDiscard: {
    type: Function,
    required: true,
  },
});

const state = reactive({
  /**
   * @type {SyncJob}
   */
  formData: {},
});

const submit = async () => {
  const formData = objUtils.toRaw(state.formData);
  await props.onSubmit(formData);
};
</script>

<template>
  <AppForm
    :form-title="$t('__titleStartSyncJob')"
    :on-submit="submit"
    :on-discard="props.onDiscard"
    :submit-button-text="$t('__actionStart')"
  >
    <template #body>
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldForceFullSync')"
        :tooltip="$t('__tooltipRuntimeSyncJobForceFullSync')"
      >
        <AppSwitch
          :id="id"
          v-model="state.formData.forceFullSync"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id }"
        :label="$t('__fieldIgnoreFailed')"
        :tooltip="$t('__tooltipRuntimeSyncJobIgnoreFailed')"
      >
        <AppSwitch
          :id="id"
          v-model="state.formData.ignoreFailed"
        />
      </AppInputGroup>
    </template>
  </AppForm>
</template>
