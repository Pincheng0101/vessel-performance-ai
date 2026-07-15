import { defineStore } from 'pinia';
import * as CookieConstant from '~/constants/CookieConstant';
import { Token } from '~/models/cognito';

export const useAuthStore = defineStore('auth', () => {
  const accessToken = useCookie(CookieConstant.Auth.ACCESS_TOKEN, { secure: true, sameSite: true, maxAge: 86400 * 7 });
  const refreshToken = useCookie(CookieConstant.Auth.REFRESH_TOKEN, { secure: true, sameSite: true, maxAge: 86400 * 7 });

  const setAccessToken = (v) => {
    accessToken.value = v;
  };
  const setRefreshToken = (v) => {
    refreshToken.value = v;
  };

  const parsedToken = computed(() => {
    // Returns an empty Token (rather than null) when there is no valid access token, so the
    // ~30 call sites that read parsedToken.sub/.isAdmin/.username stay safe during the brief
    // window when the token is cleared (e.g. a failed refresh) before navigation completes.
    if (!accessToken.value) return new Token();
    try {
      return new Token(jwtUtils.decode(accessToken.value));
    } catch (error) {
      console.error(error);
      return new Token();
    }
  });

  const canAccessManagementConsole = computed(() => {
    const { hasManagementConsoleGroups, managementConsoleGroups } = useDeploymentConfig();
    if (!hasManagementConsoleGroups) return true;
    const token = parsedToken.value;
    if (!token) return false;
    return token.cognitoGroups.some(group => managementConsoleGroups.includes(group));
  });

  return {
    accessToken,
    refreshToken,
    setAccessToken,
    setRefreshToken,
    parsedToken,
    canAccessManagementConsole,
  };
});
