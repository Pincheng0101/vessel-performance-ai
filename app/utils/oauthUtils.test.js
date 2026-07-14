// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from 'vitest';
import oauthUtils from './oauthUtils';

const authMock = vi.hoisted(() => ({
  discoverOAuthProtectedResourceMetadata: vi.fn(),
  discoverAuthorizationServerMetadata: vi.fn(),
  registerClient: vi.fn(),
  startAuthorization: vi.fn(),
  exchangeAuthorization: vi.fn(),
  refreshAuthorization: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/client/auth.js', () => authMock);

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  Object.values(authMock).forEach(fn => fn.mockReset());
});

describe('oauthUtils.generateState', () => {
  test('returns a 32-character hex string', () => {
    expect(oauthUtils.generateState()).toMatch(/^[0-9a-f]{32}$/);
  });

  test('returns a different value on each call', () => {
    expect(oauthUtils.generateState()).not.toBe(oauthUtils.generateState());
  });
});

describe('oauthUtils.discoverMetadata', () => {
  test('returns the authorization server, resource and scope from the SDK metadata', async () => {
    authMock.discoverOAuthProtectedResourceMetadata.mockResolvedValue({
      resource: 'https://mcp.example.com/mcp',
      authorization_servers: ['https://auth.example.com'],
      scopes_supported: ['openid', 'profile'],
    });
    authMock.discoverAuthorizationServerMetadata.mockResolvedValue({
      authorization_endpoint: 'https://auth.example.com/authorize',
      token_endpoint: 'https://auth.example.com/token',
    });

    const result = await oauthUtils.discoverMetadata('https://mcp.example.com/mcp');

    expect(result.authorizationServerUrl).toBe('https://auth.example.com');
    expect(result.resource).toBe('https://mcp.example.com/mcp');
    expect(result.scope).toBe('openid profile');
  });

  test('throws discovery_failed when no authorization server is advertised', async () => {
    authMock.discoverOAuthProtectedResourceMetadata.mockResolvedValue({ resource: 'https://mcp.example.com/mcp' });
    await expect(oauthUtils.discoverMetadata('https://mcp.example.com/mcp')).rejects.toThrow('discovery_failed');
  });

  test('throws discovery_failed when the protected-resource request fails', async () => {
    authMock.discoverOAuthProtectedResourceMetadata.mockRejectedValue(new Error('network'));
    await expect(oauthUtils.discoverMetadata('https://mcp.example.com/mcp')).rejects.toThrow('discovery_failed');
  });

  test('throws timeout when a discovery request hangs past the request timeout', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockImplementation((url, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));
    authMock.discoverOAuthProtectedResourceMetadata.mockImplementation((url, opts, fetchFn) => fetchFn('https://mcp.example.com/.well-known/oauth-protected-resource'));
    const promise = oauthUtils.discoverMetadata('https://mcp.example.com/mcp');
    const assertion = expect(promise).rejects.toThrow('timeout');

    await vi.advanceTimersByTimeAsync(30 * 1000);
    await assertion;
  });
});

describe('oauthUtils.registerClient', () => {
  const REDIRECT_URI = 'https://app.example.com/oauth/callback';
  const METADATA = { registration_endpoint: 'https://auth.example.com/register' };

  test('delegates to the SDK and registers the redirect URI', async () => {
    const client = { client_id: 'abc123' };
    authMock.registerClient.mockResolvedValue(client);

    await expect(oauthUtils.registerClient('https://auth.example.com', METADATA, REDIRECT_URI)).resolves.toEqual(client);
    expect(authMock.registerClient.mock.calls[0][1].clientMetadata.redirect_uris).toEqual([REDIRECT_URI]);
  });

  test('throws registration_unsupported when the server has no registration endpoint', async () => {
    await expect(oauthUtils.registerClient('https://auth.example.com', {}, REDIRECT_URI)).rejects.toThrow('registration_unsupported');
  });

  test('throws registration_failed when the SDK registration throws', async () => {
    authMock.registerClient.mockRejectedValue(new Error('boom'));
    await expect(oauthUtils.registerClient('https://auth.example.com', METADATA, REDIRECT_URI)).rejects.toThrow('registration_failed');
  });
});

describe('oauthUtils.startAuthorization', () => {
  test('delegates to the SDK and passes the resource as a URL', async () => {
    authMock.startAuthorization.mockResolvedValue({
      authorizationUrl: new URL('https://auth.example.com/authorize'),
      codeVerifier: 'verifier',
    });

    const result = await oauthUtils.startAuthorization('https://auth.example.com', {
      metadata: {},
      clientInformation: { client_id: 'abc' },
      redirectUri: 'https://app.example.com/oauth/callback',
      scope: 'openid',
      state: 'state-abc',
      resource: 'https://mcp.example.com/mcp',
    });

    expect(result.codeVerifier).toBe('verifier');
    expect(authMock.startAuthorization.mock.calls[0][1].resource).toEqual(new URL('https://mcp.example.com/mcp'));
  });

  test('throws discovery_failed when the authorization URL has a non-HTTP scheme', async () => {
    authMock.startAuthorization.mockResolvedValue({
      authorizationUrl: new URL('javascript:alert(1)'),
      codeVerifier: 'verifier',
    });

    await expect(oauthUtils.startAuthorization('https://auth.example.com', {
      metadata: {},
      clientInformation: { client_id: 'abc' },
      redirectUri: 'https://app.example.com/oauth/callback',
      state: 'state-abc',
    })).rejects.toThrow('discovery_failed');
  });
});

