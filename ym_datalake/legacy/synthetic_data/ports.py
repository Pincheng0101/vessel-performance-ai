"""Port coordinates, great-circle geometry, and bent route paths (STDLIB ONLY).

Imported at ``cdk synth`` time (like ``fleet.py``), so it must not import numpy or
any generator-only dependency — only the standard-library ``math``.

Positions are **decorative**: they carry the spatial dimension through curated →
API → map but never feed physics (fuel/CII/C3 key off distance & speed, never
lat/lon). Routes bend through ocean waypoints (Suez/Malacca) so the map arcs stay
over water; ``route_path`` assembles ``[A, *waypoints, B]`` and ``path_point``
walks it by cumulative great-circle distance (slerp within the active segment, so
it is antimeridian-safe — it never linearly interpolates longitude).
"""

from __future__ import annotations

import math

# Earth mean radius in nautical miles (6371.0088 km / 1.852 km·nm⁻¹).
_EARTH_RADIUS_NM = 3440.065

# Real port coordinates for the fleet's 10 LOCODEs. ``is_eu`` gates the Phase 3
# EU-scope join (only the two European ports, Rotterdam + Hamburg).
PORTS: dict[str, dict] = {
    'SGSIN': {'name': 'Singapore', 'lat': 1.27, 'lon': 103.83, 'is_eu': False},
    'NLRTM': {'name': 'Rotterdam', 'lat': 51.95, 'lon': 4.14, 'is_eu': True},
    'KRPUS': {'name': 'Busan', 'lat': 35.10, 'lon': 129.04, 'is_eu': False},
    'CNSHA': {'name': 'Shanghai', 'lat': 31.23, 'lon': 121.50, 'is_eu': False},
    'LKCMB': {'name': 'Colombo', 'lat': 6.95, 'lon': 79.85, 'is_eu': False},
    'AEDXB': {'name': 'Dubai', 'lat': 25.01, 'lon': 55.06, 'is_eu': False},
    'USLAX': {'name': 'Los Angeles', 'lat': 33.74, 'lon': -118.27, 'is_eu': False},
    'DEHAM': {'name': 'Hamburg', 'lat': 53.53, 'lon': 9.92, 'is_eu': True},
    'JPTYO': {'name': 'Tokyo', 'lat': 35.62, 'lon': 139.77, 'is_eu': False},
    'HKHKG': {'name': 'Hong Kong', 'lat': 22.30, 'lon': 114.17, 'is_eu': False},
}

# Ocean waypoints bending a leg around land, keyed by the undirected port pair.
# Listed A→B for one direction; ``route_path`` reverses them for the other.
# AEDXB↔Europe threads Bab-el-Mandeb → Suez → Port Said → Gibraltar → Ushant;
# SGSIN↔LKCMB pulls north through the Malacca/Andaman region. Any pair not listed
# uses the direct great circle.
ROUTE_WAYPOINTS: dict[frozenset[str], list[tuple[float, float]]] = {
    frozenset({'AEDXB', 'DEHAM'}): [(12.6, 43.4), (30.0, 32.6), (31.5, 32.3), (35.95, -5.6), (48.5, -5.5)],
    frozenset({'AEDXB', 'NLRTM'}): [(12.6, 43.4), (30.0, 32.6), (31.5, 32.3), (35.95, -5.6), (48.5, -5.5)],
    frozenset({'SGSIN', 'LKCMB'}): [(5.5, 95.0)],
}


def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance between two lat/lon points, in nautical miles."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    return 2.0 * _EARTH_RADIUS_NM * math.asin(min(1.0, math.sqrt(a)))


def _to_vec(lat: float, lon: float) -> tuple[float, float, float]:
    phi, lam = math.radians(lat), math.radians(lon)
    return (math.cos(phi) * math.cos(lam), math.cos(phi) * math.sin(lam), math.sin(phi))


def _to_latlon(v: tuple[float, float, float]) -> tuple[float, float]:
    x, y, z = v
    return (math.degrees(math.asin(max(-1.0, min(1.0, z)))), math.degrees(math.atan2(y, x)))


def gc_point(lat1: float, lon1: float, lat2: float, lon2: float, frac: float) -> tuple[float, float]:
    """Point at fraction ``frac`` (0→1) along the great circle from 1 to 2.

    Uses 3-D unit-vector spherical linear interpolation (slerp), so it is
    antimeridian-safe — no direct longitude interpolation.
    """
    v1 = _to_vec(lat1, lon1)
    v2 = _to_vec(lat2, lon2)
    dot = max(-1.0, min(1.0, sum(a * b for a, b in zip(v1, v2))))
    omega = math.acos(dot)
    if omega < 1e-9:
        return (lat1, lon1)
    sin_omega = math.sin(omega)
    s1 = math.sin((1.0 - frac) * omega) / sin_omega
    s2 = math.sin(frac * omega) / sin_omega
    return _to_latlon((s1 * v1[0] + s2 * v2[0], s1 * v1[1] + s2 * v2[1], s1 * v1[2] + s2 * v2[2]))


def route_path(a_locode: str, b_locode: str) -> list[tuple[float, float]]:
    """Ordered ``[A, *waypoints, B]`` lat/lon path from port A to port B.

    Waypoints (if any) are oriented so the list runs from the A end to the B end.
    """
    a, b = PORTS[a_locode], PORTS[b_locode]
    start = (a['lat'], a['lon'])
    end = (b['lat'], b['lon'])
    wps = ROUTE_WAYPOINTS.get(frozenset({a_locode, b_locode}), [])
    if wps and len(wps) > 1:
        # Orient: keep as stored if A is nearer the first waypoint, else reverse.
        d_first = haversine(start[0], start[1], wps[0][0], wps[0][1])
        d_last = haversine(start[0], start[1], wps[-1][0], wps[-1][1])
        if d_first > d_last:
            wps = list(reversed(wps))
    return [start, *wps, end]


def path_distance_nm(path: list[tuple[float, float]]) -> float:
    """Sum of great-circle distances over consecutive points, in nautical miles."""
    return sum(haversine(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1]) for i in range(len(path) - 1))


def path_point(path: list[tuple[float, float]], frac: float) -> tuple[float, float]:
    """Point ``frac`` (0→1) of the way along the multi-segment ``path`` by distance."""
    frac = max(0.0, min(1.0, frac))
    seg_dists = [haversine(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1]) for i in range(len(path) - 1)]
    total = sum(seg_dists)
    if total <= 0.0:
        return path[0]
    target = frac * total
    acc = 0.0
    for i, d in enumerate(seg_dists):
        if target <= acc + d or i == len(seg_dists) - 1:
            seg_frac = max(0.0, min(1.0, (target - acc) / d)) if d > 0 else 0.0
            a, b = path[i], path[i + 1]
            return gc_point(a[0], a[1], b[0], b[1], seg_frac)
        acc += d
    return path[-1]
