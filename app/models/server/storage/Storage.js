import { ResourceConstant, StorageConstant } from '~/constants';
import { Resource } from '~/models/server';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class Storage extends Resource {
  constructor({
    folderPath,
    storageId,
    storageName,
    status,
    systemInfo,
    updatedTs,
  } = {}) {
    super({
      status,
      systemInfo,
      updatedTs,
    });
    // Set fields explicitly to prevent backend default values
    this.folderPath = folderPath ?? '';
    this.storageId = storageId ?? '';
    this.storageName = storageName ?? '';
  }

  get resourceType() {
    return ResourceConstant.Type.STORAGE.value;
  }

  get id() {
    return this.storageId;
  }

  get name() {
    return this.storageName;
  }

  get type() {
    return StorageConstant.Type.STORAGE.value;
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldId'), value: this.id, isCopyable: true },
      { title: $i18n.t('__fieldName'), value: this.name },
      { title: $i18n.t('__fieldFolderPath'), value: this.folderPath },
      { title: $i18n.t('__fieldSystemInfo'), value: this.systemInfo, isBlockText: true },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {Storage} resource
   */
  static toRequestPayload(resource) {
    return {
      storage_id: resource.storageId,
      storage_name: resource.storageName,
    };
  }
}

export default Storage;
