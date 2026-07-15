# ym-datalake-ui

Hackathon UI for the YM fleet-performance data-lake.

- **Base architecture:** ported (frozen) from `langforge-enterprise-ui` @ `db7476f5c`.
  This repo does **not** track langforge upstream — the structure is pinned at that commit.
- **Concept / content reference:** the `ym-datalake-poc` dashboard (a living reference; re-ported as it evolves).

---

## Demo data (fixtures)

The dashboard runs on **static fixtures** in `public/demo/` — a captured snapshot of the
`ym-hackathon` async-query API (`/queries`), which serves one generic query type per table of
the data-lake catalog (`ym_datalake/schema.py`) plus three derived types. The demo is therefore
**fully offline**: page loads read only same-origin JSON, never the live API.
`app/services/server/datalake.js` (registered on `useServer()`) reads `public/demo/index.json`
(cache-key → filename) and lazily fetches each fixture.

### Updating the snapshot

```bash
npm run capture
```

This re-hits the live API and **overwrites** `public/demo/*.json` + `index.json`
(`scripts/capture-fixtures.mjs`). It needs two env vars, read from a **git-ignored**
`.env.capture` in this directory:

```
YM_API_BASE_URL=<AsyncQueryApiUrl>
YM_API_KEY=<api key value>
```

Both come from the deployed `YmHackathonAthenaToolStack` outputs (`AsyncQueryApiUrl`,
`AsyncQueryApiKeyId` → `aws apigateway get-api-key --include-value`). `.env.capture` is ignored
by git — create it locally on each machine. You can also override inline:
`YM_API_KEY=… npm run capture`.

Notes:
- **New/renamed query types or params**: edit the query list in `scripts/capture-fixtures.mjs`,
  then re-run. Param shapes must match how the app calls `query()` (e.g. `agg_fleet_daily` uses
  `{}`, which the API binds to the `'ALL'` fleet rollup) so cache keys align.
- Only the query types the dashboard actually reads are captured — not the whole 23-type catalog.
- After updating: `npm run dev` picks up new fixtures on refresh; for a deploy run
  `npm run build`; commit `public/demo/` to version the snapshot.

## Development

```bash
corepack enable npm   # once per machine (npm is pinned via packageManager)
npm install
npm run dev           # http://localhost:3000 → /dashboard
npm run generate      # static build → .output/public
```

Node `v24.11.0` (`.nvmrc`), npm ≥ 11.10. See `CLAUDE.md` for architecture notes.
