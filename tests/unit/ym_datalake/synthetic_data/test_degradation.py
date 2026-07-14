"""Independent propeller / coating / engine degradation processes (C15–C17)."""

import datetime as dt
import statistics

import pytest

from ym_datalake.synthetic_data import generate as generate_module
from ym_datalake.synthetic_data.fleet import FLEET, WELLNESS_IMO, get_vessel
from ym_datalake.synthetic_data.generate import generate
from ym_datalake.synthetic_data.validate import _spearman

_RUBERT = 'ABCDEF'
_PROP_EDGES = (210.0, 270.0, 330.0, 390.0, 470.0)


@pytest.fixture
def sample(monkeypatch):
    monkeypatch.setattr(generate_module, 'FLEET', [get_vessel(WELLNESS_IMO), FLEET[0]])
    return generate(dt.date(2021, 7, 1), dt.date(2024, 6, 30), seed=7)


def _to_date(value) -> dt.date:
    return dt.date.fromisoformat(str(value)[:10])


def _reset_dates(events, imo, types):
    return sorted(_to_date(e['event_date']) for e in events if e['imo_number'] == imo and e['event_type'] in types)


def _days_since(resets, d, fallback):
    anchor = fallback
    for r in resets:
        if r <= d:
            anchor = r
        else:
            break
    return max(0, (d - anchor).days)


def test_uwi_band_columns_are_consistent(sample):
    # Every inspection carries the numeric signals, and the categorical bands agree.
    for u in sample.uwi:
        r = u['propeller_roughness_um']
        assert 150.0 <= r <= 600.0
        assert u['propeller_condition'] == _RUBERT[sum(r >= e for e in _PROP_EDGES)]
        b = u['coating_breakdown_pct']
        assert 0.0 <= b <= 100.0
        expected = 'poor' if b >= 45 else 'fair' if b >= 20 else 'good'
        assert u['coating_condition'] == expected


def test_propeller_roughness_tracks_its_own_reset_clock(sample):
    ws = min(_to_date(t['report_date']) for t in sample.ground_truth_daily)
    xs, ys = [], []
    for imo in {u['imo_number'] for u in sample.uwi}:
        resets = _reset_dates(sample.maintenance_event, imo, ('propeller_polishing', 'dry_dock'))
        for u in sample.uwi:
            if u['imo_number'] != imo:
                continue
            xs.append(_days_since(resets, _to_date(u['inspection_date']), ws))
            ys.append(u['propeller_roughness_um'])
    assert _spearman(xs, ys) >= 0.7  # roughness rises with days-since-polish


def test_coating_breakdown_tracks_its_own_reset_clock(sample):
    ws = min(_to_date(t['report_date']) for t in sample.ground_truth_daily)
    xs, ys = [], []
    for imo in {u['imo_number'] for u in sample.uwi}:
        resets = _reset_dates(sample.maintenance_event, imo, ('coating_renewal', 'dry_dock'))
        for u in sample.uwi:
            if u['imo_number'] != imo:
                continue
            xs.append(_days_since(resets, _to_date(u['inspection_date']), ws))
            ys.append(u['coating_breakdown_pct'])
    assert _spearman(xs, ys) >= 0.7


def test_propeller_decoupled_from_hull_rating(sample):
    # Under the old coupling roughness was ~150 + 4·rating (a deterministic function of
    # the hull-fouling rating). Independence ⇒ at least one inspection departs sharply.
    assert any(abs(u['propeller_roughness_um'] - (150.0 + 4.0 * u['hull_fouling_rating'])) > 50.0 for u in sample.uwi)


def test_sfoc_secular_drift_present_and_in_band(sample):
    at_sea = [t for t in sample.ground_truth_daily if t['voyage_phase'] == 'at_sea' and t['sfoc_g_kwh'] > 0]
    assert 160.0 <= statistics.median(t['sfoc_g_kwh'] for t in at_sea) <= 215.0
    # The truth carries the drift reference fields and the drift actually accumulates.
    assert all('days_since_overhaul' in t and 'sfoc_drift_frac' in t for t in at_sea)
    assert max(t['sfoc_drift_frac'] for t in at_sea) >= 0.02
    assert max(t['sfoc_drift_frac'] for t in at_sea) <= 0.06  # capped so the median stays in band


def test_engine_overhaul_events_emitted_and_reset_drift(sample):
    assert any(e['event_type'] == 'engine_overhaul' for e in sample.maintenance_event)
    # days_since_overhaul returns to zero at each engine reset (a real cycle boundary).
    for imo in {t['imo_number'] for t in sample.ground_truth_daily}:
        rows = sorted((t for t in sample.ground_truth_daily if t['imo_number'] == imo), key=lambda t: t['report_date'])
        assert any(b['days_since_overhaul'] < a['days_since_overhaul'] for a, b in zip(rows, rows[1:]))
