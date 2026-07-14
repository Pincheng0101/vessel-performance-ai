import { AccountConstant } from '~/constants';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class User {
  constructor({
    createdTs,
    email,
    emailVerified,
    enabled,
    identityProvider,
    isAdmin,
    messageAction,
    mfaSettingList,
    preferredMfa,
    status,
    temporaryPassword,
    updatedTs,
    userName,
    userPoolId,
  } = {}) {
    this.createdTs = createdTs;
    this.email = email;
    this.emailVerified = emailVerified;
    this.enabled = enabled;
    this.identityProvider = identityProvider;
    this.isAdmin = isAdmin;
    this.messageAction = messageAction;
    this.mfaSettingList = mfaSettingList;
    this.preferredMfa = preferredMfa;
    this.status = status;
    this.temporaryPassword = temporaryPassword;
    this.updatedTs = updatedTs;
    this.userName = userName;
    this.userPoolId = userPoolId;
  }

  get isFederated() {
    return this.identityProvider != null && this.identityProvider !== 'cognito';
  }

  get id() {
    return this.userName;
  }

  get name() {
    return this.userName;
  }

  get resourceType() {
    return AccountConstant.Base.ADMIN_MANAGED_USER.value;
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldName'), value: this.name },
      { title: $i18n.t('__fieldEmail'), value: this.email },
      { title: $i18n.t('__fieldEnabled'), value: this.enabled ? $i18n.t('__fieldYes') : $i18n.t('__fieldNo'), isChip: true, chipOptions: { color: this.enabled ? 'success' : null } },
      { title: $i18n.t('__fieldRole'), value: this.isAdmin ? $i18n.t('__fieldAdmin') : $i18n.t('__fieldUser'), isChip: true, chipOptions: { color: this.isAdmin ? 'primary' : null } },
      ...(this.isFederated ? [] : [{ title: $i18n.t('__titleMfa'), value: this.mfaSettingList?.length ? $i18n.t('__fieldEnabled') : $i18n.t('__fieldDisabled'), isChip: true, chipOptions: { color: this.mfaSettingList?.length ? 'success' : null } }]),
      { title: $i18n.t('__fieldConfirmationStatus'), value: findField(AccountConstant.UserStatus, this.status, 'title') },
      { title: $i18n.t('__fieldCreated'), value: this.createdTs, isTimestamp: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {User} resource
   */
  static toRequestPayloadWithAdmin(resource) {
    return {
      email_verified: true, // Always true for creating a user
      email: resource.email,
      enabled: resource.enabled,
      is_admin: resource.isAdmin,
      message_action: resource.messageAction,
      temporary_password: resource.temporaryPassword,
      username: resource.userName,
    };
  }

  /**
   * @param {User} resource
   */
  static toRequestPayloadWithUser(resource) {
    return {
      email: resource.email,
    };
  }
}

export default User;
