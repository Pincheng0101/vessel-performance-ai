import { ResourceConstant } from '~/constants';

/**
 * @import { DisplayField } from '~/models/ui/DisplayField.d'
 */

class StorageObject {
  constructor({
    contentType,
    objectPath,
    size,
    storageId,
    updatedTs,
  } = {}) {
    // Set fields explicitly to prevent backend default values
    this.contentType = contentType ?? null;
    this.objectPath = objectPath ?? '';
    this.size = size ?? null;
    this.storageId = storageId ?? '';
    this.updatedTs = updatedTs ?? 0;
  }

  get id() {
    return this.objectPath;
  }

  get name() {
    return pathUtils.extractLast(this.objectPath);
  }

  /**
   * @returns {DisplayField[]}
   */
  get displayFields() {
    const { $i18n } = useNuxtApp();
    return [
      { title: $i18n.t('__fieldStorageId'), value: this.storageId, isCopyable: true, link: { href: resourceUtils.getUrl(ResourceConstant.Type.STORAGE.value, this.storageId) } },
      { title: $i18n.t('__fieldName'), value: this.name },
      { title: $i18n.t('__fieldType'), value: this.contentType },
      { title: $i18n.t('__fieldSize'), value: fileUtils.formatBytes(this.size) },
      { title: $i18n.t('__fieldFilePath'), value: this.objectPath },
      { title: $i18n.t('__fieldStatus'), value: this.status, isStatus: true },
      { title: $i18n.t('__fieldLastUpdated'), value: this.updatedTs, isTimestamp: true },
    ];
  }

  /**
   * @param {StorageObject} object
   */
  static toUploadRequestPayload(object) {
    return {
      storage_id: object.storageId,
      object_path: object.objectPath,
      content_type: object.contentType,
    };
  }

  /**
   * @param {StorageObject} object
   */
  static toDownloadRequestPayload(object) {
    return {
      storage_id: object.storageId,
      object_path: object.objectPath,
    };
  }
}

export default StorageObject;
