"""``fact_performance_daily`` — the analytical spine. Every other curated table reads it.

Grain: **one row per ship per day**, unique (the raw zone's 344 duplicates collapsed in
``clean``). One row exists for every day the ship reported, including the days that fail
the ISO gate — the speed-loss chart needs a continuous calendar, and ``valid_flag`` is
what tells a consumer which points may be fitted on.

The derivation chain, in order:

1. ``clean``       — dedupe, clip the impossible cells, backfill displacement
2. ``geography``   — drape a track (decorative; never feeds a number below)
3. ``corrections`` — ISO 15016: subtract wind + wave power  -> ``power_corrected_kw``
4. ``reference_curve`` — invert the fitted clean-hull curve at that power -> ``v_expected_kn``
5. **here**        — ``speed_loss_pct = (v_expected - STW) / v_expected . 100``

Everything downstream — indicators, anomalies, alerts, recommendations, CII, the
economics — is a function of this table.

The ISO/derived columns go null rather than guess whenever the day cannot support them:
no power, no STW, a correction that ate the whole engine output, or a clipped cell.
``eeoi`` is additionally null on ballast days (no cargo to carry).
"""

from __future__ import annotations

from collections import defaultdict

from ym_datalake.etl import epoch, fuel, physics
from ym_datalake.etl.curated import filters
from ym_datalake.etl.raw.reference_curve import Curve

# Event -> reset clock. Atomic event types make this a lookup rather than a rule engine:
# UWC cleans the hull, PP polishes the propeller, DD does both, UWI only looks.
HULL_RESETS = {'UWC', 'DD'}
POLISH_RESETS = {'PP', 'DD'}
DRY_DOCK_RESETS = {'DD'}

FLEET_BY_HULL_CLASS = {'W1': 'FL-W1', 'W2': 'FL-W2'}
FLEET_NAME = {'FL-W1': 'W1 Class', 'FL-W2': 'W2 Class'}


def _days_since(days: list[int], resets: list[int], anchor: int) -> dict[int, int]:
    """day -> days since the latest reset on/before it (first cycle anchored at data start)."""
    ordered = sorted(resets)
    out: dict[int, int] = {}
    for day in days:
        last = anchor
        for reset in ordered:
            if reset <= day:
                last = max(last, reset)
            else:
                break
        out[day] = max(0, day - last)
    return out


def build(
    corrected_rows: list[dict],
    vessels: dict[str, dict],
    events: list[dict],
    curves: dict[str, Curve],
    track: dict,
    prices: dict[tuple[int, str], float],
) -> list[dict]:
    """The daily fact table. ``corrected_rows`` are cleaned rows with the ISO 15016 terms."""
    by_ship: dict[str, list[dict]] = defaultdict(list)
    for row in corrected_rows:
        by_ship[row['ship_id']].append(row)

    events_by_ship: dict[str, list[dict]] = defaultdict(list)
    for event in events:
        events_by_ship[event['ship_id']].append(event)

    out: list[dict] = []
    for ship_id, rows in sorted(by_ship.items()):
        rows.sort(key=lambda r: r['noon_utc'])
        vessel = vessels[ship_id]
        curve = curves[ship_id]
        ship_events = events_by_ship[ship_id]

        days = [r['noon_utc'] for r in rows]
        anchor = min(days)
        clocks = {
            'days_since_cleaning': _days_since(
                days, [e['event_day'] for e in ship_events if e['event_type'] in HULL_RESETS], anchor
            ),
            'days_since_polish': _days_since(
                days, [e['event_day'] for e in ship_events if e['event_type'] in POLISH_RESETS], anchor
            ),
            'days_since_dry_dock': _days_since(
                days, [e['event_day'] for e in ship_events if e['event_type'] in DRY_DOCK_RESETS], anchor
            ),
        }

        # The cumulative excess cost restarts at every hull cleaning: it answers "what has
        # this fouling cycle cost me so far", not "what have I ever spent".
        cum_excess = 0.0
        previous_clock = None

        for row in rows:
            day = row['noon_utc']
            valid = filters.is_valid(row, vessel)
            position = track.get((ship_id, day), {})

            stw = row.get('speed_through_water')
            power = row.get('power_corrected_kw')
            displacement = row.get('displacement')

            v_expected = speed_loss = None
            if power and stw and displacement:
                v_expected = curve.clean_speed_kn(power, displacement)
                if v_expected:
                    speed_loss = (v_expected - stw) / v_expected * 100.0

            fuel_type = fuel.day_fuel_type(row)
            total_foc = row.get('total_consump')
            me_foc = row.get('me_consumption')
            co2 = total_foc * fuel.CARBON_FACTOR[fuel_type] if total_foc and fuel_type else None

            price = prices.get((day, fuel_type)) if fuel_type else None
            excess_foc = (
                physics.excess_foc_mt(me_foc, speed_loss, curve.n) if me_foc and speed_loss is not None else None
            )
            excess_cost = excess_foc * price if excess_foc is not None and price else None

            clock = clocks['days_since_cleaning'][day]
            if previous_clock is not None and clock < previous_clock:
                cum_excess = 0.0  # a cleaning happened: the cycle's meter resets
            previous_clock = clock
            if excess_cost:
                cum_excess += excess_cost

            pitch, rpm = vessel['pitch_m'], row.get('me_avg_rpm')
            hours = row.get('hours_total')
            record = {
                'ship_id': ship_id,
                'noon_utc': day,
                **epoch.calendar(day),
                'voyage': row.get('voyage'),
                'hull_class': vessel['hull_class'],
                'fleet_id': FLEET_BY_HULL_CLASS[vessel['hull_class']],
                'latitude': position.get('latitude'),
                'longitude': position.get('longitude'),
                'heading_deg': position.get('heading_deg'),
                'port_from': position.get('port_from'),
                'port_to': position.get('port_to'),
                'speed_through_water': stw,
                'avg_speed': row.get('avg_speed'),
                'me_avg_rpm': rpm,
                'horse_power': row.get('horse_power'),
                'displacement': displacement,
                'displacement_source': row.get('displacement_source'),
                'mean_draft_m': row.get('mean_draft_m'),
                'cargo_on_board': row.get('cargo_on_board'),
                'hours_full_speed': row.get('hours_full_speed'),
                'hours_total': hours,
                'total_distance': row.get('total_distance'),
                'wind_scale': row.get('wind_scale'),
                'wind_speed': row.get('wind_speed'),
                'sea_height': row.get('sea_height'),
                'resistance_wind_kn': row.get('resistance_wind_kn'),
                'resistance_wave_kn': row.get('resistance_wave_kn'),
                'power_corrected_kw': power,
                'speed_corrected_kn': row.get('speed_corrected_kn'),
                'v_expected_kn': v_expected,
                'speed_loss_pct': speed_loss,
                'slip_apparent': physics.slip_fraction(row['avg_speed'], pitch, rpm)
                if rpm and row.get('avg_speed')
                else None,
                'slip_real': physics.slip_fraction(stw, pitch, rpm) if rpm and stw else None,
                # The source already reports SFOC; it is a measurement, not a re-derivation.
                'sfoc_g_kwh': row.get('sfoc'),
                'admiralty_coef': physics.admiralty_coef(displacement, stw, row['horse_power'])
                if displacement and stw and row.get('horse_power')
                else None,
                'eeoi': physics.eeoi(co2, row.get('cargo_on_board') or 0.0, row.get('total_distance') or 0.0)
                if co2
                else None,
                'fuel_type': fuel_type,
                'total_foc_mt': total_foc,
                'me_foc_mt': me_foc,
                'co2_mt': co2,
                'excess_foc_mt': excess_foc,
                'excess_cost_usd': excess_cost,
                # `is not None`, not truthiness: a clean-hull day costs $0 of excess, and a
                # cumulative series that goes null on its zero-increment days is not cumulative.
                'cum_excess_cost_usd': cum_excess if excess_cost is not None else None,
                **_cost_attribution(row, excess_cost, price, vessel, hours),
                # CII is annual; cii.py broadcasts it back onto these rows.
                'cii_aer': None,
                'cii_rating_aer': None,
                'cii_imo': None,
                'cii_rating_imo': None,
                **{name: clock_map[day] for name, clock_map in clocks.items()},
                # Filled by anomaly.py.
                'anomaly_flag': False,
                'anomaly_cause': None,
                'anomaly_severity': None,
                'valid_flag': valid,
                'masked_flag': bool(row.get('masked_flag')),
            }
            out.append(record)
    return out


