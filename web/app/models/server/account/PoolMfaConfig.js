import { AccountConstant } from '~/constants';

class PoolMfaConfig {
  constructor({
    mfaConfiguration,
    softwareTokenMfaEnabled,
    webAuthnFactor,
    webAuthnRelyingPartyId,
    webAuthnUserVerification,
  } = {}) {
    this.mfaConfiguration = mfaConfiguration;
    this.softwareTokenMfaEnabled = softwareTokenMfaEnabled;
    this.webAuthnFactor = webAuthnFactor;
    this.webAuthnRelyingPartyId = webAuthnRelyingPartyId;
    this.webAuthnUserVerification = webAuthnUserVerification;
  }

  get displayFields() {
    const { $i18n } = useNuxtApp();
    const uvI18n = findField(AccountConstant.WebAuthnUserVerification, this.webAuthnUserVerification, 'i18nTitle');
    return [
      { title: $i18n.t('__fieldMfaMode'), value: $i18n.t(findField(AccountConstant.MfaConfiguration, this.mfaConfiguration, 'i18nTitle')), isChip: true, chipOptions: { color: findField(AccountConstant.MfaConfiguration, this.mfaConfiguration, 'color') } },
      { title: $i18n.t('__fieldMfaTotp'), value: this.softwareTokenMfaEnabled ? $i18n.t('__fieldEnabled') : $i18n.t('__fieldDisabled'), isChip: true, chipOptions: { color: this.softwareTokenMfaEnabled ? 'success' : null } },
      { title: $i18n.t('__fieldWebAuthnUserVerification'), value: uvI18n ? $i18n.t(uvI18n) : '-', isChip: true, chipOptions: { color: findField(AccountConstant.WebAuthnUserVerification, this.webAuthnUserVerification, 'color') } },
    ];
  }
}

export default PoolMfaConfig;
