"""Geometry + port-table checks for ``synthetic_data.ports`` (STDLIB-only module)."""

import subprocess
import sys

import pytest

from ym_datalake.synthetic_data import ports

_LOCODES = {'SGSIN', 'NLRTM', 'KRPUS', 'CNSHA', 'LKCMB', 'AEDXB', 'USLAX', 'DEHAM', 'JPTYO', 'HKHKG'}


# --- Port table -----------------------------------------------------------


def test_all_ten_locodes_present():
    assert set(ports.PORTS) == _LOCODES


def test_coord_ranges_and_fields():
    for locode, p in ports.PORTS.items():
        assert -90.0 <= p['lat'] <= 90.0, locode
        assert -180.0 <= p['lon'] <= 180.0, locode
        assert p['name']
        assert isinstance(p['is_eu'], bool)


def test_only_european_ports_flagged_eu():
    eu = {locode for locode, p in ports.PORTS.items() if p['is_eu']}
    assert eu == {'NLRTM', 'DEHAM'}


def test_ports_module_is_numpy_free():
    # ports.py is imported at cdk synth time (like fleet.py) → must stay stdlib-only.
    code = 'import ym_datalake.synthetic_data.ports, sys; assert "numpy" not in sys.modules'
    subprocess.run([sys.executable, '-c', code], check=True)


# --- haversine ------------------------------------------------------------


def test_haversine_identity_is_zero():
    for p in ports.PORTS.values():
        assert ports.haversine(p['lat'], p['lon'], p['lat'], p['lon']) == pytest.approx(0.0, abs=1e-9)


def test_haversine_symmetric():
    a, b = ports.PORTS['SGSIN'], ports.PORTS['NLRTM']
    d1 = ports.haversine(a['lat'], a['lon'], b['lat'], b['lon'])
    d2 = ports.haversine(b['lat'], b['lon'], a['lat'], a['lon'])
    assert d1 == pytest.approx(d2, rel=1e-12)


@pytest.mark.parametrize(
    ('a', 'b', 'known_nm'),
    [
        ('SGSIN', 'HKHKG', 1400.0),  # Singapore–Hong Kong great circle ≈ 1400 nm
        ('CNSHA', 'USLAX', 5650.0),  # Shanghai–Los Angeles great circle ≈ 5650 nm
    ],
)
def test_haversine_matches_known_distances(a, b, known_nm):
    pa, pb = ports.PORTS[a], ports.PORTS[b]
    d = ports.haversine(pa['lat'], pa['lon'], pb['lat'], pb['lon'])
    assert d == pytest.approx(known_nm, rel=0.03)


# --- gc_point -------------------------------------------------------------


def test_gc_point_endpoints():
    a, b = ports.PORTS['SGSIN'], ports.PORTS['NLRTM']
    p0 = ports.gc_point(a['lat'], a['lon'], b['lat'], b['lon'], 0.0)
    p1 = ports.gc_point(a['lat'], a['lon'], b['lat'], b['lon'], 1.0)
    assert p0[0] == pytest.approx(a['lat'], abs=1e-6)
    assert p0[1] == pytest.approx(a['lon'], abs=1e-6)
    assert p1[0] == pytest.approx(b['lat'], abs=1e-6)
    assert p1[1] == pytest.approx(b['lon'], abs=1e-6)


def test_gc_point_midpoint_additive():
    a, b = ports.PORTS['SGSIN'], ports.PORTS['NLRTM']
    mid = ports.gc_point(a['lat'], a['lon'], b['lat'], b['lon'], 0.5)
    full = ports.haversine(a['lat'], a['lon'], b['lat'], b['lon'])
    d1 = ports.haversine(a['lat'], a['lon'], mid[0], mid[1])
    d2 = ports.haversine(mid[0], mid[1], b['lat'], b['lon'])
    assert d1 + d2 == pytest.approx(full, rel=1e-6)
    assert d1 == pytest.approx(full / 2.0, rel=1e-6)


@pytest.mark.parametrize(('a', 'b'), [('SGSIN', 'NLRTM'), ('JPTYO', 'USLAX')])
def test_gc_point_monotonic_approach(a, b):
    # Distance-to-destination falls monotonically along the arc — incl. the
    # JPTYO→USLAX leg that crosses the antimeridian (slerp, not lon lerp).
    pa, pb = ports.PORTS[a], ports.PORTS[b]
    fracs = [i / 20.0 for i in range(21)]
    dists = [
        ports.haversine(*ports.gc_point(pa['lat'], pa['lon'], pb['lat'], pb['lon'], f), pb['lat'], pb['lon'])
        for f in fracs
    ]
    for prev, cur in zip(dists, dists[1:]):
        assert cur <= prev + 1e-6


# --- route paths / waypoints ----------------------------------------------


def test_path_distance_is_sum_of_segments():
    path = ports.route_path('AEDXB', 'DEHAM')
    manual = sum(ports.haversine(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1]) for i in range(len(path) - 1))
    assert ports.path_distance_nm(path) == pytest.approx(manual, rel=1e-12)


def test_ae_path_threads_suez_and_gibraltar():
    path = ports.route_path('AEDXB', 'DEHAM')
    # A waypoint sits near Suez (~30N, 32.6E) and Gibraltar (~36N, -5.6E).
    assert any(ports.haversine(lat, lon, 30.0, 32.6) < 60.0 for lat, lon in path)
    assert any(ports.haversine(lat, lon, 35.95, -5.6) < 60.0 for lat, lon in path)


def test_route_path_direction_symmetric_reversed():
    fwd = ports.route_path('AEDXB', 'DEHAM')
    rev = ports.route_path('DEHAM', 'AEDXB')
    assert rev == list(reversed(fwd))


@pytest.mark.parametrize(('a', 'b'), [('SGSIN', 'LKCMB'), ('AEDXB', 'DEHAM')])
def test_path_point_endpoints(a, b):
    path = ports.route_path(a, b)
    assert ports.path_point(path, 0.0) == pytest.approx(path[0], abs=1e-6)
    assert ports.path_point(path, 1.0) == pytest.approx(path[-1], abs=1e-6)


def test_path_point_monotonic_approach_along_malacca_path():
    # The single-waypoint Malacca leg bends but never doubles back, so crow-flies
    # distance to the destination still falls monotonically. (Suez legs detour
    # south to Bab-el-Mandeb first, so that invariant is direct-leg-only.)
    path = ports.route_path('SGSIN', 'LKCMB')
    dest = path[-1]
    fracs = [i / 30.0 for i in range(31)]
    dists = [ports.haversine(*ports.path_point(path, f), dest[0], dest[1]) for f in fracs]
    for prev, cur in zip(dists, dists[1:]):
        assert cur <= prev + 1e-6
