"""Group B — maintenance / fouling-age features from ``maintenance.csv`` + time only (predict-safe).

Reset semantics come straight from the README 養護類型 table, re-declared locally at the *atom*
level: a composite raw code (``UWC+PP``, ``UWI+PP``) splits on ``+`` into atoms, and

* a hull cleaning is any event carrying ``UWC`` or ``DD`` -> resets the hull clock,
* a propeller polish is any event carrying ``PP`` or ``DD`` -> resets the polish clock,
* a dry dock is ``DD`` -> resets the dry-dock clock,
* ``UWI`` (inspection, photos only) is in none of the reset sets: **it resets nothing**.

The reset-clock arithmetic (:func:`days_since_reset`, :func:`reset_censored`) is the same pure
integer-day model as ``ym_datalake/etl/curated/daily.py`` but re-implemented here so this package
carries no dependency on the curated lake.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

HULL_RESET_ATOMS = frozenset({'UWC', 'DD'})
POLISH_RESET_ATOMS = frozenset({'PP', 'DD'})
DRY_DOCK_ATOMS = frozenset({'DD'})
INSPECTION_ATOMS = frozenset({'UWI'})

# Per-raw-type days-since clocks (each is "days since the most recent event of exactly this code").
RAW_EVENT_TYPES = ['DD', 'UWC', 'PP', 'UWI+PP', 'UWC+PP', 'UWI']

CONDITION = {'Good': 0, 'Fair': 1, 'Poor': 2}
CAVITATION = {'Yes': 1, 'No': 0}
# barnacle/tubeworm are hard calcareous foulers (high drag); slime/algae are soft; calcium between.
FOULING_WEIGHT = {'barnacle': 3, 'tubeworm': 3, 'calcium': 2, 'algae': 1, 'slime': 1}
FOULING_TYPES = list(FOULING_WEIGHT)


def _last_reset(day: int, resets: list[int]) -> int | None:
    prior = [r for r in resets if r <= day]
    return max(prior) if prior else None


def days_since_reset(days: list[int], resets: list[int], anchor: int) -> dict[int, int]:
    """day -> days since the latest reset at or before it; first cycle anchored at the ship's data start.

    Inclusive (a cleaning on day *d* leaves the clock at 0 on day *d*, matching that noon report).
    Pure integer-day arithmetic — no synthetic data.
    """
    return {day: max(0, day - (anchor if (last := _last_reset(day, resets)) is None else last)) for day in days}


def reset_censored(days: list[int], resets: list[int]) -> dict[int, bool]:
    """day -> True when no reset precedes it, so its clock is a lower bound anchored at data start."""
    return {day: _last_reset(day, resets) is None for day in days}


def _atoms(event_type: str) -> set[str]:
    return {a.strip() for a in str(event_type).split('+') if a.strip()}


def load_events(data_dir: str) -> pd.DataFrame:
    """Read ``maintenance.csv``; attach the atom set and cleaned fouling set per event."""
    ev = pd.read_csv(f'{data_dir}/maintenance.csv', encoding='utf-8-sig', dtype=str)
    ev['event_day'] = ev['event_day'].astype(int)
    ev['ship_id'] = ev['ship_id'].astype(str)
    ev['atoms'] = ev['event_type'].map(_atoms)
    ev['fouling_set'] = ev['hull_fouling_type'].map(_fouling_set)
    return ev.sort_values(['ship_id', 'event_day']).reset_index(drop=True)


def _fouling_set(value) -> set[str] | None:
    if not isinstance(value, str) or not value.strip():
        return None
    return {t.strip().lower() for t in value.split(',') if t.strip()}


def add_maintenance_features(df: pd.DataFrame, events: pd.DataFrame) -> pd.DataFrame:
    """Attach all group-B columns, computed per ship against that ship's events + its data-start anchor."""
    events_by_ship = {sid: sub for sid, sub in events.groupby('ship_id')}
    parts = [_ship_maintenance(sub, events_by_ship.get(sid)) for sid, sub in df.groupby('ship_id', sort=False)]
    feats = pd.concat(parts).reindex(df.index)
    return pd.concat([df, feats], axis=1)


def _reset_days(ship_events: pd.DataFrame | None, atoms: frozenset[str]) -> list[int]:
    if ship_events is None:
        return []
    hit = ship_events['atoms'].map(lambda a: bool(a & atoms))
    return sorted(ship_events.loc[hit, 'event_day'].tolist())


