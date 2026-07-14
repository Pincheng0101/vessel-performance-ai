import { TokenCreateResponse, TokenRefreshResponse } from '~/models/cognito';

export function useCognito() {
  const { baseURL } = useRuntimeConfig().app;
  const { awsCognitoApiUrl, awsCognitoClientId } = useRuntimeConfig().public;

  const client = createClient({
    baseURL: awsCognitoApiUrl,
  });

  const redirectToSignIn = ({
    formData: {
      codeChallenge: code_challenge,
      lang,
      nonce,
      state,
    },
  }) => {
    const params = new URLSearchParams({
      client_id: awsCognitoClientId,
      code_challenge_method: 'S256',
      code_challenge,
      lang,
      nonce,
      redirect_uri: `${window.location.origin}${baseURL}auth/callback`,
      response_type: 'code',
      scope: 'openid profile email aws.cognito.signin.user.admin',
      state,
    });
    window.location.href = `${awsCognitoApiUrl}/login?${params.toString()}`;
  };

  const redirectToSignOut = () => {
    const params = new URLSearchParams({
      client_id: awsCognitoClientId,
      logout_uri: `${window.location.origin}${baseURL.replace(/\/$/, '')}`,
    });
    window.location.href = `${awsCognitoApiUrl}/logout?${params.toString()}`;
  };

  const redirectToPasskeyRegistration = async ({ redirect }) => {
    const stateToken = window.btoa(JSON.stringify({ redirect }));
    const nonce = await strUtils.generateNonce();
    const codeVerifier = await strUtils.generateNonce();
    const codeChallenge = strUtils.toBase64Url(await strUtils.toSha256(codeVerifier));

    const params = new URLSearchParams({
      client_id: awsCognitoClientId,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      nonce,
      redirect_uri: `${window.location.origin}${baseURL}user?tab=security`,
      response_type: 'code',
      scope: 'openid profile email aws.cognito.signin.user.admin',
      state: stateToken,
    });
    window.location.href = `${awsCognitoApiUrl}/passkeys/add?${params.toString()}`;
  };

  /**
   * @returns {Promise<{ data: Ref<TokenCreateResponse> }>}
   */
  const createToken = ({
    formData: {
      redirectUri: redirect_uri,
      code,
      codeVerifier: code_verifier,
    },
  }) => {
    return client.post('/oauth2/token', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      params: {
        grant_type: 'authorization_code',
        client_id: awsCognitoClientId,
        redirect_uri,
        code,
        code_verifier,
      },
      onResponse: ({ response }) => {
        if (response.ok) {
          response._data = new TokenCreateResponse(response._data);
        }
      },
    });
  };

  /**
   * @returns {Promise<{ data: Ref<TokenRefreshResponse> }>}
   */
  const refreshToken = ({
    refreshToken: refresh_token,
  }) => {
    return client.post('/oauth2/token', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      params: {
        grant_type: 'refresh_token',
        client_id: awsCognitoClientId,
        refresh_token,
      },
      onResponse: ({ response }) => {
        if (response.ok) {
          response._data = new TokenRefreshResponse(response._data);
        }
      },
    });
  };

  return {
    redirectToSignIn,
    redirectToSignOut,
    redirectToPasskeyRegistration,
    createToken,
    refreshToken,
  };
}
