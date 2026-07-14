// "Manager" here means a user with management-console access (a member of
// APP_MANAGEMENT_CONSOLE_GROUPS). Non-managers may only reach chat and
// workflow execution pages; resource management is hidden from them.
const NonManagerAllowedPathRegexes = Object.freeze([
  /^\/$/,
  /^\/agents\/[^/]+\/chat(\/[^/]+)?\/?$/,
  /^\/workflows\/[^/]+\/execute(\/[^/]+)?\/?$/,
  /^\/user(\/.*)?$/,
  /^\/privacy\/?$/,
  /^\/auth(\/.*)?$/,
]);

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuth();
  const authStore = useAuthStore();

  if (!auth.isSignedIn.value) return;
  if (authStore.canAccessManagementConsole) return;

  if (NonManagerAllowedPathRegexes.some(regex => regex.test(to.path))) return;

  return navigateTo('/user', { replace: true });
});
