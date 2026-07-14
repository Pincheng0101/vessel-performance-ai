"""Forward-model orchestrator: fleet × day → raw records + ground truth.

Determinism: one master ``--seed`` fans out into independent
``numpy.random.SeedSequence`` substreams keyed by ``(imo, purpose)`` so draws are
order-independent — adding a field or vessel never shifts another vessel's
numbers, and the global ``np.random`` state is never touched.

Per-vessel × day the values are derived in the order that guarantees the
injected speed loss is recoverable by M2 (see ``doc/synthetic-dataset.md`` and
the module-level ``_forward_day``): ground truth first, then loading → Δ →
drafts, environment, commanded STW, clean-equivalent power (C1), environmental
added power, FOC (C2), RPM/slip (C7), SOG (C4), distances (C3), CO2 (C8), and
finally bounded sensor noise + labeled anomalies (C12).
"""

from __future__ import annotations

import datetime as dt
import math
from dataclasses import dataclass, field

import numpy as np

from ym_datalake.synthetic_data import physics
from ym_datalake.synthetic_data.curves import ReferenceCurve, build_curve
from ym_datalake.synthetic_data.datasets import build_fuel_price, build_reference_curve, build_vessel_master
from ym_datalake.synthetic_data.environment import generate_environment
from ym_datalake.synthetic_data.fleet import FLEET, VesselSpec
from ym_datalake.synthetic_data.fouling import (
    Segment,
    build_engine_overhauls,
    build_schedule,
    build_uwi,
    degradation_rates,
    engine_state,
    event_dates,
    fouling_state,
)
from ym_datalake.synthetic_data.noise import build_anomaly_plan, sensor_multipliers
from ym_datalake.synthetic_data.ports import PORTS, path_distance_nm, path_point, route_path

# Substream identifiers keyed by purpose (fixed → order-independent draws).
# 8–10 are the independent degradation processes (propeller/coating/engine); 11
# (route) is a dedicated substream for the rotation start so the operating
# substream stays reserved for physics-relevant draws.
_PURPOSE_ID = {
    'fouling': 1,
    'uwi': 2,
    'environment': 3,
    'operating': 4,
    'noise': 5,
    'anomaly': 6,
    'fuel_price': 7,
    'prop_rough': 8,
    'coating': 9,
    'engine': 10,
    'route': 11,
}

# Per-fleet port rotations (LOCODEs ∈ ports.PORTS). Each is an out-and-back loop
# so the ballast return leg retraces the laden leg rather than arcing over land.
# FL-IA is intra-Asia (no European call); FL-TP is a trans-Pacific pendulum
# returning via Tokyo; FL-AE is the Asia–Europe pendulum via Suez.
_ROTATIONS: dict[str, list[str]] = {
    'FL-IA': ['CNSHA', 'KRPUS', 'JPTYO', 'HKHKG', 'SGSIN'],
    'FL-TP': ['CNSHA', 'KRPUS', 'USLAX', 'JPTYO'],
    'FL-AE': ['CNSHA', 'SGSIN', 'LKCMB', 'AEDXB', 'DEHAM', 'NLRTM', 'AEDXB', 'LKCMB', 'SGSIN'],
}
_MIN_LEG_DAYS = 2
# Scrubber-fitted vessels burn HFO at sea; the rest burn VLSFO. In port: MGO.
_SCRUBBER_IMOS = {'9700003', '9700009'}


@dataclass
class GenerationResult:
    """All raw datasets plus ground truth for one generation run."""

    noon_report: list[dict] = field(default_factory=list)
    vessel_master: list[dict] = field(default_factory=list)
    reference_curve: list[dict] = field(default_factory=list)
    uwi: list[dict] = field(default_factory=list)
    maintenance_event: list[dict] = field(default_factory=list)
    fuel_price: list[dict] = field(default_factory=list)
    ground_truth_daily: list[dict] = field(default_factory=list)
    fouling_segments: list[dict] = field(default_factory=list)


def _substream(master_seed: int, imo: str, purpose: str) -> np.random.Generator:
    ss = np.random.SeedSequence([master_seed, int(imo), _PURPOSE_ID[purpose]])
    return np.random.default_rng(ss)


def _date_range(start: dt.date, end: dt.date) -> list[dt.date]:
    return [start + dt.timedelta(days=i) for i in range((end - start).days + 1)]


