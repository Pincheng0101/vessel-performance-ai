// Capture the async-query API (the ym_hackathon data lake — 20 tables + 3 derived
// query types, see ym_datalake/schema.py) into static fixtures for the offline demo.
//
// Re-runnable: derives the ship roster at runtime from dim_vessel, then pulls every
// query_type the dashboard reads (raw, wide, full-grain — no trimming, full day range)
// and writes each result to public/demo/<slug>.json plus an index.json mapping the
// runtime cache key (`${type}:${JSON.stringify(params)}`) → filename. datalake.js reads
// that index.
//
// Config comes from env (never committed):
//   SERVER_API_URL=... SERVER_API_KEY=... node scripts/capture-fixtures.mjs
//
// The param shapes here MUST match how the app calls query() (e.g. agg_fleet_daily uses
// {} for full-history/all-fleet, not { fleet_id: 'ALL' }), so the cache keys line up.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = (process.env.SERVER_API_URL || '').replace(/\/+$/, '');
const KEY = process.env.SERVER_API_KEY || '';
if (!BASE || !KEY) {
  console.error('Missing SERVER_API_URL / SERVER_API_KEY env vars.');
  process.exit(1);
}

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'demo');

const POLL_INTERVAL_MS = 900;
const POLL_TIMEOUT_MS = 90_000;
const MAX_CONCURRENCY = 8;

// Identifiers that look numeric and would otherwise be coerced: imo_number is a bare
// 9800001-style string, voyage/voyage_no are numeric-ish voyage codes. ship_id ("S1")
// never coerces, but is listed alongside them for clarity.
const STRING_COLUMNS = new Set(['ship_id', 'imo_number', 'voyage', 'voyage_no']);
const NUMERIC_RE = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function coerce(col, val) {
  if (val === null || val === undefined) return null;
  if (STRING_COLUMNS.has(col)) return val;
  if (val === 'true') return true;
  if (val === 'false') return false;
  if (val !== '' && NUMERIC_RE.test(val)) return Number(val);
  return val;
}

function rowsToObjects({ columns, rows }) {
  return rows.map((row) => {
    const obj = {};
    columns.forEach((c, i) => {
      obj[c] = coerce(c, row[i]);
    });
    return obj;
  });
}

async function fetchWithRetry(url, options) {
  const MAX_RETRIES = 5;
  for (let attempt = 0; ; attempt += 1) {
    const res = await fetch(url, options);
    if (res.status !== 429 || attempt >= MAX_RETRIES) return res;
    const retryAfter = Number(res.headers.get('retry-after'));
    const wait = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : Math.min(8000, 500 * 2 ** attempt) + Math.random() * 250;
    await sleep(wait);
  }
}

const headers = extra => ({ 'x-api-key': KEY, ...(extra || {}) });

async function submit(type, params) {
  const res = await fetchWithRetry(`${BASE}/queries`, {
    method: 'POST',
    headers: headers({ 'content-type': 'application/json' }),
    body: JSON.stringify({ query_type: type, params: params || {} }),
  });
  if (!res.ok) throw new Error(`submit ${type} → ${res.status}: ${await res.text()}`);
  return (await res.json()).query_id;
}

async function pollUntilDone(queryId, type) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const res = await fetchWithRetry(`${BASE}/queries/${queryId}`, { headers: headers() });
    if (!res.ok) throw new Error(`status ${type} → ${res.status}`);
    const body = await res.json();
    if (body.status === 'SUCCEEDED') return;
    if (body.status === 'FAILED') throw new Error(`query ${type} (${queryId}) FAILED`);
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`query ${type} (${queryId}) timed out`);
}

async function fetchAllResults(queryId, type) {
  let columns = null;
  const rows = [];
  let token = null;
  do {
    const url = new URL(`${BASE}/queries/${queryId}/results`);
    if (token) url.searchParams.set('page_token', token);
    const res = await fetchWithRetry(url, { headers: headers() });
    if (!res.ok) throw new Error(`results ${type} → ${res.status}`);
    const body = await res.json();
    if (!columns) columns = body.columns;
    if (body.rows) rows.push(...body.rows);
    token = body.next_page_token || null;
  } while (token);
  return { columns: columns || [], rows };
}

// Bounded-concurrency worker pool.
let active = 0;
const waiters = [];

function acquire() {
  if (active < MAX_CONCURRENCY) {
    active += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    waiters.push(resolve);
  });
}

function release() {
  const next = waiters.shift();
  if (next) {
    next();
  } else {
    active -= 1;
  }
}

async function runQuery(type, params) {
  await acquire();
  try {
    const id = await submit(type, params);
    await pollUntilDone(id, type);
    return rowsToObjects(await fetchAllResults(id, type));
  } finally {
    release();
  }
}

const cacheKey = (type, params) => `${type}:${JSON.stringify(params)}`;
const slug = (type, params) => {
  const vals = Object.values(params);
  return vals.length ? `${type}__${vals.join('_')}` : type;
};

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const index = {};
  const failures = [];

  const capture = async (type, params) => {
    try {
      const data = await runQuery(type, params);
      const file = `${slug(type, params)}.json`;
      await writeFile(join(OUT_DIR, file), JSON.stringify(data));
      index[cacheKey(type, params)] = file;
      console.debug(`✓ ${type} ${JSON.stringify(params)} → ${data.length} rows`);
      return data;
    } catch (e) {
      failures.push({ type, params, error: String(e.message || e) });
      console.warn(`✗ ${type} ${JSON.stringify(params)} — ${e.message || e}`);
      return [];
    }
  };

  // Roster first — it drives the per-ship tasks. agg_fleet_daily binds fleet_id='ALL' by
  // default, which is the whole-fleet rollup row the dashboard wants (a call without it
  // would double-count the rollup against its two sub-fleets).
  const [vessels] = await Promise.all([
    capture('dim_vessel', {}),
    capture('agg_fleet_daily', {}),
    capture('fleet_positions', {}),
    capture('fact_alert', {}),
    capture('fact_recommendation', {}),
    capture('fact_maintenance_recommendation', {}),
    capture('predict_targets', {}),
  ]);

  const shipIds = [...new Set(vessels.map(v => v.ship_id).filter(Boolean))];

  const SHIP_TYPES = [
    'fact_performance_daily', 'fact_performance_indicator', 'fact_anomaly', 'fact_alert',
    'fact_maintenance_recommendation', 'fact_uwi', 'fact_speed_profile', 'ship_speed_power',
  ];
  const shipTasks = shipIds.flatMap(ship_id => SHIP_TYPES.map(type => () => capture(type, { ship_id })));

  // The semaphore inside runQuery throttles actual concurrency; fire them all.
  await Promise.all(shipTasks.map(fn => fn()));

  await writeFile(join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2));

  console.debug(`\nDone: ${Object.keys(index).length} fixtures → ${OUT_DIR}`);
  console.debug(`Ships: ${shipIds.length}`);
  if (failures.length) {
    console.warn(`\n${failures.length} failures:`);
    failures.forEach(f => console.warn(`  - ${f.type} ${JSON.stringify(f.params)}: ${f.error}`));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
