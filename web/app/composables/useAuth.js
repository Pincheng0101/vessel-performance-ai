export function useAuth() {
  const { $i18n } = useNuxtApp();
  const authStore = useAuthStore();
  const cognito = useCognito();
  const dayjs = useDayjs();
  const snackbarStore = useSnackbarStore();

  const isSignedIn = computed(() => {
    return !!authStore.accessToken && !!authStore.refreshToken;
  });

  const isTokenExpired = () => {
    try {
      const { exp } = jwtUtils.decode(authStore.accessToken);
      return dayjs().isAfter(dayjs.unix(exp));
    } catch {
      return true;
    }
  };

  const refresh = async () => {
    if (!isTokenExpired()) return;
    const { data, error } = await cognito.refreshToken({
      refreshToken: authStore.refreshToken,
    });
    if (error.value) {
      return abort();
    }
    authStore.setAccessToken(data.value.accessToken);
  };

  const abort = ({ redirect } = {}) => {
    authStore.setAccessToken(null);
    authStore.setRefreshToken(null);
    snackbarStore.setFailure($i18n.t('__messageUnauthorized'));
    return navigateTo({ name: 'index', query: { redirect } });
  };

  const signOut = async () => {
    const server = useServer();
    await server.user.globalSignOut();
    // Needs the still-signed-in user id, so run before the auth tokens are cleared
    useMcpOauthToken().clearAllForCurrentUser();
    authStore.setAccessToken(null);
    authStore.setRefreshToken(null);
    cognito.redirectToSignOut();
  };

  return {
    abort,
    isSignedIn,
    refresh,
    signOut,
  };
}
