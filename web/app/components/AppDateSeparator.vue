<script setup>
const props = defineProps({
  index: {
    type: Number,
    default: 0,
  },
  dates: {
    type: Array,
    default: () => [],
  },
});

const dayjs = useDayjs();
const { t } = useI18n();

const monthMap = {
  1: '__titleMonthJanuary',
  2: '__titleMonthFebruary',
  3: '__titleMonthMarch',
  4: '__titleMonthApril',
  5: '__titleMonthMay',
  6: '__titleMonthJune',
  7: '__titleMonthJuly',
  8: '__titleMonthAugust',
  9: '__titleMonthSeptember',
  10: '__titleMonthOctober',
  11: '__titleMonthNovember',
  12: '__titleMonthDecember',
};

const getLabel = (date) => {
  const targetDate = dayjs(date).startOf('day');
  const today = dayjs().startOf('day');
  const diffDays = today.diff(targetDate, 'day');
  const month = targetDate.format('M');
  const year = targetDate.format('YYYY');
  if (diffDays === 0) return t('__titleToday');
  if (diffDays === 1) return t('__titleYesterday');
  if (diffDays <= 7) return strUtils.addSpacesAroundAscii(t('__titlePreviousDays', { days: 7 }));
  if (diffDays <= 30) return strUtils.addSpacesAroundAscii(t('__titlePreviousDays', { days: 30 }));
  return today.isSame(targetDate, 'year')
    ? strUtils.addSpacesAroundAscii(t(monthMap[month]))
    : strUtils.addSpacesAroundAscii(t('__titleYearMonth', { year, month: t(monthMap[month]) }));
};

const showLabel = (dates, index) => {
  if (index === 0) return true;
  const prevDate = dates[index - 1];
  return getLabel(dates[index]) !== getLabel(prevDate);
};
</script>

<template>
  <v-sheet
    v-if="showLabel(props.dates, props.index)"
    color="background"
    class="text-caption font-weight-bold py-2 position-sticky top-0 z-index-1"
    :class="[props.index > 0 ? 'mt-4' : 'mt-0']"
  >
    {{ getLabel(props.dates[props.index]) }}
  </v-sheet>
</template>
