/**
 * This class receives data from the API with parameters in snake_case.
 */
class StorageObjectDownloadResponse {
  constructor({
    presigned_url,
  } = {}) {
    this.presignedUrl = presigned_url;
  }
}

export default StorageObjectDownloadResponse;
