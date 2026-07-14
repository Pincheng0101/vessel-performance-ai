export function useElapsedDuration({ startedAt, endedAt }) {
  const dayjs = useDayjs();
  const now = ref(Date.now());
  let timer = null;

  const start = () => {
    if (timer) return;
    now.value = Date.now();
    timer = setInterval(() => {
      now.value = Date.now();
    }, 1000);
  };

  const stop = () => {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
  };

  const startedAtRef = computed(startedAt);
  const endedAtRef = computed(endedAt);

  watch([startedAtRef, endedAtRef], ([started, ended]) => {
    if (started && !ended) start();
    else stop();
  }, { immediate: true });

  onBeforeUnmount(stop);

  const seconds = computed(() => {
    const started = startedAtRef.value;
    if (!started) return 0;
    const endMs = endedAtRef.value ?? now.value;
    return Math.max(0, Math.floor((endMs - started) / 1000));
  });

  const formatted = computed(() => {
    const s = seconds.value;
    const d = dayjs.duration(s, 'seconds');
    const h = Math.floor(d.asHours());
    if (h > 0) return `${h}h ${d.minutes()}m ${d.seconds()}s`;
    if (d.minutes() > 0) return `${d.minutes()}m ${d.seconds()}s`;
    return `${d.seconds()}s`;
  });

  return { seconds, formatted };
}
