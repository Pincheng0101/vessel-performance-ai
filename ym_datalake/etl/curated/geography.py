"""Geography — ESTIMATED, and draped over the real data rather than replacing it.

The real dataset has no position, no port, and no heading. It has a ``VOYAGE`` number
and a real daily ``TOTAL_DISTANCE``. This module invents just enough geography to give
the lake a spatial dimension, and does it in the one direction that cannot corrupt
anything: **the real distances drive the synthesized track, never the reverse.**

*A voyage here is a rotation, not a leg.* The plan assumed each ``VOYAGE`` could be
matched to a **port pair** whose great-circle distance equals its total distance. The
real voyages make that impossible: they run a median of **71 days and ~19,157 nm**
(max 84,150 nm), and the two most distant of the 10 LOCODEs are ~11,000 nm apart. So a
voyage is fitted with a **multi-leg port rotation** whose cumulative path length covers
its real distance; ``from_port`` / ``to_port`` are the rotation's endpoints.

Then each day is placed by walking that polyline by the **real** cumulative distance
sailed since the voyage started. A day the ship really made 400 nm moves 400 nm along
the route. The heading is the bearing of the polyline at that point.

**The heading decides whether the ISO 15016 wind correction is real or decorative** —
see ``corrections``, which does not assume, but tests.
"""

from __future__ import annotations

from collections import defaultdict

from ym_datalake.etl import ports

# Each hull class sails a fixed liner ROTATION LOOP, and a voyage is however far along that
# loop the real distance carries it. Ports are NOT picked at random: a random pair puts a
# great circle from Shanghai to Hamburg straight across Siberia, and a fleet map with ships
# in Kazakhstan is worse than no map. Every consecutive leg below is sailable — either open
# water, or bent through the waypoints in `ports.ROUTE_WAYPOINTS` (Malacca, Suez, Gibraltar).
ROTATION_LOOP = {
    # W1 — Asia-Europe, out through Malacca and Suez and back.
    'W1': ['CNSHA', 'HKHKG', 'SGSIN', 'LKCMB', 'AEDXB', 'NLRTM', 'DEHAM', 'NLRTM', 'AEDXB', 'LKCMB', 'SGSIN', 'HKHKG'],
    # W2 — Trans-Pacific, the North Pacific great circle to the US west coast and back.
    'W2': ['CNSHA', 'KRPUS', 'JPTYO', 'USLAX', 'JPTYO', 'KRPUS'],
}

# A guard, not a limit: the longest real voyage is 84,150 nm, well inside this.
_MAX_LEGS = 60


def _rotation(loop: list[str], start_index: int, target_nm: float) -> tuple[list[str], int]:
    """Walk the loop from ``start_index`` until the path covers ``target_nm``.

    Returns (the port chain, the index the next voyage resumes from), so a ship's rotations
    are continuous — the next voyage departs from the port this one arrived at.
    """
    chain = [loop[start_index % len(loop)]]
    index = start_index
    covered = 0.0
    # Even a 1-day voyage gets a leg, so from_port != to_port and the track has a bearing.
    while covered < target_nm or len(chain) < 2:
        index += 1
        nxt = loop[index % len(loop)]
        covered += ports.leg_distance_nm(chain[-1], nxt)
        chain.append(nxt)
        if len(chain) > _MAX_LEGS:
            break
    return chain, index


def _polyline(chain: list[str]) -> list[tuple[float, float]]:
    """The full bent great-circle polyline through a rotation's ports."""
    path: list[tuple[float, float]] = []
    for i in range(len(chain) - 1):
        leg = ports.route_path(chain[i], chain[i + 1])
        path.extend(leg if not path else leg[1:])  # do not repeat the shared port
    return path


def build(cleaned_rows: list[dict], vessels: dict[str, dict], seed: int = 42) -> tuple[dict, dict]:
    """Drape a rotation over every (ship, voyage).

    Returns ``(track, voyage_geo)``:

    * ``track[(ship_id, noon_utc)]`` -> latitude / longitude / heading_deg / port_from / port_to
    * ``voyage_geo[(ship_id, voyage)]`` -> from_port / to_port

    The rotation's own path length stays here, in the map. It is a synthesized number and
    ``fact_voyage`` used to build ``planned_days`` out of it — a schedule fact derived from
    decorative geography. The schedule is measured from the real distances now (``voyages``).
    """
    by_voyage: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for row in cleaned_rows:
        by_voyage[(row['ship_id'], row['voyage'])].append(row)

    track: dict[tuple[str, int], dict] = {}
    voyage_geo: dict[tuple[str, str], dict] = {}

    by_ship: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for key, rows in by_voyage.items():
        by_ship[key[0]].append(key)

    for ship_id, keys in sorted(by_ship.items()):
        vessel = vessels[ship_id]
        loop = ROTATION_LOOP[vessel['hull_class']]
        # Ships of a class are staggered around their shared loop, so the fleet is not all
        # sitting in the same port on day 0.
        index = (seed + sum(ord(c) for c in ship_id)) % len(loop)

        # Voyages in the order the ship actually sailed them.
        keys.sort(key=lambda k: min(r['noon_utc'] for r in by_voyage[k]))
        for key in keys:
            rows = sorted(by_voyage[key], key=lambda r: r['noon_utc'])
            target_nm = sum(r.get('total_distance') or 0.0 for r in rows)

            chain, index = _rotation(loop, index, target_nm)
            path = _polyline(chain)
            from_port, to_port = chain[0], chain[-1]

            voyage_geo[key] = {'from_port': from_port, 'to_port': to_port}

            sailed = 0.0
            for row in rows:
                sailed += row.get('total_distance') or 0.0
                lat, lon, heading = ports.walk(path, sailed)
                track[(ship_id, row['noon_utc'])] = {
                    'latitude': lat,
                    'longitude': lon,
                    'heading_deg': heading,
                    'port_from': from_port,
                    'port_to': to_port,
                }
            # `index` carries over, so the next voyage departs from the port this one
            # arrived at — the ship keeps going round the loop instead of teleporting.

    return track, voyage_geo
