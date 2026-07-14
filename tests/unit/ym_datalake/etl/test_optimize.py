"""fact_speed_profile grain + cost identities, convexity, and the economical-speed argmin."""

import datetime as dt

import pytest

from ym_datalake.etl.compute import compute_curated
from ym_datalake.synthetic_data import generate as generate_module
from ym_datalake.synthetic_data.curves import build_curve
from ym_datalake.synthetic_data.fleet import get_vessel
from ym_datalake.synthetic_data.generate import generate


@pytest.fixture(scope='module')
def curated_raw():
    """FL-AE (WELLNESS, engineered fouling arc) + FL-IA feeder over 2 years."""
    fleet = [get_vessel('9700006'), get_vessel('9700001')]
    orig = generate_module.FLEET
    generate_module.FLEET = fleet
    try:
        raw = generate(dt.date(2021, 7, 1), dt.date(2023, 6, 30), seed=7)
    finally:
        generate_module.FLEET = orig
    return compute_curated(raw), raw


def _by_imo(curated):
    out: dict[str, list[dict]] = {}
    for r in curated.fact_speed_profile:
        out.setdefault(r['imo_number'], []).append(r)
    return {imo: sorted(rows, key=lambda r: r['speed_kn']) for imo, rows in out.items()}


# --- grain + grid ---------------------------------------------------------


def test_grain_is_distinct_imo_speed(curated_raw):
    curated, _ = curated_raw
    keys = [(r['imo_number'], r['speed_kn']) for r in curated.fact_speed_profile]
    assert len(keys) == len(set(keys))
    for rows in _by_imo(curated).values():
        assert len(rows) == 24  # the 24-point speed grid


def test_grid_spans_half_to_full_design_speed(curated_raw):
    curated, _ = curated_raw
    for imo, rows in _by_imo(curated).items():
        vd = get_vessel(imo).design_speed_kn
        assert rows[0]['speed_kn'] == pytest.approx(0.5 * vd)
        assert rows[-1]['speed_kn'] == pytest.approx(1.0 * vd)


# --- cost identities ------------------------------------------------------


def test_usd_per_nm_is_total_cost_over_distance(curated_raw):
    curated, _ = curated_raw
    for r in curated.fact_speed_profile:
        assert r['usd_per_day'] == pytest.approx(r['fuel_usd_per_day'] + r['charter_usd_per_day'])
        assert r['usd_per_nm'] == pytest.approx(r['usd_per_day'] / (r['speed_kn'] * 24.0))
        assert r['fuel_usd_per_nm'] == pytest.approx(r['fuel_usd_per_day'] / (r['speed_kn'] * 24.0))


def test_charter_matches_spec(curated_raw):
    curated, _ = curated_raw
    for imo, rows in _by_imo(curated).items():
        charter = get_vessel(imo).charter_usd_per_day
        assert all(r['charter_usd_per_day'] == charter for r in rows)


def test_shaft_power_is_clean_reference_curve(curated_raw):
    curated, _ = curated_raw
    for imo, rows in _by_imo(curated).items():
        spec = get_vessel(imo)
        curve = build_curve(spec)
        for r in rows:
            assert r['shaft_power_kw'] == pytest.approx(
                curve.clean_power_kw(r['speed_kn'], spec.design_displacement_mt)
            )


# --- convexity / economical speed (C19 in miniature) ----------------------


def test_usd_per_nm_is_convex_with_interior_min(curated_raw):
    curated, _ = curated_raw
    for rows in _by_imo(curated).values():
        curve = [r['usd_per_nm'] for r in rows]
        argmin = min(range(len(curve)), key=lambda i: curve[i])
        # Interior — the whole point of adding the per-day charter (time) cost.
        assert 0 < argmin < len(curve) - 1
        # Strictly U-shaped: decreasing up to the min, increasing after.
        assert all(curve[i] > curve[i + 1] for i in range(argmin))
        assert all(curve[i] < curve[i + 1] for i in range(argmin, len(curve) - 1))


def test_fuel_only_usd_per_nm_is_strictly_increasing(curated_raw):
    # Physics sanity: fuel-only usd/nm ∝ V^(n-1) is strictly increasing, so a fuel-only
    # optimum is the slowest grid point (degenerate) — the charter term is what makes it convex.
    curated, _ = curated_raw
    for rows in _by_imo(curated).values():
        fuel = [r['fuel_usd_per_nm'] for r in rows]
        assert all(fuel[i] < fuel[i + 1] for i in range(len(fuel) - 1))


def test_recommended_speed_is_argmin_and_repeated(curated_raw):
    curated, _ = curated_raw
    for rows in _by_imo(curated).values():
        argmin = min(rows, key=lambda r: r['usd_per_nm'])
        rec = rows[0]['recommended_speed_kn']
        assert all(r['recommended_speed_kn'] == rec for r in rows)  # repeated on every row
        assert rec == pytest.approx(argmin['speed_kn'])


# --- vessel-level repeated fields -----------------------------------------


def test_vessel_level_fields_repeated_and_positive(curated_raw):
    curated, _ = curated_raw
    for imo, rows in _by_imo(curated).items():
        spec = get_vessel(imo)
        assert all(r['vessel_name'] == spec.vessel_name for r in rows)
        assert all(r['annual_distance_nm'] == rows[0]['annual_distance_nm'] for r in rows)
        assert all(r['current_speed_kn'] == rows[0]['current_speed_kn'] for r in rows)
        assert rows[0]['annual_distance_nm'] > 0
