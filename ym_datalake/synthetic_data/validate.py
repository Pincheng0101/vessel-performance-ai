"""Consistency validation C1–C12 + C15–C17 (§3.2 / §9 M1 acceptance).

Runs each physics-consistency rule over a generated dataset (in memory or loaded
from disk) with a per-rule tolerance, printing PASS/FAIL and violation counts.
C13/C14 (closed-loop ISO recovery + M3 statistical insight) live in the ETL and
are deferred to ``etl.validate``.

Rank correlations (C10/C11/C15–C17) use numpy argsort ranks; no scipy dependency.
Physics rules (C1–C7, C12) evaluate steady at-sea, non-anomaly points — labeled
anomalies are expected outliers and are checked separately by C12. C15–C17 verify
the independent degradation processes: propeller roughness (C15) and coating
breakdown (C16) rank-correlate with days-since their own reset clock, and the
load-normalized SFOC (C17) rank-correlates with days-since-overhaul per engine
cycle (the secular drift is baked into the observable).
"""

from __future__ import annotations

import datetime as dt
import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from ym_datalake.synthetic_data import physics
from ym_datalake.synthetic_data.curves import build_curve
from ym_datalake.synthetic_data.fleet import get_vessel
from ym_datalake.synthetic_data.generate import GenerationResult

# Per-rule tolerances (relative unless noted).
_TOL = {
    'C1': 0.05,
    'C2': 0.05,
    'C3': 0.01,
    'C4_kn': 0.05,  # absolute knots
    'C5': 0.02,
    'C6': 1e-6,  # absolute metres
    'C7_lo': -0.05,
    'C7_hi': 0.30,
    'C8': 0.005,
    'C9_slope': -3e-5,
    'C9_min_pts': 30,
    'C10_spearman': 0.7,
    'C11_pearson': 0.6,
    'C12_bound': 0.03,
    'C12_gross': 0.10,
    'C15_spearman': 0.7,  # propeller roughness vs days-since-polish
    'C15_step_um': 16.0,  # within-cycle non-decreasing tolerance (2× noise)
    'C16_spearman': 0.7,  # coating breakdown vs days-since-coating-reset
    'C16_step_pct': 3.0,  # within-cycle non-decreasing tolerance (3× noise)
    'C17_spearman': 0.5,  # load-normalized SFOC vs days-since-overhaul (per engine cycle)
    'C17_min_pts': 30,
    'C17_sfoc_lo': 160.0,
    'C17_sfoc_hi': 215.0,
}
_MIN_STW_KN = 5.0
_SFOC_LOAD_COEF = 0.18  # generator's load-dependent SFOC U-shape (generate._sfoc)


@dataclass
class CheckResult:
    rule: str
    passed: bool
    checked: int
    violations: int
    detail: str = ''


def _date_str(value) -> str:
    if isinstance(value, dt.date):
        return value.isoformat()
    return str(value)[:10]


def _pearson(x, y) -> float:
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    if len(x) < 3:
        return 0.0
    xm, ym = x - x.mean(), y - y.mean()
    denom = float(np.sqrt((xm * xm).sum() * (ym * ym).sum()))
    return float((xm * ym).sum() / denom) if denom > 0 else 0.0


def _ranks(a) -> np.ndarray:
    a = np.asarray(a, dtype=float)
    order = np.argsort(a, kind='mergesort')
    ranks = np.empty(len(a), dtype=float)
    ranks[order] = np.arange(len(a), dtype=float)
    return ranks


def _spearman(x, y) -> float:
    return _pearson(_ranks(x), _ranks(y))


def _truth_index(truth: list[dict]) -> dict[tuple[str, str], dict]:
    return {(t['imo_number'], _date_str(t['report_date'])): t for t in truth}


def _steady_points(noon: list[dict], truth_idx: dict) -> list[tuple[dict, dict]]:
    """At-sea, moving, non-anomaly (noon, truth) pairs — the physics-check set."""
    pairs = []
    for rec in noon:
        if rec['voyage_phase'] != 'at_sea' or rec['steaming_hours'] <= 0 or rec['speed_tw_kn'] < _MIN_STW_KN:
            continue
        key = (rec['imo_number'], _date_str(rec['report_datetime_utc']))
        t = truth_idx.get(key)
        if t is None or t['anomaly_flag']:
            continue
        pairs.append((rec, t))
    return pairs


# --- Individual rules -----------------------------------------------------


