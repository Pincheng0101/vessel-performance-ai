import sys
from pathlib import Path

import pytest

sys.path.append(str(Path(__file__).resolve().parents[3] / 'scripts'))

import build_model_ready_data as bmd


def test_compute_zscore_stats_uses_population_std() -> None:
    values = [1.0, 2.0, 3.0, 4.0, 5.0]

    mean, std = bmd.compute_zscore_stats(values)

    assert mean == pytest.approx(3.0)
    # Population std (ddof=0) of 1..5 is sqrt(2).
    assert std == pytest.approx(2.0**0.5)


def test_zscore_normalize_matches_mean_and_std() -> None:
    mean, std = 3.0, 2.0

    assert bmd.zscore_normalize(3.0, mean, std) == pytest.approx(0.0)
    assert bmd.zscore_normalize(5.0, mean, std) == pytest.approx(1.0)
    # Inverse transform recovers the original value.
    normalized = bmd.zscore_normalize(7.0, mean, std)
    assert normalized * std + mean == pytest.approx(7.0)


def test_zscore_normalize_guards_zero_std() -> None:
    assert bmd.zscore_normalize(42.0, mean=42.0, std=0.0) == 0.0
