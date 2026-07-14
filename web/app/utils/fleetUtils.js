// Fleet-wide folds over the per-ship daily series.
//
// agg_fleet_daily carries one row per calendar day, but a ship only lands in that row on the
// days it filed a noon report — each ship reports on 73-82% of days, so a single agg row covers
// 11.5 of 15 ships on average (7 on 2026-06-30). Any *count* or *sum* read off one agg row is
// therefore a count of that day's reporters, not of the fleet. Folding each ship's own latest
// row instead keeps the fleet whole.

const CII_RATINGS = ['A', 'B', 'C', 'D', 'E'];

// The lake stores every date as an offset from one fleet-shared epoch — noon_utc, opened_day,
// due_day, event_day, trigger_eta_day are all day indices off the same day 0, so a single formula
// puts any of them on the calendar. Verified against every day/date pair in the demo fixtures
// (24,398 pairs, 0 mismatches): day 0 = 2021-07-01, day 1825 = 2026-06-30 (the last data day).
const EPOCH_MS = Date.UTC(2021, 6, 1);
const DAY_MS = 86400000;

class fleetUtils {
  // A mean over one or two points is that point wearing the window's name — the same floor the
  // ETL applies (MIN_WINDOW_POINTS in indicators.py, MIN_SPEED_LOSS_SHIPS in aggregate.py).
  static MIN_TRAILING_POINTS = 3;

  /**
   * Folds one row per ship into the fleet-wide figures the dashboards show.
   *
   * @param {object[]} rows - at most one fact_performance_daily row per ship
   * @returns {{ ciiCounts: Record<string, number>, excessCostUsd: number, shipCount: number }}
   */
  static fold(rows) {
    const ciiCounts = Object.fromEntries(CII_RATINGS.map(r => [r, 0]));
    let excessCostUsd = 0;
    rows.forEach((row) => {
      // cii_rating_imo is the regulatory grade — it is scored against the year's reduced required
      // line. cii_rating_aer scores against the un-reduced 2019 base line, which pins the fleet
      // into A/B and hides the year-on-year migration the regulation is designed to force.
      if (row.cii_rating_imo in ciiCounts) ciiCounts[row.cii_rating_imo] += 1;
      // excess_cost_usd is the speed-loss (fouling) penalty. The weather/operational columns
      // are burned *on top of* it, not a partition of it (ym_datalake/etl/curated/daily.py),
      // so they must not be summed in.
      excessCostUsd += row.excess_cost_usd ?? 0;
    });
    return { ciiCounts, excessCostUsd, shipCount: rows.length };
  }

  /**
   * Fleet state as of each ship's own most recent report.
   *
   * @param {Record<string, object[]>} dailyByShip - ship_id → day-ascending daily rows
   * @returns {{ ciiCounts: Record<string, number>, excessCostUsd: number, shipCount: number }}
   */
  static snapshot(dailyByShip) {
    return fleetUtils.fold(Object.values(dailyByShip).map(rows => rows.at(-1)).filter(Boolean));
  }

  /**
   * One fold per calendar month, from each ship's last report within that month. A ship that
   * leaves the fleet mid-series simply stops contributing (S9 ends 2025-07: 15 → 14).
   *
   * @param {Record<string, object[]>} dailyByShip - ship_id → day-ascending daily rows
   * @returns {{ month: string, ciiCounts: Record<string, number>, excessCostUsd: number, shipCount: number }[]}
   */
  static monthly(dailyByShip) {
    const rowsByMonth = new Map();
    Object.values(dailyByShip).forEach((rows) => {
      const lastOfMonth = new Map();
      rows.forEach(row => lastOfMonth.set(row.report_date.slice(0, 7), row));
      lastOfMonth.forEach((row, month) => {
        if (!rowsByMonth.has(month)) rowsByMonth.set(month, []);
        rowsByMonth.get(month).push(row);
      });
    });
    return [...rowsByMonth.keys()].sort().map(month => ({ month, ...fleetUtils.fold(rowsByMonth.get(month)) }));
  }

  /**
   * Per-ship savings potential, largest first. Only ships carrying an open recommendation
   * appear — the rest have no actionable saving to show.
   *
   * @param {object[]} recommendations - fact_recommendation rows (one per ship)
   * @returns {{ shipId: string, savingUsd: number }[]}
   */
  static savingsByShip(recommendations) {
    return (recommendations ?? [])
      .map(rec => ({ shipId: rec.ship_id, savingUsd: rec.net_saving_usd ?? 0 }))
      .filter(rec => rec.savingUsd > 0)
      .sort((a, b) => b.savingUsd - a.savingUsd);
  }

