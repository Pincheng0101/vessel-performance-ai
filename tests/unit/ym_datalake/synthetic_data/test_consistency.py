"""Fast consistency checks: generate a small sample and assert C1–C12 pass."""

import datetime as dt

import pytest

from ym_datalake.synthetic_data import generate as generate_module
from ym_datalake.synthetic_data import ports
from ym_datalake.synthetic_data.fleet import FLEET, WELLNESS_IMO, get_vessel
from ym_datalake.synthetic_data.generate import _ROTATIONS, generate
from ym_datalake.synthetic_data.validate import validate_result


def _rotation_pairs(rotation: list[str]) -> set[tuple[str, str]]:
    r = len(rotation)
    return {(rotation[i], rotation[(i + 1) % r]) for i in range(r)}


@pytest.fixture
def sample(monkeypatch):
    """Two vessels over three years — small but enough for every rule."""
    monkeypatch.setattr(generate_module, 'FLEET', FLEET[:2])
    return generate(dt.date(2021, 7, 1), dt.date(2024, 6, 30), seed=7)


def test_all_consistency_rules_pass(sample):
    results = validate_result(sample)
    failures = [r for r in results if not r.passed]
    assert not failures, 'failed rules:\n' + '\n'.join(
        f'  {r.rule}: violations={r.violations} checked={r.checked} {r.detail}' for r in failures
    )


def test_every_rule_checked_some_data(sample):
    # Guard against a rule silently passing because it examined nothing.
    results = {r.rule.split()[0]: r for r in validate_result(sample)}
    for rule in ('C1', 'C2', 'C5', 'C6', 'C7', 'C8', 'C11', 'C12', 'C15', 'C16', 'C17'):
        result = next(r for k, r in results.items() if k == rule)
        assert result.checked > 0, f'{rule} examined no records'


def test_determinism_same_seed(monkeypatch):
    monkeypatch.setattr(generate_module, 'FLEET', FLEET[:1])
    a = generate(dt.date(2021, 7, 1), dt.date(2021, 12, 31), seed=99)
    b = generate(dt.date(2021, 7, 1), dt.date(2021, 12, 31), seed=99)
    assert a.noon_report == b.noon_report
    assert a.ground_truth_daily == b.ground_truth_daily


def test_wellness_storyline_crosses_trigger(monkeypatch):
    """YM WELLNESS must rise past the ~10% trigger then recover (storyline ready)."""
    wellness = get_vessel(WELLNESS_IMO)
    monkeypatch.setattr(generate_module, 'FLEET', [wellness])
    result = generate(dt.date(2021, 7, 1), dt.date(2026, 6, 30), seed=42)

    series = sorted(
        ((t['report_date'], t['true_speed_loss_frac']) for t in result.ground_truth_daily),
        key=lambda x: x[0],
    )
    losses = [s for _, s in series]
    assert max(losses) >= 0.10, f'peak speed loss {max(losses):.3f} never reached the 10% trigger'
    # A recovery: the peak is followed later by a substantially lower value.
    peak_idx = losses.index(max(losses))
    assert min(losses[peak_idx:]) <= 0.03, 'no post-peak cleaning recovery observed'


# --- Voyage profile (rotation routing, arrival positions, within-leg approach) ---


@pytest.fixture
def routed(monkeypatch):
    """One vessel per fleet (IA/TP/AE) over two years — exercises every rotation."""
    fleet = [get_vessel('9700001'), get_vessel('9700004'), get_vessel('9700006')]
    monkeypatch.setattr(generate_module, 'FLEET', fleet)
    return generate(dt.date(2021, 7, 1), dt.date(2023, 6, 30), seed=7)


def _noon_by_imo(result):
    out: dict[str, list[dict]] = {}
    for n in result.noon_report:
        out.setdefault(n['imo_number'], []).append(n)
    return out


def test_every_leg_follows_the_fleet_rotation(routed):
    for imo, rows in _noon_by_imo(routed).items():
        valid = _rotation_pairs(_ROTATIONS[get_vessel(imo).fleet_id])
        for n in rows:
            assert (n['port_from'], n['port_to']) in valid, f'{imo} {n["port_from"]}->{n["port_to"]}'


def test_intra_asia_fleet_never_calls_europe(routed):
    ia_rows = _noon_by_imo(routed)['9700001']  # FL-IA
    ports_seen = {n['port_from'] for n in ia_rows} | {n['port_to'] for n in ia_rows}
    assert not (ports_seen & {'NLRTM', 'DEHAM'})


def test_in_port_day_pinned_at_destination(routed):
    for n in routed.noon_report:
        if n['voyage_phase'] != 'in_port':
            continue
        dest = ports.PORTS[n['port_to']]
        assert n['latitude'] == dest['lat']
        assert n['longitude'] == dest['lon']


def test_within_direct_leg_position_approaches_destination(routed):
    # On direct great-circle legs (no Suez/Malacca waypoints) the at-sea position
    # gets monotonically nearer the destination port. All FL-IA legs are direct.
    rows = sorted(_noon_by_imo(routed)['9700001'], key=lambda r: r['report_datetime_utc'])
    by_voyage: dict[str, list[dict]] = {}
    for n in rows:
        if n['voyage_phase'] == 'at_sea':
            by_voyage.setdefault(n['voyage_no'], []).append(n)
    checked = 0
    for leg in by_voyage.values():
        to = leg[0]['port_to']
        if frozenset({leg[0]['port_from'], to}) in ports.ROUTE_WAYPOINTS:
            continue
        dest = ports.PORTS[to]
        dists = [ports.haversine(n['latitude'], n['longitude'], dest['lat'], dest['lon']) for n in leg]
        for prev, cur in zip(dists, dists[1:]):
            assert cur <= prev + 1e-6
        checked += 1
    assert checked > 0
