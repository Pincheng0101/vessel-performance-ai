import StorageObject from './StorageObject';

class StorageObjectResponse extends StorageObject {
  constructor({
    content_type,
    object_path,
    size,
    storage_id,
    updated_ts,
  } = {}) {
    super({
      contentType: content_type,
      objectPath: object_path,
      size,
      storageId: storage_id,
      updatedTs: updated_ts,
    });
  }
}

export default StorageObjectResponse;
