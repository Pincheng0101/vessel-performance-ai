"""``uwi`` — the inspection projection: real grades, synthesized numbers.

The 53 inspection rows are the ones that really happened: the **43 UWI atoms** (12
standalone + 31 split out of ``UWI+PP``) plus the **10 DD rows**, because a dry-dock
inspects the hull it hauls out. ``maintenance_event`` already holds all 77 source rows,
so this table carries no preservation duty — it is a view for the dashboard.

What is real and what is not:

* **Real (measured)** — ``propeller_condition``, ``hull_coating_condition``,
  ``hull_fouling_type``, ``cavitation_found``, the day. Note they are *sparse*: the
  source grades coating on only 26 of 77 rows, propeller on 45, cavitation on 36.
* **ESTIMATED** — ``propeller_roughness_um``, ``coating_breakdown_pct``,
  ``hull_fouling_rating``, ``hull_fouling_coverage_pct``. The dataset simply does not
  measure these, and legacy's Rubert A-F propeller scale does not exist here.

The estimates are not noise, and they are not memoryless draws either. Roughness and coating
breakdown are **states that grow on a clock a service resets**, so they are generated as
growth from the state the last reset left behind::

    value(clock) = clean + (max - clean) . (1 - exp(-rate . clock / tau))

The clock is ``days_since_polish`` (roughness) / ``days_since_dry_dock`` (coating), landed on
the row beside the value it explains. The **rate** is what the real signals condition: the
real Good/Fair/Poor grade, the **real ISO 19030 speed loss measured on the inspection day**,
and a per-ship spread. So a hull the data says is slow gets a fouling rating that says it is
dirty, and the rating <-> speed-loss relationship every dashboard chart leans on holds against
real measurements instead of against a random number generator.

**The grade sets the rate, not the level.** ``propeller_condition`` is a *damage* grade — a
pitted propeller roughens faster — and it is not a reading of how long since the last polish.
The dataset agrees: its 25 ``Good`` inspections span 114 to 474 days since polish, so the
grade and the clock are uncorrelated. Keying a *band* off the grade (as this module once did)
would therefore overwrite the clock with noise, and clamping every ``Good`` into a 150-260 um
band caps the implied slope so low that no ship in the fleet ever reaches the 300 um polish
threshold — the signal dies.

**Saturating, not linear.** 13 inspections have no prior reset in the record; their clocks are
anchored at the data start and run past 1,300 days, where a linear law would put the propeller
at 800 um. Saturating growth is also the right physical shape, and over the observed 50-500 day
range it stays near-linear — so the *linear* extrapolator ``curated.recommendation`` fits on top
of these points remains legitimate.

Where a grade is missing, the speed loss and the clock alone condition the estimate — which is
the best the data supports, and is flagged by the column's ``estimated`` provenance.
"""

from __future__ import annotations

import math
import random

from ym_datalake.etl.curated.daily import DRY_DOCK_RESETS, POLISH_RESETS, days_since_reset, reset_censored

# Inspecting event types. PP and UWC are interventions, not inspections.
INSPECTION_TYPES = {'UWI', 'DD'}

# The growth law, per signal: the value a reset leaves behind, the asymptote it climbs toward,
# and the time constant. Calibrated on the 44 real polish intervals in maintenance.csv (51-816
# days, mean 303): at a nominal rate of 1.0, roughness crosses legacy's 300 um polish threshold
# at ~275 days — the fleet's own cadence — and coating crosses 45 % at ~1,750 days, close to the
# 5-year survey a dry dock is scheduled around.
CLEAN_ROUGHNESS_UM = 150.0
_MAX_ROUGHNESS_UM = 560.0
_ROUGHNESS_TAU_DAYS = 600.0
CLEAN_COATING_PCT = 2.0
_MAX_COATING_PCT = 90.0
_COATING_TAU_DAYS = 2600.0

