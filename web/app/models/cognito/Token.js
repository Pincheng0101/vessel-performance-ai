import * as AccountConstant from '~/constants/AccountConstant';

/**
 * This class receives data from the token with parameters in snake_case.
 */
class Token {
  constructor(payload = {}) {
    this.authTime = payload.auth_time;
    this.clientId = payload.client_id;
    this.cognitoGroups = payload['cognito:groups'] || [];
    this.exp = payload.exp;
    this.iat = payload.iat;
    this.iss = payload.iss;
    this.jti = payload.jti;
    this.originJti = payload.origin_jti;
    this.scope = payload.scope;
    this.sub = payload.sub;
    this.tokenUse = payload.token_use;
    this.username = payload.username;
    this.version = payload.version;
  }

  get isAdmin() {
    return this.cognitoGroups.includes(AccountConstant.Group.ADMIN.value);
  }
}

export default Token;