def _leg_loading(rng: np.random.Generator, spec: VesselSpec, condition: str) -> tuple[float, float, float]:
    """Return (cargo_weight_mt, displacement_mt, trim_m) for a leg via mass balance."""
    stores = 0.015 * spec.dwt
    fuel = float(rng.uniform(0.03, 0.08)) * spec.dwt
    if condition == 'laden':
        cargo = float(rng.uniform(0.65, 0.97)) * 0.85 * spec.dwt
        ballast = 0.03 * spec.dwt
        trim = float(rng.uniform(-1.0, 0.5))
    else:
        cargo = 0.0
        ballast = float(rng.uniform(0.28, 0.36)) * spec.dwt
        trim = float(rng.uniform(0.8, 2.5))
    displacement = spec.lightship_mt + cargo + ballast + fuel + stores
    return cargo, displacement, trim


def build_operating_profile(
    rng_op: np.random.Generator, rng_route: np.random.Generator, spec: VesselSpec, dates: list[dt.date]
) -> list[dict]:
    """Per-day voyage state: phase, loading, heading, commanded speed, position.

    The vessel walks its fleet rotation (``_ROTATIONS``) one leg at a time. Ports,
    leg length and positions are **derived** from the great-circle path — the only
    ``rng_route`` draw is the rotation start (so vessels spread around the loop),
    and ``rng_op`` is reserved for the physics-relevant draws in exactly this
    order per leg: ``heading``, ``speed_factor``, ``_leg_loading`` (×3), then one
    ``speed`` per steaming day. Positions never feed physics — headings stay a
    random ``rng_op`` draw, decoupled from the geographic bearing.
    """
    n = len(dates)
    profile: list[dict | None] = [None] * n
    rotation = _ROTATIONS[spec.fleet_id]
    r = len(rotation)
    start_idx = int(rng_route.integers(0, r))
    voyage_no = int(rng_op.integers(1000, 2000))
    i = 0
    leg_idx = 0

    while i < n:
        port = rotation[(start_idx + leg_idx) % r]
        next_port = rotation[(start_idx + leg_idx + 1) % r]
        condition = 'laden' if leg_idx % 2 == 0 else 'ballast'
        path = route_path(port, next_port)
        heading = float(rng_op.uniform(0.0, 360.0))
        speed_factor = float(rng_op.uniform(0.72, 0.95))
        cargo, displacement, trim = _leg_loading(rng_op, spec, condition)
        nominal = max(6.0, spec.design_speed_kn * speed_factor)
        leg_days = max(_MIN_LEG_DAYS, round(path_distance_nm(path) / (nominal * 24.0)))
        leg_label = f'{port}-{next_port}'
        for d in range(leg_days):
            if i >= n:
                break
            speed = max(6.0, spec.design_speed_kn * speed_factor + float(rng_op.normal(0.0, 0.2)))
            lat, lon = path_point(path, (d + 1) / leg_days)
            profile[i] = {
                'voyage_no': str(voyage_no),
                'leg': leg_label,
                'port_from': port,
                'port_to': next_port,
                'voyage_phase': 'at_sea',
                'condition_flag': condition,
                'cargo_weight_mt': cargo,
                'displacement_mt': displacement,
                'trim_m': trim,
                'heading_deg': heading,
                'command_speed_kn': speed,
                'steaming_hours': 24.0,
                'latitude': lat,
                'longitude': lon,
            }
            i += 1
        if i < n:
            # In-port day pinned at the destination port (arrival position).
            profile[i] = {
                'voyage_no': str(voyage_no),
                'leg': leg_label,
                'port_from': port,
                'port_to': next_port,
                'voyage_phase': 'in_port',
                'condition_flag': condition,
                'cargo_weight_mt': cargo,
                'displacement_mt': displacement,
                'trim_m': trim,
                'heading_deg': heading,
                'command_speed_kn': 0.0,
                'steaming_hours': 0.0,
                'latitude': PORTS[next_port]['lat'],
                'longitude': PORTS[next_port]['lon'],
            }
            i += 1
        voyage_no += 1
        leg_idx += 1
    return [p for p in profile if p is not None]


def _sfoc(sfoc_base: float, load_ratio: float) -> float:
    """Load-dependent SFOC (g/kWh): shallow U-shape with a minimum near 80% MCR."""
    return sfoc_base * (1.0 + 0.18 * (load_ratio - 0.80) ** 2)


