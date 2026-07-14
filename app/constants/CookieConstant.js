const Auth = Object.freeze({
  ACCESS_TOKEN: 'access_token',
  CODE_VERIFIER: 'code_verifier',
  CODE: 'code',
  NONCE: 'nonce',
  REFRESH_TOKEN: 'refresh_token',
  STATE: 'state',
});

const Base = Object.freeze({
  LOCALE: 'locale',
  THEME: 'theme',
});

const McpOauth = Object.freeze({
  CALLBACK_CHANNEL: 'oauth_callback',
  CLIENT_ID_PREFIX: 'mcp_oauth_client_id',
  HAS_CONNECTED_PREFIX: 'mcp_oauth_has_connected',
  MAX_AGE_TOKEN_FALLBACK: 3600, // 1 hour
  MAX_AGE_TOKEN: 86400 * 7, // 7 days
  REFRESH_TOKEN_PREFIX: 'mcp_oauth_refresh_token',
  TOKEN_PREFIX: 'mcp_oauth_token',
});

export {
  Auth,
  Base,
  McpOauth,
};
