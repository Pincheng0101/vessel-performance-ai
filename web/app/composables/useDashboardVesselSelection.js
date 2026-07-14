// Shared vessel selection for the ship-scoped dashboard tabs (deep-dive, speed optimizer).
// `shipId` (S1-S12 training, S21-S23 prediction) is the fleet's canonical identity and drives
// both the charts and the URL (`?ship=`).
export default async function useDashboardVesselSelection() {
  const server = useServer();
  const route = useRoute();
  const router = useRouter();
  // Floors the Suspense fallback at 1s — without it, a cache-warm reload can resolve fast
  // enough that the loading illustration flashes for a single frame.
  const [{ data: ships }] = await Promise.all([
    server.datalake.dimVessel({ lazy: false }),
    delay(1000),
  ]);

  const roster = computed(() => ships.value ?? []);
  const options = computed(() => roster.value.map(v => ({
    title: v.ship_id,
    value: v.ship_id,
    isPrediction: /^S2[1-3]$/.test(v.ship_id),
  })));
  const getQueryValue = value => (Array.isArray(value) ? value[0] : value);
  const resolveShipId = value => roster.value.find(v => v.ship_id === value)?.ship_id ?? null;
  const shipId = ref(resolveShipId(getQueryValue(route.query.ship)) ?? roster.value[0]?.ship_id ?? null);
  const selectedVessel = computed(() => roster.value.find(v => v.ship_id === shipId.value) ?? {});

  const vesselScopedTabs = new Set(['vessel', 'optimizer']);

  watch(() => route.query.ship, (after) => {
    const next = resolveShipId(getQueryValue(after));
    if (next && next !== shipId.value) shipId.value = next;
  });

  watch(shipId, (after) => {
    const tab = getQueryValue(route.query.tab);
    const currentShip = getQueryValue(route.query.ship);
    if (!after || !vesselScopedTabs.has(tab) || currentShip === after) return;
    router.replace({
      query: {
        ...route.query,
        ship: after,
      },
    });
  });

  return {
    shipId,
    options,
    roster,
    selectedVessel,
  };
}