describe('oauthUtils.openPopup', () => {
  test('opens a window with the given URL, a fixed name, and the configured dimensions', () => {
    const spy = vi.spyOn(window, 'open').mockReturnValue(null);

    oauthUtils.openPopup('https://auth.example.com/authorize');

    expect(spy).toHaveBeenCalledWith(
      'https://auth.example.com/authorize',
      'oauth_popup',
      expect.stringMatching(/width=600.*height=700/),
    );
  });
});

describe('oauthUtils.waitForCode', () => {
  test('resolves with the authorization code from a BroadcastChannel message', async () => {
    const promise = oauthUtils.waitForCode('state-abc', () => {});

    const sender = new BroadcastChannel('oauth_callback');
    sender.postMessage({ code: 'auth-code', state: 'state-abc' });
    sender.close();

    await expect(promise).resolves.toBe('auth-code');
  });

  test('ignores a message whose state does not match and resolves with the matching one', async () => {
    const promise = oauthUtils.waitForCode('state-abc', () => {});

    const sender = new BroadcastChannel('oauth_callback');
    sender.postMessage({ code: 'other-flow-code', state: 'wrong-state' });
    sender.postMessage({ code: 'auth-code', state: 'state-abc' });
    sender.close();

    await expect(promise).resolves.toBe('auth-code');
  });

  test('rejects with the error string from the callback message', async () => {
    const promise = oauthUtils.waitForCode('state-abc', () => {});

    const sender = new BroadcastChannel('oauth_callback');
    sender.postMessage({ error: 'access_denied' });
    sender.close();

    await expect(promise).rejects.toThrow('access_denied');
  });

  test('rejects with the error description when the callback provides one', async () => {
    const promise = oauthUtils.waitForCode('state-abc', () => {});

    const sender = new BroadcastChannel('oauth_callback');
    sender.postMessage({ error: 'access_denied', errorDescription: 'The user denied the request' });
    sender.close();

    await expect(promise).rejects.toThrow('The user denied the request');
  });

  test('rejects with cancelled when the cancel function is called', async () => {
    let cancel;
    const promise = oauthUtils.waitForCode('state-abc', fn => cancel = fn);

    cancel();

    await expect(promise).rejects.toThrow('cancelled');
  });

  test('rejects with timeout after the flow timeout elapses', async () => {
    vi.useFakeTimers();
    const promise = oauthUtils.waitForCode('state-abc', () => {});
    const assertion = expect(promise).rejects.toThrow('timeout');

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    await assertion;
  });
});

describe('oauthUtils.exchangeToken', () => {
  const PARAMS = {
    metadata: {},
    clientInformation: { client_id: 'abc' },
    code: 'auth-code',
    codeVerifier: 'verifier',
    redirectUri: 'https://app.example.com/oauth/callback',
    resource: 'https://mcp.example.com/mcp',
  };

  test('returns the token response and passes the resource as a URL', async () => {
    authMock.exchangeAuthorization.mockResolvedValue({ access_token: 'token-abc', refresh_token: 'refresh-abc', expires_in: 3600 });

    await expect(oauthUtils.exchangeToken('https://auth.example.com', PARAMS)).resolves.toEqual({ access_token: 'token-abc', refresh_token: 'refresh-abc', expires_in: 3600 });
    expect(authMock.exchangeAuthorization.mock.calls[0][1].resource).toEqual(new URL('https://mcp.example.com/mcp'));
  });

  test('throws token_exchange_failed when the SDK exchange throws', async () => {
    authMock.exchangeAuthorization.mockRejectedValue(new Error('boom'));
    await expect(oauthUtils.exchangeToken('https://auth.example.com', PARAMS)).rejects.toThrow('token_exchange_failed');
  });

  test('throws no_access_token when the response has no access token', async () => {
    authMock.exchangeAuthorization.mockResolvedValue({});
    await expect(oauthUtils.exchangeToken('https://auth.example.com', PARAMS)).rejects.toThrow('no_access_token');
  });
});

describe('oauthUtils.refreshToken', () => {
  const PARAMS = {
    metadata: {},
    clientInformation: { client_id: 'abc' },
    refreshToken: 'refresh-token',
    resource: 'https://mcp.example.com/mcp',
  };

  test('returns the token response and passes the resource as a URL', async () => {
    authMock.refreshAuthorization.mockResolvedValue({ access_token: 'token-new', refresh_token: 'refresh-new', expires_in: 3600 });

    await expect(oauthUtils.refreshToken('https://auth.example.com', PARAMS)).resolves.toEqual({ access_token: 'token-new', refresh_token: 'refresh-new', expires_in: 3600 });
    expect(authMock.refreshAuthorization.mock.calls[0][1].resource).toEqual(new URL('https://mcp.example.com/mcp'));
  });

  test('passes a fetchFn so the refresh request is bounded by a timeout', async () => {
    authMock.refreshAuthorization.mockResolvedValue({ access_token: 'token-new' });

    await oauthUtils.refreshToken('https://auth.example.com', PARAMS);
    expect(authMock.refreshAuthorization.mock.calls[0][1].fetchFn).toBeTypeOf('function');
  });

  test('throws token_refresh_failed when the SDK refresh throws', async () => {
    authMock.refreshAuthorization.mockRejectedValue(new Error('boom'));
    await expect(oauthUtils.refreshToken('https://auth.example.com', PARAMS)).rejects.toThrow('token_refresh_failed');
  });

  test('throws no_access_token when the response has no access token', async () => {
    authMock.refreshAuthorization.mockResolvedValue({});
    await expect(oauthUtils.refreshToken('https://auth.example.com', PARAMS)).rejects.toThrow('no_access_token');
  });
});
