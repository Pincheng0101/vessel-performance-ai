"""``curated.trends`` — the Theil-Sen fit every forecast in the lake rides on.

The module exists for exactly one reason: OLS is not robust, and this data has sensor
spikes. ``test_one_wild_outlier_does_not_move_the_slope`` is that reason written down —
it fits the same points with OLS alongside, and shows the ordinary fit swinging while the
median-of-slopes does not.
"""

from __future__ import annotations

import pytest

from ym_datalake.etl.curated import trends

CLEAN_LINE = [(float(x), 2.0 * x + 1.0) for x in range(10)]  # y = 2x + 1


def _ols_slope(points: list[tuple[float, float]]) -> float:
    """Ordinary least squares, for contrast only — the thing trends.py refuses to be."""
    n = len(points)
    mean_x = sum(x for x, _ in points) / n
    mean_y = sum(y for _, y in points) / n
    sxx = sum((x - mean_x) ** 2 for x, _ in points)
    sxy = sum((x - mean_x) * (y - mean_y) for x, y in points)
    return sxy / sxx


class TestTheilSen:
    @pytest.mark.parametrize('points', [[], [(1.0, 2.0)]])
    def test_none_below_two_points(self, points):
        assert trends.theil_sen(points) is None

    def test_none_when_every_x_is_the_same_day(self):
        """No pair spans any time, so there is no slope to take the median of."""
        assert trends.theil_sen([(3.0, 1.0), (3.0, 9.0), (3.0, 5.0)]) is None

    def test_exact_fit_on_a_clean_line(self):
        fit = trends.theil_sen(CLEAN_LINE)
        assert fit == pytest.approx((2.0, 1.0))

    def test_a_falling_line_gives_a_negative_slope(self):
        fit = trends.theil_sen([(0.0, 10.0), (1.0, 8.0), (2.0, 6.0)])
        assert fit is not None and fit[0] == pytest.approx(-2.0)

    def test_one_wild_outlier_does_not_move_the_slope(self):
        """A single sensor spike on a 10-point series. The median of pairwise slopes ignores
        it outright; OLS on the same points swings from 2.0 to over 7."""
        spiked = [*CLEAN_LINE, (5.0, 1000.0)]

        assert trends.theil_sen(spiked) == pytest.approx((2.0, 1.0))
        assert _ols_slope(spiked) > 7.0


class TestCrossingDay:
    def test_the_day_a_rising_trend_reaches_the_threshold(self):
        points = [(float(d), 1.0 + 0.05 * d) for d in range(20)]  # +0.05 pp/day off a base of 1
        assert trends.crossing_day(points, 5.0) == 80  # (5 - 1) / 0.05

    def test_a_flat_trend_never_crosses(self):
        assert trends.crossing_day([(0.0, 3.0), (1.0, 3.0), (2.0, 3.0)], 5.0) is None

    def test_a_falling_trend_never_crosses(self):
        assert trends.crossing_day([(0.0, 9.0), (1.0, 8.0), (2.0, 7.0)], 5.0) is None

    def test_no_fit_no_crossing(self):
        assert trends.crossing_day([(1.0, 2.0)], 5.0) is None

    def test_an_already_breached_threshold_gives_a_day_in_the_past(self):
        points = [(float(d), 10.0 + 0.5 * d) for d in range(5)]
        crossing = trends.crossing_day(points, 5.0)
        assert crossing is not None and crossing < 0


class TestTrailingMean:
    SERIES = [(1, 10.0), (4, 100.0), (5, 20.0), (9, 30.0)]

    def test_the_window_is_strictly_open_at_its_far_edge(self):
        """`d > last_day - window_days`: with last_day 9 and a 5-day window, day 4 is out and
        day 5 is in — so the 100.0 spike on day 4 must not appear in the mean."""
        assert trends.trailing_mean(self.SERIES, last_day=9, window_days=5) == pytest.approx(25.0)

    def test_a_wider_window_reaches_further_back(self):
        assert trends.trailing_mean(self.SERIES, last_day=9, window_days=9) == pytest.approx(40.0)

    def test_none_when_the_window_catches_nothing(self):
        assert trends.trailing_mean(self.SERIES, last_day=100, window_days=5) is None

    def test_none_on_an_empty_series(self):
        assert trends.trailing_mean([], last_day=9, window_days=5) is None
