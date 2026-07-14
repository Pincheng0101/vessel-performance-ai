"""The lake's contracts, checked against the JSONL that actually gets written.

Preservation is re-checked here **on disk** (``test_preservation`` checks the loader; this
checks what lands in ``raw/``), because a loader that is right and a writer that drops a
column still ships a broken lake.

Then the three things that decide whether the numbers mean anything:

* **the fouling physics** — speed loss must RISE through a cleaning cycle and DROP at the
  real cleaning events. If it does not, the reference curve is wrong and every ISO number
  downstream is noise wearing a percentage sign.
* **the energy balance** — ``fact_voyage.total_foc_mt`` must equal the real daily fuel to
  the last decimal. It is a sum of measured values; any drift is a bug.
* **provenance** — no estimated column may masquerade as measured.
"""

from __future__ import annotations

import csv
import json
import statistics
from collections import defaultdict
from pathlib import Path

import pytest

from table.schema import ALL_TABLES, CURATED_TABLES, RAW_TABLES
from ym_datalake.etl.__main__ import _write
from ym_datalake.etl.curated.compute import build_all

DATASET = Path(__file__).resolve().parents[3] / 'dataset'
HULL_RESET_EVENTS = {'UWC', 'DD'}


@pytest.fixture(scope='module')
def lake(tmp_path_factory) -> tuple[dict, dict, Path]:
    """Build all 20 tables and write them, once, exactly as the CLI does."""
    tables, diagnostics = build_all(DATASET)
    out = tmp_path_factory.mktemp('lake')
    _write(tables, str(out))
    return tables, diagnostics, out


def _read_jsonl(path: Path) -> list[dict]:
    with path.open(encoding='utf-8') as fh:
        return [json.loads(line) for line in fh if line.strip()]


# --- the catalog ------------------------------------------------------------------------


def test_exactly_twenty_tables() -> None:
    assert len(RAW_TABLES) == 6
    assert len(CURATED_TABLES) == 14
    assert len(ALL_TABLES) == 20, 'the catalog is 20 tables — no duplicates, no strays'


def test_every_table_is_written_flat_and_unpartitioned(lake) -> None:
    _, _, out = lake
    for zone, catalog in (('raw', RAW_TABLES), ('curated', CURATED_TABLES)):
        for name in catalog:
            files = list((out / zone / name).rglob('*.jsonl'))
            assert files == [out / zone / name / f'{name}.jsonl'], (
                f'{name}: expected exactly one flat file — no table in this lake is partitioned'
            )


def test_written_rows_carry_exactly_their_schema_columns(lake) -> None:
    _, _, out = lake
    for zone, catalog in (('raw', RAW_TABLES), ('curated', CURATED_TABLES)):
        for name, columns in catalog.items():
            rows = _read_jsonl(out / zone / name / f'{name}.jsonl')
            assert rows, f'{name} is empty'
            expected = {column for column, _ in columns}
            for row in rows[:50]:
                assert set(row) == expected, f'{name}: written columns do not match the schema'


# --- preservation, on disk ---------------------------------------------------------------


def test_written_noon_report_preserves_every_source_row_and_cell(lake) -> None:
    _, _, out = lake
    written = _read_jsonl(out / 'raw' / 'noon_report' / 'noon_report.jsonl')
    with (DATASET / 'vt_fd.csv').open(encoding='utf-8-sig', newline='') as fh:
        source_rows = list(csv.DictReader(fh))

    assert len(written) == len(source_rows) == 21_282

    for source_row, landed in zip(source_rows, written, strict=True):
        for header, raw in source_row.items():
            column = 'ship_id' if header == 'De-identification Name' else header.lower()
            if raw in ('HIDDEN', 'PREDICT', ''):
                assert landed[column] is None
            elif column in ('ship_id', 'voyage'):
                assert landed[column] == raw
            else:
                # The JSONL writer rounds floats to 4 dp for stability; nothing else moves.
                assert landed[column] == pytest.approx(float(raw), abs=1e-4)


def test_written_vessel_master_and_maintenance_survive(lake) -> None:
    _, _, out = lake
    vessels = _read_jsonl(out / 'raw' / 'vessel_master' / 'vessel_master.jsonl')
    events = _read_jsonl(out / 'raw' / 'maintenance_event' / 'maintenance_event.jsonl')

    assert len(vessels) == 15
    assert len(events) == 115

    groups = defaultdict(list)
    for event in events:
        groups[(event['ship_id'], event['event_day'])].append(event)
    assert len(groups) == 77, 'the written atoms must still regroup to the 77 source events'


