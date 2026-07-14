import { describe, expect, test } from 'vitest';
import fleetUtils from './fleetUtils';

const row = (shipId, reportDate, rating, excess) => ({
  ship_id: shipId,
  report_date: reportDate,
  cii_rating_aer: rating,
  cii_rating_imo: 'E',
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
