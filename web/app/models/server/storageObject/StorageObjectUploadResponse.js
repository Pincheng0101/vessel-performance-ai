import StorageObject from './StorageObject';
import StorageObjectResponse from './StorageObjectResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class StorageObjectUploadResponse extends StorageObject {
  constructor({
    object,
    presigned_url,
  } = {}) {
    super({
      object: new StorageObjectResponse(object),
    });
    this.presignedUrl = presigned_url;
  }
}

export default StorageObjectUploadResponse;
