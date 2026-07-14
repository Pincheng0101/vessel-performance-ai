class Passkey {
  constructor({
    authenticatorAttachment,
    authenticatorTransports,
    createdAt,
    credentialId,
    friendlyName,
    relyingPartyId,
  } = {}) {
    this.authenticatorAttachment = authenticatorAttachment;
    this.authenticatorTransports = authenticatorTransports;
    this.createdAt = createdAt;
    this.credentialId = credentialId;
    this.friendlyName = friendlyName;
    this.relyingPartyId = relyingPartyId;
  }

  get id() {
    return this.credentialId;
  }
}

export default Passkey;
