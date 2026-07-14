/**
 * This class receives data from the API with parameters in snake_case.
 */
class TempFilePresignedUrlResponse {
  constructor({
    presigned_url,
    temp_file_id,
  } = {}) {
    this.tempFileId = temp_file_id;
    this.presignedUrl = presigned_url;
  }
}

export default TempFilePresignedUrlResponse;