def _fuel_type(imo: str, phase: str) -> str:
    if phase != 'at_sea':
        return 'MGO'
    return 'HFO' if imo in _SCRUBBER_IMOS else 'VLSFO'


def _forward_day(
    spec: VesselSpec,
    curve: ReferenceCurve,
    date: dt.date,
    op: dict,
    fstate: dict,
    env: dict,
    anom: dict,
    sfoc_base: float,
    base_slip: float,
    noise: dict,
    estate: dict,
) -> tuple[dict, dict]:
    """Derive one day's noon report + ground-truth record (see module docstring)."""
    phase = op['voyage_phase']
    hours = op['steaming_hours']
    heading = op['heading_deg']
    fuel_type = _fuel_type(spec.imo_number, phase)

    # 1. Ground truth first (measurement-independent).
    s_true = fstate['true_speed_loss_frac']
    displacement = op['displacement_mt']

    # 2. Loading → Δ (mass balance, from the profile) → invert to drafts (C5/C6).
    mean_draft = physics.draft_from_displacement(
        displacement, spec.block_coefficient, spec.lpp_m, spec.breadth_m, physics.RHO_SW_REF_KG_M3
    )
    # Round fore/aft to mm then derive mean/trim from them so C6's identities
    # (mean=(fore+aft)/2, trim=aft−fore) hold exactly after the writer rounds.
    trim = op['trim_m']
    draft_fore = round(mean_draft - trim / 2.0, 3)
    draft_aft = round(mean_draft + trim / 2.0, 3)
    mean_draft = (draft_fore + draft_aft) / 2.0
    trim = round(draft_aft - draft_fore, 3)

    # 3. Environment (+ labeled extreme-weather boost).
    weather_scale = anom['weather_scale']
    beaufort = int(min(12, env['beaufort'] + (3 if weather_scale > 1.0 else 0)))
    wind_speed = env['wind_speed_kn'] * weather_scale
    wave_height = env['wave_height_m'] * weather_scale

    # In-port day: no propulsion; only auxiliaries burn fuel.
    if phase != 'at_sea':
        return _port_day(
            spec,
            date,
            op,
            fstate,
            env,
            anom,
            fuel_type,
            mean_draft,
            draft_fore,
            draft_aft,
            beaufort,
            wind_speed,
            wave_height,
            noise,
            estate,
        )

    # 4. Commanded STW.
    stw_true = op['command_speed_kn']

    # 5. Clean-equivalent speed → corrected power (C1 — the exact relation M2 inverts).
    v_ref = stw_true / (1.0 - s_true)
    p_corrected = curve.clean_power_kw(v_ref, displacement)

    # 6. Environmental added resistance → added power.
    rel_wind = physics.relative_wind_ms(wind_speed, env['wind_dir_deg'], heading, stw_true)
    r_aa = physics.wind_resistance_n(0.9, spec.transverse_area_m2, rel_wind)
    head_factor = 0.5 * (1.0 - math.cos(math.radians(env['wave_dir_deg'] - heading)))
    r_aw = physics.wave_resistance_n(wave_height, spec.breadth_m, spec.lpp_m, physics.RHO_SW_REF_KG_M3) * head_factor
    dp_env = physics.resistance_to_power_kw(r_aa + r_aw, stw_true)
    p_shaft_true = p_corrected + dp_env

    # 7. Energy balance → FOC (C2). SFOC = load U-shape × secular engine drift ×
    #    any injected step; the drift is baked into both truth SFOC and me_foc.
    load_ratio = min(1.05, p_shaft_true / spec.mcr_kw)
    sfoc = _sfoc(sfoc_base, load_ratio) * (1.0 + estate['sfoc_drift_frac']) * anom['sfoc_mult']
    me_foc_true = physics.foc_mt(p_shaft_true, sfoc, hours)
    ae_foc_true = 1.5 + spec.teu / 8000.0
    boiler_foc_true = 0.6 + spec.teu / 12000.0

    # 8. RPM from commanded STW & target slip (C7).
    target_slip = min(0.28, base_slip + anom['slip_add'])
    rpm_true = physics.rpm_for_slip(stw_true, spec.propeller_pitch_m, target_slip)

    # 9. SOG = STW + along-track current (C4).
    current_proj = physics.current_projection_kn(env['current_speed_kn'], env['current_dir_deg'], heading)
    sog_true = stw_true + current_proj

    # 10. CO2 (C8) — computed on truth from the same fuel/FOC.
    total_foc_true = me_foc_true + ae_foc_true + boiler_foc_true
    co2 = physics.co2_mt({fuel_type: total_foc_true})

    # 11. Bounded sensor noise (measured fields only) + labeled outliers; re-derive
    #     distance/SOG from noised speeds so C3/C4 stay consistent post-noise.
    def outlier(field_name: str, value: float) -> float:
        return value * anom['outlier_mult'] if anom['outlier_field'] == field_name else value

    stw_meas = outlier('speed_tw_kn', stw_true * noise['stw'])
    p_meas = outlier('me_shaft_power_kw', p_shaft_true * noise['power'])
    me_foc_meas = outlier('me_foc_mt', me_foc_true * noise['me_foc'])
    ae_foc_meas = ae_foc_true * noise['ae_foc']
    boiler_foc_meas = boiler_foc_true * noise['boiler_foc']
    total_foc_meas = me_foc_meas + ae_foc_meas + boiler_foc_meas
    rpm_meas = rpm_true * noise['rpm']
    wind_meas = outlier('wind_speed_kn', wind_speed)

    current_proj_meas = physics.current_projection_kn(env['current_speed_kn'], env['current_dir_deg'], heading)
    sog_meas = stw_meas + current_proj_meas
    distance_tw = stw_meas * hours * noise['dist_tw']
    distance_og = sog_meas * hours * noise['dist_og']

    noon = {
        'report_id': f'NR-{spec.imo_number}-{date.isoformat()}',
        'imo_number': spec.imo_number,
        'vessel_name': spec.vessel_name,
        'report_datetime_utc': f'{date.isoformat()} 12:00:00',
        'voyage_no': op['voyage_no'],
        'leg': op['leg'],
        'port_from': op['port_from'],
        'port_to': op['port_to'],
        'voyage_phase': phase,
        'latitude': op['latitude'],
        'longitude': op['longitude'],
        'heading_deg': heading,
        'steaming_hours': hours,
        'distance_og_nm': distance_og,
        'distance_tw_nm': distance_tw,
        'speed_og_kn': sog_meas,
        'speed_tw_kn': stw_meas,
        'me_rpm': rpm_meas,
        'me_shaft_power_kw': p_meas,
        'me_foc_mt': me_foc_meas,
        'propeller_pitch_m': spec.propeller_pitch_m,
        'fuel_type': fuel_type,
        'fuel_lcv_mj_kg': physics.FUEL_LCV_MJ_KG[fuel_type],
        'ae_foc_mt': ae_foc_meas,
        'boiler_foc_mt': boiler_foc_meas,
        'total_foc_mt': total_foc_meas,
        'draft_fore_m': draft_fore,
        'draft_aft_m': draft_aft,
        'mean_draft_m': mean_draft,
        'trim_m': trim,
        'displacement_mt': displacement,
        'cargo_weight_mt': op['cargo_weight_mt'],
        'condition_flag': op['condition_flag'],
        'wind_speed_kn': wind_meas,
        'wind_dir_deg': env['wind_dir_deg'],
        'beaufort': beaufort,
        'wave_height_m': wave_height,
        'wave_dir_deg': env['wave_dir_deg'],
        'wave_period_s': env['wave_period_s'],
        'swell_height_m': env['swell_height_m'],
        'swell_dir_deg': env['swell_dir_deg'],
        'sea_water_temp_c': env['sea_water_temp_c'],
        'air_temp_c': env['air_temp_c'],
        'air_pressure_hpa': env['air_pressure_hpa'],
        'current_speed_kn': env['current_speed_kn'],
        'current_dir_deg': env['current_dir_deg'],
        'sea_water_density_kg_m3': env['sea_water_density_kg_m3'],
        'data_source': 'sensor',
    }
    truth = _truth_record(
        spec,
        date,
        phase,
        fstate,
        displacement,
        mean_draft,
        r_aa / 1000.0,
        r_aw / 1000.0,
        p_corrected,
        p_shaft_true,
        stw_true,
        sog_true,
        heading,
        current_proj,
        sfoc,
        co2,
        anom,
        estate,
    )
    return noon, truth


