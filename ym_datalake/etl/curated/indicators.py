"""``fact_performance_indicator`` — the four ISO 19030 period indicators, long format.

The meaning of ``value`` / ``reference_value`` / the period and event columns **depends
on the indicator code**:

======  ============================================================  ===========================
code    meaning                                                        value / reference_value
======  ============================================================  ===========================
ISP     In-service performance: per-cycle mean speed loss             cycle mean / first cycle's
DDP     Dry-dock performance: the +/-45-day window around a dry dock  mean after / mean before
ME      Maintenance effect: recovery at one event (+/-30 days)        before - after / before
MT      Maintenance trigger: first crossing of the 8 % trailing mean  8.0 / null
======  ============================================================  ===========================

A real constraint of this dataset: **5 of the 15 ships (S9-S12, S23) never dry-dock**,
so they get **no DDP rows at all**. That is a fact about the fleet, not a bug — the
table simply has nothing to say about a dry dock that never happened.
"""

from __future__ import annotations

from collections import defaultdict

from ym_datalake.etl.curated.daily import HULL_RESETS

ME_WINDOW_DAYS = 30
DDP_WINDOW_DAYS = 45
MT_WINDOW_DAYS = 14
MT_TRIGGER_PCT = 8.0  # the maintenance trigger on the trailing-mean speed loss
MIN_WINDOW_POINTS = 3


def _mean(values: list[float]) -> float | None:
    return sum(values) / len(values) if values else None


def _window_mean(series: list[tuple[int, float]], lo: int, hi: int) -> float | None:
    """Mean speed loss over the valid points in [lo, hi)."""
    values = [v for d, v in series if lo <= d < hi]
    return _mean(values) if len(values) >= MIN_WINDOW_POINTS else None


def build(daily_rows: list[dict], events: list[dict]) -> list[dict]:
    """Every indicator row for every ship, over *valid* daily speed loss only."""
    series_by_ship: dict[str, list[tuple[int, float]]] = defaultdict(list)
    for row in daily_rows:
        if row['valid_flag'] and row.get('speed_loss_pct') is not None:
            series_by_ship[row['ship_id']].append((row['noon_utc'], row['speed_loss_pct']))

    events_by_ship: dict[str, list[dict]] = defaultdict(list)
    for event in events:
        events_by_ship[event['ship_id']].append(event)

    out: list[dict] = []
    for ship_id, series in sorted(series_by_ship.items()):
        series.sort()
        ship_events = sorted(events_by_ship[ship_id], key=lambda e: e['event_day'])
        out.extend(_isp(ship_id, series, ship_events))
        out.extend(_event_indicators(ship_id, series, ship_events))
        mt = _mt(ship_id, series)
        if mt:
            out.append(mt)
    return out


def _cycles(series: list[tuple[int, float]], events: list[dict]) -> list[tuple[int, int]]:
    """Hull-fouling cycles: [start, end) bounded by the real UWC/DD resets."""
    first, last = series[0][0], series[-1][0]
    starts = [first] + sorted(
        {e['event_day'] for e in events if e['event_type'] in HULL_RESETS if e['event_day'] > first}
    )
    bounds = starts + [last + 1]
    return [(bounds[i], bounds[i + 1]) for i in range(len(bounds) - 1)]


def _isp(ship_id: str, series: list[tuple[int, float]], events: list[dict]) -> list[dict]:
    """ISP: each cleaning cycle's mean speed loss, referenced to the first cycle's."""
    rows: list[dict] = []
    reference: float | None = None
    for start, end in _cycles(series, events):
        mean = _window_mean(series, start, end)
        if mean is None:
            continue
        if reference is None:
            reference = mean
        rows.append(
            {
                'ship_id': ship_id,
                'indicator': 'ISP',
                'period_start_day': start,
                'period_end_day': end - 1,
                'event_type': None,
                'event_day': None,
                'value': mean,
                'reference_value': reference,
                'detail': None,
            }
        )
    return rows


def _event_indicators(ship_id: str, series: list[tuple[int, float]], events: list[dict]) -> list[dict]:
    """ME for every intervention, and DDP for every dry dock."""
    rows: list[dict] = []
    for event in events:
        event_type, day = event['event_type'], event['event_day']
        if event_type == 'UWI':  # an inspection changes nothing; there is no effect to measure
            continue

        before = _window_mean(series, day - ME_WINDOW_DAYS, day)
        after = _window_mean(series, day + 1, day + 1 + ME_WINDOW_DAYS)
        if before is not None and after is not None:
            rows.append(
                {
                    'ship_id': ship_id,
                    'indicator': 'ME',
                    'period_start_day': None,
                    'period_end_day': None,
                    'event_type': event_type,
                    'event_day': day,
                    'value': before - after,  # positive = the hull recovered
                    'reference_value': before,
                    'detail': f'after={after:.2f}',
                }
            )

        if event_type != 'DD':
            continue
        dd_before = _window_mean(series, day - DDP_WINDOW_DAYS, day)
        dd_after = _window_mean(series, day + 1, day + 1 + DDP_WINDOW_DAYS)
        if dd_before is not None and dd_after is not None:
            rows.append(
                {
                    'ship_id': ship_id,
                    'indicator': 'DDP',
                    'period_start_day': None,
                    'period_end_day': day + DDP_WINDOW_DAYS,
                    'event_type': 'DD',
                    'event_day': day,
                    'value': dd_after,
                    'reference_value': dd_before,
                    'detail': None,
                }
            )
    return rows


def _mt(ship_id: str, series: list[tuple[int, float]]) -> dict | None:
    """MT: the first day the 14-day trailing-mean speed loss crosses the 8 % trigger."""
    for day, _ in series:
        window = [v for d, v in series if day - MT_WINDOW_DAYS < d <= day]
        if len(window) >= MIN_WINDOW_POINTS and sum(window) / len(window) >= MT_TRIGGER_PCT:
            return {
                'ship_id': ship_id,
                'indicator': 'MT',
                'period_start_day': None,
                'period_end_day': None,
                'event_type': None,
                'event_day': day,
                'value': MT_TRIGGER_PCT,
                'reference_value': None,
                'detail': 'trailing-mean speed loss crossed the maintenance trigger',
            }
    return None
