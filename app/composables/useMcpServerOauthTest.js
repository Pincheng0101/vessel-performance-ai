// Codes raised inside the flow; anything not listed here is the auth server's own error text, shown as-is.
const INTERNAL_OAUTH_ERRORS = new Set([
  'cancelled', 'timeout', 'validate_failed', 'registration_failed', 'token_exchange_failed', 'no_access_token',
]);

const OAUTH_ERROR_MESSAGE_KEYS = {
  discovery_failed: '__messageOauthTestDiscoveryFailed',
  registration_unsupported: '__messageOauthRegistrationUnsupported',
  popup_blocked: '__messageOauthPopupBlocked',
};

export function useMcpServerOauthTest() {
  const { t } = useI18n();
  const snackbarStore = useSnackbarStore();
  const server = useServer();

  const isOauthDialogOpen = ref(false);
  const isWaitingAuth = ref(false);
  const isTestingAuth = ref(false);
  const isTestingConnection = ref(false);

  let storedParams = null;
  let cancelCurrentFlow = null;
  let aborted = false;

  const resolveOauthErrorMessage = (message, fallbackKey, action) => {
    if (OAUTH_ERROR_MESSAGE_KEYS[message]) return t(OAUTH_ERROR_MESSAGE_KEYS[message], { action });
    if (!message || INTERNAL_OAUTH_ERRORS.has(message)) return t(fallbackKey, { action });
    return message;
  };

  // Must be called synchronously from a user gesture so the popup is not blocked
  const runOauthFlow = async (endpointUrl, popup, onCode) => {
    const redirectUri = `${window.location.origin}/oauth/callback`;

    const { authorizationServerUrl, metadata, resource, scope } = await oauthUtils.discoverMetadata(endpointUrl);
    if (aborted) throw new Error('cancelled');

    const clientInformation = await oauthUtils.registerClient(authorizationServerUrl, metadata, redirectUri);
    if (aborted) throw new Error('cancelled');

    const state = oauthUtils.generateState();
    // The SDK builds the authorization URL + PKCE verifier (incl. the RFC 8707 resource).
    const { authorizationUrl, codeVerifier } = await oauthUtils.startAuthorization(authorizationServerUrl, {
      metadata,
      clientInformation,
      redirectUri,
      scope,
      state,
      resource,
    });

    if (popup) popup.location = authorizationUrl.toString();

    const code = await oauthUtils.waitForCode(state, cancel => cancelCurrentFlow = cancel);
    cancelCurrentFlow = null;
    onCode?.();

    const tokens = await oauthUtils.exchangeToken(authorizationServerUrl, {
      metadata,
      clientInformation,
      code,
      codeVerifier,
      redirectUri,
      resource,
    });
    return tokens.access_token;
  };

  const cancelOauthFlow = () => {
    aborted = true;
    cancelCurrentFlow?.();
    cancelCurrentFlow = null;
    isOauthDialogOpen.value = false;
    isWaitingAuth.value = false;
    storedParams = null;
  };

  const startAuthorization = async () => {
    if (!storedParams) return;
    const { endpointUrl, auth, mcpServerType } = storedParams;

    aborted = false;
    isWaitingAuth.value = true;

    const popup = oauthUtils.openPopup('about:blank');

    try {
      if (!popup) throw new Error('popup_blocked');

      const accessToken = await runOauthFlow(endpointUrl, popup, () => {
        isOauthDialogOpen.value = false;
        isWaitingAuth.value = false;
        isTestingAuth.value = true;
      });

      const { data, error } = await server.mcpServer.validate({ endpointUrl, auth, accessToken, mcpServerType });
      if (error.value || !data.value?.valid) throw new Error('validate_failed');

      snackbarStore.setSuccess(t('__messageResourceValidateSuccessfully', { action: t('__actionTestConnection') }));
    } catch (e) {
      popup?.close();
      if (aborted) return;
      isOauthDialogOpen.value = false;
      isWaitingAuth.value = false;
      if (e.message !== 'cancelled') {
        snackbarStore.setFailure(resolveOauthErrorMessage(e.message, '__messageResourceValidateFailed', t('__actionTestConnection')));
      }
    } finally {
      isTestingAuth.value = false;
      storedParams = null;
    }
  };

  const testOauthFlow = (endpointUrl, auth, mcpServerType) => {
    if (!endpointUrl) {
      snackbarStore.setFailure(t('__messageOauthTestEndpointRequired'));
      return;
    }
    storedParams = { endpointUrl, auth, mcpServerType };
    aborted = false;
    isOauthDialogOpen.value = true;
    isWaitingAuth.value = false;
  };

  const testConnection = async ({ endpointUrl, auth, mcpServerType }) => {
    isTestingConnection.value = true;
    const { data, error } = await server.mcpServer.validate({ endpointUrl, auth, mcpServerType });
    if (!error.value) {
      const action = t('__actionTestConnection');
      if (data.value?.valid) {
        snackbarStore.setSuccess(t('__messageResourceValidateSuccessfully', { action }));
      } else {
        snackbarStore.setFailure(t('__messageResourceValidateFailed', { action }));
      }
    }
    isTestingConnection.value = false;
  };

  const authorize = async (endpointUrl) => {
    cancelCurrentFlow?.();
    cancelCurrentFlow = null;
    aborted = false;

    const popup = oauthUtils.openPopup('about:blank');

    try {
      if (!popup) throw new Error('popup_blocked');
      return await runOauthFlow(endpointUrl, popup);
    } catch (e) {
      popup?.close();
      if (aborted || e.message === 'cancelled') return null;
      snackbarStore.setFailure(resolveOauthErrorMessage(e.message, '__messageOauthAuthorizationFailed', t('__actionAuthorize')));
      return null;
    }
  };

  return {
    isOauthDialogOpen,
    isWaitingAuth,
    isTestingAuth,
    isTestingConnection,
    testOauthFlow,
    testConnection,
    authorize,
    startAuthorization,
    cancelOauthFlow,
  };
}