# The rate multipliers, each **centred on 1.0** so that the nominal law above is what the fleet
# actually realises. The real grade scales the growth rate (Poor roughens ~1.7x as fast as Good);
# the real speed loss modulates it either way; a per-ship draw gives the fleet a spread, and a
# per-inspection draw keeps a single point from landing exactly on the curve.
_GRADE_RATE = {'Good': 0.85, 'Fair': 1.15, 'Poor': 1.45}
_GRADE_RATE_UNKNOWN = 1.0
_SHIP_RATE_SPREAD = (0.80, 1.20)
_RATE_JITTER = (0.92, 1.08)
# Centred, NOT a one-sided lift: a slow hull fouls faster (x1.3), a clean one slower (x0.7), and
# a day with **no** speed-loss measurement is neutral (x1.0). A one-sided `1 + gain.position`
# term cannot damp a rate, only inflate it — it would hand an unmeasured day a free 30 % boost,
# and it drags the whole fleet ~22 % above the nominal law, so neither calibration above would
# hold in the data the module actually emits.
_SPEED_LOSS_RATE_GAIN = 0.60
_SPEED_LOSS_NEUTRAL = 0.50

# Hull fouling rating 0-100. Anchored on the day's real speed loss: a clean hull loses
# ~0 %, and by the 8 % maintenance trigger it is thoroughly fouled.
_RATING_PER_SPEED_LOSS_PCT = 7.0
_RATING_JITTER = 6.0
_COVERAGE_PER_RATING = 1.15

_SPEED_LOSS_SATURATION_PCT = 10.0

# The window of valid daily speed loss averaged to characterise the inspection day. A
# single noon report is too noisy; the inspection reflects the state of the hull, not
# the weather that afternoon.
SPEED_LOSS_WINDOW_DAYS = 14


def _speed_loss_position(speed_loss_pct: float | None) -> float:
    """0 (clean) -> 1 (fouled), from the real speed loss. 0.5 where the day has no measurement."""
    if speed_loss_pct is None:
        return 0.5
    return min(max(speed_loss_pct / _SPEED_LOSS_SATURATION_PCT, 0.0), 1.0)


def _rate(rng: random.Random, ship_spread: float, grade: str | None, speed_loss_pct: float | None) -> float:
    """How fast this ship's signal grows, relative to the nominal law: grade x speed loss x spread.

    ``ship_spread`` is drawn once per ship and held fixed across its inspections — a ship that
    fouls fast fouls fast on every one of them, so its points sit on **one** growth curve.
    """
    return (
        ship_spread
        * _GRADE_RATE.get(grade or '', _GRADE_RATE_UNKNOWN)
        * (1.0 + _SPEED_LOSS_RATE_GAIN * (_speed_loss_position(speed_loss_pct) - _SPEED_LOSS_NEUTRAL))
        * rng.uniform(*_RATE_JITTER)
    )


def _grow(clean: float, maximum: float, tau: float, rate: float, clock: int) -> float:
    """The saturating growth law, evaluated at ``clock`` days since the last reset."""
    return clean + (maximum - clean) * (1.0 - math.exp(-rate * clock / tau))


def _recommended_action(roughness_um: float, coating_pct: float, speed_loss_pct: float | None) -> str:
    if (speed_loss_pct or 0.0) >= 8.0 or coating_pct >= 45.0:
        return 'clean'
    if roughness_um >= 300.0:
        return 'polish'
    return 'none'


def _clocks(events: list[dict], inspection_days: list[int], anchor: int, resets: set[str]) -> tuple[dict, dict]:
    """(clock, censored) per inspection day, on the **strict** reset clock — see ``days_since_reset``."""
    reset_days = [e['event_day'] for e in events if e['event_type'] in resets]
    return (
        days_since_reset(inspection_days, reset_days, anchor, strict=True),
        reset_censored(inspection_days, reset_days, strict=True),
    )


