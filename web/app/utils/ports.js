// Port coordinates + bent-route waypoints — the JS mirror of
// ym_datalake/synthetic_data/ports.py. Keep the two in sync: the map draws the
// same 10 static ports and threads the same Suez/Malacca waypoints the generator
// walks, so planned-route arcs match the vessel tracks. Positions are decorative.

export const PORTS = {
  SGSIN: { name: 'Singapore', lat: 1.27, lon: 103.83, is_eu: false },
  NLRTM: { name: 'Rotterdam', lat: 51.95, lon: 4.14, is_eu: true },
  KRPUS: { name: 'Busan', lat: 35.1, lon: 129.04, is_eu: false },
  CNSHA: { name: 'Shanghai', lat: 31.23, lon: 121.5, is_eu: false },
  LKCMB: { name: 'Colombo', lat: 6.95, lon: 79.85, is_eu: false },
  AEDXB: { name: 'Dubai', lat: 25.01, lon: 55.06, is_eu: false },
  USLAX: { name: 'Los Angeles', lat: 33.74, lon: -118.27, is_eu: false },
  DEHAM: { name: 'Hamburg', lat: 53.53, lon: 9.92, is_eu: true },
  JPTYO: { name: 'Tokyo', lat: 35.62, lon: 139.77, is_eu: false },
  HKHKG: { name: 'Hong Kong', lat: 22.3, lon: 114.17, is_eu: false },
};

// Ocean waypoints [ [lat, lon], ... ] keyed by the sorted "A|B" LOCODE pair.
// AEDXB↔Europe threads Bab-el-Mandeb → Suez → Port Said → Gibraltar → Ushant;
// SGSIN↔LKCMB pulls north through the Malacca/Andaman region. Any pair not listed
// uses the direct great circle.
const _SUEZ = [
  [12.6, 43.4],
  [30.0, 32.6],
  [31.5, 32.3],
  [35.95, -5.6],
  [48.5, -5.5],
];
export const ROUTE_WAYPOINTS = {
  'AEDXB|DEHAM': _SUEZ,
  'AEDXB|NLRTM': _SUEZ,
  'LKCMB|SGSIN': [[5.5, 95.0]],
};

// Ordered [ [lat,lon], ... ] path A → B, waypoints oriented A-end → B-end.
export function routePath(aLocode, bLocode) {
  const a = PORTS[aLocode];
  const b = PORTS[bLocode];
  const start = [a.lat, a.lon];
  const end = [b.lat, b.lon];
  let wps = ROUTE_WAYPOINTS[[aLocode, bLocode].sort().join('|')] || [];
  if (wps.length > 1) {
    const hav = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (hav(start, wps[0]) > hav(start, wps[wps.length - 1])) wps = [...wps].reverse();
  }
  return [start, ...wps, end];
}
