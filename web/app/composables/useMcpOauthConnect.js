import { CookieConstant } from '~/constants';

const POPUP_WIDTH = 600;
const POPUP_HEIGHT = 700;
const CONNECT_TIMEOUT_MS = 120000; // 2 minutes

const openCenteredPopup = (url) => {
  const left = (window.screen.width - POPUP_WIDTH) / 2;
  const top = (window.screen.height - POPUP_HEIGHT) / 2;
  return window.open(
    url,
    'mcp_oauth_popup',
    `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top},scrollbars=yes`,
  );
};

const waitForAuthorizationCode = (expectedState, popup, signal) => {
  return new Promise((resolve, reject) => {
    const channel = new BroadcastChannel(CookieConstant.McpOauth.CALLBACK_CHANNEL);
    let settled = false;

    const settle = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      channel.close();
      signal?.removeEventListener('abort', onAbort);
      fn(value);
    };

    const onAbort = () => settle(reject, new Error('__aborted'));

    const timer = setTimeout(() => {
      popup?.close();
      settle(reject, new Error('__messageMcpOauthTimeout'));
    }, CONNECT_TIMEOUT_MS);

    if (signal?.aborted) return onAbort();
    signal?.addEventListener('abort', onAbort);

    channel.onmessage = ({ data }) => {
      const { code, state, error, errorDescription } = data || {};
      if (!code && !error) return;
      if (state !== expectedState) return;
      if (error || !code) return settle(reject, new Error(errorDescription || error || '__messageMcpOauthNoToken'));
      settle(resolve, code);
    };
  });
};

export const useMcpOauthConnect = (onSuccess) => {
  const { t } = useI18n();
  const { setToken, setRefreshToken, setClientId } = useMcpOauthToken();

  const connectingMap = reactive({});
  const errorMap = reactive({});
  const popups = {};
  const controllers = {};

  const isConnecting = mcpServerId => !!connectingMap[mcpServerId];
  const getError = mcpServerId => errorMap[mcpServerId] ?? null;

  const connect = async (mcpServerId, mcpEndpoint) => {
    if (connectingMap[mcpServerId]) return;
    connectingMap[mcpServerId] = true;
    delete errorMap[mcpServerId];

    const controller = new AbortController();
    controllers[mcpServerId] = controller;
    const { signal } = controller;

    const fail = (key) => {
      if (!signal.aborted) errorMap[mcpServerId] = t(key);
    };

    const redirectUri = `${window.location.origin}/oauth/callback`;
    const popup = openCenteredPopup('about:blank');
    popups[mcpServerId] = popup;

    try {
      if (!popup) {
        fail('__messageMcpOauthPopupBlocked');
        return;
      }

      // Two-step discovery (RFC 9728 -> RFC 8414).
      let authorizationServerUrl, metadata, resource, scope;
      try {
        ({ authorizationServerUrl, metadata, resource, scope } = await oauthUtils.discoverMetadata(mcpEndpoint));
      } catch {
        fail('__messageMcpOauthDiscoveryFailed');
        return;
      }

      // Dynamic client registration (RFC 7591)
      let clientInformation;
      try {
        clientInformation = await oauthUtils.registerClient(authorizationServerUrl, metadata, redirectUri);
      } catch {
        fail('__messageMcpOauthRegistrationFailed');
        return;
      }

      const state = `${mcpServerId}::${await strUtils.generateNonce()}`;

      // SDK builds the PKCE + authorization URL (incl. RFC 8707 resource).
      const { authorizationUrl, codeVerifier } = await oauthUtils.startAuthorization(authorizationServerUrl, {
        metadata,
        clientInformation,
        redirectUri,
        scope,
        state,
        resource,
      });

      if (signal.aborted) return;
      popup.location = authorizationUrl.toString();

      let code;
      try {
        code = await waitForAuthorizationCode(state, popup, signal);
      } catch (e) {
        if (signal.aborted) return;
        // '__'-prefixed = internal i18n key; otherwise the server's own error text, shown as-is.
        errorMap[mcpServerId] = e.message.startsWith('__') ? t(e.message) : e.message;
        return;
      }

      let tokens;
      try {
        tokens = await oauthUtils.exchangeToken(authorizationServerUrl, {
          metadata,
          clientInformation,
          code,
          codeVerifier,
          redirectUri,
          resource,
        });
      } catch {
        fail('__messageMcpOauthNoToken');
        return;
      }

      if (signal.aborted) return;
      setToken(mcpServerId, tokens.access_token, tokens.expires_in);
      setClientId(mcpServerId, clientInformation.client_id);
      if (tokens.refresh_token) setRefreshToken(mcpServerId, tokens.refresh_token);
      if (onSuccess) await onSuccess(mcpServerId);
    } catch {
      if (!errorMap[mcpServerId]) fail('__messageMcpOauthConnectFailed');
    } finally {
      if (controllers[mcpServerId] === controller) {
        if (errorMap[mcpServerId]) popup?.close();
        delete connectingMap[mcpServerId];
        delete popups[mcpServerId];
        delete controllers[mcpServerId];
      }
    }
  };

  const reset = () => {
    Object.keys(controllers).forEach((mcpServerId) => {
      controllers[mcpServerId].abort();
      delete controllers[mcpServerId];
    });
    Object.keys(popups).forEach((mcpServerId) => {
      popups[mcpServerId]?.close();
      delete popups[mcpServerId];
    });
    Object.keys(connectingMap).forEach(mcpServerId => delete connectingMap[mcpServerId]);
    Object.keys(errorMap).forEach(mcpServerId => delete errorMap[mcpServerId]);
  };

  return {
    connect,
    reset,
    isConnecting,
    getError,
  };
};
