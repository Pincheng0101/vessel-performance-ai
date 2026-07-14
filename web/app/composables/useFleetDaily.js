// Per-ship daily fan-out, shared by the fleet and executive tabs. Both need fleet-wide counts
// and sums, and neither can take them off an agg_fleet_daily row — that row only covers the
// ships that reported that day (see fleetUtils). Nuxt dedupes on the useAsyncData key, so the
// second tab to call this pays no extra request.
export default async function useFleetDaily() {
  const server = useServer();
  const { data: ships } = await server.datalake.dimVessel({ lazy: false });
  const roster = ships.value ?? [];
  const performanceData = await Promise.all(
    roster.map(v => server.datalake.factPerformanceDaily({ shipId: v.ship_id }, { lazy: false })),
  );

  const dailyByShip = computed(() => Object.fromEntries(
    roster.map((v, i) => [v.ship_id, performanceData[i].data.value ?? []]),
  ));
  const snapshot = computed(() => fleetUtils.snapshot(dailyByShip.value));
  const monthly = computed(() => fleetUtils.monthly(dailyByShip.value));
  // The fleet's most recent calendar day — not every ship reported on it.
  const latestDate = computed(() => Object.values(dailyByShip.value)
    .map(rows => rows.at(-1)?.report_date)
    .filter(Boolean)
    .sort()
    .at(-1) ?? '');

  return {
    roster,
    dailyByShip,
    snapshot,
    monthly,
    latestDate,
  };
}
