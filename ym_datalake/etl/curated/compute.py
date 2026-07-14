"""The pipeline. Reads the three real source files, returns all 20 tables.

The DAG, and why it is ordered this way:

.. code-block:: text

    source           noon_report / vessel_master / maintenance_event   <- VERBATIM, 3 raw tables
      |
    clean            dedupe (344) + clip the impossible + backfill displacement
      |
    geography        drape a port rotation over each voyage   -> lat/lon/heading (decorative)
      |
    corrections      ISO 15016: pick the WIND_DIRECTION convention EMPIRICALLY, then correct
      |
    reference_curve  fit the clean-hull curve on clean-window valid points  <- 4th raw table
      |
    daily            ISO 19030 speed loss = the spine        -> fact_performance_daily
      |
    +-- uwi / fuel_price                                      <- the last 2 raw tables
    +-- cii, anomaly, alerts, indicators, voyages, recommendation, optimize, dims, aggregate

``reference_curve`` sits *downstream of* ``clean`` and ``corrections`` even though it is a
raw table. That is not a layering mistake — it is the physics. A curve fitted on
uncleaned, uncorrected power is a curve that has absorbed the outliers and the weather,
and every speed-loss number derived from it would be noise.
"""

from __future__ import annotations

from pathlib import Path

from ym_datalake.etl import fuel as fuel_module
from ym_datalake.etl import source
from ym_datalake.etl.curated import (
    aggregate,
    alerts,
    anomaly,
    cii,
    clean,
    corrections,
    daily,
    dims,
    geography,
    indicators,
    optimize,
    recommendation,
    voyages,
)
from ym_datalake.etl.raw import fuel_price, reference_curve, uwi

RAW_TABLE_NAMES = ('noon_report', 'vessel_master', 'maintenance_event', 'reference_curve', 'uwi', 'fuel_price')


def build_all(data_dir: str | Path, seed: int = 42) -> tuple[dict[str, list[dict]], dict]:
    """Build every table. Returns ``({table_name: rows}, diagnostics)``.

    The diagnostics are not decoration: they carry the empirically-chosen wind convention
    and the reference-curve fit quality — the two facts that decide whether the ISO numbers
    in this lake mean anything.
    """
    src = source.load_all(data_dir)
    noon_rows = src['noon_report']
    vessel_rows = src['vessel_master']
    events = src['maintenance_event']
    vessels = {v['ship_id']: v for v in vessel_rows}

    cleaned = clean.clean(noon_rows, vessels)
    track, voyage_geo = geography.build(cleaned, vessels, seed=seed)

    convention, scores = corrections.choose_convention(cleaned, vessels, vessel_rows, events, track)
    corrected = corrections.apply(cleaned, vessels, track, convention)

    curve_rows = reference_curve.build(corrected, events, vessel_rows)
    curves = reference_curve.curves_by_ship(curve_rows)

    fuel_price_rows = fuel_price.build(noon_rows, seed=seed)
    prices = fuel_module.price_lookup(fuel_price_rows)

    daily_rows = daily.build(corrected, vessels, events, curves, track, prices)
    cii.apply(daily_rows, vessels)

    anomalies = anomaly.build(daily_rows)
    anomaly.apply_to_daily(daily_rows, anomalies)

    # The real trailing speed loss that conditions every synthesized inspection signal.
    speed_loss_by_day = uwi.trailing_speed_loss(daily_rows)
    uwi_rows = uwi.build(events, speed_loss_by_day, seed=seed)

    indicator_rows = indicators.build(daily_rows, events)
    recommendations = recommendation.build_recommendation(daily_rows, events)

    tables = {
        # Raw (6)
        'noon_report': noon_rows,
        'vessel_master': vessel_rows,
        'maintenance_event': events,
        'reference_curve': curve_rows,
        'uwi': uwi_rows,
        'fuel_price': fuel_price_rows,
        # Curated (14)
        'fact_performance_daily': daily_rows,
        'fact_performance_indicator': indicator_rows,
        'fact_uwi': dims.build_fact_uwi(uwi_rows, speed_loss_by_day),
        'fact_maintenance_event': dims.build_fact_maintenance_event(events, indicator_rows, daily_rows, track),
        'dim_vessel': dims.build_dim_vessel(vessel_rows, events),
        'dim_reference_curve': curve_rows,
        'dim_port': dims.build_dim_port(),
        'agg_fleet_daily': aggregate.build(daily_rows, anomalies),
        'fact_voyage': voyages.build(daily_rows, vessels, voyage_geo, prices),
        'fact_anomaly': anomalies,
        'fact_alert': alerts.build(anomalies, daily_rows, recommendations, vessels),
        'fact_recommendation': recommendations,
        'fact_maintenance_recommendation': recommendation.build_maintenance_recommendation(
            daily_rows, uwi_rows, anomalies, recommendations
        ),
        'fact_speed_profile': optimize.build(daily_rows, vessels, curves, prices),
    }

    diagnostics = {
        'wind_convention': convention,
        'wind_convention_scores': scores,
        'curve_fits': [
            {
                'ref_curve_id': r['ref_curve_id'],
                'fit_pool': r['fit_pool'],
                'curve_a': r['curve_a'],
                'curve_n': r['curve_n'],
                'n_fit_points': r['n_fit_points'],
                'fit_rmse_pct': r['fit_rmse_pct'],
            }
            for r in curve_rows[:: reference_curve.CURVE_POINTS]
        ],
        'valid_rows': sum(1 for r in daily_rows if r['valid_flag']),
        'duplicate_rows_collapsed': len(noon_rows) - len(cleaned),
    }
    return tables, diagnostics
