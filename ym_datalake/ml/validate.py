"""M7 validation — C21 backtest gate, C22 prediction consistency, C23 plan sanity (§8).

Continues the C-series after the M2/M3 checks (C20 = weather attribution in
``etl.validate``). Reuses the shared :class:`CheckResult` / ``print_report``
report shape so the CLI output reads like every other milestone's checks.
"""

from __future__ import annotations

import datetime as dt
import json
from pathlib import Path

import numpy as np

from ym_datalake.etl.periods import MT_TRIGGER_PCT
from ym_datalake.ml import maintenance, registry
from ym_datalake.synthetic_data.validate import CheckResult, print_report

__all__ = ['check_c21', 'check_c22', 'check_c23', 'load_ml_tree', 'print_report']

_HORIZON_MAX = 90


def check_c21(models_dir: str | Path) -> list[CheckResult]:
    """Champion regressors must have beaten the naive baselines in backtest."""
    results = []
    for target in ('speed_loss', 'foc'):
        try:
            _, meta = registry.load_champion(models_dir, target)
        except FileNotFoundError:
            results.append(CheckResult(f'C21 {target} champion exists', False, 0, 1, 'no champion saved'))
            continue
        bt = meta.get('backtest') or {}
        passed = bool(bt.get('passes_gate'))
        rmse = bt.get('rmse', {})
        detail = ' '.join(f'{k}={v:.3f}' for k, v in sorted(rmse.items())) or 'no backtest metrics'
        results.append(CheckResult(f'C21 {target} beats baselines', passed, 1, 0 if passed else 1, detail))
    return results


def _preds_ok(row: dict) -> bool:
    sl, foc = row.get('speed_loss_pct_pred'), row.get('foc_mt_pred')
    return sl is not None and foc is not None and foc >= 0.0


def check_c22(pred_rows: list[dict]) -> list[CheckResult]:
    """fact_ml_prediction — point predictions present, exact horizons, full coverage."""
    if not pred_rows:
        return [CheckResult('C22 prediction rows exist', False, 0, 1, 'empty table')]

    bad_q = sum(1 for r in pred_rows if not _preds_ok(r))
    bad_h = sum(
        1
        for r in pred_rows
        if (dt.date.fromisoformat(r['target_date']) - dt.date.fromisoformat(r['as_of_date'])).days != r['horizon_days']
    )
    missing_model = sum(1 for r in pred_rows if not r.get('model_id_speed_loss') or not r.get('model_id_foc'))

    per_vessel: dict[str, set[int]] = {}
    as_ofs: dict[str, set[str]] = {}
    for r in pred_rows:
        per_vessel.setdefault(r['imo_number'], set()).add(r['horizon_days'])
        as_ofs.setdefault(r['imo_number'], set()).add(r['as_of_date'])
    incomplete = sum(1 for horizons in per_vessel.values() if horizons != set(range(1, _HORIZON_MAX + 1)))
    multi_asof = sum(1 for dates in as_ofs.values() if len(dates) != 1)

    n = len(pred_rows)
    return [
        CheckResult('C22 point predictions present (foc ≥ 0)', bad_q == 0, n, bad_q),
        CheckResult('C22 horizon = target − as_of', bad_h == 0, n, bad_h),
        CheckResult('C22 model ids present', missing_model == 0, n, missing_model),
        CheckResult(
            f'C22 horizons 1..{_HORIZON_MAX} complete, single as_of',
            incomplete == 0 and multi_asof == 0,
            len(per_vessel),
            incomplete + multi_asof,
        ),
    ]


def check_c23(plan_rows: list[dict], pred_rows: list[dict]) -> list[CheckResult]:
    """fact_ml_maintenance_plan — ordered dates, non-negative saving, trigger self-consistency.

    The trigger check rebuilds the extended curve from the published point (p50)
    predictions — the same values ``build_plan`` used for its p50 sweep.
    """
    if not plan_rows:
        return [CheckResult('C23 plan rows exist', False, 0, 1, 'empty table')]

    bad_order = 0
    bad_saving = 0
    bad_trigger = 0
    curves = maintenance.curves_from_predictions(pred_rows)
    for row in plan_rows:
        as_of = dt.date.fromisoformat(row['as_of_date'])
        rec = dt.date.fromisoformat(row['recommended_clean_date'])
        early = dt.date.fromisoformat(row['recommended_date_early'])
        late = dt.date.fromisoformat(row['recommended_date_late'])
        if not (as_of < rec and early <= rec <= late):
            bad_order += 1
        if (row['expected_saving_usd'] or 0.0) < 0.0:
            bad_saving += 1
        vessel_curve = curves.get(row['imo_number'])
        if vessel_curve is not None:
            extended = maintenance.extend_curve(np.asarray(vessel_curve, dtype=float))
            eta = row.get('trigger_eta_pred')
            if eta is not None:
                t = (dt.date.fromisoformat(eta) - as_of).days
                if not (1 <= t <= len(extended)) or extended[t - 1] < MT_TRIGGER_PCT - 1e-6:
                    bad_trigger += 1
            elif float(extended.max()) >= MT_TRIGGER_PCT:
                bad_trigger += 1

    n = len(plan_rows)
    return [
        CheckResult('C23 date ordering (as_of < rec, early ≤ rec ≤ late)', bad_order == 0, n, bad_order),
        CheckResult('C23 expected saving ≥ 0', bad_saving == 0, n, bad_saving),
        CheckResult('C23 trigger ETA consistent with p50 curve', bad_trigger == 0, n, bad_trigger),
    ]


def load_ml_tree(out_dir: str | Path) -> tuple[list[dict], list[dict]]:
    """Read (predictions, plans) back from a written ``ml/`` tree."""
    ml_dir = Path(out_dir) / 'ml'
    if not ml_dir.is_dir():
        raise FileNotFoundError(f'no ml/ directory under {out_dir!r} — run infer first')

    def read_tree(name: str) -> list[dict]:
        rows: list[dict] = []
        for path in sorted((ml_dir / name).rglob('*.jsonl')):
            with path.open(encoding='utf-8') as fh:
                rows.extend(json.loads(line) for line in fh if line.strip())
        return rows

    return read_tree('fact_ml_prediction'), read_tree('fact_ml_maintenance_plan')