# --- the load-bearing physics -------------------------------------------------------------


def _cycles(daily: list[dict], events: list[dict]) -> dict[tuple[str, int], list[tuple[int, float]]]:
    """Valid (day-into-cycle, speed_loss) points, grouped by (ship, cleaning cycle)."""
    resets = defaultdict(list)
    for event in events:
        if event['event_type'] in HULL_RESET_EVENTS:
            resets[event['ship_id']].append(event['event_day'])

    first: dict[str, int] = {}
    for row in daily:
        ship = row['ship_id']
        if ship not in first or row['noon_utc'] < first[ship]:
            first[ship] = row['noon_utc']

    out = defaultdict(list)
    for row in daily:
        if not row['valid_flag'] or row['speed_loss_pct'] is None:
            continue
        prior = [d for d in resets[row['ship_id']] if d <= row['noon_utc']]
        start = max(prior) if prior else first[row['ship_id']]
        out[(row['ship_id'], start)].append((row['noon_utc'] - start, row['speed_loss_pct']))
    return out


def test_speed_loss_rises_through_a_cleaning_cycle(lake) -> None:
    """Hull fouling makes a ship slower over time. If this fails, the curve fit is wrong."""
    tables, _, _ = lake
    slopes = []
    for points in _cycles(tables['fact_performance_daily'], tables['maintenance_event']).values():
        if len(points) < 20:
            continue
        xs = [float(x) for x, _ in points]
        ys = [y for _, y in points]
        mean_x, mean_y = sum(xs) / len(xs), sum(ys) / len(ys)
        var_x = sum((x - mean_x) ** 2 for x in xs)
        if var_x:
            slopes.append(sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys)) / var_x)

    rising = sum(1 for s in slopes if s > 0)
    assert rising / len(slopes) >= 0.70, f'only {rising}/{len(slopes)} cleaning cycles show a rising speed loss'
    # A container hull fouls at roughly 1-5 pp of speed loss per year.
    assert 0.5 <= statistics.median(slopes) * 365.0 <= 6.0


def test_speed_loss_drops_at_the_real_cleaning_events(lake) -> None:
    """A hull cleaning must make the ship faster. This is the closed loop on the whole chain."""
    tables, _, _ = lake
    daily = tables['fact_performance_daily']

    by_ship: dict[str, dict[int, float]] = defaultdict(dict)
    for row in daily:
        if row['valid_flag'] and row['speed_loss_pct'] is not None:
            by_ship[row['ship_id']][row['noon_utc']] = row['speed_loss_pct']

    def window(ship: str, lo: int, hi: int) -> float | None:
        values = [by_ship[ship][d] for d in range(lo, hi) if d in by_ship[ship]]
        return sum(values) / len(values) if len(values) >= 3 else None

    recoveries = []
    for event in tables['maintenance_event']:
        if event['event_type'] not in HULL_RESET_EVENTS:
            continue
        day = event['event_day']
        before = window(event['ship_id'], day - 45, day)
        after = window(event['ship_id'], day + 1, day + 46)
        if before is not None and after is not None:
            recoveries.append(before - after)

    assert len(recoveries) >= 8, 'too few measurable cleaning events to validate against'
    improved = sum(1 for r in recoveries if r > 0)
    assert improved / len(recoveries) >= 0.75, (
        f'only {improved}/{len(recoveries)} real hull cleanings are followed by a speed-loss drop'
    )
    assert statistics.median(recoveries) > 0.0


def test_clean_hull_speed_loss_is_near_zero(lake) -> None:
    """Right after a cleaning the hull IS the reference hull, so the residual must sit at ~0."""
    tables, _, _ = lake
    fresh = [
        r['speed_loss_pct']
        for r in tables['fact_performance_daily']
        if r['valid_flag'] and r['speed_loss_pct'] is not None and r['days_since_cleaning'] <= 30
    ]
    assert abs(statistics.mean(fresh)) < 2.0, 'a freshly cleaned hull must not show a systematic speed loss'


def test_reference_curve_is_fitted_per_ship_on_a_pooled_exponent(lake) -> None:
    tables, _, _ = lake
    curve = tables['reference_curve']
    assert len(curve) == 15 * 12, '15 ships x 12 speed points'

    by_ship = defaultdict(list)
    for row in curve:
        by_ship[row['ship_id']].append(row)
    assert len(by_ship) == 15

    # The exponent is shared within a pool; the scale is not.
    exponents = defaultdict(set)
    scales = set()
    for row in curve:
        exponents[row['fit_pool']].add(round(row['curve_n'], 6))
        scales.add(round(row['curve_a'], 6))
    for pool, values in exponents.items():
        assert len(values) == 1, f'pool {pool} must share one exponent'
    assert len(scales) > 1, 'the scale must be fitted per ship, not pooled'


