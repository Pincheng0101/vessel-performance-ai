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
from ym_datalake.schema import DIM_PORT_COLUMNS

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


class TestHaversine:
    """The metre-stick every other number in this module is measured with."""

    def test_a_point_is_no_distance_from_itself(self) -> None:
        assert ports.haversine(1.27, 103.83, 1.27, 103.83) == pytest.approx(0.0)

    def test_it_is_symmetric(self) -> None:
        there = ports.haversine(1.27, 103.83, 51.95, 4.14)
        back = ports.haversine(51.95, 4.14, 1.27, 103.83)
        assert there == pytest.approx(back)

    def test_one_degree_of_latitude_is_sixty_nautical_miles(self) -> None:
        """The definition of the unit — so this pins the earth radius, not a sample."""
        assert ports.haversine(0.0, 0.0, 1.0, 0.0) == pytest.approx(60.0, rel=1e-3)
        assert ports.haversine(40.0, 10.0, 41.0, 10.0) == pytest.approx(60.0, rel=1e-3)

    def test_it_crosses_the_antimeridian_the_short_way(self) -> None:
        """179E to 179W is 2 degrees of longitude, not 358."""
        assert ports.haversine(0.0, 179.0, 0.0, -179.0) == pytest.approx(120.0, rel=1e-3)


class TestWalk:
    @pytest.fixture
    def path(self) -> list[tuple[float, float]]:
        return ports.route_path('JPTYO', 'USLAX')

    def test_zero_distance_leaves_you_at_the_start(self, path) -> None:
        lat, lon, _heading = ports.walk(path, 0.0)
        assert (lat, lon) == pytest.approx(path[0])

    def test_the_full_length_puts_you_at_the_destination(self, path) -> None:
        lat, lon, _heading = ports.walk(path, ports.path_length_nm(path))
        assert (lat, lon) == pytest.approx(path[-1])

    def test_sailing_past_the_end_holds_at_the_destination(self, path) -> None:
        """Callers wrap the rotation rather than sail off the end of a leg."""
        lat, lon, _heading = ports.walk(path, ports.path_length_nm(path) * 2.0)
        assert (lat, lon) == pytest.approx(path[-1])

    def test_the_heading_is_a_compass_bearing(self, path) -> None:
        total = ports.path_length_nm(path)
        for i in range(21):
            _lat, _lon, heading = ports.walk(path, total * i / 20.0)
            assert 0.0 <= heading < 360.0

    def test_further_along_the_path_is_further_from_the_start(self, path) -> None:
        lat0, lon0 = path[0]
        near_lat, near_lon, _ = ports.walk(path, 100.0)
        far_lat, far_lon, _ = ports.walk(path, 1000.0)
        assert ports.haversine(lat0, lon0, near_lat, near_lon) < ports.haversine(lat0, lon0, far_lat, far_lon)


class TestNearestPort:
    @pytest.mark.parametrize('locode', sorted(ports.PORTS))
    def test_a_port_is_its_own_nearest_port(self, locode) -> None:
        port = ports.PORTS[locode]
        assert ports.nearest_port(port['lat'], port['lon']) == locode

    def test_a_position_in_the_north_sea_names_a_north_sea_port(self) -> None:
        assert ports.nearest_port(53.0, 5.0) in {'NLRTM', 'DEHAM'}


def test_dim_port_rows_match_the_catalog() -> None:
    """The drift guard: dim_port is hand-built here and declared in schema.py."""
    columns = [name for name, _type in DIM_PORT_COLUMNS]
    rows = ports.dim_port_rows()
    assert len(rows) == len(ports.PORTS)
    for row in rows:
        assert list(row) == columns
