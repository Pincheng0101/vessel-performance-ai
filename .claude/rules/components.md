---
paths:
  - "app/components/**/*.vue"
---

# Component Conventions

### Local state: grouped `reactive()` over individual `ref()`

When a component has multiple related state fields, group them in a single
`reactive()` object rather than separate `ref()` calls:

```vue
<script setup>
const state = reactive({
  isOpen: false,
  selected: null,
  items: [],
});
</script>
```

This is the dominant pattern (~266 of 711 SFCs). Single-value state can still
use `ref()`; the convention is about grouping, not banning `ref()`.

### No `defineEmits` — thin Vuetify wrappers only

Components do **not** declare custom emits via `defineEmits`. Verified: 0 of 578
components use it.

Instead, form/input components are thin wrappers around Vuetify inputs that
bind through `v-model` and attach handlers inline on the underlying input:

```vue
<v-text-field
  v-model="state.value"
  @update:model-value="handleChange"
/>
```

When you need to notify a parent, expose via `v-model` binding — don't invent
a custom emit name.

### Number input modifiers (Vuetify `v-text-field` with `type="number"`)

- Use `v-model.integer` for integer-only fields (counts, timeouts in seconds,
  ports, limits, iterations, max turns).
- Use `v-model.number` only when the field accepts decimals (e.g., JSON Schema
  `minimum` / `maximum` / `default`).
- Do **not** add `step="1"` — not a convention in this codebase.
