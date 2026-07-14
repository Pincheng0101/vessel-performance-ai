"""C14 M3 acceptance: anomaly detection, cause classification, severity, determinism."""

import datetime as dt

import pytest

from ym_datalake.etl.compute import compute_curated
from ym_datalake.etl.validate import check_c14
from ym_datalake.synthetic_data import generate as generate_module
from ym_datalake.synthetic_data.fleet import FLEET, WELLNESS_IMO, get_vessel
from ym_datalake.synthetic_data.generate import generate

_CAUSES = ('engine_degradation', 'propeller', 'weather', 'sensor')
_SEV = {'low': 0, 'medium': 1, 'high': 2}


@pytest.fixture
def curated_with_truth(monkeypatch):
    """WELLNESS + a Feeder over three years — the engineered arc plus a small ship."""
    monkeypatch.setattr(generate_module, 'FLEET', [get_vessel(WELLNESS_IMO), FLEET[0]])
    raw = generate(dt.date(2021, 7, 1), dt.date(2024, 6, 30), seed=7)
    return compute_curated(raw), raw


def _metrics(curated, raw):
    truth = {(t['imo_number'], str(t['report_date'])[:10]): t for t in raw.ground_truth_daily}
    checked = tp = fp = fn = cause_tp = cause_ok = 0
    tot = {c: 0 for c in _CAUSES}
    hit = {c: 0 for c in _CAUSES}
    sev_diffs = []
    for r in curated.fact_performance_daily:
        if r['speed_loss_pct'] is None:
            continue
        t = truth.get((r['imo_number'], r['report_date']))
        if t is None:
            continue
        checked += 1
        pred, act = bool(r['anomaly_flag']), bool(t['anomaly_flag'])
        tp += pred and act
        fp += pred and not act
        fn += (not pred) and act
        if act and t['anomaly_cause'] in tot:
            tot[t['anomaly_cause']] += 1
            hit[t['anomaly_cause']] += pred
        if pred and act:
            cause_tp += 1
            cause_ok += r['anomaly_cause'] == t['anomaly_cause']
            if r['anomaly_severity'] and t['anomaly_severity']:
                sev_diffs.append(abs(_SEV[r['anomaly_severity']] - _SEV[t['anomaly_severity']]))
    return {
        'checked': checked,
        'recall': tp / (tp + fn),
        'precision': tp / (tp + fp),
        'cause_recall': {c: hit[c] / tot[c] for c in _CAUSES if tot[c]},
        'cause_accuracy': cause_ok / cause_tp,
        'sev_exact': sum(d == 0 for d in sev_diffs) / len(sev_diffs),
        'sev_within1': sum(d <= 1 for d in sev_diffs) / len(sev_diffs),
    }


def test_c14_checks_pass(curated_with_truth):
    curated, raw = curated_with_truth
    failures = [r for r in check_c14(curated, raw.ground_truth_daily) if not r.passed]
    assert not failures, 'C14 failed:\n' + '\n'.join(f'  {r.rule}: {r.detail}' for r in failures)


def test_c14_detection_thresholds(curated_with_truth):
    m = _metrics(*curated_with_truth)
    assert m['checked'] > 100, f'too few points joined ({m["checked"]})'
    assert m['recall'] >= 0.70, f'recall {m["recall"]:.3f}'
    assert m['precision'] >= 0.60, f'precision {m["precision"]:.3f}'


def test_c14_cause_thresholds(curated_with_truth):
    m = _metrics(*curated_with_truth)
    floors = {'engine_degradation': 0.75, 'propeller': 0.70, 'sensor': 0.70, 'weather': 0.40}
    for cause, floor in floors.items():
        assert m['cause_recall'][cause] >= floor, f'{cause} recall {m["cause_recall"][cause]:.3f} < {floor}'
    assert m['cause_accuracy'] >= 0.75, f'cause accuracy {m["cause_accuracy"]:.3f}'


def test_c14_severity_thresholds(curated_with_truth):
    m = _metrics(*curated_with_truth)
    assert m['sev_exact'] >= 0.50, f'severity exact {m["sev_exact"]:.3f}'
    assert m['sev_within1'] >= 0.85, f'severity within-1 {m["sev_within1"]:.3f}'


def test_c14_emits_nonempty_facts(curated_with_truth):
    curated, _ = curated_with_truth
    assert len(curated.fact_anomaly) > 100
    assert len(curated.fact_recommendation) == 2  # one per vessel
    # fact_anomaly grain is one row per flagged (imo, date).
    keys = {(a['imo_number'], a['report_date']) for a in curated.fact_anomaly}
    assert len(keys) == len(curated.fact_anomaly)
    flagged = sum(1 for r in curated.fact_performance_daily if r['anomaly_flag'])
    assert len(curated.fact_anomaly) == flagged


def test_c14_deterministic_same_seed(monkeypatch):
    monkeypatch.setattr(generate_module, 'FLEET', [FLEET[0]])
    a = compute_curated(generate(dt.date(2021, 7, 1), dt.date(2022, 6, 30), seed=5))
    b = compute_curated(generate(dt.date(2021, 7, 1), dt.date(2022, 6, 30), seed=5))
    assert a.fact_performance_daily == b.fact_performance_daily
    assert a.fact_anomaly == b.fact_anomaly
    assert a.fact_recommendation == b.fact_recommendation
    assert a.fact_alert == b.fact_alert


def test_fact_alert_episodes_and_biofouling(curated_with_truth):
    curated, _ = curated_with_truth
    assert curated.fact_alert, 'no alert episodes emitted'
    # Every alert is an open episode with a bilingual narrative + a recommended action.
    for a in curated.fact_alert:
        assert a['status'] == 'open'
        assert a['message_zh'] and a['message_en'] and a['recommended_action']
        assert a['cause'] in {'hull_biofouling', 'propeller', 'engine_degradation', 'weather', 'sensor'}
    # alert_id is unique per episode.
    ids = [a['alert_id'] for a in curated.fact_alert]
    assert len(ids) == len(set(ids))
    # WELLNESS (the engineered fouling arc) raises a hull_biofouling trend alert — the Q3 gap.
    bio = [a for a in curated.fact_alert if a['cause'] == 'hull_biofouling' and a['imo_number'] == WELLNESS_IMO]
    assert bio, 'expected a hull_biofouling alert for WELLNESS'
    assert bio[0]['source'] == 'fouling_model'


def test_agg_fleet_daily_grain(curated_with_truth):
    curated, _ = curated_with_truth
    agg = curated.agg_fleet_daily
    fleet_ids = {r['fleet_id'] for r in agg}
    # An 'ALL' rollup plus the sub-fleets present (WELLNESS=FL-AE, the Feeder=FL-IA).
    assert 'ALL' in fleet_ids
    assert {'FL-AE', 'FL-IA'} <= fleet_ids
    # The 'ALL' rollup preserves the historical single-grain values (n_vessels over the whole fleet).
    all_by_date = {r['report_date']: r for r in agg if r['fleet_id'] == 'ALL'}
    sub_by_date = {}
    for r in agg:
        if r['fleet_id'] != 'ALL':
            sub_by_date.setdefault(r['report_date'], 0)
            sub_by_date[r['report_date']] += r['n_vessels']
    for date, all_row in all_by_date.items():
        assert all_row['n_vessels'] == sub_by_date[date]  # sub-fleets partition the fleet
