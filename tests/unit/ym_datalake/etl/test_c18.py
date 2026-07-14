"""C18 voyage energy balance: Σ fact_voyage FOC == Σ noon FOC per vessel."""

import datetime as dt

import pytest

from ym_datalake.etl.compute import compute_curated
from ym_datalake.etl.validate import check_c18
from ym_datalake.synthetic_data import generate as generate_module
from ym_datalake.synthetic_data.fleet import get_vessel
from ym_datalake.synthetic_data.generate import generate


@pytest.fixture(scope='module')
def curated_raw():
    fleet = [get_vessel('9700006'), get_vessel('9700001')]
    orig = generate_module.FLEET
    generate_module.FLEET = fleet
    try:
        raw = generate(dt.date(2021, 7, 1), dt.date(2023, 6, 30), seed=7)
    finally:
        generate_module.FLEET = orig
    return compute_curated(raw), raw


def test_c18_passes_on_generated(curated_raw):
    curated, raw = curated_raw
    results = check_c18(curated, raw.noon_report)
    assert all(r.passed for r in results), [r.detail for r in results]
    assert results[0].checked == 2  # one balance per vessel


def test_c18_fails_when_a_foc_is_dropped(curated_raw):
    _, raw = curated_raw
    # Drop one voyage's fuel from the roll-up → the vessel's balance no longer closes.
    tampered = compute_curated(raw)
    tampered.fact_voyage[0] = {**tampered.fact_voyage[0], 'total_foc_mt': 0.0}
    results = check_c18(tampered, raw.noon_report)
    assert not results[0].passed
    assert results[0].violations == 1