def _check_c1(pairs) -> CheckResult:
    viol = 0
    for rec, t in pairs:
        spec = get_vessel(rec['imo_number'])
        curve = build_curve(spec)
        v_ref = t['true_stw_kn'] / (1.0 - t['true_speed_loss_frac'])
        p_corrected = curve.clean_power_kw(v_ref, t['displacement_mt'])
        dp_env = physics.resistance_to_power_kw((t['r_aa_kn'] + t['r_aw_kn']) * 1000.0, t['true_stw_kn'])
        expected = p_corrected + dp_env
        if abs(rec['me_shaft_power_kw'] - expected) / expected > _TOL['C1']:
            viol += 1
    return CheckResult('C1 speed-power', viol == 0, len(pairs), viol)


def _check_c2(pairs) -> CheckResult:
    viol = 0
    for rec, t in pairs:
        implied_sfoc = rec['me_foc_mt'] * 1.0e6 / (rec['me_shaft_power_kw'] * rec['steaming_hours'])
        if abs(implied_sfoc - t['sfoc_g_kwh']) / t['sfoc_g_kwh'] > _TOL['C2']:
            viol += 1
    return CheckResult('C2 energy balance', viol == 0, len(pairs), viol)


def _check_c3(pairs) -> CheckResult:
    viol = 0
    for rec, _ in pairs:
        exp_tw = rec['speed_tw_kn'] * rec['steaming_hours']
        exp_og = rec['speed_og_kn'] * rec['steaming_hours']
        if abs(rec['distance_tw_nm'] - exp_tw) / exp_tw > _TOL['C3']:
            viol += 1
        elif exp_og > 0 and abs(rec['distance_og_nm'] - exp_og) / exp_og > _TOL['C3']:
            viol += 1
    return CheckResult('C3 distance', viol == 0, len(pairs), viol)


def _check_c4(pairs) -> CheckResult:
    viol = 0
    for rec, t in pairs:
        proj = physics.current_projection_kn(rec['current_speed_kn'], rec['current_dir_deg'], t['heading_deg'])
        if abs((rec['speed_og_kn'] - rec['speed_tw_kn']) - proj) > _TOL['C4_kn']:
            viol += 1
    return CheckResult('C4 SOG=STW+current', viol == 0, len(pairs), viol)


def _check_c5(noon) -> CheckResult:
    viol = checked = 0
    for rec in noon:
        if rec['displacement_mt'] <= 0:
            continue
        spec = get_vessel(rec['imo_number'])
        recomputed = physics.displacement_from_draft(
            rec['mean_draft_m'], spec.block_coefficient, spec.lpp_m, spec.breadth_m, physics.RHO_SW_REF_KG_M3
        )
        checked += 1
        if abs(recomputed - rec['displacement_mt']) / rec['displacement_mt'] > _TOL['C5']:
            viol += 1
    return CheckResult('C5 displacement-draft', viol == 0, checked, viol)


def _check_c6(noon) -> CheckResult:
    viol = 0
    for rec in noon:
        mean_ok = abs(rec['mean_draft_m'] - (rec['draft_fore_m'] + rec['draft_aft_m']) / 2.0) <= _TOL['C6']
        trim_ok = abs(rec['trim_m'] - (rec['draft_aft_m'] - rec['draft_fore_m'])) <= _TOL['C6']
        if not (mean_ok and trim_ok):
            viol += 1
    return CheckResult('C6 trim/mean-draft', viol == 0, len(noon), viol)


def _check_c7(pairs) -> CheckResult:
    viol = 0
    for rec, _ in pairs:
        v_th = physics.theoretical_speed_kn(rec['propeller_pitch_m'], rec['me_rpm'])
        if v_th <= 0:
            continue
        slip = (v_th - rec['speed_tw_kn']) / v_th
        if slip < _TOL['C7_lo'] or slip > _TOL['C7_hi']:
            viol += 1
    return CheckResult('C7 propeller slip', viol == 0, len(pairs), viol)


def _check_c8(noon) -> CheckResult:
    viol = checked = 0
    for rec in noon:
        fuel = rec['fuel_type']
        if fuel not in physics.CARBON_FACTORS:
            viol += 1
            continue
        cf = physics.CARBON_FACTORS[fuel]
        co2_total = rec['total_foc_mt'] * cf
        co2_parts = (rec['me_foc_mt'] + rec['ae_foc_mt'] + rec['boiler_foc_mt']) * cf
        if co2_total <= 0:
            continue
        checked += 1
        if abs(co2_total - co2_parts) / co2_total > _TOL['C8']:
            viol += 1
    return CheckResult('C8 carbon/FOC sum', viol == 0, checked, viol)


