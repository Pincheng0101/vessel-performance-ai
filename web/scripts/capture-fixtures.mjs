// Capture the v2 async-query API (real hackathon dataset, see doc/api_v2.md in
// ym-hackathon) into static fixtures for the offline demo.
//
// Re-runnable: derives the ship roster at runtime, then pulls every query_type
// (raw, wide, full-grain — no trimming, full day range) and writes each result
// to public/demo/<slug>.json plus an index.json mapping the runtime cache key
// (`${type}:${JSON.stringify(params)}`) → filename. datalake.js reads that index.
//
// Config comes from env (never committed):
//   YM_API_BASE_URL=... YM_API_KEY=... node scripts/capture-fixtures.mjs
//
// The param shapes here MUST match how the app calls query() (e.g. fleet_overview
// uses {} for full-history, not { start_day: 0 }), so the cache keys line up.
//
// v2 has no fleet grouping, lat/lon, voyages, or cost/CII/UWI-cost data — those
// v1 query types have no v2 counterpart (doc/api_v2.md §4) and are not captured.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = (process.env.YM_API_BASE_URL || '').replace(/\/+$/, '');
const KEY = process.env.YM_API_KEY || '';
if (!BASE || !KEY) {
  console.error('Missing YM_API_BASE_URL / YM_API_KEY env vars.');
  process.exit(1);
}

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'demo', 'v2');

const POLL_INTERVAL_MS = 900;
const POLL_TIMEOUT_MS = 90_000;
const MAX_CONCURRENCY = 8;

// ship_id (e.g. "S1", "S21") is already non-numeric and never coerces, but
// list it for clarity alongside the columns that do need protecting.
const STRING_COLUMNS = new Set(['ship_id']);
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
  const res = await fetchWithRetry(`${BASE}/v2/queries`, {
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
    const res = await fetchWithRetry(`${BASE}/v2/queries/${queryId}`, { headers: headers() });
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
    const url = new URL(`${BASE}/v2/queries/${queryId}/results`);
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

  // Roster first — it drives the per-ship tasks. No fleet grouping in v2
  // (doc/api_v2.md §3.10/§3.12 fleet_* types are tenant-wide, no fleet_id param).
  const [vessels] = await Promise.all([
    capture('fleet_vessels', {}),
    capture('fleet_overview', {}),
    capture('fleet_alerts', {}),
    capture('fleet_maintenance_recommendation', {}),
    capture('predict_targets', {}),
  ]);

  const shipIds = [...new Set(vessels.map(v => v.ship_id).filter(Boolean))];

  const VESSEL_TYPES = [
    'vessel_metrics', 'vessel_speed_power', 'vessel_maintenance_effect',
    'vessel_speed_loss', 'vessel_anomalies', 'vessel_alerts',
    'vessel_maintenance_recommendation',
  ];
  const vesselTasks = shipIds.flatMap(ship_id => VESSEL_TYPES.map(type => () => capture(type, { ship_id })));

  // The semaphore inside runQuery throttles actual concurrency; fire them all.
  await Promise.all(vesselTasks.map(fn => fn()));

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
