<script setup>
import { DateConstant } from '~/constants';

const props = defineProps({
  maxRangeDays: {
    type: Number,
    default: 90,
  },
  onApply: {
    type: Function,
    default: null,
  },
});

const { t } = useI18n();
const dayjs = useDayjs();

const startDate = defineModel('startDate', {
  type: Date,
  default: null,
});

const endDate = defineModel('endDate', {
  type: Date,
  default: null,
});

const RANGE_KEY = Object.freeze({
  CUSTOM: 'custom',
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  LAST_7_DAYS: 'last7Days',
  LAST_30_DAYS: 'last30Days',
  WEEK_TO_DATE: 'weekToDate',
  MONTH_TO_DATE: 'monthToDate',
});

const state = reactive({
  draftRange: [],
  draftStartDate: null,
  draftEndDate: null,
  isEnabled: false,
  selectedBoundary: 'start',
  selectedRangeKey: RANGE_KEY.CUSTOM,
});

const presetRanges = computed(() => ([
  { key: RANGE_KEY.TODAY, title: t('__titleRangeToday') },
  { key: RANGE_KEY.YESTERDAY, title: t('__titleRangeYesterday') },
  { key: RANGE_KEY.LAST_7_DAYS, title: t('__titleRangeLast7Days') },
  { key: RANGE_KEY.LAST_30_DAYS, title: t('__titleRangeLast30Days') },
  { key: RANGE_KEY.WEEK_TO_DATE, title: t('__titleRangeWeekToDate') },
  { key: RANGE_KEY.MONTH_TO_DATE, title: t('__titleRangeMonthToDate') },
  { key: RANGE_KEY.CUSTOM, title: t('__titleRangeCustom') },
]));

const displayedRangeLabel = computed(() => {
  if (!startDate.value || !endDate.value) {
    return '';
  }

  return `${formatDisplayDate(startDate.value)} - ${formatDisplayDate(endDate.value)}`;
});

const formatDisplayDate = (value) => {
  if (!value) {
    return DateConstant.Format.FULL_DATE;
  }

  return dayjs(value).format(DateConstant.Format.FULL_DATE);
};

const canApply = computed(() => {
  if (!state.draftStartDate || !state.draftEndDate) {
    return false;
  }

  return !dayjs(state.draftStartDate).isAfter(state.draftEndDate, 'day');
});
const hasMaxRange = computed(() => Number.isFinite(props.maxRangeDays) && props.maxRangeDays > 0);

const normalizeDate = (value) => {
  if (!value) {
    return null;
  }

  return dayjs(value).startOf('day').toDate();
};

const sortDates = dates => dates
  .filter(Boolean)
  .map(normalizeDate)
  .sort((left, right) => left.getTime() - right.getTime());

const setDraftDates = ({ end, start }) => {
  state.draftStartDate = normalizeDate(start);
  state.draftEndDate = normalizeDate(end);
};

const syncDraftRange = () => {
  if (!state.draftStartDate) {
    state.draftRange = [];
    return;
  }
  if (!state.draftEndDate) {
    state.draftRange = [state.draftStartDate];
    return;
  }
  state.draftRange = sortDates([state.draftStartDate, state.draftEndDate]);
};

const allowedDates = (date) => {
  if (!hasMaxRange.value) return true;
  if (state.selectedBoundary !== 'end' || !state.draftStartDate) return true;
  return Math.abs(dayjs(date).diff(dayjs(state.draftStartDate), 'day')) < props.maxRangeDays;
};

const resolvePresetDateRange = (rangeKey) => {
  const today = dayjs().startOf('day');

  switch (rangeKey) {
    case RANGE_KEY.TODAY:
      return { end: today.toDate(), start: today.toDate() };
    case RANGE_KEY.YESTERDAY:
      return {
        end: today.subtract(1, 'day').toDate(),
        start: today.subtract(1, 'day').toDate(),
      };
    case RANGE_KEY.LAST_7_DAYS:
      return { end: today.toDate(), start: today.subtract(6, 'day').toDate() };
    case RANGE_KEY.LAST_30_DAYS:
      return { end: today.toDate(), start: today.subtract(29, 'day').toDate() };
    case RANGE_KEY.WEEK_TO_DATE:
      return { end: today.toDate(), start: today.startOf('week').toDate() };
    case RANGE_KEY.MONTH_TO_DATE:
      return { end: today.toDate(), start: today.startOf('month').toDate() };
    default:
      return {
        end: normalizeDate(endDate.value),
        start: normalizeDate(startDate.value),
      };
  }
};

