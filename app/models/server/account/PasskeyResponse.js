import Passkey from './Passkey';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class PasskeyResponse extends Passkey {
  constructor({
    authenticator_attachment,
    authenticator_transports,
    created_at,
    credential_id,
    friendly_name,
    relying_party_id,
  } = {}) {
    super({
      authenticatorAttachment: authenticator_attachment,
      authenticatorTransports: authenticator_transports,
      createdAt: created_at,
      credentialId: credential_id,
      friendlyName: friendly_name,
      relyingPartyId: relying_party_id,
    });
  }
}

export default PasskeyResponse;
