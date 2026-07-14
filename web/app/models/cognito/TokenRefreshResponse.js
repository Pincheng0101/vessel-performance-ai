/**
 * This class receives data from the API with parameters in snake_case.
 */
class TokenRefreshResponse {
  constructor({
    access_token,
    expires_in,
    id_token,
    token_type,
  } = {}) {
    this.accessToken = access_token;
    this.expiresIn = expires_in;
    this.idToken = id_token;
    this.tokenType = token_type;
  }
}

export default TokenRefreshResponse;
