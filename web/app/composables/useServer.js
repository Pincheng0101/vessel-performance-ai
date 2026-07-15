// Stripped-down server accessor for the dashboard-only build. The full platform's
// lazy service registry (30+ authenticated resource services) is gone; only the
// fixture-backed data-lake service remains, and it needs no auth, client, or error
// handling — it reads static JSON from public/demo via $fetch.
//
// Each proxied method returns `Promise<AsyncData>`. Because Nuxt's AsyncData is a
// thenable that resolves to itself, `await server.datalake.x(...)` still yields the
// `{ data, error, pending, ... }` object, so the existing call sites are unchanged.
// `runWithContext` preserves the Nuxt instance across the dynamic-import boundary
// so `useAsyncData` inside the service still works.
export function useServer() {
  const nuxtApp = useNuxtApp();

  const lazyService = (loader) => {
    let ready;
    const load = () => (ready ??= loader().then(module => module.default()));
    return new Proxy({}, {
      get: (_, method) => (...args) => load().then(service => nuxtApp.runWithContext(() => service[method](...args))),
    });
  };

  return {
    datalake: lazyService(() => import('~/services/server/datalake')),
  };
}