def _port_day(
    spec,
    date,
    op,
    fstate,
    env,
    anom,
    fuel_type,
    mean_draft,
    draft_fore,
    draft_aft,
    beaufort,
    wind_speed,
    wave_height,
    noise,
    estate,
) -> tuple[dict, dict]:
    """In-port record: propulsion idle, auxiliaries + boiler running."""
    ae_foc = (1.8 + spec.teu / 7000.0) * noise['ae_foc']
    boiler_foc = (1.6 + spec.teu / 9000.0) * noise['boiler_foc']
    total_foc = ae_foc + boiler_foc
    co2 = physics.co2_mt({fuel_type: total_foc})
    noon = {
        'report_id': f'NR-{spec.imo_number}-{date.isoformat()}',
        'imo_number': spec.imo_number,
        'vessel_name': spec.vessel_name,
        'report_datetime_utc': f'{date.isoformat()} 12:00:00',
        'voyage_no': op['voyage_no'],
        'leg': op['leg'],
        'port_from': op['port_from'],
        'port_to': op['port_to'],
        'voyage_phase': op['voyage_phase'],
        'latitude': op['latitude'],
        'longitude': op['longitude'],
        'heading_deg': op['heading_deg'],
        'steaming_hours': 0.0,
        'distance_og_nm': 0.0,
        'distance_tw_nm': 0.0,
        'speed_og_kn': 0.0,
        'speed_tw_kn': 0.0,
        'me_rpm': 0.0,
        'me_shaft_power_kw': 0.0,
        'me_foc_mt': 0.0,
        'propeller_pitch_m': spec.propeller_pitch_m,
        'fuel_type': fuel_type,
        'fuel_lcv_mj_kg': physics.FUEL_LCV_MJ_KG[fuel_type],
        'ae_foc_mt': ae_foc,
        'boiler_foc_mt': boiler_foc,
        'total_foc_mt': total_foc,
        'draft_fore_m': draft_fore,
        'draft_aft_m': draft_aft,
        'mean_draft_m': mean_draft,
        'trim_m': round(draft_aft - draft_fore, 3),
        'displacement_mt': op['displacement_mt'],
        'cargo_weight_mt': op['cargo_weight_mt'],
        'condition_flag': op['condition_flag'],
        'wind_speed_kn': wind_speed,
        'wind_dir_deg': env['wind_dir_deg'],
        'beaufort': beaufort,
        'wave_height_m': wave_height,
        'wave_dir_deg': env['wave_dir_deg'],
        'wave_period_s': env['wave_period_s'],
        'swell_height_m': env['swell_height_m'],
        'swell_dir_deg': env['swell_dir_deg'],
        'sea_water_temp_c': env['sea_water_temp_c'],
        'air_temp_c': env['air_temp_c'],
        'air_pressure_hpa': env['air_pressure_hpa'],
        'current_speed_kn': env['current_speed_kn'],
        'current_dir_deg': env['current_dir_deg'],
        'sea_water_density_kg_m3': env['sea_water_density_kg_m3'],
        'data_source': 'sensor',
    }
    truth = _truth_record(
        spec,
        date,
        op['voyage_phase'],
        fstate,
        op['displacement_mt'],
        mean_draft,
        0.0,
        0.0,
        0.0,
        0.0,
        0.0,
        0.0,
        op['heading_deg'],
        0.0,
        0.0,
        co2,
        anom,
        estate,
    )
    return noon, truth