def _ship_maintenance(rows: pd.DataFrame, ship_events: pd.DataFrame | None) -> pd.DataFrame:
    days = rows['noon_utc'].tolist()
    uniq = sorted(set(days))
    anchor = min(days)
    out = pd.DataFrame(index=rows.index)

    hull_days = _reset_days(ship_events, HULL_RESET_ATOMS)
    polish_days = _reset_days(ship_events, POLISH_RESET_ATOMS)
    dd_days = _reset_days(ship_events, DRY_DOCK_ATOMS)

    # Headline reset clocks + their monotone transforms (give the tree fouling shape, no fitted constant).
    clocks = {
        'days_since_hull_clean': days_since_reset(uniq, hull_days, anchor),
        'days_since_prop_polish': days_since_reset(uniq, polish_days, anchor),
        'days_since_dry_dock': days_since_reset(uniq, dd_days, anchor),
    }
    for name, clock in clocks.items():
        col = rows['noon_utc'].map(clock)
        out[name] = col
        out[f'{name}_log1p'] = np.log1p(col)
        out[f'{name}_sqrt'] = np.sqrt(col)

    out['coating_age_years'] = out['days_since_dry_dock'] / 365.0
    out['hull_clock_censored'] = rows['noon_utc'].map(reset_censored(uniq, hull_days)).astype(int)
    out['polish_clock_censored'] = rows['noon_utc'].map(reset_censored(uniq, polish_days)).astype(int)

    # Per-raw-type days-since (each exact code), plus any-service (non-UWI) and any-event clocks.
    for raw in RAW_EVENT_TYPES:
        rdays = _exact_type_days(ship_events, raw)
        out[f'days_since_{_slug(raw)}'] = rows['noon_utc'].map(days_since_reset(uniq, rdays, anchor))
    out['days_since_any_service'] = rows['noon_utc'].map(
        days_since_reset(uniq, _service_days(ship_events, exclude_inspection=True), anchor)
    )
    out['days_since_any_event'] = rows['noon_utc'].map(
        days_since_reset(uniq, _service_days(ship_events, exclude_inspection=False), anchor)
    )

    _attach_counts(out, rows, ship_events, hull_days, polish_days, dd_days)
    _attach_carry_forward(out, rows, ship_events)

    # Saturating hull clock (fouling growth flattens) + condition×clock interactions (worse-and-older).
    out['hull_clock_sat'] = 1.0 - np.exp(-out['days_since_hull_clean'] / 180.0)
    out['prop_cond_x_polishclock'] = out['last_prop_condition'] * out['days_since_prop_polish']
    out['cavitation_x_polishclock'] = out['last_cavitation_found'] * out['days_since_prop_polish']
    return out


def _exact_type_days(ship_events: pd.DataFrame | None, raw: str) -> list[int]:
    if ship_events is None:
        return []
    return sorted(ship_events.loc[ship_events['event_type'] == raw, 'event_day'].tolist())


def _service_days(ship_events: pd.DataFrame | None, exclude_inspection: bool) -> list[int]:
    if ship_events is None:
        return []
    ev = ship_events
    if exclude_inspection:
        ev = ev[ev['event_type'] != 'UWI']  # a pure inspection is not a service
    return sorted(ev['event_day'].tolist())


def _attach_counts(out, rows, ship_events, hull_days, polish_days, dd_days) -> None:
    day = rows['noon_utc']
    insp_days = _reset_days(ship_events, INSPECTION_ATOMS)  # events that include a UWI atom
    service_days = _service_days(ship_events, exclude_inspection=True)
    all_days = _service_days(ship_events, exclude_inspection=False)

    out['n_hull_cleans'] = day.map(lambda d: _count_leq(hull_days, d))
    out['n_prop_polishes'] = day.map(lambda d: _count_leq(polish_days, d))
    out['n_drydocks'] = day.map(lambda d: _count_leq(dd_days, d))
    out['n_inspections'] = day.map(lambda d: _count_leq(insp_days, d))
    out['n_services_to_date'] = day.map(lambda d: _count_leq(service_days, d))
    for window in (30, 90, 180):
        out[f'event_count_{window}d'] = day.map(lambda d, w=window: _count_window(all_days, d, w))


def _count_leq(sorted_days: list[int], day: int) -> int:
    return int(np.searchsorted(sorted_days, day, side='right'))


def _count_window(sorted_days: list[int], day: int, window: int) -> int:
    lo = np.searchsorted(sorted_days, day - window, side='right')
    hi = np.searchsorted(sorted_days, day, side='right')
    return int(hi - lo)


def _attach_carry_forward(out, rows, ship_events) -> None:
    """Last-observation carry-forward of the inspection findings (UWI observations count).

    Each finding is carried independently from the most recent event at/before the day that actually
    recorded it, so a blank cell on a later event does not erase an earlier reading.
    """
    day = rows['noon_utc']
    ev = ship_events

    prop = _observed(ev, 'propeller_condition', CONDITION) if ev is not None else []
    coat = _observed(ev, 'hull_coating_condition', CONDITION) if ev is not None else []
    cav = _observed(ev, 'cavitation_found', CAVITATION) if ev is not None else []
    foul = _observed_fouling(ev) if ev is not None else []

    out['last_prop_condition'] = day.map(lambda d: _carry(prop, d))
    out['last_hull_coating_condition'] = day.map(lambda d: _carry(coat, d))
    out['last_cavitation_found'] = day.map(lambda d: _carry(cav, d))
    out['last_fouling_severity'] = day.map(lambda d: _carry_fouling(foul, d, kind='severity'))
    for t in FOULING_TYPES:
        out[f'had_{t}'] = day.map(lambda d, t=t: _carry_fouling(foul, d, kind=t))


def _observed(ev: pd.DataFrame, col: str, encoding: dict[str, int]) -> list[tuple[int, int]]:
    obs = []
    for _, r in ev.iterrows():
        v = r[col]
        if isinstance(v, str) and v.strip() in encoding:
            obs.append((r['event_day'], encoding[v.strip()]))
    return obs


def _observed_fouling(ev: pd.DataFrame) -> list[tuple[int, set[str]]]:
    return [(r['event_day'], r['fouling_set']) for _, r in ev.iterrows() if r['fouling_set']]


def _carry(observed: list[tuple[int, int]], day: int):
    prior = [v for d, v in observed if d <= day]
    return prior[-1] if prior else np.nan


def _carry_fouling(observed: list[tuple[int, set[str]]], day: int, kind: str):
    prior = [s for d, s in observed if d <= day]
    if not prior:
        return np.nan
    latest = prior[-1]
    if kind == 'severity':
        return sum(FOULING_WEIGHT.get(t, 0) for t in latest)
    return int(kind in latest)


def _slug(raw: str) -> str:
    return raw.replace('+', '_').lower()
