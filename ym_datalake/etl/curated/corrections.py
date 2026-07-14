"""ISO 15016 environmental correction — and the ``WIND_DIRECTION`` question, settled.

Remove the wind and wave added resistance from the measured shaft power, so what is
left is the power a hull would need in flat calm at the same speed. ISO 19030 then
compares that against the clean-hull reference curve, and the gap is the speed loss.

**The open question this module answers.** ``WIND_DIRECTION`` is a 16-point compass
index, and the dataset README describes the units as "相對/羅經" — *relative or
compass*. Nobody knows which, and the dataset ships **no heading column** to
disambiguate:

* If it is **bow-relative**, the angle off the bow is ``wind_direction x 22.5`` and the
  correction is computed from real measurements alone.
* If it is a **true compass** bearing, the angle off the bow needs a heading — and our
  only heading is the one ``geography`` invented. A correction driven by a fabricated
  angle is decorative: it adds noise dressed as physics.

Guessing would silently decide whether every speed-loss number in the lake is real, so
this module does not guess: :func:`choose_convention` fits the reference curve under each
convention (plus a **no-correction control**) and scores each on :func:`detrended_scatter`
— the spread of speed loss once the fouling trend it is *supposed* to be measuring has
been removed. Whatever is left is the correction's own error.

**The answer, on this dataset (4,657 ISO-valid points):**

=================  =========================
convention         detrended speed-loss sd
=================  =========================
**none (control)**  **4.534 pp**
bow_relative        5.009 pp
true_compass        5.011 pp
=================  =========================

Read that table carefully, because it says something sharper than "bow-relative" or
"true compass":

1. **The two conventions are indistinguishable** — 5.009 vs 5.011 pp, a 0.04 % gap.
   ``true_compass`` routes the angle through a **fabricated** heading; if ``WIND_DIRECTION``
   really were bow-relative, mangling it that way should visibly degrade the result. It
   does not. So the direction column carries **essentially no information** for this
   correction, under either reading. The question is not answerable from the data because
   the data has no answer in it.
2. **Both are worse than not correcting at all.** The correction multiplies an
   uninformative direction by an ``estimated`` windage area (``transverse_area_m2`` is
   flagged not-derivable in ``vessel_master``), at a Beaufort <= 4 gate where the true wind
   effect is already small relative to the ~15 % scatter in the power channel. It adds
   about 0.5 pp of noise and removes nothing.

So the ISO 15016 wind/wave correction is **decorative on this dataset** and does not touch
``power_corrected_kw`` — the ISO 19030 Beaufort gate is what excludes weather here, not a
correction term. The resistances are still *computed* and exposed (they are honest physical
estimates, and the weather cost-attribution channel needs them), but they are not allowed
near the speed loss.

An earlier run of this same test picked ``bow_relative``. It was wrong, and it is worth
knowing why: before ``filters`` rejected physically impossible speed/power pairs, the
correction was scoring well by partially masking rows that should never have been in the
sample. Fix the filter and the apparent benefit evaporates. A correction that only looks
good on dirty data is not a correction.
"""

from __future__ import annotations

import math
from collections import defaultdict

from ym_datalake.etl import physics
from ym_datalake.etl.curated import filters
from ym_datalake.etl.raw import reference_curve

# The three arms of the test. 'none' is the control: if a correction cannot beat doing
# nothing, it is not measuring anything.
CONVENTIONS = ('bow_relative', 'true_compass', 'none')


def _angles(row: dict, heading_deg: float | None, convention: str) -> tuple[float | None, float | None]:
    """(wind angle off the bow, wave angle off the bow) in degrees, per convention."""
    wind = physics.compass_to_deg(row.get('wind_direction'))
    wave = physics.compass_to_deg(row.get('sea_direction'))
    if convention == 'bow_relative':
        return (wind, wave)
    if convention == 'true_compass':
        if heading_deg is None:
            return (None, None)
        wind = None if wind is None else physics.relative_angle_deg(wind, heading_deg)
        wave = None if wave is None else physics.relative_angle_deg(wave, heading_deg)
        return (wind, wave)
    return (None, None)


def _resistances(row: dict, vessel: dict, heading_deg: float | None, convention: str) -> tuple[float, float]:
    """(wind, wave) added resistance in N. Wind can be **negative** — a following wind pushes,
    and booking a tailwind as fouling would be a lie in the ship's favour."""
    stw = row['speed_through_water']
    wind_angle, wave_angle = _angles(row, heading_deg, convention)

    r_wind_n = 0.0
    wind_speed = row.get('wind_speed')
    if wind_speed is not None and wind_angle is not None:
        apparent_ms, apparent_angle = physics.apparent_wind(wind_speed, wind_angle, stw)
        r_wind_n = physics.wind_resistance_n(vessel['transverse_area_m2'], apparent_ms, apparent_angle)

    r_wave_n = 0.0
    wave_height = row.get('sea_height')
    if wave_height is not None and wave_angle is not None:
        r_wave_n = physics.wave_resistance_n(wave_height, vessel['breadth_m'], vessel['lpp_m'], wave_angle)

    return r_wind_n, r_wave_n


