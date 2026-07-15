---
paths:
  - "app/constants/**/*.js"
---

# Constants Conventions

### Always wrap in `Object.freeze(...)`

Verified: every constant file uses `Object.freeze`. New constants should
follow suit.

### Two shapes, chosen by use case

**Simple value enums** — internal/logic-only constants use flat string values:

```js
const Type = Object.freeze({
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
});
```

**UI-facing enums** — anything rendered in the UI uses a nested object per
entry with `i18nTitle`, `value`, and optional `icon`:

```js
const ContentBlock = Object.freeze({
  THINKING: {
    i18nTitle: '__messageAgentThinking',
    name: 'thinking',
    value: 'Thinking...',
  },
});
```

`i18nTitle` holds the translation key (double-underscore prefix — see root
CLAUDE.md i18n section). `icon` uses Vuetify `mdi-*` identifiers.

### Export style

Use named exports at the end of the file, not `export const` inline:

```js
export {
  Type,
  EditorMode,
};
```