def _truth_record(
    spec,
    date,
    phase,
    fstate,
    displacement,
    mean_draft,
    r_aa_kn,
    r_aw_kn,
    p_corrected,
    p_shaft_true,
    stw_true,
    sog_true,
    heading,
    current_proj,
    sfoc,
    co2,
    anom,
    estate,
) -> dict:
    return {
        'imo_number': spec.imo_number,
        'report_date': date.isoformat(),
        'voyage_phase': phase,
        'true_speed_loss_frac': fstate['true_speed_loss_frac'],
        'days_since_cleaning': fstate['days_since_cleaning'],
        'fouling_segment_id': fstate['fouling_segment_id'],
        'displacement_mt': displacement,
        'mean_draft_m': mean_draft,
        'r_aa_kn': r_aa_kn,
        'r_aw_kn': r_aw_kn,
        'p_corrected_kw': p_corrected,
        'true_shaft_power_kw': p_shaft_true,
        'true_stw_kn': stw_true,
        'true_sog_kn': sog_true,
        'heading_deg': heading,
        'current_proj_kn': current_proj,
        'sfoc_g_kwh': sfoc,
        'days_since_overhaul': estate['days_since_overhaul'],
        'sfoc_drift_frac': estate['sfoc_drift_frac'],
        'co2_mt': co2,
        'anomaly_flag': anom['anomaly_flag'],
        'anomaly_cause': anom['anomaly_cause'],
        'anomaly_severity': anom['anomaly_severity'],
    }


