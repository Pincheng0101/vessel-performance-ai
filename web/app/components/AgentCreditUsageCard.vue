<script setup>
import { DateConstant, ResourceConstant } from '~/constants';

const props = defineProps({
  agentId: {
    type: String,
    required: true,
  },
  enableCredit: {
    type: Boolean,
    default: false,
  },
});

const { fetchAgentCreditUsage } = useMetering();
const dayjs = useDayjs();
const authStore = useAuthStore();

const goToAgentEdit = () => navigateTo({
  path: `${resourceUtils.getUrl(ResourceConstant.Type.AGENT.value, props.agentId)}/edit`,
  query: { section: 'credit' },
});

const state = reactive({
  isLoading: false,
  hasError: false,
  errorMessage: '',
  usage: null,
});

const load = async () => {
  state.isLoading = true;
  state.hasError = false;
  state.errorMessage = '';

  try {
    const result = await fetchAgentCreditUsage({ agentId: props.agentId });
    if (!result || result.isFailed) {
      state.hasError = true;
      state.errorMessage = result?.errorMessage ?? '';
      state.usage = null;
    } else {
      state.usage = result;
    }
  } finally {
    state.isLoading = false;
  }
};

const hasConfig = computed(() => Boolean(state.usage) && state.usage.tierThreshold !== null);

const creditUsed = computed(() => state.usage?.creditUsed ?? 0);

const barMax = computed(() => {
  if (!state.usage) {
    return 0;
  }
  if (state.usage.quota !== null) {
    return state.usage.quota;
  }
  if (state.usage.tierThreshold !== null) {
    return Math.max(creditUsed.value, state.usage.tierThreshold);
  }
  return creditUsed.value;
});

const usedPercent = computed(() => (
  barMax.value > 0 ? Math.min(100, (creditUsed.value / barMax.value) * 100) : 0
));

const tierPercent = computed(() => {
  if (!state.usage || state.usage.tierThreshold === null || barMax.value <= 0) {
    return null;
  }
  return Math.min(100, (state.usage.tierThreshold / barMax.value) * 100);
});

// Single source for the bar color and the detailed billing-status block
const creditStatus = computed(() => {
  if (!state.usage || !hasConfig.value) {
    return { color: 'primary', message: null };
  }
  if (state.usage.quota !== null && creditUsed.value >= state.usage.quota) {
    return {
      color: 'error',
      message: { icon: 'mdi-close-circle', titleKey: '__messageCreditReachedQuotaTitle', detailKey: '__messageCreditReachedQuotaDetail' },
    };
  }
  if (state.usage.tierThreshold !== null && creditUsed.value > state.usage.tierThreshold) {
    return {
      color: 'warning',
      message: { icon: 'mdi-alert-circle', titleKey: '__messageCreditOverTierTitle', detailKey: '__messageCreditOverTierDetail' },
    };
  }
  return {
    color: 'success',
    message: { icon: 'mdi-check-circle', titleKey: '__messageCreditWithinTierTitle', detailKey: '__messageCreditWithinTierDetail' },
  };
});

// Remaining before overage starts (tier) and before the hard cap (quota), clamped at 0
// `quotaRemaining` is null when there is no cap
const tierRemaining = computed(() => (
  !state.usage || state.usage.tierThreshold === null
    ? null
    : Math.max(0, state.usage.tierThreshold - creditUsed.value)
));

const quotaRemaining = computed(() => (
  !state.usage || state.usage.quota === null
    ? null
    : Math.max(0, state.usage.quota - creditUsed.value)
));

// Formatted figures interpolated into the billing-status block copy.
// `quota` is only shown via __messageCreditReachedQuotaTitle, which creditStatus
// emits exclusively when quota !== null — so the `?? 0` fallback is never surfaced
// for the unlimited (quota === null) case.
const statusParams = computed(() => ({
  tier: numUtils.format(state.usage?.tierThreshold ?? 0),
  quota: numUtils.format(state.usage?.quota ?? 0),
  overage: numUtils.format(Math.max(0, creditUsed.value - (state.usage?.tierThreshold ?? 0))),
}));

// Keep the tier axis label inside the bar: left-aligned near the start, right-aligned
// near the end, centered in between — so it never overflows the container edge
const tierLabelStyle = computed(() => {
  if (tierPercent.value === null) {
    return {};
  }
  const translateX = tierPercent.value <= 10 ? '0' : tierPercent.value >= 90 ? '-100%' : '-50%';
  return { left: `${tierPercent.value}%`, transform: `translateX(${translateX})` };
});

// `usagePeriod` arrives as `YYYYMMDD-YYYYMMDD`; render each date with dashes
const toDashedDate = (value) => {
  const date = dayjs(value, 'YYYYMMDD', true);
  return date.isValid() ? date.format(DateConstant.Format.FULL_DATE) : value;
};

const formattedPeriod = computed(() => {
  const period = state.usage?.usagePeriod;
  if (!period) {
    return state.usage?.usageMonth || '-';
  }
  const [start, end] = period.split('-');
  return end ? `${toDashedDate(start)} - ${toDashedDate(end)}` : toDashedDate(start);
});

onMounted(() => {
  load();
});
</script>

