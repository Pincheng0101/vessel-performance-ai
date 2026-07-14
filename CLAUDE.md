# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

### Installation
```bash
npm install
```

### Development
```bash
npm run dev              # Start dev server at localhost:3000
```

### Testing
```bash
npm run test             # Run all tests (unit + integration)
npm run test:unit        # Run Vitest unit tests
npm run test:unit -- --run  # Run unit tests once (no watch mode)
npm run test:integration # Run Playwright integration tests
```

### Linting & Building
```bash
npm run lint             # Run ESLint
npm run lint:security    # Run the security lint (eslint-plugin-security, covers .js + .vue)
npm run build            # Build for production
npm run generate         # Static-site generation
npm run preview          # Preview production build
```

After changing any code under `app/`, run **both** `npm run lint` and `npm run lint:security`
before committing. `lint:security` is a hard gate (security findings are errors → non-zero
exit) and also runs in CI on every push, so a new finding will fail the build. It covers the
`.vue` blind spot that the GitLab semgrep SAST analyzer (which only scans `.js`/`.ts`) misses.

### Environment
- Node version: `v24.11.0` (see `.nvmrc`).
- npm version: pinned to `11.10.0` via Corepack (`packageManager` in `package.json`). Run `corepack enable npm` once per machine — the `npm` shim is **not** enabled by `corepack enable` alone (Corepack leaves npm alone by default since it is bundled with Node). Without this step, `npm install` fails the `engines` check (`engine-strict=true` in `.npmrc`).
- `.npmrc` sets `min-release-age=3` — newly published npm packages (< 3 days old) are blocked from install. Requires npm ≥ 11.10 (reason for the Corepack pin). Wait, or temporarily override, when adding very fresh deps.

### Auto-imports
Nuxt auto-imports `app/utils/` and `app/composables/` — do **not** write explicit `import` statements for anything in those directories. Examples used unimported across the codebase: `delay()`, `useServer()`, `useAuth()`, `useBreadcrumbStore()`. Pinia stores, Vue reactivity APIs (`ref`, `reactive`, `computed`, `watch`), and Vue Router composables (`useRoute`, `useRouter`) are also auto-imported.

## Architecture Overview

### Technology Stack
- **Framework**: Nuxt 4 (SPA mode, SSR disabled via `ssr: false`)
- **UI**: Vuetify 3
- **State Management**: Pinia
- **Testing**: Vitest (unit), Playwright (integration)
- **I18n**: @nuxtjs/i18n (English and Traditional Chinese)
- **Validation**: @kklab/fortress-validator with JSON Schema plugin

### Directory Structure

