// v2 (ship_id: S1-S12 training, S21-S23 prediction) and v1 (imo_number:
// 9700001-9700009) are disjoint vessel identities — v2 is a different, real
// dataset, not a superset of v1's synthetic fleet. Selection here is v2-first:
// `shipId` drives every v2-backed chart and the URL (`?ship=`). For the
// handful of sections that have no v2 data source at all (cost/CII/UWI-detail
// — see AppDataSourceBadge callers), `fallbackImo` gives them a *stable* v1
// vessel to show per selected ship, so switching ships doesn't jitter which
// v1 vessel appears. It is not "the same vessel", just a deterministic demo
// stand-in — those sections carry a v1 badge so this is visible in the UI.
export default async function useDashboardVesselSelection() {
  const server = useServer();
  const route = useRoute();
  const router = useRouter();
  // Floors the Suspense fallback at 1s — without it, a cache-warm reload can resolve fast
  // enough that the loading illustration flashes for a single frame.
  const [{ data: ships }, { data: v1Vessels }] = await Promise.all([
    server.datalake.v2FleetVessels({ lazy: false }),
    server.datalake.v1FleetVessels({ lazy: false }),
    delay(1000),
  ]);

  const roster = computed(() => ships.value ?? []);
  const v1Roster = computed(() => v1Vessels.value ?? []);
  const options = computed(() => roster.value.map(v => ({
    title: v.ship_id,
    value: v.ship_id,
    isPrediction: /^S2[1-3]$/.test(v.ship_id),
  })));
  const getQueryValue = value => (Array.isArray(value) ? value[0] : value);
  const resolveShipId = value => roster.value.find(v => v.ship_id === value)?.ship_id ?? null;
  const shipId = ref(resolveShipId(getQueryValue(route.query.ship)) ?? roster.value[0]?.ship_id ?? null);
  const selectedVessel = computed(() => roster.value.find(v => v.ship_id === shipId.value) ?? {});

  // Deterministic (not physically meaningful) v1 stand-in — see file comment above.
  const fallbackImo = computed(() => {
    if (!v1Roster.value.length || !shipId.value) return null;
    const index = Number(shipId.value.replace(/\D/g, '')) % v1Roster.value.length;
    return v1Roster.value[index]?.imo_number ?? null;
  });

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
    fallbackImo,
    options,
    roster,
    selectedVessel,
  };
}
