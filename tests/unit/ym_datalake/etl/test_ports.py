"""Every leg the fleet can sail must stay in the water.

The geography is synthesized and decorative — it feeds no physics number. But a fleet map
with a container ship in the Rub' al Khali discredits every honest number standing next to
it, and a raw great circle between two real ports routinely does exactly that (Colombo ->
Dubai crosses Arabia; Rotterdam -> Hamburg crosses the Netherlands; Tokyo -> Los Angeles
leaves the bay overland). So the routes are bent through waypoints, and this test is the
guard that keeps them bent.
"""

from __future__ import annotations

import pytest

from ym_datalake.etl import ports
from ym_datalake.etl.curated.geography import ROTATION_LOOP

# Rectangles drawn STRICTLY INSIDE a continental interior. None of them may clip a navigable
# water body — not the Malacca Strait, the Red Sea, the Gulf of Suez, Hormuz, the Taiwan
# Strait, Tokyo Bay, the Elbe or the Gulf of Tonkin — because a lat/lon rectangle cannot
# tell a narrow sea from the land on either side of it. The test therefore under-reports (a
# route grazing a coastline slips through) rather than false-alarming. It catches the gross
# failure, which is the one that matters; it does not certify pilotage.
LAND_BOXES: list[tuple[str, float, float, float, float]] = [
    # name, lat_min, lat_max, lon_min, lon_max
    ('RubAlKhali', 20.0, 27.0, 44.0, 52.0),
    ('SaudiInterior', 19.0, 27.0, 42.5, 45.0),
    ('OmanInterior', 19.5, 22.0, 55.0, 57.0),
    ('IranInterior', 29.0, 35.0, 53.0, 60.0),
    ('EgyptInterior', 24.0, 29.0, 28.0, 32.0),
    ('SudanInterior', 15.0, 21.0, 30.0, 35.0),
    ('SaharaLibya', 22.0, 31.0, 5.0, 25.0),
    ('SiberiaCentralAsia', 42.0, 70.0, 60.0, 120.0),
    ('IndiaInterior', 12.0, 25.0, 75.0, 85.0),
    ('ChinaInterior', 25.0, 45.0, 100.0, 116.0),
    ('Indochina', 13.0, 22.0, 100.0, 106.0),
    ('SumatraInterior', -2.0, 1.0, 100.0, 103.0),
    ('MalayInterior', 4.0, 6.0, 101.0, 102.5),
    ('BorneoInterior', -1.0, 3.0, 111.0, 116.0),
    ('JapanAlps', 35.5, 37.5, 137.0, 139.3),
    ('ChibaInterior', 35.4, 36.0, 140.15, 140.45),
    ('GermanyInterior', 51.0, 53.2, 6.0, 13.0),
    ('EuropeInterior', 45.0, 51.0, 4.0, 20.0),
    ('SpainInterior', 38.0, 42.0, -5.0, -1.0),
    ('USInterior', 35.0, 45.0, -115.0, -100.0),
]

# Sample every leg this finely (nm). Fine enough that no box is stepped over.
SAMPLE_STEP_NM = 20.0


def _on_land(lat: float, lon: float) -> str | None:
    for name, lat_min, lat_max, lon_min, lon_max in LAND_BOXES:
        if lat_min <= lat <= lat_max and lon_min <= lon <= lon_max:
            return name
    return None


def _legs() -> list[tuple[str, str]]:
    """Every consecutive port pair the rotation loops can actually sail, including the wrap."""
    out: list[tuple[str, str]] = []
    for loop in ROTATION_LOOP.values():
        for i in range(len(loop)):
            out.append((loop[i], loop[(i + 1) % len(loop)]))
    return sorted(set(out))


@pytest.mark.parametrize(('from_port', 'to_port'), _legs())
def test_leg_stays_at_sea(from_port: str, to_port: str) -> None:
    path = ports.route_path(from_port, to_port)
    total = ports.path_length_nm(path)

    hits = []
    steps = int(total / SAMPLE_STEP_NM) + 1
    for i in range(steps + 1):
        lat, lon, _ = ports.walk(path, min(i * SAMPLE_STEP_NM, total))
        box = _on_land(lat, lon)
        if box:
            hits.append((box, round(lat, 2), round(lon, 2)))

    assert not hits, f'{from_port}->{to_port} runs overland at {hits[:5]} ({len(hits)} of {steps} samples)'


def test_every_leg_is_reversible() -> None:
    """A->B and B->A are the same water, so they must be the same length."""
    for from_port, to_port in _legs():
        out = ports.leg_distance_nm(from_port, to_port)
        back = ports.leg_distance_nm(to_port, from_port)
        assert out == pytest.approx(back), f'{from_port}<->{to_port}: {out:.1f} vs {back:.1f} nm'


def test_bent_routes_are_longer_than_the_great_circle() -> None:
    """Bending a route around a continent adds distance; it can never save any."""
    for pair in ports.ROUTE_WAYPOINTS:
        a, b = sorted(pair)
        direct = ports.haversine(
            ports.PORTS[a]['lat'], ports.PORTS[a]['lon'], ports.PORTS[b]['lat'], ports.PORTS[b]['lon']
        )
        assert ports.leg_distance_nm(a, b) > direct
