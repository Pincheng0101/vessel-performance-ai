import { describe, expect, test } from 'vitest';
import fleetUtils from './fleetUtils';

const row = (shipId, reportDate, rating, excess) => ({
  ship_id: shipId,
  report_date: reportDate,
  cii_rating_imo: rating,
  cii_rating_aer: 'E',
  excess_cost_usd: excess,
  excess_cost_fouling_usd: excess,
  excess_cost_weather_usd: 4000,
  excess_cost_operational_usd: 1000,
});

// S2 skips the fleet's last day — the sparsity that made agg_fleet_daily's last row cover 7 of
// 15 ships. Every fold below has to stay whole across it.
const DAILY_BY_SHIP = {
  S1: [row('S1', '2026-05-30', 'B', 100), row('S1', '2026-06-29', 'A', 300), row('S1', '2026-06-30', 'A', 500)],
  S2: [row('S2', '2026-05-31', 'C', 200), row('S2', '2026-06-28', 'B', 700)],
};

describe('fleetUtils.fold', () => {
  test('counts CII ratings and sums excess cost', () => {
    const folded = fleetUtils.fold([row('S1', '2026-06-30', 'A', 500), row('S2', '2026-06-30', 'B', 700)]);
    expect(folded.ciiCounts).toEqual({
      A: 1, B: 1, C: 0, D: 0, E: 0,
    });
    expect(folded.excessCostUsd).toBe(1200);
    expect(folded.shipCount).toBe(2);
  });

  test('returns zeroed counts for no rows', () => {
    expect(fleetUtils.fold([])).toEqual({
      ciiCounts: {
        A: 0, B: 0, C: 0, D: 0, E: 0,
      },
      excessCostUsd: 0,
      shipCount: 0,
    });
  });

  test('excludes the weather and operational columns, which stack on top of excess_cost_usd', () => {
    expect(fleetUtils.fold([row('S1', '2026-06-30', 'A', 500)]).excessCostUsd).toBe(500);
  });

  test.each([
    [null, 0],
    [undefined, 0],
  ])('treats a %j excess cost as zero', (excess, expected) => {
    expect(fleetUtils.fold([row('S1', '2026-06-30', 'A', excess)]).excessCostUsd).toBe(expected);
  });

  test('ignores a rating outside A-E', () => {
    const folded = fleetUtils.fold([row('S1', '2026-06-30', 'Z', 500)]);
    expect(folded.ciiCounts).toEqual({
      A: 0, B: 0, C: 0, D: 0, E: 0,
    });
    expect(folded.shipCount).toBe(1);
  });
});

describe('fleetUtils.snapshot', () => {
  test('folds each ship’s own latest row, including ships that skipped the last day', () => {
    const snapshot = fleetUtils.snapshot(DAILY_BY_SHIP);
    expect(snapshot.ciiCounts).toEqual({
      A: 1, B: 1, C: 0, D: 0, E: 0,
    });
    expect(snapshot.excessCostUsd).toBe(1200);
  });

  test('counts every ship in the roster', () => {
    expect(fleetUtils.snapshot(DAILY_BY_SHIP).shipCount).toBe(Object.keys(DAILY_BY_SHIP).length);
  });

  test('skips a ship with no rows', () => {
    expect(fleetUtils.snapshot({ ...DAILY_BY_SHIP, S3: [] }).shipCount).toBe(2);
  });

  test('returns zeroed counts for an empty fleet', () => {
    expect(fleetUtils.snapshot({}).shipCount).toBe(0);
  });
});

describe('fleetUtils.monthly', () => {
  test('folds each ship’s last row of every month, ascending', () => {
    expect(fleetUtils.monthly(DAILY_BY_SHIP)).toEqual([
      {
        month: '2026-05',
        ciiCounts: {
          A: 0, B: 1, C: 1, D: 0, E: 0,
        },
        excessCostUsd: 300,
        shipCount: 2,
      },
      {
        month: '2026-06',
        ciiCounts: {
          A: 1, B: 1, C: 0, D: 0, E: 0,
        },
        excessCostUsd: 1200,
        shipCount: 2,
      },
    ]);
  });

  test('drops a ship from the months after it leaves the fleet', () => {
    const months = fleetUtils.monthly({ ...DAILY_BY_SHIP, S3: [row('S3', '2026-05-20', 'D', 50)] });
    expect(months.map(m => m.shipCount)).toEqual([3, 2]);
  });

  test('returns no months for an empty fleet', () => {
    expect(fleetUtils.monthly({})).toEqual([]);
  });
});

