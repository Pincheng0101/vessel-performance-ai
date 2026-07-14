import { CookieConstant } from '~/constants';

const cookieOptions = { secure: true, sameSite: true };

// Synchronous reactive mirror of the token cookies (useCookie writes are async-flushed, so a fresh token isn't readable on the next render). Module-scoped to stay shared.
const tokenCache = reactive({});

export const useMcpOauthToken = () => {
  const authStore = useAuthStore();

  const userId = computed(() => authStore.parsedToken?.sub);

  const key = (prefix, mcpServerId) => `${prefix}_${userId.value}_${mcpServerId}`;

  const read = (prefix, mcpServerId) => {
    const cacheKey = key(prefix, mcpServerId);
    if (!(cacheKey in tokenCache)) {
      tokenCache[cacheKey] = useCookie(cacheKey, { ...cookieOptions, maxAge: CookieConstant.McpOauth.MAX_AGE_TOKEN }).value ?? null;
    }
    return tokenCache[cacheKey];
  };

  const write = (prefix, mcpServerId, value, maxAge = CookieConstant.McpOauth.MAX_AGE_TOKEN) => {
    const cacheKey = key(prefix, mcpServerId);
    tokenCache[cacheKey] = value;
    useCookie(cacheKey, { ...cookieOptions, maxAge }).value = value;
  };

  const hasConnectedKey = mcpServerId => key(CookieConstant.McpOauth.HAS_CONNECTED_PREFIX, mcpServerId);

  const getHasConnected = (mcpServerId) => {
    if (!import.meta.client) return false;
    return localStorage.getItem(hasConnectedKey(mcpServerId)) === '1';
  };

  const getToken = mcpServerId => read(CookieConstant.McpOauth.TOKEN_PREFIX, mcpServerId);

  const setToken = (mcpServerId, token, expiresIn) => {
    // Use the token's lifetime; short fallback when expires_in is missing/invalid (don't trust for days).
    const maxAge = expiresIn > 0 ? expiresIn : CookieConstant.McpOauth.MAX_AGE_TOKEN_FALLBACK;
    write(CookieConstant.McpOauth.TOKEN_PREFIX, mcpServerId, token, maxAge);
    if (import.meta.client) {
      localStorage.setItem(hasConnectedKey(mcpServerId), '1');
    }
  };

  const getRefreshToken = mcpServerId => read(CookieConstant.McpOauth.REFRESH_TOKEN_PREFIX, mcpServerId);
  const setRefreshToken = (mcpServerId, value) => {
    write(CookieConstant.McpOauth.REFRESH_TOKEN_PREFIX, mcpServerId, value);
  };

  const getClientId = mcpServerId => read(CookieConstant.McpOauth.CLIENT_ID_PREFIX, mcpServerId);
  const setClientId = (mcpServerId, value) => {
    write(CookieConstant.McpOauth.CLIENT_ID_PREFIX, mcpServerId, value);
  };

  const clearToken = (mcpServerId) => {
    write(CookieConstant.McpOauth.TOKEN_PREFIX, mcpServerId, null);
    write(CookieConstant.McpOauth.REFRESH_TOKEN_PREFIX, mcpServerId, null);
    write(CookieConstant.McpOauth.CLIENT_ID_PREFIX, mcpServerId, null);
  };

  const clearAllForCurrentUser = () => {
    if (!import.meta.client || !userId.value) return;
    const prefixes = [
      CookieConstant.McpOauth.TOKEN_PREFIX,
      CookieConstant.McpOauth.REFRESH_TOKEN_PREFIX,
      CookieConstant.McpOauth.CLIENT_ID_PREFIX,
    ].map(prefix => `${prefix}_${userId.value}_`);
    document.cookie.split('; ').forEach((entry) => {
      const name = decodeURIComponent(entry.split('=')[0]);
      if (prefixes.some(prefix => name.startsWith(prefix))) {
        document.cookie = `${encodeURIComponent(name)}=; max-age=0; path=/`;
      }
    });
    Object.keys(tokenCache).forEach((cacheKey) => {
      if (prefixes.some(prefix => cacheKey.startsWith(prefix))) {
        delete tokenCache[cacheKey];
      }
    });
  };

  return {
    getHasConnected,
    getToken,
    setToken,
    getRefreshToken,
    setRefreshToken,
    getClientId,
    setClientId,
    clearToken,
    clearAllForCurrentUser,
  };
};
