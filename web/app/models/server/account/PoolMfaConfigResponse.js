import PoolMfaConfig from './PoolMfaConfig';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class PoolMfaConfigResponse extends PoolMfaConfig {
  constructor({
    mfa_configuration,
    software_token_mfa_enabled,
    web_authn_factor,
    web_authn_relying_party_id,
    web_authn_user_verification,
  } = {}) {
    super({
      mfaConfiguration: mfa_configuration,
      softwareTokenMfaEnabled: software_token_mfa_enabled,
      webAuthnFactor: web_authn_factor,
      webAuthnRelyingPartyId: web_authn_relying_party_id,
      webAuthnUserVerification: web_authn_user_verification,
    });
  }
}

export default PoolMfaConfigResponse;
