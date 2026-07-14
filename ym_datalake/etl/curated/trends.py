"""Trend fitting — the shared regression helpers the recommendation layer forecasts on.

Ordinary least squares is the wrong tool here: one sensor spike drags the slope, and this
data has plenty. Every forecast in the lake therefore uses a **Theil-Sen** slope (the
median of all pairwise slopes), which shrugs off up to ~29 % contaminated points.
"""

from __future__ import annotations

from statistics import median


def theil_sen(points: list[tuple[float, float]]) -> tuple[float, float] | None:
    """(slope, intercept) — the median of all pairwise slopes. None below 2 points.

    O(n^2) in the number of points, which is fine: the longest series here is one ship's
    ~1,800 days, and it runs once.
    """
    if len(points) < 2:
        return None
    slopes = [(y2 - y1) / (x2 - x1) for i, (x1, y1) in enumerate(points) for x2, y2 in points[i + 1 :] if x2 != x1]
    if not slopes:
        return None
    slope = median(slopes)
    intercept = median(y - slope * x for x, y in points)
    return slope, intercept


def crossing_day(points: list[tuple[float, float]], threshold: float) -> int | None:
    """The day a Theil-Sen trend reaches ``threshold``. None if it is flat or falling."""
    fit = theil_sen(points)
    if fit is None:
        return None
    slope, intercept = fit
    if slope <= 0.0:
        return None
    day = (threshold - intercept) / slope
    return int(round(day))


def trailing_mean(series: list[tuple[int, float]], last_day: int, window_days: int) -> float | None:
    """Mean of the last ``window_days`` of a (day, value) series."""
    window = [v for d, v in series if d > last_day - window_days]
    return sum(window) / len(window) if window else None
