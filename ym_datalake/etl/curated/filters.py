"""ISO 19030 data filtering — the ``valid_flag`` predicate, and *why* a day failed it.

A speed-loss number is only meaningful on a steady, deep-water, moderate-weather,
full-speed point where the clean-hull reference curve actually applies. Everything
else is noise wearing a percentage sign.

:func:`reject_reason` names the gate that failed rather than returning a bare bool, and
``daily`` lands that name on every row as ``reject_reason``. This is the ISO 19030
drill-down: the gate drops ~78 % of the days, and a dashboard that cannot say *which*
gate dropped a given day cannot be audited (doc/iso-19030.md:110-116). :func:`is_valid`
is the same predicate read as a bool.

The gate, in evaluation order (the reason is the **first** gate that fails):

* **masked** — S21-S23's HIDDEN/PREDICT windows have no engine data to gate.
* **missing_propulsion** — corrected power, STW and displacement must exist post-clipping.
* **displacement_backfilled** — measured displacement only; see below.
* **admiralty** — a plausible speed<->power consistency coefficient; see below.
* **not_full_speed** — **>= 22 h at full speed**, the dataset's own definition of a clean
  steady point (README: every PREDICT day satisfies it), stricter than ISO's generic
  "steady". It is also the *only* steadiness gate available here: a 24 h mean cannot show
  a telegraph change, and the dataset carries no rudder angle, so ISO's rudder filter has
  no column to read (declared in doc/iso-19030-conformance.md).
* **beaufort** — **Beaufort <= 4**, same source. Since the ISO 15016 correction is
  *rejected* on this dataset (see ``corrections``), this gate — not a correction term — is
  what keeps weather out of the speed loss, hence 4 rather than ISO's ~8.
* **low_speed** — **STW >= 0.5 . design speed**; below that the reference curve extrapolates.
* **displacement_band** — displacement within **[0.5, 1.2] x design**, the band the curve
  is fitted over.
* **shallow_water** — ``h > 3.sqrt(B.T)`` and ``h > 2.75.V^2/g``. NEW here: the synthetic
  lake had no depth column and skipped this filter; the real one carries
  ``water_depth`` on 100 % of rows, so shallow-water resistance can no longer
  masquerade as hull fouling.

**Why the power gate reads the CORRECTED power.** ``daily`` computes the speed loss from
``power_corrected_kw``, so that is the field the gate must require. Reading ``horse_power``
here instead would let a row whose correction nulled the power out (``corrections`` floors a
correction that eats the whole engine output) pass the gate with ``valid_flag=True`` and a
``speed_loss_pct`` of ``None`` — a valid ISO point with no ISO number in it. Harmless while
``convention='none'`` wins and the two fields are equal, and a live bug the moment it
doesn't. The Admiralty coefficient below stays on the *measured* power on purpose: it is a
raw physical invariant, and its band was calibrated against measured speed/power pairs.

**Why the displacement must be measured, not backfilled.** ``clean`` can reconstruct a
missing displacement from the drafts, and does — 6,665 rows of it. But a speed loss
computed on an *estimated* displacement is not a measurement, and it shows: on clean-hull
days the scatter of ``speed_loss_pct`` is **4.95 pp on measured displacement and 9.76 pp
on backfilled** — the estimate doubles the noise in the very metric the gate exists to
protect. Backfilled rows still get a ``speed_loss_pct`` (the trend chart needs a
continuous line), they just do not get to be *fitted on*.

**Why range clipping is not enough.** ``clean`` nulls cells that are impossible on their
own. It cannot catch a cell that is impossible only *in combination* — S4 day 131 reports
17.7 kn on 2,103 kW, and both numbers are individually in range while the pair is
nonsense (that hull needs ~24,000 kW for 17.7 kn). One such row dragged S4's pre-cleaning
speed loss to -6.9 pp and made its real hull cleaning look like damage. The Admiralty
coefficient ``delta^(2/3).V^3/P`` is the invariant that catches it: it needs no reference
curve (so there is no circularity), and it sits in 425-1100 across 99 % of the fleet
while the impossible rows fly off to 8,000 and beyond.
"""

from __future__ import annotations

from ym_datalake.etl import physics

MIN_FULL_SPEED_HOURS = 22.0
MAX_BEAUFORT = 4.0
MIN_SPEED_FRACTION = 0.5
DISP_BAND_FRACTION = (0.5, 1.2)
# Speed<->power consistency. 99 % of the fleet's valid days sit in 425-1100; this band is
# deliberately wider, so it rejects only the physically impossible, not the merely unusual.
ADMIRALTY_BAND = (300.0, 1300.0)


def reject_reason(row: dict, vessel: dict) -> str | None:
    """The gate this corrected vessel-day fails, or ``None`` when it is an ISO 19030 point.

    ``row`` must carry the ISO 15016 terms (i.e. have been through ``corrections``) —
    the power gate reads ``power_corrected_kw``, the field the speed loss is computed from.
    """
    if row.get('masked_flag'):
        return 'masked'

    stw = row.get('speed_through_water')
    power = row.get('power_corrected_kw')
    measured_power = row.get('horse_power')
    displacement = row.get('displacement')
    if not stw or not power or not measured_power or not displacement:
        return 'missing_propulsion'

    # An estimated displacement cannot underwrite a measured speed loss.
    if row.get('displacement_source') != 'measured':
        return 'displacement_backfilled'

    # The measured power, not the corrected one: this is the raw speed<->power invariant.
    admiralty = physics.admiralty_coef(displacement, stw, measured_power)
    if admiralty is None or not (ADMIRALTY_BAND[0] <= admiralty <= ADMIRALTY_BAND[1]):
        return 'admiralty'

    if (row.get('hours_full_speed') or 0.0) < MIN_FULL_SPEED_HOURS:
        return 'not_full_speed'
    # A missing Beaufort is not a pass: an ungated weather day cannot be called steady.
    if row.get('wind_scale') is None or row['wind_scale'] > MAX_BEAUFORT:
        return 'beaufort'

    if stw < MIN_SPEED_FRACTION * vessel['design_speed_kn']:
        return 'low_speed'

    lo, hi = DISP_BAND_FRACTION
    design = vessel['displacement_design_t']
    if not (lo * design <= displacement <= hi * design):
        return 'displacement_band'

    depth = row.get('water_depth')
    draft = row.get('mean_draft_m') or vessel['design_draft_m']
    if depth is None or depth < physics.deep_water_min_m(vessel['breadth_m'], draft, stw):
        return 'shallow_water'

    return None


def is_valid(row: dict, vessel: dict) -> bool:
    """True iff this corrected vessel-day is an ISO 19030 point the metrics may use."""
    return reject_reason(row, vessel) is None
