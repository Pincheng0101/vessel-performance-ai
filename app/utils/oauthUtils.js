import { CookieConstant } from '~/constants';

const POPUP_WIDTH = 600;
const POPUP_HEIGHT = 700;
const FLOW_TIMEOUT_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 30 * 1000;
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

// Dynamically import the MCP SDK auth helpers so they (and zod) stay out of the initial
// bundle — the OAuth flow only runs when a user tests an OAuth-authenticated MCP server.
const loadSdkAuth = () => import('@modelcontextprotocol/sdk/client/auth.js');

// Request URLs ultimately derive from user input (the MCP endpoint) and untrusted server metadata
// Reject any non-HTTP(S) scheme (e.g. file:, data:) at this single outbound choke point before a request is made — defense in depth against SSRF
// Hosts are not restricted: testing internal/localhost MCP servers is a legitimate enterprise use case
const assertHttpUrl = (url) => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('invalid_url');
  }
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) throw new Error('invalid_url');
};

// SDK requests carry no timeout of their own; a hung server would stall the flow
// with no feedback, so every request is bounded
const fetchWithTimeout = async (url, init = {}) => {
  assertHttpUrl(url);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    // url is validated by assertHttpUrl() above via a protocol allowlist at this single outbound choke point; SPA fetch runs in the browser under CORS, so SSRF does not apply
    // nosemgrep: nodejs_scan.javascript-ssrf-rule-node_ssrf
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('timeout');
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
};

const CLIENT_METADATA = Object.freeze({
  client_name: 'Langforge Enterprise',
  token_endpoint_auth_method: 'none',
  grant_types: ['authorization_code', 'refresh_token'],
  response_types: ['code'],
});

class oauthUtils {
  /**
   * Generates a cryptographically random OAuth state parameter.
   *
   * @static
   * @returns {string} A hex-encoded random string.
   */
  static generateState() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Discovers OAuth metadata for an MCP server in two steps via the SDK (RFC 9728
   * protected-resource metadata -> RFC 8414 authorization-server metadata). The
   * authorization server may live on a different origin than the MCP server.
   *
   * @static
   * @param {string} endpointUrl - The MCP server endpoint URL.
   * @returns {Promise<{ authorizationServerUrl: string, metadata: object, resource?: string, scope?: string }>}
   */
  static async discoverMetadata(endpointUrl) {
    const sdk = await loadSdkAuth();
    let resourceMetadata, authorizationServerUrl, metadata;
    try {
      resourceMetadata = await sdk.discoverOAuthProtectedResourceMetadata(endpointUrl, undefined, fetchWithTimeout);
      authorizationServerUrl = resourceMetadata.authorization_servers?.[0];
      metadata = authorizationServerUrl
        ? await sdk.discoverAuthorizationServerMetadata(authorizationServerUrl, { fetchFn: fetchWithTimeout })
        : null;
    } catch (e) {
      throw new Error(e.message === 'timeout' ? 'timeout' : 'discovery_failed');
    }
    if (!authorizationServerUrl || !metadata) throw new Error('discovery_failed');
    return {
      authorizationServerUrl,
      metadata,
      resource: resourceMetadata.resource,
      scope: resourceMetadata.scopes_supported?.join(' ') || metadata.scopes_supported?.join(' '),
    };
  }

  /**
   * Dynamically registers an OAuth client (RFC 7591) via the SDK.
   *
   * @static
   * @param {string} authorizationServerUrl - The authorization server issuer URL.
   * @param {object} metadata - The authorization server metadata.
   * @param {string} redirectUri - The redirect URI to register for the authorization code flow.
   * @returns {Promise<object>} The registered client information (incl. client_id).
   */
  static async registerClient(authorizationServerUrl, metadata, redirectUri) {
    if (!metadata?.registration_endpoint) throw new Error('registration_unsupported');
    const sdk = await loadSdkAuth();
    try {
      return await sdk.registerClient(authorizationServerUrl, {
        metadata,
        clientMetadata: { ...CLIENT_METADATA, redirect_uris: [redirectUri] },
        fetchFn: fetchWithTimeout,
      });
    } catch (e) {
      throw new Error(e.message === 'timeout' ? 'timeout' : 'registration_failed');
    }
  }

  /**
   * Builds the authorization URL and PKCE verifier via the SDK (incl. the RFC 8707
   * resource parameter).
   *
   * @static
   * @param {string} authorizationServerUrl - The authorization server issuer URL.
   * @param {{ metadata: object, clientInformation: object, redirectUri: string, scope?: string, state: string, resource?: string }} params
   * @returns {Promise<{ authorizationUrl: URL, codeVerifier: string }>}
   */
  static async startAuthorization(authorizationServerUrl, { metadata, clientInformation, redirectUri, scope, state, resource }) {
    const sdk = await loadSdkAuth();
    const result = await sdk.startAuthorization(authorizationServerUrl, {
      metadata,
      clientInformation,
      redirectUrl: redirectUri,
      scope,
      state,
      resource: resource ? new URL(resource) : undefined,
    });
    // The URL derives from untrusted metadata; a non-HTTP scheme (e.g. javascript:)
    // assigned to popup.location would execute in the app's origin.
    if (!['http:', 'https:'].includes(result.authorizationUrl.protocol)) throw new Error('discovery_failed');
    return result;
  }