def _forward_vessel(spec: VesselSpec, dates: list[dt.date], master_seed: int, result: GenerationResult) -> None:
    curve = build_curve(spec)
    rng_fouling = _substream(master_seed, spec.imo_number, 'fouling')
    rng_uwi = _substream(master_seed, spec.imo_number, 'uwi')
    rng_env = _substream(master_seed, spec.imo_number, 'environment')
    rng_op = _substream(master_seed, spec.imo_number, 'operating')
    rng_route = _substream(master_seed, spec.imo_number, 'route')
    rng_noise = _substream(master_seed, spec.imo_number, 'noise')
    rng_anom = _substream(master_seed, spec.imo_number, 'anomaly')
    rng_prop = _substream(master_seed, spec.imo_number, 'prop_rough')
    rng_coat = _substream(master_seed, spec.imo_number, 'coating')
    rng_engine = _substream(master_seed, spec.imo_number, 'engine')

    start, end = dates[0], dates[-1]
    events, segments = build_schedule(rng_fouling, spec, start, end)
    fstates = fouling_state(segments, dates, rng_fouling)
    envs = generate_environment(rng_env, dates)
    profile = build_operating_profile(rng_op, rng_route, spec, dates)
    anomalies = build_anomaly_plan(rng_anom, spec, dates)

    # Independent propeller/coating/engine degradation (dedicated substreams).
    prop_rate, coat_rate, sfoc_drift_rate = degradation_rates(rng_prop, rng_coat, rng_engine, spec)
    events.extend(build_engine_overhauls(rng_engine, spec, start, end))
    engine_resets = event_dates(events, ('engine_overhaul', 'dry_dock'))
    estates = engine_state(engine_resets, dates, start, sfoc_drift_rate)
    uwi_rows = build_uwi(rng_uwi, spec, segments, events, prop_rate, coat_rate, start, end)

    sfoc_base = float(rng_op.uniform(168.0, 182.0))
    base_slip = float(rng_op.uniform(0.06, 0.11))

    n = len(dates)
    noise_arrays = {
        'stw': sensor_multipliers(rng_noise, n),
        'power': sensor_multipliers(rng_noise, n),
        'me_foc': sensor_multipliers(rng_noise, n),
        'ae_foc': sensor_multipliers(rng_noise, n),
        'boiler_foc': sensor_multipliers(rng_noise, n),
        'rpm': sensor_multipliers(rng_noise, n),
        'dist_tw': sensor_multipliers(rng_noise, n, rel_std=0.004, bound=0.008),
        'dist_og': sensor_multipliers(rng_noise, n, rel_std=0.004, bound=0.008),
    }

    for i, date in enumerate(dates):
        noise = {k: float(v[i]) for k, v in noise_arrays.items()}
        noon, truth = _forward_day(
            spec, curve, date, profile[i], fstates[i], envs[i], anomalies[i], sfoc_base, base_slip, noise, estates[i]
        )
        result.noon_report.append(noon)
        result.ground_truth_daily.append(truth)

    result.vessel_master.append(build_vessel_master(spec))
    result.reference_curve.extend(build_reference_curve(spec))
    result.uwi.extend(uwi_rows)
    result.maintenance_event.extend(events)
    result.fouling_segments.extend(_segment_rows(spec, segments))


def _segment_rows(spec: VesselSpec, segments: list[Segment]) -> list[dict]:
    return [
        {
            'imo_number': spec.imo_number,
            'fouling_segment_id': seg.segment_id,
            'reset_date': seg.reset_date.isoformat(),
            'fouling_rate_per_day': seg.rate,
            'reset_type': seg.reset_type,
        }
        for seg in segments
    ]


def generate(start: dt.date, end: dt.date, seed: int) -> GenerationResult:
    """Generate all raw datasets + ground truth for the fleet over [start, end]."""
    if end < start:
        raise ValueError(f'end ({end}) precedes start ({start})')
    dates = _date_range(start, end)
    result = GenerationResult()
    for spec in FLEET:
        _forward_vessel(spec, dates, seed, result)
    rng_fuel = _substream(seed, '0000000', 'fuel_price')
    result.fuel_price = build_fuel_price(rng_fuel, dates)
    return result