# --- the energy balance --------------------------------------------------------------------


def test_voyage_fuel_equals_the_real_daily_fuel_exactly(lake) -> None:
    """fact_voyage sums measured values. Not "close to" — equal."""
    tables, _, _ = lake
    daily_foc = sum(r['total_foc_mt'] or 0.0 for r in tables['fact_performance_daily'])
    voyage_foc = sum(v['total_foc_mt'] for v in tables['fact_voyage'])
    assert voyage_foc == pytest.approx(daily_foc, rel=1e-12)

    daily_distance = sum(r['total_distance'] or 0.0 for r in tables['fact_performance_daily'])
    voyage_distance = sum(v['distance_nm'] for v in tables['fact_voyage'])
    assert voyage_distance == pytest.approx(daily_distance, rel=1e-12)


def test_curated_grain_is_one_row_per_ship_per_day(lake) -> None:
    tables, diagnostics, _ = lake
    daily = tables['fact_performance_daily']
    keys = {(r['ship_id'], r['noon_utc']) for r in daily}
    assert len(keys) == len(daily) == 20_938
    assert diagnostics['duplicate_rows_collapsed'] == 344


# --- the dataset's own hard facts ------------------------------------------------------------


def test_five_ships_never_dry_dock_so_they_get_no_ddp_rows(lake) -> None:
    """S9-S12 and S23 have no DD event. The lake must say nothing about it, not invent it."""
    tables, _, _ = lake
    dry_docked = {e['ship_id'] for e in tables['maintenance_event'] if e['event_type'] == 'DD'}
    never = {'S9', 'S10', 'S11', 'S12', 'S23'}
    assert not (dry_docked & never)

    ddp_ships = {i['ship_id'] for i in tables['fact_performance_indicator'] if i['indicator'] == 'DDP'}
    assert not (ddp_ships & never)

    for vessel in tables['dim_vessel']:
        if vessel['ship_id'] in never:
            assert vessel['last_dry_dock_day'] is None


def test_masked_rows_never_enter_a_baseline(lake) -> None:
    """S21-S23's HIDDEN/PREDICT windows are the thing to predict. They must not leak into a fit."""
    tables, _, _ = lake
    for row in tables['fact_performance_daily']:
        if row['masked_flag']:
            assert not row['valid_flag'], 'a masked row must never be an ISO-valid fitting point'


def test_uwi_covers_the_inspection_events_only(lake) -> None:
    """43 UWI atoms + 10 DD rows. PP and UWC are interventions, not inspections."""
    tables, _, _ = lake
    assert len(tables['uwi']) == 53
    assert {u['inspection_type'] for u in tables['uwi']} == {'UWI', 'DD'}


def test_fuel_price_covers_every_day_of_the_shared_axis(lake) -> None:
    tables, _, _ = lake
    prices = tables['fuel_price']
    days = {p['day'] for p in prices}
    assert days == set(range(0, 1826)), 'a price series with holes makes joins lie'
    assert {p['fuel_type'] for p in prices} == {'HSHFO', 'ULSFO', 'VLSFO', 'LSMGO', 'BIO_HSFO'}


# --- provenance ---------------------------------------------------------------------------


def test_synthesized_columns_are_flagged_estimated_in_the_schema() -> None:
    """Every USD / geography / calendar column must be tagged `estimated` where it is defined.

    The guard is the schema file itself: if someone adds a synthesized column and forgets to
    say so, this fails and the lake stops presenting an assumption as a measurement.
    """
    schema_text = (Path(__file__).resolve().parents[3] / 'table' / 'schema.py').read_text(encoding='utf-8')

    must_be_estimated = (
        'latitude',
        'longitude',
        'heading_deg',
        'port_from',
        'port_to',
        'report_date',
        'excess_cost_usd',
        'price_usd_per_mt',
        'propeller_roughness_um',
        'coating_breakdown_pct',
        'hull_fouling_rating',
        'charter_usd_per_day',
    )
    for column in must_be_estimated:
        declarations = [line for line in schema_text.splitlines() if line.strip().startswith(f"('{column}',")]
        assert declarations, f'{column} is not declared in table/schema.py'
        for line in declarations:
            assert 'estimated' in line.lower(), f'{column} is synthesized and must be tagged `estimated`'
