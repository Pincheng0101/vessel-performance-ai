# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

A single-page **fleet-performance dashboard** (`/dashboard`) for the YM data-lake hackathon.
The codebase was stripped from a full platform UI down to exactly what the dashboard needs —
every other page, resource form, workflow editor, and its supporting registry code has been
deleted. Do not re-introduce platform patterns (Resource models, service registries, form
validation) unless the feature actually returns.

- **Routing**: `nuxt.config.ts` has a `pages:extend` hook that keeps only `/dashboard` and
  redirects `/` and every other path to it. There is one page (`app/pages/dashboard/index.vue`),
  one layout (`app/layouts/dashboard.vue`), and no login.
- **Data**: fixture-backed. `app/services/server/datalake.js` (the only service, exposed via
  `useServer().datalake`) reads captured JSON snapshots from `public/demo/`, keyed by
  `public/demo/index.json`. Fully offline — no auth, no live API on page load.
- **GenBI copilot chat** (`DashboardCopilotChatRoom`) is the one live integration: it fetches a
  Cognito client-credentials token and POSTs to an AgentCore runtime directly via `$fetch`,
  configured by the six `AGENTCORE_*` vars in `.env` (`.env.example`). Without them the panel
  renders but replies fail.

## Git Commit Rules

When creating commits:
- Only include the title, no detailed description
- Do not add `Co-Authored-By: Claude <noreply@anthropic.com>`

## Merge Request Rules

MR titles must start with one of these prefixes:
- `[Feature]` - New functionality or enhancements
- `[Fix]` - Bug fixes
- `[Refactor]` - Code refactoring without changing functionality
- `[Docs]` - Documentation updates (README, CLAUDE.md, comments, etc.)
- `[Chore]` - Maintenance tasks (dependency updates, build config, tooling, etc.)

## Development Commands

```bash
npm install
npm run dev              # localhost:3000 — offline on public/demo fixtures, no .env needed
npm run test:unit -- --run
npm run lint             # ESLint
npm run lint:security    # security lint (hard gate, also runs in CI)
npm run generate         # static build → .output/public (what deploy-web ships)
npm run capture          # re-capture public/demo fixtures off the live query API (.env.capture)
```

After changing any code under `app/`, run **both** `npm run lint` and `npm run lint:security`
before committing. `lint:security` is a hard gate (findings are errors → non-zero exit).

### Environment
- Node `v24.11.0` (`.nvmrc`); npm pinned to `11.10.0` via Corepack — run `corepack enable npm`
  once per machine or `npm install` fails the `engines` check (`engine-strict=true` in `.npmrc`).
- `.npmrc` sets `min-release-age=3` — npm packages published < 3 days ago are blocked.

### Auto-imports
Nuxt auto-imports `app/utils/` and `app/composables/` — do **not** write explicit `import`
statements for anything in those directories. Pinia stores, Vue reactivity APIs, and Vue Router
composables are also auto-imported. Constants are **not** auto-imported: import them directly
per file (`import * as ChatConstant from '~/constants/ChatConstant';`) — there is deliberately
no `~/constants` barrel.

## Architecture

- **Framework**: Nuxt 4 (SPA, `ssr: false`), Vuetify 3, Pinia, Vitest, @nuxtjs/i18n (en / zh-TW)
- `app/pages/dashboard/index.vue` — the page: section tabs, each a lazily-loaded
  (`<LazyDashboard*>` in `<Suspense>`) self-contained component
- `app/components/Dashboard*.vue` — one component per dashboard section (executive, fleet,
  vessel deep-dive, alerts, maintenance planner, speed optimizer, fleet map) plus the copilot
  chat panel
- `app/components/App*.vue` — generic UI kit (tables, display fields, ECharts wrapper
  `AppEChart`, markdown, editors)
- `app/components/Chat*.vue` / `ChatRoom*.vue` — the chat room UI used by the copilot
- `app/composables/` — 16 composables; key ones: `useServer` (datalake only), `useFleetDaily`
  (shared fleet-daily fetch/cache), `useDashboardVesselSelection`, `useCustomTheme` /
  `useCustomLocale` (init lives in the dashboard layout)
- `app/utils/fleetUtils.js` — day-index ↔ date conversion and fleet math shared by sections
- `app/constants/FleetChartConstant.js` / `FleetGlossaryConstant.js` — chart palettes and the
  metric glossary; other constants are small enums kept because chat/UI-kit code touches them
- `app/models/` — only the UI/websocket/chat models the chat room needs (no server Resource models)

### Updating fixtures
Changing a query's column list (`lambda_function/async_query_api/queries.py`) means deploying
the API *before* `npm run capture`, or the fixture comes back without the new column. Only the
query types `datalake.js` exposes are captured — edit `scripts/capture-fixtures.mjs` to add one.

### I18n
Translation keys use a double-underscore prefix (`__action*`, `__field*`, `__message*`,
`__title*`), single-line entries in `i18n/locales/{en,zh-TW}.js`. Both locales must stay
key-identical. Unused keys have been pruned — when deleting UI, delete its keys from both files.

### Code Style

ESLint enforces 1TBS braces, sorted imports, prefer-const, object shorthand, template strings,
and multi-word component names (in `app/components/`).

### Comments

- Only comment the "why" when it isn't obvious; don't restate what the code does.
- Write comments in English.
- No AI-authored traces (`// added xxx`, `// modified: ...`, `// TODO by AI`).
- No commented-out code — leave that to git.
- Punctuation follows the shape of the comment: full sentences end with a period, short
  fragments don't.
- Match the comment density of the surrounding file.

### Path-scoped rules

Domain-specific conventions live in `.claude/rules/` and load only when Claude edits matching
files: `components.md`, `constants.md`, `i18n.md`, `utils-tests.md`.