# The engine's SFOC is lowest near ~80 % load and rises either side of it; burning fuel
# at an off-design load is a real, separable cost from burning it to push a dirty hull.
_SFOC_LOAD_COEF = 0.18
_LOAD_OPTIMUM = 0.80


def _cost_attribution(row: dict, excess_cost: float | None, price: float | None, vessel: dict, hours) -> dict:
    """Split the day's fuel penalty into fouling / weather / operational channels (USD).

    ADDITIVE, not a partition: weather and operational fuel are burned *on top of* the
    fouling penalty, so a chart stacking all three totals more than ``excess_cost_usd``.
    All three are ESTIMATED — they are priced in USD.

    Each channel is gated on **its own** inputs, because being additive means being
    independent: the weather channel is a resistance, an SFOC and an engine hour count, and
    a day missing ``me_consumption`` (so with no fouling number) has still burned fuel
    pushing through the weather. Nulling all three together would make one channel's gap
    look like a day with no cost at all.
    """
    # The fouling channel is `excess_cost`, which is already priced (and already None when the
    # day has no price, no me_consumption or no speed loss). The other two need the price here.
    channels: dict[str, float | None] = {
        'excess_cost_fouling_usd': excess_cost,
        'excess_cost_weather_usd': None,
        'excess_cost_operational_usd': None,
    }
    if price is None:
        return channels

    sfoc = row.get('sfoc')
    power = row.get('horse_power')
    stw = row.get('speed_through_water')
    me_foc = row.get('me_consumption')

    # Weather: the fuel the ISO 15016 resistances account for. A following wind gives a
    # negative resistance, hence a negative (i.e. saved) cost — floored at zero here so
    # the chart never shows a negative penalty.
    if sfoc and power and hours and stw:
        r_env_kn = (row.get('resistance_wind_kn') or 0.0) + (row.get('resistance_wave_kn') or 0.0)
        dp_env_kw = physics.resistance_to_power_kw(r_env_kn * 1000.0, stw)
        channels['excess_cost_weather_usd'] = physics.foc_mt(max(dp_env_kw, 0.0), sfoc, hours) * price

    # Operational: the SFOC penalty for running the engine away from its optimum load.
    if me_foc and power:
        load = min(1.05, power / vessel['mcr_kw'])
        penalty = _SFOC_LOAD_COEF * (load - _LOAD_OPTIMUM) ** 2
        channels['excess_cost_operational_usd'] = me_foc * penalty / (1.0 + penalty) * price

    return channels
