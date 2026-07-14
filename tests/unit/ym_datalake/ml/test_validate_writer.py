"""C22/C23 checkers + ML JSONL writer layout."""

from __future__ import annotations

import json

from ym_datalake.ml.validate import check_c22, check_c23, load_ml_tree
from ym_datalake.ml.writer import write_ml


def _pred_rows(imo='9700001', as_of='2026-06-30', sl0=5.0):
    rows = []
    for h in range(1, 91):
        import datetime as dt

        target = (dt.date.fromisoformat(as_of) + dt.timedelta(days=h)).isoformat()
        rows.append(
            {
                'imo_number': imo,
                'as_of_date': as_of,
                'target_date': target,
                'horizon_days': h,
                'speed_loss_pct_pred': sl0 + 0.02 * h,
                'foc_mt_pred': 100.0,
                'excess_cost_usd_pred': 1000.0,
                'health_score': 0.8,
                'model_id_speed_loss': 'sl-m',
                'model_id_foc': 'foc-m',
            }
        )
    return rows


def _plan_row(imo='9700001'):
    return {
        'imo_number': imo,
        'as_of_date': '2026-06-30',
        'recommended_clean_date': '2026-08-01',
        'recommended_date_early': '2026-07-20',
        'recommended_date_late': '2026-08-15',
        'trigger_eta_pred': None,
        'expected_saving_usd': 1000.0,
        'clean_cost_usd': 80000.0,
        'baseline_clean_date': None,
        'model_id': 'sl-m',
    }


def test_c22_passes_on_wellformed_rows():
    assert all(r.passed for r in check_c22(_pred_rows()))


def test_c22_catches_missing_pred_and_gaps():
    rows = _pred_rows()
    rows[0]['speed_loss_pct_pred'] = None  # missing point prediction
    rows[1]['foc_mt_pred'] = -3.0  # negative FOC
    del rows[50]  # horizon gap
    results = {r.rule: r.passed for r in check_c22(rows)}
    assert not results['C22 point predictions present (foc ≥ 0)']
    assert not results['C22 horizons 1..90 complete, single as_of']


def test_c23_passes_and_catches_violations():
    preds = _pred_rows(sl0=5.0)  # stays below 8 % over 90d but extrapolates across later
    plans = [_plan_row()]
    results = check_c23(plans, preds)
    trigger_check = next(r for r in results if 'trigger' in r.rule)
    assert not trigger_check.passed  # eta is null but the extended curve crosses 8 %

    bad = [dict(_plan_row(), recommended_date_early='2026-09-01')]
    assert not next(r for r in check_c23(bad, preds) if 'ordering' in r.rule).passed
    neg = [dict(_plan_row(), expected_saving_usd=-5.0)]
    assert not next(r for r in check_c23(neg, preds) if 'saving' in r.rule).passed


def test_write_ml_layout_and_null_cleaning(tmp_path):
    preds = _pred_rows()
    preds[0]['health_score'] = float('nan')  # must land as null, not NaN
    plans = [_plan_row()]
    models = [{'model_id': 'sl-m', 'target': 'speed_loss', 'is_champion': True}]
    counts = write_ml(tmp_path, preds, plans, models)
    assert counts == {'fact_ml_prediction': 90, 'fact_ml_maintenance_plan': 1, 'dim_ml_model': 1}

    part = tmp_path / 'ml' / 'fact_ml_prediction' / 'imo_number=9700001' / 'data.jsonl'
    assert part.is_file()
    first = json.loads(part.read_text().splitlines()[0])
    assert first['health_score'] is None

    back_preds, back_plans = load_ml_tree(tmp_path)
    assert len(back_preds) == 90 and len(back_plans) == 1
