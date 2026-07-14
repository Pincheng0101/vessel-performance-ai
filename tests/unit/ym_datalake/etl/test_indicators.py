"""Indicator sanity + determinism on the curated fact table."""

import datetime as dt
import statistics

import pytest

from ym_datalake.etl import indicators
from ym_datalake.etl.compute import compute_curated
from ym_datalake.synthetic_data import generate as generate_module
from ym_datalake.synthetic_data.fleet import FLEET, WELLNESS_IMO, get_vessel
from ym_datalake.synthetic_data.generate import generate


@pytest.fixture
def curated(monkeypatch):
    monkeypatch.setattr(generate_module, 'FLEET', [get_vessel(WELLNESS_IMO), FLEET[0]])
    raw = generate(dt.date(2021, 7, 1), dt.date(2024, 6, 30), seed=11)
    return compute_curated(raw)


def _fraction_within(values, lo, hi) -> float:
    return sum(lo <= v <= hi for v in values) / len(values)


def test_indicator_ranges(curated):
    valid = [r for r in curated.fact_performance_daily if r['valid_flag']]
    assert len(valid) > 500
    # Structural invariants hold for EVERY valid point.
    for r in valid:
        assert r['power_corrected_kw'] > 0
        assert r['admiralty_coef'] > 0
        assert r['cii_rating_imo'] in ('A', 'B', 'C', 'D', 'E')
    # Distributions are physically plausible. Robust to the injected-outlier
    # minority: M2 has no statistical outlier rejection (that is M3), so a few
    # labelled sensor outliers survive valid_flag — assert on medians + bulk.
    sfoc = [r['sfoc_g_kwh'] for r in valid]
    slip = [r['slip_real'] for r in valid]
    assert 160.0 <= statistics.median(sfoc) <= 200.0
    assert _fraction_within(sfoc, 140.0, 215.0) >= 0.9
    assert 0.0 <= statistics.median(slip) <= 0.20
    assert _fraction_within(slip, -0.05, 0.30) >= 0.9


def test_speed_loss_grows_with_fouling(curated):
    # Fouled points (high days-since-cleaning) must show clearly higher speed loss
    # than freshly-cleaned points — the whole point of the ISO 19030 metric.
    w = [r for r in curated.fact_performance_daily if r['imo_number'] == WELLNESS_IMO and r['valid_flag']]
    fresh = [r['speed_loss_pct'] for r in w if r['days_since_cleaning'] < 60]
    fouled = [r['speed_loss_pct'] for r in w if r['days_since_cleaning'] > 300]
    assert fresh and fouled
    assert sum(fouled) / len(fouled) > sum(fresh) / len(fresh) + 1.5


def test_cumulative_excess_cost_resets_each_cycle(curated):
    # cum_excess_cost_usd is monotone within a cycle and drops back after a reset.
    w = sorted(
        (r for r in curated.fact_performance_daily if r['imo_number'] == WELLNESS_IMO and r['cum_excess_cost_usd']),
        key=lambda r: r['report_date'],
    )
    assert any(a['cum_excess_cost_usd'] > b['cum_excess_cost_usd'] for a, b in zip(w, w[1:]))


def test_deterministic_same_seed(monkeypatch):
    monkeypatch.setattr(generate_module, 'FLEET', [FLEET[0]])
    a = compute_curated(generate(dt.date(2021, 7, 1), dt.date(2022, 6, 30), seed=5))
    b = compute_curated(generate(dt.date(2021, 7, 1), dt.date(2022, 6, 30), seed=5))
    assert a.fact_performance_daily == b.fact_performance_daily


# --- Phase 4: excess-cost attribution helper -----------------------------------

_NOON = {'steaming_hours': 24.0, 'me_shaft_power_kw': 8000.0, 'me_foc_mt': 40.0}
_CORR = {'resistance_wind_kn': 120.0, 'resistance_wave_kn': 80.0, 'speed_corrected_kn': 18.0}
_ATTR_KEYS = ('excess_cost_fouling_usd', 'excess_cost_weather_usd', 'excess_cost_operational_usd')


def test_attribution_sums_and_fouling_identity():
    # load 5000/10000 = 0.50 → off-optimum → operational > 0; weather > 0.
    a = indicators.excess_cost_attribution(
        {**_NOON, 'me_shaft_power_kw': 5000.0}, _CORR, excess_cost=1000.0, sfoc=180.0, price=600.0, mcr_kw=10000.0
    )
    assert a['excess_cost_fouling_usd'] == 1000.0  # fouling == the ISO headline
    assert a['excess_cost_weather_usd'] > 0.0
    assert a['excess_cost_operational_usd'] > 0.0
    # Additive channels: nothing is negative, and the displayed total is their sum.
    assert all(a[k] >= 0.0 for k in _ATTR_KEYS)
    assert sum(a[k] for k in _ATTR_KEYS) == pytest.approx(
        1000.0 + a['excess_cost_weather_usd'] + a['excess_cost_operational_usd']
    )


def test_attribution_calm_weather_is_zero():
    calm = {'resistance_wind_kn': 0.0, 'resistance_wave_kn': 0.0, 'speed_corrected_kn': 18.0}
    a = indicators.excess_cost_attribution(_NOON, calm, excess_cost=500.0, sfoc=180.0, price=600.0, mcr_kw=10000.0)
    assert a['excess_cost_weather_usd'] == 0.0


def test_attribution_operational_zero_at_optimum():
    # me_shaft_power / mcr == 0.80 (the SFOC sweet spot) → no operational penalty.
    at_opt = indicators.excess_cost_attribution(
        {**_NOON, 'me_shaft_power_kw': 8000.0}, _CORR, excess_cost=500.0, sfoc=180.0, price=600.0, mcr_kw=10000.0
    )
    assert at_opt['excess_cost_operational_usd'] == pytest.approx(0.0)
    off_opt = indicators.excess_cost_attribution(
        {**_NOON, 'me_shaft_power_kw': 5000.0}, _CORR, excess_cost=500.0, sfoc=180.0, price=600.0, mcr_kw=10000.0
    )
    assert off_opt['excess_cost_operational_usd'] > 0.0


def test_attribution_none_when_unpriced_or_no_excess():
    assert indicators.excess_cost_attribution(_NOON, _CORR, 500.0, 180.0, None, 10000.0) == {
        k: None for k in _ATTR_KEYS
    }
    assert indicators.excess_cost_attribution(_NOON, _CORR, None, 180.0, 600.0, 10000.0) == {
        k: None for k in _ATTR_KEYS
    }


def test_attribution_on_curated(curated):
    at_sea_priced = [r for r in curated.fact_performance_daily if r['excess_cost_usd'] is not None]
    assert len(at_sea_priced) > 500
    for r in at_sea_priced:
        assert r['excess_cost_fouling_usd'] == r['excess_cost_usd']
        assert r['excess_cost_weather_usd'] >= 0.0
        assert r['excess_cost_operational_usd'] >= 0.0
    # In-port rows carry no attribution (co-null with excess_cost_usd).
    in_port = [r for r in curated.fact_performance_daily if r['excess_cost_usd'] is None]
    assert in_port
    assert all(r['excess_cost_weather_usd'] is None for r in in_port)
    # Weather is materially non-zero fleet-wide — the core value proposition.
    assert sum(r['excess_cost_weather_usd'] for r in at_sea_priced) > 0.0
