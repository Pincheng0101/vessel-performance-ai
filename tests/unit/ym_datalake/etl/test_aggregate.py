"""``curated.aggregate`` — which of the two CII ratings the fleet rollup counts.

Every daily row carries both grades. Only ``cii_rating_imo`` is scored against the year's reduced
``required`` line, so it is the regulatory one; ``cii_rating_aer`` is scored against the un-reduced
2019 base line and pins this fleet into A/B. ``cii_count_a..e`` must be the former, or the D/E tile
and the rating charts disagree about the same fleet on the same day.
"""

from __future__ import annotations

from ym_datalake.etl.curated import aggregate

DAY = 100


def _daily(ship_id: str, hull_class: str, imo: str | None, aer: str | None) -> dict:
    return {
        'ship_id': ship_id,
        'hull_class': hull_class,
        'noon_utc': DAY,
        'valid_flag': True,
        'speed_loss_pct': 5.0,
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
