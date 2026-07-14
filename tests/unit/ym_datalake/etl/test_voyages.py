"""``curated.voyages`` — the schedule, which is measured rather than assumed.

``planned_days`` used to be the synthesized rotation polyline divided by 0.85 x design speed:
a schedule fact derived from decorative geography, at a pace this fleet is ~1.9x off. Every
one of the 300 real voyages missed it, so ``on_time_flag`` was False 97 % of the time and
carried no information. It is now the real distance at the class's own median realised pace.
"""

from __future__ import annotations

import pytest

from ym_datalake.etl.curated import voyages

HOURS_PER_DAY = 24.0
SEA_DAYS = 10


def _daily_rows(ship_id: str, voyage_no: str, speed_kn: float) -> list[dict]:
    """A 10-day voyage held at ``speed_kn``, in the columns fact_voyage rolls up."""
    return [
        {
            'ship_id': ship_id,
            'voyage': voyage_no,
            'noon_utc': day,
            'report_date': '2021-01-01',
            'total_distance': speed_kn * HOURS_PER_DAY,
            'total_foc_mt': 80.0,
            'co2_mt': 250.0,
            'hours_total': HOURS_PER_DAY,
            'fuel_type': 'VLSFO',
            'valid_flag': True,
            'speed_loss_pct': 3.0,
        }
        for day in range(SEA_DAYS)
    ]


@pytest.fixture
def fleet(vessel) -> dict:
    """Three W1 sisters, one voyage each — at 8, 10 and 12 kn. The class's median pace: 10 kn."""
    return {ship_id: vessel | {'ship_id': ship_id} for ship_id in ('S1', 'S2', 'S3')}


@pytest.fixture
def rows() -> list[dict]:
    return _daily_rows('S1', 'V1', 8.0) + _daily_rows('S2', 'V1', 10.0) + _daily_rows('S3', 'V1', 12.0)


class TestPlannedSpeed:
    def test_the_class_pace_is_the_median_realised_voyage_speed(self, fleet, rows):
        built = voyages.build(rows, fleet, {}, {})
        assert voyages.planned_speed_kn(built) == {'W1': pytest.approx(10.0)}

    def test_one_freak_rotation_does_not_set_the_pace(self, fleet, rows):
        """Median, not mean: a becalmed voyage must not re-plan the whole class around itself."""
        becalmed = voyages.build(rows + _daily_rows('S1', 'V2', 1.0), fleet, {}, {})
        assert voyages.planned_speed_kn(becalmed)['W1'] == pytest.approx(9.0)  # median(1, 8, 10, 12)


class TestOnTimeFlag:
    def test_it_splits_the_fleet_instead_of_failing_everyone(self, fleet, rows):
        built = {row['ship_id']: row for row in voyages.build(rows, fleet, {}, {})}

        # planned_days = real distance / (10 kn . 24 h); actual = the 10 days it really took.
        assert built['S3']['planned_days'] == 12 and built['S3']['on_time_flag'] is True  # 12 kn: ahead
        assert built['S2']['planned_days'] == 10 and built['S2']['on_time_flag'] is True  # 10 kn: on pace
        assert built['S1']['planned_days'] == 8 and built['S1']['on_time_flag'] is False  # 8 kn: behind

    def test_the_schedule_does_not_come_from_the_synthesized_geography(self, fleet, rows):
        """``voyage_geo`` is empty here — no ports, no rotation polyline — and the schedule is
        still there. That is the point: every input to it is measured."""
        built = voyages.build(rows, fleet, {}, {})
        assert all(row['from_port'] is None for row in built)
        assert all(row['planned_days'] is not None for row in built)
