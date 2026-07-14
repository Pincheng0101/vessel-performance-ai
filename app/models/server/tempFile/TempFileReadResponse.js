import TempFilePresignedUrl from './TempFilePresignedUrl';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class TempFileReadResponse {
  constructor({
    content,
    presigned_url,
  } = {}) {
    this.content = content;
    this.presignedUrl = presigned_url ? new TempFilePresignedUrl(presigned_url) : null;
  }
}

export default TempFileReadResponse;
