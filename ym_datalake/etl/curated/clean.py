"""Every mutation of the real data happens here — and nowhere else.

The raw zone is a verbatim passthrough, so all three of the dataset's structural
problems land on this module:

1. **Duplicates.** 344 rows share a ``(ship_id, noon_utc)`` with another row. The
   curated grain is vessel x day, so they collapse: keep the row with the most
   non-null H/T columns (the engine + fuel channels — the ones anything downstream
   actually reads), tie-break on the higher ``hours_total``.
2. **Gross outliers.** The source carries physically impossible cells: 671,576 kW of
   shaft power against a 47,700 kW MCR, 95,056 g/kWh of SFOC, 1,622,300 t of
   displacement on a 185,900 t scantling hull, 516 % engine load, -1048 % slip,
   42.5 hours in a day. Each is clipped **cell-wise to null** against the vessel's own
   particulars — nulling the bad cell, not dropping the row, because the rest of the
   row is usually fine.
3. **Thin fill rates.** DISPLACEMENT is present on only 68.5 % of rows, and every ISO
   19030 number needs it. It is backfilled hydrostatically from the drafts:
   ``delta = delta_design + (mean_draft - design_draft) . 100 . TPC``. Against the
   14,508 rows that carry both, the raw formula reads +3.1 % high (p10 +1.6 %,
   p90 +4.9 %), so the offset is **refitted per hull class** from the data itself
   rather than trusted. Backfilled rows are tagged ``displacement_source =
   'backfilled'`` and never pass as measured.

None of this touches ``raw/``.
"""

from __future__ import annotations

from collections import defaultdict

# The H (engine performance) and T (fuel) columns — the ones the dataset masks on
# S21-S23, and the ones the dedupe scores a duplicate row on.
H_COLUMNS = ('horse_power', 'load_pct', 'sfoc', 'me_slip', 'thrust', 'thrust_quotient')
T_COLUMNS = (
    'total_consump',
    'me_consumption',
    'me_fullspeed_consump_hshfo',
    'me_fullspeed_consump_ulsfo',
    'me_fullspeed_consump_vlsfo',
    'me_fullspeed_consump_lsmgo',
    'me_fullspeed_consump_bio_hsfo',
)

# A day cannot hold more than 24 hours; the source says 42.5 on one row.
HOURS_IN_DAY = 24.0

# Headroom over the design particular before a reading is called impossible. Sensors
# drift and a hull can be pressed past its rating; 15 % is generous but finite.
_MCR_HEADROOM = 1.15
_SCANTLING_HEADROOM = 1.15
# Absolute plausibility bands that do not key off a vessel particular.
_SFOC_BAND = (120.0, 400.0)  # g/kWh; a modern 2-stroke sits near 170
_SLIP_BAND = (-25.0, 75.0)  # %; negative slip means a following current, not -1048 %
_LOAD_MAX_PCT = 115.0
_SPEED_MAX_KN = 30.0
_BEAUFORT_MAX = 12.0
_WAVE_MAX_M = 20.0
_DISP_MIN_FRACTION = 0.5  # of the design displacement; below that it is not floating


def _positive(value):
    return value if value is not None and value > 0.0 else None


def _in_band(value, lo: float, hi: float):
    return value if value is not None and lo <= value <= hi else None


def _at_most(value, hi: float):
    return value if value is not None and 0.0 < value <= hi else None


def clip_row(row: dict, vessel: dict) -> dict:
    """Null every physically impossible cell of one noon row, against its vessel."""
    out = dict(row)
    mcr_kw = vessel['mcr_kw']
    max_draft = vessel['scantling_draft_m'] * _SCANTLING_HEADROOM

    out['horse_power'] = _at_most(out['horse_power'], mcr_kw * _MCR_HEADROOM)
    out['sfoc'] = _in_band(out['sfoc'], *_SFOC_BAND)
    out['me_slip'] = _in_band(out['me_slip'], *_SLIP_BAND)
    out['load_pct'] = _at_most(out['load_pct'], _LOAD_MAX_PCT)
    out['displacement'] = _in_band(
        out['displacement'],
        vessel['displacement_design_t'] * _DISP_MIN_FRACTION,
        vessel['displacement_scantling_t'] * _SCANTLING_HEADROOM,
    )
    out['me_avg_rpm'] = _at_most(out['me_avg_rpm'], vessel['mcr_rpm'] * _MCR_HEADROOM)
    out['speed_through_water'] = _at_most(out['speed_through_water'], _SPEED_MAX_KN)
    out['avg_speed'] = _at_most(out['avg_speed'], _SPEED_MAX_KN)
    for draft in ('fore_draft', 'after_draft', 'mid_draft'):
        out[draft] = _at_most(out[draft], max_draft)
    out['wind_scale'] = _in_band(out['wind_scale'], 0.0, _BEAUFORT_MAX)
    out['sea_height'] = _in_band(out['sea_height'], 0.0, _WAVE_MAX_M)
    out['swell_height'] = _in_band(out['swell_height'], 0.0, _WAVE_MAX_M)
    out['water_depth'] = _positive(out['water_depth'])
    out['total_consump'] = _positive(out['total_consump'])
    out['me_consumption'] = _positive(out['me_consumption'])

    # Hours are clamped, not nulled: a 42.5-hour "day" is a bookkeeping artefact of the
    # noon-to-noon window, and the day still happened.
    for hours in ('hours_total', 'hours_full_speed'):
        if out[hours] is not None:
            out[hours] = min(out[hours], HOURS_IN_DAY)
    return out


