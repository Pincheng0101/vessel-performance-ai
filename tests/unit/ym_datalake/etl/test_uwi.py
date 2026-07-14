"""``raw.uwi`` — the inspection projection, and the clock its estimates grow on.

The module's whole claim is that ``propeller_roughness_um`` and ``coating_breakdown_pct`` are
**states that grow on a clock a service resets**, not draws from a band. Two things have to
hold for that claim to survive contact with this dataset, and both are tested here:

1. The clock is **strict**. 31 of the 43 UWI atoms come from the source's composite ``UWI+PP``
   rows, so they are co-located with their own polish. An inclusive clock would read 0 on every
   one of them and assert that every polished propeller was already clean when it was inspected.
2. The rate multipliers are **centred on 1.0**, so the calibration the module documents is the
   one the fleet actually realises.
"""

from __future__ import annotations

import pytest

from ym_datalake.etl.raw import uwi


def _event(ship_id: str, day: int, event_type: str, **overrides) -> dict:
    """One atomic maintenance event, as ``source.load_maintenance_event`` splits them out."""
    return {
        'ship_id': ship_id,
        'event_day': day,
        'event_type': event_type,
        'source_event_type': event_type,
        'propeller_condition': None,
        'hull_coating_condition': None,
        'hull_fouling_type': None,
        'cavitation_found': None,
    } | overrides


def _speed_loss(ship_id: str, days: range, value: float = 3.0) -> dict[tuple[str, int], float]:
    return {(ship_id, d): value for d in days}


class TestTheStrictPolishClock:
    """The regression that would silently re-break everything downstream."""

    def test_an_inspection_co_located_with_its_own_polish_reads_the_pre_polish_clock(self):
        """A ``UWI+PP`` on day 900 splits into a UWI atom and a PP atom on the SAME day. The
        inspection observed the state that *justified* the polish, so its clock must run from the
        PREVIOUS polish (900 - 600 = 300), not from the polish it is sitting on (0).

        Reading it inclusively would put 31 of the 43 real UWI atoms at clock 0 = 150 um, i.e.
        "every propeller we polished was already clean" — and the roughness signal would die.
        """
        events = [
            _event('S1', 600, 'PP'),
            _event('S1', 900, 'UWI'),  # the two atoms of one source `UWI+PP` row
            _event('S1', 900, 'PP'),
        ]
        rows = uwi.build(events, _speed_loss('S1', range(0, 1000)))

        inspection = next(r for r in rows if r['inspection_day'] == 900)
        assert inspection['days_since_polish'] == 300
        assert inspection['polish_cycle_censored'] is False

    def test_the_pre_polish_reading_is_therefore_well_above_a_freshly_polished_one(self):
        """The point of the strict clock: a propeller 300 days into its cycle reads dirty, and
        that is *why* it was polished on the day it was inspected."""
        events = [_event('S9', 600, 'PP'), _event('S9', 900, 'UWI'), _event('S9', 900, 'PP')]
        rows = uwi.build(events, _speed_loss('S9', range(0, 1000)))

        assert rows[0]['propeller_roughness_um'] > uwi.CLEAN_ROUGHNESS_UM + 50.0

    def test_an_inspection_with_no_prior_polish_is_censored_and_anchored_at_the_data_start(self):
        """No reset precedes it, so its clock is measured from the first day the ship reported —
        a LOWER BOUND on the true cycle age, and flagged as such so a consumer can exclude it."""
        events = [_event('S3', 400, 'UWI')]
        rows = uwi.build(events, _speed_loss('S3', range(100, 500)))

        assert rows[0]['polish_cycle_censored'] is True
        assert rows[0]['days_since_polish'] == 300  # 400 - the data start on day 100

    def test_a_dry_dock_resets_both_clocks_but_a_polish_resets_only_one(self):
        """DD is in both POLISH_RESETS and DRY_DOCK_RESETS; PP is in neither's dry-dock half."""
        events = [_event('S5', 200, 'DD'), _event('S5', 500, 'PP'), _event('S5', 800, 'UWI')]
        rows = uwi.build(events, _speed_loss('S5', range(0, 900)))

        inspection = rows[-1]
        assert inspection['days_since_polish'] == 300  # from the PP on day 500
        assert inspection['days_since_dry_dock'] == 600  # from the DD on day 200
        assert inspection['dry_dock_cycle_censored'] is False