const isSameDay = (left, right) => {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return dayjs(left).isSame(right, 'day');
};

const inferRangeKey = ({ end, start }) => {
  const comparableRanges = [
    RANGE_KEY.TODAY,
    RANGE_KEY.YESTERDAY,
    RANGE_KEY.LAST_7_DAYS,
    RANGE_KEY.LAST_30_DAYS,
    RANGE_KEY.WEEK_TO_DATE,
    RANGE_KEY.MONTH_TO_DATE,
  ];

  const matchedRangeKey = comparableRanges.find((rangeKey) => {
    const presetRange = resolvePresetDateRange(rangeKey);

    return isSameDay(start, presetRange.start)
      && isSameDay(end, presetRange.end);
  });

  return matchedRangeKey ?? RANGE_KEY.CUSTOM;
};

const syncDraftFromModel = () => {
  const normalizedStartDate = normalizeDate(startDate.value);
  const normalizedEndDate = normalizeDate(endDate.value);

  setDraftDates({
    end: normalizedEndDate,
    start: normalizedStartDate,
  });
  syncDraftRange();
  state.selectedRangeKey = inferRangeKey({
    end: normalizedEndDate,
    start: normalizedStartDate,
  });
  if (normalizedStartDate && normalizedEndDate) {
    state.selectedBoundary = 'end';
  }
};

const handlePresetClick = (rangeKey) => {
  state.selectedRangeKey = rangeKey;
  state.selectedBoundary = 'end';

  if (rangeKey === RANGE_KEY.CUSTOM) {
    return;
  }

  const presetRange = resolvePresetDateRange(rangeKey);

  setDraftDates(presetRange);
  syncDraftRange();
};

const handleRangeUpdate = (value) => {
  const normalizedDates = sortDates(Array.isArray(value) ? value : [value]);

  if (normalizedDates.length === 0) {
    state.draftStartDate = null;
    state.draftEndDate = null;
    state.draftRange = [];
    state.selectedBoundary = 'start';
    state.selectedRangeKey = RANGE_KEY.CUSTOM;
    return;
  }

  if (state.selectedBoundary === 'start') {
    state.draftStartDate = normalizedDates[0];
    state.draftEndDate = null;
    state.draftRange = [normalizedDates[0]];
    state.selectedBoundary = 'end';
  } else {
    state.draftStartDate = normalizedDates[0];
    state.draftEndDate = normalizedDates.at(-1);
    state.draftRange = normalizedDates;
  }
  state.selectedRangeKey = RANGE_KEY.CUSTOM;
};

const handleCancel = () => {
  syncDraftFromModel();
  state.isEnabled = false;
};

const handleApply = () => {
  if (!canApply.value) {
    return;
  }

  startDate.value = normalizeDate(state.draftStartDate);
  endDate.value = normalizeDate(state.draftEndDate);
  state.isEnabled = false;

  props.onApply?.();
};

const handleSelectBoundary = (boundary) => {
  state.selectedBoundary = boundary;
  state.selectedRangeKey = RANGE_KEY.CUSTOM;
  if (boundary === 'start') {
    state.draftEndDate = null;
  }
};

watch(() => state.isEnabled, (isEnabled) => {
  if (isEnabled) {
    syncDraftFromModel();
  }
});

</script>

