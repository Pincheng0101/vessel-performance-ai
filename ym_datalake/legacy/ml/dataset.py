"""M7 data loading — the ML pipeline's only disk I/O boundary (doc/ml-pipeline-zh.md §5).

Reads the local ``curated/`` tree (M2+M3 output) plus the raw ``noon_report``
(the FOC / speed / engine-fuel label source — the same columns a real noon
report carries) into plain per-table row lists, then assembles one
chronologically sorted :class:`VesselSeries` per vessel. Swapping to real data
means reimplementing only this module; ``features`` and everything above it are
storage-agnostic.

Ground truth (``truth/``) is never read here — same information boundary as M2/M3.
"""

from __future__ import annotations

import datetime as dt
import json
from dataclasses import dataclass, field
from pathlib import Path

from ym_datalake.etl import periods


@dataclass
class MlInputs:
    """Raw table rows the ML layer consumes (all plain dicts, as stored)."""

    fact_performance_daily: list[dict]
    noon_report: list[dict]
    fact_maintenance_event: list[dict]
    dim_vessel: list[dict]
    fact_recommendation: list[dict]


@dataclass
class VesselSeries:
    """One vessel's chronologically sorted daily history (curated ∪ noon join)."""

    imo_number: str
    vessel: dict  # dim_vessel row
    dates: list[dt.date]
    rows: list[dict]  # fact_performance_daily rows, aligned with dates
    noon: list[dict | None]  # noon_report rows keyed by date, aligned with dates
    reset_dates: list[dt.date] = field(default_factory=list)  # hull_cleaning ∪ dry_dock


def _read_jsonl_tree(root: Path) -> list[dict]:
    rows: list[dict] = []
    if not root.exists():
        return rows
    for path in sorted(root.rglob('*.jsonl')):
        with path.open(encoding='utf-8') as fh:
            rows.extend(json.loads(line) for line in fh if line.strip())
    return rows


def load_inputs(in_dir: str | Path) -> MlInputs:
    """Load every table the ML layer needs from ``<in_dir>/{curated,raw}``."""
    root = Path(in_dir)
    curated = root / 'curated'
    if not curated.is_dir():
        raise FileNotFoundError(f'no curated/ directory under {in_dir!r} — run the M2 ETL first')
    return MlInputs(
        fact_performance_daily=_read_jsonl_tree(curated / 'fact_performance_daily'),
        noon_report=_read_jsonl_tree(root / 'raw' / 'noon_report'),
        fact_maintenance_event=_read_jsonl_tree(curated / 'fact_maintenance_event'),
        dim_vessel=_read_jsonl_tree(curated / 'dim_vessel'),
        fact_recommendation=_read_jsonl_tree(curated / 'fact_recommendation'),
    )


def build_series(inputs: MlInputs) -> list[VesselSeries]:
    """Assemble one sorted :class:`VesselSeries` per vessel present in the daily table."""
    vessels = {v['imo_number']: v for v in inputs.dim_vessel}
    noon_idx = {(n['imo_number'], str(n['report_datetime_utc'])[:10]): n for n in inputs.noon_report}

    by_imo: dict[str, list[dict]] = {}
    for row in inputs.fact_performance_daily:
        by_imo.setdefault(row['imo_number'], []).append(row)

    series: list[VesselSeries] = []
    for imo in sorted(by_imo):
        rows = sorted(by_imo[imo], key=lambda r: r['report_date'])
        dates = [periods.to_date(r['report_date']) for r in rows]
        noon = [noon_idx.get((imo, d.isoformat())) for d in dates]
        series.append(
            VesselSeries(
                imo_number=imo,
                vessel=vessels.get(imo, {}),
                dates=dates,
                rows=rows,
                noon=noon,
                reset_dates=periods.reset_dates(inputs.fact_maintenance_event, imo),
            )
        )
    return series
