---
paths:
  - "app/pages/**/*.vue"
---

# Page Conventions

### `definePageMeta` at the top of `<script setup>`

Pages set layout and middleware via `definePageMeta` as the first statement:

```vue
<script setup>
definePageMeta({
  layout: 'centered',
  middleware: ['guest'],
});
</script>
```

### Breadcrumbs via `useBreadcrumbStore().setBreadcrumb(key, title)`

Pages that appear in breadcrumb paths register their title against a route
param (often `route.params.id` for resource detail pages):

```js
const breadcrumbStore = useBreadcrumbStore();
breadcrumbStore.setBreadcrumb(route.params.id, _data.name);
```

Fixed keys are used for pages without a dynamic id:

```js
breadcrumbStore.setBreadcrumb('information-security-assistant', PAGE_TITLE);
```

**Filename gotcha:** the store file is `app/stores/breadrcrumbStore.js` (note
the typo in the filename — `breadrcrumb`, not `breadcrumb`). The exported
composable name is spelled correctly as `useBreadcrumbStore`, so Nuxt
auto-import hides the typo unless you open the stores directory directly.
