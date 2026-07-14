// Fixture-backed data-lake service: reads captured query snapshots from public/demo
// (produced by scripts/capture-fixtures.mjs) and returns Nuxt AsyncData ({ data, error,
// pending }) so call sites match the rest of useServer(). The demo runs fully offline —
// page loads hit only same-origin static JSON, never the live API.
//
// One method per query_type of the ym_hackathon catalog (ym_datalake/schema.py): the 20
// tables are each a generic `SELECT * FROM <table> WHERE …`, plus the 3 derived types
// (fleet_positions, ship_speed_power, predict_targets). Only the types the dashboard
// actually reads are exposed — and captured.
//
// Methods are flat, not nested under a namespace object — useServer()'s lazyService() wraps this
// module in a Proxy whose get trap assumes every property is a directly-callable method (see
// useServer.js), so a nested namespace object would resolve to a function, not the object.
//
// A live mode can later branch inside query() on runtimeConfig.public.datalakeSource
// without changing any caller.

/**
 * @import { AsyncData } from 'nuxt/app'
 */

// index.json (cache-key → filename) is fetched once and shared.
let indexPromise = null;
const loadIndex = () => (indexPromise ??= $fetch('/demo/index.json'));

/**
 * @param {string} type - query_type, matching the capture list
 * @param {object} params - must mirror how the app calls it (e.g. {} for full history)
 * @returns {AsyncData<object[], Error>}
 */
const query = (type, params = {}, { lazy = true } = {}) => {
  const key = `${type}:${JSON.stringify(params)}`;
  return useAsyncData(`datalake:${key}`, async () => {
    const index = await loadIndex();
    const file = index[key];
    // Missing fixture → empty set (chart/table empty-states handle it), same as a no-row query.
    if (!file) return [];
    return $fetch(`/demo/${file}`);
  }, {
    lazy,
  });
};

// A day range accepts either bound alone, both, or neither (⇒ full history). Only the tables
// with a relative-day axis accept it; every query_type is `extra='forbid'` on unlisted params,
// so day range is opt-in per type rather than folded into a shared byShip() helper.
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

export default function datalake() {
  return {
    // Fleet-level (no params → opts is the only arg)
    dimVessel: noParam('dim_vessel'),
    fleetPositions: noParam('fleet_positions'),
    factRecommendation: noParam('fact_recommendation'),
    predictTargets: noParam('predict_targets'),
    // agg_fleet_daily binds fleet_id='ALL' (the whole-fleet rollup row) when the param is
    // omitted; pass fleetId to scope to a sub-fleet instead. There is no "every fleet in one
    // call" — the rollup and its two sub-fleets share the table.
    aggFleetDaily: ({ fleetId, startDay, endDay } = {}, opts) =>
      query('agg_fleet_daily', { ...(fleetId && { fleet_id: fleetId }), ...dayRangeParams({ startDay, endDay }) }, opts),
    // fact_alert / fact_maintenance_recommendation are fleet-wide with no ship_id, per-ship with one.
    factAlert: ({ shipId, severity } = {}, opts) =>
      query('fact_alert', { ...(shipId && { ship_id: shipId }), ...(severity && { severity }) }, opts),
    factMaintenanceRecommendation: ({ shipId } = {}, opts) =>
      query('fact_maintenance_recommendation', shipId ? { ship_id: shipId } : {}, opts),

    // Ship-scoped (all keyed by { shipId })
    factPerformanceDaily: byShipWithDayRange('fact_performance_daily'),
    factPerformanceIndicator: byShip('fact_performance_indicator'),
    factAnomaly: byShip('fact_anomaly'),
    factUwi: byShip('fact_uwi'),
    factSpeedProfile: byShip('fact_speed_profile'),
    shipSpeedPower: byShip('ship_speed_power'),
  };
}
