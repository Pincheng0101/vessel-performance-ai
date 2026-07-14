"""Carbon Intensity Indicator — AER and full IMO, each rated A-E (MEPC.353/354).

CII is an **annual** metric, so it is computed per ship per calendar year and broadcast
back onto every daily row of that year. This is the one place the synthesized calendar
is load-bearing rather than cosmetic: the ``required`` line steps down each year
(Z% = 5/7/9/11 % for 2023-2026), so without a year there is no rating at all.

Container ships use Capacity = DWT, so the AER and full-IMO *attained* values coincide;
they differ only in the reference line they are rated against — ``cii_rating_aer`` against
the base line, ``cii_rating_imo`` against the year's reduced ``required`` line.
"""

from __future__ import annotations

from collections import defaultdict

# Container-ship reference line CII_ref = a . Capacity^(-c) — MEPC.353(78).
_REF_A = 1984.0
_REF_C = 0.489
# A-E boundary multipliers d1..d4 on attained/required — MEPC.354(78), container.
_DD_VECTOR = (0.83, 0.94, 1.07, 1.19)
# Annual reduction factor Z% vs the 2019 reference (the regime starts in 2023).
_Z_BY_YEAR = {2021: 0.0, 2022: 0.0, 2023: 5.0, 2024: 7.0, 2025: 9.0, 2026: 11.0}
_Z_DEFAULT = 11.0


def _reference_cii(dwt: float) -> float:
    return _REF_A * dwt ** (-_REF_C)


def _rating(attained: float, required: float) -> str:
    ratio = attained / required
    d1, d2, d3, d4 = _DD_VECTOR
    if ratio <= d1:
        return 'A'
    if ratio <= d2:
        return 'B'
    if ratio <= d3:
        return 'C'
    if ratio <= d4:
        return 'D'
    return 'E'


def apply(daily_rows: list[dict], vessels: dict[str, dict]) -> None:
    """Compute annual CII per (ship, year) and broadcast it onto the daily rows, in place."""
    co2: dict[tuple[str, int], float] = defaultdict(float)
    distance: dict[tuple[str, int], float] = defaultdict(float)
    for row in daily_rows:
        key = (row['ship_id'], row['year'])
        co2[key] += row.get('co2_mt') or 0.0
        distance[key] += row.get('total_distance') or 0.0

    ratings: dict[tuple[str, int], dict] = {}
    for key, total_co2 in co2.items():
        ship_id, year = key
        dwt = vessels[ship_id]['dwt']
        sailed = distance[key]
        if sailed <= 0 or dwt <= 0:
            continue
        attained = total_co2 * 1.0e6 / (dwt * sailed)  # gCO2 / dwt.nm
        reference = _reference_cii(dwt)
        required = (1.0 - _Z_BY_YEAR.get(year, _Z_DEFAULT) / 100.0) * reference
        ratings[key] = {
            'cii_aer': attained,
            'cii_rating_aer': _rating(attained, reference),
            'cii_imo': attained,
            'cii_rating_imo': _rating(attained, required),
        }

    for row in daily_rows:
        rating = ratings.get((row['ship_id'], row['year']))
        if rating:
            row.update(rating)