- **app/models/**: Data models organized by domain
  - `server/`: Server API response models (Agent, Chunker, Connector, etc.)
  - `cognito/`: AWS Cognito authentication models
  - Base `Resource` class that all server resources extend

- **app/services/**: API service layer
  - `server/`: Individual service modules per resource type (agent.js, llm.js, etc.)
  - Services handle HTTP requests and are consumed via `useServer()` composable

- **app/composables/**: Reusable composition functions
  - `useServer.js`: Central API client with authentication and error handling
  - `useAuth.js`: Authentication logic
  - Resource-specific composables (useWorkflow, useWorkflowTemplate, etc.)

- **app/constants/**: Type definitions and constants organized by domain
  - `ResourceConstant.js`: Central registry of all resource types with metadata (icons, paths, endpoints)
  - Type-specific constants (ChunkerConstant, ConnectorConstant, etc.)

- **app/stores/**: Pinia stores for global state
  - `authStore.js`: Authentication state
  - `snackbarStore.js`: Toast/snackbar messages (used by `useServer` for errors)
  - `breadrcrumbStore.js`: Navigation breadcrumbs — note the filename has a typo (`breadrcrumb`), but the exported composable is `useBreadcrumbStore` (correct spelling). Auto-import hides the typo unless you look at the file directly.

- **app/validator/**: Form validation schemas
  - `aslSchemas/`: Amazon States Language validation schemas
  - `plugin/`: Custom Fortress Validator plugins

- **app/workflow/**: Workflow editor and execution logic

- **app/pages/**: File-based routing (Nuxt convention)

- **app/components/**: Vue components (must have multi-word names per ESLint)

### Key Patterns

#### Resource Model Pattern
All server resources extend the base `Resource` class:
```javascript
class Resource {
  get resourceType()    // Returns resource type constant
  get id()              // Returns resource ID
  get name()            // Returns resource name
  get displayFields()   // Returns array of DisplayField objects for UI
  static toRequestPayload()  // Converts to API request format
}
```

#### Service Pattern
API services are accessed via the `useServer()` composable:
```javascript
const server = useServer();
const { data, error, pending } = await server.agent.get({ agentId });
```

Services automatically handle:
- Authentication token injection
- Request/response error handling
- Message display for errors
- AWS Cognito token refresh

#### Constants Pattern
Resource types are defined in `ResourceConstant.js` with metadata:
- `value`: API resource type identifier
- `module`: Service module name
- `path`: URL path segment
- `id`: Resource ID field name
- `icon`: Vuetify icon identifier
- `getEndpoint`: API endpoint for fetching resource
- Feature flags and permission settings

#### Display Fields Pattern
Models define `displayFields` and related getters that return arrays of `DisplayField` objects:
```javascript
{
  title: $i18n.t('__fieldName'),
  value: this.name,
  isCopyable: true,
  isBlockText: true,
  link: { href: '/path' },
  table: { headers: [...] }
}
```

### State Management

Pinia stores handle global state:
- Authentication state in `authStore`
- User messages/toasts in `snackbarStore`
- Navigation breadcrumbs in `breadrcrumbStore`
- Feature flags in `featureStore`
- Workflow state in `workflowStore`

### Error Handling

The `useServer()` composable centralizes error handling:
- 400: Business logic errors (dependents, validation)
- 401: Redirects to login
- 403: Permission errors
- 422: Validation errors (shows invalid fields)
- 500+: Server errors

Errors are displayed as toast messages via `snackbarStore`.

### Authentication

- AWS Cognito integration via `useCognito()` and `useAuth()`
- Access tokens injected into all API requests
- Automatic token refresh before requests
- Session management in `authStore`

### I18n

Translation keys use double underscore prefix:
- `__field*`: Field labels
- `__title*`: Page/section titles
- `__message*`: User messages
- `__action*`: Action labels

Supports English (en) and Traditional Chinese (zh-TW).

### Code Style

ESLint enforces:
- 1TBS brace style
- Sorted imports (builtin → external → internal)
- Prefer const over let
- Object shorthand
- Template strings over concatenation
- Multi-word component names (in app/components/)
- Consistent object/array formatting

### Comments

- Only comment the "why" when it isn't obvious; don't restate what the code does.
  - Bad: `// loop over items`
  - Good: `// API returns 500 on empty string, so filter it out first`
- Write comments in English.
- No AI-authored traces (`// added xxx`, `// modified: ...`, `// TODO by AI`).
- No commented-out code — leave that to git.
- Punctuation follows the shape of the comment, not a blanket rule:
  - A full sentence (or multiple sentences) ends with a period.
  - A short fragment or label does not (e.g. `// Skip empty rows`, `// Fallback`).
- Match the comment density of the surrounding file; don't add comments to a
  file that previously had none.

### Path-scoped rules

Domain-specific conventions live in `.claude/rules/` and load only when Claude
edits matching files:
- `components.md` — component conventions (`reactive` state, no `defineEmits`, number-input modifiers)
- `pages.md` — `definePageMeta` and breadcrumb patterns
- `constants.md` — `Object.freeze` shape and UI enum structure
- `i18n.md` — translation wording rules for `i18n/locales/*.js`
- `utils-tests.md` — unit-test conventions for `app/utils/*.test.js` (naming, structure, coverage quadrants, count guidelines)

## Working with Resources

### Adding a New Resource Type

1. Create model in `app/models/server/[resource]/` extending `Resource`
2. Add service in `app/services/server/[resource].js`
3. Register in `useServer()` composable
4. Add constants in `app/constants/[Resource]Constant.js`
5. Register in `ResourceConstant.js` Type object
6. Create pages in `app/pages/[resources]/`

### Model Factories

For resources with multiple types (Chunker, Connector, DirectRetriever):
- Use Factory pattern: `ChunkerFactory`, `ConnectorResponseFactory`
- Factory creates appropriate subclass based on type field
- Response factories handle API responses
- Request factories handle API payloads

### Display Field Types

Full type definitions live in `app/models/ui/DisplayField.d.js` — read that file
for the complete list of rendering flags and option objects.

Common flags you'll use most often:
- Rendering: `isCopyable`, `isStatus`, `isTimestamp`, `isBlockText`, `isChip`,
  `isMarkdown`, `isJsonCode`, `isSecret`
- Config objects: `link` (`href`, `target`), `table` (`headers`),
  `editorOptions` (`maxLines`, `minLines`, `enableLineWrapping`),
  `chipOptions.color`, `markdownViewerOptions`, `timestampOptions.isRelative`

## UI Data (`uiData`)

Used to persist lightweight UI state (e.g. per-user preferences, draft content) via the backend key-value store.

### Important: No user scope on the backend

The `/ui/set-ui-data` and `/ui/get-ui-data` APIs are **not scoped per user** — all keys are shared across the entire tenant. User identity must be embedded in the key itself when the data is user-specific.

Current user ID is available via `useAuthStore().parsedToken.sub` (Cognito `sub` claim).

### Key naming conventions

Keys follow the pattern `{noun}-{resourceId}` — noun first, then the ID(s) that identify the data:

| Data | Key format | Example |
|------|-----------|---------|
| Resource metadata (shared) | `{noun}-{resourceId}` | `metadata-{agentId}` |
| Per-user preference for a resource | `{noun}-{resourceId}-user-{userId}` | `preference-{agentId}-user-{userId}` |

When a key is scoped to a specific user, append `user-{userId}` as a compound segment — `user-` is part of the identifier, not just a separator.

### Reading with `lazy: false`

The `uiData.get` and `uiData.batchGet` services default to `lazy: true`. In pages/components that need the data immediately (e.g. top-level `await` in a page, `onMounted`), always pass `{ lazy: false }`:

```javascript
const { data } = await server.uiData.get({ key }, { lazy: false });
const { data } = await server.uiData.batchGet({ keys }, { lazy: false });
```

### `batchGet` limit

`batchGet` accepts at most **100 keys** per request. When fetching multiple uiData types together (e.g. metadata + preferences), account for all key types when setting per-page limits.

### Model pattern

Define a model class in `app/models/ui/` with a static `getKey()` method to centralise key construction. For per-user keys, also add a static `parseResourceId()` to extract the resource ID from a key when processing `batchGet` results:

```javascript
class AgentUserPreference {
  static getKey(agentId, userId) {
    return `preference-${agentId}-user-${userId}`;
  }
  static parseAgentId(key) {
    return key.split('-user-')[0].replace(/^preference-/, '');
  }
}
```

### List page pattern

Fetch all needed uiData in a single `batchGet` alongside other data loads, build a map keyed by resource ID, and pass the relevant entry down as a prop — avoid re-fetching inside individual dialogs or components:

```javascript
const preferenceKeys = agents.map(a => AgentUserPreference.getKey(a.id, userId));
const { data } = await server.uiData.batchGet({ keys: preferenceKeys }, { lazy: false });
const preferenceMap = Object.fromEntries(
  data.value.data.map(item => [AgentUserPreference.parseAgentId(item.key), item.value])
);
```

## Validation

Uses Fortress Validator with:
- JSON Schema validation plugin
- Custom plugins in `app/validator/plugin/`
- ASL (Amazon States Language) schemas for workflow validation
- Schema-based form validation with `useFormObserver()`