def _check_c9(truth) -> CheckResult:
    by_vessel: dict[str, list[dict]] = {}
    for t in truth:
        by_vessel.setdefault(t['imo_number'], []).append(t)

    slope_viol = step_viol = segments_checked = 0
    for rows in by_vessel.values():
        rows = sorted(rows, key=lambda r: _date_str(r['report_date']))
        # Step-down at reset events: s drops when the segment id changes.
        for prev, cur in zip(rows, rows[1:]):
            if cur['fouling_segment_id'] != prev['fouling_segment_id']:
                if cur['true_speed_loss_frac'] > prev['true_speed_loss_frac'] + 1e-6:
                    step_viol += 1
        # Per-segment slope ≥ ~0 (roughly increasing with days since cleaning).
        segs: dict[int, list[dict]] = {}
        for r in rows:
            segs.setdefault(r['fouling_segment_id'], []).append(r)
        for seg_rows in segs.values():
            if len(seg_rows) < _TOL['C9_min_pts']:
                continue
            x = np.array([r['days_since_cleaning'] for r in seg_rows], dtype=float)
            y = np.array([r['true_speed_loss_frac'] for r in seg_rows], dtype=float)
            if x.std() == 0:
                continue
            slope = float(np.polyfit(x, y, 1)[0])
            segments_checked += 1
            if slope < _TOL['C9_slope']:
                slope_viol += 1
    viol = slope_viol + step_viol
    return CheckResult(
        'C9 fouling monotonicity', viol == 0, segments_checked, viol, f'slope_viol={slope_viol} step_viol={step_viol}'
    )


def _check_c10(uwi, truth_idx) -> CheckResult:
    ratings, s_true = [], []
    for u in uwi:
        key = (u['imo_number'], _date_str(u['inspection_date']))
        t = truth_idx.get(key)
        if t is not None:
            ratings.append(u['hull_fouling_rating'])
            s_true.append(t['true_speed_loss_frac'])
    if len(ratings) < 5:
        return CheckResult('C10 UWI corroboration', False, len(ratings), 0, 'insufficient joined UWI points')
    rho = _spearman(ratings, s_true)
    return CheckResult('C10 UWI corroboration', rho >= _TOL['C10_spearman'], len(ratings), 0, f'spearman={rho:.3f}')


def _check_c11(noon) -> CheckResult:
    beaufort = [r['beaufort'] for r in noon]
    wave = [r['wave_height_m'] for r in noon]
    wind = [r['wind_speed_kn'] for r in noon]
    temp = [r['sea_water_temp_c'] for r in noon]
    density = [r['sea_water_density_kg_m3'] for r in noon]
    bf_wave = _pearson(beaufort, wave)
    bf_wind = _pearson(beaufort, wind)
    temp_density = _pearson(temp, density)
    passed = bf_wave >= _TOL['C11_pearson'] and bf_wind >= _TOL['C11_pearson'] and temp_density <= -_TOL['C11_pearson']
    detail = f'bf~wave={bf_wave:.2f} bf~wind={bf_wind:.2f} temp~density={temp_density:.2f}'
    return CheckResult('C11 met-ocean correlation', passed, len(noon), 0, detail)


def _check_c12(noon, truth_idx) -> CheckResult:
    bound_viol = gross_viol = checked = anomalies = 0
    for rec in noon:
        if rec['voyage_phase'] != 'at_sea' or rec['speed_tw_kn'] < _MIN_STW_KN:
            continue
        key = (rec['imo_number'], _date_str(rec['report_datetime_utc']))
        t = truth_idx.get(key)
        if t is None or t['true_shaft_power_kw'] <= 0:
            continue
        errs = [
            abs(rec['me_shaft_power_kw'] - t['true_shaft_power_kw']) / t['true_shaft_power_kw'],
            abs(rec['speed_tw_kn'] - t['true_stw_kn']) / t['true_stw_kn'],
        ]
        if t['anomaly_flag']:
            anomalies += 1
            continue
        checked += 1
        if max(errs) > _TOL['C12_bound']:
            bound_viol += 1
        # Gross outliers must be labeled — a non-anomaly point may never be one.
        if max(errs) > _TOL['C12_gross']:
            gross_viol += 1
    passed = bound_viol == 0 and gross_viol == 0 and anomalies > 0
    detail = f'bound_viol={bound_viol} gross_unlabeled={gross_viol} labeled_anomalies={anomalies}'
    return CheckResult('C12 measurement=truth+noise', passed, checked, bound_viol + gross_viol, detail)