  /**
   * Trailing mean over the last `window` *valued* rows — not the last `window` calendar days.
   *
   * agg_fleet_daily has no fleet speed loss on a day too few ships passed the ISO gate, so a
   * calendar window would average those gaps as holes and thin the mean back out toward the
   * single-day noise this is meant to damp. Counting points instead keeps every window full.
   * The first rows average over fewer points, so the line starts and stays defined.
   *
   * @param {object[]} rows - day-ascending agg_fleet_daily rows
   * @param {string} key - the numeric column to smooth
   * @param {number} [window] - how many valued points the mean spans
   * @returns {{ noon_utc: number, value: number }[]}
   */
  static rollingMean(rows, key, window = 30) {
    const valued = (rows ?? []).filter(row => row[key] != null);
    let sum = 0;
    return valued.map((row, i) => {
      sum += row[key];
      if (i >= window) sum -= valued[i - window][key];
      return { noon_utc: row.noon_utc, value: sum / Math.min(i + 1, window) };
    });
  }

  /**
   * Mean of the last `window` *valued* rows — the scalar sibling of rollingMean, with the same
   * "last N valued rows, not N calendar days" semantics.
   *
   * A single day's speed loss is noise-dominated: the clean-hull reference curve is fitted on a
   * median intercept, so ~half of a clean hull's days land above it and read negative. Only the
   * window carries hull condition.
   *
   * @param {object[]} rows - day-ascending daily rows
   * @param {string} key - the numeric column to mean
   * @param {number} [window] - how many valued points the mean spans
   * @returns {number | null} null when too few valued rows exist to mean anything
   */
  static trailingMean(rows, key, window = 30) {
    const valued = (rows ?? []).filter(row => row[key] != null).slice(-window);
    if (valued.length < fleetUtils.MIN_TRAILING_POINTS) return null;
    return valued.reduce((sum, row) => sum + row[key], 0) / valued.length;
  }

  /**
   * Day index → epoch milliseconds. The only place a chart coordinate leaves day space.
   *
   * @param {number | null} day
   * @returns {number | null}
   */
  static dayToMs(day) {
    return day == null ? null : EPOCH_MS + day * DAY_MS;
  }

  /**
   * Epoch milliseconds → day index. The inverse, for reading a time axis back (tooltips).
   *
   * @param {number | null} ms
   * @returns {number | null}
   */
  static msToDay(ms) {
    return ms == null ? null : Math.round((ms - EPOCH_MS) / DAY_MS);
  }

  /**
   * Epoch milliseconds → 'YYYY-MM-DD'. A date is a property of the datum, so it is read in UTC —
   * local getters would render the previous day for any reader west of UTC.
   *
   * @param {number | null} ms
   * @returns {string | null}
   */
  static formatDate(ms) {
    return ms == null ? null : new Date(ms).toISOString().slice(0, 10);
  }

  /**
   * Day index → 'YYYY-MM-DD'.
   *
   * @param {number | null} day
   * @returns {string | null}
   */
  static dayDate(day) {
    return fleetUtils.formatDate(fleetUtils.dayToMs(day));
  }

  /**
   * The reader's *local* calendar day as a day index — the one clock read in this file, and the
   * one place a local getter belongs: "N days ago" is a statement about the reader, not the datum.
   * The local Y/M/D is reprojected onto the UTC grid the day index lives on.
   *
   * @param {Date} [now]
   * @returns {number}
   */
  static todayDay(now = new Date()) {
    return fleetUtils.msToDay(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  /**
   * Day index → how far it sits from today, in the reader's words.
   *
   * @param {number | null} day
   * @param {number} [today] - injectable so callers (and tests) never depend on the clock
   * @returns {string | null} '今天' | 'N 天前' | 'N 天後'
   */
  static relativeDay(day, today = fleetUtils.todayDay()) {
    if (day == null) return null;
    const diff = today - day;
    if (diff === 0) return '今天';
    return diff > 0 ? `${diff} 天前` : `${-diff} 天後`;
  }

  /**
   * Day index → the date plus where it sits relative to today, e.g. '2026-06-30（14 天前）'.
   *
   * @param {number | null} day
   * @param {number} [today]
   * @returns {string | null}
   */
  static dayLabel(day, today = fleetUtils.todayDay()) {
    return day == null ? null : `${fleetUtils.dayDate(day)}（${fleetUtils.relativeDay(day, today)}）`;
  }

  /**
   * A day-index span, e.g. '2021-07-01 – 2026-06-30（14 天前）'. ONE parenthetical, anchored on the
   * END day: the question a reader asks of a range is how stale it is, not how old it started.
   *
   * @param {number | null} from
   * @param {number | null} to
   * @param {number} [today]
   * @returns {string | null}
   */
  static dayRangeLabel(from, to, today = fleetUtils.todayDay()) {
    if (from == null || to == null) return null;
    return `${fleetUtils.dayDate(from)} – ${fleetUtils.dayDate(to)}（${fleetUtils.relativeDay(to, today)}）`;
  }
}

export default fleetUtils;
