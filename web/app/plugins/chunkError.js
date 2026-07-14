const RELOAD_FLAG = 'chunk-reload-once';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:chunkError', () => {
    // One-shot guard: if reload still fails to load chunks (network glitch,
    // missing chunk in the current build), bail out instead of looping
    // forever. The flag is cleared on the next successful page navigation,
    // so future deploys can still trigger one reload per session.
    if (sessionStorage.getItem(RELOAD_FLAG)) return;
    sessionStorage.setItem(RELOAD_FLAG, '1');
    window.location.reload();
  });
  nuxtApp.hook('page:finish', () => {
    sessionStorage.removeItem(RELOAD_FLAG);
  });
});