  /**
   * Opens a centered browser popup for the OAuth authorization flow.
   *
   * @static
   * @param {string} url - The authorization URL to open in the popup.
   * @returns {Window|null} The popup window reference, or null if blocked by the browser.
   */
  static openPopup(url) {
    const left = Math.round(window.screenX + (window.outerWidth - POPUP_WIDTH) / 2);
    const top = Math.round(window.screenY + (window.outerHeight - POPUP_HEIGHT) / 2);
    return window.open(url, 'oauth_popup', `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top}`);
  }

  /**
   * Resolves with the authorization code broadcast from the callback page via
   * BroadcastChannel, or rejects on timeout/cancel/error. BroadcastChannel is used
   * instead of window.opener.postMessage because auth servers commonly set
   * Cross-Origin-Opener-Policy: same-origin, which severs the opener reference. The same
   * COOP also makes the popup's `closed` flag read as true once it navigates to the auth
   * page, so popup closure cannot be reliably detected and is not used as a cancel signal.
   *
   * @static
   * @param {string} expectedState - The OAuth state value to verify against the callback message.
   * @param {(cancel: () => void) => void} registerCancel - Called immediately with a cancel function
   *   that the caller can invoke to abort the wait.
   * @returns {Promise<string>} The authorization code from the callback.
   */
  static waitForCode(expectedState, registerCancel) {
    return new Promise((resolve, reject) => {
      let settled = false;

      const settle = (fn, value) => {
        if (settled) return;
        settled = true;
        cleanup();
        fn(value);
      };

      registerCancel(() => settle(reject, new Error('cancelled')));

      const timeoutId = setTimeout(() => settle(reject, new Error('timeout')), FLOW_TIMEOUT_MS);

      const channel = new BroadcastChannel(CookieConstant.McpOauth.CALLBACK_CHANNEL);
      channel.onmessage = ({ data }) => {
        const { code, state, error, errorDescription } = data || {};
        if (!code && !error) return;
        if (error) return settle(reject, new Error(errorDescription || error));
        // Ignore messages from other concurrent flows/tabs (the channel is shared
        // same-origin); only our matching state resolves, and the timeout covers a
        // code that never arrives.
        if (state !== expectedState) return;
        settle(resolve, code);
      };

      const cleanup = () => {
        clearTimeout(timeoutId);
        channel.close();
      };
    });
  }

  /**
   * Exchanges an authorization code for an access token via the SDK (incl. the RFC 8707
   * resource parameter; must match the authorization request).
   *
   * @static
   * @param {string} authorizationServerUrl - The authorization server issuer URL.
   * @param {{ metadata: object, clientInformation: object, code: string, codeVerifier: string, redirectUri: string, resource?: string }} params
   * @returns {Promise<object>} The token response (access_token, expires_in, refresh_token, ...).
   */
  static async exchangeToken(authorizationServerUrl, { metadata, clientInformation, code, codeVerifier, redirectUri, resource }) {
    const sdk = await loadSdkAuth();
    let tokens;
    try {
      tokens = await sdk.exchangeAuthorization(authorizationServerUrl, {
        metadata,
        clientInformation,
        authorizationCode: code,
        codeVerifier,
        redirectUri,
        resource: resource ? new URL(resource) : undefined,
        fetchFn: fetchWithTimeout,
      });
    } catch (e) {
      throw new Error(e.message === 'timeout' ? 'timeout' : 'token_exchange_failed');
    }
    if (!tokens?.access_token) throw new Error('no_access_token');
    return tokens;
  }

  /**
   * Refreshes an access token using a stored refresh token via the SDK (RFC 6749 refresh).
   * The refresh token must be used with the client it was issued to, and the RFC 8707
   * resource must match the original authorization.
   *
   * @static
   * @param {string} authorizationServerUrl - The authorization server issuer URL.
   * @param {{ metadata: object, clientInformation: object, refreshToken: string, resource?: string }} params
   * @returns {Promise<object>} The refreshed token response (access_token, expires_in, refresh_token, ...).
   */
  static async refreshToken(authorizationServerUrl, { metadata, clientInformation, refreshToken, resource }) {
    const sdk = await loadSdkAuth();
    let tokens;
    try {
      tokens = await sdk.refreshAuthorization(authorizationServerUrl, {
        metadata,
        clientInformation,
        refreshToken,
        resource: resource ? new URL(resource) : undefined,
        fetchFn: fetchWithTimeout,
      });
    } catch (e) {
      throw new Error(e.message === 'timeout' ? 'timeout' : 'token_refresh_failed');
    }
    if (!tokens?.access_token) throw new Error('no_access_token');
    return tokens;
  }
}

export default oauthUtils;
