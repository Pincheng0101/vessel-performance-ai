// Port coordinates + bent-route waypoints for the fleet map, mirroring the PoC's
// ym-datalake-poc/web/ports.js (kept in sync with ym_datalake/synthetic_data/ports.py).
// Positions are decorative — used only to draw the planned-route arcs, never physics.

const Port = Object.freeze({
  SGSIN: { name: 'Singapore', lat: 1.27, lon: 103.83, isEu: false },
  NLRTM: { name: 'Rotterdam', lat: 51.95, lon: 4.14, isEu: true },
  KRPUS: { name: 'Busan', lat: 35.1, lon: 129.04, isEu: false },
  CNSHA: { name: 'Shanghai', lat: 31.23, lon: 121.5, isEu: false },
  LKCMB: { name: 'Colombo', lat: 6.95, lon: 79.85, isEu: false },
  AEDXB: { name: 'Dubai', lat: 25.01, lon: 55.06, isEu: false },
  USLAX: { name: 'Los Angeles', lat: 33.74, lon: -118.27, isEu: false },
  DEHAM: { name: 'Hamburg', lat: 53.53, lon: 9.92, isEu: true },
  JPTYO: { name: 'Tokyo', lat: 35.62, lon: 139.77, isEu: false },
  HKHKG: { name: 'Hong Kong', lat: 22.3, lon: 114.17, isEu: false },
});

// Ocean waypoints [lat, lon] keyed by the sorted "A|B" LOCODE pair, so a planned-route arc
// bends through the real shipping lane instead of cutting a straight line across land.
// AEDXB<->Europe threads Bab-el-Mandeb -> Suez -> Port Said -> Gibraltar -> Ushant;
// SGSIN<->LKCMB pulls north through the Malacca/Andaman region. Any pair not listed here
// draws a direct line.
const SUEZ_WAYPOINTS = [
  [12.6, 43.4],
  [30.0, 32.6],
  [31.5, 32.3],
  [35.95, -5.6],
  [48.5, -5.5],
];
const RouteWaypoints = Object.freeze({
  'AEDXB|DEHAM': SUEZ_WAYPOINTS,
  'AEDXB|NLRTM': SUEZ_WAYPOINTS,
  'LKCMB|SGSIN': [[5.5, 95.0]],
});

// Ordered [lon, lat] path A -> B (ECharts geo coordinates are [lon, lat]), waypoints
// oriented so the path always runs from A's end toward B's end.
const routePath = (aLocode, bLocode) => {
  const a = Port[aLocode];
  const b = Port[bLocode];
  if (!a || !b) return null;
  const start = [a.lon, a.lat];
  const end = [b.lon, b.lat];
  let waypoints = RouteWaypoints[[aLocode, bLocode].sort().join('|')] || [];
  if (waypoints.length > 1) {
    const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    const first = [waypoints[0][1], waypoints[0][0]];
    const last = [waypoints.at(-1)[1], waypoints.at(-1)[0]];
    if (dist(start, first) > dist(start, last)) waypoints = [...waypoints].reverse();
  }
  return [start, ...waypoints.map(([lat, lon]) => [lon, lat]), end];
};

export {
  Port,
  routePath,
};
