"""C13 closed-loop: generate a small sample, run the ETL, assert speed loss recovers."""

import datetime as dt

import pytest

from ym_datalake.etl.compute import compute_curated
from ym_datalake.etl.validate import check_c13
from ym_datalake.synthetic_data import generate as generate_module
from ym_datalake.synthetic_data.fleet import FLEET, WELLNESS_IMO, get_vessel
from ym_datalake.synthetic_data.generate import generate


@pytest.fixture
def curated_with_truth(monkeypatch):
    """WELLNESS + a Feeder over three years — enough for cycles and a storyline."""
    monkeypatch.setattr(generate_module, 'FLEET', [get_vessel(WELLNESS_IMO), FLEET[0]])
    raw = generate(dt.date(2021, 7, 1), dt.date(2024, 6, 30), seed=7)
    return compute_curated(raw), raw


def test_c13_recovers_injected_speed_loss(curated_with_truth):
    curated, raw = curated_with_truth
    results = check_c13(curated, raw.ground_truth_daily)
    failures = [r for r in results if not r.passed]
    assert not failures, 'C13 failed:\n' + '\n'.join(f'  {r.rule}: {r.detail}' for r in failures)


def test_c13_checked_enough_points(curated_with_truth):
    # Guard against the checks passing because they examined almost nothing.
    curated, raw = curated_with_truth
    for r in check_c13(curated, raw.ground_truth_daily):
        assert r.checked > 100, f'{r.rule} examined too few points ({r.checked})'
