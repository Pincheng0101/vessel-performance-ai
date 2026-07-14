export default defineNuxtPlugin((nuxtApp) => {
  const { appVersion, awsAccountEnv, rollbarClientToken } = useRuntimeConfig().public;

  if (!rollbarClientToken) return;

  let rollbar = null;
  const buffer = [];

  const report = (error, payload) => {
    if (rollbar) {
      rollbar.error(error, payload);
    } else {
      buffer.push({ error, payload });
    }
  };

  // Buffer errors thrown before rollbar finishes loading, then replay them once it is ready.
  const onError = event => report(event.error ?? event.message);
  const onRejection = event => report(event.reason);
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);

  nuxtApp.vueApp.config.errorHandler = (error, instance, info) => {
    report(error, {
      vueComponent: instance?.$options?.name,
      info,
    });

    if (import.meta.dev) {
      console.error(error);
    }
  };

  nuxtApp.provide('rollbar', { error: report });

  // Defer the rollbar bundle off the entry chunk: load it after mount so it neither
  // bloats the entry chunk nor blocks the first API request on cold start.
  nuxtApp.hook('app:mounted', async () => {
    const { default: Rollbar } = await import('rollbar');

    rollbar = new Rollbar({
      accessToken: rollbarClientToken,
      captureUncaught: true,
      captureUnhandledRejections: true,
      checkIgnore: (_isUncaught, _args, payload) => {
        const frames = payload?.body?.trace?.frames ?? [];
        return frames.some(frame => /^(chrome|moz|safari)-extension:\/\//.test(frame.filename ?? ''));
      },
      payload: {
        environment: awsAccountEnv,
        client: {
          javascript: {
            source_map_enabled: true,
            code_version: appVersion,
          },
        },
      },
    });

    // Hand live capture over to rollbar's own listeners, then flush anything buffered during the gap.
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
    buffer.forEach(({ error, payload }) => rollbar.error(error, payload));
    buffer.length = 0;

    const authStore = useAuthStore();
    watch(
      () => authStore.parsedToken,
      (token) => {
        rollbar.configure({
          payload: {
            person: token ? { id: token.sub, email: token.username } : undefined,
          },
        });
      },
      { immediate: true },
    );
  });
});
