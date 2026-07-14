"""Maintenance cycles + ISO 19030 period indicators (pipeline S7, §4.3).

Hull-fouling resets (hull_cleaning ∪ dry_dock) partition each vessel's history
into cycles; ``days_since_cleaning`` is measured from the latest reset (re-derived
from ``maintenance_event`` — the ground-truth segment is never read). The period
indicators are computed over *valid* daily speed loss:

- ISP — per-cycle mean speed loss vs the first cycle (in-service degradation).
- DDP — mean speed loss in the window after each dry dock vs the window before.
- ME  — per maintenance event, mean speed loss before − after (recovery %).
- MT  — first date a trailing-mean speed loss crosses the maintenance trigger.

Cost/payback enrichment (spec §5.4/§5.5) is deferred to M3.
"""

from __future__ import annotations

import datetime as dt

from ym_datalake.synthetic_data.fleet import VesselSpec

_RESET_EVENTS = ('hull_cleaning', 'dry_dock')

ME_WINDOW_DAYS = 30
DDP_WINDOW_DAYS = 45
MT_WINDOW_DAYS = 14
MT_TRIGGER_PCT = 8.0  # POC maintenance-trigger threshold on trailing-mean speed loss


def to_date(value) -> dt.date:
    """Parse an ISO date/date-time string (or pass a ``date`` through)."""
    if isinstance(value, dt.date):
        return value
    return dt.date.fromisoformat(str(value)[:10])


def reset_dates(events: list[dict], imo: str, types: tuple[str, ...] = _RESET_EVENTS) -> list[dt.date]:
    """Sorted reset dates for a vessel of the given event ``types``.

    Defaults to the hull-fouling reset clock (hull_cleaning ∪ dry_dock); the engine
    detrend/forecast passes ``('engine_overhaul', 'dry_dock')`` and the propeller /
    coating forecasts their own clocks.
    """
    dates = [to_date(e['event_date']) for e in events if e['imo_number'] == imo and e['event_type'] in types]
    return sorted(dates)


def latest_reset(report_date: dt.date, resets: list[dt.date], fallback_start: dt.date) -> dt.date:
    """The latest reset on/before ``report_date`` (else the window start anchor)."""
    anchor = fallback_start
    for r in resets:
        if r <= report_date:
            anchor = r
        else:
            break
    return anchor


def days_since_cleaning(report_date: dt.date, resets: list[dt.date], fallback_start: dt.date) -> int:
    """Days since the latest reset on/before ``report_date`` (else since window start)."""
    return max(0, (report_date - latest_reset(report_date, resets, fallback_start)).days)


def _mean_speed_loss(valid: list[tuple], start: dt.date, end: dt.date) -> float | None:
    """Mean speed_loss_pct over valid (date, speed_loss) points in [start, end)."""
    vals = [sl for d, sl in valid if start <= d < end]
    return sum(vals) / len(vals) if vals else None


def build_indicators(daily_rows: list[dict], events: list[dict], spec: VesselSpec) -> list[dict]:
    """ISO 19030 period-indicator rows for one vessel (long format)."""
    imo = spec.imo_number
    valid = sorted(
        (to_date(r['report_date']), r['speed_loss_pct'])
        for r in daily_rows
        if r['valid_flag'] and r['speed_loss_pct'] is not None
    )
    if not valid:
        return []
    window_start, window_end = valid[0][0], valid[-1][0] + dt.timedelta(days=1)
    resets = reset_dates(events, imo)
    rows: list[dict] = []

    def emit(indicator: str, value, **extra) -> None:
        row = {
            'imo_number': imo,
            'indicator': indicator,
            'period_start': None,
            'period_end': None,
            'event_type': None,
            'event_date': None,
            'value': value,
            'reference_value': None,
            'detail': None,
        }
        row.update(extra)
        rows.append(row)

    # ISP — per cycle vs the first cycle's mean.
    bounds = [window_start] + [r for r in resets if window_start < r < window_end] + [window_end]
    cycle_means: list[tuple] = []
    for start, end in zip(bounds, bounds[1:]):
        mean = _mean_speed_loss(valid, start, end)
        if mean is not None:
            cycle_means.append((start, end, mean))
    baseline = cycle_means[0][2] if cycle_means else None
    for start, end, mean in cycle_means:
        emit('ISP', mean, period_start=start.isoformat(), period_end=end.isoformat(), reference_value=baseline)

    # DDP / ME — per maintenance event.
    for event in sorted((e for e in events if e['imo_number'] == imo), key=lambda e: to_date(e['event_date'])):
        day = to_date(event['event_date'])
        before = _mean_speed_loss(valid, day - dt.timedelta(days=ME_WINDOW_DAYS), day)
        after = _mean_speed_loss(valid, day, day + dt.timedelta(days=ME_WINDOW_DAYS))
        if before is not None and after is not None:
            emit(
                'ME',
                before - after,  # positive = speed loss recovered
                event_type=event['event_type'],
                event_date=day.isoformat(),
                reference_value=before,
                detail=f'after={after:.3f}',
            )
        if event['event_type'] == 'dry_dock':
            dd_before = _mean_speed_loss(valid, day - dt.timedelta(days=DDP_WINDOW_DAYS), day)
            dd_after = _mean_speed_loss(valid, day, day + dt.timedelta(days=DDP_WINDOW_DAYS))
            if dd_after is not None:
                emit(
                    'DDP',
                    dd_after,
                    event_type='dry_dock',
                    event_date=day.isoformat(),
                    period_end=(day + dt.timedelta(days=DDP_WINDOW_DAYS)).isoformat(),
                    reference_value=dd_before,
                )

    # MT — first trailing-mean crossing of the trigger threshold.
    for i, (day, _) in enumerate(valid):
        window = [sl for _, sl in valid[max(0, i - MT_WINDOW_DAYS + 1) : i + 1]]
        if len(window) >= MT_WINDOW_DAYS and sum(window) / len(window) >= MT_TRIGGER_PCT:
            emit('MT', MT_TRIGGER_PCT, event_date=day.isoformat(), detail='trailing-mean speed loss crossed trigger')
            break

    return rows
