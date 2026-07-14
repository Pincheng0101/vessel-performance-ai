"""Trend fitting — the shared regression helpers the recommendation layer forecasts on.

Ordinary least squares is the wrong tool here: one sensor spike drags the slope, and this
data has plenty. Every forecast in the lake therefore uses a **Theil-Sen** slope (the
median of all pairwise slopes), which shrugs off up to ~29 % contaminated points.
"""

from __future__ import annotations

from statistics import median


def theil_sen(points: list[tuple[float, float]]) -> tuple[float, float] | None:
    """(slope, intercept) — the median of all pairwise slopes. None below 2 points.

    **O(n^2)**, so a caller that needs both the fit and the day it crosses a threshold must fit
    once and reuse it (``crossing_at``), never call ``crossing_day`` alongside ``theil_sen`` on
    the same series — that is two fits of the same points.
    """
    if len(points) < 2:
        return None
    slopes = [(y2 - y1) / (x2 - x1) for i, (x1, y1) in enumerate(points) for x2, y2 in points[i + 1 :] if x2 != x1]
    if not slopes:
        return None
    slope = median(slopes)
    intercept = median(y - slope * x for x, y in points)
    return slope, intercept


def anchored_slope(points: list[tuple[float, float]], origin_y: float) -> float | None:
    """The slope of a line through a **known** origin ``(0, origin_y)``: median of (y - origin_y) / x.

    ``theil_sen`` spends a degree of freedom estimating the intercept. Where the intercept is
    physics rather than a parameter — a freshly polished propeller *is* ~150 um, a freshly
    coated hull *is* ~2 % broken down — that is a data point wasted, and it needs two points
    where this needs one. Two ships here have exactly one inspection since their last polish,
    and a free fit simply returns ``None`` for them.

    It also keeps the outputs consistent by construction: with ``current = origin_y + g.t`` and
    ``eta`` solved off the same line, ``current >= threshold`` and ``eta <= today`` are the same
    statement — where two independent fits can (and did) disagree.

    Points at ``x <= 0`` carry no information about a slope through the origin and are dropped.
    """
    slopes = [(y - origin_y) / x for x, y in points if x > 0.0]
    return median(slopes) if slopes else None


def crossing_at(fit: tuple[float, float] | None, threshold: float) -> int | None:
    """The x at which an **already-fitted** trend reaches ``threshold``. None if flat or falling."""
    if fit is None:
        return None
    slope, intercept = fit
    if slope <= 0.0:
        return None
    return int(round((threshold - intercept) / slope))


def crossing_day(points: list[tuple[float, float]], threshold: float) -> int | None:
    """The day a Theil-Sen trend reaches ``threshold``. None if it is flat or falling."""
    return crossing_at(theil_sen(points), threshold)


def trailing_mean(series: list[tuple[int, float]], last_day: int, window_days: int) -> float | None:
    """Mean of the last ``window_days`` of a (day, value) series."""
    window = [v for d, v in series if d > last_day - window_days]
    return sum(window) / len(window) if window else None