class TestGrowth:
    def test_roughness_grows_with_the_clock_rather_than_being_drawn_in_a_band(self):
        """Two inspections of the same ship, same grade, same speed loss — the later one in its
        cycle must read higher. The band-draw this replaced had no such guarantee: it was a
        memoryless draw keyed on the grade, so a 500-day-old propeller could read cleaner than a
        50-day-old one, and 9 of 15 ships ended up with a NEGATIVE fitted roughness slope."""
        events = [_event('S2', 0, 'PP'), _event('S2', 100, 'UWI'), _event('S2', 500, 'UWI')]
        rows = uwi.build(events, _speed_loss('S2', range(0, 600)))

        early, late = rows[0], rows[1]
        assert early['days_since_polish'] == 100
        assert late['days_since_polish'] == 500
        assert late['propeller_roughness_um'] > early['propeller_roughness_um']

    def test_a_freshly_reset_signal_sits_at_its_clean_value(self):
        """value(0) = clean, exactly — the origin `curated.recommendation` anchors its fit on."""
        assert uwi._grow(uwi.CLEAN_ROUGHNESS_UM, 560.0, 600.0, rate=1.0, clock=0) == pytest.approx(
            uwi.CLEAN_ROUGHNESS_UM
        )

    def test_growth_saturates_rather_than_running_away(self):
        """13 inspections have no prior reset, and their anchored clocks run past 1,300 days. A
        LINEAR law would put those propellers at ~800 um — past the 560 um a fouled propeller can
        physically reach. Saturating growth stays under the asymptote however long the clock runs."""
        assert uwi._grow(uwi.CLEAN_ROUGHNESS_UM, 560.0, 600.0, rate=1.5, clock=5000) < 560.0

    def test_the_grade_sets_the_rate_so_a_damaged_propeller_roughens_faster(self):
        """`propeller_condition` is a DAMAGE grade, not a reading of time-since-polish (the real
        `Good` inspections span 114-474 days since polish — grade and clock are uncorrelated). So
        it scales the rate; it does not clamp the level into a band."""
        assert uwi._GRADE_RATE['Poor'] > uwi._GRADE_RATE['Fair'] > uwi._GRADE_RATE['Good']


class TestTheRateIsCentred:
    def test_a_day_with_no_speed_loss_measurement_gets_no_rate_adjustment(self):
        """The bug this pins: a one-sided `1 + gain*position` term cannot damp a rate, only
        inflate it — and since a missing measurement defaults to position 0.5, it would hand an
        UNMEASURED day a free 30 % boost, and drag the whole fleet ~22 % above the nominal law so
        that neither documented calibration held in the emitted data."""
        rng = _FixedRng(1.0)
        assert uwi._rate(rng, ship_spread=1.0, grade=None, speed_loss_pct=None) == pytest.approx(1.0)

    def test_a_slow_hull_fouls_faster_and_a_clean_one_slower_than_neutral(self):
        """The real ISO 19030 speed loss still conditions the estimate — in BOTH directions."""
        fouled = uwi._rate(_FixedRng(1.0), 1.0, None, speed_loss_pct=10.0)
        clean = uwi._rate(_FixedRng(1.0), 1.0, None, speed_loss_pct=0.0)

        assert fouled > 1.0 > clean
        assert (fouled + clean) / 2.0 == pytest.approx(1.0)  # centred, not lifted


class _FixedRng:
    """A stand-in for ``random.Random`` that returns the same draw every time, so a test can pin
    the deterministic part of a rate without the jitter moving under it."""

    def __init__(self, value: float) -> None:
        self._value = value

    def uniform(self, _lo: float, _hi: float) -> float:
        return self._value
