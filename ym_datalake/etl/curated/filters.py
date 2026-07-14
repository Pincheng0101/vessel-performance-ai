"""ISO 19030 data filtering — the ``valid_flag`` predicate.

A speed-loss number is only meaningful on a steady, deep-water, moderate-weather,
full-speed point where the clean-hull reference curve actually applies. Everything
else is noise wearing a percentage sign.

The gate:

* **>= 22 h at full speed** — the dataset's own definition of a clean steady point
  (README: every PREDICT day satisfies it), and stricter than ISO's generic "steady".
* **Beaufort <= 4** — same source. The ISO 15016 corrections lose credibility above it.
* **Deep water** — ``h > 3.sqrt(B.T)`` and ``h > 2.75.V^2/g``. NEW here: the synthetic
  lake had no depth column and skipped this filter; the real one carries
  ``water_depth`` on 100 % of rows, so shallow-water resistance can no longer
  masquerade as hull fouling.
* **STW >= 0.5 . design speed** — below that the reference curve is extrapolating.
* **Displacement within [0.5, 1.2] x design** — the band the curve is fitted over.
* **Measured displacement only** — see below.
* **A plausible Admiralty coefficient** — see below.
* **Finite, positive propulsion fields** — power and STW must exist post-clipping.
* **Not masked** — S21-S23's HIDDEN/PREDICT windows have no engine data to gate.

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


def is_valid(row: dict, vessel: dict) -> bool:
    """True iff this cleaned vessel-day is an ISO 19030 point the metrics may use."""
    if row.get('masked_flag'):
        return False

    stw = row.get('speed_through_water')
    power = row.get('horse_power')
    displacement = row.get('displacement')
    if not stw or not power or not displacement:
        return False

    # An estimated displacement cannot underwrite a measured speed loss.
    if row.get('displacement_source') != 'measured':
        return False

    admiralty = physics.admiralty_coef(displacement, stw, power)
    if admiralty is None or not (ADMIRALTY_BAND[0] <= admiralty <= ADMIRALTY_BAND[1]):
        return False

    if (row.get('hours_full_speed') or 0.0) < MIN_FULL_SPEED_HOURS:
        return False
    # A missing Beaufort is not a pass: an ungated weather day cannot be called steady.
    if row.get('wind_scale') is None or row['wind_scale'] > MAX_BEAUFORT:
        return False

    if stw < MIN_SPEED_FRACTION * vessel['design_speed_kn']:
        return False

    lo, hi = DISP_BAND_FRACTION
    design = vessel['displacement_design_t']
    if not (lo * design <= displacement <= hi * design):
        return False

    depth = row.get('water_depth')
    draft = row.get('mean_draft_m') or vessel['design_draft_m']
    if depth is None or depth < physics.deep_water_min_m(vessel['breadth_m'], draft, stw):
        return False

    return True
