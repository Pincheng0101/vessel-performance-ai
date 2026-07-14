<script setup>
import { AgentConstant } from '~/constants';
import { AgentCreditConfig } from '~/models/server/agentCreditConfig';

const props = defineProps({
  agentId: {
    type: String,
    default: '',
  },
});

const server = useServer();

const state = reactive({
  isLoading: false,
  hasPersistedConfig: false,
  enabled: false,
  tierThreshold: null,
  quota: null,
});

const loadConfig = async () => {
  state.isLoading = true;
  const { data } = await server.agentCreditConfig.adminGet({ agentId: props.agentId }, { lazy: false });
  if (data.value) {
    state.hasPersistedConfig = true;
    state.enabled = true;
    state.tierThreshold = data.value.tierThreshold;
    state.quota = data.value.quota;
  }
  state.isLoading = false;
};

const syncConfig = async (agentId) => {
  if (state.enabled) {
    const config = new AgentCreditConfig({
      agentId,
      tierThreshold: state.tierThreshold,
      quota: strUtils.isEmpty(state.quota) ? null : state.quota,
    });
    const { error } = state.hasPersistedConfig
      ? await server.agentCreditConfig.adminUpdate(config)
      : await server.agentCreditConfig.adminCreate(config);
    if (error.value) {
      return false;
    }
    state.hasPersistedConfig = true;
    return true;
  }

  if (state.hasPersistedConfig) {
    const { error } = await server.agentCreditConfig.adminDestroy({ agentId });
    if (error.value) {
      return false;
    }
    state.hasPersistedConfig = false;
    return true;
  }

  return true;
};

onMounted(() => {
  if (!props.agentId) return;
  loadConfig();
});

defineExpose({
  syncConfig,
});
</script>

<template>
  <div>
    <AppInputGroup
      v-slot="{ id }"
      :label="$t('__fieldCreditConfigEnabled')"
      :tooltip="$t('__tooltipCreditConfigEnabled')"
    >
      <AppSwitch
        :id="id"
        v-model="state.enabled"
        :disabled="state.isLoading"
      />
    </AppInputGroup>
    <template v-if="state.enabled">
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldCreditTierThreshold')"
        :tooltip="$t('__tooltipCreditTierThreshold')"
      >
        <AppTextField
          :id="id"
          v-model.integer="state.tierThreshold"
          type="number"
          :min="AgentConstant.DefaultParams.CREDIT_CONFIG_TIER_THRESHOLD.min"
          :disabled="state.isLoading"
          :rules="(
            $validator
              .defineField(label)
              .required()
              .gte(AgentConstant.DefaultParams.CREDIT_CONFIG_TIER_THRESHOLD.min)
              .when({ lte: state.quota })
              .lte(state.quota)
              .collect()
          )"
        />
      </AppInputGroup>
      <AppInputGroup
        v-slot="{ id, label }"
        :label="$t('__fieldCreditQuota')"
        :tooltip="$t('__tooltipCreditQuota')"
      >
        <AppTextField
          :id="id"
          v-model.integer="state.quota"
          type="number"
          clearable
          :min="AgentConstant.DefaultParams.CREDIT_CONFIG_QUOTA.min"
          :disabled="state.isLoading"
          :rules="(
            $validator
              .defineField(label)
              .when({ gte: state.tierThreshold })
              .gte(state.tierThreshold)
              .collect()
          )"
        />
      </AppInputGroup>
    </template>
  </div>
</template>
