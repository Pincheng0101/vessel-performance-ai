export default function useUsageDateRange() {
  const dayjs = useDayjs();

  const defaultEndDateTs = dayjs().startOf('day').valueOf();
  const defaultStartDateTs = dayjs(defaultEndDateTs).subtract(6, 'day').valueOf();

  const startDateTs = useState('usage-start-date-ts', () => defaultStartDateTs);
  const endDateTs = useState('usage-end-date-ts', () => defaultEndDateTs);

  const startDate = computed({
    get: () => startDateTs.value == null ? null : new Date(startDateTs.value),
    set: (value) => {
      startDateTs.value = value == null ? null : dayjs(value).startOf('day').valueOf();
    },
  });

  const endDate = computed({
    get: () => endDateTs.value == null ? null : new Date(endDateTs.value),
    set: (value) => {
      endDateTs.value = value == null ? null : dayjs(value).startOf('day').valueOf();
    },
  });

  return {
    startDate,
    endDate,
  };
}
