/**
 * This class receives data from the API with parameters in snake_case.
 */
class TokenCreateResponse {
  constructor({
    access_token,
    expires_in,
    id_token,
    refresh_token,
    token_type,
  } = {}) {
    this.accessToken = access_token;
    this.expiresIn = expires_in;
    this.idToken = id_token;
    this.refreshToken = refresh_token;
    this.tokenType = token_type;
  }
}

export default TokenCreateResponse;