def correct_row(row: dict, vessel: dict, heading_deg: float | None, convention: str) -> dict:
    """The ISO 15016 terms for one cleaned noon row."""
    power = row.get('horse_power')
    stw = row.get('speed_through_water')
    if not power or not stw:
        return {
            'resistance_wind_kn': None,
            'resistance_wave_kn': None,
            'power_corrected_kw': None,
            'speed_corrected_kn': stw,
        }

    if convention == 'none':
        # The empirical test says the correction adds noise on this dataset, so the measured
        # power passes straight through. The resistances are still computed — read
        # bow-relative, the only reading that needs no fabricated heading — because the
        # weather cost-attribution channel is entitled to a physical estimate. They just do
        # not get to touch the speed loss.
        r_wind_n, r_wave_n = _resistances(row, vessel, heading_deg, 'bow_relative')
        return {
            'resistance_wind_kn': r_wind_n / 1000.0,
            'resistance_wave_kn': r_wave_n / 1000.0,
            'power_corrected_kw': power,
            'speed_corrected_kn': stw,
        }

    r_wind_n, r_wave_n = _resistances(row, vessel, heading_deg, convention)
    dp_env_kw = physics.resistance_to_power_kw(r_wind_n + r_wave_n, stw)
    return {
        'resistance_wind_kn': r_wind_n / 1000.0,
        'resistance_wave_kn': r_wave_n / 1000.0,
        # Corrected power can only be trusted while it stays positive; a correction that eats
        # the whole engine output means the weather data, not the hull, is wrong.
        'power_corrected_kw': max(power - dp_env_kw, 0.0) or None,
        'speed_corrected_kn': stw,
    }


def apply(cleaned_rows: list[dict], vessels: dict[str, dict], track: dict, convention: str) -> list[dict]:
    """Attach the ISO 15016 terms to every cleaned row (on a copy)."""
    out: list[dict] = []
    for row in cleaned_rows:
        heading = (track.get((row['ship_id'], row['noon_utc'])) or {}).get('heading_deg')
        out.append(row | correct_row(row, vessels[row['ship_id']], heading, convention))
    return out


MIN_TREND_POINTS = 10


def detrended_scatter(
    corrected_rows: list[dict], events: list[dict], vessel_rows: list[dict], vessels: dict[str, dict]
) -> float | None:
    """Speed-loss scatter left once the fouling trend is removed. The correction's own error.

    Speed loss is *supposed* to rise through a cleaning cycle — that rise is the signal,
    not error. So a straight line is fitted per (ship, cleaning cycle) and the residual
    spread around it is what the environmental correction is judged on: whatever the
    correction fails to remove shows up here as scatter.

    Scored over every ISO-valid point (~6,400), not just the ~270 clean-window ones. That
    matters: on the thin clean-window sample the three conventions look like a tie, and
    the wrong one wins.
    """
    curve_rows = reference_curve.build(corrected_rows, events, vessel_rows, power_key='power_corrected_kw')
    curves = reference_curve.curves_by_ship(curve_rows, vessel_rows)

    first_day: dict[str, int] = {}
    for row in corrected_rows:
        ship, day = row['ship_id'], row['noon_utc']
        if ship not in first_day or day < first_day[ship]:
            first_day[ship] = day

    resets: dict[str, list[int]] = defaultdict(list)
    for event in events:
        if event['event_type'] in reference_curve.HULL_CLEAN_EVENTS:
            resets[event['ship_id']].append(event['event_day'])

    def cycle_start(ship_id: str, day: int) -> int:
        prior = [d for d in resets[ship_id] if d <= day]
        return max(prior) if prior else first_day[ship_id]

    cycles: dict[tuple[str, int], list[tuple[int, float]]] = defaultdict(list)
    for row in corrected_rows:
        vessel = vessels[row['ship_id']]
        power = row.get('power_corrected_kw')
        if not power or not filters.is_valid(row, vessel):
            continue
        v_expected = curves[row['ship_id']].clean_speed_kn(power, row['displacement'])
        if not v_expected:
            continue
        loss = (v_expected - row['speed_through_water']) / v_expected * 100.0
        start = cycle_start(row['ship_id'], row['noon_utc'])
        cycles[(row['ship_id'], start)].append((row['noon_utc'] - start, loss))

    residuals: list[float] = []
    for points in cycles.values():
        if len(points) < MIN_TREND_POINTS:
            continue
        xs = [x for x, _ in points]
        ys = [y for _, y in points]
        mean_x, mean_y = sum(xs) / len(xs), sum(ys) / len(ys)
        var_x = sum((x - mean_x) ** 2 for x in xs)
        slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys)) / var_x if var_x else 0.0
        residuals.extend(y - (mean_y + slope * (x - mean_x)) for x, y in points)

    if len(residuals) < 2:
        return None
    mean = sum(residuals) / len(residuals)
    return math.sqrt(sum((r - mean) ** 2 for r in residuals) / len(residuals))


def choose_convention(
    cleaned_rows: list[dict], vessels: dict[str, dict], vessel_rows: list[dict], events: list[dict], track: dict
) -> tuple[str, dict[str, float]]:
    """Fit every convention; return the winner and the scores it won on.

    The scores are returned rather than swallowed: whether the wind correction is real
    physics or decoration is a *finding* about this dataset, and the pipeline prints it.
    """
    scores: dict[str, float] = {}
    for convention in CONVENTIONS:
        corrected = apply(cleaned_rows, vessels, track, convention)
        scatter = detrended_scatter(corrected, events, vessel_rows, vessels)
        if scatter is not None:
            scores[convention] = scatter
    if not scores:
        return ('none', {})
    return (min(scores, key=lambda c: scores[c]), scores)
