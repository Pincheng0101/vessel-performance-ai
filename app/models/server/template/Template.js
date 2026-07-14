import { ResourceConstant } from '~/constants';
import { Resource } from '~/models/server';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class Template extends Resource {
  constructor({
    status,
    systemInfo,
    template,
    templateId,
    templateName,
    updatedTs,
  } = {}) {
    super({
      status,
      systemInfo,
      updatedTs,
    });
    // Set fields explicitly to prevent backend default values
    this.template = template ?? '';
    this.templateId = templateId ?? '';
    this.templateName = templateName ?? '';
  }

  get resourceType() {
    return ResourceConstant.Type.TEMPLATE.value;
  }

  get id() {
    return this.templateId;
  }

  get name() {
    return this.templateName;
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldId'), value: this.id, isCopyable: true },
      { title: $i18n.t('__fieldName'), value: this.name },
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @returns {DisplayField[]}
   */
  get templateDisplayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldTemplate'), value: this.template, isJinjaCode: true },
    ];
  }

  /**
   * @param {Template} resource
   */
  static toRequestPayload(resource) {
    return {
      template_id: resource.templateId,
      template_name: resource.templateName,
      template: resource.template,
    };
  }
}

export default Template;
