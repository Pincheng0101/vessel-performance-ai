"""``reference_curve`` — the clean-hull speed-power curve, FITTED from the real data.

The synthetic lake was *handed* this curve: the generator and the ETL shared one
object, which is what made the injected speed loss recoverable. Here there is no
generator, so the curve has to be recovered from the noon reports themselves — and
every ISO 19030 number in the lake hangs off it. If this fit is wrong, ``speed_loss_pct``
is noise and so is everything downstream of it.

The model is the standard displacement-scaled power law::

    P = a . V^n . (delta / delta_ref)^(2/3)

which is linear in logs, so ``a`` and ``n`` come out of one least-squares line through
``log P - (2/3) log(delta/delta_ref)`` against ``log V``.

Three things make the fit trustworthy rather than merely fitted:

* **Clean windows only.** A point counts only if it falls in the 60 days after the
  ship's first record or after a real hull-cleaning (UWC / DD) — i.e. when the hull is
  known to be clean. Fit on a fouled hull and the "clean" curve inherits the fouling,
  and the speed loss it later measures collapses toward zero.
* **Valid points only.** The ISO 19030 gate (>= 22 h full speed, Beaufort <= 4, deep
  water, ...), over *cleaned* rows, so the 671,576 kW outliers never enter.
* **Masked rows excluded.** S21-S23's HIDDEN/PREDICT windows are the thing the
  hackathon asks to predict; letting them into the baseline would leak.

**The fit is partially pooled, and that is the whole design.** Sister ships share a hull
form, so they share the speed exponent ``n`` — and they have to, because one ship's ~26
clean-window points cannot pin down an exponent while a pool of nine ships' 231 points
can. But they do *not* share the scale ``a``: sister ships are not identical, and a fully
pooled curve bakes each ship's own baseline efficiency into its speed loss as a constant
offset. Measured against the real cleaning events, that offset is fatal — it is what makes
a hull cleaning appear to make the hull **worse** (S4 swings 13 pp the wrong way at its
day-147 UWC under a fully pooled fit). So:

* ``curve_n`` — pooled across (hull_class, propeller_variant)
* ``curve_a`` — fitted **per ship**, on that ship's own clean-window points
"""

from __future__ import annotations

import math
from collections import defaultdict
from dataclasses import dataclass

from ym_datalake.etl.curated import filters

# Days after a clean-hull anchor (data start, or a real UWC / DD) that count as clean.
CLEAN_WINDOW_DAYS = 60
# Event types that leave the hull clean. PP polishes the propeller only — it does not
# reset the hull, so it does not open a clean window.
HULL_CLEAN_EVENTS = {'UWC', 'DD'}

# Points needed to fit a pooled EXPONENT (a slope: data-hungry).
MIN_FIT_POINTS = 30
# Points needed to fit a per-ship SCALE (an intercept: far cheaper). Below this a ship
# borrows its pool's scale and its speed loss carries the pool's offset.
MIN_SHIP_FIT_POINTS = 8
# A displacement-corrected speed-power exponent lives near 3-4 for a container hull.
# Clamping keeps a thin pool (W2-P1 is a single ship) from fitting an absurd slope.
CURVE_N_BOUNDS = (2.5, 4.5)
CURVE_POINTS = 12
SPEED_RANGE_FRACTION = (0.5, 1.05)


@dataclass(frozen=True)
class Curve:
    """A fitted clean-hull curve and its inverse."""

    ref_curve_id: str
    a: float
    n: float
    displacement_ref_t: float

    def clean_power_kw(self, speed_kn: float, displacement_t: float) -> float:
        """The shaft power a clean hull needs at this speed and displacement."""
        return self.a * speed_kn**self.n * (displacement_t / self.displacement_ref_t) ** (2.0 / 3.0)

    def clean_speed_kn(self, power_kw: float, displacement_t: float) -> float | None:
        """The inverse: the speed a clean hull would make on this power. ISO 19030's f_ref."""
        if power_kw <= 0.0 or displacement_t <= 0.0:
            return None
        scale = self.a * (displacement_t / self.displacement_ref_t) ** (2.0 / 3.0)
        if scale <= 0.0:
            return None
        return (power_kw / scale) ** (1.0 / self.n)


