"""C13 closed-loop validation (§3.2 / §9 M2 acceptance).

The generator injects a known ``true_speed_loss_frac``; a correct ETL must
recover it. C13 joins ``fact_performance_daily`` against the ground truth on
(imo, date) and, over valid, non-anomaly, at-sea points, checks that the
recovered ``speed_loss_pct`` matches the injected value and that the ISO 15016
corrected power matches the generator's clean-equivalent power — both to within
the sensor-noise floor. The ETL itself never reads ground truth; only this
validator does.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np

from ym_datalake.etl.compute import CuratedResult
from ym_datalake.synthetic_data.validate import CheckResult, _read_jsonl, print_report

_TOL = {
    'sl_bias': 0.002,  # |mean(recovered − true)| ≤ 0.2 pp — no systematic error
    'sl_mean_abs': 0.008,  # mean |recovered − true| ≤ the 0.8 % STW sensor-noise floor
    'sl_within': 0.02,  # per-point band …
    'sl_within_frac': 0.98,  # … holding for ≥ 98 % of points
    'power_rel': 0.03,  # |P_corrected − truth| / truth ≤ 3 % …
    'power_frac': 0.95,  # … for ≥ 95 % of points
}


def _date(value) -> str:
    return str(value)[:10]


def _pairs(fact_daily: list[dict], ground_truth: list[dict]) -> list[tuple[dict, dict]]:
    """Valid, non-anomaly, at-sea (fact, truth) pairs with a recovered speed loss."""
    truth_idx = {(t['imo_number'], _date(t['report_date'])): t for t in ground_truth}
    pairs = []
    for row in fact_daily:
        if not row.get('valid_flag') or row.get('speed_loss_pct') is None:
            continue
        t = truth_idx.get((row['imo_number'], _date(row['report_date'])))
        if t is None or t['anomaly_flag']:
            continue
        pairs.append((row, t))
    return pairs


def _check_speed_loss(pairs: list[tuple[dict, dict]]) -> CheckResult:
    errs = np.array([row['speed_loss_pct'] / 100.0 - t['true_speed_loss_frac'] for row, t in pairs])
    abs_errs = np.abs(errs)
    bias = float(errs.mean())
    mean_abs = float(abs_errs.mean())
    within = float((abs_errs <= _TOL['sl_within']).mean())
    passed = abs(bias) <= _TOL['sl_bias'] and mean_abs <= _TOL['sl_mean_abs'] and within >= _TOL['sl_within_frac']
    detail = f'bias={bias:+.4f} mean_abs={mean_abs:.4f} within_{_TOL["sl_within"]}={within:.3f}'
    return CheckResult('C13 speed-loss recovery', passed, len(pairs), int((abs_errs > _TOL['sl_within']).sum()), detail)


def _check_power(pairs: list[tuple[dict, dict]]) -> CheckResult:
    rels = [
        abs(row['power_corrected_kw'] - t['p_corrected_kw']) / t['p_corrected_kw']
        for row, t in pairs
        if t['p_corrected_kw'] > 0 and row['power_corrected_kw'] is not None
    ]
    frac_ok = float(np.mean([r <= _TOL['power_rel'] for r in rels])) if rels else 0.0
    passed = frac_ok >= _TOL['power_frac']
    return CheckResult(
        'C13 corrected-power recovery',
        passed,
        len(rels),
        int(sum(r > _TOL['power_rel'] for r in rels)),
        f'within_{_TOL["power_rel"]}={frac_ok:.3f}',
    )


def check_c13(curated: CuratedResult, ground_truth: list[dict]) -> list[CheckResult]:
    """Run the C13 closed-loop checks against the ground truth."""
    pairs = _pairs(curated.fact_performance_daily, ground_truth)
    if not pairs:
        return [CheckResult('C13 speed-loss recovery', False, 0, 0, 'no valid non-anomaly points joined')]
    return [_check_speed_loss(pairs), _check_power(pairs)]


def load_fact_daily(out_dir: str | Path) -> list[dict]:
    """Read a previously written ``curated/fact_performance_daily`` tree."""
    base = Path(out_dir) / 'curated' / 'fact_performance_daily'
    rows: list[dict] = []
    for path in sorted(base.rglob('*.jsonl')):
        rows.extend(_read_jsonl(path))
    return rows


def check_c13_from_disk(out_dir: str | Path) -> list[CheckResult]:
    """Load written curated + ground truth from ``out_dir`` and run C13."""
    curated = CuratedResult(fact_performance_daily=load_fact_daily(out_dir))
    ground_truth = _read_jsonl(Path(out_dir) / 'truth' / 'ground_truth_daily.jsonl')
    return check_c13(curated, ground_truth)


# --- C14: M3 statistical-insight validation (§5 / §9 M3 acceptance) --------

_CAUSES = ('engine_degradation', 'propeller', 'weather', 'sensor')
_SEV_ORDER = {'low': 0, 'medium': 1, 'high': 2}
_C14 = {
    'recall': 0.70,  # detection recall over the metric-bearing at-sea domain
    'precision': 0.60,
    'cause_recall': {'engine_degradation': 0.75, 'propeller': 0.70, 'sensor': 0.70, 'weather': 0.40},
    'cause_accuracy': 0.75,  # right cause among true positives
    'sev_exact': 0.50,
    'sev_within1': 0.85,
}


def _c14_pairs(fact_daily: list[dict], ground_truth: list[dict]) -> list[tuple[dict, dict]]:
    """(fact, truth) over the detection domain: every metric-bearing at-sea row."""
    truth_idx = {(t['imo_number'], _date(t['report_date'])): t for t in ground_truth}
    pairs = []
    for row in fact_daily:
        if row.get('speed_loss_pct') is None:
            continue
        t = truth_idx.get((row['imo_number'], _date(row['report_date'])))
        if t is not None:
            pairs.append((row, t))
    return pairs


def _check_detection(pairs: list[tuple[dict, dict]]) -> CheckResult:
    tp = sum(1 for r, t in pairs if r['anomaly_flag'] and t['anomaly_flag'])
    fp = sum(1 for r, t in pairs if r['anomaly_flag'] and not t['anomaly_flag'])
    fn = sum(1 for r, t in pairs if not r['anomaly_flag'] and t['anomaly_flag'])
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    passed = recall >= _C14['recall'] and precision >= _C14['precision']
    detail = f'recall={recall:.3f} precision={precision:.3f} (TP={tp} FP={fp} FN={fn})'
    return CheckResult('C14 anomaly detection', passed, len(pairs), fp + fn, detail)


def _check_causes(pairs: list[tuple[dict, dict]]) -> CheckResult:
    tot = {c: 0 for c in _CAUSES}
    hit = {c: 0 for c in _CAUSES}
    confusion: dict[tuple[str, str], int] = {}
    tp = correct = 0
    for r, t in pairs:
        if t['anomaly_flag'] and t['anomaly_cause'] in tot:
            tot[t['anomaly_cause']] += 1
            if r['anomaly_flag']:
                hit[t['anomaly_cause']] += 1
        if r['anomaly_flag'] and t['anomaly_flag']:
            tp += 1
            confusion[(t['anomaly_cause'], r['anomaly_cause'])] = (
                confusion.get((t['anomaly_cause'], r['anomaly_cause']), 0) + 1
            )
            if r['anomaly_cause'] == t['anomaly_cause']:
                correct += 1
    recalls = {c: (hit[c] / tot[c] if tot[c] else 0.0) for c in _CAUSES}
    accuracy = correct / tp if tp else 0.0
    passed = accuracy >= _C14['cause_accuracy'] and all(
        recalls[c] >= _C14['cause_recall'][c] for c in _CAUSES if tot[c]
    )
    parts = ' '.join(f'{c[:4]}={recalls[c]:.2f}(n={tot[c]})' for c in _CAUSES)
    detail = f'accuracy={accuracy:.3f} recall[{parts}]'
    return CheckResult('C14 cause classification', passed, tp, tp - correct, detail)


def _check_severity(pairs: list[tuple[dict, dict]]) -> CheckResult:
    diffs = [
        abs(_SEV_ORDER[r['anomaly_severity']] - _SEV_ORDER[t['anomaly_severity']])
        for r, t in pairs
        if r['anomaly_flag'] and t['anomaly_flag'] and r['anomaly_severity'] and t['anomaly_severity']
    ]
    if not diffs:
        return CheckResult('C14 severity', False, 0, 0, 'no severities to compare')
    exact = sum(d == 0 for d in diffs) / len(diffs)
    within1 = sum(d <= 1 for d in diffs) / len(diffs)
    passed = exact >= _C14['sev_exact'] and within1 >= _C14['sev_within1']
    return CheckResult(
        'C14 severity', passed, len(diffs), sum(d > 1 for d in diffs), f'exact={exact:.3f} within1={within1:.3f}'
    )


def _check_recommendation(recommendations: list[dict]) -> CheckResult:
    if not recommendations:
        return CheckResult('C14 recommendation', False, 0, 0, 'no recommendations emitted')
    viol = 0
    ok = 0
    for rec in recommendations:
        if rec['status'] != 'ok':
            continue
        ok += 1
        # A recommendation must clean in the future of the last cleaning, before or
        # around the maintenance-trigger ETA, with a positive fouling rate.
        if not (rec['recommended_clean_date'] and rec['recommended_clean_date'] > rec['last_cleaning_date']):
            viol += 1
        elif not (rec['t_star_days'] and rec['t_star_days'] > 0):
            viol += 1
        elif not (rec['fouling_rate_pct_per_day'] and rec['fouling_rate_pct_per_day'] > 0):
            viol += 1
    passed = viol == 0
    return CheckResult('C14 recommendation', passed, len(recommendations), viol, f'{ok} actionable, {viol} implausible')


def _check_maintenance(events: list[dict]) -> CheckResult:
    recoveries = [
        e['me_recovery_pct'] for e in events if e['event_type'] == 'hull_cleaning' and e['me_recovery_pct'] is not None
    ]
    if not recoveries:
        return CheckResult('C14 maintenance effect', False, 0, 0, 'no hull-cleaning ME recovery enriched')
    positive = sum(r > 0 for r in recoveries) / len(recoveries)
    passed = positive >= 0.5  # cleaning should, on the whole, recover speed loss
    return CheckResult(
        'C14 maintenance effect',
        passed,
        len(recoveries),
        int(sum(r <= 0 for r in recoveries)),
        f'positive_recovery_frac={positive:.3f}',
    )


def check_c14(curated: CuratedResult, ground_truth: list[dict]) -> list[CheckResult]:
    """Run the M3 statistical-insight checks against the ground truth."""
    pairs = _c14_pairs(curated.fact_performance_daily, ground_truth)
    if not pairs:
        return [CheckResult('C14 anomaly detection', False, 0, 0, 'no metric-bearing points joined')]
    return [
        _check_detection(pairs),
        _check_causes(pairs),
        _check_severity(pairs),
        _check_recommendation(curated.fact_recommendation),
        _check_maintenance(curated.fact_maintenance_event),
    ]


# --- C18: voyage energy balance (§9 M2 acceptance) ------------------------

_C18_REL_TOL = 1e-6


def check_c18(curated: CuratedResult, noon_report: list[dict]) -> list[CheckResult]:
    """Per vessel, ``Σ fact_voyage.total_foc_mt`` must equal ``Σ noon.total_foc_mt``.

    Every Noon Report row belongs to exactly one voyage, so the voyage roll-up must
    conserve fuel exactly (up to float rounding) — a dropped or double-counted leg
    would break the balance.
    """
    voy_by_imo: dict[str, float] = {}
    for v in curated.fact_voyage:
        voy_by_imo[v['imo_number']] = voy_by_imo.get(v['imo_number'], 0.0) + v['total_foc_mt']
    noon_by_imo: dict[str, float] = {}
    for n in noon_report:
        noon_by_imo[n['imo_number']] = noon_by_imo.get(n['imo_number'], 0.0) + n['total_foc_mt']

    viol = 0
    worst = 0.0
    for imo, noon_sum in noon_by_imo.items():
        voy_sum = voy_by_imo.get(imo, 0.0)
        rel = abs(voy_sum - noon_sum) / noon_sum if noon_sum else (0.0 if voy_sum == 0 else 1.0)
        worst = max(worst, rel)
        if rel > _C18_REL_TOL:
            viol += 1
    return [CheckResult('C18 voyage energy balance', viol == 0, len(noon_by_imo), viol, f'max_rel_err={worst:.2e}')]


# --- C19: bunker/slow-steaming economical speed (§Phase 2 acceptance) ------

_C19_TOL = 1e-9


def check_c19(curated: CuratedResult) -> list[CheckResult]:
    """Per vessel, ``recommended_speed_kn`` must equal the ``usd_per_nm`` argmin and
    that argmin must be strictly interior to the speed grid.

    The optimizer prices fuel plus a per-day charter cost, so ``usd_per_nm`` is
    convex with an interior *economical speed*. A minimum at the slowest or fastest
    grid point would mean the time cost was mis-sized (a degenerate, monotone
    fuel-only curve) — so a boundary argmin fails the check.
    """
    by_imo: dict[str, list[dict]] = {}
    for r in curated.fact_speed_profile:
        by_imo.setdefault(r['imo_number'], []).append(r)
    if not by_imo:
        return [CheckResult('C19 economical speed', False, 0, 0, 'no fact_speed_profile rows')]

    mismatch = 0
    boundary = 0
    for rows in by_imo.values():
        rows = sorted(rows, key=lambda r: r['speed_kn'])
        argmin_idx = min(range(len(rows)), key=lambda i: rows[i]['usd_per_nm'])
        if abs(rows[argmin_idx]['speed_kn'] - rows[0]['recommended_speed_kn']) > _C19_TOL:
            mismatch += 1
        elif argmin_idx == 0 or argmin_idx == len(rows) - 1:
            boundary += 1
    viol = mismatch + boundary
    return [
        CheckResult(
            'C19 economical speed',
            viol == 0,
            len(by_imo),
            viol,
            f'{mismatch} argmin≠recommended, {boundary} boundary (degenerate) min',
        )
    ]


# --- C20: weather-attribution additivity (§Phase 4 acceptance) ------------

_C20_IDENT_TOL = 1e-9
_C20_NEG_EPS = 1e-9


def check_c20(curated: CuratedResult) -> list[CheckResult]:
    """The excess-cost attribution channels are additive and well-formed.

    ``fouling`` must equal the C13-validated ``excess_cost_usd`` headline; ``weather``
    and ``operational`` are non-negative extra channels; the three are co-null with
    ``excess_cost_usd`` and their sum (the chart's displayed total) is finite. Σweather
    over the fleet must be materially positive — a near-zero weather band would mean the
    decomposition collapsed back to fouling-only (the Option-B failure mode).
    """
    checked = ident_viol = neg_viol = null_viol = 0
    weather_sum = 0.0
    for row in curated.fact_performance_daily:
        base = row['excess_cost_usd']
        fouling = row['excess_cost_fouling_usd']
        weather = row['excess_cost_weather_usd']
        operational = row['excess_cost_operational_usd']
        present = [v is not None for v in (fouling, weather, operational)]
        if base is None:
            null_viol += any(present)
            continue
        if not all(present):
            null_viol += 1
            continue
        checked += 1
        if abs(fouling - base) > _C20_IDENT_TOL * max(1.0, abs(base)):
            ident_viol += 1
        if min(fouling, weather, operational) < -_C20_NEG_EPS or not np.isfinite(fouling + weather + operational):
            neg_viol += 1
        weather_sum += weather
    viol = ident_viol + neg_viol + null_viol + (0 if weather_sum > 0.0 else 1)
    detail = f'identity_viol={ident_viol} neg_viol={neg_viol} null_viol={null_viol} sum_weather={weather_sum:.0f}'
    return [CheckResult('C20 weather attribution', viol == 0, checked, viol, detail)]


__all__ = [
    'check_c13',
    'check_c13_from_disk',
    'check_c14',
    'check_c18',
    'check_c19',
    'check_c20',
    'load_fact_daily',
    'print_report',
]
