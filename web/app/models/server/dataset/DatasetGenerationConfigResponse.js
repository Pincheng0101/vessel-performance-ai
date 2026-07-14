import AttachmentContentBlockResponse from '../contentBlock/AttachmentContentBlockResponse';

/**
 * This class receives data from the API with parameters in snake_case.
 */
class DatasetGenerationConfigResponse {
  constructor({
    generation_instruction,
    generation_attachments,
    generation_examples,
  } = {}) {
    this.generationInstruction = generation_instruction;
    this.generationAttachments = generation_attachments?.length > 0 ? generation_attachments?.map(item => new AttachmentContentBlockResponse(item)) : null;
    this.generationExamples = generation_examples;
  }
}

export default DatasetGenerationConfigResponse;
