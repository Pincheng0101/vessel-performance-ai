"""``curated.indicators`` — the maintenance trigger, and the sample counts under every row.

Two bugs pinned here, both invisible to a schema check:

* **MT could only ever fire once per ship.** The old ``_mt`` returned on the first crossing
  over the whole record, so a ship that crossed 8 % in year 1 carried that crossing forever
  and could never re-trigger for the fouling cycle it is *actually* sailing on — the one
  thing a maintenance trigger exists to do.
* **An indicator row carried no sample count.** A DDP fitted on 3 points and one fitted on
  90 rendered identically, while ISO 19030 is explicit that the shorter the evaluation
  period the larger the uncertainty (doc/iso-19030.md:102).
"""

from __future__ import annotations

import re
from pathlib import Path

from ym_datalake.etl.curated import indicators

TRIGGER = indicators.MT_TRIGGER_PCT
FLEET_CHART_CONSTANT = Path(__file__).parents[4] / 'web' / 'app' / 'constants' / 'FleetChartConstant.js'


def test_the_dashboards_iso_trigger_line_is_the_trigger_this_module_fires_on():
    """The UI draws an 8 % "ISO trigger" line. This is the 8 it has to be.

    The dashboard used to render only its own 10 % action line and call it "threshold",
    while the lake computed MT at 8 % and never showed it. Both lines are drawn now — and
    the ISO one is only honest if it is *this* constant. Guarded from the Python side
    because this is the source of truth, and because the JS side cannot import it.
    """
    source = FLEET_CHART_CONSTANT.read_text()
    match = re.search(r'^const SpeedLossIsoTrigger = ([\d.]+);$', source, re.MULTILINE)

    assert match, f'SpeedLossIsoTrigger not found in {FLEET_CHART_CONSTANT}'
    assert float(match.group(1)) == indicators.MT_TRIGGER_PCT


def _daily(ship_id: str, series: list[tuple[int, float]]) -> list[dict]:
    """Valid daily rows carrying a speed loss — the only rows ``build`` reads."""
    return [{'ship_id': ship_id, 'noon_utc': day, 'speed_loss_pct': loss, 'valid_flag': True} for day, loss in series]


def _event(ship_id: str, day: int, event_type: str) -> dict:
    return {'ship_id': ship_id, 'event_day': day, 'event_type': event_type}


def _rows(out: list[dict], indicator: str) -> list[dict]:
    return [r for r in out if r['indicator'] == indicator]


class TestMaintenanceTriggerPerCycle:
    def test_a_ship_that_fouls_twice_triggers_twice(self):
        """The regression. Two hull cycles, each climbing past 8 %, separated by a real UWC.

        The old code emitted ONE MT row (the year-1 crossing) and went quiet forever after.
        """
        # Cycle 1: days 0-99, fouled well past the trigger. UWC on day 100 resets the hull.
        # Cycle 2: days 100-199, clean at first, fouled past the trigger again by the end.
        clean_then_foul = [(d, 1.0) for d in range(100, 140)] + [(d, 12.0) for d in range(140, 200)]
        daily = _daily('S1', [(d, 12.0) for d in range(0, 100)] + clean_then_foul)
        events = [_event('S1', 100, 'UWC')]

        mt = _rows(indicators.build(daily, events), 'MT')

        assert len(mt) == 2
        assert mt[0]['event_day'] < 100 <= mt[1]['event_day']
        # Each row is scoped to the cycle it fired in, so a consumer can tell them apart.
        assert mt[0]['period_start_day'] == 0
        assert mt[1]['period_start_day'] == 100

    def test_a_cycle_that_never_crosses_emits_no_row(self):
        daily = _daily('S1', [(d, TRIGGER - 1.0) for d in range(0, 60)])
        assert _rows(indicators.build(daily, []), 'MT') == []

    def test_one_crossing_per_cycle_not_one_per_day_above_the_trigger(self):
        """The trigger answers "when did this hull cross", not "how many days has it been over"."""
        daily = _daily('S1', [(d, 12.0) for d in range(0, 60)])
        assert len(_rows(indicators.build(daily, []), 'MT')) == 1

    def test_the_trailing_window_does_not_reach_back_across_a_cleaning(self):
        """A window spanning the reset would average the old fouled hull into the new clean
        one and re-fire the trigger on day 1 of a freshly cleaned cycle."""
        # Heavily fouled right up to the UWC, then genuinely clean afterwards.
        daily = _daily('S1', [(d, 20.0) for d in range(0, 100)] + [(d, 0.5) for d in range(100, 160)])
        mt = _rows(indicators.build(daily, [_event('S1', 100, 'UWC')]), 'MT')

        # Exactly one crossing — in the fouled cycle. The clean cycle must not inherit it.
        assert len(mt) == 1
        assert mt[0]['period_start_day'] == 0


class TestSampleCounts:
    def test_isp_carries_its_window_and_its_reference_window(self):
        daily = _daily('S1', [(d, 5.0) for d in range(0, 40)] + [(d, 9.0) for d in range(100, 120)])
        isp = _rows(indicators.build(daily, [_event('S1', 100, 'UWC')]), 'ISP')

        assert len(isp) == 2
        assert isp[0]['n_points'] == 40
        # Every cycle is referenced to the FIRST cycle, so that is the reference count.
        assert isp[0]['n_reference_points'] == 40
        assert isp[1]['n_points'] == 20
        assert isp[1]['n_reference_points'] == 40

    def test_me_counts_the_after_window_against_the_before_window(self):
        # 10 valid days in the 30 before the event, 4 in the 30 after.
        before = [(d, 10.0) for d in range(90, 100)]
        after = [(d, 2.0) for d in range(101, 105)]
        me = _rows(indicators.build(_daily('S1', before + after), [_event('S1', 100, 'UWC')]), 'ME')

        assert len(me) == 1
        assert me[0]['n_reference_points'] == 10  # the before (reference) window
        assert me[0]['n_points'] == 4  # the after (evaluation) window

    def test_mt_counts_its_trailing_window_and_has_no_reference(self):
        mt = _rows(indicators.build(_daily('S1', [(d, 12.0) for d in range(0, 60)]), []), 'MT')

        assert mt[0]['n_points'] >= indicators.MIN_WINDOW_POINTS
        assert mt[0]['n_reference_points'] is None

    def test_a_window_too_thin_to_mean_anything_is_not_emitted(self):
        """MIN_WINDOW_POINTS is a floor, not a hint: 2 points is not a period indicator."""
        thin = [(d, 10.0) for d in range(97, 99)] + [(d, 2.0) for d in range(101, 130)]
        me = _rows(indicators.build(_daily('S1', thin), [_event('S1', 100, 'UWC')]), 'ME')

        assert indicators.MIN_WINDOW_POINTS == 3
        assert me == []  # the before-window holds 2 points, so there is no ME to report