<template>
  <v-card>
    <v-card-text>
      <div
        v-if="!props.enableCredit"
        class="d-flex align-center ga-1 mb-3 text-caption text-medium-emphasis"
      >
        <v-icon
          icon="mdi-eye-off-outline"
          size="small"
        />
        <span>{{ $t('__messageCreditUsageHiddenFromUsers') }}</span>
      </div>
      <div
        v-if="state.isLoading"
        class="d-flex justify-center pa-6"
      >
        <v-progress-circular
          indeterminate
          color="primary"
        />
      </div>
      <template v-else-if="state.hasError">
        <div class="text-body-2 text-medium-emphasis mb-2">
          {{ state.errorMessage || $t('__messageCreditUsageLoadFailed') }}
        </div>
        <AppButton
          color="primary"
          variant="outlined"
          :text="$t('__actionRetry')"
          @click="load"
        />
      </template>
      <template v-else-if="state.usage">
        <div class="text-caption text-medium-emphasis mb-3">
          {{ $t('__fieldCreditUsagePeriod') }}: {{ formattedPeriod }}
        </div>
        <v-divider class="mb-4" />
        <template v-if="hasConfig">
          <div class="text-body-2 font-weight-medium mb-3">
            {{ $t('__titleCreditRemaining') }}
          </div>
          <div class="d-flex flex-wrap ga-12 mb-4">
            <div>
              <div class="text-caption text-medium-emphasis mb-1">
                {{ $t('__fieldCreditTierRemaining') }}
              </div>
              <div class="text-h5">
                {{ numUtils.format(tierRemaining) }}<span class="text-body-2 ml-1">{{ $t('__labelCreditUnit') }}</span>
              </div>
            </div>
            <div>
              <div class="text-caption text-medium-emphasis mb-1">
                {{ $t('__fieldCreditQuotaRemaining') }}
              </div>
              <div
                v-if="state.usage.quota === null"
                class="text-h5"
              >
                {{ $t('__labelCreditUnlimited') }}
              </div>
              <div
                v-else
                class="text-h5"
              >
                {{ numUtils.format(quotaRemaining) }}<span class="text-body-2 ml-1">{{ $t('__labelCreditUnit') }}</span>
              </div>
            </div>
          </div>
          <div
            v-if="creditStatus.message"
            class="credit-status mb-4"
            :class="`credit-status--${creditStatus.color}`"
          >
            <v-icon
              :icon="creditStatus.message.icon"
              :color="creditStatus.color"
              class="credit-status__icon"
            />
            <div>
              <div class="text-body-2 font-weight-medium">
                {{ $t(creditStatus.message.titleKey, statusParams) }}
              </div>
              <div class="text-caption text-medium-emphasis mt-1">
                {{ $t(creditStatus.message.detailKey, statusParams) }}
              </div>
            </div>
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ $t('__fieldCreditUsed') }}: {{ numUtils.format(creditUsed) }}
          </div>
          <div class="credit-bar position-relative my-2">
            <v-progress-linear
              :model-value="usedPercent"
              :color="creditStatus.color"
              height="12"
              rounded
            />
            <div
              v-if="tierPercent !== null"
              class="credit-bar__tier-marker"
              :style="{ left: `${tierPercent}%` }"
            />
          </div>
          <div class="credit-bar__labels text-caption text-medium-emphasis mt-1">
            <div class="credit-bar__tier-row position-relative">
              <span
                v-if="tierPercent !== null"
                class="credit-bar__tier-label"
                :style="tierLabelStyle"
              >
                {{ $t('__fieldCreditTierThreshold') }}: {{ numUtils.format(state.usage.tierThreshold) }}
              </span>
            </div>
            <div class="text-right">
              {{ $t('__fieldCreditQuota') }}:
              {{ state.usage.quota === null ? $t('__labelCreditUnlimited') : numUtils.format(state.usage.quota) }}
            </div>
          </div>
        </template>
        <div v-else>
          <div class="text-body-1 mb-6">
            {{ $t('__fieldCreditUsed') }}: {{ numUtils.format(creditUsed) }}
          </div>
          <div class="d-flex flex-column align-center text-center">
            <div class="text-body-2 text-medium-emphasis mb-2">
              {{ $t('__messageCreditConfigNotSet') }}
            </div>
            <AppButton
              v-if="authStore.parsedToken.isAdmin"
              color="primary"
              variant="outlined"
              :text="$t('__actionSetCreditLimits')"
              @click="goToAgentEdit"
            />
          </div>
        </div>
      </template>
    </v-card-text>
  </v-card>
</template>

<style lang="scss" scoped>
.credit-status {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border: thin solid;
  border-radius: 8px;

  &__icon {
    margin-top: 2px;
  }

  &--success {
    background-color: rgba(var(--v-theme-success), 0.08);
    border-color: rgba(var(--v-theme-success), 0.4);
  }
  &--warning {
    background-color: rgba(var(--v-theme-warning), 0.08);
    border-color: rgba(var(--v-theme-warning), 0.4);
  }
  &--error {
    background-color: rgba(var(--v-theme-error), 0.08);
    border-color: rgba(var(--v-theme-error), 0.4);
  }
}

.credit-bar {
  &__tier-marker {
    position: absolute;
    top: -2px;
    width: 2px;
    height: 16px;
    background-color: rgba(var(--v-theme-text));
    transform: translateX(-1px);
  }
  &__tier-row {
    height: 18px;
  }
  &__tier-label {
    position: absolute;
    white-space: nowrap;
  }
}
</style>
