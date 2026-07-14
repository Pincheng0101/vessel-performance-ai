import { VariableConstant } from '~/constants';
import Variable from './Variable';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class JsonVariable extends Variable {
  constructor({
    status,
    systemInfo,
    updatedTs,
    value,
    variableId,
    variableName,
    variableType,
  } = {}) {
    super({
      status,
      systemInfo,
      updatedTs,
      variableId,
      variableName,
      variableType,
    });
    // Set fields explicitly to prevent backend default values
    this.value = value ?? null;
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldId'), value: this.id, isCopyable: true },
      { title: $i18n.t('__fieldName'), value: this.name },
      { title: $i18n.t('__fieldType'), value: findField(VariableConstant.Type, this.type, 'title'), iconPath: findField(VariableConstant.Type, this.type, 'iconPath') },
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @returns {DisplayField[]}
   */
  get valueDisplayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldValue'), value: this.value, isJsonCode: true },
    ];
  }

  /**
   * @param {JsonVariable} resource
   */
  static toRequestPayload(resource) {
    return {
      ...super.toRequestPayload(resource),
      value: resource.value,
    };
  }
}

export default JsonVariable;
