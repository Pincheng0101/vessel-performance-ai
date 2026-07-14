export default defineNuxtPlugin((nuxtApp) => {
  let real = null;
  let pendingLocale = null;
  let resolveReady;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });

  // Stub FieldValidator that records the rule chain and replays it once the
  // real validator is available. Vuetify supports async rule functions, so
  // the resulting rules resolve as soon as the validator bundle has loaded.
  const buildFieldStub = (name) => {
    const calls = [];
    const stub = new Proxy({}, {
      get(_, prop) {
        if (prop === 'collect') {
          return () => [async (value) => {
            const validator = await ready;
            let field = validator.defineField(name);
            for (const { method, args } of calls) {
              field = field[method](...args);
            }
            for (const rule of field.collect()) {
              const result = await rule(value);
              if (result !== true) return result;
            }
            return true;
          }];
        }
        return (...args) => {
          calls.push({ method: prop, args });
          return stub;
        };
      },
    });
    return stub;
  };

  // Defer the validator bundle off the entry chunk: load it after mount so
  // its dependencies (ajv, fortress-validator, jsonpath-plus, asl-path-validator,
  // fast-uri) neither bloat the entry chunk nor block the first API request
  // on cold start. Form pages live behind routes, so they reach the validator
  // only after app:mounted has resolved the dynamic imports.
  const proxy = new Proxy({}, {
    get(_, prop) {
      if (real) {
        const value = real[prop];
        return typeof value === 'function' ? value.bind(real) : value;
      }
      if (prop === 'setLocale') {
        return (locale) => {
          pendingLocale = locale;
          return proxy;
        };
      }
      if (prop === 'defineField') {
        return buildFieldStub;
      }
      throw new Error(`[$validator] "${String(prop)}" called before the validator bundle loaded`);
    },
  });

  nuxtApp.provide('validator', proxy);

  nuxtApp.hook('app:mounted', async () => {
    const [
      { FormValidator },
      { default: pluginDate },
      { default: pluginJsonSchema },
      { default: pluginCustom },
    ] = await Promise.all([
      import('@kklab/fortress-validator'),
      import('@kklab/fortress-validator-plugin-date'),
      import('@kklab/fortress-validator-plugin-json-schema'),
      import('~/validator/plugin'),
    ]);
    real = new FormValidator({
      plugins: [pluginCustom, pluginDate, pluginJsonSchema],
    });
    if (pendingLocale !== null) real.setLocale(pendingLocale);
    resolveReady(real);
  });
});
