import { AccountConstant } from '~/constants';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class Group {
  constructor({
    createdTs,
    description,
    groupName,
    precedence,
    roleArn,
    updatedTs,
    userPoolId,
  } = {}) {
    this.createdTs = createdTs;
    this.description = description;
    this.groupName = groupName;
    this.precedence = precedence;
    this.roleArn = roleArn;
    this.updatedTs = updatedTs;
    this.userPoolId = userPoolId;
  }

  get id() {
    return this.groupName;
  }

  get name() {
    return this.groupName;
  }

  get resourceType() {
    return AccountConstant.Base.ADMIN_MANAGED_GROUP.value;
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldName'), value: this.name },
      { title: $i18n.t('__fieldDescription'), value: this.description },
      { title: $i18n.t('__fieldRoleArn'), value: this.roleArn },
      { title: $i18n.t('__fieldPrecedence'), value: this.precedence },
      { title: $i18n.t('__fieldCreated'), value: this.createdTs, isTimestamp: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {Group} resource
   */
  static toRequestPayload(resource) {
    return {
      group_name: resource.groupName,
      description: resource.description,
      precedence: resource.precedence,
      role_arn: resource.roleArn,
    };
  }
}

export default Group;