# --- C15–C17: independent degradation processes ---------------------------


def _to_date(value) -> dt.date:
    if isinstance(value, dt.date):
        return value
    return dt.date.fromisoformat(str(value)[:10])


def _reset_dates(events: list[dict], imo: str, types: tuple[str, ...]) -> list[dt.date]:
    return sorted(_to_date(e['event_date']) for e in events if e['imo_number'] == imo and e['event_type'] in types)


def _anchor(resets: list[dt.date], d: dt.date, fallback: dt.date) -> dt.date:
    anchor = fallback
    for r in resets:
        if r <= d:
            anchor = r
        else:
            break
    return anchor


def _check_degradation(
    rule: str,
    rows: list[dict],
    date_key: str,
    value_key: str,
    events: list[dict],
    types: tuple[str, ...],
    window_start: dt.date,
    spearman_tol: float,
    step_tol: float,
) -> CheckResult:
    """Shared C15/C16: value rank-correlates with days-since-reset (reset clock =
    ``types``) and is non-decreasing within each cycle (step-down handled by the
    dsc rank-corr — a reset drops days-since-reset, hence the sampled value)."""
    by_vessel: dict[str, list[dict]] = {}
    for r in rows:
        by_vessel.setdefault(r['imo_number'], []).append(r)
    xs: list[int] = []
    ys: list[float] = []
    step_viol = 0
    for imo, vrows in by_vessel.items():
        vrows = sorted(vrows, key=lambda r: _date_str(r[date_key]))
        resets = _reset_dates(events, imo, types)
        prev_anchor: dt.date | None = None
        prev_val = 0.0
        for r in vrows:
            d = _to_date(r[date_key])
            anchor = _anchor(resets, d, window_start)
            xs.append((d - anchor).days)
            ys.append(r[value_key])
            if prev_anchor is not None and anchor == prev_anchor and r[value_key] < prev_val - step_tol:
                step_viol += 1  # within-cycle decrease beyond noise
            prev_anchor, prev_val = anchor, r[value_key]
    if len(xs) < 5:
        return CheckResult(rule, False, len(xs), 0, 'insufficient inspection points')
    rho = _spearman(xs, ys)
    passed = rho >= spearman_tol and step_viol == 0
    return CheckResult(rule, passed, len(xs), step_viol, f'spearman={rho:.3f} step_viol={step_viol}')


def _check_c15(uwi: list[dict], events: list[dict], window_start: dt.date) -> CheckResult:
    return _check_degradation(
        'C15 propeller roughness',
        uwi,
        'inspection_date',
        'propeller_roughness_um',
        events,
        ('propeller_polishing', 'dry_dock'),
        window_start,
        _TOL['C15_spearman'],
        _TOL['C15_step_um'],
    )


def _check_c16(uwi: list[dict], events: list[dict], window_start: dt.date) -> CheckResult:
    return _check_degradation(
        'C16 coating breakdown',
        uwi,
        'inspection_date',
        'coating_breakdown_pct',
        events,
        ('coating_renewal', 'dry_dock'),
        window_start,
        _TOL['C16_spearman'],
        _TOL['C16_step_pct'],
    )


