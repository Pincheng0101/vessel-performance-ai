"""Real-dataset curated ETL: baseline fit, speed loss, anomalies, alerts, recommendations."""

import math

from ym_datalake.etl.real_compute import (
    SPEED_LOSS_TRIGGER_PCT,
    build_alerts,
    build_anomalies,
    build_daily,
    build_recommendations,
    days_since_events,
    fit_power_curve,
)


def _row(ship_id='S1', noon_utc=0, stw=15.0, power=10000.0, **kw):
    base = {
        'ship_id': ship_id,
        'noon_utc': noon_utc,
        'speed_through_water': stw,
        'avg_speed': stw,
        'me_avg_rpm': 60.0,
        'horse_power': power,
        'sfoc': 180.0,
        'me_slip': 10.0,
        'total_consump': 40.0,
        'me_consumption': 35.0,
        'hours_full_speed': 24.0,
        'hours_total': 24.0,
        'wind_scale': 2.0,
        'masked_flag': False,
        'predict_fuel_type': None,
    }
    base.update(kw)
    return base


def _curve_rows(a=3.0, n=3.0, days=range(60), noise=1.0):
    """Clean power-law rows: P = a * V^n at varied speeds."""
    rows = []
    for i in days:
        v = 12.0 + (i % 8)
        rows.append(_row(noon_utc=i, stw=v, power=noise * a * v**n))
    return rows


class TestFitPowerCurve:
    def test_recovers_exponent_and_coefficient(self):
        fit = fit_power_curve(_curve_rows(a=2.5, n=3.2))
        assert fit is not None
        a, n = fit
        assert math.isclose(n, 3.2, rel_tol=0.02)
        assert math.isclose(a, 2.5, rel_tol=0.1)

    def test_too_few_points_returns_none(self):
        assert fit_power_curve(_curve_rows(days=range(3))) is None


class TestBuildDaily:
    def test_clean_rows_have_near_zero_speed_loss(self):
        rows = _curve_rows()
        daily = build_daily(rows, maintenance=[])
        valid = [d for d in daily if d['valid_flag']]
        assert valid
        assert all(abs(d['speed_loss_pct']) < 1.0 for d in valid)

    def test_fouled_rows_show_positive_speed_loss(self):
        # Clean first 60 days, then same power but 8% slower STW (fouling signature).
        rows = _curve_rows()
        for i in range(60, 120):
            v = 12.0 + (i % 8)
            rows.append(_row(noon_utc=i, stw=v * 0.92, power=3.0 * v**3.0))
        daily = build_daily(rows, maintenance=[])
        late = [d for d in daily if d['noon_utc'] >= 60 and d['valid_flag']]
        assert late
        assert all(d['speed_loss_pct'] > 5.0 for d in late)

    def test_gate_marks_windy_and_short_days_invalid(self):
        rows = _curve_rows()
        rows.append(_row(noon_utc=200, wind_scale=7.0))
        rows.append(_row(noon_utc=201, hours_full_speed=3.0))
        rows.append(_row(noon_utc=202, power=None, masked_flag=True))
        daily = {d['noon_utc']: d for d in build_daily(rows, maintenance=[])}
        assert daily[200]['valid_flag'] is False
        assert daily[201]['valid_flag'] is False
        assert daily[202]['valid_flag'] is False
        assert daily[202]['speed_loss_pct'] is None


class TestDaysSinceEvents:
    def test_resets_on_cleaning_events(self):
        events = [{'ship_id': 'S1', 'event_type': 'UWC', 'event_day': 100}]
        since = days_since_events([0, 50, 100, 150], events, reset_types={'UWC', 'UWC+PP', 'DD'})
        assert since == {0: 0, 50: 50, 100: 0, 150: 50}

    def test_ignores_non_reset_events(self):
        events = [{'ship_id': 'S1', 'event_type': 'PP', 'event_day': 100}]
        since = days_since_events([0, 150], events, reset_types={'UWC', 'DD'})
        assert since == {0: 0, 150: 150}


class TestAnomalies:
    def test_flags_injected_outlier(self):
        rows = _curve_rows(days=range(120))
        rows.append(_row(noon_utc=300, sfoc=400.0))  # gross SFOC spike
        daily = build_daily(rows, maintenance=[])
        anomalies = build_anomalies(daily)
        sfoc_hits = [a for a in anomalies if a['metric'] == 'sfoc']
        assert any(a['noon_utc'] == 300 for a in sfoc_hits)
        hit = next(a for a in sfoc_hits if a['noon_utc'] == 300)
        assert hit['severity'] in ('medium', 'high')
        assert abs(hit['z_score']) >= 3.5

    def test_clean_series_yields_no_anomalies(self):
        daily = build_daily(_curve_rows(days=range(120)), maintenance=[])
        assert build_anomalies(daily) == []


class TestAlerts:
    def test_consecutive_days_group_into_one_episode(self):
        anomalies = [
            {'ship_id': 'S1', 'noon_utc': d, 'metric': 'sfoc', 'value': 400.0, 'z_score': 5.0, 'severity': 'medium'}
            for d in (10, 11, 13)
        ]
        alerts = build_alerts(anomalies, last_day_by_ship={'S1': 20})
        assert len(alerts) == 1
        a = alerts[0]
        assert (a['opened_day'], a['last_seen_day'], a['n_days']) == (10, 13, 3)
        assert a['status'] == 'open'  # last seen within the open window of day 20

    def test_gap_splits_episodes_and_old_ones_close(self):
        anomalies = [
            {'ship_id': 'S1', 'noon_utc': d, 'metric': 'sfoc', 'value': 400.0, 'z_score': 5.0, 'severity': 'low'}
            for d in (10, 100)
        ]
        alerts = build_alerts(anomalies, last_day_by_ship={'S1': 500})
        assert len(alerts) == 2
        assert all(a['status'] == 'closed' for a in alerts)


class TestRecommendations:
    def test_trigger_crossed_yields_high_priority_cleaning(self):
        # Valid daily rows whose trailing speed loss sits above the trigger.
        daily = [
            {
                'ship_id': 'S1',
                'noon_utc': d,
                'speed_loss_pct': SPEED_LOSS_TRIGGER_PCT + 2.0,
                'sfoc': 180.0,
                'me_slip': 10.0,
                'valid_flag': True,
                'days_since_cleaning': d,
            }
            for d in range(100)
        ]
        recos = build_recommendations(daily)
        cleaning = [r for r in recos if r['action_type'] == 'hull_cleaning']
        assert len(cleaning) == 1
        assert cleaning[0]['priority'] == 'high'
        assert cleaning[0]['due_day'] == 99

    def test_no_degradation_yields_no_rows(self):
        daily = [
            {
                'ship_id': 'S1',
                'noon_utc': d,
                'speed_loss_pct': 0.5,
                'sfoc': 180.0,
                'me_slip': 10.0,
                'valid_flag': True,
                'days_since_cleaning': d,
            }
            for d in range(100)
        ]
        assert build_recommendations(daily) == []