def mean_draft_m(row: dict) -> float | None:
    """Mean draft: the mid draft if the sensor gave one, else the fore/aft average."""
    if row.get('mid_draft') is not None:
        return row['mid_draft']
    fore, aft = row.get('fore_draft'), row.get('after_draft')
    if fore is None or aft is None:
        return None
    return (fore + aft) / 2.0


def _hydrostatic_displacement(draft_m: float, vessel: dict) -> float:
    """delta_design + (T - T_design) . 100 . TPC — the tonnes-per-centimetre line."""
    return vessel['displacement_design_t'] + (draft_m - vessel['design_draft_m']) * 100.0 * vessel['tpc_t_per_cm']


def fit_displacement_offsets(rows: list[dict], vessels: dict[str, dict]) -> dict[str, float]:
    """Per-hull-class additive correction to the hydrostatic line, from the rows that carry both.

    The design TPC line reads high against the reported displacements; this measures the
    bias instead of assuming it away. Returns hull_class -> tonnes to add.
    """
    residuals: dict[str, list[float]] = defaultdict(list)
    for row in rows:
        vessel = vessels[row['ship_id']]
        draft = mean_draft_m(row)
        if row.get('displacement') is None or draft is None:
            continue
        residuals[vessel['hull_class']].append(row['displacement'] - _hydrostatic_displacement(draft, vessel))
    offsets: dict[str, float] = {}
    for hull_class, values in residuals.items():
        values.sort()
        offsets[hull_class] = values[len(values) // 2]  # median: robust to the leftover outliers
    return offsets


def backfill_displacement(row: dict, vessel: dict, offsets: dict[str, float]) -> tuple[float | None, str | None]:
    """(displacement, source) — 'measured' when the source had one, else 'backfilled'."""
    if row.get('displacement') is not None:
        return row['displacement'], 'measured'
    draft = mean_draft_m(row)
    if draft is None:
        return None, None
    estimate = _hydrostatic_displacement(draft, vessel) + offsets.get(vessel['hull_class'], 0.0)
    return estimate, 'backfilled'


def _fill_score(row: dict) -> tuple[int, float]:
    """Rank a duplicate: non-null H/T columns first, then the longer day."""
    filled = sum(1 for column in H_COLUMNS + T_COLUMNS if row.get(column) is not None)
    return (filled, row.get('hours_total') or 0.0)


def dedupe(rows: list[dict]) -> list[dict]:
    """Collapse the 344 duplicate ``(ship_id, noon_utc)`` rows to one row per vessel-day."""
    best: dict[tuple[str, int], dict] = {}
    for row in rows:
        key = (row['ship_id'], row['noon_utc'])
        incumbent = best.get(key)
        if incumbent is None or _fill_score(row) > _fill_score(incumbent):
            best[key] = row
    return [best[key] for key in sorted(best, key=lambda k: (k[0], k[1]))]


def clean(noon_rows: list[dict], vessels: dict[str, dict]) -> list[dict]:
    """Raw noon rows -> the cleaned vessel-day grain: clipped, deduped, displacement filled.

    Order matters. Clipping runs first so the outliers cannot win a dedupe tie-break or
    poison the displacement offset fit; the fit then runs on clipped data; the backfill
    runs last, on the surviving one-row-per-day grain.
    """
    clipped = [clip_row(row, vessels[row['ship_id']]) for row in noon_rows]
    unique = dedupe(clipped)
    offsets = fit_displacement_offsets(unique, vessels)
    for row in unique:
        vessel = vessels[row['ship_id']]
        row['displacement'], row['displacement_source'] = backfill_displacement(row, vessel, offsets)
        row['mean_draft_m'] = mean_draft_m(row)
    return unique
