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

The estimates are not noise. Each is drawn inside the band its **real grade** implies,
and then nudged by the **real ISO 19030 speed loss measured on the inspection day** — a
hull the data says is slow gets a fouling rating that says it is dirty. So the
rating <-> speed-loss relationship every dashboard chart leans on holds against real
measurements instead of against a random number generator. The propeller condition
keeps the dataset's real Good/Fair/Poor scale, and the synthesized roughness is what
drives legacy's 300/430 um polish/repair thresholds: real signal, legacy threshold logic.

Where a grade is missing, the speed loss alone conditions the estimate — which is the
best the data supports, and is flagged by the column's ``estimated`` provenance.
"""

from __future__ import annotations

import random

# Inspecting event types. PP and UWC are interventions, not inspections.
INSPECTION_TYPES = {'UWI', 'DD'}

# Bands each real grade implies. Roughness um: legacy's polish threshold is 300, repair
# 430, so Good sits clear of both, Fair straddles polish, Poor pushes toward repair.
_ROUGHNESS_BAND = {'Good': (150.0, 260.0), 'Fair': (260.0, 380.0), 'Poor': (380.0, 520.0)}
_ROUGHNESS_UNKNOWN = (200.0, 420.0)
# Coating breakdown %: legacy bands good <20 / fair [20,45) / poor >=45.
_COATING_BAND = {'Good': (2.0, 18.0), 'Fair': (20.0, 44.0), 'Poor': (46.0, 85.0)}
_COATING_UNKNOWN = (5.0, 60.0)

# Hull fouling rating 0-100. Anchored on the day's real speed loss: a clean hull loses
# ~0 %, and by the 8 % maintenance trigger it is thoroughly fouled.
_RATING_PER_SPEED_LOSS_PCT = 7.0
_RATING_JITTER = 6.0
_COVERAGE_PER_RATING = 1.15

# How hard the real speed loss pulls the grade-implied estimate within its band. 0 = the
# grade decides alone, 1 = the speed loss decides alone.
_SPEED_LOSS_WEIGHT = 0.45
_SPEED_LOSS_SATURATION_PCT = 10.0

# The window of valid daily speed loss averaged to characterise the inspection day. A
# single noon report is too noisy; the inspection reflects the state of the hull, not
# the weather that afternoon.
SPEED_LOSS_WINDOW_DAYS = 14


def _band_position(speed_loss_pct: float | None) -> float:
    """Where in its band an estimate should sit, 0 (clean) -> 1 (fouled), from real speed loss."""
    if speed_loss_pct is None:
        return 0.5
    return min(max(speed_loss_pct / _SPEED_LOSS_SATURATION_PCT, 0.0), 1.0)


def _draw(rng: random.Random, band: tuple[float, float], speed_loss_pct: float | None) -> float:
    """Draw inside a grade's band, pulled toward the end the real speed loss points at."""
    lo, hi = band
    centre = rng.uniform(0.3, 0.7)
    position = (1.0 - _SPEED_LOSS_WEIGHT) * centre + _SPEED_LOSS_WEIGHT * _band_position(speed_loss_pct)
    return lo + (hi - lo) * min(max(position, 0.0), 1.0)


def _recommended_action(roughness_um: float, coating_pct: float, speed_loss_pct: float | None) -> str:
    if (speed_loss_pct or 0.0) >= 8.0 or coating_pct >= 45.0:
        return 'clean'
    if roughness_um >= 300.0:
        return 'polish'
    return 'none'


def build(events: list[dict], speed_loss_by_day: dict[tuple[str, int], float], seed: int = 42) -> list[dict]:
    """Project the inspection events into ``uwi`` rows.

    ``speed_loss_by_day`` is the real trailing-mean ISO 19030 speed loss per
    ``(ship_id, day)`` — the measurement that conditions every synthesized signal.
    """
    rows: list[dict] = []
    for event in sorted(events, key=lambda e: (e['ship_id'], e['event_day'], e['event_type'])):
        if event['event_type'] not in INSPECTION_TYPES:
            continue
        ship_id, day = event['ship_id'], event['event_day']
        # Seeded per inspection: reproducible, and independent of iteration order.
        rng = random.Random(f'{seed}:{ship_id}:{day}:{event["event_type"]}')
        speed_loss = speed_loss_by_day.get((ship_id, day))

        propeller = event.get('propeller_condition')
        coating = event.get('hull_coating_condition')
        # A missing grade (the source leaves coating blank on 51 of 77 rows) falls back to
        # the wide band, where the real speed loss is the only thing positioning the draw.
        roughness = _draw(rng, _ROUGHNESS_BAND.get(propeller or '', _ROUGHNESS_UNKNOWN), speed_loss)
        breakdown = _draw(rng, _COATING_BAND.get(coating or '', _COATING_UNKNOWN), speed_loss)

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
