"""Maintenance schedule, fouling trajectory (C9), UWI corroboration (C10) and the
independent propeller / coating / engine degradation processes (C15–C17).

The true fractional speed loss ``s(t)`` grows linearly with days since the last
hull-fouling reset (rate 0.01–0.05 %/day) plus small bounded noise, and steps
back down at each reset event (hull cleaning / dry dock). YM WELLNESS gets an
engineered arc — a long, elevated segment that crosses the ~10 % maintenance
trigger, then a cleaning that recovers it — driven by a parameter override here
(not a separate module).

Propeller roughness, coating breakdown and engine SFOC drift are **independent**
resettable processes (each its own per-vessel rate + reset clock), so M3 can fit
and extrapolate a genuine predictive due date for every maintenance action:

- propeller_roughness_um — linear in days since the last propeller_polishing ∪
  dry_dock; propeller_condition (Rubert) is banded from the roughness (not ``s``);
- coating_breakdown_pct — linear in days since the last coating_renewal ∪ dry_dock;
- engine SFOC secular drift — a slow per-day multiplier on SFOC, reset at each
  engine_overhaul ∪ dry_dock (see ``engine_state`` / ``generate``).

Only ``hull_fouling_rating`` / ``hull_fouling_coverage_pct`` stay tied to ``s``
(C10); the other UWI signals are now decoupled from the hull-fouling fraction.
"""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass

import numpy as np

from ym_datalake.synthetic_data.fleet import WELLNESS_IMO, VesselSpec

# Fouling-rate bounds (fraction of speed loss per day) — §3.2 0.01–0.05 %/day.
_RATE_MIN, _RATE_MAX = 0.0001, 0.0005
_S_CAP = 0.16  # hard cap on true speed-loss fraction

_RUBERT = ['A', 'B', 'C', 'D', 'E', 'F']

# --- independent degradation processes (C15–C17) -----------------------------
# Propeller roughness (µm): linear in days since polish/dry_dock, Rubert-banded.
_PROP_BASE_UM = 150.0
_PROP_RATE_MIN, _PROP_RATE_MAX = 0.35, 0.75  # µm/day
_PROP_CAP_UM = 600.0
_PROP_NOISE_UM = 8.0
# Rubert A|B|C|D|E|F upper band edges — polish onset (C)=270, repair onset (E)=390.
_PROP_BAND_EDGES = (210.0, 270.0, 330.0, 390.0, 470.0)

# Coating breakdown (%): linear in days since coating_renewal/dry_dock.
_COAT_RATE_MIN, _COAT_RATE_MAX = 0.02, 0.05  # %/day
_COAT_NOISE_PCT = 1.0
_COAT_FAIR_PCT, _COAT_POOR_PCT = 20.0, 45.0  # good < fair < poor

# Engine SFOC secular drift (fraction/day): reset at engine_overhaul/dry_dock.
_SFOC_DRIFT_MIN, _SFOC_DRIFT_MAX = 3e-5, 7e-5
_SFOC_DRIFT_CAP = 0.06  # peak drift ≤ +6 % keeps median SFOC in band (C17)
_OVERHAUL_FIRST_MIN, _OVERHAUL_FIRST_MAX = 400, 900  # first overhaul offset from start
_OVERHAUL_EVERY_MIN, _OVERHAUL_EVERY_MAX = 900, 1300  # subsequent interval (days)

# YM WELLNESS fixed rates + a mid-window overhaul → a clean, predictable deep-dive
# story (propeller-fouling→polish arc, coating rise, SFOC drift→inspection).
_WELLNESS_PROP_RATE = 0.35
_WELLNESS_COAT_RATE = 0.028
_WELLNESS_SFOC_DRIFT = 5.5e-5


def _rubert_from_roughness(roughness: float) -> str:
    """Rubert grade (A–F) for a propeller roughness in µm."""
    idx = 0
    for edge in _PROP_BAND_EDGES:
        if roughness >= edge:
            idx += 1
        else:
            break
    return _RUBERT[idx]


def _coating_from_breakdown(pct: float) -> str:
    """Coating condition from breakdown %: good < 20 / fair [20,45) / poor ≥ 45."""
    if pct >= _COAT_POOR_PCT:
        return 'poor'
    if pct >= _COAT_FAIR_PCT:
        return 'fair'
    return 'good'


