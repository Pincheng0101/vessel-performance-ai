"""``curated.aggregate`` — the two things the fleet rollup must not get wrong.

**Which CII rating it counts.** Every daily row carries both grades. Only ``cii_rating_imo`` is
scored against the year's reduced ``required`` line, so it is the regulatory one; ``cii_rating_aer``
is scored against the un-reduced 2019 base line and pins this fleet into A/B. ``cii_count_a..e``
must be the former, or the D/E tile and the rating charts disagree about the same fleet on the
same day.

**How few ships may still call themselves a fleet.** ``avg_speed_loss_pct`` is a mean, and a mean is
unbiased at any n — but its *variance* is not. A day with one ISO-valid ship is that ship's day
wearing the fleet's name, and those days are what drove the trend to -11.4%. Below
``MIN_SPEED_LOSS_SHIPS`` the day gets no fleet speed loss at all. The floor is a **gate, not a
clamp**: a multi-ship day whose mean is genuinely negative must still come out negative, because
the reference curve is fitted on a median intercept and roughly half of every ship's clean days sit
above it.
"""

from __future__ import annotations

from ym_datalake.etl.curated import aggregate

DAY = 100


def _daily(
    ship_id: str,
    hull_class: str,
    imo: str | None,
    aer: str | None,
    speed_loss_pct: float | None = 5.0,
    valid_flag: bool = True,
) -> dict:
    return {
        'ship_id': ship_id,
        'hull_class': hull_class,
        'noon_utc': DAY,
        'valid_flag': valid_flag,
        'speed_loss_pct': speed_loss_pct,
        'excess_cost_usd': 100.0,
        'cii_rating_imo': imo,
        'cii_rating_aer': aer,
    }


def _by_fleet(rows: list[dict]) -> dict[str, dict]:
    return {row['fleet_id']: row for row in rows}


class TestCiiCounts:
    def test_the_counts_are_the_imo_rating_not_the_aer_one(self):
        rows = aggregate.build([_daily('S1', 'W1', 'C', 'A'), _daily('S2', 'W1', 'B', 'A')], [])
        fleet = _by_fleet(rows)['FL-W1']
        assert (fleet['cii_count_b'], fleet['cii_count_c']) == (1, 1)
        assert fleet['cii_count_a'] == 0

    def test_a_row_with_no_imo_rating_is_counted_nowhere(self):
        """A ship-year that sailed nowhere gets no rating at all (see curated.cii)."""
        rows = aggregate.build([_daily('S1', 'W1', None, 'A')], [])
        counts = [v for k, v in rows[0].items() if k.startswith('cii_count_')]
        assert sum(counts) == 0

    def test_the_all_rollup_counts_every_fleet(self):
        rows = aggregate.build([_daily('S1', 'W1', 'C', 'A'), _daily('S9', 'W2', 'D', 'B')], [])
        rollup = _by_fleet(rows)[aggregate.ROLLUP_FLEET_ID]
        assert (rollup['cii_count_c'], rollup['cii_count_d']) == (1, 1)
        assert rollup['n_vessels'] == 2

    def test_each_sub_fleet_counts_only_its_own_hulls(self):
        rows = aggregate.build([_daily('S1', 'W1', 'C', 'A'), _daily('S9', 'W2', 'D', 'B')], [])
        fleets = _by_fleet(rows)
        assert (fleets['FL-W1']['cii_count_c'], fleets['FL-W1']['cii_count_d']) == (1, 0)
        assert (fleets['FL-W2']['cii_count_c'], fleets['FL-W2']['cii_count_d']) == (0, 1)


class TestSpeedLossFloor:
    def test_a_single_ship_day_is_not_a_fleet_average(self):
        fleet = _by_fleet(aggregate.build([_daily('S1', 'W1', 'C', 'A', speed_loss_pct=-12.5)], []))['FL-W1']
        assert fleet['avg_speed_loss_pct'] is None
        assert fleet['n_speed_loss_ships'] == 1

    def test_the_mean_is_emitted_once_the_floor_is_met(self):
        rows = [_daily('S1', 'W1', 'C', 'A', speed_loss_pct=4.0), _daily('S2', 'W1', 'C', 'A', speed_loss_pct=6.0)]
        fleet = _by_fleet(aggregate.build(rows, []))['FL-W1']
        assert fleet['avg_speed_loss_pct'] == 5.0
        assert fleet['n_speed_loss_ships'] == 2

    def test_a_genuinely_negative_multi_ship_mean_survives(self):
        """The floor gates the day, it does not clamp the value: ~half of every ship's clean days
        sit above a median-intercept curve, so a negative fleet mean is real and must be shown."""
        rows = [_daily('S1', 'W1', 'C', 'A', speed_loss_pct=-3.0), _daily('S2', 'W1', 'C', 'A', speed_loss_pct=-1.0)]
        fleet = _by_fleet(aggregate.build(rows, []))['FL-W1']
        assert fleet['avg_speed_loss_pct'] == -2.0

    def test_an_invalid_ship_is_not_a_contributor(self):
        """It fails the ISO 19030 gate, so it neither moves the mean nor counts toward the floor."""
        rows = [_daily('S1', 'W1', 'C', 'A', speed_loss_pct=5.0), _daily('S2', 'W1', 'C', 'A', valid_flag=False)]
        fleet = _by_fleet(aggregate.build(rows, []))['FL-W1']
        assert fleet['n_speed_loss_ships'] == 1
        assert fleet['avg_speed_loss_pct'] is None
        assert fleet['n_vessels'] == 2, 'n_vessels counts reporters, which is why it cannot audit the floor'

    def test_a_valid_ship_carrying_no_speed_loss_is_not_a_contributor(self):
        rows = [_daily('S1', 'W1', 'C', 'A', speed_loss_pct=5.0), _daily('S2', 'W1', 'C', 'A', speed_loss_pct=None)]
        fleet = _by_fleet(aggregate.build(rows, []))['FL-W1']
        assert fleet['n_speed_loss_ships'] == 1
        assert fleet['avg_speed_loss_pct'] is None

    def test_the_rollup_can_clear_the_floor_on_a_day_no_sub_fleet_does(self):
        """One valid ship in each hull class: neither fleet has a speed loss, but ALL does."""
        rows = [_daily('S1', 'W1', 'C', 'A', speed_loss_pct=4.0), _daily('S9', 'W2', 'C', 'A', speed_loss_pct=6.0)]
        fleets = _by_fleet(aggregate.build(rows, []))
        assert (fleets['FL-W1']['avg_speed_loss_pct'], fleets['FL-W2']['avg_speed_loss_pct']) == (None, None)
        assert fleets[aggregate.ROLLUP_FLEET_ID]['avg_speed_loss_pct'] == 5.0