<template>
  <v-menu
    v-model="state.isEnabled"
    transition="scale-transition"
    :close-on-content-click="false"
    location="bottom end"
  >
    <template #activator="{ props: menuProps }">
      <v-chip
        v-bind="menuProps"
        class="px-4"
        color="primary"
        prepend-icon="mdi-calendar-month-outline"
        variant="tonal"
      >
        {{ displayedRangeLabel }}
      </v-chip>
    </template>
    <v-card rounded="md">
      <div class="selector px-4">
        <div class="sidebar">
          <v-list
            density="compact"
            class="py-4"
          >
            <v-list-item
              v-for="range in presetRanges"
              :key="range.key"
              :active="state.selectedRangeKey === range.key"
              @click="handlePresetClick(range.key)"
            >
              <v-list-item-title class="text-body-2">
                {{ range.title }}
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </div>
        <v-divider vertical />
        <div class="py-4 pl-4">
          <v-row class="mb-1">
            <v-col
              cols="12"
              md="5"
            >
              <button
                class="date-button w-100 px-3 py-2"
                :class="{ 'date-button--active': state.selectedBoundary === 'start' }"
                @click="handleSelectBoundary('start')"
              >
                <div class="date-button-label">
                  {{ $t('__fieldStartDate') }}
                </div>
                <div
                  class="date-button-value"
                  :class="{ 'date-button-value--placeholder': !state.draftStartDate }"
                >
                  {{ formatDisplayDate(state.draftStartDate) }}
                </div>
              </button>
            </v-col>
            <v-col
              cols="12"
              md="2"
              class="d-flex align-center justify-center"
            >
              <v-icon icon="mdi-arrow-right" />
            </v-col>
            <v-col
              cols="12"
              md="5"
            >
              <button
                class="date-button w-100 px-3 py-2"
                :class="{ 'date-button--active': state.selectedBoundary === 'end' }"
                @click="handleSelectBoundary('end')"
              >
                <div class="date-button-label">
                  {{ $t('__fieldEndDate') }}
                </div>
                <div
                  class="date-button-value"
                  :class="{ 'date-button-value--placeholder': !state.draftEndDate }"
                >
                  {{ formatDisplayDate(state.draftEndDate) }}
                </div>
              </button>
            </v-col>
          </v-row>
          <v-date-picker
            :model-value="state.draftRange"
            :allowed-dates="allowedDates"
            color="primary"
            no-title
            hide-header
            multiple="range"
            @update:model-value="handleRangeUpdate"
          />
          <div
            v-if="hasMaxRange"
            class="d-flex align-center text-body-2 text-medium-emphasis mt-2 mb-2"
          >
            <v-icon
              icon="mdi-information-outline"
              color="primary"
              class="mr-1"
            />
            <span>{{ $t('__hintDateRangeMaxDays') }}</span>
          </div>
        </div>
      </div>
      <v-divider :thickness="1" />
      <v-card-actions class="actions justify-end pa-4">
        <AppButton
          :text="$t('__actionCancel')"
          color="actionButton"
          :width="100"
          @click="handleCancel"
        />
        <AppButton
          :disabled="!canApply"
          :text="$t('__actionApply')"
          color="primary"
          :width="100"
          @click="handleApply"
        />
      </v-card-actions>
    </v-card>
  </v-menu>
</template>

<style lang="scss" scoped>
.selector {
  display: grid;
  grid-template-columns: 180px auto minmax(0, 1fr);
  background-color: rgb(var(--v-theme-backgroundScale1));
}

.actions {
  background-color: rgb(var(--v-theme-backgroundScale1));
}

.sidebar {
  max-height: 420px;
  overflow-y: auto;
  background-color: rgb(var(--v-theme-backgroundScale1)) !important;

  .v-list {
    background-color: rgb(var(--v-theme-backgroundScale1)) !important;
  }
}

.date-button {
  background: rgb(var(--v-theme-backgroundScale3));
  border: 1px solid transparent;
  border-radius: 4px;
  text-align: left;
}

.date-button--active {
  border: 1px solid rgba(var(--v-theme-primary));
}

.date-button-label {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 12px;
}

.date-button-value {
  color: rgb(var(--v-theme-on-surface));
}

.date-button-value--placeholder {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
</style>
