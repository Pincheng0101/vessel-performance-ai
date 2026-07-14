"""Maintenance-timing optimisation — curve extension, J(T) sweep, plan sanity."""

from __future__ import annotations

import datetime as dt

import numpy as np
import pytest

from tests.unit.ym_datalake.ml.conftest import make_series
from ym_datalake.ml import maintenance


def _curves(start: float, slope: float, spread: float = 0.5):
    h = np.arange(1, 91, dtype=float)
    p50 = start + slope * h
    return {'p10': p50 - spread, 'p50': p50, 'p90': p50 + spread}


def test_extend_curve_continues_tail_slope():
    curve = 2.0 + 0.05 * np.arange(1, 91)
    ext = maintenance.extend_curve(curve)
    assert len(ext) == maintenance.PLAN_DAYS
    assert ext[90] == pytest.approx(curve[-1] + 0.05, abs=0.01)
    assert (np.diff(ext[90:]) >= 0).all()
    assert ext.max() <= 30.0


def test_extend_curve_never_unfouls():
    ext = maintenance.extend_curve(np.linspace(5.0, 3.0, 90))  # declining forecast tail
    assert (ext[90:] >= ext[89] - 1e-9).all()


def test_implied_economics_recovers_synthetic_constants(series):
    econ = maintenance.implied_economics(series)
    assert econ['price_usd_per_mt'] == pytest.approx(600.0, rel=0.01)
    assert econ['curve_n'] == pytest.approx(3.0, rel=0.05)
    assert econ['me_foc_mt'] == pytest.approx(90.0, rel=0.01)
    assert econ['sea_frac'] == 1.0


def test_trigger_eta_matches_crossing():
    as_of = dt.date(2026, 1, 1)
    curve = np.concatenate([np.full(50, 5.0), np.full(680, 9.0)])
    assert maintenance.trigger_eta(curve, as_of) == (as_of + dt.timedelta(days=51)).isoformat()
    assert maintenance.trigger_eta(np.full(730, 5.0), as_of) is None


def test_build_plan_orders_dates_and_nonnegative_saving(series):
    events = [
        {'imo_number': series.imo_number, 'event_type': 'hull_cleaning', 'cost_usd': 80000.0, 'downtime_hours': 24.0}
    ]
    plan = maintenance.build_plan(series, _curves(start=6.0, slope=0.03), events, '2026-01-01', 'model-x')
    as_of = dt.date.fromisoformat(plan['as_of_date'])
    rec = dt.date.fromisoformat(plan['recommended_clean_date'])
    early = dt.date.fromisoformat(plan['recommended_date_early'])
    late = dt.date.fromisoformat(plan['recommended_date_late'])
    assert as_of < rec and early <= rec <= late
    assert plan['expected_saving_usd'] >= 0.0
    assert plan['baseline_clean_date'] == '2026-01-01'
    assert plan['model_id'] == 'model-x'


def test_build_plan_recommends_soon_when_heavily_fouled():
    fouled = make_series(sl_start=9.0, sl_slope=0.05)  # already past the 8 % trigger
    mild = make_series(sl_start=0.5, sl_slope=0.002)
    events = [
        {'imo_number': fouled.imo_number, 'event_type': 'hull_cleaning', 'cost_usd': 80000.0, 'downtime_hours': 24.0}
    ]
    plan_fouled = maintenance.build_plan(fouled, _curves(20.0, 0.05), events, None, 'm')
    plan_mild = maintenance.build_plan(mild, _curves(1.0, 0.002), events, None, 'm')
    days = lambda p: (dt.date.fromisoformat(p['recommended_clean_date']) - dt.date.fromisoformat(p['as_of_date'])).days  # noqa: E731
    assert days(plan_fouled) < days(plan_mild)
    assert plan_fouled['trigger_eta_pred'] is not None


def test_cleaning_cost_fallback_chain():
    own = [{'imo_number': 'A', 'event_type': 'hull_cleaning', 'cost_usd': 50000.0, 'downtime_hours': 10.0}]
    fleet = [{'imo_number': 'B', 'event_type': 'hull_cleaning', 'cost_usd': 90000.0, 'downtime_hours': 0.0}]
    assert maintenance.cleaning_cost(own + fleet, 'A') == pytest.approx(60000.0)
    assert maintenance.cleaning_cost(fleet, 'A') == pytest.approx(90000.0)
    assert maintenance.cleaning_cost([], 'A') == pytest.approx(100000.0)