def degradation_rates(
    rng_prop: np.random.Generator, rng_coat: np.random.Generator, rng_engine: np.random.Generator, spec: VesselSpec
) -> tuple[float, float, float]:
    """Per-vessel (prop_rate µm/day, coat_rate %/day, sfoc_drift_rate /day).

    Drawn from the dedicated ``prop_rough`` / ``coating`` / ``engine`` substreams
    (fixed WELLNESS overrides), so the fouling/op/anom substreams stay untouched.
    """
    if spec.imo_number == WELLNESS_IMO:
        return _WELLNESS_PROP_RATE, _WELLNESS_COAT_RATE, _WELLNESS_SFOC_DRIFT
    prop_rate = float(rng_prop.uniform(_PROP_RATE_MIN, _PROP_RATE_MAX))
    coat_rate = float(rng_coat.uniform(_COAT_RATE_MIN, _COAT_RATE_MAX))
    sfoc_drift_rate = float(rng_engine.uniform(_SFOC_DRIFT_MIN, _SFOC_DRIFT_MAX))
    return prop_rate, coat_rate, sfoc_drift_rate


@dataclass(frozen=True)
class Segment:
    """One fouling cycle: constant rate from ``reset_date`` until the next reset."""

    segment_id: int
    reset_date: dt.date
    rate: float
    reset_type: str  # hull_cleaning | dry_dock | initial


def _add_days(d: dt.date, n: int) -> dt.date:
    return d + dt.timedelta(days=int(n))


def _event(date: dt.date, event_type: str, rng: np.random.Generator, spec: VesselSpec) -> dict:
    """Build a ``maintenance_event`` row with plausible cost/downtime."""
    cost_scale = spec.teu / 10000.0 + 0.3
    cost_by_type = {
        'hull_cleaning': (40000, 90000, 12, 36),
        'propeller_polishing': (15000, 40000, 6, 18),
        'dry_dock': (800000, 2500000, 240, 600),
        'coating_renewal': (500000, 1500000, 0, 0),
        'propeller_repair': (60000, 200000, 24, 96),
        'engine_overhaul': (120000, 400000, 72, 240),
    }
    lo_c, hi_c, lo_d, hi_d = cost_by_type[event_type]
    location = rng.choice(['Singapore', 'Rotterdam', 'Busan', 'Shanghai', 'Colombo', 'Dubai'])
    return {
        'event_id': f'MV-{spec.imo_number}-{date.isoformat()}-{event_type[:4]}',
        'imo_number': spec.imo_number,
        'event_date': date,
        'event_type': event_type,
        'cost_usd': float(rng.uniform(lo_c, hi_c) * cost_scale),
        'downtime_hours': float(rng.uniform(lo_d, hi_d)),
        'location': str(location),
    }


def build_schedule(
    rng: np.random.Generator, spec: VesselSpec, start: dt.date, end: dt.date
) -> tuple[list[dict], list[Segment]]:
    """Return (maintenance_event rows, fouling segments) for the window.

    Segments are bounded by hull-fouling resets (hull_cleaning ∪ dry_dock). The
    first segment's ``reset_date`` sits before ``start`` so days-since-cleaning
    is continuous (and de-synced across vessels).
    """
    if spec.imo_number == WELLNESS_IMO:
        return _wellness_schedule(rng, spec, start, end)

    events: list[dict] = []
    reset_dates: list[tuple[dt.date, str]] = []

    # Dry docks: first 300–900 days in, then every ~3–4 years.
    t = _add_days(start, rng.integers(300, 900))
    while t <= end:
        events.append(_event(t, 'dry_dock', rng, spec))
        events.append(_event(t, 'coating_renewal', rng, spec))
        reset_dates.append((t, 'dry_dock'))
        t = _add_days(t, rng.integers(int(3.0 * 365), int(4.0 * 365)))

    # Hull cleanings every 8–14 months, skipped within 60 days of a dry dock.
    t = _add_days(start, rng.integers(150, 350))
    dry_dock_days = {d for d, _ in reset_dates}
    while t <= end:
        if all(abs((t - dd).days) > 60 for dd in dry_dock_days):
            events.append(_event(t, 'hull_cleaning', rng, spec))
            reset_dates.append((t, 'hull_cleaning'))
        t = _add_days(t, rng.integers(240, 420))

    # Propeller polishing — emitted, but does not reset the hull trajectory.
    t = _add_days(start, rng.integers(200, 400))
    while t <= end:
        events.append(_event(t, 'propeller_polishing', rng, spec))
        t = _add_days(t, rng.integers(300, 480))

    segments = _segments_from_resets(rng, spec, start, reset_dates)
    return events, segments