def clean_window_days(ship_id: str, events: list[dict], first_day: int) -> list[tuple[int, int]]:
    """The [start, start + 60] windows in which this ship's hull is known to be clean."""
    anchors = [first_day]
    anchors += [e['event_day'] for e in events if e['ship_id'] == ship_id and e['event_type'] in HULL_CLEAN_EVENTS]
    return [(a, a + CLEAN_WINDOW_DAYS) for a in sorted(anchors)]


def clean_window_rows(cleaned_rows: list[dict], events: list[dict], vessels: dict[str, dict]) -> list[dict]:
    """Cleaned noon rows that are both ISO-valid and inside a clean-hull window."""
    by_ship: dict[str, list[dict]] = defaultdict(list)
    for row in cleaned_rows:
        by_ship[row['ship_id']].append(row)

    out: list[dict] = []
    for ship_id, rows in by_ship.items():
        windows = clean_window_days(ship_id, events, min(r['noon_utc'] for r in rows))
        vessel = vessels[ship_id]
        for row in rows:
            day = row['noon_utc']
            if any(lo <= day <= hi for lo, hi in windows) and filters.is_valid(row, vessel):
                out.append(row)
    return out


def _log_space(points: list[tuple[float, float, float]], displacement_ref_t: float) -> tuple[list[float], list[float]]:
    """(speed, power, displacement) -> the log-log coordinates the power law is linear in."""
    xs = [math.log(v) for v, _, _ in points]
    ys = [math.log(p) - (2.0 / 3.0) * math.log(d / displacement_ref_t) for _, p, d in points]
    return xs, ys


def _fit_exponent(points: list[tuple[float, float, float]], displacement_ref_t: float) -> float | None:
    """The POOLED speed exponent n: the least-squares slope over a pool's clean points."""
    if len(points) < MIN_FIT_POINTS:
        return None
    xs, ys = _log_space(points, displacement_ref_t)
    mean_x, mean_y = sum(xs) / len(xs), sum(ys) / len(ys)
    var_x = sum((x - mean_x) ** 2 for x in xs)
    if var_x == 0.0:
        return None
    slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys)) / var_x
    return min(max(slope, CURVE_N_BOUNDS[0]), CURVE_N_BOUNDS[1])


