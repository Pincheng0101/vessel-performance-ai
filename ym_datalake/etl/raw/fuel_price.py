"""``fuel_price`` — the synthesized bunker series.

Entirely ESTIMATED: the dataset ships no prices, so every USD figure in the lake is
downstream of this table and must never be quoted as fact. The model itself lives in
``ym_datalake.etl.fuel``; this module only decides *which days* to price.
"""

from __future__ import annotations

from ym_datalake.etl import fuel


def build(noon_rows: list[dict], seed: int = 42) -> list[dict]:
    """One row per (day, fuel) across the full span of the fleet's shared relative-day axis.

    Every day in the span is priced, not just the days a ship reported — a price series
    with holes in it makes joins lie.
    """
    days = [row['noon_utc'] for row in noon_rows]
    span = range(min(days), max(days) + 1)
    return fuel.build_price_series(list(span), seed=seed)