describe('fleetUtils.savingsByShip', () => {
  test('sorts ships by saving, largest first', () => {
    const recs = [
      { ship_id: 'S1', net_saving_usd: 1000 },
      { ship_id: 'S2', net_saving_usd: 3000 },
      { ship_id: 'S3', net_saving_usd: 2000 },
    ];
    expect(fleetUtils.savingsByShip(recs).map(r => r.shipId)).toEqual(['S2', 'S3', 'S1']);
  });

  test.each([
    [0],
    [null],
    [undefined],
  ])('drops a ship whose saving is %j', (savingUsd) => {
    expect(fleetUtils.savingsByShip([{ ship_id: 'S1', net_saving_usd: savingUsd }])).toEqual([]);
  });

  test.each([
    [[]],
    [null],
    [undefined],
  ])('returns an empty list for %j recommendations', (recs) => {
    expect(fleetUtils.savingsByShip(recs)).toEqual([]);
  });
});

describe('fleetUtils.rollingMean', () => {
  const aggRow = (noonUtc, value) => ({ noon_utc: noonUtc, avg_speed_loss_pct: value });

  test('averages each point over the trailing window', () => {
    const rows = [aggRow(0, 2), aggRow(1, 4), aggRow(2, 6)];
    expect(fleetUtils.rollingMean(rows, 'avg_speed_loss_pct', 2)).toEqual([
      { noon_utc: 0, value: 2 },
      { noon_utc: 1, value: 3 },
      { noon_utc: 2, value: 5 },
    ]);
  });

  test('spans the last 30 valued points by default, dropping the oldest', () => {
    const rows = Array.from({ length: 31 }, (_, i) => aggRow(i, i));
    const means = fleetUtils.rollingMean(rows, 'avg_speed_loss_pct');
    expect(means.at(-2).value).toBe(14.5);
    expect(means.at(-1).value).toBe(15.5);
  });

  test('skips the null days the ship floor leaves behind rather than averaging them as holes', () => {
    const rows = [aggRow(0, 2), aggRow(1, null), aggRow(2, 4)];
    expect(fleetUtils.rollingMean(rows, 'avg_speed_loss_pct', 2)).toEqual([
      { noon_utc: 0, value: 2 },
      { noon_utc: 2, value: 3 },
    ]);
  });

  test('averages over the points that exist when they are fewer than the window', () => {
    const rows = [aggRow(0, 2), aggRow(1, 4)];
    expect(fleetUtils.rollingMean(rows, 'avg_speed_loss_pct', 30)).toEqual([
      { noon_utc: 0, value: 2 },
      { noon_utc: 1, value: 3 },
    ]);
  });

  test('keeps a genuinely negative mean negative', () => {
    const rows = [aggRow(0, -3), aggRow(1, -1)];
    expect(fleetUtils.rollingMean(rows, 'avg_speed_loss_pct', 30).at(-1).value).toBe(-2);
  });

  test.each([
    [[]],
    [null],
    [undefined],
  ])('returns an empty series for %j rows', (rows) => {
    expect(fleetUtils.rollingMean(rows, 'avg_speed_loss_pct')).toEqual([]);
  });
});

describe('fleetUtils.trailingMean', () => {
  const dailyRow = value => ({ speed_loss_pct: value });

  test('means the last valued rows within the window, dropping the older ones', () => {
    const rows = [dailyRow(10), dailyRow(2), dailyRow(4), dailyRow(6)];
    expect(fleetUtils.trailingMean(rows, 'speed_loss_pct', 3)).toBe(4);
  });

  test('spans the last 30 valued rows by default', () => {
    const rows = Array.from({ length: 31 }, (_, i) => dailyRow(i));
    expect(fleetUtils.trailingMean(rows, 'speed_loss_pct')).toBe(15.5);
  });

  test('skips the days the ISO gate leaves null rather than meaning them as holes', () => {
    const rows = [dailyRow(2), dailyRow(null), dailyRow(4), dailyRow(6)];
    expect(fleetUtils.trailingMean(rows, 'speed_loss_pct', 3)).toBe(4);
  });

  test('means over the valued rows that exist when they are fewer than the window', () => {
    expect(fleetUtils.trailingMean([dailyRow(2), dailyRow(4), dailyRow(6)], 'speed_loss_pct', 30)).toBe(4);
  });

  test('keeps a genuinely negative mean negative', () => {
    expect(fleetUtils.trailingMean([dailyRow(-3), dailyRow(-1), dailyRow(-2)], 'speed_loss_pct')).toBe(-2);
  });

  test('returns null for fewer valued rows than MIN_TRAILING_POINTS', () => {
    expect(fleetUtils.trailingMean([dailyRow(2), dailyRow(4), dailyRow(null)], 'speed_loss_pct')).toBeNull();
  });

  test.each([
    [[]],
    [null],
    [undefined],
  ])('returns null for %j rows', (rows) => {
    expect(fleetUtils.trailingMean(rows, 'speed_loss_pct')).toBeNull();
  });
});