def _fit_scale(
    points: list[tuple[float, float, float]], displacement_ref_t: float, exponent: float
) -> tuple[float, float] | None:
    """The PER-SHIP scale a, given the pooled exponent -> (a, log-space RMSE).

    With ``n`` fixed the fit is a single intercept, so it needs far fewer points than a
    slope does — which is exactly why the exponent is pooled and the scale is not.
    """
    if not points:
        return None
    xs, ys = _log_space(points, displacement_ref_t)
    intercepts = [y - exponent * x for x, y in zip(xs, ys)]
    # Median, not mean: a ship's clean window can still hold a sensor spike, and one bad
    # power reading must not move its entire baseline.
    intercept = sorted(intercepts)[len(intercepts) // 2]
    residuals = [i - intercept for i in intercepts]
    rmse = math.sqrt(sum(r * r for r in residuals) / len(residuals))
    return (math.exp(intercept), rmse)


def build(
    cleaned_rows: list[dict], events: list[dict], vessels: list[dict], power_key: str = 'power_corrected_kw'
) -> list[dict]:
    """Fit one curve per (hull_class, propeller_variant) pool; emit 12 speed points each.

    ``power_key`` is the power the curve is fitted against — the ISO 15016 *corrected*
    power in the real pipeline, or raw ``horse_power`` when ``corrections`` is scoring
    its no-correction control arm.
    """
    by_ship = {v['ship_id']: v for v in vessels}
    fit_rows = clean_window_rows(cleaned_rows, events, by_ship)

    ship_points: dict[str, list[tuple[float, float, float]]] = defaultdict(list)
    variant_points: dict[tuple[str, str], list[tuple[float, float, float]]] = defaultdict(list)
    class_points: dict[str, list[tuple[float, float, float]]] = defaultdict(list)
    for row in fit_rows:
        vessel = by_ship[row['ship_id']]
        power = row.get(power_key)
        if not power:  # the correction can null a row's power out from under the gate
            continue
        point = (row['speed_through_water'], power, row['displacement'])
        ship_points[row['ship_id']].append(point)
        variant_points[(vessel['hull_class'], vessel['propeller_variant'])].append(point)
        class_points[vessel['hull_class']].append(point)

    # --- 1. the pooled exponent, one per (hull_class, propeller_variant) ------------------
    exponents: dict[tuple[str, str], tuple[float, str, int]] = {}
    for hull_class, variant in sorted({(v['hull_class'], v['propeller_variant']) for v in vessels}):
        points = variant_points[(hull_class, variant)]
        fit_pool = f'{hull_class}-{variant}'
        # S22 is the only W2-P1 ship AND a masked prediction ship, so its own pool is far too
        # thin to fit an exponent. Widen to the hull class rather than fit noise: the hull
        # sets the resistance, the propeller variant only shifts pitch. Recorded, never hidden.
        if len(points) < MIN_FIT_POINTS:
            points = class_points[hull_class]
            fit_pool = hull_class
        vessel = next(v for v in vessels if v['hull_class'] == hull_class and v['propeller_variant'] == variant)
        exponent = _fit_exponent(points, vessel['displacement_design_t'])
        if exponent is None:
            raise ValueError(
                f'reference_curve: pool {fit_pool} has only {len(points)} clean-window valid points '
                f'(need {MIN_FIT_POINTS}) — every ISO 19030 number depends on this fit'
            )
        exponents[(hull_class, variant)] = (exponent, fit_pool, len(points))

    # --- 2. the per-ship scale, on that ship's own clean-window points --------------------
    out: list[dict] = []
    for vessel in sorted(vessels, key=lambda v: v['ship_id']):
        ship_id = vessel['ship_id']
        pool_key = (vessel['hull_class'], vessel['propeller_variant'])
        exponent, fit_pool, n_pool = exponents[pool_key]
        displacement_ref_t = vessel['displacement_design_t']

        points = ship_points[ship_id]
        # A ship with too few clean points of its own falls back to its pool's scale. Its
        # speed loss then carries the pool's offset — visible as n_fit_points below the floor.
        scale_points = (
            points
            if len(points) >= MIN_SHIP_FIT_POINTS
            else variant_points[pool_key] or class_points[vessel['hull_class']]
        )
        fit = _fit_scale(scale_points, displacement_ref_t, exponent)
        if fit is None:
            raise ValueError(f'reference_curve: ship {ship_id} has no clean-window valid points to scale on')
        a, rmse = fit

        curve = Curve(f'RC-{ship_id}', a, exponent, displacement_ref_t)
        lo, hi = SPEED_RANGE_FRACTION
        v_lo, v_hi = lo * vessel['design_speed_kn'], hi * vessel['design_speed_kn']
        step = (v_hi - v_lo) / (CURVE_POINTS - 1)
        for i in range(CURVE_POINTS):
            speed = v_lo + step * i
            out.append(
                {
                    'ref_curve_id': curve.ref_curve_id,
                    'ship_id': ship_id,
                    'hull_class': vessel['hull_class'],
                    'propeller_variant': vessel['propeller_variant'],
                    'speed_kn': speed,
                    'shaft_power_kw': curve.clean_power_kw(speed, displacement_ref_t),
                    'displacement_ref_t': displacement_ref_t,
                    'curve_a': a,
                    'curve_n': exponent,
                    'fit_pool': fit_pool,
                    'n_fit_points': len(points),
                    'n_pool_points': n_pool,
                    # log-space RMSE -> the multiplicative power error it implies.
                    'fit_rmse_pct': (math.exp(rmse) - 1.0) * 100.0,
                }
            )
    return out


def curves_by_ship(reference_curve_rows: list[dict], vessels: list[dict]) -> dict[str, Curve]:
    """ship_id -> its fitted Curve (the object the whole curated zone inverts)."""
    curves: dict[str, Curve] = {}
    for row in reference_curve_rows:
        curves.setdefault(
            row['ship_id'],
            Curve(row['ref_curve_id'], row['curve_a'], row['curve_n'], row['displacement_ref_t']),
        )
    return curves
