"""Carbon Intensity Indicator (CII) — AER and full IMO, each rated A–E (§4.4).

CII is an *annual* metric, so it is computed per vessel × calendar year (Σ over
the year's days) and broadcast onto every daily fact row of that year. Container
ships use Capacity = DWT, so the AER and the full-IMO *attained* value coincide;
the two differ only in the rating reference line — AER rates against the base
reference (no reduction), IMO against the year's reduced ``required`` line.

POC constants use IMO's published container-ship values (reference line ``a,c``,
annual reduction ``Z%``, and the ``d1..d4`` rating boundaries); calibrate when
formalising (spec §10).
"""

from __future__ import annotations

# Container-ship reference line ``CII_ref = a · Capacity^(−c)`` (MEPC.353(78)).
_REF_A = 1984.0
_REF_C = 0.489
# A–E boundary multipliers d1..d4 on attained/required (MEPC.354(78), container).
_DD_VECTOR = (0.83, 0.94, 1.07, 1.19)
# Annual reduction factor Z% vs the 2019 reference (0 before the 2023 regime).
_Z_BY_YEAR = {2021: 0.0, 2022: 0.0, 2023: 5.0, 2024: 7.0, 2025: 9.0, 2026: 11.0}
_Z_DEFAULT = 11.0


def _reference_cii(dwt: float) -> float:
    return _REF_A * dwt ** (-_REF_C)


def _rating(attained: float, required: float) -> str:
    """Map attained/required to an A–E band via the container dd vector."""
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


def _attained(total_co2_mt: float, dwt: float, total_distance_nm: float) -> float | None:
    """AER-style attained CII (gCO2 / dwt·nm); None if the vessel did not sail."""
    if total_distance_nm <= 0:
        return None
    return total_co2_mt * 1.0e6 / (dwt * total_distance_nm)


def annual_cii(
    co2_by_iy: dict[tuple[str, int], float],
    dist_by_iy: dict[tuple[str, int], float],
    dwt_by_imo: dict[str, float],
) -> dict[tuple[str, int], dict]:
    """Per (imo, year): attained AER/IMO CII and their A–E ratings."""
    out: dict[tuple[str, int], dict] = {}
    for key, co2 in co2_by_iy.items():
        imo, year = key
        dwt = dwt_by_imo[imo]
        attained = _attained(co2, dwt, dist_by_iy.get(key, 0.0))
        if attained is None:
            out[key] = {'cii_aer': None, 'cii_rating_aer': None, 'cii_imo': None, 'cii_rating_imo': None}
            continue
        ref = _reference_cii(dwt)
        required_imo = (1.0 - _Z_BY_YEAR.get(year, _Z_DEFAULT) / 100.0) * ref
        out[key] = {
            'cii_aer': attained,
            'cii_rating_aer': _rating(attained, ref),
            'cii_imo': attained,
            'cii_rating_imo': _rating(attained, required_imo),
        }
    return out
