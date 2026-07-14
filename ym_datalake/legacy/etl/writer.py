"""JSONL writers for the curated zone (pipeline S11).

Reuses the raw writer's row cleaner (float rounding, NaN/Inf → null, no ASCII
escaping) so the Athena JSON SerDe accepts the output. ``fact_performance_daily``
is partitioned ``imo_number/year/month`` (partition projection); the other fact
tables are partitioned by ``imo_number``; dimensions and the fleet aggregate are
flat.
"""

from __future__ import annotations

from collections import defaultdict
from pathlib import Path

from ym_datalake.etl.compute import CuratedResult
from ym_datalake.synthetic_data.writer import _write_jsonl

# Curated tables partitioned by imo_number only.
_BY_IMO = [
    'fact_performance_indicator',
    'fact_uwi',
    'fact_maintenance_event',
    'fact_anomaly',
    'fact_alert',
    'fact_voyage',
    'fact_speed_profile',
]
# Flat (unpartitioned) curated tables.
_FLAT = [
    'agg_fleet_daily',
    'dim_vessel',
    'dim_reference_curve',
    'dim_port',
    'fact_recommendation',
    'fact_maintenance_recommendation',
]


def _write_daily(curated_dir: Path, rows: list[dict]) -> None:
    groups: dict[tuple[str, int, int], list[dict]] = defaultdict(list)
    for r in rows:
        groups[(r['imo_number'], r['year'], r['month'])].append(r)
    for (imo, year, month), group in sorted(groups.items()):
        path = (
            curated_dir
            / 'fact_performance_daily'
            / f'imo_number={imo}'
            / f'year={year}'
            / f'month={month:02d}'
            / 'data.jsonl'
        )
        _write_jsonl(path, group)


def _write_by_imo(curated_dir: Path, name: str, rows: list[dict]) -> None:
    groups: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        groups[r['imo_number']].append(r)
    for imo, group in sorted(groups.items()):
        _write_jsonl(curated_dir / name / f'imo_number={imo}' / 'data.jsonl', group)


def write_all(curated: CuratedResult, out_dir: str | Path) -> dict[str, int]:
    """Write every curated table under ``out_dir/curated``; return row counts."""
    curated_dir = Path(out_dir) / 'curated'
    counts: dict[str, int] = {}

    _write_daily(curated_dir, curated.fact_performance_daily)
    counts['fact_performance_daily'] = len(curated.fact_performance_daily)

    for name in _BY_IMO:
        rows = getattr(curated, name)
        _write_by_imo(curated_dir, name, rows)
        counts[name] = len(rows)

    for name in _FLAT:
        rows = getattr(curated, name)
        _write_jsonl(curated_dir / name / f'{name}.jsonl', rows)
        counts[name] = len(rows)

    return counts