def _segments_from_resets(
    rng: np.random.Generator, spec: VesselSpec, start: dt.date, reset_dates: list[tuple[dt.date, str]]
) -> list[Segment]:
    """Assemble ordered fouling segments, prepending a pre-window initial reset."""
    initial_offset = int(rng.integers(0, 250))
    boundaries = sorted([(rd, rt) for rd, rt in reset_dates if rd >= start])
    segments: list[Segment] = [
        Segment(0, _add_days(start, -initial_offset), float(rng.uniform(_RATE_MIN, _RATE_MAX)), 'initial')
    ]
    for i, (rd, rt) in enumerate(boundaries, start=1):
        segments.append(Segment(i, rd, float(rng.uniform(_RATE_MIN, _RATE_MAX)), rt))
    return segments


def _wellness_schedule(
    rng: np.random.Generator, spec: VesselSpec, start: dt.date, end: dt.date
) -> tuple[list[dict], list[Segment]]:
    """Engineered YM WELLNESS arc: rise past the 10 % trigger, then recover.

    Anchored by day-offsets from ``start`` so it lands in-window for the default
    5-year range and clips gracefully for shorter ranges.
    """
    dd_date = _add_days(start, 315)  # early dry dock (reset)
    clean1_date = _add_days(start, 700)  # start of the long elevated segment
    polish_date = _add_days(start, 980)  # propeller polish (no hull reset)
    clean2_date = _add_days(start, 1294)  # the recovery cleaning (~594-day segment)

    events: list[dict] = []
    reset_dates: list[tuple[dt.date, str]] = []
    for d, et in [(dd_date, 'dry_dock'), (clean1_date, 'hull_cleaning'), (clean2_date, 'hull_cleaning')]:
        if start <= d <= end:
            events.append(_event(d, et, rng, spec))
            reset_dates.append((d, et))
    if start <= dd_date <= end:
        events.append(_event(dd_date, 'coating_renewal', rng, spec))
    if start <= polish_date <= end:
        events.append(_event(polish_date, 'propeller_polishing', rng, spec))

    # Fixed rates: the long segment (started by clean1) is elevated so s reaches
    # ~10.7 % over ~594 days, crossing the maintenance trigger before recovery.
    polish2_date = _add_days(start, 1500)  # a second propeller polish keeps the arc predictive
    if start <= polish2_date <= end:
        events.append(_event(polish2_date, 'propeller_polishing', rng, spec))
    initial_offset = 120
    segments = [Segment(0, _add_days(start, -initial_offset), 0.00012, 'initial')]
    rate_by_reset = {dd_date: 0.00013, clean1_date: 0.00018, clean2_date: 0.00012}
    for i, (rd, rt) in enumerate(sorted(reset_dates), start=1):
        segments.append(Segment(i, rd, rate_by_reset.get(rd, 0.00013), rt))
    return events, segments


def event_dates(events: list[dict], types: tuple[str, ...]) -> list[dt.date]:
    """Sorted ``event_date`` values (as ``date``) of the given event types."""
    return sorted(e['event_date'] for e in events if e['event_type'] in types)


def _days_since(reset_dates: list[dt.date], d: dt.date, fallback: dt.date) -> int:
    """Days from ``d`` back to the latest reset on/before it (else ``fallback``)."""
    anchor = fallback
    for r in reset_dates:
        if r <= d:
            anchor = r
        else:
            break
    return max(0, (d - anchor).days)


def build_engine_overhauls(rng: np.random.Generator, spec: VesselSpec, start: dt.date, end: dt.date) -> list[dict]:
    """``engine_overhaul`` events (a light engine reset, NOT a fouling reset).

    WELLNESS gets one fixed mid-window overhaul; the rest are scheduled from the
    dedicated ``engine`` substream ~every 900–1300 days.
    """
    if spec.imo_number == WELLNESS_IMO:
        d = _add_days(start, 1000)
        return [_event(d, 'engine_overhaul', rng, spec)] if start <= d <= end else []
    events: list[dict] = []
    t = _add_days(start, rng.integers(_OVERHAUL_FIRST_MIN, _OVERHAUL_FIRST_MAX))
    while t <= end:
        events.append(_event(t, 'engine_overhaul', rng, spec))
        t = _add_days(t, rng.integers(_OVERHAUL_EVERY_MIN, _OVERHAUL_EVERY_MAX))
    return events