def _check_c17(truth: list[dict]) -> CheckResult:
    """Load-normalized SFOC rank-correlates with days-since-overhaul within each
    engine cycle (secular drift is baked into the observable), median SFOC in band."""
    by_vessel: dict[str, list[dict]] = {}
    for t in truth:
        if t['voyage_phase'] == 'at_sea' and t['sfoc_g_kwh'] and t['sfoc_g_kwh'] > 0:
            by_vessel.setdefault(t['imo_number'], []).append(t)
    corr_viol = cycles = 0
    all_sfoc: list[float] = []
    for imo, rows in by_vessel.items():
        spec = get_vessel(imo)
        rows = sorted(rows, key=lambda r: _date_str(r['report_date']))
        all_sfoc.extend(r['sfoc_g_kwh'] for r in rows)
        groups: list[list[dict]] = []
        cyc: list[dict] = []
        prev_dso: int | None = None
        for r in rows:
            dso = r['days_since_overhaul']
            if prev_dso is not None and dso < prev_dso:
                groups.append(cyc)
                cyc = []
            cyc.append(r)
            prev_dso = dso
        if cyc:
            groups.append(cyc)
        for g in groups:
            pts = [r for r in g if not r['anomaly_flag']]  # labeled steps excluded from the drift trend
            dso = [r['days_since_overhaul'] for r in pts]
            if len(pts) < _TOL['C17_min_pts'] or float(np.std(dso)) == 0.0:
                continue
            ratio = []
            for r in pts:
                load = min(1.05, max(0.2, r['true_shaft_power_kw'] / spec.mcr_kw))
                ratio.append(r['sfoc_g_kwh'] / (1.0 + _SFOC_LOAD_COEF * (load - 0.80) ** 2))
            cycles += 1
            if _spearman(dso, ratio) < _TOL['C17_spearman']:
                corr_viol += 1
    if not all_sfoc or cycles == 0:
        return CheckResult('C17 engine SFOC drift', False, cycles, 0, 'no engine cycles to check')
    med = float(np.median(all_sfoc))
    band_ok = _TOL['C17_sfoc_lo'] <= med <= _TOL['C17_sfoc_hi']
    return CheckResult(
        'C17 engine SFOC drift',
        corr_viol == 0 and band_ok,
        cycles,
        corr_viol,
        f'corr_viol={corr_viol} median_sfoc={med:.1f}',
    )


def validate_result(result: GenerationResult) -> list[CheckResult]:
    """Run C1–C17 and return one :class:`CheckResult` per rule."""
    truth_idx = _truth_index(result.ground_truth_daily)
    pairs = _steady_points(result.noon_report, truth_idx)
    window_start = min(_to_date(t['report_date']) for t in result.ground_truth_daily)
    return [
        _check_c1(pairs),
        _check_c2(pairs),
        _check_c3(pairs),
        _check_c4(pairs),
        _check_c5(result.noon_report),
        _check_c6(result.noon_report),
        _check_c7(pairs),
        _check_c8(result.noon_report),
        _check_c9(result.ground_truth_daily),
        _check_c10(result.uwi, truth_idx),
        _check_c11(result.noon_report),
        _check_c12(result.noon_report, truth_idx),
        _check_c15(result.uwi, result.maintenance_event, window_start),
        _check_c16(result.uwi, result.maintenance_event, window_start),
        _check_c17(result.ground_truth_daily),
    ]


def print_report(results: list[CheckResult]) -> bool:
    """Print per-rule PASS/FAIL; return True iff all rules pass."""
    all_passed = True
    for r in results:
        status = 'PASS' if r.passed else 'FAIL'
        all_passed = all_passed and r.passed
        line = f'[{status}] {r.rule:<32} checked={r.checked:<7} violations={r.violations}'
        if r.detail:
            line += f'  ({r.detail})'
        print(line)
    print(f'\n{"ALL CHECKS PASSED" if all_passed else "SOME CHECKS FAILED"}')
    return all_passed


# --- Load from disk (CLI `validate --dir`) --------------------------------


def _read_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open(encoding='utf-8') as fh:
        return [json.loads(line) for line in fh if line.strip()]


def load_result(out_dir: str | Path) -> GenerationResult:
    """Reconstruct a :class:`GenerationResult` from written raw/ + truth/ files."""
    out = Path(out_dir)
    raw, truth = out / 'raw', out / 'truth'
    result = GenerationResult()
    for path in sorted((raw / 'noon_report').rglob('*.jsonl')):
        result.noon_report.extend(_read_jsonl(path))
    result.vessel_master = _read_jsonl(raw / 'vessel_master' / 'vessel_master.jsonl')
    result.reference_curve = _read_jsonl(raw / 'reference_curve' / 'reference_curve.jsonl')
    result.uwi = _read_jsonl(raw / 'uwi' / 'uwi.jsonl')
    result.maintenance_event = _read_jsonl(raw / 'maintenance_event' / 'maintenance_event.jsonl')
    result.fuel_price = _read_jsonl(raw / 'fuel_price' / 'fuel_price.jsonl')
    result.ground_truth_daily = _read_jsonl(truth / 'ground_truth_daily.jsonl')
    result.fouling_segments = _read_jsonl(truth / 'fouling_segments.jsonl')
    return result
