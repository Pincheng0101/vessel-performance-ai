"""JSONL writers for the ML zone (§6) — mirrors ``etl.writer`` conventions.

``fact_ml_prediction`` is partitioned by ``imo_number`` (partition projection,
same as the imo-partitioned curated facts); ``fact_ml_maintenance_plan`` and
``dim_ml_model`` are flat. Row cleaning (float rounding, NaN/Inf → null) reuses
the shared raw writer so the Athena JSON SerDe accepts the output.
"""

from __future__ import annotations

from collections import defaultdict
from pathlib import Path

from ym_datalake.synthetic_data.writer import _write_jsonl


def write_ml(
    out_dir: str | Path,
    predictions: list[dict],
    plans: list[dict],
    models: list[dict],
) -> dict[str, int]:
    """Write the three ML tables under ``out_dir/ml``; return row counts."""
    ml_dir = Path(out_dir) / 'ml'

    groups: dict[str, list[dict]] = defaultdict(list)
    for row in predictions:
        groups[row['imo_number']].append(row)
    for imo, group in sorted(groups.items()):
        _write_jsonl(ml_dir / 'fact_ml_prediction' / f'imo_number={imo}' / 'data.jsonl', group)

    _write_jsonl(ml_dir / 'fact_ml_maintenance_plan' / 'fact_ml_maintenance_plan.jsonl', plans)
    _write_jsonl(ml_dir / 'dim_ml_model' / 'dim_ml_model.jsonl', models)

    return {
        'fact_ml_prediction': len(predictions),
        'fact_ml_maintenance_plan': len(plans),
        'dim_ml_model': len(models),
    }