def engine_state(
    engine_resets: list[dt.date], dates: list[dt.date], window_start: dt.date, sfoc_drift_rate: float
) -> list[dict]:
    """Per-day ``days_since_overhaul`` + capped ``sfoc_drift_frac`` for one vessel.

    Engine reset clock = engine_overhaul ∪ dry_dock; the first cycle is anchored at
    ``window_start`` (the same fallback the ETL detrend reconstructs from events).
    """
    resets = sorted(r for r in engine_resets if r <= dates[-1])
    out: list[dict] = []
    for d in dates:
        dso = _days_since(resets, d, window_start)
        out.append(
            {
                'days_since_overhaul': dso,
                'sfoc_drift_frac': min(_SFOC_DRIFT_CAP, sfoc_drift_rate * dso),
            }
        )
    return out


def fouling_state(segments: list[Segment], dates: list[dt.date], rng: np.random.Generator) -> list[dict]:
    """Per-day true fouling: days_since_cleaning, segment id, true speed-loss frac."""
    noise = rng.normal(0.0, 0.001, len(dates))
    out: list[dict] = []
    for i, d in enumerate(dates):
        seg = _segment_for(segments, d)
        dsc = max(0, (d - seg.reset_date).days)
        s = min(_S_CAP, max(0.0, seg.rate * dsc + noise[i]))
        out.append(
            {
                'days_since_cleaning': dsc,
                'fouling_segment_id': seg.segment_id,
                'true_speed_loss_frac': s,
            }
        )
    return out


def _segment_for(segments: list[Segment], d: dt.date) -> Segment:
    """Latest segment whose reset date is on or before ``d``."""
    chosen = segments[0]
    for seg in segments:
        if seg.reset_date <= d:
            chosen = seg
        else:
            break
    return chosen


def build_uwi(
    rng: np.random.Generator,
    spec: VesselSpec,
    segments: list[Segment],
    events: list[dict],
    prop_rate: float,
    coat_rate: float,
    start: dt.date,
    end: dt.date,
) -> list[dict]:
    """Underwater inspection rows every ~6–9 months.

    ``hull_fouling_rating`` / ``hull_fouling_coverage_pct`` stay monotone in the
    true fouling ``s`` (C10). ``propeller_roughness_um`` and ``coating_breakdown_pct``
    are independent, resettable processes (C15/C16) — banded into
    ``propeller_condition`` / ``coating_condition`` — reset by their own event clocks.
    """
    prop_resets = event_dates(events, ('propeller_polishing', 'dry_dock'))
    coat_resets = event_dates(events, ('coating_renewal', 'dry_dock'))
    rows: list[dict] = []
    t = _add_days(start, int(rng.integers(60, 200)))
    while t <= end:
        seg = _segment_for(segments, t)
        dsc = max(0, (t - seg.reset_date).days)
        s_true = min(_S_CAP, seg.rate * dsc)  # deterministic trend (monotone anchor)
        rating = int(round(np.clip(s_true / _S_CAP * 100.0, 0, 100)))
        coverage = float(np.clip(s_true / 0.12 * 100.0, 0.0, 100.0))

        days_since_polish = _days_since(prop_resets, t, start)
        roughness = _PROP_BASE_UM + prop_rate * days_since_polish + float(rng.normal(0.0, _PROP_NOISE_UM))
        roughness = float(np.clip(roughness, _PROP_BASE_UM, _PROP_CAP_UM))

        days_since_coating = _days_since(coat_resets, t, start)
        breakdown = coat_rate * days_since_coating + float(rng.normal(0.0, _COAT_NOISE_PCT))
        breakdown = float(np.clip(breakdown, 0.0, 100.0))

        action = 'clean' if rating >= 60 else 'polish' if rating >= 30 else 'none'
        rows.append(
            {
                'inspection_id': f'UWI-{spec.imo_number}-{t.isoformat()}',
                'imo_number': spec.imo_number,
                'inspection_date': t,
                'inspection_type': str(rng.choice(['UWI', 'diver', 'ROV'])),
                'hull_fouling_rating': rating,
                'hull_fouling_coverage_pct': coverage,
                'propeller_condition': _rubert_from_roughness(roughness),
                'propeller_roughness_um': roughness,
                'coating_breakdown_pct': breakdown,
                'coating_condition': _coating_from_breakdown(breakdown),
                'recommended_action': action,
            }
        )
        t = _add_days(t, int(rng.integers(180, 270)))
    return rows
