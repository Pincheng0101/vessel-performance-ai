# CLAUDE.md

Python 3.13, `uv`, `ruff`. Single quotes. Line length 120.

```bash
pytest -s tests/unit/
ruff check --fix . && ruff format .
```

# Web (`web/`)

Nuxt 4 + Vuetify SPA (git subtree of `ym-datalake-ui`). **Separate npm tree from the root CDK pin —
`cd web` first.** Node `v24.11.0` (`.nvmrc`); npm ≥ 11.10 (`.npmrc` sets `engine-strict=true`, so run
`corepack enable npm` once).

```bash
cd web
npm ci
npm run dev                        # offline on public/demo fixtures — no .env needed
npm run lint && npm run lint:security
npm run test:unit -- --run
npm run generate                   # static build → .output/public
```

- Dashboard is **fixture-backed** (`app/services/server/datalake.js` → `public/demo/{v1,v2}`). Only
  the GenBI copilot chat is live; it needs the six `AGENTCORE_*` vars in `web/.env` (`.env.example`).
- `npm run capture` regenerates `public/demo/v2` (`YM_API_BASE_URL`/`YM_API_KEY` via
  `web/.env.capture`). **Broken:** still targets the removed `/v2/queries` prefix; API now serves
  `/queries`.
- `web/CLAUDE.md` + `web/.claude/rules/` are authoritative for anything under `web/` — follow them.

# Documentation
- Chinese docs: render every 專有名詞 (proper noun) or technical term as `中文 (英文)` on first use, e.g. 資料湖 (data lake).

# AWS
- CDK: `npx aws-cdk@latest`
- AWS CLI: `AWS_PROFILE=ym-hackathon aws`

