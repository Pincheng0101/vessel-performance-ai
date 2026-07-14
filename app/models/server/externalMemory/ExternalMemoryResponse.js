import ExternalMemory from './ExternalMemory';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class ExternalMemoryResponse extends ExternalMemory {
  constructor({
    presigned_url,
    external_memory_id,
  }) {
    super({
      presignedUrl: presigned_url,
      externalMemoryId: external_memory_id,
    });
  }
}

export default ExternalMemoryResponse;
