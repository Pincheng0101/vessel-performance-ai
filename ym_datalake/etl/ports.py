"""Ports and great-circle geometry. STDLIB ONLY (imported at ``cdk synth`` time).

Everything here is **ESTIMATED**. The real dataset carries no position, no port, no
heading — only a voyage number and a daily distance. The 10 LOCODEs below are real
ports with real coordinates, but *this fleet never called at them*: geography is
draped over the real distances by ``curated.geography`` so the lake has a spatial
dimension to draw, and it never feeds a physics number back.
"""

from __future__ import annotations

import math

# Earth mean radius in nautical miles (6371.0088 km / 1.852 km.nm^-1).
_EARTH_RADIUS_NM = 3440.065

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

# Ocean waypoints bending a leg around land, keyed by the undirected port pair, so a track
# arc stays over water. Listed A->B; ``route_path`` reverses them for the other direction.
# A pair with no entry sails the direct great circle, which is only correct where there
# really is open water between the two — the Pacific crossings, the Indian Ocean.
#
# This is not decoration on decoration. Raw great circles put ships in the Rub' al Khali
# (Colombo->Dubai), inland Fujian (Shanghai->Hong Kong) and the middle of the Netherlands
# (Rotterdam->Hamburg). A fleet map with ships in the desert discredits every honest number
# standing next to it, so the arcs go where a ship could actually go.

# Dubai -> Europe: out of the Gulf clear of Ras al Khaimah, through Hormuz, round Oman and
# Ras al Hadd, along the Yemeni coast, through Bab-el-Mandeb, up the Red Sea and Suez,
# across the Mediterranean, out at Gibraltar and up the Atlantic to Ushant.
_SUEZ_ROUTE = [
    (26.10, 55.40),  # Persian Gulf, clear of Ras al Khaimah
    (26.55, 56.60),  # Strait of Hormuz
    (24.60, 58.60),  # Gulf of Oman
    (22.40, 60.80),  # off Ras al Hadd
    (20.00, 60.20),  # Arabian Sea, east of Masirah
    (18.20, 58.40),  # offshore Duqm
    (15.80, 54.60),  # offshore Salalah
    (13.20, 50.00),  # Gulf of Aden approach
    (12.50, 45.50),  # Gulf of Aden
    (12.60, 43.40),  # Bab-el-Mandeb
    (20.00, 38.50),  # Red Sea
    (27.00, 34.20),  # Red Sea, north
    (29.30, 32.90),  # Gulf of Suez
    (30.10, 32.55),  # Suez
    (31.50, 32.30),  # Port Said
    (33.80, 25.00),  # eastern Mediterranean
    (37.40, 11.20),  # Strait of Sicily
    (37.00, 3.00),  # Algerian basin
    (35.95, -5.60),  # Gibraltar
    (36.50, -9.50),  # off Cape St Vincent
    (43.00, -9.80),  # off Finisterre
    (48.50, -5.50),  # Ushant
]
# Ushant -> Hamburg: up the Channel, through Dover, across the North Sea, into the Elbe.
_CHANNEL_TO_ELBE = [(50.30, -0.50), (51.30, 1.80), (53.20, 3.60), (54.10, 7.50), (53.95, 8.60)]
# Rotterdam -> Hamburg: north of the Frisian Islands. The direct line is 250 nm of dry land.
_NORTH_SEA = [(52.60, 3.60), (53.70, 5.50), (54.10, 7.50), (53.95, 8.60)]
# Colombo -> Dubai: across the Arabian Sea, east of Ras al Hadd, in through Hormuz.
_HORMUZ_APPROACH = [(9.00, 74.00), (14.00, 62.00), (20.50, 60.50), (24.60, 58.60), (26.55, 56.60), (26.10, 55.40)]
# Singapore -> Colombo: up the Malacca Strait, offshore of Sumatra's northeast coast.
_MALACCA = [(2.00, 102.00), (3.60, 99.80), (5.00, 98.30), (6.30, 96.00)]
# Hong Kong -> Singapore: bowed east, clear of Hainan and the Vietnamese coast.
_SOUTH_CHINA_SEA = [(17.00, 112.50), (10.00, 109.50), (3.50, 105.50)]
# Shanghai -> Hong Kong: offshore of Zhejiang, down the Taiwan Strait, along Guangdong.
_TAIWAN_STRAIT = [(30.80, 123.20), (26.50, 121.80), (24.20, 119.00), (23.00, 117.00), (22.40, 115.50)]
# Busan -> Tokyo: west and south around Kyushu, then up Japan's Pacific coast. The direct
# great circle bulges north and comes back down through the Japanese Alps.
_AROUND_KYUSHU = [(34.00, 129.50), (33.20, 128.30), (31.20, 129.80), (30.50, 131.20), (33.00, 136.20), (34.30, 139.10)]
# Tokyo -> Los Angeles: down Tokyo Bay and round Cape Nojima before the Pacific great
# circle. Tokyo is a bay port, and the direct line to LA leaves it across the Boso peninsula.
_TOKYO_BAY = [(35.20, 139.75), (34.85, 139.95), (34.60, 141.20)]