def build(events: list[dict], speed_loss_by_day: dict[tuple[str, int], float], seed: int = 42) -> list[dict]:
    """Project the inspection events into ``uwi`` rows.

    ``speed_loss_by_day`` is the real trailing-mean ISO 19030 speed loss per ``(ship_id, day)``
    — the measurement that conditions every synthesized signal, and (its earliest key per ship)
    the anchor a censored first cycle is measured from.

    Each row carries the **clock its own value grew on**, so a consumer fitting a trend against
    the clock reads the x and the y off the same row and the two can never drift apart.
    """
    inspections = [e for e in events if e['event_type'] in INSPECTION_TYPES]
    by_ship: dict[str, list[dict]] = {}
    for event in inspections:
        by_ship.setdefault(event['ship_id'], []).append(event)

    # The data start, per ship: the day a censored first cycle is measured from.
    anchors: dict[str, int] = {}
    for keyed_ship, keyed_day in speed_loss_by_day:
        anchors[keyed_ship] = min(anchors.get(keyed_ship, keyed_day), keyed_day)

    events_by_ship: dict[str, list[dict]] = {}
    for event in events:
        events_by_ship.setdefault(event['ship_id'], []).append(event)

    rows: list[dict] = []
    for ship_id, ship_inspections in sorted(by_ship.items()):
        days: list[int] = [e['event_day'] for e in ship_inspections]
        anchor: int = anchors[ship_id] if ship_id in anchors else min(days)
        ship_events = events_by_ship[ship_id]
        polish_clock, polish_censored = _clocks(ship_events, days, anchor, POLISH_RESETS)
        dock_clock, dock_censored = _clocks(ship_events, days, anchor, DRY_DOCK_RESETS)
        # Seeded on the ship, drawn once: the rate spread must be the same on every one of its
        # inspections, or the ship's own points would not sit on one growth curve.
        ship_spread = random.Random(f'{seed}:{ship_id}').uniform(*_SHIP_RATE_SPREAD)

        for event in sorted(ship_inspections, key=lambda e: (e['event_day'], e['event_type'])):
            day = event['event_day']
            # Seeded per inspection: reproducible, and independent of iteration order.
            rng = random.Random(f'{seed}:{ship_id}:{day}:{event["event_type"]}')
            speed_loss = speed_loss_by_day.get((ship_id, day))

            propeller = event.get('propeller_condition')
            coating = event.get('hull_coating_condition')
            roughness = _grow(
                CLEAN_ROUGHNESS_UM,
                _MAX_ROUGHNESS_UM,
                _ROUGHNESS_TAU_DAYS,
                _rate(rng, ship_spread, propeller, speed_loss),
                polish_clock[day],
            )
            breakdown = _grow(
                CLEAN_COATING_PCT,
                _MAX_COATING_PCT,
                _COATING_TAU_DAYS,
                _rate(rng, ship_spread, coating, speed_loss),
                dock_clock[day],
            )

            rating = (speed_loss or 0.0) * _RATING_PER_SPEED_LOSS_PCT + rng.uniform(-_RATING_JITTER, _RATING_JITTER)
            rating = int(min(max(round(rating), 0), 100))
            coverage = min(rating * _COVERAGE_PER_RATING, 100.0)

            rows.append(
                {
                    'inspection_id': f'UWI-{ship_id}-{day}',
                    'ship_id': ship_id,
                    'inspection_day': day,
                    'inspection_type': event['event_type'],
                    'hull_fouling_rating': rating,
                    'hull_fouling_coverage_pct': coverage,
                    'hull_fouling_type': event.get('hull_fouling_type'),
                    'propeller_condition': propeller,
                    'propeller_roughness_um': roughness,
                    'hull_coating_condition': coating,
                    'coating_breakdown_pct': breakdown,
                    'cavitation_found': event.get('cavitation_found'),
                    'recommended_action': _recommended_action(roughness, breakdown, speed_loss),
                    'days_since_polish': polish_clock[day],
                    'days_since_dry_dock': dock_clock[day],
                    'polish_cycle_censored': polish_censored[day],
                    'dry_dock_cycle_censored': dock_censored[day],
                }
            )
    return rows


def trailing_speed_loss(
    daily_rows: list[dict], window_days: int = SPEED_LOSS_WINDOW_DAYS
) -> dict[tuple[str, int], float]:
    """(ship, day) -> mean valid ``speed_loss_pct`` over the preceding ``window_days``.

    The real measurement the synthesized inspection signals are conditioned on. Only
    valid ISO points count, so weather and manoeuvring days do not contaminate the grade.
    """
    by_ship: dict[str, list[tuple[int, float]]] = {}
    for row in daily_rows:
        if row.get('valid_flag') and row.get('speed_loss_pct') is not None:
            by_ship.setdefault(row['ship_id'], []).append((row['noon_utc'], row['speed_loss_pct']))

    out: dict[tuple[str, int], float] = {}
    for ship_id, series in by_ship.items():
        series.sort()
        days = {day for day, _ in series}
        # Every day the ship reported, plus every day an inspection could land on.
        for day in range(min(days), max(days) + 1):
            window = [v for d, v in series if day - window_days <= d <= day]
            if window:
                out[(ship_id, day)] = sum(window) / len(window)
    return out
