import { defineStore } from 'pinia';

// Cross-tab date-range filter for trend charts (day-index, matching every other date in the
// lake). Deliberately holds only the range itself — never anything a KPI or "即時狀態" tile
// reads, those must stay anchored to the fleet's true current state regardless of what
// historical window a viewer is browsing here. `init` is called once, from the dashboard page,
// off the same agg_fleet_daily rows that already compute the "資料期間" header label — no
// separate fetch.
export const useChartRangeStore = defineStore('chartRange', () => {
  const boundsStartDay = ref(0);
  const boundsEndDay = ref(0);
  const startDay = ref(0);
  const endDay = ref(0);
  const initialized = ref(false);

  const init = (rows) => {
    if (initialized.value || !rows?.length) return;
    boundsStartDay.value = rows[0].noon_utc;
    boundsEndDay.value = rows.at(-1).noon_utc;
    startDay.value = boundsStartDay.value;
    endDay.value = boundsEndDay.value;
    initialized.value = true;
  };

  const isFull = computed(() => startDay.value === boundsStartDay.value && endDay.value === boundsEndDay.value);

  const setRange = (start, end) => {
    startDay.value = start;
    endDay.value = end;
  };

  const reset = () => {
    startDay.value = boundsStartDay.value;
    endDay.value = boundsEndDay.value;
  };

  return {
    boundsStartDay,
    boundsEndDay,
    startDay,
    endDay,
    isFull,
    init,
    setRange,
    reset,
  };
});