ROUTE_WAYPOINTS: dict[frozenset[str], list[tuple[float, float]]] = {
    frozenset({'AEDXB', 'NLRTM'}): _SUEZ_ROUTE,
    frozenset({'AEDXB', 'DEHAM'}): _SUEZ_ROUTE + _CHANNEL_TO_ELBE,
    frozenset({'NLRTM', 'DEHAM'}): _NORTH_SEA,
    frozenset({'AEDXB', 'LKCMB'}): list(reversed(_HORMUZ_APPROACH)),
    frozenset({'SGSIN', 'LKCMB'}): _MALACCA,
    frozenset({'HKHKG', 'SGSIN'}): _SOUTH_CHINA_SEA,
    frozenset({'CNSHA', 'HKHKG'}): _TAIWAN_STRAIT,
    frozenset({'KRPUS', 'JPTYO'}): _AROUND_KYUSHU,
    frozenset({'JPTYO', 'USLAX'}): _TOKYO_BAY,
}


def dim_port_rows() -> list[dict]:
    """dim_port: one row per LOCODE."""
    return [
        {'locode': locode, 'name': p['name'], 'lat': p['lat'], 'lon': p['lon'], 'is_eu': p['is_eu']}
        for locode, p in PORTS.items()
    ]


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
    """The point at fraction ``frac`` (0->1) along the great circle from 1 to 2.

    3-D unit-vector spherical interpolation, so it is antimeridian-safe — it never
    linearly interpolates longitude.
    """
    v1, v2 = _to_vec(lat1, lon1), _to_vec(lat2, lon2)
    dot = max(-1.0, min(1.0, sum(a * b for a, b in zip(v1, v2))))
    omega = math.acos(dot)
    if omega < 1e-9:
        return (lat1, lon1)
    s1 = math.sin((1.0 - frac) * omega) / math.sin(omega)
    s2 = math.sin(frac * omega) / math.sin(omega)
    return _to_latlon(tuple(s1 * a + s2 * b for a, b in zip(v1, v2)))  # type: ignore[arg-type]


def bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Initial great-circle bearing from 1 to 2, in degrees (0-360, 0 = north)."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dlambda = math.radians(lon2 - lon1)
    y = math.sin(dlambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dlambda)
    return math.degrees(math.atan2(y, x)) % 360.0


def route_path(from_port: str, to_port: str) -> list[tuple[float, float]]:
    """[origin, *waypoints, destination] — the bent great-circle path of one leg."""
    a, b = PORTS[from_port], PORTS[to_port]
    waypoints = ROUTE_WAYPOINTS.get(frozenset({from_port, to_port}), [])
    # The waypoint list is stored for one direction; reverse it for the other.
    if waypoints and haversine(a['lat'], a['lon'], *waypoints[0]) > haversine(a['lat'], a['lon'], *waypoints[-1]):
        waypoints = list(reversed(waypoints))
    return [(a['lat'], a['lon']), *waypoints, (b['lat'], b['lon'])]


def path_length_nm(path: list[tuple[float, float]]) -> float:
    """Total great-circle length of a polyline (nm)."""
    return sum(haversine(*path[i], *path[i + 1]) for i in range(len(path) - 1))


def leg_distance_nm(from_port: str, to_port: str) -> float:
    """Sailing distance between two ports along the bent path (nm)."""
    return path_length_nm(route_path(from_port, to_port))


def walk(path: list[tuple[float, float]], distance_nm: float) -> tuple[float, float, float]:
    """Position + heading after sailing ``distance_nm`` along ``path``.

    Returns (lat, lon, heading_deg). Past the end of the path, the last point is
    returned — callers wrap the rotation rather than sail off it.
    """
    remaining = max(0.0, distance_nm)
    for i in range(len(path) - 1):
        (lat1, lon1), (lat2, lon2) = path[i], path[i + 1]
        seg = haversine(lat1, lon1, lat2, lon2)
        if seg <= 0.0:
            continue
        if remaining <= seg:
            lat, lon = gc_point(lat1, lon1, lat2, lon2, remaining / seg)
            return (lat, lon, bearing(lat1, lon1, lat2, lon2))
        remaining -= seg
    (lat1, lon1), (lat2, lon2) = path[-2], path[-1]
    return (lat2, lon2, bearing(lat1, lon1, lat2, lon2))


def nearest_port(lat: float, lon: float) -> str:
    """The LOCODE closest to a position (used to name a maintenance event's location)."""
    return min(PORTS, key=lambda code: haversine(lat, lon, PORTS[code]['lat'], PORTS[code]['lon']))
