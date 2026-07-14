// Fixture-backed data-lake service: reads captured query snapshots from
// public/demo/{v1,v2} (produced by scripts/capture-fixtures.mjs for v2; v1 is
// the older PoC capture, frozen — its live endpoint no longer serves those
// query types) and returns Nuxt AsyncData ({ data, error, pending }) so call
// sites match the rest of useServer(). The demo runs fully offline — page
// loads hit only same-origin static JSON, never the live API.
//
// v1 (public/demo/v1) is the synthetic PoC catalog: imo_number identity,
// calendar dates, fleet grouping, lat/lon, voyages, and cost/CII/UWI-detail
// fields. v2 (public/demo/v2) is the real hackathon dataset: ship_id identity
// (a disjoint roster from v1's — S1-S23 vs 9700001-9700009, not the same
// vessels), per-ship relative days, and no fleet grouping/lat-lon/voyages/cost
// data at all. See doc/api_v2.md (ym-hackathon repo) §4 for the full mapping.
//
// Components should prefer v2 (server.datalake.v2FleetOverview(), etc.) wherever a query type
// exists there; fall back to v1 (server.datalake.v1FleetOverview(), etc.) only for charts whose
// backing fields v2 has no counterpart for (cost, CII, UWI detail, map,
// voyages, speed-profile reference curve) — and mark those with
// <AppDataSourceBadge version="v1" /> so the fallback is visible in the UI.
//
// Methods are flat (v1Xxx/v2Xxx), not nested under .v1/.v2 — useServer()'s lazyService() wraps
// this module in a Proxy whose get trap assumes every property is a directly-callable method
// (see useServer.js), so a nested namespace object would resolve to a function, not the object.
//
// A live mode can later branch inside query() on runtimeConfig.public.datalakeSource
// without changing any caller.

/**
 * @import { AsyncData } from 'nuxt/app'
 */

// Each version's index.json (cache-key → filename) is fetched once and shared.
const indexPromiseByVersion = {};
const loadIndex = version => (indexPromiseByVersion[version] ??= $fetch(`/demo/${version}/index.json`));

function makeQuery(version) {
  /**
   * @param {string} type - query_type, matching the capture list
   * @param {object} params - must mirror how the app calls it (e.g. {} for full history)
   * @returns {AsyncData<object[], Error>}
   */
  return (type, params = {}, { lazy = true } = {}) => {
    const key = `${type}:${JSON.stringify(params)}`;
    return useAsyncData(`datalake:${version}:${key}`, async () => {
      const index = await loadIndex(version);
      const file = index[key];
      // Missing fixture → empty set (chart/table empty-states handle it), same as a no-row query.
      if (!file) return [];
      return $fetch(`/demo/${version}/${file}`);
    }, {
      lazy,
    });
  };
}

function datalakeV2() {
  const query = makeQuery('v2');

  // dayRange lets callers narrow to { startDay, endDay } (both optional); a day
  // range accepts either bound alone, both, or neither (⇒ full history). Only
  // fleet_overview, vessel_metrics, and vessel_speed_loss accept it — every
  // other v2 type is `extra='forbid'` on unlisted params, so day range is opt-in
  // per query type rather than folded into a shared byShip() helper.
  const dayRangeParams = ({ startDay, endDay } = {}) => ({
    ...(startDay !== undefined && { start_day: startDay }),
    ...(endDay !== undefined && { end_day: endDay }),
  });
  const noParam = type => opts => query(type, {}, opts);
  // Ship-scoped, ship_id only (no day range accepted by the query_type).
  const byShip = type => ({ shipId } = {}, opts) => query(type, { ship_id: shipId }, opts);
  // Ship-scoped with an optional { startDay, endDay } narrowing.
  const byShipWithDayRange = type => ({ shipId, startDay, endDay } = {}, opts) =>
    query(type, { ship_id: shipId, ...dayRangeParams({ startDay, endDay }) }, opts);

  return {
    // Escape hatch for direct (type, params) access, mirroring the PoC's query().
    query,

    // Fleet-level (no params → opts is the only arg)
    fleetVessels: noParam('fleet_vessels'),
    fleetMaintenanceRecommendation: noParam('fleet_maintenance_recommendation'),
    fleetOverview: (range, opts) => query('fleet_overview', dayRangeParams(range), opts),
    fleetAlerts: ({ severity } = {}, opts) => query('fleet_alerts', severity ? { severity } : {}, opts),
    predictTargets: ({ shipId } = {}, opts) => query('predict_targets', shipId ? { ship_id: shipId } : {}, opts),

    // Vessel-level (all keyed by { shipId })
    vesselMetrics: byShipWithDayRange('vessel_metrics'),
    vesselSpeedLoss: byShipWithDayRange('vessel_speed_loss'),
    vesselSpeedPower: byShip('vessel_speed_power'),
    vesselMaintenanceEffect: byShip('vessel_maintenance_effect'),
    vesselAnomalies: byShip('vessel_anomalies'),
    vesselAlerts: byShip('vessel_alerts'),
    vesselMaintenanceRecommendation: byShip('vessel_maintenance_recommendation'),
  };
}

function datalakeV1() {
  const query = makeQuery('v1');

  const byImo = type => ({ imoNumber } = {}, opts) => query(type, { imo_number: imoNumber }, opts);
  const noParam = type => opts => query(type, {}, opts);

  return {
    // Escape hatch for direct (type, params) access, mirroring the PoC's query().
    query,

    // Fleet-level (no params → opts is the only arg)
    fleetVessels: noParam('fleet_vessels'),
    fleetList: noParam('fleet_list'),
    fleetPositions: noParam('fleet_positions'),
    fleetMaintenanceRecommendation: noParam('fleet_maintenance_recommendation'),
    // {} = all-fleet rollup (matches the app), else scoped to a sub-fleet.
    fleetOverview: ({ fleetId } = {}, opts) => query('fleet_overview', fleetId ? { fleet_id: fleetId } : {}, opts),
    fleetAlerts: ({ fleetId } = {}, opts) => query('fleet_alerts', fleetId ? { fleet_id: fleetId } : {}, opts),

    // Vessel-level (all keyed by { imoNumber })
    vesselSpeedLoss: byImo('vessel_speed_loss'),
    vesselMetrics: byImo('vessel_metrics'),
    vesselSpeedPower: byImo('vessel_speed_power'),
    vesselAnomalies: byImo('vessel_anomalies'),
    vesselAlerts: byImo('vessel_alerts'),
    vesselMaintenanceEffect: byImo('vessel_maintenance_effect'),
    vesselRecommendation: byImo('vessel_recommendation'),
    vesselMaintenanceRecommendation: byImo('vessel_maintenance_recommendation'),
    vesselUwi: byImo('vessel_uwi'),
    vesselTrack: byImo('vessel_track'),
    vesselVoyages: byImo('vessel_voyages'),
    vesselSpeedProfile: byImo('vessel_speed_profile'),
  };
}

const prefixKeys = (prefix, obj) => Object.fromEntries(
  Object.entries(obj).map(([key, value]) => [`${prefix}${key[0].toUpperCase()}${key.slice(1)}`, value]),
);

export default function datalake() {
  return {
    ...prefixKeys('v1', datalakeV1()),
    ...prefixKeys('v2', datalakeV2()),
  };
}