const LAST_DATA_DAY = 1825;

describe('fleetUtils.dayToMs', () => {
  test('places day 0 on the fleet epoch', () => {
    expect(fleetUtils.dayToMs(0)).toBe(Date.UTC(2021, 6, 1));
  });

  test('advances one day per index', () => {
    expect(fleetUtils.dayToMs(1) - fleetUtils.dayToMs(0)).toBe(86400000);
  });

  test.each([
    [null],
    [undefined],
  ])('returns null for a %j day', (day) => {
    expect(fleetUtils.dayToMs(day)).toBeNull();
  });
});

describe('fleetUtils.msToDay', () => {
  test('inverts dayToMs', () => {
    expect(fleetUtils.msToDay(fleetUtils.dayToMs(LAST_DATA_DAY))).toBe(LAST_DATA_DAY);
  });

  test('rounds a timestamp inside the day to that day', () => {
    expect(fleetUtils.msToDay(fleetUtils.dayToMs(920) + 6 * 3600000)).toBe(920);
  });

  test.each([
    [null],
    [undefined],
  ])('returns null for a %j timestamp', (ms) => {
    expect(fleetUtils.msToDay(ms)).toBeNull();
  });
});

describe('fleetUtils.formatDate', () => {
  test('formats a timestamp as a UTC calendar date', () => {
    expect(fleetUtils.formatDate(Date.UTC(2026, 5, 30))).toBe('2026-06-30');
  });

  test('keeps the UTC day for a timestamp late in it', () => {
    expect(fleetUtils.formatDate(Date.UTC(2026, 5, 30, 23, 59))).toBe('2026-06-30');
  });

  test.each([
    [null],
    [undefined],
  ])('returns null for a %j timestamp', (ms) => {
    expect(fleetUtils.formatDate(ms)).toBeNull();
  });
});

describe('fleetUtils.dayDate', () => {
  test.each([
    [0, '2021-07-01'],
    [920, '2024-01-07'],
    [LAST_DATA_DAY, '2026-06-30'],
    [2949, '2029-07-28'],
  ])('dates day %j as %j', (day, expected) => {
    expect(fleetUtils.dayDate(day)).toBe(expected);
  });

  test.each([
    [null],
    [undefined],
  ])('returns null for a %j day', (day) => {
    expect(fleetUtils.dayDate(day)).toBeNull();
  });
});

describe('fleetUtils.todayDay', () => {
  test('reads the reader’s own local calendar day, in any timezone', () => {
    expect(fleetUtils.dayDate(fleetUtils.todayDay(new Date(2026, 6, 14)))).toBe('2026-07-14');
  });

  test('keeps the local day for a time late in it', () => {
    expect(fleetUtils.dayDate(fleetUtils.todayDay(new Date(2026, 6, 14, 23, 30)))).toBe('2026-07-14');
  });
});

describe('fleetUtils.relativeDay', () => {
  test.each([
    [1825, '14 天前'],
    [1839, '今天'],
    [1901, '62 天後'],
  ])('places day %j at %j', (day, expected) => {
    expect(fleetUtils.relativeDay(day, 1839)).toBe(expected);
  });

  test.each([
    [null],
    [undefined],
  ])('returns null for a %j day', (day) => {
    expect(fleetUtils.relativeDay(day, 1839)).toBeNull();
  });
});

describe('fleetUtils.dayLabel', () => {
  test('pairs the date with its offset from today', () => {
    expect(fleetUtils.dayLabel(LAST_DATA_DAY, 1839)).toBe('2026-06-30（14 天前）');
  });

  test('labels a day past the data window as still to come', () => {
    expect(fleetUtils.dayLabel(2949, 1839)).toBe('2029-07-28（1110 天後）');
  });

  test.each([
    [null],
    [undefined],
  ])('returns null for a %j day', (day) => {
    expect(fleetUtils.dayLabel(day, 1839)).toBeNull();
  });
});

describe('fleetUtils.dayRangeLabel', () => {
  test('anchors the single parenthetical on the end day', () => {
    expect(fleetUtils.dayRangeLabel(0, LAST_DATA_DAY, 1839)).toBe('2021-07-01 – 2026-06-30（14 天前）');
  });

  test('labels a one-day range as that day', () => {
    expect(fleetUtils.dayRangeLabel(1839, 1839, 1839)).toBe('2026-07-14 – 2026-07-14（今天）');
  });

  test.each([
    [null, LAST_DATA_DAY],
    [0, null],
  ])('returns null for the range %j–%j', (from, to) => {
    expect(fleetUtils.dayRangeLabel(from, to, 1839)).toBeNull();
  });
});
