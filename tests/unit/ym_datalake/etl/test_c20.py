"""C20 weather attribution: fouling==excess_cost_usd, non-negative channels, co-null."""

import datetime as dt

import pytest

from ym_datalake.etl.compute import compute_curated
from ym_datalake.etl.validate import check_c20
from ym_datalake.synthetic_data import generate as generate_module
from ym_datalake.synthetic_data.fleet import get_vessel
from ym_datalake.synthetic_data.generate import generate


@pytest.fixture(scope='module')
def curated():
    fleet = [get_vessel('9700006'), get_vessel('9700001')]
    orig = generate_module.FLEET
    generate_module.FLEET = fleet
    try:
        raw = generate(dt.date(2021, 7, 1), dt.date(2023, 6, 30), seed=7)
    finally:
        generate_module.FLEET = orig
    return compute_curated(raw)


def test_c20_passes_on_generated(curated):
    results = check_c20(curated)
    assert all(r.passed for r in results), [r.detail for r in results]
    assert results[0].checked > 500  # many at-sea priced rows decomposed


def test_c20_fails_when_fouling_breaks_identity(curated):
    tampered = compute_curated_copy(curated)
    row = next(r for r in tampered.fact_performance_daily if r['excess_cost_usd'] is not None)
    row['excess_cost_fouling_usd'] = row['excess_cost_usd'] + 1000.0  # break the identity
    results = check_c20(tampered)
    assert not results[0].passed
    assert results[0].violations >= 1


def test_c20_fails_when_a_channel_dropped(curated):
    tampered = compute_curated_copy(curated)
    row = next(r for r in tampered.fact_performance_daily if r['excess_cost_usd'] is not None)
    row['excess_cost_weather_usd'] = None  # co-null discipline broken
    results = check_c20(tampered)
    assert not results[0].passed
    assert results[0].violations >= 1


def compute_curated_copy(curated):
    from ym_datalake.etl.compute import CuratedResult

    return CuratedResult(fact_performance_daily=[dict(r) for r in curated.fact_performance_daily])
