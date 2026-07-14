"""The 5 real fuels: calorific values, carbon factors, and a synthesized price series.

The dataset's ``ME_FULLSPEED_CONSUMP_*`` columns name exactly five fuels. Their
lower calorific values are **given by the dataset README** (measured, not assumed).
The carbon factors are IMO's published C_F values (MEPC.308(73) Annex, as carried
into the CII regulation) — a standard, not an assumption.

Prices are **ESTIMATED**: a synthesized random walk. Every USD figure anywhere in
the lake traces back to this module and must never be quoted as fact.
"""

from __future__ import annotations

import math
import random

# The 5 fuels, in the column order of noon_report.me_fullspeed_consump_*.
FUELS = ('HSHFO', 'ULSFO', 'VLSFO', 'LSMGO', 'BIO_HSFO')

# noon_report column -> fuel.
FUEL_BY_COLUMN = {f'me_fullspeed_consump_{fuel.lower()}': fuel for fuel in FUELS}

# Lower calorific value, MJ/kg — dataset/README.md "燃料熱值對照".
# BIO_HSFO's 39.4 is flagged approximate in the README (bio blend ratios vary).
LCV_MJ_KG: dict[str, float] = {
    'HSHFO': 40.2,
    'ULSFO': 41.2,
    'VLSFO': 40.2,
    'LSMGO': 42.7,
    'BIO_HSFO': 39.4,
}

# Carbon factor C_F, tCO2 per t-fuel (IMO MEPC.308(73)).
# BIO_HSFO is given the fossil HSHFO factor: a tank-to-wake bio credit depends on
# the blend ratio and the certification scheme, neither of which the dataset states.
# This is the conservative choice, and BIO_HSFO is barely used (never in the
# prediction window), so it moves nothing material.
CARBON_FACTOR: dict[str, float] = {
    'HSHFO': 3.114,
    'ULSFO': 3.151,
    'VLSFO': 3.151,
    'LSMGO': 3.206,
    'BIO_HSFO': 3.114,
}

# ESTIMATED. Random-walk starting level (USD/t) and daily volatility, roughly in
# line with 2021-2026 bunker spreads (HSHFO cheapest, LSMGO dearest, bio at a premium).
_PRICE_BASE: dict[str, float] = {
    'HSHFO': 450.0,
    'ULSFO': 640.0,
    'VLSFO': 600.0,
    'LSMGO': 800.0,
    'BIO_HSFO': 720.0,
}
_DAILY_SIGMA = 0.012  # log-return std dev
_MEAN_REVERSION = 0.02  # pull back toward the base level, so 5 years does not drift away
_PRICE_FLOOR_FRACTION = 0.5
_PRICE_CEIL_FRACTION = 2.0


def build_price_series(days: list[int], seed: int = 42) -> list[dict]:
    """fuel_price rows: one per (day, fuel), a mean-reverting geometric random walk.

    Keyed on the relative-day axis — the raw zone has no calendar (see ``epoch``).
    """
    rng = random.Random(seed)
    ordered = sorted(days)
    rows: list[dict] = []
    for fuel in FUELS:
        base = _PRICE_BASE[fuel]
        price = base
        for day in ordered:
            shock = rng.gauss(0.0, _DAILY_SIGMA)
            pull = _MEAN_REVERSION * math.log(base / price)
            price *= math.exp(pull + shock)
            price = min(max(price, base * _PRICE_FLOOR_FRACTION), base * _PRICE_CEIL_FRACTION)
            rows.append({'day': day, 'fuel_type': fuel, 'price_usd_per_mt': price})
    rows.sort(key=lambda r: (r['day'], r['fuel_type']))
    return rows


def price_lookup(fuel_price_rows: list[dict]) -> dict[tuple[int, str], float]:
    """(day, fuel) -> USD/t."""
    return {(r['day'], r['fuel_type']): r['price_usd_per_mt'] for r in fuel_price_rows}


def day_fuel_type(noon: dict) -> str | None:
    """The fuel a noon row burned: the ``me_fullspeed_consump_*`` column with the most fuel.

    Most days use a single fuel (the prediction days are guaranteed to). On a day that
    mixed fuels the dominant one wins — it prices and carbon-rates the whole day.
    Masked PREDICT cells are null here, so ``predict_fuel_type`` is the fallback.
    """
    burned = [
        (noon[column], fuel)
        for column, fuel in FUEL_BY_COLUMN.items()
        if noon.get(column) is not None and noon[column] > 0
    ]
    if burned:
        return max(burned)[1]
    predict = noon.get('predict_fuel_type')
    if predict:  # e.g. 'ME_FULLSPEED_CONSUMP_HSHFO' -> 'HSHFO'
        return FUEL_BY_COLUMN.get(predict.lower())
    return None
