import Storage from './Storage';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class StorageResponse extends Storage {
  constructor({
    folder_path,
    status,
    storage_id,
    storage_name,
    system_info,
    updated_ts,
  } = {}) {
    super({
      folderPath: folder_path,
      status,
      storageId: storage_id,
      storageName: storage_name,
      systemInfo: system_info,
      updatedTs: updated_ts,
    });
  }
}

export default StorageResponse;
