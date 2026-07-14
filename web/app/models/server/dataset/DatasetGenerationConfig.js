import AttachmentContentBlock from '../contentBlock/AttachmentContentBlock';

class DatasetGenerationConfig {
  constructor({
    generationInstruction,
    generationAttachments,
    generationExamples,
  } = {}) {
    this.generationInstruction = generationInstruction;
    this.generationAttachments = generationAttachments?.length > 0 ? generationAttachments.map(item => new AttachmentContentBlock(item)) : null;
    this.generationExamples = generationExamples;
  }

  static toRequestPayload(field) {
    return {
      generation_instruction: field.generationInstruction,
      generation_attachments: field.generationAttachments?.length > 0 ? field.generationAttachments.map(attachment => AttachmentContentBlock.toRequestPayload(attachment)) : null,
      generation_examples: field.generationExamples,
    };
  }
}

export default DatasetGenerationConfig;
