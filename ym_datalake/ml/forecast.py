"""Batch pre-inference — every vessel × horizons 1..90 × p10/p50/p90 (§6.1).

No serving endpoint: this runs locally after each ETL refresh, and the emitted
JSONL **is** the inference product Athena queries. Each vessel's ``as_of`` is
its latest curated day; the speed-loss and FOC champions predict the full
90-day fan, the health scorer stamps the vessel-level 0–1 index (repeated on
every row, same convention as ``fact_speed_profile``'s vessel-level columns),
and the maintenance optimiser turns the quantile curves into one plan row.
"""

from __future__ import annotations

import numpy as np

from ym_datalake.ml import maintenance
from ym_datalake.ml.dataset import VesselSeries
from ym_datalake.ml.features import HORIZON_MAX, build_inference_set
from ym_datalake.ml.models.iforest import HealthScorer


def _quantile_curves(q: np.ndarray) -> dict[str, np.ndarray]:
    return {'p10': q[:, 0], 'p50': q[:, 1], 'p90': q[:, 2]}


def run_inference(
    series_list: list[VesselSeries],
    sl_model,
    sl_meta: dict,
    foc_model,
    foc_meta: dict,
    health: HealthScorer,
    maintenance_events: list[dict],
    recommendations: list[dict],
    horizon_max: int = HORIZON_MAX,
) -> tuple[list[dict], list[dict]]:
    """Return (``fact_ml_prediction`` rows, ``fact_ml_maintenance_plan`` rows)."""
    baseline_dates = {r['imo_number']: r.get('recommended_clean_date') for r in recommendations}
    pred_rows: list[dict] = []
    plan_rows: list[dict] = []

    for series in series_list:
        fs = build_inference_set(series, horizon_max)
        q_sl = sl_model.predict_quantiles(fs.X)
        q_foc = np.maximum(foc_model.predict_quantiles(fs.X), 0.0)
        health_score = health.health_at_end(series)
        econ = maintenance.implied_economics(series)
        excess_p50 = maintenance.daily_excess_cost(np.clip(q_sl[:, 1], 0.0, None), econ)

        # the published table carries point predictions (= p50); the full quantile
        # fan stays internal and feeds the maintenance plan's early/late date band
        for k, meta in enumerate(fs.meta):
            pred_rows.append(
                {
                    'imo_number': series.imo_number,
                    'as_of_date': meta['as_of'].isoformat(),
                    'target_date': meta['target_date'].isoformat(),
                    'horizon_days': meta['horizon_days'],
                    'speed_loss_pct_pred': float(q_sl[k, 1]),
                    'foc_mt_pred': float(q_foc[k, 1]),
                    'excess_cost_usd_pred': float(excess_p50[k]),
                    'health_score': health_score,
                    'model_id_speed_loss': sl_meta['model_id'],
                    'model_id_foc': foc_meta['model_id'],
                }
            )

        plan_rows.append(
            maintenance.build_plan(
                series,
                _quantile_curves(q_sl),
                maintenance_events,
                baseline_dates.get(series.imo_number),
                sl_meta['model_id'],
            )
        )
    return pred_rows, plan_rows
